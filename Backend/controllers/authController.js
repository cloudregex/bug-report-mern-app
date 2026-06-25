import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { Op } from 'sequelize';
import User from '../models/User.js';
import Company from '../models/Company.js';
import { createSubscriptionForCompany } from '../services/subscriptionService.js';
import { getClientMeta } from '../services/auditService.js';
import { createAuditLog } from '../services/auditService.js';
import {
  recordLoginAttempt,
  isAccountLocked,
  handleFailedLogin,
  resetLoginAttempts
} from '../services/loginSecurityService.js';
import {
  generateTokenId,
  createUserSession
} from '../services/sessionService.js';
import { isUniqueConstraintError } from '../utils/dbHelpers.js';
import { toApiDoc } from '../utils/apiShape.js';

const JWT_SECRET = process.env.JWT_SECRET || 'bug_tracker_super_secret_jwt_key_2026';

const buildUniqueSlug = async (name) => {
  let base = name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)+/g, '');
  if (!base) base = 'company';

  let slug = base;
  let suffix = 1;
  while (await Company.findOne({ where: { slug } })) {
    slug = `${base}-${suffix++}`;
  }
  return slug;
};

const buildUniqueUsername = async (email) => {
  let base = email.split('@')[0].replace(/[^a-z0-9_]/g, '');
  if (!base) base = 'user';

  let username = base;
  let suffix = 1;
  while (await User.findOne({ where: { username } })) {
    username = `${base}${suffix++}`;
  }
  return username;
};

const completeAuthSession = async (user, req, auditAction = 'LOGIN_SUCCESS', auditMeta = {}) => {
  const { ipAddress, userAgent } = getClientMeta(req);
  const tokenId = generateTokenId();

  await createUserSession({
    userId: user.id,
    tokenId,
    ipAddress,
    userAgent
  });

  const token = jwt.sign(
    {
      id: user.id,
      username: user.username,
      email: user.email,
      role: user.role,
      tokenId
    },
    JWT_SECRET,
    { expiresIn: '24h' }
  );

  await createAuditLog({
    companyId: user.companyId,
    actorId: user.id,
    entityType: auditMeta.entityType || 'USER',
    entityId: auditMeta.entityId || user.id,
    action: auditAction,
    before: auditMeta.before ?? null,
    after: auditMeta.after ?? { email: user.email },
    req
  });

  return {
    token,
    user: {
      id: user.id,
      username: user.username,
      email: user.email,
      name: user.name,
      role: user.role,
      companyId: user.companyId
    }
  };
};

