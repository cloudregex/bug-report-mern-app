import express from 'express';
import { createCompany, getMyCompany } from '../controllers/companyController.js';
import { authenticateToken } from '../middleware/authMiddleware.js';

const router = express.Router();

// Protected Routes
router.post('/', authenticateToken, createCompany);
router.get('/me', authenticateToken, getMyCompany);

export default router;
