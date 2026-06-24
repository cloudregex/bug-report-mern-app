import express from 'express';
import {
  searchTickets,
  getTicketDetails,
  assignTicket,
  changeStatus,
  updatePriority,
  deleteTicket
} from '../controllers/ticketController.js';
import { authenticateToken, authorizeTicketAccess } from '../middleware/authMiddleware.js';
import { requireConfirmation } from '../middleware/confirmationMiddleware.js';

const router = express.Router();

// Apply authentication to all routes
router.use(authenticateToken);

// Search / list tickets globally across company projects
router.get('/', searchTickets);

// Get single ticket details (Checks project membership)
router.get('/:id', authorizeTicketAccess, getTicketDetails);

// Modify ticket attributes (Checks project membership + updates log)
router.patch('/:id/assign', authorizeTicketAccess, assignTicket);
router.patch('/:id/status', authorizeTicketAccess, changeStatus);
router.patch('/:id/priority', authorizeTicketAccess, updatePriority);
router.delete('/:id', authorizeTicketAccess, requireConfirmation, deleteTicket);

export default router;