export const registerCompany = async (req, res) => {
  let createdUser = null;
  let createdCompany = null;

  try {
    const { companyName, name, email, password, confirmPassword } = req.body;

    if (!companyName?.trim()) {
      return res.status(400).json({ success: false, message: 'Company name is required' });
    }
    if (!name?.trim()) {
      return res.status(400).json({ success: false, message: 'Your name is required' });
    }
    if (!email?.trim()) {
      return res.status(400).json({ success: false, message: 'Email is required' });
    }
    if (!password) {
      return res.status(400).json({ success: false, message: 'Password is required' });
    }
    if (password !== confirmPassword) {
      return res.status(400).json({ success: false, message: 'Passwords do not match' });
    }

    const passwordCheck = (await import('../services/passwordService.js')).validatePasswordStrength(password);
    if (!passwordCheck.valid) {
      return res.status(400).json({ success: false, message: passwordCheck.message });
    }

    const emailNormalized = email.toLowerCase().trim();
    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailPattern.test(emailNormalized)) {
      return res.status(400).json({ success: false, message: 'Please enter a valid email address' });
    }

    const existingUser = await User.findOne({ where: { email: emailNormalized } });
    if (existingUser) {
      return res.status(400).json({ success: false, message: 'An account with this email already exists' });
    }

    const username = await buildUniqueUsername(emailNormalized);
    const slug = await buildUniqueSlug(companyName);
    const hashedPassword = await bcrypt.hash(password, 10);

    createdUser = await User.create({
      name: name.trim(),
      email: emailNormalized,
      username,
      password: hashedPassword,
      role: 'ADMIN',
      status: 'ACTIVE',
      companyId: null,
      passwordHistory: [hashedPassword]
    });

    createdCompany = await Company.create({
      name: companyName.trim(),
      slug,
      createdBy: createdUser.id
    });

    createdUser.companyId = createdCompany.id;
    await createdUser.save();

    await createSubscriptionForCompany(createdCompany.id);

    const auth = await completeAuthSession(createdUser, req, 'COMPANY_REGISTERED', {
      entityType: 'COMPANY',
      entityId: createdCompany.id,
      before: null,
      after: {
        companyName: createdCompany.name,
        slug: createdCompany.slug,
        adminEmail: createdUser.email
      }
    });

    return res.status(201).json({
      success: true,
      message: 'Company registered successfully',
      token: auth.token,
      user: auth.user,
      company: {
        id: createdCompany.id,
        name: createdCompany.name,
        slug: createdCompany.slug
      }
    });
  } catch (error) {
    if (createdCompany?.id) {
      await Company.destroy({ where: { id: createdCompany.id } }).catch(() => {});
    }
    if (createdUser?.id) {
      await User.destroy({ where: { id: createdUser.id } }).catch(() => {});
    }

    if (isUniqueConstraintError(error)) {
      return res.status(400).json({ success: false, message: 'Email or company slug already exists' });
    }

    console.error('Register company error:', error);
    return res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

export const loginUser = async (req, res) => {
  try {
    const { email, password } = req.body;
    const { ipAddress, userAgent } = getClientMeta(req);

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Email and password are required'
      });
    }

    const normalizedInput = email.toLowerCase().trim();
    const user = await User.findOne({
      where: {
        [Op.or]: [
          { email: normalizedInput },
          { username: normalizedInput }
        ]
      }
    });

    if (!user) {
      await recordLoginAttempt({ email: normalizedInput, ipAddress, success: false });
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password'
      });
    }

    if (user.status === 'DISABLED') {
      await recordLoginAttempt({ email: user.email, ipAddress, success: false });
      return res.status(403).json({
        success: false,
        message: 'Your account has been disabled. Contact your administrator.'
      });
    }

    if (isAccountLocked(user)) {
      await recordLoginAttempt({ email: user.email, ipAddress, success: false });
      return res.status(403).json({
        success: false,
        message: 'Account temporarily locked due to too many failed login attempts. Try again later.'
      });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      await recordLoginAttempt({ email: user.email, ipAddress, success: false });
      await handleFailedLogin(user, req);
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password'
      });
    }

    await recordLoginAttempt({ email: user.email, ipAddress, success: true });
    await resetLoginAttempts(user);

    const tokenId = generateTokenId();
    await createUserSession({
      userId: user.id,
      tokenId,
      ipAddress,
      userAgent
    });

    const token = jwt.sign(
      {
        id: user.id,
        username: user.username,
        email: user.email,
        role: user.role,
        tokenId
      },
      JWT_SECRET,
      { expiresIn: '24h' }
    );

    await createAuditLog({
      companyId: user.companyId,
      actorId: user.id,
      entityType: 'USER',
      entityId: user.id,
      action: 'LOGIN_SUCCESS',
      before: null,
      after: { email: user.email, device: userAgent },
      req
    });

    return res.status(200).json({
      success: true,
      message: 'Login successful',
      token,
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        name: user.name,
        role: user.role,
        companyId: user.companyId
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

export const getUserProfile = async (req, res) => {
  try {
    const user = await User.findByPk(req.user.id, {
      attributes: { exclude: ['password', 'passwordHistory'] }
    });
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    return res.status(200).json({
      success: true,
      user: toApiDoc(user)
    });
  } catch (error) {
    console.error('Get profile error:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

export const seedAdminUser = async () => {
  try {
    const existing = await User.findOne({ where: { email: 'admin@example.com' } });
    if (existing) return;

    // Create admin first so we have a real UUID for company.createdBy (avoids FK violation)
    const adminPassword = await bcrypt.hash('Admin@123', 10);
    const admin = await User.create({
      name: 'Admin User',
      email: 'admin@example.com',
      username: 'admin',
      password: adminPassword,
      role: 'ADMIN',
      companyId: null,
      status: 'ACTIVE'
    });

    const company = await Company.create({
      name: 'Citizens Foundation',
      slug: 'citizens-foundation',
      createdBy: admin.id
    });

    admin.companyId = company.id;
    await admin.save();

    await createSubscriptionForCompany(company.id);

    const empPassword = await bcrypt.hash('Employee@123', 10);
    await User.create({
      name: 'John Employee',
      email: 'employee@example.com',
      username: 'john',
      password: empPassword,
      role: 'EMPLOYEE',
      companyId: company.id,
      status: 'ACTIVE'
    });

    const superAdminPassword = await bcrypt.hash('SuperAdmin@123', 10);
    await User.create({
      name: 'Platform Owner',
      email: 'superadmin@example.com',
      username: 'superadmin',
      password: superAdminPassword,
      role: 'SUPER_ADMIN',
      companyId: null,
      status: 'ACTIVE'
    });

    console.log('');
    console.log('╔══════════════════════════════════════════════════╗');
    console.log('║              SEED DATA CREATED                   ║');
    console.log('╠══════════════════════════════════════════════════╣');
    console.log('║  Company  : Citizens Foundation                  ║');
    console.log('║─────────────────────────────────────────────────║');
    console.log('║  ADMIN       : admin@example.com / Admin@123     ║');
    console.log('║  EMPLOYEE    : employee@example.com / Employee@123 ║');
    console.log('║  SUPER_ADMIN : superadmin@example.com / SuperAdmin@123 ║');
    console.log('╚══════════════════════════════════════════════════╝');
    console.log('');
  } catch (error) {
    console.error('Error seeding data:', error);
  }
};

export const seedSuperAdmin = async () => {
  try {
    const existing = await User.findOne({ where: { role: 'SUPER_ADMIN' } });
    if (existing) return;

    const password = await bcrypt.hash('SuperAdmin@123', 10);
    await User.create({
      name: 'Platform Owner',
      email: 'superadmin@example.com',
      username: 'superadmin',
      password,
      role: 'SUPER_ADMIN',
      companyId: null,
      status: 'ACTIVE'
    });

    console.log('');
    console.log('╔══════════════════════════════════════════════════╗');
    console.log('║           SUPER_ADMIN SEED CREATED               ║');
    console.log('║  superadmin@example.com / SuperAdmin@123         ║');
    console.log('╚══════════════════════════════════════════════════╝');
    console.log('');
  } catch (error) {
    console.error('Error seeding super admin:', error);
  }
};
