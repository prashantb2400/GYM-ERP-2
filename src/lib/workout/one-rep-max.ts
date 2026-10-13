/**
 * One-Rep Maximum (1RM) Estimation Engine
 * Ported from openGym (https://github.com/DuarteSantos8/openGym).
 * Uses validated exercise science formulas (Epley, Brzycki, Lander, Lombardi)
 * with RPE (Rate of Perceived Exertion) and RIR (Reps in Reserve) adjustments.
 */

export type OneRmFormula = 'epley' | 'brzycki' | 'lander' | 'lombardi';

export const REP_CEILING = 12; // Above 12 reps, estimation accuracy degrades significantly

export interface OneRmEstimateResult {
  estimatedOneRm: number;
  formula: OneRmFormula;
  weight: number;
  reps: number;
  rpe?: number;
  percentages: {
    ninetyFive: number; // ~2 reps
    ninety: number;     // ~3-4 reps
    eightyFive: number; // ~5-6 reps
    eighty: number;     // ~7-8 reps
    seventyFive: number;// ~9-10 reps
    seventy: number;    // ~11-12 reps
  };
}

/**
 * Calculates estimated 1RM from a completed set of weight and reps.
 */
export function estimateOneRepMax(
  weight: number,
  reps: number,
  formula: OneRmFormula = 'epley',
  rpe?: number
): OneRmEstimateResult {
  if (weight <= 0 || reps <= 0) {
    throw new Error('Weight and reps must be positive numbers');
  }

  // Adjust reps if RPE is provided (RIR = 10 - RPE)
  let effectiveReps = reps;
  if (rpe !== undefined && rpe >= 6 && rpe <= 10) {
    const repsInReserve = 10 - rpe;
    effectiveReps = reps + repsInReserve;
  }

  // Cap effective reps for realistic estimation
  const cappedReps = Math.min(effectiveReps, REP_CEILING);

  let rawOneRm: number;

  switch (formula) {
    case 'brzycki':
      // Brzycki formula: W * 36 / (37 - R)
      rawOneRm = cappedReps < 37 ? (weight * 36) / (37 - cappedReps) : weight;
      break;

    case 'lander':
      // Lander formula: (100 * W) / (101.3 - 2.67123 * R)
      rawOneRm = (100 * weight) / (101.3 - 2.67123 * cappedReps);
      break;

    case 'lombardi':
      // Lombardi formula: W * R^0.10
      rawOneRm = weight * Math.pow(cappedReps, 0.1);
      break;

    case 'epley':
    default:
      // Epley formula: W * (1 + R / 30)
      rawOneRm = weight * (1 + cappedReps / 30);
      break;
  }

  const roundedMax = Math.round(rawOneRm * 10) / 10;

  return {
    estimatedOneRm: roundedMax,
    formula,
    weight,
    reps,
    rpe,
    percentages: {
      ninetyFive: Math.round(roundedMax * 0.95 * 10) / 10,
      ninety: Math.round(roundedMax * 0.90 * 10) / 10,
      eightyFive: Math.round(roundedMax * 0.85 * 10) / 10,
      eighty: Math.round(roundedMax * 0.80 * 10) / 10,
      seventyFive: Math.round(roundedMax * 0.75 * 10) / 10,
      seventy: Math.round(roundedMax * 0.70 * 10) / 10,
    },
  };
}
