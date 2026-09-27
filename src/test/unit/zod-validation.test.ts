import { describe, it, expect } from 'vitest';
import { validateBody, validateQuery } from '@/lib/server/validate';
import {
  createBranchSchema,
  updateBranchSchema,
  createPlanSchema,
  updatePlanSchema,
  createLeadSchema,
  updateLeadSchema,
  createStaffSchema,
  qrCheckinSchema,
  faceCheckinSchema,
  kioskMemberLookupSchema,
  kioskCheckInSchema,
} from '@/lib/schemas';

describe('Zod Validation Layer', () => {
  describe('validateBody', () => {
    it('rejects empty body', async () => {
      const req = new Request('http://localhost/api/test', {
        method: 'POST',
        body: '',
      });
      const result = await validateBody(req, createBranchSchema);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toContain('empty');
      }
    });

    it('rejects malformed JSON', async () => {
      const req = new Request('http://localhost/api/test', {
        method: 'POST',
        body: '{ bad-json,',
      });
      const result = await validateBody(req, createBranchSchema);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toContain('Malformed');
      }
    });

    it('rejects schema violation with structured error', async () => {
      const req = new Request('http://localhost/api/test', {
        method: 'POST',
        body: JSON.stringify({ name: '' }),
      });
      const result = await validateBody(req, createBranchSchema);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toContain('Branch name is required');
      }
    });

    it('accepts valid payload and returns typed data', async () => {
      const req = new Request('http://localhost/api/test', {
        method: 'POST',
        body: JSON.stringify({ name: 'Downtown Branch', phone: '9876543210' }),
      });
      const result = await validateBody(req, createBranchSchema);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.name).toBe('Downtown Branch');
        expect(result.data.phone).toBe('9876543210');
      }
    });
  });

  describe('validateQuery', () => {
    it('validates query params correctly', () => {
      const searchParams = new URLSearchParams('page=2&pageSize=10');
      const schema = createBranchSchema.pick({ name: true }).extend({
        page: createPlanSchema.shape.duration_days,
      });
      const result = validateQuery(searchParams, schema);
      expect(result.success).toBe(false); // missing name
    });
  });

  describe('Schemas', () => {
    it('validates createPlanSchema and normalizes numbers', () => {
      const parsed = createPlanSchema.safeParse({
        name: 'Annual Gold',
        duration_days: '365',
        price: '15000',
      });
      expect(parsed.success).toBe(true);
      if (parsed.success) {
        expect(parsed.data.duration_days).toBe(365);
        expect(parsed.data.price).toBe(15000);
      }
    });

    it('rejects invalid plan duration or negative price', () => {
      const parsed = createPlanSchema.safeParse({
        name: 'Bad Plan',
        duration_days: -10,
        price: -50,
      });
      expect(parsed.success).toBe(false);
    });

    it('validates createStaffSchema requires minimum 6 char password and valid role', () => {
      const badRole = createStaffSchema.safeParse({
        name: 'Test Trainer',
        loginId: 'trainer01',
        password: '123',
        role: 'superman',
      });
      expect(badRole.success).toBe(false);

      const goodStaff = createStaffSchema.safeParse({
        name: 'Test Trainer',
        loginId: 'trainer01',
        password: 'securePassword123',
        role: 'trainer',
      });
      expect(goodStaff.success).toBe(true);
    });

    it('validates QR and Face checkin schemas', () => {
      const validQr = qrCheckinSchema.safeParse({ qrToken: 'qr_abc123' });
      expect(validQr.success).toBe(true);

      const invalidFace = faceCheckinSchema.safeParse({ memberId: 'not-a-uuid' });
      expect(invalidFace.success).toBe(false);

      const validFace = faceCheckinSchema.safeParse({
        memberId: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
        confidence: 0.95,
      });
      expect(validFace.success).toBe(true);
    });

    it('validates kiosk schemas', () => {
      const validLookup = kioskMemberLookupSchema.safeParse({
        gymId: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
        query: '9876543210',
      });
      expect(validLookup.success).toBe(true);
    });
  });
});
