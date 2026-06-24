import express from 'express';
import {
  createComment,
  getComments,
  updateComment,
  deleteComment
} from '../controllers/commentController.js';
import { authenticateToken, authorizeTicketAccess } from '../middleware/authMiddleware.js';

const router = express.Router();

router.use(authenticateToken);

// Ticket-specific comments (Checks project/ticket access)
router.post('/tickets/:ticketId/comments', authorizeTicketAccess, createComment);
router.get('/tickets/:ticketId/comments', authorizeTicketAccess, getComments);

// Individual comment actions
router.patch('/comments/:id', updateComment);
router.delete('/comments/:id', deleteComment);

export default router;
