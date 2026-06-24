import Notification from '../models/Notification.js';
import Mention from '../models/Mention.js';
import ProjectMember from '../models/ProjectMember.js';
import User from '../models/User.js';
import { getIO } from '../socket.js';

// ─────────────────────────────────────────────────────────────────────────────
// createNotification
// ─────────────────────────────────────────────────────────────────────────────
/**
 * Saves a notification to MongoDB, then attempts to push it to the
 * recipient's socket room. Socket failure is non-critical — the DB
 * record is the source of truth.
 *
 * @param {Object} data - Notification fields
 * @returns {Promise<Notification>}
 */
export const createNotification = async (data) => {
  try {
    const notification = new Notification(data);
    await notification.save();

    // Populate actor name for the real-time payload
    const populated = await Notification.findById(notification._id)
      .populate('actorId', 'name username');

    // ── Socket Emit (best-effort) ────────────────────────────────────────────
    // If the user is offline, getIO().to() finds an empty room and the event
    // is dropped silently. The user will fetch it on next login via REST API.
    try {
      getIO()
        .to(data.recipientId.toString())
        .emit('notification:new', populated);
    } catch (socketErr) {
      // Socket crash / not initialized — log only, do NOT throw
      console.warn('[NotificationService] Socket emit failed (non-critical):', socketErr.message);
    }

    return populated;
  } catch (dbErr) {
    // DB failure IS critical — rethrow so the caller knows
    console.error('[NotificationService] Failed to save notification:', dbErr);
    throw dbErr;
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// parseMentions
// ─────────────────────────────────────────────────────────────────────────────
/**
 * Extracts @username tokens from comment content, resolves each to a User
 * document, but only if that user is a member of the project (or is ADMIN).
 *
 * Example:
 *   content = "@rahul_k can you check this?"
 *   returns  = [{ _id: ObjectId, name: "Rahul K", username: "rahul_k" }]
 *
 * @param {string} content    - Raw comment text
 * @param {ObjectId} projectId
 * @param {ObjectId} companyId
 * @param {ObjectId} authorId - Exclude the author from their own mentions
 * @returns {Promise<User[]>} - Array of resolved User documents (deduplicated)
 */
export const parseMentions = async (content, projectId, companyId, authorId) => {
  // Step 1 — Extract all @word tokens
  const matches = content.match(/@(\w+)/g);
  if (!matches || matches.length === 0) return [];

  // Remove '@' prefix and deduplicate
  const usernames = [...new Set(matches.map(m => m.slice(1)))];

  // Step 2 — Find users with those usernames in this company
  const users = await User.find({
    username: { $in: usernames },
    companyId,
    status: 'ACTIVE'
  }).select('_id name username role');

  if (users.length === 0) return [];

  // Step 3 — For non-ADMIN users, verify project membership
  const userIds = users.map(u => u._id);

  const members = await ProjectMember.find({
    projectId,
    userId: { $in: userIds }
  }).select('userId');

  const memberUserIds = new Set(members.map(m => m.userId.toString()));

  // Keep: admins (company-wide access) + project members
  // Remove: the comment author (can't self-mention)
  const resolved = users.filter(u => {
    if (u._id.toString() === authorId.toString()) return false;
    if (u.role === 'ADMIN') return true;
    return memberUserIds.has(u._id.toString());
  });

  return resolved;
};

// ─────────────────────────────────────────────────────────────────────────────
// processMentions
// ─────────────────────────────────────────────────────────────────────────────
/**
 * For each resolved mention user:
 *   1. Creates a Mention record (permanent storage for analytics)
 *   2. Creates a MENTIONED notification (with socket emit)
 *   3. Emits a mention:created socket event to the mentioned user
 *
 * @param {Comment} comment        - Saved comment document
 * @param {User[]}  resolvedUsers  - Output of parseMentions()
 * @param {ObjectId} actorId       - Who wrote the comment
 * @param {string}   ticketNumber  - For human-readable notification message
 * @returns {Promise<number>}      - Count of mentions processed
 */
export const processMentions = async (comment, resolvedUsers, actorId, ticketNumber = '') => {
  if (!resolvedUsers || resolvedUsers.length === 0) return 0;

  const actor = await User.findById(actorId).select('name username');
  const actorName = actor?.name || 'Someone';

  for (const user of resolvedUsers) {
    try {
      // 1. Store permanent Mention record
      const mention = new Mention({
        companyId: comment.companyId,
        ticketId: comment.ticketId,
        commentId: comment._id,
        mentionedUserId: user._id,
        mentionedBy: actorId
      });
      await mention.save();

      // 2. Create MENTIONED notification (also fires socket event internally)
      const notification = await createNotification({
        companyId: comment.companyId,
        recipientId: user._id,
        actorId,
        type: 'MENTIONED',
        title: 'You were mentioned',
        message: `${actorName} mentioned you in a comment on ${ticketNumber || 'a ticket'}`,
        entityType: 'COMMENT',
        entityId: comment._id
      });

      // 3. Also emit a dedicated mention:created event (frontend can handle separately)
      try {
        getIO()
          .to(user._id.toString())
          .emit('mention:created', {
            mention: {
              _id: mention._id,
              ticketId: comment.ticketId,
              commentId: comment._id,
              mentionedBy: { _id: actorId, name: actorName }
            },
            notification
          });
      } catch (socketErr) {
        console.warn('[NotificationService] mention:created emit failed:', socketErr.message);
      }

    } catch (err) {
      // One mention failing should NOT block the others
      console.error(`[NotificationService] Failed to process mention for user ${user._id}:`, err);
    }
  }

  return resolvedUsers.length;
};
