import { z } from 'zod';
import { uuidSchema, phoneSchema } from './common';

export const createBranchSchema = z.object({
  name: z.string().trim().min(1, { message: 'Branch name is required' }).max(100),
  phone: phoneSchema.optional().nullable(),
  address: z.record(z.string(), z.unknown()).optional().default({}),
});

export const updateBranchSchema = z.object({
  id: uuidSchema,
  name: z.string().trim().min(1).max(100).optional(),
  phone: phoneSchema.optional().nullable(),
  address: z.record(z.string(), z.unknown()).optional(),
  is_active: z.boolean().optional(),
});

export type CreateBranchInput = z.infer<typeof createBranchSchema>;
export type UpdateBranchInput = z.infer<typeof updateBranchSchema>;
