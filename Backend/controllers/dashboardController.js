import User from '../models/User.js';
import Project from '../models/Project.js';
import {
  getCompanyOverview,
  getMyDashboard,
  getProjectDashboard
} from '../services/analyticsService.js';

export const getCompanyDashboard = async (req, res) => {
  try {
    if (req.user.role !== 'ADMIN') {
      return res.status(403).json({ success: false, message: 'Admin access required' });
    }

    const user = await User.findByPk(req.user.id);
    if (!user?.companyId) {
      return res.status(400).json({ success: false, message: 'User must belong to a company' });
    }

    const data = await getCompanyOverview(user.companyId);
    return res.status(200).json({ success: true, dashboard: data });
  } catch (error) {
    console.error('Company dashboard error:', error);
    return res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

export const getMeDashboard = async (req, res) => {
  try {
    const user = await User.findByPk(req.user.id);
    if (!user?.companyId) {
      return res.status(400).json({ success: false, message: 'User must belong to a company' });
    }

    const data = await getMyDashboard(user.id, user.companyId);
    return res.status(200).json({ success: true, dashboard: data });
  } catch (error) {
    console.error('My dashboard error:', error);
    return res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

export const getProjectDashboardHandler = async (req, res) => {
  try {
    const project = await Project.findByPk(req.params.id);
    if (!project || project.isDeleted) {
      return res.status(404).json({ success: false, message: 'Project not found' });
    }
    const data = await getProjectDashboard(project.id, project.companyId);
    return res.status(200).json({ success: true, dashboard: data });
  } catch (error) {
    console.error('Project dashboard error:', error);
    return res.status(500).json({ success: false, message: 'Internal server error' });
  }
};
