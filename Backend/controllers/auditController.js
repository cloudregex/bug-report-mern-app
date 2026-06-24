import AuditLog from '../models/AuditLog.js';
import User from '../models/User.js';

export const getAuditLogs = async (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit, 10) || 20));
    const skip = (page - 1) * limit;

    const filter = {};

    if (req.user.role === 'ADMIN') {
      const admin = await User.findById(req.user.id);
      if (!admin?.companyId) {
        return res.status(400).json({ success: false, message: 'Administrator must belong to a company' });
      }
      filter.companyId = admin.companyId;
    } else if (req.user.role === 'SUPER_ADMIN') {
      filter.entityType = 'SUBSCRIPTION';
    } else {
      return res.status(403).json({ success: false, message: 'Forbidden: Access denied' });
    }

    if (req.query.user) {
      filter.actorId = req.query.user;
    }

    if (req.query.action) {
      filter.action = req.query.action;
    }

    if (req.query.entityType) {
      filter.entityType = req.query.entityType;
    }

    if (req.query.companyId && req.user.role === 'SUPER_ADMIN') {
      filter.companyId = req.query.companyId;
    }

    if (req.query.from || req.query.to) {
      filter.createdAt = {};
      if (req.query.from) filter.createdAt.$gte = new Date(req.query.from);
      if (req.query.to) {
        const end = new Date(req.query.to);
        end.setHours(23, 59, 59, 999);
        filter.createdAt.$lte = end;
      }
    }

    const [logs, total] = await Promise.all([
      AuditLog.find(filter)
        .populate('actorId', 'name email role')
        .populate('companyId', 'name slug')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),
      AuditLog.countDocuments(filter)
    ]);

    return res.status(200).json({
      success: true,
      logs,
      pagination: {
        total,
        page,
        limit,
        pages: Math.ceil(total / limit) || 1
      }
    });
  } catch (error) {
    console.error('Get audit logs error:', error);
    return res.status(500).json({ success: false, message: 'Internal server error' });
  }
};
