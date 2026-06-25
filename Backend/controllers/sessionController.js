import { Op } from 'sequelize';
import UserSession from '../models/UserSession.js';
import User from '../models/User.js';
import { createAuditLog } from '../services/auditService.js';
import { sessionIncludes } from '../utils/queryIncludes.js';
import { shapeUserSession } from '../utils/apiShape.js';

export const getSessions = async (req, res) => {
  try {
    let userIds = [req.user.id];

    if (req.user.role === 'ADMIN') {
      const admin = await User.findByPk(req.user.id);
      if (!admin?.companyId) {
        return res.status(400).json({ success: false, message: 'Administrator must belong to a company' });
      }
      const companyUsers = await User.findAll({ where: { companyId: admin.companyId }, attributes: ['id'] });
      userIds = companyUsers.map((u) => u.id);
    }

    const sessions = await UserSession.findAll({
      where: { userId: { [Op.in]: userIds }, isActive: true },
      include: sessionIncludes(),
      order: [['lastSeen', 'DESC']]
    });

    return res.status(200).json({ success: true, sessions: sessions.map(shapeUserSession) });
  } catch (error) {
    console.error('Get sessions error:', error);
    return res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

export const revokeSessionById = async (req, res) => {
  try {
    const session = await UserSession.findByPk(req.params.id, { include: sessionIncludes() });
    if (!session) {
      return res.status(404).json({ success: false, message: 'Session not found' });
    }

    const sessionUser = session.user || session.get?.('user');
    const actor = await User.findByPk(req.user.id);

    if (req.user.role === 'EMPLOYEE' || req.user.role === 'CLIENT') {
      if (String(sessionUser.id) !== String(req.user.id)) {
        return res.status(403).json({ success: false, message: 'You can only revoke your own sessions' });
      }
    } else if (req.user.role === 'ADMIN') {
      if (
        String(sessionUser.companyId) !== String(actor.companyId)
        && String(sessionUser.id) !== String(req.user.id)
      ) {
        return res.status(403).json({ success: false, message: 'Forbidden: Session belongs to another company' });
      }
    }

    session.isActive = false;
    await session.save();

    await createAuditLog({
      companyId: sessionUser.companyId,
      actorId: req.user.id,
      entityType: 'SESSION',
      entityId: session.id,
      action: 'SESSION_REVOKED',
      before: { isActive: true, device: session.device },
      after: { isActive: false },
      req
    });

    return res.status(200).json({ success: true, message: 'Session revoked successfully' });
  } catch (error) {
    console.error('Revoke session error:', error);
    return res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

export const revokeOwnSession = revokeSessionById;
