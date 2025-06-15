import { z } from 'zod';
import prisma from '../prisma/prismaClient.js';

const baseShowSchema = z.object({
  title: z.string({ required_error: 'Title is required' }).min(1, 'Title cannot be empty'),
  description: z.string().optional(),
  date: z.string().refine(val => !isNaN(Date.parse(val)), {
    message: 'Invalid date',
  }),
  startTime: z.string().regex(/^([0-1]\d|2[0-3]):([0-5]\d)$/, {
    message: 'Invalid start time (format HH:mm)',
  }),
  endTime: z.string().regex(/^([0-1]\d|2[0-3]):([0-5]\d)$/, {
    message: 'Invalid end time (format HH:mm)',
  }),
  location: z.string({ required_error: 'Location is required' }).min(1, 'Location cannot be empty'),
});

// Validator for creating a show
export const createShowValidator = z.object({
  body: baseShowSchema,
});

// Validator for updating a show
export const updateShowValidator = (partial = false) => z.object({
  body: partial ? baseShowSchema.partial() : baseShowSchema,
  params: z.object({
    id: z.string(),
  }),
}).superRefine(async ({ params }, ctx) => {
  const show = await prisma.show.findUnique({
    where: { id: +params.id },
  });

  if (!show) {
    ctx.addIssue({
      code: 'custom',
      message: 'Show not found',
      path: ['params', 'id'],
    });
  }
});

// Validator for deleting a show
export const deleteShowValidator = z.object({
  params: z.object({
    id: z.string(),
  }),
}).superRefine(async ({ params }, ctx) => {
  const show = await prisma.show.findUnique({
    where: { id: +params.id },
  });

  if (!show) {
    ctx.addIssue({
      code: 'custom',
      message: 'Show not found',
      path: ['params', 'id'],
    });
  }
});
