import { z } from 'zod';
import { uuidSchema, phoneSchema } from './common';

export const createLeadSchema = z.object({
  name: z.string().trim().min(1, { message: 'Lead name is required' }).max(100),
  phone: phoneSchema,
  email: z.string().trim().email({ message: 'Invalid email address' }).optional().nullable(),
  interest: z.string().trim().max(100).optional().default('membership'),
  source: z.string().trim().max(100).optional().default('walk_in'),
  follow_up_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, { message: 'Must be YYYY-MM-DD' }).optional().nullable(),
  notes: z.string().trim().max(1000).optional().nullable(),
  branchId: uuidSchema.optional().nullable(),
});

export const updateLeadSchema = z.object({
  id: uuidSchema,
  status: z.enum(['new', 'contacted', 'trial', 'converted', 'lost']).optional(),
  notes: z.string().trim().max(1000).optional().nullable(),
  follow_up_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, { message: 'Must be YYYY-MM-DD' }).optional().nullable(),
  converted_member_id: uuidSchema.optional().nullable(),
});

export const deleteLeadQuerySchema = z.object({
  id: uuidSchema,
});

export type CreateLeadInput = z.infer<typeof createLeadSchema>;
export type UpdateLeadInput = z.infer<typeof updateLeadSchema>;
