import express from 'express';
import { authenticateToken } from '../middleware/authMiddleware.js';
import { getCompanyDashboard, getMeDashboard } from '../controllers/dashboardController.js';

const router = express.Router();

router.use(authenticateToken);

router.get('/company', getCompanyDashboard);
router.get('/me', getMeDashboard);

export default router;
