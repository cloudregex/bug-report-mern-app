import Mention from '../models/Mention.js';
import { authorizeTicketAccess } from '../middleware/authMiddleware.js';

// ── GET /mentions ─────────────────────────────────────────────────────────────
// Returns all mentions for the current user (My Mentions feed).
export const getMyMentions = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;

    const [mentions, total] = await Promise.all([
      Mention.find({ mentionedUserId: req.user.id })
        .populate('mentionedBy', 'name username')
        .populate('ticketId', 'ticketNumber title')
        .populate('commentId', 'content createdAt')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),
      Mention.countDocuments({ mentionedUserId: req.user.id })
    ]);

    return res.status(200).json({
      success: true,
      mentions,
      pagination: {
        total,
        page,
        limit,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Get my mentions error:', error);
    return res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

// ── GET /tickets/:id/mentions ─────────────────────────────────────────────────
// Returns all mentions within a specific ticket (for ticket activity feed).
// Note: authorizeTicketAccess middleware runs before this in the router.
export const getTicketMentions = async (req, res) => {
  try {
    const ticketId = req.ticket._id; // set by authorizeTicketAccess middleware

    const mentions = await Mention.find({ ticketId })
      .populate('mentionedUserId', 'name username')
      .populate('mentionedBy', 'name username')
      .populate('commentId', 'content createdAt')
      .sort({ createdAt: -1 });

    return res.status(200).json({
      success: true,
      mentions
    });
  } catch (error) {
    console.error('Get ticket mentions error:', error);
    return res.status(500).json({ success: false, message: 'Internal server error' });
  }
};
