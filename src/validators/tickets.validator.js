import { z } from 'zod';
import prisma from '../prisma/prismaClient.js';

// Base schema for creation and update
const baseTicketSchema = z.object({
  ticketTypeId: z.number({ required_error: 'Ticket type ID is required' })
    .int() // Ensure it's an integer
    .positive(), // Ensure it's a positive number
  validFor: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, { message: 'Validity date must be in YYYY-MM-DD format' }), // Enforce YYYY-MM-DD format
  discountId: z.number().int().nullable().optional(), // Ensure integer for discountId
  status: z.enum(['ACTIVE', 'USED', 'EXPIRED']).optional(),
  paymentMethod: z.enum(['CREDIT_CARD', 'PAYPAL', 'BANK_TRANSFER']).optional(),
});

// Validator for ticket creation
export const createTicketValidator = z.object({
  body: baseTicketSchema // Now baseTicketSchema does not require userId
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


export const updateTicketValidator = (partial = false) => z.object({
  body: partial ? baseTicketSchema.partial() : baseTicketSchema,
  params: z.object({
    id: z.string().refine(val => !isNaN(parseInt(val)), { message: "Invalid ID format" }), // Ensure ID is a number string
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

  // Check if ticket type exists ONLY if ticketTypeId is provided in the body
  if (body.ticketTypeId !== undefined && body.ticketTypeId !== null) {
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
  }
});

// Validator for ticket deletion
export const deleteTicketValidator = z.object({
  params: z.object({
    id: z.string().refine(val => !isNaN(parseInt(val)), { message: "Invalid ID format" }), // Ensure ID is a number string
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