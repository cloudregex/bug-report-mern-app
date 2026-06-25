import User from '../models/User.js';
import { checkEmployeeLimit } from '../services/subscriptionService.js';
import { syncUsage } from '../services/usageService.js';
import { createAuditLog } from '../services/auditService.js';
import { validatePasswordStrength, hashPassword } from '../services/passwordService.js';
import { excludePassword } from '../utils/apiShape.js';

export const createEmployee = async (req, res) => {
  try {
    const { name, email, password } = req.body;
    if (!name || !name.trim()) return res.status(400).json({ success: false, message: 'Name is required' });
    if (!email || !email.trim()) return res.status(400).json({ success: false, message: 'Email is required' });

    const passwordCheck = validatePasswordStrength(password);
    if (!passwordCheck.valid) return res.status(400).json({ success: false, message: passwordCheck.message });

    const adminUser = await User.findByPk(req.user.id);
    if (!adminUser || !adminUser.companyId) {
      return res.status(400).json({ success: false, message: 'Administrator must belong to a company to invite employees' });
    }

    const emailNormalized = email.toLowerCase().trim();
    const existingEmail = await User.findOne({ where: { email: emailNormalized } });
    if (existingEmail) return res.status(400).json({ success: false, message: 'A user with this email already exists' });

    let baseUsername = emailNormalized.split('@')[0].replace(/[^a-z0-9_]/g, '');
    let username = baseUsername;
    let suffix = 1;
    while (await User.findOne({ where: { username } })) username = `${baseUsername}${suffix++}`;

    const hashedPassword = await hashPassword(password);
    const employeeLimit = await checkEmployeeLimit(adminUser.companyId);
    if (!employeeLimit.allowed) return res.status(403).json(employeeLimit.response);

    const employee = await User.create({
      name: name.trim(),
      email: emailNormalized,
      username,
      password: hashedPassword,
      role: 'EMPLOYEE',
      companyId: adminUser.companyId,
      status: 'ACTIVE',
      passwordHistory: [hashedPassword]
    });
    await syncUsage(adminUser.companyId);

    await createAuditLog({
      companyId: adminUser.companyId,
      actorId: req.user.id,
      entityType: 'USER',
      entityId: employee.id,
      action: 'USER_CREATED',
      before: null,
      after: { email: employee.email, role: employee.role, status: employee.status },
      req
    });

    return res.status(201).json({
      success: true,
      message: 'Employee created successfully',
      employee: excludePassword(employee)
    });
  } catch (error) {
    console.error('Create employee error:', error);
    return res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

export const getEmployees = async (req, res) => {
  try {
    const adminUser = await User.findByPk(req.user.id);
    if (!adminUser || !adminUser.companyId) {
      return res.status(400).json({ success: false, message: 'Administrator must belong to a company' });
    }

    const employees = await User.findAll({
      where: { companyId: adminUser.companyId, role: 'EMPLOYEE' },
      attributes: { exclude: ['password', 'passwordHistory'] }
    });

    return res.status(200).json({ success: true, employees });
  } catch (error) {
    console.error('Get employees error:', error);
    return res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

export const getEmployeeById = async (req, res) => {
  try {
    const adminUser = await User.findByPk(req.user.id);
    if (!adminUser || !adminUser.companyId) {
      return res.status(400).json({ success: false, message: 'Administrator must belong to a company' });
    }

    const employee = await User.findByPk(req.params.id, {
      attributes: { exclude: ['password', 'passwordHistory'] }
    });
    if (!employee || employee.role !== 'EMPLOYEE') {
      return res.status(404).json({ success: false, message: 'Employee not found' });
    }
    if (String(employee.companyId) !== String(adminUser.companyId)) {
      return res.status(403).json({ success: false, message: 'Forbidden: Employee belongs to a different company' });
    }

    return res.status(200).json({ success: true, employee });
  } catch (error) {
    console.error('Get employee detail error:', error);
    return res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

export const updateEmployeeStatus = async (req, res) => {
  try {
    const { status } = req.body;
    if (!status || !['ACTIVE', 'DISABLED', 'INVITED'].includes(status)) {
      return res.status(400).json({ success: false, message: 'Invalid status value' });
    }

    if (status === 'DISABLED') {
      const confirmed = req.body.confirm === true || req.headers['x-confirm-action'] === 'true';
      if (!confirmed) {
        return res.status(400).json({
          success: false,
          message: 'Disabling a user requires confirmation. Send confirm: true in the request body.'
        });
      }
    }

    const adminUser = await User.findByPk(req.user.id);
    if (!adminUser || !adminUser.companyId) {
      return res.status(400).json({ success: false, message: 'Administrator must belong to a company' });
    }

    const employee = await User.findByPk(req.params.id);
    if (!employee || employee.role !== 'EMPLOYEE') {
      return res.status(404).json({ success: false, message: 'Employee not found' });
    }
    if (String(employee.companyId) !== String(adminUser.companyId)) {
      return res.status(403).json({ success: false, message: 'Forbidden: Employee belongs to a different company' });
    }

    const previousStatus = employee.status;
    employee.status = status;
    await employee.save();

    if (status === 'DISABLED') {
      await createAuditLog({
        companyId: adminUser.companyId,
        actorId: req.user.id,
        entityType: 'USER',
        entityId: employee.id,
        action: 'USER_DISABLED',
        before: { status: previousStatus },
        after: { status },
        req
      });
    } else if (previousStatus === 'DISABLED') {
      await createAuditLog({
        companyId: adminUser.companyId,
        actorId: req.user.id,
        entityType: 'USER',
        entityId: employee.id,
        action: 'USER_ENABLED',
        before: { status: previousStatus },
        after: { status },
        req
      });
    }

    return res.status(200).json({
      success: true,
      message: `Employee status updated to ${status} successfully`,
      employee: excludePassword(employee)
    });
  } catch (error) {
    console.error('Update employee status error:', error);
    return res.status(500).json({ success: false, message: 'Internal server error' });
  }
};
