import Attachment from '../models/Attachment.js';
import Activity from '../models/Activity.js';
import User from '../models/User.js';
import { createAuditLog, applySoftDelete } from '../services/auditService.js';

// Upload an attachment
export const uploadAttachment = async (req, res) => {
  try {
    const ticket = req.ticket; // from authorizeTicketAccess
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'No file uploaded'
      });
    }

    const attachment = new Attachment({
      companyId: ticket.companyId,
      projectId: ticket.projectId,
      ticketId: ticket._id,
      uploadedBy: req.user.id,
      fileName: req.file.originalname,
      fileUrl: `/uploads/${req.file.filename}`,
      mimeType: req.file.mimetype,
      fileSize: req.file.size
    });

    await attachment.save();

    // Log Activity
    const activity = new Activity({
      actorId: req.user.id,
      companyId: ticket.companyId,
      projectId: ticket.projectId,
      ticketId: ticket._id,
      entityType: 'ATTACHMENT',
      entityId: attachment._id,
      action: 'ATTACHMENT_UPLOADED',
      metadata: {
        attachmentId: attachment._id,
        fileName: req.file.originalname
      }
    });
    await activity.save();

    const populatedAttachment = await Attachment.findById(attachment._id)
      .populate('uploadedBy', 'name email');

    return res.status(201).json({
      success: true,
      message: 'Attachment uploaded successfully',
      attachment: populatedAttachment
    });
  } catch (error) {
    console.error('Upload attachment error:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

// Get attachments for a ticket
export const getAttachments = async (req, res) => {
  try {
    const ticket = req.ticket; // from authorizeTicketAccess

    const attachments = await Attachment.find({
      ticketId: ticket._id,
      isDeleted: false
    })
    .populate('uploadedBy', 'name email')
    .sort({ createdAt: 1 });

    return res.status(200).json({
      success: true,
      attachments
    });
  } catch (error) {
    console.error('Get attachments error:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

// Delete attachment (soft delete)
export const deleteAttachment = async (req, res) => {
  try {
    const { id } = req.params;

    const attachment = await Attachment.findById(id);
    if (!attachment || attachment.isDeleted) {
      return res.status(404).json({
        success: false,
        message: 'Attachment not found'
      });
    }

    // Verify permission: Uploader or Company Admin can delete
    const isUploader = attachment.uploadedBy.toString() === req.user.id.toString();
    const isAdmin = req.user.role === 'ADMIN';

    if (!isUploader && !isAdmin) {
      return res.status(403).json({
        success: false,
        message: 'Access denied: You do not have permission to delete this attachment'
      });
    }

    const before = { fileName: attachment.fileName, isDeleted: attachment.isDeleted };
    applySoftDelete(attachment, req.user.id);
    await attachment.save();

    await createAuditLog({
      companyId: attachment.companyId,
      actorId: req.user.id,
      entityType: 'ATTACHMENT',
      entityId: attachment._id,
      action: 'ATTACHMENT_DELETED',
      before,
      after: { isDeleted: true, deletedAt: attachment.deletedAt },
      req
    });

    return res.status(200).json({
      success: true,
      message: 'Attachment deleted successfully'
    });
  } catch (error) {
    console.error('Delete attachment error:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};
