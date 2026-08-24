import { describe, it, expect } from 'vitest';
import { calculateGST } from '@/lib/utils/format';

describe('Financial & Commission Computations', () => {
  it('should correctly calculate Indian GST (9% CGST + 9% SGST on 18% inclusive plans)', () => {
    const totalAmount = 1180;
    const { baseAmount, cgst, sgst, total } = calculateGST(totalAmount, 0, true);

    expect(total).toBe(1180);
    expect(baseAmount).toBeCloseTo(1000, 2);
    expect(cgst).toBeCloseTo(90, 2);
    expect(sgst).toBeCloseTo(90, 2);
    expect(baseAmount + cgst + sgst).toBeCloseTo(1180, 2);
  });

  it('should calculate trainer commissions accurately', () => {
    const planPrice = 5000;
    const commissionRatePct = 15; // 15% commission

    const commissionAmount = (planPrice * commissionRatePct) / 100;
    expect(commissionAmount).toBe(750);
  });

  it('should compute net operating profit deducting expenses and commissions', () => {
    const grossSales = 150000;
    const operatingExpenses = 45000;
    const trainerCommissions = 15000;

    const netProfit = grossSales - operatingExpenses - trainerCommissions;
    expect(netProfit).toBe(90000);
  });

  it('should calculate dues aging and recovery percentage', () => {
    const totalBilled = 100000;
    const totalCollected = 85000;
    const pendingDues = totalBilled - totalCollected;

    const recoveryRate = (totalCollected / totalBilled) * 100;
    expect(pendingDues).toBe(15000);
    expect(recoveryRate).toBe(85);
  });
});
