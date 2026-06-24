import express from 'express';
import { getAuditLogs } from '../controllers/auditController.js';
import { authenticateToken, authorize } from '../middleware/authMiddleware.js';

const router = express.Router();

router.use(authenticateToken);
router.get('/', authorize(['ADMIN', 'SUPER_ADMIN']), getAuditLogs);

export default router;
