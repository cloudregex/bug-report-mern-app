import Attachment from '../models/Attachment.js';
import Activity from '../models/Activity.js';
import { createAuditLog, applySoftDelete } from '../services/auditService.js';
import { attachmentIncludes } from '../utils/queryIncludes.js';
import { shapeAttachment } from '../utils/apiShape.js';

export const uploadAttachment = async (req, res) => {
  try {
    const ticket = req.ticket;
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'No file uploaded' });
    }

    const attachment = await Attachment.create({
      companyId: ticket.companyId,
      projectId: ticket.projectId,
      ticketId: ticket.id,
      uploadedBy: req.user.id,
      fileName: req.file.originalname,
      fileUrl: `/uploads/${req.file.filename}`,
      mimeType: req.file.mimetype,
      fileSize: req.file.size
    });

    await Activity.create({
      actorId: req.user.id,
      companyId: ticket.companyId,
      projectId: ticket.projectId,
      ticketId: ticket.id,
      entityType: 'ATTACHMENT',
      entityId: attachment.id,
      action: 'ATTACHMENT_UPLOADED',
      metadata: { attachmentId: attachment.id, fileName: req.file.originalname }
    });

    const populatedAttachment = shapeAttachment(
      await Attachment.findByPk(attachment.id, { include: attachmentIncludes() })
    );

    return res.status(201).json({
      success: true,
      message: 'Attachment uploaded successfully',
      attachment: populatedAttachment
    });
  } catch (error) {
    console.error('Upload attachment error:', error);
    return res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

export const getAttachments = async (req, res) => {
  try {
    const attachments = await Attachment.findAll({
      where: { ticketId: req.ticket.id, isDeleted: false },
      include: attachmentIncludes(),
      order: [['createdAt', 'ASC']]
    });
    return res.status(200).json({
      success: true,
      attachments: attachments.map(shapeAttachment)
    });
  } catch (error) {
    console.error('Get attachments error:', error);
    return res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

export const deleteAttachment = async (req, res) => {
  try {
    const attachment = await Attachment.findByPk(req.params.id);
    if (!attachment || attachment.isDeleted) {
      return res.status(404).json({ success: false, message: 'Attachment not found' });
    }

    const isUploader = String(attachment.uploadedBy) === String(req.user.id);
    const isAdmin = req.user.role === 'ADMIN';
    if (!isUploader && !isAdmin) {
      return res.status(403).json({ success: false, message: 'Access denied: You do not have permission to delete this attachment' });
    }

    const before = { fileName: attachment.fileName, isDeleted: attachment.isDeleted };
    applySoftDelete(attachment, req.user.id);
    await attachment.save();

    await createAuditLog({
      companyId: attachment.companyId,
      actorId: req.user.id,
      entityType: 'ATTACHMENT',
      entityId: attachment.id,
      action: 'ATTACHMENT_DELETED',
      before,
      after: { isDeleted: true, deletedAt: attachment.deletedAt },
      req
    });

    return res.status(200).json({ success: true, message: 'Attachment deleted successfully' });
  } catch (error) {
    console.error('Delete attachment error:', error);
    return res.status(500).json({ success: false, message: 'Internal server error' });
  }
};
