import { describe, it, expect } from 'vitest';
import {
  formatCurrency,
  formatPhone,
  calculateGST,
  calculateBMI,
  getBMICategory,
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

    it('should clamp GST calculation to 0 when discount exceeds subtotal', () => {
      const { cgst, sgst, total } = calculateGST(500, 700);
      expect(cgst).toBe(0);
      expect(sgst).toBe(0);
      expect(total).toBe(0);
    });
  });

  describe('calculateBMI & Category', () => {
    it('should compute correct BMI value', () => {
      const bmi = calculateBMI(70, 175);
      expect(bmi).toBe(22.9);
    });

    it('should return 0 for zero or negative heights and weights', () => {
      expect(calculateBMI(70, 0)).toBe(0);
      expect(calculateBMI(0, 175)).toBe(0);
      expect(calculateBMI(-70, 175)).toBe(0);
      expect(getBMICategory(0)).toBe('Unknown');
    });

    it('should match category classification', () => {
      expect(getBMICategory(17)).toBe('Underweight');
      expect(getBMICategory(22.9)).toBe('Normal');
      expect(getBMICategory(26)).toBe('Overweight');
      expect(getBMICategory(32)).toBe('Obese');
    });
  });
});
