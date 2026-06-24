import express from 'express';
import {
  createProject,
  getMyProjects,
  getProjectById,
  updateProject,
  deleteProject,
  archiveProject,
  getProjectMembers,
  addProjectMember,
  removeProjectMember,
  changeProjectRole
} from '../controllers/projectController.js';
import { getProjectDashboardHandler } from '../controllers/dashboardController.js';
import { createTicket } from '../controllers/ticketController.js';
import { authenticateToken, authorize, authorizeProjectAccess } from '../middleware/authMiddleware.js';
import { requireConfirmation } from '../middleware/confirmationMiddleware.js';

const router = express.Router();

// Apply authentication to all routes
router.use(authenticateToken);

// Create project (Admin only)
router.post('/', authorize(['ADMIN']), createProject);

// Fetch projects for user (Admin sees all, Employee sees member projects)
router.get('/my', getMyProjects);

// Project analytics dashboard (must be before /:id)
router.get('/:id/dashboard', authorizeProjectAccess, getProjectDashboardHandler);

// Read Project details (Access check)
router.get('/:id', authorizeProjectAccess, getProjectById);

// Update, Delete (Soft), and Archive Project (Access check + Admin/ProjectAdmin verified in controller)
router.put('/:id', authorizeProjectAccess, updateProject);
router.delete('/:id', authorizeProjectAccess, requireConfirmation, deleteProject);
router.patch('/:id/archive', authorizeProjectAccess, archiveProject);

// Member sub-resource endpoints (Access check + Admin/ProjectAdmin verified in controller)
router.get('/:id/members', authorizeProjectAccess, getProjectMembers);
router.post('/:id/members', authorizeProjectAccess, addProjectMember);
router.delete('/:id/members/:memberId', authorizeProjectAccess, removeProjectMember);
router.patch('/:id/members/:memberId', authorizeProjectAccess, changeProjectRole);

// Ticket creation under project workspace
router.post('/:projectId/tickets', authorizeProjectAccess, createTicket);

export default router;
