import { z } from 'zod';
import { uuidSchema } from './common';

export const renewMemberSchema = z.object({
  memberId: uuidSchema,
  planId: uuidSchema,
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Start date must be in YYYY-MM-DD format'),
  endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'End date must be in YYYY-MM-DD format'),
  discountPercent: z.number().min(0).max(100).default(0),
  discountAmount: z.number().min(0).default(0),
  amountPaid: z.number().min(0).default(0),
  paymentMode: z.enum(['cash', 'upi', 'card', 'bank_transfer', 'cheque', 'other']).default('cash'),
  transactionId: z.string().trim().max(100).optional().nullable(),
  notes: z.string().trim().max(500).optional().nullable(),
  sendWhatsApp: z.boolean().default(false),
});

export type RenewMemberInput = z.infer<typeof renewMemberSchema>;
