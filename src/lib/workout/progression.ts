/**
 * Progressive Overload & Deload Engine
 * Ported from openGym (https://github.com/DuarteSantos8/openGym).
 * Computes automated next-session weight and rep prescriptions based on
 * previous training performance using Linear, Double, and Greyskull LP policies.
 */

export type ProgressionPolicy = 'linear' | 'double' | 'greyskull' | 'maintenance';

export interface SetPerformance {
  weight: number;
  reps: number;
  targetReps: number;
  completed: boolean;
}

export interface ProgressionConfig {
  policy: ProgressionPolicy;
  weightIncrement?: number; // default +2.5 kg
  repRangeMin?: number;     // for double progression, e.g. 8
  repRangeMax?: number;     // for double progression, e.g. 12
  deloadFactor?: number;    // default 0.90 (10% deload)
  consecutiveFailures?: number; // failure count threshold, default 3
}

export interface NextPrescriptionResult {
  nextWeight: number;
  nextReps: number;
  status: 'advance' | 'hold' | 'deload';
  reason: string;
}

/**
 * Calculates next session weight and reps based on performance history.
 */
export function calculateNextPrescription(
  currentWeight: number,
  completedSets: SetPerformance[],
  config: ProgressionConfig
): NextPrescriptionResult {
  const policy = config.policy || 'linear';
  const increment = config.weightIncrement !== undefined ? config.weightIncrement : 2.5;
  const deloadFactor = config.deloadFactor || 0.9;
  const failures = config.consecutiveFailures || 0;

  if (policy === 'maintenance') {
    const avgReps = Math.round(completedSets.reduce((sum, s) => sum + s.reps, 0) / (completedSets.length || 1));
    return {
      nextWeight: currentWeight,
      nextReps: avgReps || 10,
      status: 'hold',
      reason: 'Maintenance policy active. Load and volume held constant.',
    };
  }

  // Check if all prescribed sets succeeded
  const allHit = completedSets.every(s => s.completed && s.reps >= s.targetReps);

  if (policy === 'linear') {
    if (allHit) {
      return {
        nextWeight: currentWeight + increment,
        nextReps: completedSets[0]?.targetReps || 5,
        status: 'advance',
        reason: `Target hit on all ${completedSets.length} sets. Advanced weight by +${increment} kg.`,
      };
    }

    if (failures >= 2) {
      // Third consecutive failure triggers deload
      const deloadWeight = Math.round(currentWeight * deloadFactor * 2) / 2; // round to nearest 0.5kg
      return {
        nextWeight: deloadWeight,
        nextReps: completedSets[0]?.targetReps || 5,
        status: 'deload',
        reason: `Repeated stalls detected (${failures + 1} sessions). Applied 10% deload to rebuild momentum.`,
      };
    }

    return {
      nextWeight: currentWeight,
      nextReps: completedSets[0]?.targetReps || 5,
      status: 'hold',
      reason: 'Missed target reps. Hold weight constant for next attempt.',
    };
  }

  if (policy === 'double') {
    const minReps = config.repRangeMin || 8;
    const maxReps = config.repRangeMax || 12;

    // Check if all sets reached the upper bound of the rep range
    const allAtMax = completedSets.every(s => s.completed && s.reps >= maxReps);

    if (allAtMax) {
      return {
        nextWeight: currentWeight + increment,
        nextReps: minReps,
        status: 'advance',
        reason: `Reached top of rep range (${maxReps} reps). Added +${increment} kg and reset reps to ${minReps}.`,
      };
    }

    const minCompleted = Math.min(...completedSets.map(s => s.reps));
    return {
      nextWeight: currentWeight,
      nextReps: Math.min(minCompleted + 1, maxReps),
      status: 'hold',
      reason: `Progressing through rep range (${minReps}-${maxReps} reps). Keep current weight and aim for more reps.`,
    };
  }

  if (policy === 'greyskull') {
    // Last set is AMRAP
    const lastSet = completedSets[completedSets.length - 1];
    const amrapTarget = lastSet?.targetReps || 5;
    const amrapReps = lastSet?.reps || 0;

    if (amrapReps >= amrapTarget * 2) {
      // Doubled reps -> double increment!
      return {
        nextWeight: currentWeight + increment * 2,
        nextReps: amrapTarget,
        status: 'advance',
        reason: `Crushed AMRAP with ${amrapReps} reps (double target). Doubled progression jump to +${increment * 2} kg!`,
      };
    }

    if (amrapReps >= amrapTarget) {
      return {
        nextWeight: currentWeight + increment,
        nextReps: amrapTarget,
        status: 'advance',
        reason: `Met AMRAP target with ${amrapReps} reps. Advanced weight by +${increment} kg.`,
      };
    }

    // Greyskull deloads immediately on 1 failure
    const deloadWeight = Math.round(currentWeight * deloadFactor * 2) / 2;
    return {
      nextWeight: deloadWeight,
      nextReps: amrapTarget,
      status: 'deload',
      reason: `Missed AMRAP target (${amrapReps}/${amrapTarget} reps). Reset load by 10% to reset adaptation.`,
    };
  }

  return {
    nextWeight: currentWeight,
    nextReps: 10,
    status: 'hold',
    reason: 'Standard hold.',
  };
}
