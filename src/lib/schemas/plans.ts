import { z } from 'zod';
import { uuidSchema } from './common';

export const createPlanSchema = z.object({
  name: z.string().trim().min(1, { message: 'Plan name is required' }).max(100),
  duration_days: z
    .union([z.number(), z.string()])
    .transform((val) => parseInt(String(val), 10))
    .refine((val) => !isNaN(val) && val > 0, { message: 'Duration must be a positive integer' }),
  price: z
    .union([z.number(), z.string()])
    .transform((val) => parseFloat(String(val)))
    .refine((val) => !isNaN(val) && val >= 0, { message: 'Price must be a non-negative number' }),
  features: z.array(z.string().trim()).optional().default([]),
  highlights: z.array(z.string().trim()).optional().default([]),
  is_popular: z.boolean().optional().default(false),
  is_active: z.boolean().optional().default(true),
  display_order: z.number().int().optional(),
});

export const updatePlanSchema = z.object({
  id: uuidSchema,
  name: z.string().trim().min(1).max(100).optional(),
  duration_days: z
    .union([z.number(), z.string()])
    .transform((val) => parseInt(String(val), 10))
    .refine((val) => !isNaN(val) && val > 0, { message: 'Duration must be a positive integer' })
    .optional(),
  price: z
    .union([z.number(), z.string()])
    .transform((val) => parseFloat(String(val)))
    .refine((val) => !isNaN(val) && val >= 0, { message: 'Price must be a non-negative number' })
    .optional(),
  features: z.array(z.string().trim()).optional(),
  highlights: z.array(z.string().trim()).optional(),
  is_popular: z.boolean().optional(),
  is_active: z.boolean().optional(),
  display_order: z.number().int().optional(),
});

export type CreatePlanInput = z.infer<typeof createPlanSchema>;
export type UpdatePlanInput = z.infer<typeof updatePlanSchema>;
