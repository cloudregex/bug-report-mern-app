import express from 'express';
import {
  getCompanySecurityDashboard,
  getPlatformSecurityDashboard
} from '../controllers/securityController.js';
import { authenticateToken, authorize } from '../middleware/authMiddleware.js';

const router = express.Router();

router.use(authenticateToken);
router.get('/dashboard', authorize(['ADMIN']), getCompanySecurityDashboard);
router.get('/platform-dashboard', authorize(['SUPER_ADMIN']), getPlatformSecurityDashboard);

export default router;
