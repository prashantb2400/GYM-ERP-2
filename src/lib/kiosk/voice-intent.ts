/**
 * Voice Intent Parser and Prompt Formatter for Kiosk Voice Agent.
 * Parses speech transcripts for workout queries and barbell plate math,
 * and formats crisp, natural speech responses for Web Speech synthesis.
 */

import { PlateCalculationResult } from '@/lib/workout/plate-calculator';

export interface WorkoutVoiceIntent {
  type: 'workout';
  raw: string;
}

export interface PlateVoiceIntent {
  type: 'plates';
  targetWeight: number;
  unit: 'kg' | 'lb';
  raw: string;
}

export interface PrVoiceIntent {
  type: 'pr';
  exercise?: string;
  raw: string;
}

export interface CheckinVoiceIntent {
  type: 'checkin';
  raw: string;
}

export interface HelpVoiceIntent {
  type: 'help';
  raw: string;
}

export interface UnknownVoiceIntent {
  type: 'unknown';
  raw: string;
}

export type KioskVoiceIntent =
  | WorkoutVoiceIntent
  | PlateVoiceIntent
  | PrVoiceIntent
  | CheckinVoiceIntent
  | HelpVoiceIntent
  | UnknownVoiceIntent;

/**
 * Parses user speech transcript into a structured kiosk intent.
 */
