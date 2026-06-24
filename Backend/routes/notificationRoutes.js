import express from 'express';
import {
  getNotifications,
  getUnreadCount,
  markRead,
  markAllRead
} from '../controllers/notificationController.js';
import { authenticateToken } from '../middleware/authMiddleware.js';

const router = express.Router();

router.use(authenticateToken);

// GET all notifications for current user (paginated)
router.get('/', getNotifications);

// GET unread count — used for the 🔔 bell badge
// IMPORTANT: This route must come BEFORE /:id/read to prevent "unread-count"
// being treated as an :id parameter
router.get('/unread-count', getUnreadCount);

// PATCH mark all notifications as read (bulk)
// IMPORTANT: This also must come before /:id/read for the same reason
router.patch('/read-all', markAllRead);

// PATCH mark a single notification as read
router.patch('/:id/read', markRead);

export default router;
