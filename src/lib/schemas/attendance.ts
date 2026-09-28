import { z } from 'zod';
import { uuidSchema } from './common';

export const qrCheckinSchema = z.object({
  qrToken: z.string().trim().min(1, { message: 'QR token is required' }),
  gymId: uuidSchema.optional(),
  branchId: uuidSchema.optional(),
});

export const faceCheckinSchema = z.object({
  memberId: uuidSchema,
  confidence: z.number().min(0).max(1).optional(),
  type: z.enum(['in', 'out', 'auto', 'manual']).optional().default('auto'),
  deviceId: z.string().trim().optional(),
  timestamp: z.string().optional(),
  gymId: uuidSchema.optional(),
  branchId: uuidSchema.optional(),
});

export const fingerprintCheckinSchema = z.object({
  memberId: uuidSchema,
  score: z.number().min(0).max(100).optional(),
  finger: z.string().trim().optional(),
  deviceId: z.string().trim().optional(),
  timestamp: z.string().optional(),
  gymId: uuidSchema.optional(),
  branchId: uuidSchema.optional(),
});

export const manualCheckinSchema = z.object({
  memberId: uuidSchema,
  notes: z.string().trim().max(300).optional(),
});

export type QrCheckinInput = z.infer<typeof qrCheckinSchema>;
export type FaceCheckinInput = z.infer<typeof faceCheckinSchema>;
export type FingerprintCheckinInput = z.infer<typeof fingerprintCheckinSchema>;
export type ManualCheckinInput = z.infer<typeof manualCheckinSchema>;
