import jwt from 'jsonwebtoken';
import { Op } from 'sequelize';
import User from '../models/User.js';
import Project from '../models/Project.js';
import ProjectMember from '../models/ProjectMember.js';
import Ticket from '../models/Ticket.js';
import { isSessionActive, touchSession } from '../services/sessionService.js';
import { isAccountLocked } from '../services/loginSecurityService.js';
import { excludePassword } from '../utils/apiShape.js';

const JWT_SECRET = process.env.JWT_SECRET || 'bug_tracker_super_secret_jwt_key_2026';

export const authenticateToken = async (req, res, next) => {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'Access token required'
      });
    }

    let decoded;
    try {
      decoded = jwt.verify(token, JWT_SECRET);
    } catch {
      return res.status(403).json({
        success: false,
        message: 'Invalid or expired token'
      });
    }

    const user = await User.findByPk(decoded.id, {
      attributes: { exclude: ['password', 'passwordHistory'] }
    });
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'User not found'
      });
    }

    if (user.status === 'DISABLED') {
      return res.status(403).json({
        success: false,
        message: 'Your account has been disabled. Contact your administrator.'
      });
    }

    if (isAccountLocked(user)) {
      return res.status(403).json({
        success: false,
        message: 'Your account is temporarily locked due to failed login attempts.'
      });
    }

    if (decoded.tokenId) {
      const active = await isSessionActive(decoded.tokenId);
      if (!active) {
        return res.status(401).json({
          success: false,
          message: 'Session has been revoked. Please log in again.'
        });
      }
      await touchSession(decoded.tokenId);
    }

    req.user = {
      ...decoded,
      companyId: user.companyId ? String(user.companyId) : null
    };
    req.dbUser = user;
    next();
  } catch (error) {
    console.error('Auth middleware error:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

export const authorize = (roles = []) => (req, res, next) => {
  if (!req.user || !roles.includes(req.user.role)) {
    return res.status(403).json({
      success: false,
      message: 'Forbidden: Access denied'
    });
  }
  next();
};

export const authorizeProjectAccess = async (req, res, next) => {
  try {
    const projectId = req.params.projectId || req.params.id || req.body.projectId;

    if (!projectId) {
      return res.status(400).json({
        success: false,
        message: 'Project ID is required'
      });
    }

    const user = req.dbUser || await User.findByPk(req.user.id);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    const project = await Project.findByPk(projectId);
    if (!project || project.isDeleted) {
      return res.status(404).json({
        success: false,
        message: 'Project not found'
      });
    }

    if (String(project.companyId) !== String(user.companyId)) {
      return res.status(403).json({
        success: false,
        message: 'Access denied: Company mismatch'
      });
    }

    if (user.role === 'ADMIN') {
      req.projectMemberRole = 'PROJECT_ADMIN';
      return next();
    }

    const member = await ProjectMember.findOne({
      where: { projectId: project.id, userId: user.id }
    });

    if (!member) {
      return res.status(403).json({
        success: false,
        message: 'Access denied: You are not a member of this project'
      });
    }

    req.projectMemberRole = member.role;
    next();
  } catch (error) {
    console.error('Project access middleware error:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

export const authorizeTicketAccess = async (req, res, next) => {
  try {
    const ticketId = req.params.id || req.body.ticketId || req.params.ticketId;

    if (!ticketId) {
      return res.status(400).json({
        success: false,
        message: 'Ticket ID is required'
      });
    }

    const user = req.dbUser || await User.findByPk(req.user.id);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    const ticket = await Ticket.findByPk(ticketId);
    if (!ticket || ticket.isDeleted) {
      return res.status(404).json({
        success: false,
        message: 'Ticket not found'
      });
    }

    if (String(ticket.companyId) !== String(user.companyId)) {
      return res.status(403).json({
        success: false,
        message: 'Access denied: Company mismatch'
      });
    }

    if (user.role === 'ADMIN') {
      req.projectMemberRole = 'PROJECT_ADMIN';
      req.ticket = ticket;
      return next();
    }

    const member = await ProjectMember.findOne({
      where: { projectId: ticket.projectId, userId: user.id }
    });

    if (!member) {
      return res.status(403).json({
        success: false,
        message: 'Access denied: You are not a member of this project'
      });
    }

    req.projectMemberRole = member.role;
    req.ticket = ticket;
    next();
  } catch (error) {
    console.error('Ticket access middleware error:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

export { excludePassword };
