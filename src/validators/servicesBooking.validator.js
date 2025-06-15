import { z } from 'zod';
import prisma from '../prisma/prismaClient.js';

const baseServiceBookingSchema = z.object({
  serviceId: z.number({ required_error: 'Service ID is required', invalid_type_error: 'Service ID must be a number' }),
  bookingTime: z.string({ required_error: 'Booking time is required' }),
  numberOfPeople: z.number().int().positive().optional(),
  specialRequests: z.string().max(500).optional().nullable(),
});

// Validator for creating a service booking
export const createServiceBookingValidator = z.object({
  body: baseServiceBookingSchema,
}).superRefine(async ({ body }, ctx) => {
  // Check if service exists
  const service = await prisma.service.findUnique({
    where: { id: body.serviceId },
  });

  if (!service) {
    ctx.addIssue({
      code: 'custom',
      message: 'Service not found',
      path: ['body', 'serviceId'],
    });
  }

  // Check if bookingTime is valid ISO date
  const bookingDate = new Date(body.bookingTime);
  if (isNaN(bookingDate.getTime())) {
    ctx.addIssue({
      code: 'custom',
      message: 'Invalid booking time format',
      path: ['body', 'bookingTime'],
    });
  }
});

// Validator for updating a service booking
export const updateServiceBookingValidator = z.object({
  body: baseServiceBookingSchema.partial(),  // all optional for update
  params: z.object({
    id: z.string(),
  }),
}).superRefine(async ({ body, params }, ctx) => {
  // Check if booking exists
  const booking = await prisma.serviceBooking.findUnique({
    where: { id: +params.id },
  });
  if (!booking) {
    ctx.addIssue({
      code: 'custom',
      message: 'Service booking not found',
      path: ['params', 'id'],
    });
  }

  // If serviceId is passed, check if service exists
  if (body.serviceId !== undefined) {
    const service = await prisma.service.findUnique({
      where: { id: body.serviceId },
    });
    if (!service) {
      ctx.addIssue({
        code: 'custom',
        message: 'Service not found',
        path: ['body', 'serviceId'],
      });
    }
  }

  // If bookingTime is passed, check if valid ISO date
  if (body.bookingTime !== undefined) {
    const bookingDate = new Date(body.bookingTime);
    if (isNaN(bookingDate.getTime())) {
      ctx.addIssue({
        code: 'custom',
        message: 'Invalid booking time format',
        path: ['body', 'bookingTime'],
      });
    }
  }
});

// Validator for deleting a service booking
export const deleteServiceBookingValidator = z.object({
  params: z.object({
    id: z.string(),
  }),
}).superRefine(async ({ params }, ctx) => {
  const booking = await prisma.serviceBooking.findUnique({
    where: { id: +params.id },
  });

  if (!booking) {
    ctx.addIssue({
      code: 'custom',
      message: 'Service booking not found',
      path: ['params', 'id'],
    });
  }
});
