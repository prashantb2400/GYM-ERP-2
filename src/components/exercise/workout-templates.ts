import { ExerciseDay } from '@/types/database';

export interface WorkoutTemplate {
  id: string;
  name: string;
  description: string;
  splitBadge: string;
  days: ExerciseDay[];
}

export const PRESET_WORKOUT_TEMPLATES: WorkoutTemplate[] = [
  {
    id: 'ppl-3day',
    name: 'Push - Pull - Legs (3-Day Split)',
    description: 'Gold standard compound split balancing chest, back, shoulders, arms, and leg development with maximum recovery.',
    splitBadge: '3 Days / Wk',
    days: [
      {
        day: 'Monday: Push (Chest, Delts & Triceps)',
        exercises: [
          { name: 'Barbell Flat Bench Press', sets: 4, reps: '8-10', rest_seconds: 90, notes: 'Touch chest, explosive upward push' },
          { name: 'Incline Dumbbell Press', sets: 3, reps: '10-12', rest_seconds: 75, notes: '30 degree bench angle, deep chest stretch' },
          { name: 'Dumbbell Lateral Raises', sets: 4, reps: '12-15', rest_seconds: 45, notes: 'Lead with elbows, strict controlled tempo' },
          { name: 'Cable Rope Tricep Pushdown', sets: 3, reps: '12-15', rest_seconds: 45, notes: 'Spread rope at the bottom lockout' },
          { name: 'Overhead Dumbbell Extension', sets: 3, reps: '10-12', rest_seconds: 60, notes: 'Deep stretch behind head for long head triceps' },
        ],
      },
      {
        day: 'Wednesday: Pull (Back, Rear Delts & Biceps)',
        exercises: [
          { name: 'Conventional Barbell Deadlift', sets: 4, reps: '5-6', rest_seconds: 120, notes: 'Neutral spine, tight lats, drive through floor' },
          { name: 'Lat Pulldown (Wide Grip)', sets: 4, reps: '8-10', rest_seconds: 75, notes: 'Pull elbows down to ribs, squeeze scapula' },
          { name: 'Seated Cable Row', sets: 3, reps: '10-12', rest_seconds: 60, notes: 'Maintain upright posture, full stretch' },
          { name: 'Standing Barbell Bicep Curl', sets: 3, reps: '10-12', rest_seconds: 60, notes: 'Elbows pinned to sides, zero body swing' },
          { name: 'Incline Dumbbell Hammer Curl', sets: 3, reps: '12-15', rest_seconds: 45, notes: 'Targets brachialis and forearm thickness' },
        ],
      },
      {
        day: 'Friday: Legs & Abs (Quads, Hamstrings & Calves)',
        exercises: [
          { name: 'Barbell Back Squat', sets: 4, reps: '8-10', rest_seconds: 120, notes: 'Hit depth below parallel, knees track toes' },
          { name: 'Romanian Deadlift (RDL)', sets: 3, reps: '10-12', rest_seconds: 90, notes: 'Hinge back at hips, intense hamstring stretch' },
          { name: 'Leg Press 45 Degree', sets: 3, reps: '12-15', rest_seconds: 75, notes: 'Full depth without lower back peeling up' },
          { name: 'Standing Calf Raise', sets: 4, reps: '15-20', rest_seconds: 45, notes: 'Pause 2 seconds at the peak contraction' },
          { name: 'Hanging Leg Raise', sets: 3, reps: '12-15', rest_seconds: 45, notes: 'Curl pelvis up towards chest, avoid swinging' },
        ],
      },
    ],
  },
  {
    id: 'bro-split-5day',
    name: '5-Day Muscle Hypertrophy (Bro Split)',
    description: 'High-volume single muscle group focus targeting maximum sarcoplasmic hypertrophy and muscle pump.',
    splitBadge: '5 Days / Wk',
    days: [
      {
        day: 'Monday: Chest Annihilation',
        exercises: [
          { name: 'Barbell Flat Bench Press', sets: 4, reps: '8-10', rest_seconds: 90, notes: 'Heavy working sets' },
          { name: 'Incline Dumbbell Bench Press', sets: 4, reps: '10-12', rest_seconds: 75, notes: 'Focus on upper clavicular head' },
          { name: 'Standing Cable Chest Flyes', sets: 3, reps: '12-15', rest_seconds: 60, notes: 'Continuous tension on chest' },
          { name: 'Parallel Bar Dips / Pushups', sets: 3, reps: 'To Failure', rest_seconds: 60, notes: 'Lean forward for lower pecs' },
        ],
      },
      {
        day: 'Tuesday: Back & Traps Width',
        exercises: [
          { name: 'Barbell Deadlift', sets: 4, reps: '6-8', rest_seconds: 120, notes: 'Total posterior chain power' },
          { name: 'Bent-Over Barbell Row', sets: 4, reps: '8-10', rest_seconds: 90, notes: 'Torso at 45 degrees, pull to navel' },
          { name: 'Lat Pulldown (Close Grip V-Bar)', sets: 3, reps: '10-12', rest_seconds: 60, notes: 'Lower lat focus' },
          { name: 'Dumbbell Shrugs', sets: 4, reps: '15', rest_seconds: 45, notes: 'Hold squeeze at top for 2 seconds' },
        ],
      },
      {
        day: 'Wednesday: 3D Shoulders & Abs',
        exercises: [
          { name: 'Seated Dumbbell Overhead Press', sets: 4, reps: '8-10', rest_seconds: 90, notes: 'Full overhead extension' },
          { name: 'Dumbbell Lateral Raise', sets: 4, reps: '12-15', rest_seconds: 45, notes: 'Side delt burn sets' },
          { name: 'Rear Delt Face Pulls with Rope', sets: 4, reps: '15-20', rest_seconds: 45, notes: 'Pull to eyes, external rotation' },
          { name: 'Cable Woodchoppers', sets: 3, reps: '15 / side', rest_seconds: 45, notes: 'Rotate through core' },
        ],
      },
      {
        day: 'Thursday: Wheels (Legs Quads & Hams)',
        exercises: [
          { name: 'Barbell Back Squat', sets: 4, reps: '8-10', rest_seconds: 120, notes: 'Heavy progressive overload' },
          { name: 'Leg Extension Machine', sets: 4, reps: '12-15', rest_seconds: 60, notes: 'Squeeze quad teardrop at lockout' },
          { name: 'Lying Hamstring Leg Curl', sets: 4, reps: '10-12', rest_seconds: 60, notes: 'Slow 3-second eccentric release' },
          { name: 'Standing Calf Raise', sets: 4, reps: '15-20', rest_seconds: 45, notes: 'Full ankle stretch and contraction' },
        ],
      },
      {
        day: 'Friday: Arms Superset (Biceps & Triceps)',
        exercises: [
          { name: 'Barbell EZ-Bar Bicep Curl', sets: 4, reps: '10-12', rest_seconds: 60, notes: 'Strict form' },
          { name: 'Close-Grip Bench Press', sets: 4, reps: '8-10', rest_seconds: 75, notes: 'Heavy tricep builder' },
          { name: 'Incline Dumbbell Hammer Curl', sets: 3, reps: '12-15', rest_seconds: 45, notes: 'Forearms and brachialis' },
          { name: 'Lying Skull Crushers', sets: 3, reps: '10-12', rest_seconds: 60, notes: 'Lower to hairline, press up' },
          { name: 'Cable Triceps Rope Pushdown', sets: 3, reps: '15', rest_seconds: 45, notes: 'Finisher pump' },
        ],
      },
    ],
  },
  {
    id: 'upper-lower-4day',
    name: 'Upper / Lower (4-Day Split)',
    description: 'Optimal training frequency hitting every muscle group twice per week for strength and athletic conditioning.',
    splitBadge: '4 Days / Wk',
    days: [
      {
        day: 'Monday: Upper Power',
        exercises: [
          { name: 'Barbell Bench Press', sets: 4, reps: '6-8', rest_seconds: 120, notes: 'Heavy strength sets' },
          { name: 'Bent-Over Barbell Row', sets: 4, reps: '6-8', rest_seconds: 120, notes: 'Explosive pull to chest' },
          { name: 'Overhead Military Press', sets: 3, reps: '8-10', rest_seconds: 90, notes: 'Strict standing press' },
          { name: 'Weighted Pull-ups / Lat Pulldown', sets: 3, reps: '8-10', rest_seconds: 90, notes: 'Full range of motion' },
        ],
      },
      {
        day: 'Tuesday: Lower Power',
        exercises: [
          { name: 'Barbell Back Squat', sets: 4, reps: '6-8', rest_seconds: 120, notes: 'Power squat form' },
          { name: 'Romanian Deadlift (RDL)', sets: 4, reps: '8-10', rest_seconds: 90, notes: 'Hips back, hamstring stretch' },
          { name: 'Bulgarian Split Squat', sets: 3, reps: '10 / leg', rest_seconds: 75, notes: 'Unilateral leg drive' },
          { name: 'Standing Calf Raise', sets: 4, reps: '12-15', rest_seconds: 60, notes: 'Heavy calf overload' },
        ],
      },
      {
        day: 'Thursday: Upper Hypertrophy',
        exercises: [
          { name: 'Incline Dumbbell Press', sets: 4, reps: '10-12', rest_seconds: 75, notes: 'Upper chest focus' },
          { name: 'Seated Cable Row', sets: 4, reps: '10-12', rest_seconds: 75, notes: 'Mid-back thickness' },
          { name: 'Dumbbell Lateral Raise', sets: 4, reps: '12-15', rest_seconds: 45, notes: 'Side delt pump' },
          { name: 'Incline Dumbbell Bicep Curl', sets: 3, reps: '12', rest_seconds: 60, notes: 'Full long head stretch' },
          { name: 'Overhead Cable Triceps Extension', sets: 3, reps: '12-15', rest_seconds: 60, notes: 'Constant cable tension' },
        ],
      },
      {
        day: 'Friday: Lower Hypertrophy',
        exercises: [
          { name: 'Leg Press 45 Degree', sets: 4, reps: '12-15', rest_seconds: 90, notes: 'High volume quad burner' },
          { name: 'Lying Hamstring Leg Curl', sets: 4, reps: '12', rest_seconds: 60, notes: 'Control the descent' },
          { name: 'Walking Dumbbell Lunges', sets: 3, reps: '12 steps / leg', rest_seconds: 60, notes: 'Keep torso upright' },
          { name: 'Hanging Knee Raises', sets: 3, reps: '15', rest_seconds: 45, notes: 'Core control' },
        ],
      },
    ],
  },
  {
    id: 'fullbody-3day',
    name: 'Full Body Conditioning (3-Day Circuit)',
    description: 'High-calorie burn total body workout perfect for fat loss, cardiovascular conditioning, and beginner trainees.',
    splitBadge: '3 Days / Wk',
    days: [
      {
        day: 'Monday: Full Body Circuit A',
        exercises: [
          { name: 'Dumbbell Goblet Squats', sets: 3, reps: '12-15', rest_seconds: 60, notes: 'Deep squat with elbows inside knees' },
          { name: 'Dumbbell Push Press', sets: 3, reps: '10-12', rest_seconds: 60, notes: 'Slight leg dip and drive overhead' },
          { name: 'Dumbbell Bent-Over Row', sets: 3, reps: '12', rest_seconds: 60, notes: 'Flat back, squeeze upper back' },
          { name: 'Forearm Plank Hold', sets: 3, reps: '45-60s', rest_seconds: 45, notes: 'Maintain tight abdominal brace' },
        ],
      },
      {
        day: 'Wednesday: Full Body Circuit B',
        exercises: [
          { name: 'Kettlebell / Dumbbell Deadlift', sets: 3, reps: '12', rest_seconds: 60, notes: 'Drive through heels, snap hips' },
          { name: 'Standard Push-ups', sets: 3, reps: '15-20', rest_seconds: 60, notes: 'Chest touches floor every rep' },
          { name: 'Lat Pulldown Machine', sets: 3, reps: '12-15', rest_seconds: 60, notes: 'Smooth controlled tempo' },
          { name: 'Mountain Climbers', sets: 3, reps: '30s fast', rest_seconds: 45, notes: 'High knee drive for conditioning' },
        ],
      },
      {
        day: 'Friday: Full Body Circuit C',
        exercises: [
          { name: 'Walking Dumbbell Lunges', sets: 3, reps: '10 / leg', rest_seconds: 60, notes: 'Knee gently touches turf' },
          { name: 'Flat Dumbbell Chest Press', sets: 3, reps: '12', rest_seconds: 60, notes: 'Clean press and squeeze' },
          { name: 'Seated Cable Row', sets: 3, reps: '12', rest_seconds: 60, notes: 'Scapular retraction' },
          { name: 'Russian Twists', sets: 3, reps: '20 / side', rest_seconds: 45, notes: 'Rotate shoulders side to side' },
        ],
      },
    ],
  },
];

