import LoginAttempt from '../models/LoginAttempt.js';
import User from '../models/User.js';
import { createAuditLog } from './auditService.js';

export const MAX_FAILED_ATTEMPTS = 5;
export const LOCK_DURATION_MS = 30 * 60 * 1000;

export const recordLoginAttempt = async ({ email, ipAddress, success }) => {
  return LoginAttempt.create({
    email: email.toLowerCase().trim(),
    ipAddress,
    success
  });
};

export const isAccountLocked = (user) => {
  if (!user?.lockedUntil) return false;
  return new Date(user.lockedUntil) > new Date();
};

export const handleFailedLogin = async (user, req) => {
  if (!user) return null;

  user.failedLoginAttempts = (user.failedLoginAttempts || 0) + 1;

  if (user.failedLoginAttempts >= MAX_FAILED_ATTEMPTS) {
    user.lockedUntil = new Date(Date.now() + LOCK_DURATION_MS);

    await createAuditLog({
      companyId: user.companyId,
      actorId: user._id,
      entityType: 'USER',
      entityId: user._id,
      action: 'ACCOUNT_LOCKED',
      before: { failedLoginAttempts: user.failedLoginAttempts - 1, lockedUntil: null },
      after: {
        failedLoginAttempts: user.failedLoginAttempts,
        lockedUntil: user.lockedUntil
      },
      req
    });
  }

  await user.save();
  return user;
};

export const resetLoginAttempts = async (user) => {
  user.failedLoginAttempts = 0;
  user.lockedUntil = null;
  await user.save();
};

export const getRecentFailedAttempts = (email, minutes = 15) => {
  const since = new Date(Date.now() - minutes * 60 * 1000);
  return LoginAttempt.countDocuments({
    email: email.toLowerCase().trim(),
    success: false,
    createdAt: { $gte: since }
  });
};

export const getLockedAccounts = () =>
  User.find({
    lockedUntil: { $gt: new Date() }
  }).select('-password').sort({ lockedUntil: -1 });
