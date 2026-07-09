import express from 'express';
import { 
  createEmployee, 
  getEmployees, 
  getEmployeeById, 
  updateEmployeeStatus,
  createClient,
  getClients,
  getClientById,
  updateClientStatus
} from '../controllers/userController.js';
import { authenticateToken, authorize } from '../middleware/authMiddleware.js';

const router = express.Router();

// Apply auth middleware to all routes
router.use(authenticateToken);

// Apply authorize('ADMIN') to all employee management routes
router.post('/employee', authorize(['ADMIN']), createEmployee);
router.get('/employees', authorize(['ADMIN']), getEmployees);

// Client management routes
router.post('/client', authorize(['ADMIN', 'EMPLOYEE']), createClient);
router.get('/clients', authorize(['ADMIN', 'EMPLOYEE']), getClients);
router.get('/clients/:id', authorize(['ADMIN', 'EMPLOYEE']), getClientById);
router.patch('/clients/:id/status', authorize(['ADMIN']), updateClientStatus);

// Employee detail routes (must be lower down to avoid conflict with /clients, but wait, :id matches any string)
// So we put /clients and /client routes before /:id routes!
router.get('/:id', authorize(['ADMIN']), getEmployeeById);
router.patch('/:id/status', authorize(['ADMIN']), updateEmployeeStatus);

export default router;

