import { DataTypes } from 'sequelize';
import { sequelize } from '../config/sequelize.js';
import { addMongoCompat } from '../utils/apiShape.js';

const uuidPk = {
  type: DataTypes.UUID,
  defaultValue: DataTypes.UUIDV4,
  primaryKey: true
};

export const User = sequelize.define('User', {
  id: uuidPk,
  name: { type: DataTypes.STRING, allowNull: false },
  email: { type: DataTypes.STRING, allowNull: false, unique: true },
  username: { type: DataTypes.STRING, allowNull: false, unique: true },
  password: { type: DataTypes.STRING, allowNull: false },
  role: {
    type: DataTypes.ENUM('SUPER_ADMIN', 'ADMIN', 'EMPLOYEE', 'CLIENT'),
    defaultValue: 'ADMIN'
  },
  status: {
    type: DataTypes.ENUM('INVITED', 'ACTIVE', 'DISABLED'),
    defaultValue: 'ACTIVE'
  },
  companyId: { type: DataTypes.UUID, allowNull: true },
  lockedUntil: { type: DataTypes.DATE, allowNull: true },
  failedLoginAttempts: { type: DataTypes.INTEGER, defaultValue: 0 },
  passwordHistory: { type: DataTypes.JSON, defaultValue: [] }
}, { tableName: 'users' });

export const Company = sequelize.define('Company', {
  id: uuidPk,
  name: { type: DataTypes.STRING, allowNull: false },
  slug: { type: DataTypes.STRING, allowNull: false, unique: true },
  createdBy: { type: DataTypes.UUID, allowNull: false },
  subscriptionId: { type: DataTypes.UUID, allowNull: true }
}, { tableName: 'companies' });

export const Plan = sequelize.define('Plan', {
  id: uuidPk,
  name: { type: DataTypes.STRING, allowNull: false, unique: true },
  price: { type: DataTypes.DECIMAL(10, 2), defaultValue: 0 },
  maxProjects: { type: DataTypes.INTEGER, allowNull: false },
  maxEmployees: { type: DataTypes.INTEGER, allowNull: false },
  maxStorageGB: { type: DataTypes.INTEGER, defaultValue: 1 },
  maxTicketsPerMonth: { type: DataTypes.INTEGER, defaultValue: 100 },
  features: { type: DataTypes.JSON, defaultValue: [] }
}, { tableName: 'plans' });

export const Subscription = sequelize.define('Subscription', {
  id: uuidPk,
  companyId: { type: DataTypes.UUID, allowNull: false, unique: true },
  planId: { type: DataTypes.UUID, allowNull: false },
  startDate: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
  endDate: { type: DataTypes.DATE, allowNull: true },
  status: {
    type: DataTypes.ENUM('ACTIVE', 'EXPIRED', 'CANCELLED', 'TRIAL'),
    defaultValue: 'ACTIVE'
  },
  renewalDate: { type: DataTypes.DATE, allowNull: true }
}, {
  tableName: 'subscriptions',
  indexes: [
    { fields: ['company_id'] },
    { fields: ['status'] }
  ]
});

export const Project = sequelize.define('Project', {
  id: uuidPk,
  companyId: { type: DataTypes.UUID, allowNull: false },
  name: { type: DataTypes.STRING, allowNull: false },
  description: { type: DataTypes.TEXT, allowNull: true },
  status: {
    type: DataTypes.ENUM('ACTIVE', 'ARCHIVED'),
    defaultValue: 'ACTIVE'
  },
  isDeleted: { type: DataTypes.BOOLEAN, defaultValue: false },
  deletedAt: { type: DataTypes.DATE, allowNull: true },
  deletedBy: { type: DataTypes.UUID, allowNull: true },
  createdBy: { type: DataTypes.UUID, allowNull: false },
  updatedBy: { type: DataTypes.UUID, allowNull: true }
}, { tableName: 'projects' });

export const ProjectMember = sequelize.define('ProjectMember', {
  id: uuidPk,
  companyId: { type: DataTypes.UUID, allowNull: false },
  projectId: { type: DataTypes.UUID, allowNull: false },
  userId: { type: DataTypes.UUID, allowNull: false },
  role: {
    type: DataTypes.ENUM('PROJECT_ADMIN', 'DEVELOPER', 'TESTER', 'VIEWER', 'CLIENT'),
    defaultValue: 'DEVELOPER'
  },
  addedBy: { type: DataTypes.UUID, allowNull: false },
  joinedAt: { type: DataTypes.DATE, defaultValue: DataTypes.NOW }
}, {
  tableName: 'project_members',
  timestamps: false
});

