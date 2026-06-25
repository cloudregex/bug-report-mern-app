import Notification from '../models/Notification.js';
import { notificationIncludes } from '../utils/queryIncludes.js';
import { shapeNotification } from '../utils/apiShape.js';

export const getNotifications = async (req, res) => {
  try {
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 20;
    const offset = (page - 1) * limit;

    const [notifications, total] = await Promise.all([
      Notification.findAll({
        where: { recipientId: req.user.id },
        include: notificationIncludes(),
        order: [['createdAt', 'DESC']],
        offset,
        limit
      }),
      Notification.count({ where: { recipientId: req.user.id } })
    ]);

    return res.status(200).json({
      success: true,
      notifications: notifications.map(shapeNotification),
      pagination: { total, page, limit, pages: Math.ceil(total / limit) }
    });
  } catch (error) {
    console.error('Get notifications error:', error);
    return res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

export const getUnreadCount = async (req, res) => {
  try {
    const count = await Notification.count({
      where: { recipientId: req.user.id, isRead: false }
    });
    return res.status(200).json({ success: true, count });
  } catch (error) {
    console.error('Get unread count error:', error);
    return res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

export const markRead = async (req, res) => {
  try {
    const notification = await Notification.findOne({
      where: { id: req.params.id, recipientId: req.user.id }
    });
    if (!notification) {
      return res.status(404).json({ success: false, message: 'Notification not found' });
    }

    notification.isRead = true;
    await notification.save();

    return res.status(200).json({ success: true, notification: shapeNotification(notification) });
  } catch (error) {
    console.error('Mark read error:', error);
    return res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

export const markAllRead = async (req, res) => {
  try {
    const [updatedCount] = await Notification.update(
      { isRead: true },
      { where: { recipientId: req.user.id, isRead: false } }
    );

    return res.status(200).json({
      success: true,
      message: `${updatedCount} notifications marked as read`
    });
  } catch (error) {
    console.error('Mark all read error:', error);
    return res.status(500).json({ success: false, message: 'Internal server error' });
  }
};
