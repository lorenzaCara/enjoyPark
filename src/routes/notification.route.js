// src/routes/notificationRouter.js
import express from 'express';
import prisma from '../prisma/prismaClient.js';
import { authMiddleware } from '../middlewares/auth.middleware.js';
import validatorMiddleware from '../middlewares/validator.middleware.js';
import { deleteNotificationValidator, updateNotificationValidator } from '../validators/notification.validator.js';

const notificationRouter = express.Router();

// GET /notifications - get all notifications for the logged-in user
notificationRouter.get('/notifications', authMiddleware, async (req, res) => {
  try {
    const userId = req.user.id; // from auth middleware
    const notifications = await prisma.notification.findMany({
      where: {
        userId,
        sent: true, // only show actually sent notifications
      },
      orderBy: { sendAt: 'desc' },
    });
    res.json(notifications);
  } catch (error) {
    console.error('Error retrieving notifications:', error);
    res.status(500).json({ message: 'Error retrieving notifications' });
  }
});

// PATCH /notifications/:id - mark a notification as read
notificationRouter.patch(
  '/notifications/:id',
  authMiddleware,
  validatorMiddleware(updateNotificationValidator(true)),
  async (req, res) => {
    const idInt = Number(req.params.id);

    try {
      const notification = await prisma.notification.findUnique({
        where: { id: idInt },
      });

      if (!notification || notification.userId !== req.user.id) {
        return res.status(404).json({ message: 'Notification not found' });
      }

      if (!notification.read) {
        await prisma.notification.update({
          where: { id: idInt },
          data: { read: true },
        });
      }

      res.json(notification);
    } catch (error) {
      console.error('Error retrieving the notification:', error);
      res.status(500).json({ message: 'Server error' });
    }
  }
);

// DELETE /notifications/:id - delete a notification for the logged-in user
notificationRouter.delete(
  '/notifications/:id',
  authMiddleware,
  validatorMiddleware(deleteNotificationValidator),
  async (req, res) => {
    const idInt = Number(req.params.id);

    try {
      const notification = await prisma.notification.findUnique({
        where: { id: idInt },
      });

      if (!notification || notification.userId !== req.user.id) {
        return res.status(404).json({ message: 'Notification not found' });
      }

      await prisma.notification.delete({
        where: { id: idInt },
      });

      res.json({ message: 'Notification successfully deleted' });
    } catch (error) {
      console.error('Error deleting the notification:', error);
      res.status(500).json({ message: 'Server error' });
    }
  }
);

// PATCH /notifications/toggle - enable/disable all notifications for the user
notificationRouter.patch('/notifications/toggle', authMiddleware, async (req, res) => {
  try {
    const userId = req.user.id;
    const { enabled } = req.body;

    if (typeof enabled !== 'boolean') {
      return res.status(400).json({ message: 'Missing or invalid "enabled" field (must be boolean)' });
    }

    await prisma.user.update({
      where: { id: userId },
      data: { pushNotifications: enabled },
    });

    if (enabled === false) {
      await prisma.notification.updateMany({
        where: {
          userId,
          read: false,
        },
        data: {
          read: true,
        },
      });
    }

    res.json({ message: `Global notifications successfully ${enabled ? 'enabled' : 'disabled'}.` });
  } catch (error) {
    console.error('Error toggling global notifications:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

export default notificationRouter;