export const Ticket = sequelize.define('Ticket', {
  id: uuidPk,
  companyId: { type: DataTypes.UUID, allowNull: false },
  projectId: { type: DataTypes.UUID, allowNull: false },
  ticketNumber: { type: DataTypes.STRING, allowNull: false, unique: true },
  title: { type: DataTypes.STRING, allowNull: false },
  description: { type: DataTypes.TEXT, allowNull: true },
  type: {
    type: DataTypes.ENUM('BUG', 'TASK', 'FEATURE', 'IMPROVEMENT', 'EPIC'),
    defaultValue: 'BUG'
  },
  priority: {
    type: DataTypes.ENUM('LOW', 'MEDIUM', 'HIGH', 'CRITICAL', 'BLOCKER'),
    defaultValue: 'MEDIUM'
  },
  status: {
    type: DataTypes.ENUM('BACKLOG', 'TODO', 'IN_PROGRESS', 'IN_REVIEW', 'TESTING', 'DONE', 'CLOSED', 'REOPENED'),
    defaultValue: 'BACKLOG'
  },
  reporterId: { type: DataTypes.UUID, allowNull: false },
  assigneeId: { type: DataTypes.UUID, allowNull: true },
  dueDate: { type: DataTypes.DATE, allowNull: true },
  estimatedHours: { type: DataTypes.FLOAT, allowNull: true },
  actualHours: { type: DataTypes.FLOAT, allowNull: true },
  isDeleted: { type: DataTypes.BOOLEAN, defaultValue: false },
  deletedAt: { type: DataTypes.DATE, allowNull: true },
  deletedBy: { type: DataTypes.UUID, allowNull: true },
  createdBy: { type: DataTypes.UUID, allowNull: false },
  updatedBy: { type: DataTypes.UUID, allowNull: true },
  resolvedAt: { type: DataTypes.DATE, allowNull: true }
}, {
  tableName: 'tickets',
  indexes: [
    { fields: ['company_id'] },
    { fields: ['project_id'] },
    { fields: ['assignee_id'] },
    { fields: ['status'] },
    { fields: ['resolved_at'] },
    { fields: ['company_id', 'created_at'] }
  ]
});

export const TicketSequence = sequelize.define('TicketSequence', {
  id: uuidPk,
  projectId: { type: DataTypes.UUID, allowNull: false, unique: true },
  currentNumber: { type: DataTypes.INTEGER, defaultValue: 100 }
}, {
  tableName: 'ticket_sequences',
  timestamps: false
});

export const Comment = sequelize.define('Comment', {
  id: uuidPk,
  companyId: { type: DataTypes.UUID, allowNull: false },
  projectId: { type: DataTypes.UUID, allowNull: false },
  ticketId: { type: DataTypes.UUID, allowNull: false },
  authorId: { type: DataTypes.UUID, allowNull: false },
  content: { type: DataTypes.TEXT, allowNull: false },
  edited: { type: DataTypes.BOOLEAN, defaultValue: false },
  editedAt: { type: DataTypes.DATE, allowNull: true },
  mentionCount: { type: DataTypes.INTEGER, defaultValue: 0 },
  isDeleted: { type: DataTypes.BOOLEAN, defaultValue: false },
  deletedAt: { type: DataTypes.DATE, allowNull: true },
  deletedBy: { type: DataTypes.UUID, allowNull: true }
}, { tableName: 'comments' });

export const Attachment = sequelize.define('Attachment', {
  id: uuidPk,
  companyId: { type: DataTypes.UUID, allowNull: false },
  projectId: { type: DataTypes.UUID, allowNull: false },
  ticketId: { type: DataTypes.UUID, allowNull: false },
  uploadedBy: { type: DataTypes.UUID, allowNull: false },
  fileName: { type: DataTypes.STRING, allowNull: false },
  fileUrl: { type: DataTypes.STRING, allowNull: false },
  mimeType: { type: DataTypes.STRING, allowNull: true },
  fileSize: { type: DataTypes.INTEGER, allowNull: true },
  isDeleted: { type: DataTypes.BOOLEAN, defaultValue: false },
  deletedAt: { type: DataTypes.DATE, allowNull: true },
  deletedBy: { type: DataTypes.UUID, allowNull: true }
}, { tableName: 'attachments' });

