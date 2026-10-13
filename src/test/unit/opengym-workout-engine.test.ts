import { describe, it, expect } from 'vitest';
import { estimateOneRepMax } from '@/lib/workout/one-rep-max';
import { calculateBarbellPlates } from '@/lib/workout/plate-calculator';
import { calculateNextPrescription } from '@/lib/workout/progression';
import { STARTER_ROUTINES } from '@/lib/workout/exercise-types';

describe('openGym Inspired Exercise Science Engine', () => {
  describe('One-Rep Max (1RM) Estimator', () => {
    it('estimates 1RM using Epley formula', () => {
      // 100kg for 10 reps: 100 * (1 + 10/30) = 133.3 kg
      const result = estimateOneRepMax(100, 10, 'epley');
      expect(result.estimatedOneRm).toBe(133.3);
      expect(result.percentages.ninety).toBe(120);
      expect(result.percentages.eighty).toBe(106.6);
    });

    it('estimates 1RM using Brzycki formula', () => {
      // 100kg for 5 reps: 100 * 36 / (37 - 5) = 112.5 kg
      const result = estimateOneRepMax(100, 5, 'brzycki');
      expect(result.estimatedOneRm).toBe(112.5);
    });

    it('adjusts for Reps In Reserve (RIR) using RPE', () => {
      // 100kg for 5 reps at RPE 8 (2 RIR => 7 effective reps)
      const atRpe10 = estimateOneRepMax(100, 5, 'epley', 10);
      const atRpe8 = estimateOneRepMax(100, 5, 'epley', 8);

      expect(atRpe8.estimatedOneRm).toBeGreaterThan(atRpe10.estimatedOneRm);
    });

    it('throws on invalid non-positive inputs', () => {
      expect(() => estimateOneRepMax(0, 5)).toThrow();
      expect(() => estimateOneRepMax(100, 0)).toThrow();
    });
  });

  describe('Barbell Plate Calculator', () => {
    it('calculates 100kg on an Olympic 20kg bar', () => {
      // 100kg target - 20kg bar = 80kg needed -> 40kg per side (25kg + 15kg)
      const result = calculateBarbellPlates(100);
      expect(result.barWeight).toBe(20);
      expect(result.weightPerSide).toBe(40);
      expect(result.platesPerSide).toEqual([
        { plate: 25, count: 1 },
        { plate: 15, count: 1 },
      ]);
      expect(result.displayString).toContain('25 + 15 kg per side');
      expect(result.remainder).toBe(0);
    });

    it('handles empty bar when target equals bar weight', () => {
      const result = calculateBarbellPlates(20);
      expect(result.weightPerSide).toBe(0);
      expect(result.platesPerSide).toHaveLength(0);
      expect(result.displayString).toContain('Empty Bar');
    });

    it('supports Imperial pounds (lb)', () => {
      // 225 lb target - 45 lb bar = 180 lb -> 90 lb per side (2x 45 lb)
      const result = calculateBarbellPlates(225, { unit: 'lb' });
      expect(result.barWeight).toBe(45);
      expect(result.weightPerSide).toBe(90);
      expect(result.platesPerSide).toEqual([{ plate: 45, count: 2 }]);
      expect(result.displayString).toContain('2x45 lb per side');
    });
  });

  describe('Progressive Overload & Deload Policies', () => {
    it('advances linear progression when all sets succeed', () => {
      const sets = [
        { weight: 100, reps: 5, targetReps: 5, completed: true },
        { weight: 100, reps: 5, targetReps: 5, completed: true },
        { weight: 100, reps: 5, targetReps: 5, completed: true },
      ];
      const result = calculateNextPrescription(100, sets, { policy: 'linear', weightIncrement: 2.5 });
      expect(result.status).toBe('advance');
      expect(result.nextWeight).toBe(102.5);
    });

    it('triggers deload after 3 consecutive session stalls', () => {
      const sets = [
        { weight: 100, reps: 4, targetReps: 5, completed: false },
        { weight: 100, reps: 3, targetReps: 5, completed: false },
      ];
      const result = calculateNextPrescription(100, sets, {
        policy: 'linear',
        consecutiveFailures: 2, // 3rd failure now
      });
      expect(result.status).toBe('deload');
      expect(result.nextWeight).toBe(90); // 10% reduction
    });

    it('handles double progression through an 8-12 rep range', () => {
      // Not yet at top of range (hit 10 reps)
      const midSets = [
        { weight: 50, reps: 10, targetReps: 12, completed: true },
        { weight: 50, reps: 9, targetReps: 12, completed: true },
      ];
      const midResult = calculateNextPrescription(50, midSets, {
        policy: 'double',
        repRangeMin: 8,
        repRangeMax: 12,
      });
      expect(midResult.status).toBe('hold');
      expect(midResult.nextWeight).toBe(50);

      // Reached top of range (hit 12 reps on all sets)
      const maxSets = [
        { weight: 50, reps: 12, targetReps: 12, completed: true },
        { weight: 50, reps: 12, targetReps: 12, completed: true },
      ];
      const maxResult = calculateNextPrescription(50, maxSets, {
        policy: 'double',
        repRangeMin: 8,
        repRangeMax: 12,
        weightIncrement: 2.5,
      });
      expect(maxResult.status).toBe('advance');
      expect(maxResult.nextWeight).toBe(52.5);
      expect(maxResult.nextReps).toBe(8); // Reset to lower bound
    });

    it('handles Greyskull LP AMRAP performance bonus', () => {
      const sets = [
        { weight: 80, reps: 5, targetReps: 5, completed: true },
        { weight: 80, reps: 5, targetReps: 5, completed: true },
        { weight: 80, reps: 11, targetReps: 5, completed: true }, // Doubled target!
      ];
      const result = calculateNextPrescription(80, sets, {
        policy: 'greyskull',
        weightIncrement: 2.5,
      });
      expect(result.status).toBe('advance');
      expect(result.nextWeight).toBe(85); // 80 + 2*2.5
    });
  });

  describe('Starter Routines Library', () => {
    it('provides structured PPL and 5x5 routines', () => {
      expect(STARTER_ROUTINES.length).toBeGreaterThanOrEqual(2);

      const ppl = STARTER_ROUTINES.find(r => r.splitType === 'PPL');
      expect(ppl).toBeDefined();
      expect(ppl?.days).toHaveLength(3);
      expect(ppl?.days[0].exercises[0].exerciseName).toContain('Bench Press');

      const fiveByFive = STARTER_ROUTINES.find(r => r.splitType === '5x5');
      expect(fiveByFive).toBeDefined();
      expect(fiveByFive?.days).toHaveLength(2);
    });
  });
});
