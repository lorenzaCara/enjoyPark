import { z } from 'zod';
import prisma from '../prisma/prismaClient.js';

const baseAttractionSchema = z.object({
  name: z.string({ required_error: 'Name is required' }).min(1, 'Name cannot be empty'),
  category: z.string({ required_error: 'Category is required' }).min(1, 'Category cannot be empty'),
  location: z.string({ required_error: 'Location is required' }).min(1, 'Location cannot be empty'),
  description: z.string().optional(),
  waitTime: z.number({ invalid_type_error: 'Wait time must be a number' }).nonnegative().optional(),
});

// Validator for creating an attraction
export const createAttractionValidator = z.object({
  body: baseAttractionSchema,
});

// Validator for updating an attraction
export const updateAttractionValidator = (partial = false) => z.object({
  body: partial ? baseAttractionSchema.partial() : baseAttractionSchema,
  params: z.object({
    id: z.string(),
  }),
}).superRefine(async ({ params }, ctx) => {
  const attraction = await prisma.attraction.findUnique({
    where: { id: +params.id },
  });

  if (!attraction) {
    ctx.addIssue({
      code: 'custom',
      message: 'Attraction not found',
      path: ['params', 'id'],
    });
  }
});

// Validator for deleting an attraction
export const deleteAttractionValidator = z.object({
  params: z.object({
    id: z.string(),
  }),
}).superRefine(async ({ params }, ctx) => {
  const attraction = await prisma.attraction.findUnique({
    where: { id: +params.id },
  });

  if (!attraction) {
    ctx.addIssue({
      code: 'custom',
      message: 'Attraction not found',
      path: ['params', 'id'],
    });
  }
});
