const isPlainObject = (value) =>
  value !== null && typeof value === 'object' && !Array.isArray(value) && !(value instanceof Date);

export const toApiDoc = (value) => {
  if (value == null) return value;

  if (Array.isArray(value)) {
    return value.map(toApiDoc);
  }

  if (typeof value.get === 'function') {
    return toApiDoc(value.get({ plain: true }));
  }

  if (!isPlainObject(value)) {
    return value;
  }

  const result = { ...value };

  if (result.id != null && result._id == null) {
    result._id = result.id;
  }

  for (const [key, nested] of Object.entries(result)) {
    if (Array.isArray(nested)) {
      result[key] = nested.map(toApiDoc);
    } else if (isPlainObject(nested)) {
      result[key] = toApiDoc(nested);
    }
  }

  return result;
};

export const shapePopulated = (doc, aliasMap) => {
  const plain = toApiDoc(doc);
  for (const [foreignKey, alias] of Object.entries(aliasMap)) {
    if (plain[alias]) {
      plain[foreignKey] = plain[alias];
      delete plain[alias];
    }
  }
  return plain;
};

export const shapeTicket = (ticket) =>
  shapePopulated(ticket, {
    reporterId: 'reporter',
    assigneeId: 'assignee',
    projectId: 'project'
  });

export const shapeTickets = (tickets) => tickets.map(shapeTicket);

export const shapeActivity = (activity) =>
  shapePopulated(activity, {
    actorId: 'actor',
    ticketId: 'ticket'
  });

export const shapeActivities = (activities) => activities.map(shapeActivity);

export const shapeProject = (project) =>
  shapePopulated(project, {
    createdBy: 'creator',
    updatedBy: 'updater'
  });

export const shapeProjects = (projects) => projects.map(shapeProject);

export const shapeProjectMember = (member) =>
  shapePopulated(member, {
    userId: 'user',
    addedBy: 'addedByUser'
  });

export const shapeProjectMembers = (members) => members.map(shapeProjectMember);

export const shapeComment = (comment) =>
  shapePopulated(comment, { authorId: 'author' });

export const shapeComments = (comments) => comments.map(shapeComment);

export const shapeAttachment = (attachment) =>
  shapePopulated(attachment, { uploadedBy: 'uploader' });

export const shapeAttachments = (attachments) => attachments.map(shapeAttachment);

export const shapeNotification = (notification) =>
  shapePopulated(notification, { actorId: 'actor' });

export const shapeNotifications = (notifications) => notifications.map(shapeNotification);

export const shapeMention = (mention) =>
  shapePopulated(mention, {
    mentionedUserId: 'mentionedUser',
    mentionedBy: 'mentionedByUser',
    ticketId: 'ticket',
    commentId: 'comment'
  });

export const shapeMentions = (mentions) => mentions.map(shapeMention);

export const shapeSubscription = (subscription) =>
  shapePopulated(subscription, {
    planId: 'plan',
    companyId: 'company'
  });

export const shapeAuditLog = (log) =>
  shapePopulated(log, {
    actorId: 'actor',
    companyId: 'company'
  });

export const shapeAuditLogs = (logs) => logs.map(shapeAuditLog);

export const shapeUserSession = (session) =>
  shapePopulated(session, { userId: 'user' });

export const shapeUserSessions = (sessions) => sessions.map(shapeUserSession);

export const excludePassword = (user) => {
  const plain = toApiDoc(user);
  delete plain.password;
  delete plain.passwordHistory;
  return plain;
};

export const addMongoCompat = (model) => {
  model.prototype.toJSON = function toJSON() {
    return toApiDoc(this.get({ plain: true }));
  };
};
