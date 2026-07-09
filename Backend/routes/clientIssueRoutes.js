import express from 'express';
import { upload } from '../middleware/uploadMiddleware.js';
import { authenticateToken, authorize } from '../middleware/authMiddleware.js';
import {
  createClientIssue,
  getClientIssues,
  getClientIssueById,
  convertClientIssueToTicket,
  rejectClientIssue
} from '../controllers/clientIssueController.js';

const router = express.Router();

router.use(authenticateToken);

// Submit new issue (clients only)
router.post('/', authorize(['CLIENT']), upload.single('image'), createClientIssue);

// Get client issues (clients get their own; admin/employee get all for company/project)
router.get('/', getClientIssues);

// Get details of a specific issue
router.get('/:id', getClientIssueById);

// Convert / reject issues (admin/employee only)
router.post('/:id/convert', authorize(['ADMIN', 'EMPLOYEE']), convertClientIssueToTicket);
router.post('/:id/reject', authorize(['ADMIN', 'EMPLOYEE']), rejectClientIssue);

export default router;
