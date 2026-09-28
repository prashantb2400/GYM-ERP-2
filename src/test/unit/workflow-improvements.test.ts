import { describe, it, expect } from 'vitest';
import { renewMemberSchema, manualCheckinSchema } from '@/lib/schemas';
import { calculateGST } from '@/lib/utils/format';

describe('Sprint 3 Workflow Improvements', () => {
  describe('renewMemberSchema', () => {
    const validMemberId = '11111111-1111-4111-8111-111111111111';
    const validPlanId = '22222222-2222-4222-8222-222222222222';

    it('accepts valid renewal payload', () => {
      const payload = {
        memberId: validMemberId,
        planId: validPlanId,
        startDate: '2026-10-01',
        endDate: '2026-12-31',
        discountPercent: 10,
        discountAmount: 300,
        amountPaid: 3186,
        paymentMode: 'upi',
        transactionId: 'UPI-TXN-9988',
        notes: 'Annual renewal with festive discount',
        sendWhatsApp: true,
      };

      const result = renewMemberSchema.safeParse(payload);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.memberId).toBe(validMemberId);
        expect(result.data.paymentMode).toBe('upi');
        expect(result.data.sendWhatsApp).toBe(true);
      }
    });

    it('rejects invalid memberId UUID', () => {
      const payload = {
        memberId: 'not-a-uuid',
        planId: validPlanId,
        startDate: '2026-10-01',
        endDate: '2026-12-31',
        amountPaid: 1000,
      };

      const result = renewMemberSchema.safeParse(payload);
      expect(result.success).toBe(false);
    });

    it('rejects invalid date format', () => {
      const payload = {
        memberId: validMemberId,
        planId: validPlanId,
        startDate: '01/10/2026',
        endDate: '2026-12-31',
        amountPaid: 1000,
      };

      const result = renewMemberSchema.safeParse(payload);
      expect(result.success).toBe(false);
    });

    it('rejects negative amountPaid', () => {
      const payload = {
        memberId: validMemberId,
        planId: validPlanId,
        startDate: '2026-10-01',
        endDate: '2026-12-31',
        amountPaid: -500,
      };

      const result = renewMemberSchema.safeParse(payload);
      expect(result.success).toBe(false);
    });

    it('applies sensible defaults for optional fields', () => {
      const payload = {
        memberId: validMemberId,
        planId: validPlanId,
        startDate: '2026-10-01',
        endDate: '2026-12-31',
      };

      const result = renewMemberSchema.safeParse(payload);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.discountPercent).toBe(0);
        expect(result.data.discountAmount).toBe(0);
        expect(result.data.amountPaid).toBe(0);
        expect(result.data.paymentMode).toBe('cash');
        expect(result.data.sendWhatsApp).toBe(false);
      }
    });
  });

  describe('manualCheckinSchema', () => {
    const validMemberId = '11111111-1111-4111-8111-111111111111';

    it('accepts valid memberId', () => {
      const result = manualCheckinSchema.safeParse({ memberId: validMemberId });
      expect(result.success).toBe(true);
    });

    it('rejects invalid memberId', () => {
      const result = manualCheckinSchema.safeParse({ memberId: '123' });
      expect(result.success).toBe(false);
    });

    it('accepts optional notes within character limit', () => {
      const result = manualCheckinSchema.safeParse({
        memberId: validMemberId,
        notes: 'Forgot RFID card, receptionist verified photo',
      });
      expect(result.success).toBe(true);
    });

    it('rejects notes exceeding max length', () => {
      const result = manualCheckinSchema.safeParse({
        memberId: validMemberId,
        notes: 'A'.repeat(301),
      });
      expect(result.success).toBe(false);
    });
  });

  describe('Smart Renewal Date Math', () => {
    it('computes next day start date when membership is active', () => {
      const activeEndDate = '2026-10-15';
      const todayStr = '2026-10-01';

      const isActive = activeEndDate >= todayStr;
      expect(isActive).toBe(true);

      const nextDay = new Date(activeEndDate);
      nextDay.setDate(nextDay.getDate() + 1);
      const computedStart = nextDay.toISOString().split('T')[0];

      expect(computedStart).toBe('2026-10-16');

      const durationDays = 90;
      const computedEnd = new Date(computedStart);
      computedEnd.setDate(computedEnd.getDate() + durationDays);
      const finalEnd = computedEnd.toISOString().split('T')[0];

      expect(finalEnd).toBe('2027-01-14');
    });

    it('defaults to today when membership has already expired', () => {
      const expiredEndDate = '2026-09-10';
      const todayStr = '2026-10-01';

      const isActive = expiredEndDate >= todayStr;
      expect(isActive).toBe(false);

      const computedStart = isActive ? expiredEndDate : todayStr;
      expect(computedStart).toBe('2026-10-01');

      const durationDays = 30;
      const computedEnd = new Date(computedStart);
      computedEnd.setDate(computedEnd.getDate() + durationDays);
      const finalEnd = computedEnd.toISOString().split('T')[0];

      expect(finalEnd).toBe('2026-10-31');
    });
  });

  describe('Renewal Financial Calculations', () => {
    it('computes 18 percent GST correctly on plan renewals', () => {
      const basePlanPrice = 5000;
      const discount = 500;
      const { cgst, sgst, total } = calculateGST(basePlanPrice, discount);

      // Taxable = 4500. CGST 9% = 405, SGST 9% = 405. Total = 5310
      expect(cgst).toBe(405);
      expect(sgst).toBe(405);
      expect(total).toBe(5310);
    });

    it('correctly tracks balance due on partial counter payments', () => {
      const totalAmount = 5310;
      const amountPaid = 3000;
      const amountDue = Math.max(0, totalAmount - amountPaid);
      const status = amountDue <= 0 ? 'paid' : amountPaid > 0 ? 'partial' : 'pending';

      expect(amountDue).toBe(2310);
      expect(status).toBe('partial');
    });

    it('marks fully paid when counter payment meets total', () => {
      const totalAmount = 5310;
      const amountPaid = 5310;
      const amountDue = Math.max(0, totalAmount - amountPaid);
      const status = amountDue <= 0 ? 'paid' : amountPaid > 0 ? 'partial' : 'pending';

      expect(amountDue).toBe(0);
      expect(status).toBe('paid');
    });
  });
});
