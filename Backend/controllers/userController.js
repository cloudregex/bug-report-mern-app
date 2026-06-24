import bcrypt from 'bcryptjs';
import User from '../models/User.js';
import { checkEmployeeLimit } from '../services/subscriptionService.js';
import { syncUsage } from '../services/usageService.js';
import { createAuditLog } from '../services/auditService.js';
import {
  validatePasswordStrength,
  hashPassword
} from '../services/passwordService.js';

export const createEmployee = async (req, res) => {
  try {
    const { name, email, password } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({ success: false, message: 'Name is required' });
    }
    if (!email || !email.trim()) {
      return res.status(400).json({ success: false, message: 'Email is required' });
    }

    const passwordCheck = validatePasswordStrength(password);
    if (!passwordCheck.valid) {
      return res.status(400).json({ success: false, message: passwordCheck.message });
    }

    const adminUser = await User.findById(req.user.id);
    if (!adminUser || !adminUser.companyId) {
      return res.status(400).json({
        success: false,
        message: 'Administrator must belong to a company to invite employees'
      });
    }

    const emailNormalized = email.toLowerCase().trim();

    const existingEmail = await User.findOne({ email: emailNormalized });
    if (existingEmail) {
      return res.status(400).json({ success: false, message: 'A user with this email already exists' });
    }

    let baseUsername = emailNormalized.split('@')[0].replace(/[^a-z0-9_]/g, '');
    let username = baseUsername;
    let suffix = 1;
    while (await User.findOne({ username })) {
      username = `${baseUsername}${suffix++}`;
    }

    const hashedPassword = await hashPassword(password);

    const employeeLimit = await checkEmployeeLimit(adminUser.companyId);
    if (!employeeLimit.allowed) {
      return res.status(403).json(employeeLimit.response);
    }

    const employee = new User({
      name: name.trim(),
      email: emailNormalized,
      username,
      password: hashedPassword,
      role: 'EMPLOYEE',
      companyId: adminUser.companyId,
      status: 'ACTIVE',
      passwordHistory: [hashedPassword]
    });

    await employee.save();
    await syncUsage(adminUser.companyId);

    await createAuditLog({
      companyId: adminUser.companyId,
      actorId: req.user.id,
      entityType: 'USER',
      entityId: employee._id,
      action: 'USER_CREATED',
      before: null,
      after: { email: employee.email, role: employee.role, status: employee.status },
      req
    });

    const employeeResponse = employee.toObject();
    delete employeeResponse.password;
    delete employeeResponse.passwordHistory;

    return res.status(201).json({
      success: true,
      message: 'Employee created successfully',
      employee: employeeResponse
    });
  } catch (error) {
    console.error('Create employee error:', error);
    return res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

export const getEmployees = async (req, res) => {
  try {
    const adminUser = await User.findById(req.user.id);
    if (!adminUser || !adminUser.companyId) {
      return res.status(400).json({
        success: false,
        message: 'Administrator must belong to a company'
      });
    }

    const employees = await User.find({
      companyId: adminUser.companyId,
      role: 'EMPLOYEE'
    }).select('-password -passwordHistory');

    return res.status(200).json({
      success: true,
      employees
    });
  } catch (error) {
    console.error('Get employees error:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

export const getEmployeeById = async (req, res) => {
  try {
    const { id } = req.params;
    const adminUser = await User.findById(req.user.id);
    if (!adminUser || !adminUser.companyId) {
      return res.status(400).json({
        success: false,
        message: 'Administrator must belong to a company'
      });
    }

    const employee = await User.findById(id).select('-password -passwordHistory');
    if (!employee || employee.role !== 'EMPLOYEE') {
      return res.status(404).json({
        success: false,
        message: 'Employee not found'
      });
    }

    if (employee.companyId.toString() !== adminUser.companyId.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Forbidden: Employee belongs to a different company'
      });
    }

    return res.status(200).json({
      success: true,
      employee
    });
  } catch (error) {
    console.error('Get employee detail error:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

export const updateEmployeeStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!status || !['ACTIVE', 'DISABLED', 'INVITED'].includes(status)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid status value'
      });
    }

    if (status === 'DISABLED') {
      const confirmed =
        req.body.confirm === true
        || req.headers['x-confirm-action'] === 'true';
      if (!confirmed) {
        return res.status(400).json({
          success: false,
          message: 'Disabling a user requires confirmation. Send confirm: true in the request body.'
        });
      }
    }

    const adminUser = await User.findById(req.user.id);
    if (!adminUser || !adminUser.companyId) {
      return res.status(400).json({
        success: false,
        message: 'Administrator must belong to a company'
      });
    }

    const employee = await User.findById(id);
    if (!employee || employee.role !== 'EMPLOYEE') {
      return res.status(404).json({
        success: false,
        message: 'Employee not found'
      });
    }

    if (employee.companyId.toString() !== adminUser.companyId.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Forbidden: Employee belongs to a different company'
      });
    }

    const previousStatus = employee.status;
    employee.status = status;
    await employee.save();

    if (status === 'DISABLED') {
      await createAuditLog({
        companyId: adminUser.companyId,
        actorId: req.user.id,
        entityType: 'USER',
        entityId: employee._id,
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
        entityId: employee._id,
        action: 'USER_ENABLED',
        before: { status: previousStatus },
        after: { status },
        req
      });
    }

    const employeeResponse = employee.toObject();
    delete employeeResponse.password;
    delete employeeResponse.passwordHistory;

    return res.status(200).json({
      success: true,
      message: `Employee status updated to ${status} successfully`,
      employee: employeeResponse
    });
  } catch (error) {
    console.error('Update employee status error:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};
