import express from 'express';
import { getMyMentions, getTicketMentions } from '../controllers/mentionController.js';
import { authenticateToken, authorizeTicketAccess } from '../middleware/authMiddleware.js';

const router = express.Router();

router.use(authenticateToken);

// GET /mentions — all @mentions for the current user (My Mentions feed)
router.get('/', getMyMentions);

// GET /tickets/:id/mentions — all mentions on a specific ticket
// authorizeTicketAccess sets req.ticket which getTicketMentions uses
router.get('/tickets/:id/mentions', authorizeTicketAccess, getTicketMentions);

export default router;
