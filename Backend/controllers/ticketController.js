import Ticket from '../models/Ticket.js';
import TicketSequence from '../models/TicketSequence.js';
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

// Helper to log ticket activity history
const logTicketActivity = async (ticket, actorId, action, metadata = {}) => {
  try {
    const activity = new Activity({
      actorId,
      companyId: ticket.companyId,
      projectId: ticket.projectId,
      ticketId: ticket._id,
      entityType: 'TICKET',
      entityId: ticket._id,
      action,
      metadata
    });
    await activity.save();
  } catch (error) {
    console.error('Failed to log ticket activity:', error);
  }
};

// Create Ticket
export const createTicket = async (req, res) => {
  try {
    const { projectId } = req.params;
    const { title, description, type, priority, assigneeId, dueDate, estimatedHours } = req.body;

    if (!title || !title.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Ticket title is required'
      });
    }

    if (req.projectMemberRole === 'VIEWER') {
      return res.status(403).json({
        success: false,
        message: 'Access denied: Viewers cannot create tickets'
      });
    }

    const project = await Project.findById(projectId);

    const ticketLimit = await checkTicketLimit(project.companyId);
    if (!ticketLimit.allowed) {
      return res.status(403).json(ticketLimit.response);
    }
    
    // Get and increment sequence counter
    const seq = await TicketSequence.findOneAndUpdate(
      { projectId: project._id },
      { $inc: { currentNumber: 1 } },
      { new: true, upsert: true, setDefaultsOnInsert: true }
    );

    // Generate unique ticket number
    let prefix = project.name.trim().replace(/[^a-zA-Z]/g, '').substring(0, 3).toUpperCase();
    if (prefix.length < 3) {
      prefix = (prefix + 'PRJ').substring(0, 3);
    }
    const ticketNumber = `${prefix}-${seq.currentNumber}`;

    // Create Ticket
    const ticket = new Ticket({
      companyId: project.companyId,
      projectId: project._id,
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

    await ticket.save();
    await incrementTicketUsage(project.companyId);

    // Log Creation Activity
    await logTicketActivity(ticket, req.user.id, 'TICKET_CREATED', { ticketNumber });

    // Notify assignee if one was set at creation time
    if (assigneeId && assigneeId.toString() !== req.user.id.toString()) {
      const actor = await User.findById(req.user.id).select('name');
      await createNotification({
        companyId: project.companyId,
        recipientId: assigneeId,
        actorId: req.user.id,
        type: 'TICKET_ASSIGNED',
        title: 'Ticket assigned to you',
        message: `${actor?.name || 'Someone'} assigned ${ticketNumber} to you`,
        entityType: 'TICKET',
        entityId: ticket._id
      });
    }

    try {
      emitDashboardUpdate(project.companyId, 'TICKET_CREATED', project._id);
      await recordDailyMetrics(project.companyId, { created: 1 });
    } catch (err) {
      console.warn('[TicketController] dashboard broadcast failed:', err.message);
    }

    return res.status(201).json({
      success: true,
      message: 'Ticket created successfully',
      ticket
    });
  } catch (error) {
    console.error('Create ticket error:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

// Assign Ticket
export const assignTicket = async (req, res) => {
  try {
    const { assigneeId } = req.body;
    const ticket = req.ticket;

    if (req.projectMemberRole === 'VIEWER') {
      return res.status(403).json({
        success: false,
        message: 'Access denied: Viewers cannot assign tickets'
      });
    }

    // Verify assignee
    if (assigneeId) {
      const isMember = await ProjectMember.findOne({ projectId: ticket.projectId, userId: assigneeId });
      const targetUser = await User.findById(assigneeId);
      if (!isMember && (!targetUser || targetUser.role !== 'ADMIN')) {
        return res.status(400).json({
          success: false,
          message: 'Assignee must be a project member or company admin'
        });
      }
    }

    const prevAssigneeId = ticket.assigneeId;
    const prevAssigneeName = ticket.assigneeId
      ? (await User.findById(ticket.assigneeId))?.name || 'Unknown'
      : 'Unassigned';

    const newAssigneeName = assigneeId
      ? (await User.findById(assigneeId))?.name || 'Unknown'
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
      entityId: ticket._id,
      action: 'ASSIGNEE_CHANGED',
      before: { assigneeId: prevAssigneeId },
      after: { assigneeId: assigneeId || null },
      req
    });

    const populatedTicket = await Ticket.findById(ticket._id)
      .populate('reporterId', 'name email')
      .populate('assigneeId', 'name email')
      .populate('projectId', 'name');

    // Notify the new assignee (only if there is one and it's not self-assign)
    if (assigneeId && assigneeId.toString() !== req.user.id.toString()) {
      const actor = await User.findById(req.user.id).select('name');
      await createNotification({
        companyId: ticket.companyId,
        recipientId: assigneeId,
        actorId: req.user.id,
        type: 'TICKET_ASSIGNED',
        title: 'Ticket assigned to you',
        message: `${actor?.name || 'Someone'} assigned ${ticket.ticketNumber} to you`,
        entityType: 'TICKET',
        entityId: ticket._id
      });
    }

    // Emit live update to everyone viewing this ticket
    try {
      getIO().to(`ticket:${ticket._id}`).emit('ticket:updated', populatedTicket);
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
    return res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

// Change Status
export const changeStatus = async (req, res) => {
  try {
    const { status } = req.body;
    const ticket = req.ticket;

    const validStatuses = ['BACKLOG', 'TODO', 'IN_PROGRESS', 'IN_REVIEW', 'TESTING', 'DONE', 'CLOSED', 'REOPENED'];
    if (!status || !validStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid ticket status value'
      });
    }

    if (req.projectMemberRole === 'VIEWER') {
      return res.status(403).json({
        success: false,
        message: 'Access denied: Viewers cannot change status'
      });
    }

    const oldStatus = ticket.status;
    ticket.status = status;
    ticket.updatedBy = req.user.id;
    applyResolutionTimestamp(ticket, status);
    await ticket.save();

    await logTicketActivity(ticket, req.user.id, 'STATUS_CHANGED', {
      oldStatus,
      newStatus: status
    });

    await createAuditLog({
      companyId: ticket.companyId,
      actorId: req.user.id,
      entityType: 'TICKET',
      entityId: ticket._id,
      action: 'STATUS_CHANGED',
      before: { status: oldStatus },
      after: { status },
      req
    });

    const populatedTicket = await Ticket.findById(ticket._id)
      .populate('reporterId', 'name email')
      .populate('assigneeId', 'name email')
      .populate('projectId', 'name');

    // Notify assignee + reporter (skip author)
    const actor = await User.findById(req.user.id).select('name');
    const actorName = actor?.name || 'Someone';
    const actorId = req.user.id.toString();
    const notifyTargets = new Set();
    if (ticket.assigneeId && ticket.assigneeId.toString() !== actorId) notifyTargets.add(ticket.assigneeId.toString());
    if (ticket.reporterId && ticket.reporterId.toString() !== actorId) notifyTargets.add(ticket.reporterId.toString());

    for (const recipientId of notifyTargets) {
      await createNotification({
        companyId: ticket.companyId,
        recipientId,
        actorId: req.user.id,
        type: 'STATUS_CHANGED',
        title: 'Ticket status changed',
        message: `${actorName} changed ${ticket.ticketNumber} status: ${oldStatus} → ${status}`,
        entityType: 'TICKET',
        entityId: ticket._id
      });
    }

    // Emit live update
    try {
      getIO().to(`ticket:${ticket._id}`).emit('ticket:updated', populatedTicket);
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
    return res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

// Update Priority
export const updatePriority = async (req, res) => {
  try {
    const { priority } = req.body;
    const ticket = req.ticket;

    const validPriorities = ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL', 'BLOCKER'];
    if (!priority || !validPriorities.includes(priority)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid priority value'
      });
    }

    if (req.projectMemberRole === 'VIEWER') {
      return res.status(403).json({
        success: false,
        message: 'Access denied: Viewers cannot modify priority'
      });
    }

    const oldPriority = ticket.priority;
    ticket.priority = priority;
    ticket.updatedBy = req.user.id;
    await ticket.save();

    await logTicketActivity(ticket, req.user.id, 'PRIORITY_CHANGED', {
      oldPriority,
      newPriority: priority
    });

    await createAuditLog({
      companyId: ticket.companyId,
      actorId: req.user.id,
      entityType: 'TICKET',
      entityId: ticket._id,
      action: 'PRIORITY_CHANGED',
      before: { priority: oldPriority },
      after: { priority },
      req
    });

    const populatedTicket = await Ticket.findById(ticket._id)
      .populate('reporterId', 'name email')
      .populate('assigneeId', 'name email')
      .populate('projectId', 'name');

    // Notify assignee (priority change is most relevant to the person doing the work)
    if (ticket.assigneeId && ticket.assigneeId.toString() !== req.user.id.toString()) {
      const actor = await User.findById(req.user.id).select('name');
      await createNotification({
        companyId: ticket.companyId,
        recipientId: ticket.assigneeId,
        actorId: req.user.id,
        type: 'PRIORITY_CHANGED',
        title: 'Ticket priority changed',
        message: `${actor?.name || 'Someone'} changed ${ticket.ticketNumber} priority: ${oldPriority} → ${priority}`,
        entityType: 'TICKET',
        entityId: ticket._id
      });
    }

    // Emit live update
    try {
      getIO().to(`ticket:${ticket._id}`).emit('ticket:updated', populatedTicket);
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
    return res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

// Soft Delete Ticket
export const deleteTicket = async (req, res) => {
  try {
    const ticket = req.ticket;

    if (req.projectMemberRole === 'VIEWER') {
      return res.status(403).json({
        success: false,
        message: 'Access denied: Viewers cannot delete tickets'
      });
    }

    if (req.user.role !== 'ADMIN' && req.projectMemberRole !== 'PROJECT_ADMIN') {
      return res.status(403).json({
        success: false,
        message: 'Access denied: Only administrators can delete tickets'
      });
    }

    const before = {
      ticketNumber: ticket.ticketNumber,
      title: ticket.title,
      isDeleted: ticket.isDeleted
    };

    applySoftDelete(ticket, req.user.id);
    ticket.updatedBy = req.user.id;
    await ticket.save();

    await logTicketActivity(ticket, req.user.id, 'DELETE', { ticketNumber: ticket.ticketNumber });

    await createAuditLog({
      companyId: ticket.companyId,
      actorId: req.user.id,
      entityType: 'TICKET',
      entityId: ticket._id,
      action: 'TICKET_DELETED',
      before,
      after: { isDeleted: true, deletedAt: ticket.deletedAt },
      req
    });

    return res.status(200).json({
      success: true,
      message: 'Ticket deleted successfully'
    });
  } catch (error) {
    console.error('Delete ticket error:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

// Get Ticket Details with History Audit
export const getTicketDetails = async (req, res) => {
  try {
    const ticket = await Ticket.findById(req.ticket._id)
      .populate('reporterId', 'name email')
      .populate('assigneeId', 'name email')
      .populate('projectId', 'name');

    // Fetch unified history logs
    const history = await Activity.find({ ticketId: ticket._id })
      .populate('actorId', 'name email')
      .sort({ createdAt: -1 });

    return res.status(200).json({
      success: true,
      ticket,
      history,
      myRole: req.projectMemberRole
    });
  } catch (error) {
    console.error('Get ticket details error:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

// Search / List Tickets
const PRIORITY_RANK_BRANCHES = [
  { case: { $eq: ['$priority', 'BLOCKER'] }, then: 0 },
  { case: { $eq: ['$priority', 'CRITICAL'] }, then: 1 },
  { case: { $eq: ['$priority', 'HIGH'] }, then: 2 },
  { case: { $eq: ['$priority', 'MEDIUM'] }, then: 3 },
  { case: { $eq: ['$priority', 'LOW'] }, then: 4 }
];

const populateTicketList = (query) =>
  query
    .populate('reporterId', 'name email')
    .populate('assigneeId', 'name email')
    .populate('projectId', 'name');

export const searchTickets = async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user || !user.companyId) {
      return res.status(400).json({
        success: false,
        message: 'User must belong to a company'
      });
    }

    let accessibleProjectIds = [];
    if (user.role === 'ADMIN') {
      const projects = await Project.find({ companyId: user.companyId, isDeleted: false });
      accessibleProjectIds = projects.map(p => p._id);
    } else {
      const memberRecords = await ProjectMember.find({ userId: user._id, companyId: user.companyId });
      accessibleProjectIds = memberRecords.map(m => m.projectId);
    }

    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit, 10) || 20));
    const skip = (page - 1) * limit;

    const query = {
      companyId: user.companyId,
      projectId: { $in: accessibleProjectIds },
      isDeleted: false
    };

    if (req.query.status) query.status = req.query.status;
    if (req.query.priority) query.priority = req.query.priority;
    if (req.query.type) query.type = req.query.type;

    if (req.query.project) {
      const hasAccess = accessibleProjectIds.some(
        (id) => id.toString() === req.query.project
      );
      if (!hasAccess) {
        return res.status(403).json({
          success: false,
          message: 'Access denied to this project'
        });
      }
      query.projectId = req.query.project;
    }

    if (req.query.reporter) {
      query.reporterId = req.query.reporter === 'me' ? user._id : req.query.reporter;
    }

    if (req.query.createdBy) {
      query.createdBy = req.query.createdBy === 'me' ? user._id : req.query.createdBy;
    }

    if (req.query.assignee) {
      if (req.query.assignee === 'unassigned') {
        query.assigneeId = null;
      } else if (req.query.assignee === 'me') {
        query.assigneeId = user._id;
      } else {
        query.assigneeId = req.query.assignee;
      }
    }

    if (req.query.overdue === 'true') {
      query.dueDate = { $lt: new Date(), $ne: null };
      query.status = { $nin: ['DONE', 'CLOSED'] };
    }

    if (req.query.search?.trim()) {
      query.$text = { $search: req.query.search.trim() };
    }

    const sortParam = req.query.sort || 'newest';
    let sortOptions = { createdAt: -1 };
    switch (sortParam) {
      case 'oldest':
        sortOptions = { createdAt: 1 };
        break;
      case 'updatedAt':
        sortOptions = { updatedAt: -1 };
        break;
      case 'dueDate':
        sortOptions = { dueDate: 1, createdAt: -1 };
        break;
      case 'priority':
        break;
      case 'newest':
      default:
        sortOptions = { createdAt: -1 };
    }

    let tickets;
    const total = await Ticket.countDocuments(query);

    if (sortParam === 'priority') {
      const ranked = await Ticket.aggregate([
        { $match: query },
        {
          $addFields: {
            priorityRank: {
              $switch: {
                branches: PRIORITY_RANK_BRANCHES,
                default: 5
              }
            }
          }
        },
        { $sort: { priorityRank: 1, createdAt: -1 } },
        { $skip: skip },
        { $limit: limit },
        { $project: { _id: 1 } }
      ]);

      const ticketIds = ranked.map((t) => t._id);
      const fetched = await populateTicketList(Ticket.find({ _id: { $in: ticketIds } }));
      const ticketMap = new Map(fetched.map((t) => [t._id.toString(), t]));
      tickets = ticketIds.map((id) => ticketMap.get(id.toString())).filter(Boolean);
    } else {
      tickets = await populateTicketList(
        Ticket.find(query).sort(sortOptions).skip(skip).limit(limit)
      );
    }

    return res.status(200).json({
      success: true,
      tickets,
      pagination: {
        total,
        page,
        limit,
        pages: Math.ceil(total / limit) || 1
      }
    });
  } catch (error) {
    console.error('Search tickets error:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};
