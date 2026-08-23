import { describe, it, expect } from 'vitest';
import {
  formatCurrency,
  formatPhone,
  calculateGST,
  calculateBMI,
  getBMICategory,
  getTodayIST,
  formatMemberCode,
  formatInvoiceNumber,
} from '@/lib/utils/format';

describe('Indian Locale & Health Formatters', () => {
  describe('formatCurrency', () => {
    it('should format numbers into Indian Rupee representation format', () => {
      const formatted = formatCurrency(15000);
      // We expect the result to contain the rupee symbol and correct formatting
      expect(formatted).toContain('₹');
      // Using regex to verify structure as character spacing can vary slightly across node versions
      expect(formatted.replace(/\s/g, '')).toContain('15,000');
    });
  });

  describe('formatPhone', () => {
    it('should format standard 10 digit Indian number', () => {
      const phone = '9876543210';
      const formatted = formatPhone(phone);
      expect(formatted).toBe('+91 98765 43210');
    });

    it('should format country code prefixed number', () => {
      const phone = '919876543210';
      const formatted = formatPhone(phone);
      expect(formatted).toBe('+91 98765 43210');
    });
  });

  describe('calculateGST', () => {
    it('should compute exact CGST and SGST at 9% each', () => {
      const subtotal = 1000;
      const { cgst, sgst, total } = calculateGST(subtotal);
      expect(cgst).toBe(90);
      expect(sgst).toBe(90);
      expect(total).toBe(1180);
    });

    it('should compute GST after discount deduction', () => {
      const subtotal = 1000;
      const discount = 200;
      const { cgst, sgst, total } = calculateGST(subtotal, discount);
      expect(cgst).toBe(72);
      expect(sgst).toBe(72);
      expect(total).toBe(944);
    });
  });

  describe('getTodayIST', () => {
    it('should return a date string in YYYY-MM-DD format', () => {
      const today = getTodayIST();
      expect(today).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    });
  });

  describe('formatMemberCode & formatInvoiceNumber', () => {
    it('should pad member code with GYM prefix and leading zeroes', () => {
      expect(formatMemberCode(5)).toBe('GYM0005');
      expect(formatMemberCode(123)).toBe('GYM0123');
    });

    it('should format invoice number with current year', () => {
      const year = new Date().getFullYear();
      expect(formatInvoiceNumber(1)).toBe(`INV-${year}-0001`);
      expect(formatInvoiceNumber(42)).toBe(`INV-${year}-0042`);
    });
  });
});
