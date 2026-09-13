import { describe, it, expect } from 'vitest';

describe('Member Wizard & Kiosk Architecture', () => {
  describe('Kiosk Route Layout Isolation', () => {
    const isKioskRoute = (pathname: string | null | undefined): boolean => {
      return !!(pathname?.includes('/attendance/') && pathname?.includes('kiosk'));
    };

    it('identifies face-kiosk as an isolated kiosk route', () => {
      expect(isKioskRoute('/dashboard/attendance/face-kiosk')).toBe(true);
    });

    it('identifies fingerprint kiosk as an isolated kiosk route', () => {
      expect(isKioskRoute('/dashboard/attendance/kiosk')).toBe(true);
    });

    it('identifies qr-kiosk as an isolated kiosk route', () => {
      expect(isKioskRoute('/dashboard/attendance/qr-kiosk')).toBe(true);
    });

    it('does NOT treat regular attendance list as a kiosk route', () => {
      expect(isKioskRoute('/dashboard/attendance')).toBe(false);
      expect(isKioskRoute('/dashboard/attendance/logs')).toBe(false);
    });

    it('does NOT treat other dashboard routes as kiosk routes', () => {
      expect(isKioskRoute('/dashboard')).toBe(false);
      expect(isKioskRoute('/dashboard/members/add')).toBe(false);
      expect(isKioskRoute('/dashboard/members')).toBe(false);
    });
  });

  describe('Live BMI Calculation & Categorization', () => {
    const calculateBmi = (heightCm: string | number, weightKg: string | number) => {
      const hNum = Number(heightCm);
      const wNum = Number(weightKg);
      if (!hNum || !wNum || hNum <= 0 || wNum <= 0) return null;
      const heightM = hNum / 100;
      return Math.round((wNum / (heightM * heightM)) * 10) / 10;
    };

    const getBmiCategory = (bmi: number) => {
      if (bmi < 18.5) return 'Underweight';
      if (bmi < 25.0) return 'Normal / Healthy';
      if (bmi < 30.0) return 'Overweight';
      return 'Obese';
    };

    it('calculates accurate BMI for normal height and weight', () => {
      // 175 cm, 70 kg -> 70 / (1.75 * 1.75) = 22.86 -> 22.9
      const bmi = calculateBmi(175, 70);
      expect(bmi).toBe(22.9);
      expect(getBmiCategory(bmi!)).toBe('Normal / Healthy');
    });

    it('identifies Underweight category when BMI is below 18.5', () => {
      // 180 cm, 55 kg -> 55 / 3.24 = 16.98 -> 17.0
      const bmi = calculateBmi(180, 55);
      expect(bmi).toBe(17.0);
      expect(getBmiCategory(bmi!)).toBe('Underweight');
    });

    it('identifies Overweight category when BMI is between 25.0 and 29.9', () => {
      // 170 cm, 80 kg -> 80 / 2.89 = 27.68 -> 27.7
      const bmi = calculateBmi(170, 80);
      expect(bmi).toBe(27.7);
      expect(getBmiCategory(bmi!)).toBe('Overweight');
    });

    it('identifies Obese category when BMI is 30 or higher', () => {
      // 165 cm, 90 kg -> 90 / 2.7225 = 33.06 -> 33.1
      const bmi = calculateBmi(165, 90);
      expect(bmi).toBe(33.1);
      expect(getBmiCategory(bmi!)).toBe('Obese');
    });

    it('returns null when height or weight is zero, negative, or invalid string', () => {
      expect(calculateBmi(0, 70)).toBeNull();
      expect(calculateBmi(170, 0)).toBeNull();
      expect(calculateBmi('', '70')).toBeNull();
      expect(calculateBmi('abc', '70')).toBeNull();
    });
  });

  describe('1-Click Payment Presets', () => {
    const getPaymentPresets = (totalAmount: number) => ({
      full: String(totalAmount),
      half: String(Math.round(totalAmount / 2)),
      zero: '0',
    });

    it('generates correct presets for even amounts', () => {
      const presets = getPaymentPresets(10000);
      expect(presets.full).toBe('10000');
      expect(presets.half).toBe('5000');
      expect(presets.zero).toBe('0');
    });

    it('generates rounded presets for odd amounts', () => {
      const presets = getPaymentPresets(5999);
      expect(presets.full).toBe('5999');
      expect(presets.half).toBe('3000');
      expect(presets.zero).toBe('0');
    });
  });

  describe('Fast Walk-in Validation Flow', () => {
    const validateForFastReview = (name: string, phone: string, planId: string) => {
      if (!name.trim() || !phone.trim() || phone.trim().length !== 10) {
        return { valid: false, errorStep: 1, message: 'Please complete name and valid 10-digit phone first' };
      }
      if (!planId) {
        return { valid: false, errorStep: 2, message: 'Please select a membership plan' };
      }
      return { valid: true, errorStep: null, message: null };
    };

    it('blocks fast review if personal info is incomplete', () => {
      expect(validateForFastReview('', '9876543210', 'plan-1').valid).toBe(false);
      expect(validateForFastReview('Raj', '123', 'plan-1').valid).toBe(false);
    });

    it('blocks fast review if plan is not selected', () => {
      expect(validateForFastReview('Raj Kumar', '9876543210', '').valid).toBe(false);
    });

    it('allows jump to review when name, valid 10-digit phone, and plan are present', () => {
      const res = validateForFastReview('Raj Kumar', '9876543210', 'plan-1');
      expect(res.valid).toBe(true);
    });
  });
});
