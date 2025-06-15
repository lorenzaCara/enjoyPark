import { z } from 'zod';
import prisma from '../prisma/prismaClient.js';

const basePlannerSchema = z.object({
  title: z.string({ required_error: 'Title is required' }).min(1, 'Title cannot be empty'),
  description: z.string().optional(),
  ticketId: z.number({ invalid_type_error: 'Ticket ID must be a number' }),
  date: z.string({ required_error: 'Date is required' }).refine(val => !isNaN(Date.parse(val)), {
    message: 'Date must be a valid ISO date string',
  }),
  attractionIds: z.array(z.number()).optional(),
  showIds: z.array(z.number()).optional(),
  serviceIds: z.array(z.number()).optional(),
});

// Validator for creating a planner
export const createPlannerValidator = z.object({
  body: basePlannerSchema,
}).superRefine(async ({ body }, ctx) => {
  const ticket = await prisma.ticket.findUnique({
    where: { id: body.ticketId },
  });

  if (!ticket) {
    ctx.addIssue({
      code: 'custom',
      message: 'Ticket not found',
      path: ['body', 'ticketId'],
    });
  }
});

// Validator for updating a planner
export const updatePlannerValidator = (partial = false) => z.object({
  body: partial ? basePlannerSchema.partial() : basePlannerSchema,
  params: z.object({
    id: z.string(),
  }),
}).superRefine(async ({ params }, ctx) => {
  const planner = await prisma.planner.findUnique({
    where: { id: +params.id },
  });

  if (!planner) {
    ctx.addIssue({
      code: 'custom',
      message: 'Planner not found',
      path: ['params', 'id'],
    });
  }
});

// Validator for deleting a planner
export const deletePlannerValidator = z.object({
  params: z.object({
    id: z.string(),
  }),
}).superRefine(async ({ params }, ctx) => {
  const planner = await prisma.planner.findUnique({
    where: { id: +params.id },
  });

  if (!planner) {
    ctx.addIssue({
      code: 'custom',
      message: 'Planner not found',
      path: ['params', 'id'],
    });
  }
});
