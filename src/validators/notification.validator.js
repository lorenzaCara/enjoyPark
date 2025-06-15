// src/validators/notificationValidators.js
import { z } from 'zod';
import prisma from '../prisma/prismaClient.js';

const baseNotificationSchema = z.object({
  title: z.string({ required_error: 'Title is required' }).min(1, 'Title cannot be empty'),
  message: z.string({ required_error: 'Message is required' }).min(1, 'Message cannot be empty'),
  read: z.boolean().optional(),
  sent: z.boolean().optional(),
  sendAt: z.coerce.date({ invalid_type_error: 'Invalid date format for sendAt' }), // required
  userId: z.number({ required_error: 'User ID is required' }),

  serviceBookingId: z.number().int().positive().optional(),
  showId: z.number().int().positive().optional(),
});

// CREATE
export const createNotificationValidator = z.object({
  body: baseNotificationSchema,
});

// UPDATE (partial support optional with default false)
export const updateNotificationValidator = (partial = false) => z.object({
  body: partial ? baseNotificationSchema.partial() : baseNotificationSchema,
  params: z.object({
    id: z.string(),
  }),
}).superRefine(async ({ params }, ctx) => {
  const notification = await prisma.notification.findUnique({
    where: { id: +params.id },
  });

  if (!notification) {
    ctx.addIssue({
      code: 'custom',
      path: ['params', 'id'],
      message: 'Notification not found',
    });
  }
});

// DELETE
export const deleteNotificationValidator = z.object({
  params: z.object({
    id: z.string(),
  }),
}).superRefine(async ({ params }, ctx) => {
  const notification = await prisma.notification.findUnique({
    where: { id: +params.id },
  });

  if (!notification) {
    ctx.addIssue({
      code: 'custom',
      path: ['params', 'id'],
      message: 'Notification not found',
    });
  }
});

// TOGGLE (for /notifications/toggle)
export const toggleNotificationSettingValidator = z.object({
  body: z.object({
    enabled: z.boolean(),
  }),
});
