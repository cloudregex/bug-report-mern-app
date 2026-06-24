import express from 'express';
import { 
  createEmployee, 
  getEmployees, 
  getEmployeeById, 
  updateEmployeeStatus 
} from '../controllers/userController.js';
import { authenticateToken, authorize } from '../middleware/authMiddleware.js';

const router = express.Router();

// Apply auth middleware to all routes
router.use(authenticateToken);

// Apply authorize('ADMIN') to all employee management routes
router.post('/employee', authorize(['ADMIN']), createEmployee);
router.get('/employees', authorize(['ADMIN']), getEmployees);
router.get('/:id', authorize(['ADMIN']), getEmployeeById);
router.patch('/:id/status', authorize(['ADMIN']), updateEmployeeStatus);

export default router;
