import AuditLog from '../models/AuditLog.js';
import LoginAttempt from '../models/LoginAttempt.js';
import UserSession from '../models/UserSession.js';
import User from '../models/User.js';
import { getLockedAccounts } from '../services/loginSecurityService.js';

const sevenDaysAgo = () => new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
const twentyFourHoursAgo = () => new Date(Date.now() - 24 * 60 * 60 * 1000);

export const getCompanySecurityDashboard = async (req, res) => {
  try {
    const admin = await User.findById(req.user.id);
    if (!admin?.companyId) {
      return res.status(400).json({ success: false, message: 'Administrator must belong to a company' });
    }

    const companyId = admin.companyId;
    const companyUserIds = (await User.find({ companyId }).select('_id')).map((u) => u._id);
    const companyEmails = (await User.find({ companyId }).select('email')).map((u) => u.email);

    const [
      activeSessions,
      failedLogins,
      disabledUsers,
      recentAuditLogs
    ] = await Promise.all([
      UserSession.find({ userId: { $in: companyUserIds }, isActive: true })
        .populate('userId', 'name email role')
        .sort({ lastSeen: -1 })
        .limit(20),
      LoginAttempt.find({
        email: { $in: companyEmails },
        success: false,
        createdAt: { $gte: twentyFourHoursAgo() }
      })
        .sort({ createdAt: -1 })
        .limit(20),
      User.find({ companyId, status: 'DISABLED' }).select('-password'),
      AuditLog.find({ companyId })
        .populate('actorId', 'name email role')
        .sort({ createdAt: -1 })
        .limit(20)
    ]);

    return res.status(200).json({
      success: true,
      dashboard: {
        activeSessions,
        failedLogins,
        disabledUsers,
        recentAuditLogs
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

    const [
      lockedAccountsRaw,
      failedLoginTrends,
      subscriptionChanges,
      accountLockedEvents
    ] = await Promise.all([
      getLockedAccounts(),
      LoginAttempt.aggregate([
        { $match: { success: false, createdAt: { $gte: since } } },
        {
          $group: {
            _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
            count: { $sum: 1 }
          }
        },
        { $sort: { _id: 1 } }
      ]),
      AuditLog.find({
        entityType: 'SUBSCRIPTION',
        createdAt: { $gte: since }
      })
        .populate('actorId', 'name email')
        .populate('companyId', 'name slug')
        .sort({ createdAt: -1 })
        .limit(20),
      AuditLog.find({
        action: 'ACCOUNT_LOCKED',
        createdAt: { $gte: twentyFourHoursAgo() }
      })
        .populate('actorId', 'name email')
        .sort({ createdAt: -1 })
        .limit(20)
    ]);

    const lockedAccounts = lockedAccountsRaw.map((user) => ({
      _id: user._id,
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
        subscriptionChanges,
        accountLockedEvents
      }
    });
  } catch (error) {
    console.error('Platform security dashboard error:', error);
    return res.status(500).json({ success: false, message: 'Internal server error' });
  }
};