export const Activity = sequelize.define('Activity', {
  id: uuidPk,
  actorId: { type: DataTypes.UUID, allowNull: false },
  companyId: { type: DataTypes.UUID, allowNull: false },
  projectId: { type: DataTypes.UUID, allowNull: true },
  ticketId: { type: DataTypes.UUID, allowNull: true },
  entityType: { type: DataTypes.STRING, allowNull: true },
  entityId: { type: DataTypes.UUID, allowNull: true },
  action: { type: DataTypes.STRING, allowNull: false },
  metadata: { type: DataTypes.JSON, allowNull: true },
  createdAt: { type: DataTypes.DATE, defaultValue: DataTypes.NOW }
}, {
  tableName: 'activities',
  timestamps: false,
  updatedAt: false
});

export const Mention = sequelize.define('Mention', {
  id: uuidPk,
  companyId: { type: DataTypes.UUID, allowNull: false },
  ticketId: { type: DataTypes.UUID, allowNull: false },
  commentId: { type: DataTypes.UUID, allowNull: false },
  mentionedUserId: { type: DataTypes.UUID, allowNull: false },
  mentionedBy: { type: DataTypes.UUID, allowNull: false }
}, {
  tableName: 'mentions',
  indexes: [
    { fields: ['mentioned_user_id', 'created_at'] },
    { fields: ['ticket_id', 'created_at'] }
  ]
});

export const Notification = sequelize.define('Notification', {
  id: uuidPk,
  companyId: { type: DataTypes.UUID, allowNull: false },
  recipientId: { type: DataTypes.UUID, allowNull: false },
  actorId: { type: DataTypes.UUID, allowNull: false },
  type: {
    type: DataTypes.ENUM(
      'TICKET_ASSIGNED',
      'MENTIONED',
      'COMMENT_ADDED',
      'STATUS_CHANGED',
      'PRIORITY_CHANGED',
      'PROJECT_MEMBER_ADDED'
    ),
    allowNull: false
  },
  title: { type: DataTypes.STRING, allowNull: false },
  message: { type: DataTypes.TEXT, allowNull: false },
  entityType: {
    type: DataTypes.ENUM('TICKET', 'COMMENT', 'PROJECT'),
    allowNull: false
  },
  entityId: { type: DataTypes.UUID, allowNull: false },
  isRead: { type: DataTypes.BOOLEAN, defaultValue: false }
}, {
  tableName: 'notifications',
  indexes: [{ fields: ['recipient_id', 'is_read', 'created_at'] }]
});

export const SavedFilter = sequelize.define('SavedFilter', {
  id: uuidPk,
  companyId: { type: DataTypes.UUID, allowNull: false },
  userId: { type: DataTypes.UUID, allowNull: false },
  name: { type: DataTypes.STRING, allowNull: false },
  filters: { type: DataTypes.JSON, allowNull: false }
}, {
  tableName: 'saved_filters',
  indexes: [{ fields: ['company_id', 'user_id'] }]
});

export const Usage = sequelize.define('Usage', {
  id: uuidPk,
  companyId: { type: DataTypes.UUID, allowNull: false, unique: true },
  projectsCount: { type: DataTypes.INTEGER, defaultValue: 0 },
  employeesCount: { type: DataTypes.INTEGER, defaultValue: 0 },
  storageUsed: { type: DataTypes.INTEGER, defaultValue: 0 },
  ticketsCreatedThisMonth: { type: DataTypes.INTEGER, defaultValue: 0 },
  usageMonth: {
    type: DataTypes.STRING(7),
    defaultValue: () => new Date().toISOString().slice(0, 7)
  }
}, { tableName: 'usages' });

export const TicketMetrics = sequelize.define('TicketMetrics', {
  id: uuidPk,
  companyId: { type: DataTypes.UUID, allowNull: false },
  date: { type: DataTypes.DATEONLY, allowNull: false },
  ticketsCreated: { type: DataTypes.INTEGER, defaultValue: 0 },
  ticketsClosed: { type: DataTypes.INTEGER, defaultValue: 0 },
  avgResolutionTime: { type: DataTypes.FLOAT, allowNull: true }
}, {
  tableName: 'ticket_metrics',
  indexes: [{ unique: true, fields: ['company_id', 'date'] }]
});

