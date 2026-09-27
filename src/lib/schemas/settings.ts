import { z } from 'zod';
import { phoneSchema } from './common';

export const updateSettingsSchema = z.object({
  name: z.string().trim().min(1).max(100).optional(),
  business_name: z.string().trim().max(100).optional().nullable(),
  phone: phoneSchema.optional().nullable(),
  email: z.string().trim().email().optional().nullable(),
  gstin: z.string().trim().max(20).optional().nullable(),
  pan: z.string().trim().max(15).optional().nullable(),
  tagline: z.string().trim().max(200).optional().nullable(),
  address: z.record(z.string(), z.unknown()).optional(),
  working_hours: z.record(z.string(), z.unknown()).optional(),
  settings: z.record(z.string(), z.unknown()).optional(),
  razorpay_key_secret: z.string().trim().optional(),
  whatsapp_access_token: z.string().trim().optional(),
  cctv_password: z.string().optional(),
});

export type UpdateSettingsInput = z.infer<typeof updateSettingsSchema>;
