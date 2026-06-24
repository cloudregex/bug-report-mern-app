import UserSession from '../models/UserSession.js';
import User from '../models/User.js';
import { createAuditLog } from '../services/auditService.js';

export const getSessions = async (req, res) => {
  try {
    let userIds = [req.user.id];

    if (req.user.role === 'ADMIN') {
      const admin = await User.findById(req.user.id);
      if (!admin?.companyId) {
        return res.status(400).json({ success: false, message: 'Administrator must belong to a company' });
      }

      const companyUsers = await User.find({ companyId: admin.companyId }).select('_id');
      userIds = companyUsers.map((u) => u._id);
    } else if (req.user.role === 'SUPER_ADMIN') {
      userIds = [req.user.id];
    }

    const sessions = await UserSession.find({
      userId: { $in: userIds },
      isActive: true
    })
      .populate('userId', 'name email role')
      .sort({ lastSeen: -1 });

    return res.status(200).json({ success: true, sessions });
  } catch (error) {
    console.error('Get sessions error:', error);
    return res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

export const revokeSessionById = async (req, res) => {
  try {
    const { id } = req.params;
    const session = await UserSession.findById(id).populate('userId', 'name email companyId role');

    if (!session) {
      return res.status(404).json({ success: false, message: 'Session not found' });
    }

    const actor = await User.findById(req.user.id);

    if (req.user.role === 'EMPLOYEE' || req.user.role === 'CLIENT') {
      if (session.userId._id.toString() !== req.user.id) {
        return res.status(403).json({ success: false, message: 'You can only revoke your own sessions' });
      }
    } else if (req.user.role === 'ADMIN') {
      if (
        session.userId.companyId?.toString() !== actor.companyId?.toString()
        && session.userId._id.toString() !== req.user.id
      ) {
        return res.status(403).json({ success: false, message: 'Forbidden: Session belongs to another company' });
      }
    }

    session.isActive = false;
    await session.save();

    await createAuditLog({
      companyId: session.userId.companyId,
      actorId: req.user.id,
      entityType: 'SESSION',
      entityId: session._id,
      action: 'SESSION_REVOKED',
      before: { isActive: true, device: session.device },
      after: { isActive: false },
      req
    });

    return res.status(200).json({
      success: true,
      message: 'Session revoked successfully'
    });
  } catch (error) {
    console.error('Revoke session error:', error);
    return res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

export const revokeOwnSession = revokeSessionById;
