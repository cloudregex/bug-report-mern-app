import express from 'express';
import { getSessions, revokeSessionById } from '../controllers/sessionController.js';
import { authenticateToken } from '../middleware/authMiddleware.js';

const router = express.Router();

router.use(authenticateToken);
router.get('/', getSessions);
router.delete('/:id', revokeSessionById);

export default router;