export const AuditLog = sequelize.define('AuditLog', {
  id: uuidPk,
  companyId: { type: DataTypes.UUID, allowNull: true },
  actorId: { type: DataTypes.UUID, allowNull: false },
  entityType: { type: DataTypes.STRING, allowNull: false },
  entityId: { type: DataTypes.UUID, allowNull: true },
  action: { type: DataTypes.STRING, allowNull: false },
  before: { type: DataTypes.JSON, allowNull: true },
  after: { type: DataTypes.JSON, allowNull: true },
  ipAddress: { type: DataTypes.STRING, allowNull: true },
  userAgent: { type: DataTypes.TEXT, allowNull: true }
}, {
  tableName: 'audit_logs',
  updatedAt: false,
  indexes: [
    { fields: ['company_id', 'created_at'] },
    { fields: ['actor_id', 'created_at'] },
    { fields: ['entity_type', 'entity_id', 'created_at'] },
    { fields: ['action', 'created_at'] }
  ]
});

export const LoginAttempt = sequelize.define('LoginAttempt', {
  id: uuidPk,
  email: { type: DataTypes.STRING, allowNull: false },
  ipAddress: { type: DataTypes.STRING, allowNull: true },
  success: { type: DataTypes.BOOLEAN, allowNull: false }
}, {
  tableName: 'login_attempts',
  updatedAt: false,
  indexes: [
    { fields: ['email', 'created_at'] },
    { fields: ['ip_address', 'created_at'] },
    { fields: ['success', 'created_at'] }
  ]
});

export const UserSession = sequelize.define('UserSession', {
  id: uuidPk,
  userId: { type: DataTypes.UUID, allowNull: false },
  tokenId: { type: DataTypes.STRING, allowNull: false, unique: true },
  device: { type: DataTypes.STRING, defaultValue: 'Unknown Device' },
  ipAddress: { type: DataTypes.STRING, allowNull: true },
  lastSeen: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
  isActive: { type: DataTypes.BOOLEAN, defaultValue: true }
}, {
  tableName: 'user_sessions',
  indexes: [
    { fields: ['user_id', 'is_active'] },
    { fields: ['token_id'] }
  ]
});

export const ClientIssue = sequelize.define('ClientIssue', {
  id: uuidPk,
  companyId: { type: DataTypes.UUID, allowNull: false },
  projectId: { type: DataTypes.UUID, allowNull: false },
  clientId: { type: DataTypes.UUID, allowNull: false },
  title: { type: DataTypes.STRING, allowNull: false },
  description: { type: DataTypes.TEXT, allowNull: true },
  imageUrl: { type: DataTypes.STRING, allowNull: true },
  status: {
    type: DataTypes.ENUM('PENDING', 'CONVERTED', 'REJECTED'),
    defaultValue: 'PENDING'
  },
  convertedTicketId: { type: DataTypes.UUID, allowNull: true },
  convertedBy: { type: DataTypes.UUID, allowNull: true },
  convertedAt: { type: DataTypes.DATE, allowNull: true }
}, {
  tableName: 'client_issues',
  indexes: [
    { fields: ['company_id'] },
    { fields: ['project_id'] },
    { fields: ['client_id'] },
    { fields: ['status'] }
  ]
});

// ── Associations ──────────────────────────────────────────────────────────────
User.belongsTo(Company, { foreignKey: 'companyId', as: 'company' });
Company.hasMany(User, { foreignKey: 'companyId', as: 'users' });
Company.belongsTo(User, { foreignKey: 'createdBy', as: 'creator' });
Company.belongsTo(Subscription, { foreignKey: 'subscriptionId', as: 'subscription' });

Subscription.belongsTo(Company, { foreignKey: 'companyId', as: 'company' });
Subscription.belongsTo(Plan, { foreignKey: 'planId', as: 'plan' });
Company.hasOne(Subscription, { foreignKey: 'companyId', as: 'companySubscription' });
Plan.hasMany(Subscription, { foreignKey: 'planId', as: 'subscriptions' });

Project.belongsTo(Company, { foreignKey: 'companyId', as: 'company' });
Project.belongsTo(User, { foreignKey: 'createdBy', as: 'creator' });
Project.belongsTo(User, { foreignKey: 'updatedBy', as: 'updater' });
Project.belongsTo(User, { foreignKey: 'deletedBy', as: 'deleter' });

