import express from 'express';
import { createCheckoutSession, handleWebhook, verifyCheckout } from '../controllers/paymentController.js';
import { authenticateToken, authorize } from '../middleware/authMiddleware.js'

const router = express.Router();
router.post('/payments/webhook', handleWebhook);
router.post('/payments/create-checkout-session', authenticateToken, authorize(['ADMIN']), createCheckoutSession);
router.get('/payments/verify-checkout', authenticateToken, authorize(['ADMIN']), verifyCheckout);

export default router;