export function parseKioskVoiceIntent(transcript: string): KioskVoiceIntent {
  if (!transcript || typeof transcript !== 'string') {
    return { type: 'unknown', raw: '' };
  }

  const clean = transcript.trim().toLowerCase();
  if (!clean) {
    return { type: 'unknown', raw: '' };
  }

  // 1. Plate calculation intent: looks for plate/barbell/load mentions with numeric weight
  const plateKeywords = /(?:plate[s]?|barbell|bar|load|sleeve|collar)/i;
  const numberRegex = /([0-9]+(?:\.[0-9]+)?)\s*(kg|kilo|kilos|kilogram|kilograms|lb|lbs|pound|pounds)?/i;

  if (plateKeywords.test(clean)) {
    const match = clean.match(numberRegex);
    if (match) {
      const weight = parseFloat(match[1]);
      if (!isNaN(weight) && weight > 0) {
        const rawUnit = match[2] || '';
        const unit: 'kg' | 'lb' = /lb|pound/i.test(rawUnit) ? 'lb' : 'kg';
        return {
          type: 'plates',
          targetWeight: weight,
          unit,
          raw: transcript,
        };
      }
    }
  }

  // Also match direct phrases like "how many plates for 90" or "calculate 80 kg"
  const calcMatch = clean.match(/(?:calculate|math for|plates? for|load for)\s*([0-9]+(?:\.[0-9]+)?)\s*(kg|kilo|kilos|kilogram|kilograms|lb|lbs|pound|pounds)?/i);
  if (calcMatch) {
    const weight = parseFloat(calcMatch[1]);
    if (!isNaN(weight) && weight > 0) {
      const rawUnit = calcMatch[2] || '';
      const unit: 'kg' | 'lb' = /lb|pound/i.test(rawUnit) ? 'lb' : 'kg';
      return {
        type: 'plates',
        targetWeight: weight,
        unit,
        raw: transcript,
      };
    }
  }

  // 2. Workout routine query intent
  const workoutPatterns = [
    /what(?:'s| is) (?:my )?(?:today(?:'s)? )?(?:workout|routine|split|exercise[s]?)/i,
    /today(?:'s)? (?:workout|routine|split)/i,
    /what (?:should i|do i) (?:train|workout|do) today/i,
    /what exercise[s]? (?:should i do|today)/i,
    /show (?:my )?(?:workout|routine|split)/i,
    /my workout/i,
    /my routine/i,
    /what am i training/i,
  ];

  if (workoutPatterns.some((pattern) => pattern.test(clean))) {
    return { type: 'workout', raw: transcript };
  }

  // 3. PR / One Rep Max query intent
  const prPatterns = [
    /what(?:'s| is) my (?:pr|personal record|max|1rm)/i,
    /personal record/i,
    /one rep max/i,
    /max (?:bench|squat|deadlift|press)/i,
  ];

  if (prPatterns.some((pattern) => pattern.test(clean))) {
    let exercise: string | undefined;
    if (/bench/i.test(clean)) exercise = 'Bench Press';
    else if (/squat/i.test(clean)) exercise = 'Squat';
    else if (/deadlift/i.test(clean)) exercise = 'Deadlift';
    else if (/overhead|shoulder|press/i.test(clean)) exercise = 'Overhead Press';

    return { type: 'pr', exercise, raw: transcript };
  }

  // 4. Attendance Check-in query intent
  const checkinPatterns = [
    /mark (?:my )?(?:attendance|check[- ]?in)/i,
    /check me in/i,
    /sign me in/i,
  ];

  if (checkinPatterns.some((pattern) => pattern.test(clean))) {
    return { type: 'checkin', raw: transcript };
  }

  // 5. Help / Greeting intent
  const helpPatterns = [
    /^help$/i,
    /what can you do/i,
    /how do you work/i,
    /voice commands/i,
    /^hello$/i,
    /^hi$/i,
  ];

  if (helpPatterns.some((pattern) => pattern.test(clean))) {
    return { type: 'help', raw: transcript };
  }

  return { type: 'unknown', raw: transcript };
}

/**
 * Formats a spoken voice prompt summarizing today's workout split for a member.
 */
export function formatTodayWorkoutVoice(
  name: string,
  routineName: string,
  dayName: string,
  exerciseCount: number,
  firstExercise?: string
): string {
  const memberName = name?.trim() || 'Athlete';

  if (!exerciseCount || exerciseCount === 0) {
    return `Hey ${memberName}, your schedule shows rest and recovery under ${routineName}. Stay hydrated and recharge!`;
  }

  const exerciseIntro = firstExercise
    ? `, starting with ${firstExercise}`
    : '';

  return `Hey ${memberName}, today is your ${dayName} split under ${routineName}. You have ${exerciseCount} exercises scheduled${exerciseIntro}. Have a great workout!`;
}

/**
 * Formats a spoken voice prompt explaining exact barbell plate loading per sleeve.
 */
export function formatPlateLoadingVoice(result: PlateCalculationResult): string {
  const { targetWeight, barWeight, unit, platesPerSide, remainder } = result;
  const unitWord = unit === 'lb' ? 'pound' : 'kilogram';
  const unitWordPlural = unit === 'lb' ? 'pounds' : 'kilograms';

  if (targetWeight < barWeight) {
    return `The target weight of ${targetWeight} ${unit} is lighter than the ${barWeight} ${unit} barbell. Please use dumbbells or an unloaded barbell.`;
  }

  if (!platesPerSide || platesPerSide.length === 0) {
    return `For ${targetWeight} ${unitWordPlural}, use an empty ${barWeight} ${unitWord} Olympic barbell with zero plates on each side.`;
  }

  const countWordMap: Record<number, string> = {
    1: 'one',
    2: 'two',
    3: 'three',
    4: 'four',
    5: 'five',
    6: 'six',
  };

  const plateDescriptions = platesPerSide.map((p) => {
    const countWord = countWordMap[p.count] || String(p.count);
    const noun = p.count > 1 ? 'plates' : 'plate';
    return `${countWord} ${p.plate} ${unitWord} ${noun}`;
  });

  let joinedPlates = '';
  if (plateDescriptions.length === 1) {
    joinedPlates = plateDescriptions[0];
  } else if (plateDescriptions.length === 2) {
    joinedPlates = `${plateDescriptions[0]} and ${plateDescriptions[1]}`;
  } else {
    joinedPlates = `${plateDescriptions.slice(0, -1).join(', ')}, and ${plateDescriptions[plateDescriptions.length - 1]}`;
  }

  let prompt = `To load ${targetWeight} ${unitWordPlural} on a ${barWeight} ${unitWord} bar, load ${joinedPlates} on each side.`;

  if (remainder > 0) {
    prompt += ` Note: there is a ${remainder} ${unit} remainder with available plates.`;
  }

  return prompt;
}

/**
 * Formats a spoken voice prompt for kiosk voice assistant help.
 */
export function formatHelpVoice(): string {
  return `You can ask me what is your workout today, or ask me to calculate barbell plates for any weight, such as plates for 80 kilograms.`;
}