ProjectMember.belongsTo(Project, { foreignKey: 'projectId', as: 'project' });
ProjectMember.belongsTo(User, { foreignKey: 'userId', as: 'user' });
ProjectMember.belongsTo(User, { foreignKey: 'addedBy', as: 'addedByUser' });
ProjectMember.belongsTo(Company, { foreignKey: 'companyId', as: 'company' });

Ticket.belongsTo(Company, { foreignKey: 'companyId', as: 'company' });
Ticket.belongsTo(Project, { foreignKey: 'projectId', as: 'project' });
Ticket.belongsTo(User, { foreignKey: 'reporterId', as: 'reporter' });
Ticket.belongsTo(User, { foreignKey: 'assigneeId', as: 'assignee' });
Ticket.belongsTo(User, { foreignKey: 'createdBy', as: 'creator' });
Ticket.belongsTo(User, { foreignKey: 'updatedBy', as: 'updater' });
Ticket.belongsTo(User, { foreignKey: 'deletedBy', as: 'deleter' });

TicketSequence.belongsTo(Project, { foreignKey: 'projectId', as: 'project' });

Comment.belongsTo(Ticket, { foreignKey: 'ticketId', as: 'ticket' });
Comment.belongsTo(User, { foreignKey: 'authorId', as: 'author' });
Comment.belongsTo(Company, { foreignKey: 'companyId', as: 'company' });
Comment.belongsTo(Project, { foreignKey: 'projectId', as: 'project' });

Attachment.belongsTo(Ticket, { foreignKey: 'ticketId', as: 'ticket' });
Attachment.belongsTo(User, { foreignKey: 'uploadedBy', as: 'uploader' });

Activity.belongsTo(User, { foreignKey: 'actorId', as: 'actor' });
Activity.belongsTo(Ticket, { foreignKey: 'ticketId', as: 'ticket' });
Activity.belongsTo(Project, { foreignKey: 'projectId', as: 'project' });
Activity.belongsTo(Company, { foreignKey: 'companyId', as: 'company' });

Mention.belongsTo(User, { foreignKey: 'mentionedUserId', as: 'mentionedUser' });
Mention.belongsTo(User, { foreignKey: 'mentionedBy', as: 'mentionedByUser' });
Mention.belongsTo(Ticket, { foreignKey: 'ticketId', as: 'ticket' });
Mention.belongsTo(Comment, { foreignKey: 'commentId', as: 'comment' });

Notification.belongsTo(User, { foreignKey: 'recipientId', as: 'recipient' });
Notification.belongsTo(User, { foreignKey: 'actorId', as: 'actor' });

SavedFilter.belongsTo(User, { foreignKey: 'userId', as: 'user' });
SavedFilter.belongsTo(Company, { foreignKey: 'companyId', as: 'company' });

Usage.belongsTo(Company, { foreignKey: 'companyId', as: 'company' });
TicketMetrics.belongsTo(Company, { foreignKey: 'companyId', as: 'company' });

AuditLog.belongsTo(User, { foreignKey: 'actorId', as: 'actor' });
AuditLog.belongsTo(Company, { foreignKey: 'companyId', as: 'company' });

UserSession.belongsTo(User, { foreignKey: 'userId', as: 'user' });

ClientIssue.belongsTo(Company, { foreignKey: 'companyId', as: 'company' });
ClientIssue.belongsTo(Project, { foreignKey: 'projectId', as: 'project' });
ClientIssue.belongsTo(User, { foreignKey: 'clientId', as: 'client' });
ClientIssue.belongsTo(Ticket, { foreignKey: 'convertedTicketId', as: 'convertedTicket' });
ClientIssue.belongsTo(User, { foreignKey: 'convertedBy', as: 'converter' });

[
  User, Company, Plan, Subscription, Project, ProjectMember, Ticket,
  TicketSequence, Comment, Attachment, Activity, Mention, Notification,
  SavedFilter, Usage, TicketMetrics, AuditLog, LoginAttempt, UserSession,
  ClientIssue
].forEach(addMongoCompat);

export { sequelize };

export default {
  sequelize,
  User,
  Company,
  Plan,
  Subscription,
  Project,
  ProjectMember,
  Ticket,
  TicketSequence,
  Comment,
  Attachment,
  Activity,
  Mention,
  Notification,
  SavedFilter,
  Usage,
  TicketMetrics,
  AuditLog,
  LoginAttempt,
  UserSession,
  ClientIssue
};
