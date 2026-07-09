import { ClientIssue, User, Project, ProjectMember, Ticket, Attachment, Activity } from '../models/index.js';
import { checkTicketLimit } from '../services/subscriptionService.js';
import { incrementTicketUsage } from '../services/usageService.js';
import { incrementTicketSequence } from '../utils/dbHelpers.js';
import { emitDashboardUpdate } from '../services/dashboardBroadcast.js';
import { recordDailyMetrics } from '../services/analyticsService.js';

export const createClientIssue = async (req, res) => {
  try {
    const { projectId, title, description } = req.body;
    if (!projectId) return res.status(400).json({ success: false, message: 'Project ID is required' });
    if (!title || !title.trim()) return res.status(400).json({ success: false, message: 'Title is required' });

    const clientUser = await User.findByPk(req.user.id);
    if (!clientUser || clientUser.role !== 'CLIENT') {
      return res.status(403).json({ success: false, message: 'Access denied: Only clients can report issues' });
    }

    const project = await Project.findByPk(projectId);
    if (!project || project.isDeleted) {
      return res.status(404).json({ success: false, message: 'Project not found' });
    }

    if (String(project.companyId) !== String(clientUser.companyId)) {
      return res.status(403).json({ success: false, message: 'Access denied: Company mismatch' });
    }

    // Verify project membership
    const isMember = await ProjectMember.findOne({ where: { projectId: project.id, userId: clientUser.id } });
    if (!isMember) {
      return res.status(403).json({ success: false, message: 'Access denied: You are not assigned to this project' });
    }

    const imageUrl = req.file ? `/uploads/${req.file.filename}` : null;

    const clientIssue = await ClientIssue.create({
      companyId: clientUser.companyId,
      projectId: project.id,
      clientId: clientUser.id,
      title: title.trim(),
      description: description?.trim() || '',
      imageUrl,
      status: 'PENDING'
    });

    return res.status(201).json({
      success: true,
      message: 'Issue reported successfully',
      clientIssue
    });
  } catch (error) {
    console.error('Create client issue error:', error);
    return res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

export const getClientIssues = async (req, res) => {
  try {
    const currentUser = await User.findByPk(req.user.id);
    if (!currentUser || !currentUser.companyId) {
      return res.status(400).json({ success: false, message: 'User must belong to a company' });
    }

    const where = { companyId: currentUser.companyId };

    if (currentUser.role === 'CLIENT') {
      where.clientId = currentUser.id;
    }

    if (req.query.projectId) {
      where.projectId = req.query.projectId;
      // If employee/developer, check project access
      if (currentUser.role !== 'ADMIN') {
        const isMember = await ProjectMember.findOne({ where: { projectId: req.query.projectId, userId: currentUser.id } });
        if (!isMember) {
          return res.status(403).json({ success: false, message: 'Access denied: You are not a member of this project' });
        }
      }
    }

    if (req.query.status) {
      where.status = req.query.status;
    }

    const clientIssues = await ClientIssue.findAll({
      where,
      include: [
        { model: User, as: 'client', attributes: ['id', 'name', 'email'] },
        { model: Project, as: 'project', attributes: ['id', 'name'] },
        { model: Ticket, as: 'convertedTicket', attributes: ['id', 'ticketNumber'] }
      ],
      order: [['createdAt', 'DESC']]
    });

    return res.status(200).json({ success: true, clientIssues });
  } catch (error) {
    console.error('Get client issues error:', error);
    return res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

export const getClientIssueById = async (req, res) => {
  try {
    const currentUser = await User.findByPk(req.user.id);
    if (!currentUser || !currentUser.companyId) {
      return res.status(400).json({ success: false, message: 'User must belong to a company' });
    }

    const clientIssue = await ClientIssue.findByPk(req.params.id, {
      include: [
        { model: User, as: 'client', attributes: ['id', 'name', 'email'] },
        { model: Project, as: 'project', attributes: ['id', 'name'] },
        { model: Ticket, as: 'convertedTicket', attributes: ['id', 'ticketNumber'] }
      ]
    });

    if (!clientIssue) {
      return res.status(404).json({ success: false, message: 'Client issue not found' });
    }

    if (String(clientIssue.companyId) !== String(currentUser.companyId)) {
      return res.status(403).json({ success: false, message: 'Access denied' });
    }

    if (currentUser.role === 'CLIENT' && String(clientIssue.clientId) !== String(currentUser.id)) {
      return res.status(403).json({ success: false, message: 'Access denied: Cannot view another client\'s issue' });
    }

    return res.status(200).json({ success: true, clientIssue });
  } catch (error) {
    console.error('Get client issue by ID error:', error);
    return res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

export const convertClientIssueToTicket = async (req, res) => {
  try {
    const currentUser = await User.findByPk(req.user.id);
    if (!currentUser || !currentUser.companyId) {
      return res.status(400).json({ success: false, message: 'User must belong to a company' });
    }

    if (currentUser.role === 'CLIENT') {
      return res.status(403).json({ success: false, message: 'Access denied: Clients cannot convert issues to tickets' });
    }

    const clientIssue = await ClientIssue.findByPk(req.params.id);
    if (!clientIssue) {
      return res.status(404).json({ success: false, message: 'Client issue not found' });
    }

    if (String(clientIssue.companyId) !== String(currentUser.companyId)) {
      return res.status(403).json({ success: false, message: 'Access denied: Company mismatch' });
    }

    if (clientIssue.status !== 'PENDING') {
      return res.status(400).json({ success: false, message: 'Client issue is already processed' });
    }

    // Verify project admin or company admin permissions
    const member = await ProjectMember.findOne({ where: { projectId: clientIssue.projectId, userId: currentUser.id } });
    const isAdmin = currentUser.role === 'ADMIN';
    const isProjectAdmin = member && member.role === 'PROJECT_ADMIN';
    if (!isAdmin && !isProjectAdmin) {
      return res.status(403).json({ success: false, message: 'Access denied: Only project administrators can convert issues to tickets' });
    }

    const project = await Project.findByPk(clientIssue.projectId);
    const ticketLimit = await checkTicketLimit(clientIssue.companyId);
    if (!ticketLimit.allowed) {
      return res.status(403).json(ticketLimit.response);
    }

    const seq = await incrementTicketSequence(project.id);
    let prefix = project.name.trim().replace(/[^a-zA-Z]/g, '').substring(0, 3).toUpperCase();
    if (prefix.length < 3) prefix = (prefix + 'PRJ').substring(0, 3);
    const ticketNumber = `${prefix}-${seq.currentNumber}`;

    const { type, priority, assigneeId } = req.body;

    const ticket = await Ticket.create({
      companyId: clientIssue.companyId,
      projectId: clientIssue.projectId,
      ticketNumber,
      title: clientIssue.title,
      description: clientIssue.description || '',
      type: type || 'BUG',
      priority: priority || 'MEDIUM',
      status: 'BACKLOG',
      reporterId: clientIssue.clientId,
      assigneeId: assigneeId || null,
      createdBy: currentUser.id,
      updatedBy: currentUser.id
    });

    await incrementTicketUsage(clientIssue.companyId);

    // Log Ticket Activity
    await Activity.create({
      actorId: currentUser.id,
      companyId: ticket.companyId,
      projectId: ticket.projectId,
      ticketId: ticket.id,
      entityType: 'TICKET',
      entityId: ticket.id,
      action: 'TICKET_CREATED',
      metadata: { ticketNumber }
    });

    // Create attachment if the client uploaded an image
    if (clientIssue.imageUrl) {
      const attachment = await Attachment.create({
        companyId: ticket.companyId,
        projectId: ticket.projectId,
        ticketId: ticket.id,
        uploadedBy: clientIssue.clientId,
        fileName: clientIssue.imageUrl.split('/').pop(),
        fileUrl: clientIssue.imageUrl,
        mimeType: 'image/png',
        fileSize: 0
      });

      await Activity.create({
        actorId: clientIssue.clientId,
        companyId: ticket.companyId,
        projectId: ticket.projectId,
        ticketId: ticket.id,
        entityType: 'ATTACHMENT',
        entityId: attachment.id,
        action: 'ATTACHMENT_UPLOADED',
        metadata: { attachmentId: attachment.id, fileName: clientIssue.imageUrl.split('/').pop() }
      });
    }

    // Update Client Issue
    clientIssue.status = 'CONVERTED';
    clientIssue.convertedTicketId = ticket.id;
    clientIssue.convertedBy = currentUser.id;
    clientIssue.convertedAt = new Date();
    await clientIssue.save();

    try {
      emitDashboardUpdate(ticket.companyId, 'TICKET_CREATED', ticket.projectId);
      await recordDailyMetrics(ticket.companyId, { created: 1 });
    } catch (err) {
      console.warn('Dashboard broadcast error:', err.message);
    }

    return res.status(200).json({
      success: true,
      message: 'Client issue converted to ticket successfully',
      ticket,
      clientIssue
    });
  } catch (error) {
    console.error('Convert client issue error:', error);
    return res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

export const rejectClientIssue = async (req, res) => {
  try {
    const currentUser = await User.findByPk(req.user.id);
    if (!currentUser || !currentUser.companyId) {
      return res.status(400).json({ success: false, message: 'User must belong to a company' });
    }

    if (currentUser.role === 'CLIENT') {
      return res.status(403).json({ success: false, message: 'Access denied: Clients cannot process issues' });
    }

    const clientIssue = await ClientIssue.findByPk(req.params.id);
    if (!clientIssue) {
      return res.status(404).json({ success: false, message: 'Client issue not found' });
    }

    if (String(clientIssue.companyId) !== String(currentUser.companyId)) {
      return res.status(403).json({ success: false, message: 'Access denied: Company mismatch' });
    }

    if (clientIssue.status !== 'PENDING') {
      return res.status(400).json({ success: false, message: 'Client issue is already processed' });
    }

    const member = await ProjectMember.findOne({ where: { projectId: clientIssue.projectId, userId: currentUser.id } });
    const isAdmin = currentUser.role === 'ADMIN';
    const isProjectAdmin = member && member.role === 'PROJECT_ADMIN';
    if (!isAdmin && !isProjectAdmin) {
      return res.status(403).json({ success: false, message: 'Access denied: Only project administrators can process issues' });
    }

    clientIssue.status = 'REJECTED';
    await clientIssue.save();

    return res.status(200).json({
      success: true,
      message: 'Client issue has been rejected',
      clientIssue
    });
  } catch (error) {
    console.error('Reject client issue error:', error);
    return res.status(500).json({ success: false, message: 'Internal server error' });
  }
};
