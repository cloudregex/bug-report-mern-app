import express from 'express';
import { loginUser, registerCompany, getUserProfile, logoutUser } from '../controllers/authController.js';
import { authenticateToken } from '../middleware/authMiddleware.js';

const router = express.Router();

// Public routes
router.post('/login', loginUser);
router.post('/register', registerCompany);

// Protected routes
router.get('/me', authenticateToken, getUserProfile);
router.post('/logout', authenticateToken, logoutUser);


export default router;
