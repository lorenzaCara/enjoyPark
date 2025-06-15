// validators/services.validator.js
import { z } from 'zod';
import prisma from '../prisma/prismaClient.js';

// Base schema for service
const baseServiceSchema = z.object({
  name: z.string({ required_error: 'Name is required' }).min(1, 'Name cannot be empty'),
  location: z.string({ required_error: 'Location is required' }).min(1, 'Location cannot be empty'),
  type: z.string({ required_error: 'Type is required' }).min(1, 'Type cannot be empty'),
});

// Validator for creating a service
export const createServiceValidator = z.object({
  body: baseServiceSchema,
});

// Validator for updating a service
export const updateServiceValidator = (partial = false) =>
  z.object({
    body: partial ? baseServiceSchema.partial() : baseServiceSchema,
    params: z.object({
      id: z.string(),
    }),
  }).superRefine(async ({ params }, ctx) => {
    const service = await prisma.service.findUnique({
      where: { id: +params.id },
    });

    if (!service) {
      ctx.addIssue({
        code: 'custom',
        message: 'Service not found',
        path: ['params', 'id'],
      });
    }
  });

// Validator for deleting a service
export const deleteServiceValidator = z.object({
  params: z.object({
    id: z.string(),
  }),
}).superRefine(async ({ params }, ctx) => {
  const service = await prisma.service.findUnique({
    where: { id: +params.id },
  });

  if (!service) {
    ctx.addIssue({
      code: 'custom',
      message: 'Service not found',
      path: ['params', 'id'],
    });
  }
});
