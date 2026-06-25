import { Op } from 'sequelize';
import Notification from '../models/Notification.js';
import Mention from '../models/Mention.js';
import ProjectMember from '../models/ProjectMember.js';
import User from '../models/User.js';
import { getIO } from '../socket.js';
import { notificationIncludes } from '../utils/queryIncludes.js';
import { shapeNotification, toApiDoc } from '../utils/apiShape.js';

export const createNotification = async (data) => {
  try {
    const notification = await Notification.create(data);

    const populated = await Notification.findByPk(notification.id, {
      include: notificationIncludes()
    });
    const shaped = shapeNotification(populated);

    try {
      getIO()
        .to(String(data.recipientId))
        .emit('notification:new', shaped);
    } catch (socketErr) {
      console.warn('[NotificationService] Socket emit failed (non-critical):', socketErr.message);
    }

    return shaped;
  } catch (dbErr) {
    console.error('[NotificationService] Failed to save notification:', dbErr);
    throw dbErr;
  }
};

export const parseMentions = async (content, projectId, companyId, authorId) => {
  const matches = content.match(/@(\w+)/g);
  if (!matches || matches.length === 0) return [];

  const usernames = [...new Set(matches.map((m) => m.slice(1)))];

  const users = await User.findAll({
    where: {
      username: { [Op.in]: usernames },
      companyId,
      status: 'ACTIVE'
    },
    attributes: ['id', 'name', 'username', 'role']
  });

  if (users.length === 0) return [];

  const userIds = users.map((u) => u.id);

  const members = await ProjectMember.findAll({
    where: {
      projectId,
      userId: { [Op.in]: userIds }
    },
    attributes: ['userId']
  });

  const memberUserIds = new Set(members.map((m) => String(m.userId)));

  return users.filter((u) => {
    if (String(u.id) === String(authorId)) return false;
    if (u.role === 'ADMIN') return true;
    return memberUserIds.has(String(u.id));
  });
};

export const processMentions = async (comment, resolvedUsers, actorId, ticketNumber = '') => {
  if (!resolvedUsers || resolvedUsers.length === 0) return 0;

  const actor = await User.findByPk(actorId, { attributes: ['name', 'username'] });
  const actorName = actor?.name || 'Someone';

  for (const user of resolvedUsers) {
    try {
      const mention = await Mention.create({
        companyId: comment.companyId,
        ticketId: comment.ticketId,
        commentId: comment.id,
        mentionedUserId: user.id,
        mentionedBy: actorId
      });

      const notification = await createNotification({
        companyId: comment.companyId,
        recipientId: user.id,
        actorId,
        type: 'MENTIONED',
        title: 'You were mentioned',
        message: `${actorName} mentioned you in a comment on ${ticketNumber || 'a ticket'}`,
        entityType: 'COMMENT',
        entityId: comment.id
      });

      try {
        getIO()
          .to(String(user.id))
          .emit('mention:created', {
            mention: {
              _id: mention.id,
              ticketId: comment.ticketId,
              commentId: comment.id,
              mentionedBy: { _id: actorId, name: actorName }
            },
            notification
          });
      } catch (socketErr) {
        console.warn('[NotificationService] mention:created emit failed:', socketErr.message);
      }
    } catch (err) {
      console.error(`[NotificationService] Failed to process mention for user ${user.id}:`, err);
    }
  }

  return resolvedUsers.length;
};

export { toApiDoc };
