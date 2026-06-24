import Comment from '../models/Comment.js';
import Activity from '../models/Activity.js';
import User from '../models/User.js';
import Ticket from '../models/Ticket.js';
import { createNotification, parseMentions, processMentions } from '../services/notificationService.js';
import { createAuditLog, applySoftDelete } from '../services/auditService.js';
import { getIO } from '../socket.js';

// ── Create a comment ──────────────────────────────────────────────────────────
export const createComment = async (req, res) => {
  try {
    const { content } = req.body;
    const ticket = req.ticket; // from authorizeTicketAccess

    if (!content || !content.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Comment content is required'
      });
    }

    const trimmedContent = content.trim();

    // ── Step 1: Parse mentions BEFORE saving (to get count) ─────────────────
    const mentionedUsers = await parseMentions(
      trimmedContent,
      ticket.projectId,
      ticket.companyId,
      req.user.id
    );

    // ── Step 2: Save the comment ─────────────────────────────────────────────
    const comment = new Comment({
      companyId: ticket.companyId,
      projectId: ticket.projectId,
      ticketId: ticket._id,
      authorId: req.user.id,
      content: trimmedContent,
      mentionCount: mentionedUsers.length
    });

    await comment.save();

    // ── Step 3: Log Activity (audit trail) ───────────────────────────────────
    const activity = new Activity({
      actorId: req.user.id,
      companyId: ticket.companyId,
      projectId: ticket.projectId,
      ticketId: ticket._id,
      entityType: 'COMMENT',
      entityId: comment._id,
      action: 'COMMENT_ADDED',
      metadata: {
        commentId: comment._id,
        contentSummary: trimmedContent.substring(0, 40)
      }
    });
    await activity.save();

    // ── Step 4: Process @mentions ────────────────────────────────────────────
    // Creates Mention records + MENTIONED notifications + socket events
    if (mentionedUsers.length > 0) {
      await processMentions(comment, mentionedUsers, req.user.id, ticket.ticketNumber);
    }

    // ── Step 5: COMMENT_ADDED notifications ──────────────────────────────────
    // Notify assignee and reporter — but only if they're NOT the comment author
    // and NOT already being notified via @mention
    const mentionedUserIds = new Set(mentionedUsers.map(u => u._id.toString()));
    const authorId = req.user.id.toString();
    const actor = await User.findById(req.user.id).select('name');
    const actorName = actor?.name || 'Someone';

    const notifyTargets = new Set();
    if (ticket.assigneeId && ticket.assigneeId.toString() !== authorId) {
      notifyTargets.add(ticket.assigneeId.toString());
    }
    if (ticket.reporterId && ticket.reporterId.toString() !== authorId) {
      notifyTargets.add(ticket.reporterId.toString());
    }

    for (const recipientId of notifyTargets) {
      // Skip if already notified via @mention
      if (mentionedUserIds.has(recipientId)) continue;

      await createNotification({
        companyId: ticket.companyId,
        recipientId,
        actorId: req.user.id,
        type: 'COMMENT_ADDED',
        title: 'New comment on ticket',
        message: `${actorName} commented on ${ticket.ticketNumber}`,
        entityType: 'TICKET',
        entityId: ticket._id
      });
    }

    // ── Step 6: Emit comment:created to ticket room ──────────────────────────
    // All users currently on the ticket detail page will see the new comment
    // without refreshing.
    const populatedComment = await Comment.findById(comment._id)
      .populate('authorId', 'name email username');

    try {
      getIO()
        .to(`ticket:${ticket._id}`)
        .emit('comment:created', populatedComment);
    } catch (socketErr) {
      console.warn('[CommentController] comment:created emit failed:', socketErr.message);
    }

    return res.status(201).json({
      success: true,
      message: 'Comment added successfully',
      comment: populatedComment
    });
  } catch (error) {
    console.error('Create comment error:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

// ── Get comments for a ticket ─────────────────────────────────────────────────
export const getComments = async (req, res) => {
  try {
    const ticket = req.ticket;

    const comments = await Comment.find({
      ticketId: ticket._id,
      isDeleted: false
    })
    .populate('authorId', 'name email username')
    .sort({ createdAt: 1 }); // Oldest first (discussion order)

    return res.status(200).json({
      success: true,
      comments
    });
  } catch (error) {
    console.error('Get comments error:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

// ── Update a comment (author only) ────────────────────────────────────────────
export const updateComment = async (req, res) => {
  try {
    const { id } = req.params;
    const { content } = req.body;

    if (!content || !content.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Comment content is required'
      });
    }

    const comment = await Comment.findById(id);
    if (!comment || comment.isDeleted) {
      return res.status(404).json({
        success: false,
        message: 'Comment not found'
      });
    }

    // Verify authorship
    if (comment.authorId.toString() !== req.user.id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Access denied: You can only edit your own comments'
      });
    }

    comment.content = content.trim();
    comment.edited = true;
    comment.editedAt = new Date();
    await comment.save();

    const populatedComment = await Comment.findById(comment._id)
      .populate('authorId', 'name email username');

    return res.status(200).json({
      success: true,
      message: 'Comment updated successfully',
      comment: populatedComment
    });
  } catch (error) {
    console.error('Update comment error:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

// ── Soft delete comment ───────────────────────────────────────────────────────
export const deleteComment = async (req, res) => {
  try {
    const { id } = req.params;

    const comment = await Comment.findById(id);
    if (!comment || comment.isDeleted) {
      return res.status(404).json({
        success: false,
        message: 'Comment not found'
      });
    }

    // Verify permission: Author or Company Admin can delete
    const isAuthor = comment.authorId.toString() === req.user.id.toString();
    const isAdmin = req.user.role === 'ADMIN';

    if (!isAuthor && !isAdmin) {
      return res.status(403).json({
        success: false,
        message: 'Access denied: You do not have permission to delete this comment'
      });
    }

    const before = { content: comment.content, isDeleted: comment.isDeleted };
    applySoftDelete(comment, req.user.id);
    await comment.save();

    await createAuditLog({
      companyId: comment.companyId,
      actorId: req.user.id,
      entityType: 'COMMENT',
      entityId: comment._id,
      action: 'COMMENT_DELETED',
      before,
      after: { isDeleted: true, deletedAt: comment.deletedAt },
      req
    });

    return res.status(200).json({
      success: true,
      message: 'Comment deleted successfully'
    });
  } catch (error) {
    console.error('Delete comment error:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};
