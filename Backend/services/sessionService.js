import crypto from 'crypto';
import UserSession from '../models/UserSession.js';

export const parseDevice = (userAgent = '') => {
  if (!userAgent) return 'Unknown Device';

  let browser = 'Unknown Browser';
  if (/Edg\//i.test(userAgent)) browser = 'Edge';
  else if (/Chrome/i.test(userAgent) && !/Edg/i.test(userAgent)) browser = 'Chrome';
  else if (/Firefox/i.test(userAgent)) browser = 'Firefox';
  else if (/Safari/i.test(userAgent) && !/Chrome/i.test(userAgent)) browser = 'Safari';

  let os = 'Unknown OS';
  if (/iPhone|iPad/i.test(userAgent)) os = 'iPhone';
  else if (/Android/i.test(userAgent)) os = 'Android';
  else if (/Windows/i.test(userAgent)) os = 'Windows';
  else if (/Mac OS X|Macintosh/i.test(userAgent)) os = 'MacBook';
  else if (/Linux/i.test(userAgent)) os = 'Linux';

  return `${browser} · ${os}`;
};

export const generateTokenId = () => crypto.randomUUID();

export const createUserSession = async ({ userId, tokenId, ipAddress, userAgent }) => {
  return UserSession.create({
    userId,
    tokenId,
    device: parseDevice(userAgent),
    ipAddress,
    lastSeen: new Date(),
    isActive: true
  });
};

export const touchSession = async (tokenId) => {
  if (!tokenId) return;
  await UserSession.updateOne(
    { tokenId, isActive: true },
    { $set: { lastSeen: new Date() } }
  );
};

export const revokeSession = async (sessionId, userId) => {
  const session = await UserSession.findOne({ _id: sessionId, userId });
  if (!session) return null;

  session.isActive = false;
  await session.save();
  return session;
};

export const revokeSessionByTokenId = async (tokenId) => {
  if (!tokenId) return null;
  return UserSession.findOneAndUpdate(
    { tokenId },
    { $set: { isActive: false } },
    { new: true }
  );
};

export const isSessionActive = async (tokenId) => {
  if (!tokenId) return true;
  const session = await UserSession.findOne({ tokenId, isActive: true });
  return Boolean(session);
};
