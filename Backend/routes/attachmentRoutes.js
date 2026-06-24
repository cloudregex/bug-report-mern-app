import express from 'express';
import {
  uploadAttachment,
  getAttachments,
  deleteAttachment
} from '../controllers/attachmentController.js';
import { upload } from '../middleware/uploadMiddleware.js';
import { authenticateToken, authorizeTicketAccess } from '../middleware/authMiddleware.js';

const router = express.Router();

router.use(authenticateToken);

// Ticket-specific attachments (Checks project/ticket access and uploads file)
router.post('/tickets/:ticketId/attachments', authorizeTicketAccess, upload.single('file'), uploadAttachment);
router.get('/tickets/:ticketId/attachments', authorizeTicketAccess, getAttachments);

// Individual attachment actions
router.delete('/attachments/:id', deleteAttachment);

export default router;
