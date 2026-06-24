import express from 'express';
import { loginUser, registerCompany, getUserProfile } from '../controllers/authController.js';
import { authenticateToken } from '../middleware/authMiddleware.js';

const router = express.Router();

// Public routes
router.post('/login', loginUser);
router.post('/register', registerCompany);

// Protected routes
router.get('/me', authenticateToken, getUserProfile);

export default router;
