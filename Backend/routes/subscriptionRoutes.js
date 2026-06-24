import express from 'express';
import {
  listPlans,
  createPlan,
  listSubscriptions,
  updateSubscription,
  getBilling,
  getSaasDashboardStats
} from '../controllers/subscriptionController.js';
import { authenticateToken, authorize } from '../middleware/authMiddleware.js';
import { requireConfirmation } from '../middleware/confirmationMiddleware.js';

const router = express.Router();

router.use(authenticateToken);

// Company billing (admin can upgrade; employees can view usage)
router.get('/billing', authorize(['ADMIN', 'EMPLOYEE']), getBilling);

// SaaS owner
router.get('/saas/dashboard', authorize(['SUPER_ADMIN']), getSaasDashboardStats);
router.get('/plans', authorize(['SUPER_ADMIN']), listPlans);
router.post('/plans', authorize(['SUPER_ADMIN']), createPlan);
router.get('/subscriptions', authorize(['SUPER_ADMIN']), listSubscriptions);
router.patch('/subscriptions/:id', authorize(['SUPER_ADMIN']), requireConfirmation, updateSubscription);

export default router;
