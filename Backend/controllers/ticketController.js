import { Op, literal } from 'sequelize';
import Ticket from '../models/Ticket.js';
import Activity from '../models/Activity.js';
import User from '../models/User.js';
import Project from '../models/Project.js';
import ProjectMember from '../models/ProjectMember.js';
import { createNotification } from '../services/notificationService.js';
import { applyResolutionTimestamp, recordDailyMetrics } from '../services/analyticsService.js';
import { emitDashboardUpdate } from '../services/dashboardBroadcast.js';
import { checkTicketLimit } from '../services/subscriptionService.js';
import { incrementTicketUsage } from '../services/usageService.js';
import { createAuditLog, applySoftDelete } from '../services/auditService.js';
import { getIO } from '../socket.js';
import { incrementTicketSequence } from '../utils/dbHelpers.js';
import { ticketIncludes, activityIncludes } from '../utils/queryIncludes.js';
import { shapeTicket, shapeTickets, shapeActivities, toApiDoc } from '../utils/apiShape.js';

const logTicketActivity = async (ticket, actorId, action, metadata = {}) => {
  try {
    await Activity.create({
      actorId,
      companyId: ticket.companyId,
      projectId: ticket.projectId,
      ticketId: ticket.id,
      entityType: 'TICKET',
      entityId: ticket.id,
      action,
      metadata
    });
  } catch (error) {
    console.error('Failed to log ticket activity:', error);
  }
};

const fetchPopulatedTicket = async (id) => {
  const ticket = await Ticket.findByPk(id, { include: ticketIncludes() });
  return shapeTicket(ticket);
};

