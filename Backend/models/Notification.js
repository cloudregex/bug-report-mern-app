import mongoose from 'mongoose';

const notificationSchema = new mongoose.Schema({
  companyId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Company',
    required: true
  },
  // The user who RECEIVES this notification
  recipientId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  // The user who TRIGGERED this notification (e.g. who made the comment)
  actorId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  type: {
    type: String,
    enum: [
      'TICKET_ASSIGNED',
      'MENTIONED',
      'COMMENT_ADDED',
      'STATUS_CHANGED',
      'PRIORITY_CHANGED',
      'PROJECT_MEMBER_ADDED'
    ],
    required: true
  },
  title: {
    type: String,
    required: true
  },
  message: {
    type: String,
    required: true
  },
  // What entity this notification points to (e.g. TICKET, COMMENT)
  entityType: {
    type: String,
    enum: ['TICKET', 'COMMENT', 'PROJECT'],
    required: true
  },
  // The _id of that entity — used by frontend to build the deep link
  entityId: {
    type: mongoose.Schema.Types.ObjectId,
    required: true
  },
  isRead: {
    type: Boolean,
    default: false
  }
}, {
  timestamps: true
});

// Index for fast per-user notification queries (most common operation)
notificationSchema.index({ recipientId: 1, isRead: 1, createdAt: -1 });

const Notification = mongoose.model('Notification', notificationSchema);
export default Notification;
