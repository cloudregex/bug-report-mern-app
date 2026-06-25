import AuditLog from '../models/AuditLog.js';

export const getClientMeta = (req) => ({
  ipAddress: req?.ip
    || req?.headers?.['x-forwarded-for']?.split(',')[0]?.trim()
    || null,
  userAgent: req?.headers?.['user-agent'] || null
});

export const createAuditLog = async ({
  companyId = null,
  actorId,
  entityType,
  entityId = null,
  action,
  before = null,
  after = null,
  req = null
}) => {
  try {
    const { ipAddress, userAgent } = req ? getClientMeta(req) : { ipAddress: null, userAgent: null };

    return await AuditLog.create({
      companyId,
      actorId,
      entityType,
      entityId,
      action,
      before,
      after,
      ipAddress,
      userAgent
    });
  } catch (error) {
    console.error('Failed to write audit log:', error);
    return null;
  }
};

export const applySoftDelete = (doc, deletedBy) => {
  doc.isDeleted = true;
  doc.deletedAt = new Date();
  doc.deletedBy = deletedBy;
};
