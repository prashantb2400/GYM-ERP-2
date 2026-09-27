import { z } from 'zod';
import { uuidSchema } from './common';

export const kioskMemberLookupSchema = z.object({
  gymId: uuidSchema,
  query: z.string().trim().min(1, { message: 'Search query is required' }).max(100),
});

export const kioskCheckInSchema = z.object({
  gymId: uuidSchema,
  query: z.string().trim().min(1, { message: 'Identifier query is required' }).max(100),
  branchId: uuidSchema.optional().nullable(),
  method: z.enum(['keypad', 'qr', 'face', 'fingerprint', 'qr_scan', 'face_recognition', 'manual']).optional().default('keypad'),
});

export const kioskOcrSchema = z.object({
  gymId: uuidSchema,
  imageBase64: z.string().min(1, { message: 'Missing image data' }),
  docType: z.enum(['aadhaar', 'pan', 'dl', 'voter_id', 'passport']).optional(),
});

export const kioskLeadSchema = z.object({
  gymId: uuidSchema,
  name: z.string().trim().min(1, { message: 'Name is required' }).max(100),
  phone: z.string().trim().min(7, { message: 'Valid phone required' }).max(15),
  interest: z.string().trim().max(100).optional(),
});

export type KioskMemberLookupInput = z.infer<typeof kioskMemberLookupSchema>;
export type KioskCheckInInput = z.infer<typeof kioskCheckInSchema>;
export type KioskOcrInput = z.infer<typeof kioskOcrSchema>;
export type KioskLeadInput = z.infer<typeof kioskLeadSchema>;
