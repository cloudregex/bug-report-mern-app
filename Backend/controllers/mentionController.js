import Mention from '../models/Mention.js';
import { mentionIncludes } from '../utils/queryIncludes.js';
import { shapeMention } from '../utils/apiShape.js';

export const getMyMentions = async (req, res) => {
  try {
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 20;
    const offset = (page - 1) * limit;

    const [mentions, total] = await Promise.all([
      Mention.findAll({
        where: { mentionedUserId: req.user.id },
        include: mentionIncludes(),
        order: [['createdAt', 'DESC']],
        offset,
        limit
      }),
      Mention.count({ where: { mentionedUserId: req.user.id } })
    ]);

    return res.status(200).json({
      success: true,
      mentions: mentions.map(shapeMention),
      pagination: { total, page, limit, pages: Math.ceil(total / limit) }
    });
  } catch (error) {
    console.error('Get my mentions error:', error);
    return res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

export const getTicketMentions = async (req, res) => {
  try {
    const mentions = await Mention.findAll({
      where: { ticketId: req.ticket.id },
      include: mentionIncludes(),
      order: [['createdAt', 'DESC']]
    });

    return res.status(200).json({
      success: true,
      mentions: mentions.map(shapeMention)
    });
  } catch (error) {
    console.error('Get ticket mentions error:', error);
    return res.status(500).json({ success: false, message: 'Internal server error' });
  }
};
