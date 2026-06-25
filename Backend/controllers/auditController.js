import { Op } from 'sequelize';
import AuditLog from '../models/AuditLog.js';
import User from '../models/User.js';
import { auditLogIncludes } from '../utils/queryIncludes.js';
import { shapeAuditLogs } from '../utils/apiShape.js';

export const getAuditLogs = async (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit, 10) || 20));
    const offset = (page - 1) * limit;

    const where = {};

    if (req.user.role === 'ADMIN') {
      const admin = await User.findByPk(req.user.id);
      if (!admin?.companyId) {
        return res.status(400).json({ success: false, message: 'Administrator must belong to a company' });
      }
      where.companyId = admin.companyId;
    } else if (req.user.role === 'SUPER_ADMIN') {
      where.entityType = 'SUBSCRIPTION';
    } else {
      return res.status(403).json({ success: false, message: 'Forbidden: Access denied' });
    }

    if (req.query.user) where.actorId = req.query.user;
    if (req.query.action) where.action = req.query.action;
    if (req.query.entityType) where.entityType = req.query.entityType;
    if (req.query.companyId && req.user.role === 'SUPER_ADMIN') where.companyId = req.query.companyId;

    if (req.query.from || req.query.to) {
      where.createdAt = {};
      if (req.query.from) where.createdAt[Op.gte] = new Date(req.query.from);
      if (req.query.to) {
        const end = new Date(req.query.to);
        end.setHours(23, 59, 59, 999);
        where.createdAt[Op.lte] = end;
      }
    }

    const [logs, total] = await Promise.all([
      AuditLog.findAll({
        where,
        include: auditLogIncludes(),
        order: [['createdAt', 'DESC']],
        offset,
        limit
      }),
      AuditLog.count({ where })
    ]);

    return res.status(200).json({
      success: true,
      logs: shapeAuditLogs(logs),
      pagination: { total, page, limit, pages: Math.ceil(total / limit) || 1 }
    });
  } catch (error) {
    console.error('Get audit logs error:', error);
    return res.status(500).json({ success: false, message: 'Internal server error' });
  }
};
