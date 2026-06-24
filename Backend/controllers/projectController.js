import Project from '../models/Project.js';
import ProjectMember from '../models/ProjectMember.js';
import Activity from '../models/Activity.js';
import User from '../models/User.js';
import { checkProjectLimit } from '../services/subscriptionService.js';
import { syncUsage } from '../services/usageService.js';
import { createNotification } from '../services/notificationService.js';
import { createAuditLog, applySoftDelete } from '../services/auditService.js';

// Helper to log activities
const logActivity = async (actorId, companyId, entityType, entityId, action, metadata = {}) => {
  try {
    const activity = new Activity({
      actorId,
      companyId,
      entityType,
      entityId,
      action,
      metadata
    });
    await activity.save();
  } catch (error) {
    console.error('Failed to write activity log:', error);
  }
};

// Create Project
export const createProject = async (req, res) => {
  try {
    const { name, description } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Project name is required'
      });
    }

    const user = await User.findById(req.user.id);
    if (!user || !user.companyId) {
      return res.status(400).json({
        success: false,
        message: 'User must belong to a company to create projects'
      });
    }

    const projectLimit = await checkProjectLimit(user.companyId);
    if (!projectLimit.allowed) {
      return res.status(403).json(projectLimit.response);
    }

    // 1. Create project
    const project = new Project({
      companyId: user.companyId,
      name: name.trim(),
      description: description?.trim(),
      createdBy: user._id,
      updatedBy: user._id
    });
    await project.save();
    await syncUsage(user.companyId);

    // 2. Automatically map creator as PROJECT_ADMIN
    const member = new ProjectMember({
      companyId: user.companyId,
      projectId: project._id,
      userId: user._id,
      role: 'PROJECT_ADMIN',
      addedBy: user._id
    });
    await member.save();

    // 3. Log Activity
    await logActivity(
      user._id,
      user.companyId,
      'PROJECT',
      project._id,
      'CREATE',
      { projectName: project.name }
    );

    return res.status(201).json({
      success: true,
      message: 'Project created successfully',
      project
    });
  } catch (error) {
    console.error('Create project error:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

// Get My Projects (Admin sees all; Employees see members-only)
export const getMyProjects = async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user || !user.companyId) {
      return res.status(400).json({
        success: false,
        message: 'User must belong to a company'
      });
    }

    if (user.role === 'ADMIN') {
      // Company Admin sees all active projects in the company
      const projects = await Project.find({
        companyId: user.companyId,
        isDeleted: false
      }).populate('createdBy', 'name email');

      const projectsWithRole = projects.map(p => ({
        ...p.toObject(),
        myRole: 'PROJECT_ADMIN' // Admins implicitly act as PROJECT_ADMIN
      }));

      return res.status(200).json({
        success: true,
        projects: projectsWithRole
      });
    }

    // Employees see only projects they are mapped to
    const memberRecords = await ProjectMember.find({
      userId: user._id,
      companyId: user.companyId
    });

    const projectIds = memberRecords.map(m => m.projectId);
    const projects = await Project.find({
      _id: { $in: projectIds },
      isDeleted: false
    }).populate('createdBy', 'name email');

    const projectsWithRole = projects.map(p => {
      const record = memberRecords.find(m => m.projectId.toString() === p._id.toString());
      return {
        ...p.toObject(),
        myRole: record ? record.role : 'VIEWER'
      };
    });

    return res.status(200).json({
      success: true,
      projects: projectsWithRole
    });
  } catch (error) {
    console.error('Get my projects error:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

// Get Project Details by ID
export const getProjectById = async (req, res) => {
  try {
    const project = await Project.findById(req.params.id)
      .populate('createdBy', 'name email')
      .populate('updatedBy', 'name email');

    return res.status(200).json({
      success: true,
      project,
      myRole: req.projectMemberRole // passed from access check middleware
    });
  } catch (error) {
    console.error('Get project detail error:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

// Update Project (PROJECT_ADMIN or Company Admin required)
export const updateProject = async (req, res) => {
  try {
    const { name, description } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Project name is required'
      });
    }

    // Verify privilege
    if (req.user.role !== 'ADMIN' && req.projectMemberRole !== 'PROJECT_ADMIN') {
      return res.status(403).json({
        success: false,
        message: 'Access denied: Only Project Administrators can manage settings'
      });
    }

    const project = await Project.findById(req.params.id);
    project.name = name.trim();
    project.description = description?.trim();
    project.updatedBy = req.user.id;
    await project.save();

    return res.status(200).json({
      success: true,
      message: 'Project details updated successfully',
      project
    });
  } catch (error) {
    console.error('Update project error:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

// Soft Delete Project
export const deleteProject = async (req, res) => {
  try {
    // Verify privilege
    if (req.user.role !== 'ADMIN' && req.projectMemberRole !== 'PROJECT_ADMIN') {
      return res.status(403).json({
        success: false,
        message: 'Access denied: Only Project Administrators can delete projects'
      });
    }

    const project = await Project.findById(req.params.id);
    const before = { name: project.name, isDeleted: project.isDeleted };
    applySoftDelete(project, req.user.id);
    project.updatedBy = req.user.id;
    await project.save();

    await logActivity(
      req.user.id,
      project.companyId,
      'PROJECT',
      project._id,
      'DELETE',
      { projectName: project.name }
    );

    await createAuditLog({
      companyId: project.companyId,
      actorId: req.user.id,
      entityType: 'PROJECT',
      entityId: project._id,
      action: 'PROJECT_DELETED',
      before,
      after: { isDeleted: true, deletedAt: project.deletedAt },
      req
    });

    return res.status(200).json({
      success: true,
      message: 'Project soft deleted successfully'
    });
  } catch (error) {
    console.error('Delete project error:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

// Archive Project
export const archiveProject = async (req, res) => {
  try {
    // Verify privilege
    if (req.user.role !== 'ADMIN' && req.projectMemberRole !== 'PROJECT_ADMIN') {
      return res.status(403).json({
        success: false,
        message: 'Access denied: Only Project Administrators can archive projects'
      });
    }

    const project = await Project.findById(req.params.id);
    const previousStatus = project.status;
    project.status = 'ARCHIVED';
    project.updatedBy = req.user.id;
    await project.save();

    await logActivity(
      req.user.id,
      project.companyId,
      'PROJECT',
      project._id,
      'ARCHIVE',
      { projectName: project.name }
    );

    await createAuditLog({
      companyId: project.companyId,
      actorId: req.user.id,
      entityType: 'PROJECT',
      entityId: project._id,
      action: 'PROJECT_ARCHIVED',
      before: { status: previousStatus },
      after: { status: 'ARCHIVED' },
      req
    });

    return res.status(200).json({
      success: true,
      message: 'Project archived successfully',
      project
    });
  } catch (error) {
    console.error('Archive project error:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

// Get Members in Project
export const getProjectMembers = async (req, res) => {
  try {
    const members = await ProjectMember.find({
      projectId: req.params.id
    })
    .populate('userId', 'name email username role status')
    .populate('addedBy', 'name email');

    return res.status(200).json({
      success: true,
      members
    });
  } catch (error) {
    console.error('Get project members error:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

// Add Project Member
export const addProjectMember = async (req, res) => {
  try {
    const { userId, role } = req.body;

    if (!userId || !role) {
      return res.status(400).json({
        success: false,
        message: 'User ID and project role are required'
      });
    }

    // Verify privilege
    if (req.user.role !== 'ADMIN' && req.projectMemberRole !== 'PROJECT_ADMIN') {
      return res.status(403).json({
        success: false,
        message: 'Access denied: Only Project Administrators can add members'
      });
    }

    const project = await Project.findById(req.params.id);

    // Verify target user belongs to same company
    const targetUser = await User.findById(userId);
    if (!targetUser || targetUser.companyId.toString() !== project.companyId.toString()) {
      return res.status(400).json({
        success: false,
        message: 'User must belong to your company to be added to this project'
      });
    }

    // Check if already member
    const existingMember = await ProjectMember.findOne({
      projectId: project._id,
      userId: targetUser._id
    });

    if (existingMember) {
      return res.status(400).json({
        success: false,
        message: 'User is already a member of this project'
      });
    }

    const newMember = new ProjectMember({
      companyId: project.companyId,
      projectId: project._id,
      userId: targetUser._id,
      role,
      addedBy: req.user.id
    });
    await newMember.save();

    // Log Activity
    const actorUser = await User.findById(req.user.id);
    await logActivity(
      req.user.id,
      project.companyId,
      'MEMBER',
      newMember._id,
      'ADD_MEMBER',
      {
        projectId: project._id,
        projectName: project.name,
        targetUserId: targetUser._id,
        targetUserName: targetUser.name,
        targetUserEmail: targetUser.email,
        role
      }
    );

    // Notify the newly added member
    if (targetUser._id.toString() !== req.user.id.toString()) {
      await createNotification({
        companyId: project.companyId,
        recipientId: targetUser._id,
        actorId: req.user.id,
        type: 'PROJECT_MEMBER_ADDED',
        title: 'Added to project',
        message: `${actorUser?.name || 'Someone'} added you to project "${project.name}" as ${role}`,
        entityType: 'PROJECT',
        entityId: project._id
      });
    }

    const populatedMember = await ProjectMember.findById(newMember._id)
      .populate('userId', 'name email username role status')
      .populate('addedBy', 'name email');

    return res.status(201).json({
      success: true,
      message: 'Member added successfully',
      member: populatedMember
    });
  } catch (error) {
    console.error('Add project member error:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

// Remove Project Member
export const removeProjectMember = async (req, res) => {
  try {
    const { id, memberId } = req.params; // id is projectId

    // Verify privilege
    if (req.user.role !== 'ADMIN' && req.projectMemberRole !== 'PROJECT_ADMIN') {
      return res.status(403).json({
        success: false,
        message: 'Access denied: Only Project Administrators can remove members'
      });
    }

    const member = await ProjectMember.findById(memberId).populate('userId', 'name email');
    if (!member || member.projectId.toString() !== id) {
      return res.status(404).json({
        success: false,
        message: 'Project member mapping not found'
      });
    }

    // Cannot remove oneself
    if (member.userId._id.toString() === req.user.id.toString()) {
      return res.status(400).json({
        success: false,
        message: 'You cannot remove yourself from the project'
      });
    }

    await ProjectMember.findByIdAndDelete(memberId);

    const project = await Project.findById(id);
    // Log Activity
    await logActivity(
      req.user.id,
      member.companyId,
      'MEMBER',
      member._id,
      'REMOVE_MEMBER',
      {
        projectId: id,
        projectName: project?.name,
        targetUserId: member.userId._id,
        targetUserName: member.userId.name,
        targetUserEmail: member.userId.email
      }
    );

    return res.status(200).json({
      success: true,
      message: 'Member removed from project successfully'
    });
  } catch (error) {
    console.error('Remove project member error:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

// Update Project Member Role
export const changeProjectRole = async (req, res) => {
  try {
    const { id, memberId } = req.params;
    const { role } = req.body;

    if (!role || !['PROJECT_ADMIN', 'DEVELOPER', 'TESTER', 'VIEWER'].includes(role)) {
      return res.status(400).json({
        success: false,
        message: 'Valid project role is required'
      });
    }

    // Verify privilege
    if (req.user.role !== 'ADMIN' && req.projectMemberRole !== 'PROJECT_ADMIN') {
      return res.status(403).json({
        success: false,
        message: 'Access denied: Only Project Administrators can modify roles'
      });
    }

    const member = await ProjectMember.findById(memberId).populate('userId', 'name email');
    if (!member || member.projectId.toString() !== id) {
      return res.status(404).json({
        success: false,
        message: 'Project member mapping not found'
      });
    }

    const oldRole = member.role;
    member.role = role;
    await member.save();

    const project = await Project.findById(id);
    await logActivity(
      req.user.id,
      member.companyId,
      'MEMBER',
      member._id,
      'CHANGE_ROLE',
      {
        projectId: id,
        projectName: project?.name,
        targetUserId: member.userId._id,
        targetUserName: member.userId.name,
        targetUserEmail: member.userId.email,
        oldRole,
        newRole: role
      }
    );

    await createAuditLog({
      companyId: member.companyId,
      actorId: req.user.id,
      entityType: 'PROJECT_MEMBER',
      entityId: member._id,
      action: 'ROLE_CHANGED',
      before: { role: oldRole },
      after: { role },
      req
    });

    const populatedMember = await ProjectMember.findById(member._id)
      .populate('userId', 'name email username role status')
      .populate('addedBy', 'name email');

    return res.status(200).json({
      success: true,
      message: 'Member role updated successfully',
      member: populatedMember
    });
  } catch (error) {
    console.error('Change project role error:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};
