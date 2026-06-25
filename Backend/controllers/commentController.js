import Comment from '../models/Comment.js';
import Activity from '../models/Activity.js';
import User from '../models/User.js';
import { createNotification, parseMentions, processMentions } from '../services/notificationService.js';
import { createAuditLog, applySoftDelete } from '../services/auditService.js';
import { getIO } from '../socket.js';
import { commentIncludes } from '../utils/queryIncludes.js';
import { shapeComment } from '../utils/apiShape.js';

export const createComment = async (req, res) => {
  try {
    const { content } = req.body;
    const ticket = req.ticket;

    if (!content || !content.trim()) {
      return res.status(400).json({ success: false, message: 'Comment content is required' });
    }

    const trimmedContent = content.trim();
    const mentionedUsers = await parseMentions(trimmedContent, ticket.projectId, ticket.companyId, req.user.id);

    const comment = await Comment.create({
      companyId: ticket.companyId,
      projectId: ticket.projectId,
      ticketId: ticket.id,
      authorId: req.user.id,
      content: trimmedContent,
      mentionCount: mentionedUsers.length
    });

    await Activity.create({
      actorId: req.user.id,
      companyId: ticket.companyId,
      projectId: ticket.projectId,
      ticketId: ticket.id,
      entityType: 'COMMENT',
      entityId: comment.id,
      action: 'COMMENT_ADDED',
      metadata: { commentId: comment.id, contentSummary: trimmedContent.substring(0, 40) }
    });

    if (mentionedUsers.length > 0) {
      await processMentions(comment, mentionedUsers, req.user.id, ticket.ticketNumber);
    }

    const mentionedUserIds = new Set(mentionedUsers.map((u) => String(u.id)));
    const authorId = String(req.user.id);
    const actor = await User.findByPk(req.user.id, { attributes: ['name'] });
    const actorName = actor?.name || 'Someone';
    const notifyTargets = new Set();

    if (ticket.assigneeId && String(ticket.assigneeId) !== authorId) notifyTargets.add(String(ticket.assigneeId));
    if (ticket.reporterId && String(ticket.reporterId) !== authorId) notifyTargets.add(String(ticket.reporterId));

    for (const recipientId of notifyTargets) {
      if (mentionedUserIds.has(recipientId)) continue;
      await createNotification({
        companyId: ticket.companyId,
        recipientId,
        actorId: req.user.id,
        type: 'COMMENT_ADDED',
        title: 'New comment on ticket',
        message: `${actorName} commented on ${ticket.ticketNumber}`,
        entityType: 'TICKET',
        entityId: ticket.id
      });
    }

    const populatedComment = shapeComment(await Comment.findByPk(comment.id, { include: commentIncludes() }));

    try {
      getIO().to(`ticket:${ticket.id}`).emit('comment:created', populatedComment);
    } catch (socketErr) {
      console.warn('[CommentController] comment:created emit failed:', socketErr.message);
    }

    return res.status(201).json({ success: true, message: 'Comment added successfully', comment: populatedComment });
  } catch (error) {
    console.error('Create comment error:', error);
    return res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

export const getComments = async (req, res) => {
  try {
    const comments = await Comment.findAll({
      where: { ticketId: req.ticket.id, isDeleted: false },
      include: commentIncludes(),
      order: [['createdAt', 'ASC']]
    });
    return res.status(200).json({ success: true, comments: comments.map(shapeComment) });
  } catch (error) {
    console.error('Get comments error:', error);
    return res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

export const updateComment = async (req, res) => {
  try {
    const { content } = req.body;
    if (!content || !content.trim()) {
      return res.status(400).json({ success: false, message: 'Comment content is required' });
    }

    const comment = await Comment.findByPk(req.params.id);
    if (!comment || comment.isDeleted) {
      return res.status(404).json({ success: false, message: 'Comment not found' });
    }
    if (String(comment.authorId) !== String(req.user.id)) {
      return res.status(403).json({ success: false, message: 'Access denied: You can only edit your own comments' });
    }

    comment.content = content.trim();
    comment.edited = true;
    comment.editedAt = new Date();
    await comment.save();

    const populatedComment = shapeComment(await Comment.findByPk(comment.id, { include: commentIncludes() }));
    return res.status(200).json({ success: true, message: 'Comment updated successfully', comment: populatedComment });
  } catch (error) {
    console.error('Update comment error:', error);
    return res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

export const deleteComment = async (req, res) => {
  try {
    const comment = await Comment.findByPk(req.params.id);
    if (!comment || comment.isDeleted) {
      return res.status(404).json({ success: false, message: 'Comment not found' });
    }

    const isAuthor = String(comment.authorId) === String(req.user.id);
    const isAdmin = req.user.role === 'ADMIN';
    if (!isAuthor && !isAdmin) {
      return res.status(403).json({ success: false, message: 'Access denied: You do not have permission to delete this comment' });
    }

    const before = { content: comment.content, isDeleted: comment.isDeleted };
    applySoftDelete(comment, req.user.id);
    await comment.save();

    await createAuditLog({
      companyId: comment.companyId,
      actorId: req.user.id,
      entityType: 'COMMENT',
      entityId: comment.id,
      action: 'COMMENT_DELETED',
      before,
      after: { isDeleted: true, deletedAt: comment.deletedAt },
      req
    });

    return res.status(200).json({ success: true, message: 'Comment deleted successfully' });
  } catch (error) {
    console.error('Delete comment error:', error);
    return res.status(500).json({ success: false, message: 'Internal server error' });
  }
};
