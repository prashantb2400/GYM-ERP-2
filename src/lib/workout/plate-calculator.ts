/**
 * Barbell Plate Loading Calculator
 * Ported from openGym (https://github.com/DuarteSantos8/openGym).
 * Calculates exact plate configurations needed on each side of a barbell,
 * EZ bar, or Smith machine to achieve a desired target training weight.
 */

export type WeightUnit = 'kg' | 'lb';

export interface PlateInventory {
  [plateWeight: number]: number; // weight -> pairs available
}

export const STANDARD_METRIC_PLATES = [25, 20, 15, 10, 5, 2.5, 1.25];
export const STANDARD_IMPERIAL_PLATES = [45, 35, 25, 10, 5, 2.5];

export const STANDARD_BAR_WEIGHTS = {
  olympic_men: { kg: 20, lb: 45 },
  olympic_women: { kg: 15, lb: 35 },
  ez_curl: { kg: 10, lb: 25 },
  smith_machine: { kg: 7, lb: 15 },
};

export interface PlateCount {
  plate: number;
  count: number;
}

export interface PlateCalculationResult {
  targetWeight: number;
  barWeight: number;
  unit: WeightUnit;
  weightPerSide: number;
  platesPerSide: PlateCount[];
  actualTotalWeight: number;
  remainder: number;
  displayString: string;
}

export function calculateBarbellPlates(
  targetWeight: number,
  options: {
    barWeight?: number;
    unit?: WeightUnit;
    availablePlates?: number[];
  } = {}
): PlateCalculationResult {
  const unit = options.unit || 'kg';
  const barWeight = options.barWeight !== undefined ? options.barWeight : STANDARD_BAR_WEIGHTS.olympic_men[unit];
  const plates = (options.availablePlates || (unit === 'kg' ? STANDARD_METRIC_PLATES : STANDARD_IMPERIAL_PLATES))
    .slice()
    .sort((a, b) => b - a);

  if (targetWeight < barWeight) {
    return {
      targetWeight,
      barWeight,
      unit,
      weightPerSide: 0,
      platesPerSide: [],
      actualTotalWeight: barWeight,
      remainder: targetWeight - barWeight,
      displayString: `Empty Bar (${barWeight} ${unit})`,
    };
  }

  const weightNeeded = targetWeight - barWeight;
  let remainingPerSide = weightNeeded / 2;
  const platesPerSide: PlateCount[] = [];

  for (const plate of plates) {
    if (remainingPerSide >= plate) {
      const count = Math.floor(remainingPerSide / plate);
      platesPerSide.push({ plate, count });
      remainingPerSide = Math.round((remainingPerSide - count * plate) * 100) / 100;
    }
  }

  const loadedPerSide = platesPerSide.reduce((sum, item) => sum + item.plate * item.count, 0);
  const actualTotalWeight = barWeight + loadedPerSide * 2;
  const remainder = Math.round((targetWeight - actualTotalWeight) * 100) / 100;

  const displayString = platesPerSide.length > 0
    ? `${platesPerSide.map(p => (p.count > 1 ? `${p.count}x${p.plate}` : `${p.plate}`)).join(' + ')} ${unit} per side`
    : `Empty Bar (${barWeight} ${unit})`;

  return {
    targetWeight,
    barWeight,
    unit,
    weightPerSide: loadedPerSide,
    platesPerSide,
    actualTotalWeight,
    remainder,
    displayString,
  };
}