export const createTicket = async (req, res) => {
  try {
    const { projectId } = req.params;
    const { title, description, type, priority, assigneeId, dueDate, estimatedHours } = req.body;

    if (!title || !title.trim()) {
      return res.status(400).json({ success: false, message: 'Ticket title is required' });
    }

    if (req.projectMemberRole === 'VIEWER') {
      return res.status(403).json({ success: false, message: 'Access denied: Viewers cannot create tickets' });
    }

    const project = await Project.findByPk(projectId);
    const ticketLimit = await checkTicketLimit(project.companyId);
    if (!ticketLimit.allowed) {
      return res.status(403).json(ticketLimit.response);
    }

    const seq = await incrementTicketSequence(project.id);

    let prefix = project.name.trim().replace(/[^a-zA-Z]/g, '').substring(0, 3).toUpperCase();
    if (prefix.length < 3) prefix = (prefix + 'PRJ').substring(0, 3);
    const ticketNumber = `${prefix}-${seq.currentNumber}`;

    const ticket = await Ticket.create({
      companyId: project.companyId,
      projectId: project.id,
      ticketNumber,
      title: title.trim(),
      description: description?.trim(),
      type: type || 'BUG',
      priority: priority || 'MEDIUM',
      status: 'BACKLOG',
      reporterId: req.user.id,
      assigneeId: assigneeId || null,
      dueDate: dueDate || null,
      estimatedHours: estimatedHours || null,
      createdBy: req.user.id,
      updatedBy: req.user.id
    });

    await incrementTicketUsage(project.companyId);
    await logTicketActivity(ticket, req.user.id, 'TICKET_CREATED', { ticketNumber });

    if (assigneeId && String(assigneeId) !== String(req.user.id)) {
      const actor = await User.findByPk(req.user.id, { attributes: ['name'] });
      await createNotification({
        companyId: project.companyId,
        recipientId: assigneeId,
        actorId: req.user.id,
        type: 'TICKET_ASSIGNED',
        title: 'Ticket assigned to you',
        message: `${actor?.name || 'Someone'} assigned ${ticketNumber} to you`,
        entityType: 'TICKET',
        entityId: ticket.id
      });
    }

    try {
      emitDashboardUpdate(project.companyId, 'TICKET_CREATED', project.id);
      await recordDailyMetrics(project.companyId, { created: 1 });
    } catch (err) {
      console.warn('[TicketController] dashboard broadcast failed:', err.message);
    }

    return res.status(201).json({
      success: true,
      message: 'Ticket created successfully',
      ticket: toApiDoc(ticket)
    });
  } catch (error) {
    console.error('Create ticket error:', error);
    return res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

export const assignTicket = async (req, res) => {
  try {
    const { assigneeId } = req.body;
    const ticket = req.ticket;

    if (req.projectMemberRole === 'VIEWER') {
      return res.status(403).json({ success: false, message: 'Access denied: Viewers cannot assign tickets' });
    }

    if (assigneeId) {
      const isMember = await ProjectMember.findOne({ where: { projectId: ticket.projectId, userId: assigneeId } });
      const targetUser = await User.findByPk(assigneeId);
      if (!isMember && (!targetUser || targetUser.role !== 'ADMIN')) {
        return res.status(400).json({ success: false, message: 'Assignee must be a project member or company admin' });
      }
    }

    const prevAssigneeId = ticket.assigneeId;
    const prevAssigneeName = ticket.assigneeId
      ? (await User.findByPk(ticket.assigneeId))?.name || 'Unknown'
      : 'Unassigned';
    const newAssigneeName = assigneeId
      ? (await User.findByPk(assigneeId))?.name || 'Unknown'
      : 'Unassigned';

    ticket.assigneeId = assigneeId || null;
    ticket.updatedBy = req.user.id;
    await ticket.save();

    await logTicketActivity(ticket, req.user.id, 'ASSIGNEE_CHANGED', {
      oldAssignee: prevAssigneeName,
      newAssignee: newAssigneeName
    });

    await createAuditLog({
      companyId: ticket.companyId,
      actorId: req.user.id,
      entityType: 'TICKET',
      entityId: ticket.id,
      action: 'ASSIGNEE_CHANGED',
      before: { assigneeId: prevAssigneeId },
      after: { assigneeId: assigneeId || null },
      req
    });

    const populatedTicket = await fetchPopulatedTicket(ticket.id);

    if (assigneeId && String(assigneeId) !== String(req.user.id)) {
      const actor = await User.findByPk(req.user.id, { attributes: ['name'] });
      await createNotification({
        companyId: ticket.companyId,
        recipientId: assigneeId,
        actorId: req.user.id,
        type: 'TICKET_ASSIGNED',
        title: 'Ticket assigned to you',
        message: `${actor?.name || 'Someone'} assigned ${ticket.ticketNumber} to you`,
        entityType: 'TICKET',
        entityId: ticket.id
      });
    }

    try {
      getIO().to(`ticket:${ticket.id}`).emit('ticket:updated', populatedTicket);
    } catch (socketErr) {
      console.warn('[TicketController] ticket:updated emit failed:', socketErr.message);
    }

    return res.status(200).json({
      success: true,
      message: `Ticket successfully assigned to ${newAssigneeName}`,
      ticket: populatedTicket
    });
  } catch (error) {
    console.error('Assign ticket error:', error);
    return res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

export const changeStatus = async (req, res) => {
  try {
    const { status } = req.body;
    const ticket = req.ticket;
    const validStatuses = ['BACKLOG', 'TODO', 'IN_PROGRESS', 'IN_REVIEW', 'TESTING', 'DONE', 'CLOSED', 'REOPENED'];

    if (!status || !validStatuses.includes(status)) {
      return res.status(400).json({ success: false, message: 'Invalid ticket status value' });
    }

    if (req.projectMemberRole === 'VIEWER') {
      return res.status(403).json({ success: false, message: 'Access denied: Viewers cannot change status' });
    }

    const oldStatus = ticket.status;
    ticket.status = status;
    ticket.updatedBy = req.user.id;
    applyResolutionTimestamp(ticket, status);
    await ticket.save();

    await logTicketActivity(ticket, req.user.id, 'STATUS_CHANGED', { oldStatus, newStatus: status });

    await createAuditLog({
      companyId: ticket.companyId,
      actorId: req.user.id,
      entityType: 'TICKET',
      entityId: ticket.id,
      action: 'STATUS_CHANGED',
      before: { status: oldStatus },
      after: { status },
      req
    });

    const populatedTicket = await fetchPopulatedTicket(ticket.id);
    const actor = await User.findByPk(req.user.id, { attributes: ['name'] });
    const actorName = actor?.name || 'Someone';
    const actorId = String(req.user.id);
    const notifyTargets = new Set();

    if (ticket.assigneeId && String(ticket.assigneeId) !== actorId) notifyTargets.add(String(ticket.assigneeId));
    if (ticket.reporterId && String(ticket.reporterId) !== actorId) notifyTargets.add(String(ticket.reporterId));

    for (const recipientId of notifyTargets) {
      await createNotification({
        companyId: ticket.companyId,
        recipientId,
        actorId: req.user.id,
        type: 'STATUS_CHANGED',
        title: 'Ticket status changed',
        message: `${actorName} changed ${ticket.ticketNumber} status: ${oldStatus} → ${status}`,
        entityType: 'TICKET',
        entityId: ticket.id
      });
    }

    try {
      getIO().to(`ticket:${ticket.id}`).emit('ticket:updated', populatedTicket);
      emitDashboardUpdate(ticket.companyId, 'STATUS_CHANGED', ticket.projectId);
      if (['DONE', 'CLOSED'].includes(status) && ticket.resolvedAt) {
        const resolutionMs = ticket.resolvedAt.getTime() - ticket.createdAt.getTime();
        await recordDailyMetrics(ticket.companyId, { closed: 1, resolutionMs });
      }
    } catch (socketErr) {
      console.warn('[TicketController] ticket:updated emit failed:', socketErr.message);
    }

    return res.status(200).json({
      success: true,
      message: `Status updated to ${status} successfully`,
      ticket: populatedTicket
    });
  } catch (error) {
    console.error('Change status error:', error);
    return res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

export const updatePriority = async (req, res) => {
  try {
    const { priority } = req.body;
    const ticket = req.ticket;
    const validPriorities = ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL', 'BLOCKER'];

    if (!priority || !validPriorities.includes(priority)) {
      return res.status(400).json({ success: false, message: 'Invalid priority value' });
    }

    if (req.projectMemberRole === 'VIEWER') {
      return res.status(403).json({ success: false, message: 'Access denied: Viewers cannot modify priority' });
    }

    const oldPriority = ticket.priority;
    ticket.priority = priority;
    ticket.updatedBy = req.user.id;
    await ticket.save();

    await logTicketActivity(ticket, req.user.id, 'PRIORITY_CHANGED', { oldPriority, newPriority: priority });

    await createAuditLog({
      companyId: ticket.companyId,
      actorId: req.user.id,
      entityType: 'TICKET',
      entityId: ticket.id,
      action: 'PRIORITY_CHANGED',
      before: { priority: oldPriority },
      after: { priority },
      req
    });

    const populatedTicket = await fetchPopulatedTicket(ticket.id);

    if (ticket.assigneeId && String(ticket.assigneeId) !== String(req.user.id)) {
      const actor = await User.findByPk(req.user.id, { attributes: ['name'] });
      await createNotification({
        companyId: ticket.companyId,
        recipientId: ticket.assigneeId,
        actorId: req.user.id,
        type: 'PRIORITY_CHANGED',
        title: 'Ticket priority changed',
        message: `${actor?.name || 'Someone'} changed ${ticket.ticketNumber} priority: ${oldPriority} → ${priority}`,
        entityType: 'TICKET',
        entityId: ticket.id
      });
    }

    try {
      getIO().to(`ticket:${ticket.id}`).emit('ticket:updated', populatedTicket);
    } catch (socketErr) {
      console.warn('[TicketController] ticket:updated emit failed:', socketErr.message);
    }

    return res.status(200).json({
      success: true,
      message: `Priority updated to ${priority} successfully`,
      ticket: populatedTicket
    });
  } catch (error) {
    console.error('Update priority error:', error);
    return res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

export const deleteTicket = async (req, res) => {
  try {
    const ticket = req.ticket;

    if (req.projectMemberRole === 'VIEWER') {
      return res.status(403).json({ success: false, message: 'Access denied: Viewers cannot delete tickets' });
    }

    if (req.user.role !== 'ADMIN' && req.projectMemberRole !== 'PROJECT_ADMIN') {
      return res.status(403).json({ success: false, message: 'Access denied: Only administrators can delete tickets' });
    }

    const before = { ticketNumber: ticket.ticketNumber, title: ticket.title, isDeleted: ticket.isDeleted };
    applySoftDelete(ticket, req.user.id);
    ticket.updatedBy = req.user.id;
    await ticket.save();

    await logTicketActivity(ticket, req.user.id, 'DELETE', { ticketNumber: ticket.ticketNumber });

    await createAuditLog({
      companyId: ticket.companyId,
      actorId: req.user.id,
      entityType: 'TICKET',
      entityId: ticket.id,
      action: 'TICKET_DELETED',
      before,
      after: { isDeleted: true, deletedAt: ticket.deletedAt },
      req
    });

    return res.status(200).json({ success: true, message: 'Ticket deleted successfully' });
  } catch (error) {
    console.error('Delete ticket error:', error);
    return res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

export const getTicketDetails = async (req, res) => {
  try {
    const ticket = await fetchPopulatedTicket(req.ticket.id);
    const historyRows = await Activity.findAll({
      where: { ticketId: req.ticket.id },
      include: activityIncludes(),
      order: [['createdAt', 'DESC']]
    });

    return res.status(200).json({
      success: true,
      ticket,
      history: shapeActivities(historyRows),
      myRole: req.projectMemberRole
    });
  } catch (error) {
    console.error('Get ticket details error:', error);
    return res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

export const searchTickets = async (req, res) => {
  try {
    const user = await User.findByPk(req.user.id);
    if (!user || !user.companyId) {
      return res.status(400).json({ success: false, message: 'User must belong to a company' });
    }

    let accessibleProjectIds = [];
    if (user.role === 'ADMIN') {
      const projects = await Project.findAll({ where: { companyId: user.companyId, isDeleted: false } });
      accessibleProjectIds = projects.map((p) => p.id);
    } else {
      const memberRecords = await ProjectMember.findAll({ where: { userId: user.id, companyId: user.companyId } });
      accessibleProjectIds = memberRecords.map((m) => m.projectId);
    }

    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit, 10) || 20));
    const offset = (page - 1) * limit;

    const where = {
      companyId: user.companyId,
      projectId: { [Op.in]: accessibleProjectIds },
      isDeleted: false
    };

    if (req.query.status) where.status = req.query.status;
    if (req.query.priority) where.priority = req.query.priority;
    if (req.query.type) where.type = req.query.type;

    if (req.query.project) {
      const hasAccess = accessibleProjectIds.some((id) => String(id) === req.query.project);
      if (!hasAccess) {
        return res.status(403).json({ success: false, message: 'Access denied to this project' });
      }
      where.projectId = req.query.project;
    }

    if (req.query.reporter) {
      where.reporterId = req.query.reporter === 'me' ? user.id : req.query.reporter;
    }
    if (req.query.createdBy) {
      where.createdBy = req.query.createdBy === 'me' ? user.id : req.query.createdBy;
    }
    if (req.query.assignee) {
      if (req.query.assignee === 'unassigned') where.assigneeId = null;
      else if (req.query.assignee === 'me') where.assigneeId = user.id;
      else where.assigneeId = req.query.assignee;
    }
    if (req.query.overdue === 'true') {
      where.dueDate = { [Op.lt]: new Date(), [Op.ne]: null };
      where.status = { [Op.notIn]: ['DONE', 'CLOSED'] };
    }
    if (req.query.search?.trim()) {
      const term = `%${req.query.search.trim()}%`;
      where[Op.or] = [
        { title: { [Op.like]: term } },
        { description: { [Op.like]: term } }
      ];
    }

    const sortParam = req.query.sort || 'newest';
    const total = await Ticket.count({ where });

    let tickets;
    if (sortParam === 'priority') {
      const ranked = await Ticket.findAll({
        where,
        attributes: ['id'],
        order: [
          [literal("CASE priority WHEN 'BLOCKER' THEN 0 WHEN 'CRITICAL' THEN 1 WHEN 'HIGH' THEN 2 WHEN 'MEDIUM' THEN 3 WHEN 'LOW' THEN 4 ELSE 5 END"), 'ASC'],
          ['createdAt', 'DESC']
        ],
        offset,
        limit
      });
      const ticketIds = ranked.map((t) => t.id);
      const fetched = await Ticket.findAll({ where: { id: { [Op.in]: ticketIds } }, include: ticketIncludes() });
      const ticketMap = new Map(shapeTickets(fetched).map((t) => [String(t._id), t]));
      tickets = ticketIds.map((id) => ticketMap.get(String(id))).filter(Boolean);
    } else {
      let order = [['createdAt', 'DESC']];
      if (sortParam === 'oldest') order = [['createdAt', 'ASC']];
      else if (sortParam === 'updatedAt') order = [['updatedAt', 'DESC']];
      else if (sortParam === 'dueDate') order = [['dueDate', 'ASC'], ['createdAt', 'DESC']];

      const rows = await Ticket.findAll({
        where,
        include: ticketIncludes(),
        order,
        offset,
        limit
      });
      tickets = shapeTickets(rows);
    }

    return res.status(200).json({
      success: true,
      tickets,
      pagination: { total, page, limit, pages: Math.ceil(total / limit) || 1 }
    });
  } catch (error) {
    console.error('Search tickets error:', error);
    return res.status(500).json({ success: false, message: 'Internal server error' });
  }
};
