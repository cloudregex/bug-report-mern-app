import {
  User,
  Project,
  Company,
  Plan,
  Ticket,
  Comment
} from '../models/index.js';

export const userBriefAttrs = ['id', 'name', 'email', 'username', 'role', 'status'];

export const ticketIncludes = () => [
  { model: User, as: 'reporter', attributes: ['id', 'name', 'email'] },
  { model: User, as: 'assignee', attributes: ['id', 'name', 'email'] },
  { model: Project, as: 'project', attributes: ['id', 'name'] }
];

export const activityIncludes = () => [
  { model: User, as: 'actor', attributes: ['id', 'name', 'email'] },
  { model: Ticket, as: 'ticket', attributes: ['id', 'ticketNumber', 'title'] }
];

export const projectIncludes = () => [
  { model: User, as: 'creator', attributes: ['id', 'name', 'email'] },
  { model: User, as: 'updater', attributes: ['id', 'name', 'email'] }
];

export const projectMemberIncludes = () => [
  { model: User, as: 'user', attributes: userBriefAttrs },
  { model: User, as: 'addedByUser', attributes: ['id', 'name', 'email'] }
];

export const commentIncludes = () => [
  { model: User, as: 'author', attributes: ['id', 'name', 'email', 'username'] }
];

export const attachmentIncludes = () => [
  { model: User, as: 'uploader', attributes: ['id', 'name', 'email'] }
];

export const notificationIncludes = () => [
  { model: User, as: 'actor', attributes: ['id', 'name', 'username'] }
];

export const mentionIncludes = () => [
  { model: User, as: 'mentionedByUser', attributes: ['id', 'name', 'username'] },
  { model: User, as: 'mentionedUser', attributes: ['id', 'name', 'username'] },
  { model: Ticket, as: 'ticket', attributes: ['id', 'ticketNumber', 'title'] },
  { model: Comment, as: 'comment', attributes: ['id', 'content', 'createdAt'] }
];

export const subscriptionIncludes = () => [
  { model: Plan, as: 'plan' },
  { model: Company, as: 'company', attributes: ['id', 'name', 'slug'] }
];

export const auditLogIncludes = () => [
  { model: User, as: 'actor', attributes: ['id', 'name', 'email', 'role'] },
  { model: Company, as: 'company', attributes: ['id', 'name', 'slug'] }
];

export const sessionIncludes = () => [
  { model: User, as: 'user', attributes: ['id', 'name', 'email', 'role', 'companyId'] }
];