export interface QuickExercise {
  name: string;
  sets: number;
  reps: string;
  rest: number;
  notes: string;
  category: 'Chest' | 'Back' | 'Legs' | 'Shoulders' | 'Arms' | 'Core';
}

export const QUICK_EXERCISES: QuickExercise[] = [
  // Chest
  { name: 'Barbell Flat Bench Press', sets: 4, reps: '8-10', rest: 90, notes: 'Touch chest, drive up', category: 'Chest' },
  { name: 'Incline Dumbbell Press', sets: 3, reps: '10-12', rest: 75, notes: '30 deg incline, upper chest', category: 'Chest' },
  { name: 'Cable Chest Flyes', sets: 3, reps: '12-15', rest: 60, notes: 'Peak contraction squeeze', category: 'Chest' },
  { name: 'Parallel Dips / Pushups', sets: 3, reps: '12-15', rest: 60, notes: 'Lean forward for chest focus', category: 'Chest' },

  // Back
  { name: 'Conventional Deadlift', sets: 4, reps: '5-6', rest: 120, notes: 'Neutral spine, leg drive', category: 'Back' },
  { name: 'Lat Pulldown Wide Grip', sets: 4, reps: '8-10', rest: 75, notes: 'Pull elbows to ribs', category: 'Back' },
  { name: 'Bent-Over Barbell Row', sets: 4, reps: '8-10', rest: 90, notes: 'Torso 45 deg, pull to waist', category: 'Back' },
  { name: 'Seated Cable Row', sets: 3, reps: '10-12', rest: 60, notes: 'Full scapular squeeze', category: 'Back' },

  // Legs
  { name: 'Barbell Back Squat', sets: 4, reps: '8-10', rest: 120, notes: 'Below parallel depth', category: 'Legs' },
  { name: 'Romanian Deadlift (RDL)', sets: 3, reps: '10-12', rest: 90, notes: 'Hips back, hamstring stretch', category: 'Legs' },
  { name: 'Leg Press 45 Degree', sets: 3, reps: '12-15', rest: 75, notes: 'Full range of motion', category: 'Legs' },
  { name: 'Lying Hamstring Leg Curl', sets: 3, reps: '12', rest: 60, notes: 'Slow controlled negative', category: 'Legs' },
  { name: 'Standing Calf Raise', sets: 4, reps: '15-20', rest: 45, notes: '2s pause at top contraction', category: 'Legs' },

  // Shoulders
  { name: 'Overhead Barbell Military Press', sets: 4, reps: '8-10', rest: 90, notes: 'Lock out overhead', category: 'Shoulders' },
  { name: 'Dumbbell Lateral Raise', sets: 4, reps: '12-15', rest: 45, notes: 'Lead with elbows', category: 'Shoulders' },
  { name: 'Rear Delt Face Pulls', sets: 3, reps: '15-20', rest: 45, notes: 'External rotation at eyes', category: 'Shoulders' },
  { name: 'Dumbbell Front Raise', sets: 3, reps: '12-15', rest: 45, notes: 'Raise to chin level', category: 'Shoulders' },

  // Arms
  { name: 'Barbell Bicep Curl', sets: 3, reps: '10-12', rest: 60, notes: 'Elbows pinned to sides', category: 'Arms' },
  { name: 'Dumbbell Hammer Curl', sets: 3, reps: '12-15', rest: 45, notes: 'Forearms & brachialis', category: 'Arms' },
  { name: 'Cable Rope Tricep Pushdown', sets: 3, reps: '12-15', rest: 45, notes: 'Spread rope at lockout', category: 'Arms' },
  { name: 'Skull Crushers (EZ Bar)', sets: 3, reps: '10-12', rest: 60, notes: 'Lower to forehead', category: 'Arms' },

  // Core
  { name: 'Hanging Leg Raises', sets: 3, reps: '12-15', rest: 45, notes: 'Curl pelvis up', category: 'Core' },
  { name: 'Forearm Plank Hold', sets: 3, reps: '45-60s', rest: 45, notes: 'Tight glutes & abs', category: 'Core' },
  { name: 'Cable Woodchoppers', sets: 3, reps: '15 / side', rest: 45, notes: 'Rotational oblique power', category: 'Core' },
  { name: 'Ab Roller Wheel', sets: 3, reps: '12-15', rest: 45, notes: 'Controlled rollout', category: 'Core' },
];
