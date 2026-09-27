import { z } from 'zod';
import { uuidSchema, phoneSchema } from './common';

export const createStaffSchema = z.object({
  name: z.string().trim().min(1, { message: 'Full name is required' }).max(100),
  loginId: z
    .string()
    .trim()
    .min(3, { message: 'Login ID must be at least 3 characters' })
    .max(50)
    .regex(/^[a-zA-Z0-9._-]+$/, { message: 'Login ID can only contain letters, numbers, dots, hyphens, and underscores' }),
  password: z.string().trim().min(6, { message: 'Password must be at least 6 characters' }),
  role: z.enum(['receptionist', 'trainer'], { message: 'Role must be receptionist or trainer' }),
  email: z.string().trim().email({ message: 'Invalid email address' }).optional().nullable(),
  phone: phoneSchema.optional().nullable(),
  permissions: z.array(z.string().trim()).optional().default([]),
  branchId: uuidSchema.optional().nullable(),
});

export const updateStaffSchema = z.object({
  id: uuidSchema,
  name: z.string().trim().min(1).max(100).optional(),
  phone: phoneSchema.optional().nullable(),
  role: z.enum(['receptionist', 'trainer']).optional(),
  permissions: z.array(z.string().trim()).optional(),
  branchId: uuidSchema.optional().nullable(),
  is_active: z.boolean().optional(),
});

export type CreateStaffInput = z.infer<typeof createStaffSchema>;
export type UpdateStaffInput = z.infer<typeof updateStaffSchema>;
