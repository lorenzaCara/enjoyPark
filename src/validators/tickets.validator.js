import { z } from 'zod';
import prisma from '../prisma/prismaClient.js';

// Base schema for creation and update (without 'status')
const baseTicketSchema = z.object({
  userId: z.number({ required_error: 'User ID is required' }),
  ticketTypeId: z.number({ required_error: 'Ticket type ID is required' }),
  validFor: z.string().refine(
    (val) => !isNaN(Date.parse(val)),
    { message: 'Invalid date' }
  ),
  discountId: z.number().nullable().optional(),
  status: z.enum(['ACTIVE', 'USED', 'EXPIRED']).optional(),
  paymentMethod: z.enum(['CREDIT_CARD', 'PAYPAL', 'BANK_TRANSFER']).optional(),
});

// Validator for ticket creation
export const createTicketValidator = z.object({
  body: baseTicketSchema
}).superRefine(async (data, ctx) => {
  // Check if ticket type exists
  const ticketType = await prisma.ticketType.findUnique({
    where: { id: data.body.ticketTypeId },
  });

  if (!ticketType) {
    ctx.addIssue({
      code: 'custom',
      message: 'Ticket type not found',
      path: ['body', 'ticketTypeId'],
    });
  }
});

// Validator for ticket update
export const updateTicketValidator = (partial = false) => z.object({
  body: partial ? baseTicketSchema.partial() : baseTicketSchema,
  params: z.object({
    id: z.string(),
  }),
}).superRefine(async ({ params, body }, ctx) => {
  // Check if ticket exists
  const ticket = await prisma.ticket.findUnique({
    where: { id: +params.id },
  });

  if (!ticket) {
    ctx.addIssue({
      code: 'custom',
      message: 'Ticket not found',
      path: ['params', 'id'],
    });
  }

  // Check if ticket type exists
  const ticketType = await prisma.ticketType.findUnique({
    where: { id: body.ticketTypeId },
  });

  if (!ticketType) {
    ctx.addIssue({
      code: 'custom',
      message: 'Ticket type not found',
      path: ['body', 'ticketTypeId'],
    });
  }
});

// Validator for ticket deletion
export const deleteTicketValidator = z.object({
  params: z.object({
    id: z.string(),
  }),
}).superRefine(async ({ params }, ctx) => {
  // Check if ticket exists
  const ticket = await prisma.ticket.findUnique({
    where: { id: +params.id },
  });

  if (!ticket) {
    ctx.addIssue({
      code: 'custom',
      message: 'Ticket not found',
      path: ['params', 'id'],
    });
  }
});
