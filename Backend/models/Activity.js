import mongoose from 'mongoose';

const activitySchema = new mongoose.Schema({
  actorId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  companyId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Company',
    required: true
  },
  projectId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Project'
  },
  ticketId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Ticket'
  },
  entityType: {
    type: String // 'PROJECT', 'MEMBER', 'TICKET', 'COMMENT', 'ATTACHMENT'
  },
  entityId: {
    type: mongoose.Schema.Types.ObjectId
  },
  action: {
    type: String,
    required: true // 'CREATE', 'ADD_MEMBER', 'REMOVE_MEMBER', 'CHANGE_ROLE', 'ARCHIVE', 'DELETE', 'STATUS_CHANGED', 'PRIORITY_CHANGED', 'ASSIGNEE_CHANGED', 'COMMENT_ADDED', 'ATTACHMENT_UPLOADED'
  },
  metadata: {
    type: mongoose.Schema.Types.Mixed
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

const Activity = mongoose.model('Activity', activitySchema);
export default Activity;
