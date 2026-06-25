import { Op, fn, col } from 'sequelize';
import AuditLog from '../models/AuditLog.js';
import LoginAttempt from '../models/LoginAttempt.js';
import UserSession from '../models/UserSession.js';
import User from '../models/User.js';
import { getLockedAccounts } from '../services/loginSecurityService.js';
import { auditLogIncludes, sessionIncludes } from '../utils/queryIncludes.js';
import { shapeAuditLogs, shapeUserSessions, toApiDoc } from '../utils/apiShape.js';

const sevenDaysAgo = () => new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
const twentyFourHoursAgo = () => new Date(Date.now() - 24 * 60 * 60 * 1000);

export const getCompanySecurityDashboard = async (req, res) => {
  try {
    const admin = await User.findByPk(req.user.id);
    if (!admin?.companyId) {
      return res.status(400).json({ success: false, message: 'Administrator must belong to a company' });
    }

    const companyId = admin.companyId;
    const companyUsers = await User.findAll({ where: { companyId }, attributes: ['id', 'email'] });
    const companyUserIds = companyUsers.map((u) => u.id);
    const companyEmails = companyUsers.map((u) => u.email);

    const [activeSessions, failedLogins, disabledUsers, recentAuditLogs] = await Promise.all([
      UserSession.findAll({
        where: { userId: { [Op.in]: companyUserIds }, isActive: true },
        include: sessionIncludes(),
        order: [['lastSeen', 'DESC']],
        limit: 20
      }),
      LoginAttempt.findAll({
        where: {
          email: { [Op.in]: companyEmails },
          success: false,
          createdAt: { [Op.gte]: twentyFourHoursAgo() }
        },
        order: [['createdAt', 'DESC']],
        limit: 20
      }),
      User.findAll({
        where: { companyId, status: 'DISABLED' },
        attributes: { exclude: ['password', 'passwordHistory'] }
      }),
      AuditLog.findAll({
        where: { companyId },
        include: auditLogIncludes(),
        order: [['createdAt', 'DESC']],
        limit: 20
      })
    ]);

    return res.status(200).json({
      success: true,
      dashboard: {
        activeSessions: shapeUserSessions(activeSessions),
        failedLogins: failedLogins.map(toApiDoc),
        disabledUsers: disabledUsers.map(toApiDoc),
        recentAuditLogs: shapeAuditLogs(recentAuditLogs)
      }
    });
  } catch (error) {
    console.error('Company security dashboard error:', error);
    return res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

export const getPlatformSecurityDashboard = async (req, res) => {
  try {
    const since = sevenDaysAgo();

    const [lockedAccountsRaw, failedLoginTrends, subscriptionChanges, accountLockedEvents] = await Promise.all([
      getLockedAccounts(),
      LoginAttempt.findAll({
        where: { success: false, createdAt: { [Op.gte]: since } },
        attributes: [
          [fn('DATE', col('created_at')), '_id'],
          [fn('COUNT', col('id')), 'count']
        ],
        group: [fn('DATE', col('created_at'))],
        order: [[fn('DATE', col('created_at')), 'ASC']],
        raw: true
      }),
      AuditLog.findAll({
        where: { entityType: 'SUBSCRIPTION', createdAt: { [Op.gte]: since } },
        include: auditLogIncludes(),
        order: [['createdAt', 'DESC']],
        limit: 20
      }),
      AuditLog.findAll({
        where: { action: 'ACCOUNT_LOCKED', createdAt: { [Op.gte]: twentyFourHoursAgo() } },
        include: [{ model: User, as: 'actor', attributes: ['id', 'name', 'email'] }],
        order: [['createdAt', 'DESC']],
        limit: 20
      })
    ]);

    const lockedAccounts = lockedAccountsRaw.map((user) => ({
      _id: user.id,
      name: user.name,
      email: user.email,
      lockedUntil: user.lockedUntil,
      failedLoginAttempts: user.failedLoginAttempts
    }));

    return res.status(200).json({
      success: true,
      dashboard: {
        lockedAccounts,
        failedLoginTrends,
        subscriptionChanges: shapeAuditLogs(subscriptionChanges),
        accountLockedEvents: shapeAuditLogs(accountLockedEvents)
      }
    });
  } catch (error) {
    console.error('Platform security dashboard error:', error);
    return res.status(500).json({ success: false, message: 'Internal server error' });
  }
};
