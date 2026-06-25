import Project from '../models/Project.js';
import ProjectMember from '../models/ProjectMember.js';
import Activity from '../models/Activity.js';
import User from '../models/User.js';
import { Op } from 'sequelize';
import { checkProjectLimit } from '../services/subscriptionService.js';
import { syncUsage } from '../services/usageService.js';
import { createNotification } from '../services/notificationService.js';
import { createAuditLog, applySoftDelete } from '../services/auditService.js';
import { projectIncludes, projectMemberIncludes } from '../utils/queryIncludes.js';
import { shapeProject, shapeProjects, shapeProjectMember, toApiDoc } from '../utils/apiShape.js';

const logActivity = async (actorId, companyId, entityType, entityId, action, metadata = {}) => {
  try {
    await Activity.create({ actorId, companyId, entityType, entityId, action, metadata });
  } catch (error) {
    console.error('Failed to write activity log:', error);
  }
};

export const createProject = async (req, res) => {
  try {
    const { name, description } = req.body;
    if (!name || !name.trim()) {
      return res.status(400).json({ success: false, message: 'Project name is required' });
    }

    const user = await User.findByPk(req.user.id);
    if (!user || !user.companyId) {
      return res.status(400).json({ success: false, message: 'User must belong to a company to create projects' });
    }

    const projectLimit = await checkProjectLimit(user.companyId);
    if (!projectLimit.allowed) return res.status(403).json(projectLimit.response);

    const project = await Project.create({
      companyId: user.companyId,
      name: name.trim(),
      description: description?.trim(),
      createdBy: user.id,
      updatedBy: user.id
    });
    await syncUsage(user.companyId);

    await ProjectMember.create({
      companyId: user.companyId,
      projectId: project.id,
      userId: user.id,
      role: 'PROJECT_ADMIN',
      addedBy: user.id
    });

    await logActivity(user.id, user.companyId, 'PROJECT', project.id, 'CREATE', { projectName: project.name });

    return res.status(201).json({
      success: true,
      message: 'Project created successfully',
      project: toApiDoc(project)
    });
  } catch (error) {
    console.error('Create project error:', error);
    return res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

export const getMyProjects = async (req, res) => {
  try {
    const user = await User.findByPk(req.user.id);
    if (!user || !user.companyId) {
      return res.status(400).json({ success: false, message: 'User must belong to a company' });
    }

    if (user.role === 'ADMIN') {
      const projects = await Project.findAll({
        where: { companyId: user.companyId, isDeleted: false },
        include: projectIncludes()
      });
      return res.status(200).json({
        success: true,
        projects: shapeProjects(projects).map((p) => ({ ...p, myRole: 'PROJECT_ADMIN' }))
      });
    }

    const memberRecords = await ProjectMember.findAll({
      where: { userId: user.id, companyId: user.companyId }
    });
    const projectIds = memberRecords.map((m) => m.projectId);
    const projects = await Project.findAll({
      where: { id: { [Op.in]: projectIds }, isDeleted: false },
      include: projectIncludes()
    });

    const projectsWithRole = shapeProjects(projects).map((p) => {
      const record = memberRecords.find((m) => String(m.projectId) === String(p._id));
      return { ...p, myRole: record ? record.role : 'VIEWER' };
    });

    return res.status(200).json({ success: true, projects: projectsWithRole });
  } catch (error) {
    console.error('Get my projects error:', error);
    return res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

export const getProjectById = async (req, res) => {
  try {
    const project = await Project.findByPk(req.params.id, { include: projectIncludes() });
    return res.status(200).json({
      success: true,
      project: shapeProject(project),
      myRole: req.projectMemberRole
    });
  } catch (error) {
    console.error('Get project detail error:', error);
    return res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

export const updateProject = async (req, res) => {
  try {
    const { name, description } = req.body;
    if (!name || !name.trim()) {
      return res.status(400).json({ success: false, message: 'Project name is required' });
    }
    if (req.user.role !== 'ADMIN' && req.projectMemberRole !== 'PROJECT_ADMIN') {
      return res.status(403).json({ success: false, message: 'Access denied: Only Project Administrators can manage settings' });
    }

    const project = await Project.findByPk(req.params.id);
    project.name = name.trim();
    project.description = description?.trim();
    project.updatedBy = req.user.id;
    await project.save();

    return res.status(200).json({
      success: true,
      message: 'Project details updated successfully',
      project: toApiDoc(project)
    });
  } catch (error) {
    console.error('Update project error:', error);
    return res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

export const deleteProject = async (req, res) => {
  try {
    if (req.user.role !== 'ADMIN' && req.projectMemberRole !== 'PROJECT_ADMIN') {
      return res.status(403).json({ success: false, message: 'Access denied: Only Project Administrators can delete projects' });
    }

    const project = await Project.findByPk(req.params.id);
    const before = { name: project.name, isDeleted: project.isDeleted };
    applySoftDelete(project, req.user.id);
    project.updatedBy = req.user.id;
    await project.save();

    await logActivity(req.user.id, project.companyId, 'PROJECT', project.id, 'DELETE', { projectName: project.name });
    await createAuditLog({
      companyId: project.companyId,
      actorId: req.user.id,
      entityType: 'PROJECT',
      entityId: project.id,
      action: 'PROJECT_DELETED',
      before,
      after: { isDeleted: true, deletedAt: project.deletedAt },
      req
    });

    return res.status(200).json({ success: true, message: 'Project soft deleted successfully' });
  } catch (error) {
    console.error('Delete project error:', error);
    return res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

export const archiveProject = async (req, res) => {
  try {
    if (req.user.role !== 'ADMIN' && req.projectMemberRole !== 'PROJECT_ADMIN') {
      return res.status(403).json({ success: false, message: 'Access denied: Only Project Administrators can archive projects' });
    }

    const project = await Project.findByPk(req.params.id);
    const previousStatus = project.status;
    project.status = 'ARCHIVED';
    project.updatedBy = req.user.id;
    await project.save();

    await logActivity(req.user.id, project.companyId, 'PROJECT', project.id, 'ARCHIVE', { projectName: project.name });
    await createAuditLog({
      companyId: project.companyId,
      actorId: req.user.id,
      entityType: 'PROJECT',
      entityId: project.id,
      action: 'PROJECT_ARCHIVED',
      before: { status: previousStatus },
      after: { status: 'ARCHIVED' },
      req
    });

    return res.status(200).json({ success: true, message: 'Project archived successfully', project: toApiDoc(project) });
  } catch (error) {
    console.error('Archive project error:', error);
    return res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

export const getProjectMembers = async (req, res) => {
  try {
    const members = await ProjectMember.findAll({
      where: { projectId: req.params.id },
      include: projectMemberIncludes()
    });
    return res.status(200).json({ success: true, members: members.map(shapeProjectMember) });
  } catch (error) {
    console.error('Get project members error:', error);
    return res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

export const addProjectMember = async (req, res) => {
  try {
    const { userId, role } = req.body;
    if (!userId || !role) {
      return res.status(400).json({ success: false, message: 'User ID and project role are required' });
    }
    if (req.user.role !== 'ADMIN' && req.projectMemberRole !== 'PROJECT_ADMIN') {
      return res.status(403).json({ success: false, message: 'Access denied: Only Project Administrators can add members' });
    }

    const project = await Project.findByPk(req.params.id);
    const targetUser = await User.findByPk(userId);
    if (!targetUser || String(targetUser.companyId) !== String(project.companyId)) {
      return res.status(400).json({ success: false, message: 'User must belong to your company to be added to this project' });
    }

    const existingMember = await ProjectMember.findOne({ where: { projectId: project.id, userId: targetUser.id } });
    if (existingMember) {
      return res.status(400).json({ success: false, message: 'User is already a member of this project' });
    }

    const newMember = await ProjectMember.create({
      companyId: project.companyId,
      projectId: project.id,
      userId: targetUser.id,
      role,
      addedBy: req.user.id
    });

    const actorUser = await User.findByPk(req.user.id);
    await logActivity(req.user.id, project.companyId, 'MEMBER', newMember.id, 'ADD_MEMBER', {
      projectId: project.id,
      projectName: project.name,
      targetUserId: targetUser.id,
      targetUserName: targetUser.name,
      targetUserEmail: targetUser.email,
      role
    });

    if (String(targetUser.id) !== String(req.user.id)) {
      await createNotification({
        companyId: project.companyId,
        recipientId: targetUser.id,
        actorId: req.user.id,
        type: 'PROJECT_MEMBER_ADDED',
        title: 'Added to project',
        message: `${actorUser?.name || 'Someone'} added you to project "${project.name}" as ${role}`,
        entityType: 'PROJECT',
        entityId: project.id
      });
    }

    const populatedMember = await ProjectMember.findByPk(newMember.id, { include: projectMemberIncludes() });
    return res.status(201).json({
      success: true,
      message: 'Member added successfully',
      member: shapeProjectMember(populatedMember)
    });
  } catch (error) {
    console.error('Add project member error:', error);
    return res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

export const removeProjectMember = async (req, res) => {
  try {
    const { id, memberId } = req.params;
    if (req.user.role !== 'ADMIN' && req.projectMemberRole !== 'PROJECT_ADMIN') {
      return res.status(403).json({ success: false, message: 'Access denied: Only Project Administrators can remove members' });
    }

    const member = await ProjectMember.findByPk(memberId, {
      include: [{ model: User, as: 'user', attributes: ['id', 'name', 'email'] }]
    });
    if (!member || String(member.projectId) !== String(id)) {
      return res.status(404).json({ success: false, message: 'Project member mapping not found' });
    }

    const memberUser = member.user || member.get?.('user');
    if (String(memberUser.id) === String(req.user.id)) {
      return res.status(400).json({ success: false, message: 'You cannot remove yourself from the project' });
    }

    const project = await Project.findByPk(id);
    await member.destroy();

    await logActivity(req.user.id, member.companyId, 'MEMBER', member.id, 'REMOVE_MEMBER', {
      projectId: id,
      projectName: project?.name,
      targetUserId: memberUser.id,
      targetUserName: memberUser.name,
      targetUserEmail: memberUser.email
    });

    return res.status(200).json({ success: true, message: 'Member removed from project successfully' });
  } catch (error) {
    console.error('Remove project member error:', error);
    return res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

export const changeProjectRole = async (req, res) => {
  try {
    const { id, memberId } = req.params;
    const { role } = req.body;
    if (!role || !['PROJECT_ADMIN', 'DEVELOPER', 'TESTER', 'VIEWER'].includes(role)) {
      return res.status(400).json({ success: false, message: 'Valid project role is required' });
    }
    if (req.user.role !== 'ADMIN' && req.projectMemberRole !== 'PROJECT_ADMIN') {
      return res.status(403).json({ success: false, message: 'Access denied: Only Project Administrators can modify roles' });
    }

    const member = await ProjectMember.findByPk(memberId, {
      include: [{ model: User, as: 'user', attributes: ['id', 'name', 'email'] }]
    });
    if (!member || String(member.projectId) !== String(id)) {
      return res.status(404).json({ success: false, message: 'Project member mapping not found' });
    }

    const memberUser = member.user || member.get?.('user');
    const oldRole = member.role;
    member.role = role;
    await member.save();

    const project = await Project.findByPk(id);
    await logActivity(req.user.id, member.companyId, 'MEMBER', member.id, 'CHANGE_ROLE', {
      projectId: id,
      projectName: project?.name,
      targetUserId: memberUser.id,
      targetUserName: memberUser.name,
      targetUserEmail: memberUser.email,
      oldRole,
      newRole: role
    });

    await createAuditLog({
      companyId: member.companyId,
      actorId: req.user.id,
      entityType: 'PROJECT_MEMBER',
      entityId: member.id,
      action: 'ROLE_CHANGED',
      before: { role: oldRole },
      after: { role },
      req
    });

    const populatedMember = await ProjectMember.findByPk(member.id, { include: projectMemberIncludes() });
    return res.status(200).json({
      success: true,
      message: 'Member role updated successfully',
      member: shapeProjectMember(populatedMember)
    });
  } catch (error) {
    console.error('Change project role error:', error);
    return res.status(500).json({ success: false, message: 'Internal server error' });
  }
};
