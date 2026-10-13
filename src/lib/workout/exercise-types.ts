/**
 * Exercise Types & Starter Routines Definition
 * Adapted from openGym catalogue (https://github.com/DuarteSantos8/openGym/tree/main/catalogue).
 */

export type MuscleGroup =
  | 'chest'
  | 'back'
  | 'shoulders'
  | 'biceps'
  | 'triceps'
  | 'quadriceps'
  | 'hamstrings'
  | 'glutes'
  | 'calves'
  | 'abs'
  | 'forearms'
  | 'cardio';

export type EquipmentCategory =
  | 'barbell'
  | 'dumbbell'
  | 'cable'
  | 'machine'
  | 'bodyweight'
  | 'smith_machine'
  | 'kettlebell'
  | 'weighted';

export interface ExerciseDefinition {
  id: string;
  name: string;
  bodyPart: string;
  equipment: EquipmentCategory;
  targetMuscle: MuscleGroup;
  secondaryMuscles?: MuscleGroup[];
  category: 'strength' | 'cardio' | 'mobility';
  description: string;
  instructions: string[];
}

export interface RoutineExercisePrescription {
  exerciseId: string;
  exerciseName: string;
  sets: number;
  reps: number;
  rpe?: number;
  restSeconds: number;
  notes?: string;
}

export interface StarterRoutine {
  id: string;
  name: string;
  splitType: 'PPL' | 'Upper_Lower' | 'Full_Body' | '5x5';
  daysPerWeek: number;
  description: string;
  days: {
    dayName: string;
    exercises: RoutineExercisePrescription[];
  }[];
}

export const STARTER_ROUTINES: StarterRoutine[] = [
  {
    id: 'ppl_classic',
    name: 'Push / Pull / Legs (PPL)',
    splitType: 'PPL',
    daysPerWeek: 3,
    description: 'Gold standard bodybuilding & strength routine dividing training by movement patterns.',
    days: [
      {
        dayName: 'Push Day (Chest, Shoulders, Triceps)',
        exercises: [
          { exerciseId: '0025', exerciseName: 'Barbell Flat Bench Press', sets: 4, reps: 6, restSeconds: 120 },
          { exerciseId: '0334', exerciseName: 'Dumbbell Incline Press', sets: 3, reps: 10, restSeconds: 90 },
          { exerciseId: '0378', exerciseName: 'Overhead Dumbbell Shoulder Press', sets: 3, reps: 8, restSeconds: 90 },
          { exerciseId: '0283', exerciseName: 'Dumbbell Lateral Raise', sets: 4, reps: 12, restSeconds: 60 },
          { exerciseId: '0241', exerciseName: 'Cable Triceps Pushdown', sets: 3, reps: 12, restSeconds: 60 },
        ],
      },
      {
        dayName: 'Pull Day (Back, Rear Delts, Biceps)',
        exercises: [
          { exerciseId: '0027', exerciseName: 'Barbell Bent Over Row', sets: 4, reps: 8, restSeconds: 120 },
          { exerciseId: '0150', exerciseName: 'Wide-Grip Lat Pulldown', sets: 3, reps: 10, restSeconds: 90 },
          { exerciseId: '0326', exerciseName: 'Face Pull (Rear Delts)', sets: 4, reps: 15, restSeconds: 60 },
          { exerciseId: '0310', exerciseName: 'Barbell Biceps Curl', sets: 3, reps: 10, restSeconds: 60 },
          { exerciseId: '0308', exerciseName: 'Incline Dumbbell Hammer Curl', sets: 3, reps: 12, restSeconds: 60 },
        ],
      },
      {
        dayName: 'Legs Day (Quads, Hamstrings, Calves)',
        exercises: [
          { exerciseId: '0043', exerciseName: 'Barbell Back Squat', sets: 4, reps: 6, restSeconds: 150 },
          { exerciseId: '0032', exerciseName: 'Romanian Deadlift (RDL)', sets: 3, reps: 8, restSeconds: 120 },
          { exerciseId: '0585', exerciseName: 'Leg Press', sets: 3, reps: 10, restSeconds: 90 },
          { exerciseId: '0582', exerciseName: 'Lying Leg Curl', sets: 3, reps: 12, restSeconds: 60 },
          { exerciseId: '0743', exerciseName: 'Standing Calf Raise', sets: 4, reps: 15, restSeconds: 45 },
        ],
      },
    ],
  },
  {
    id: 'stronglifts_5x5',
    name: '5x5 Linear Strength',
    splitType: '5x5',
    daysPerWeek: 3,
    description: 'Foundational compound barbell strength program focusing on progressive overload.',
    days: [
      {
        dayName: 'Workout A',
        exercises: [
          { exerciseId: '0043', exerciseName: 'Barbell Back Squat', sets: 5, reps: 5, restSeconds: 180 },
          { exerciseId: '0025', exerciseName: 'Barbell Bench Press', sets: 5, reps: 5, restSeconds: 180 },
          { exerciseId: '0027', exerciseName: 'Barbell Bent Over Row', sets: 5, reps: 5, restSeconds: 180 },
        ],
      },
      {
        dayName: 'Workout B',
        exercises: [
          { exerciseId: '0043', exerciseName: 'Barbell Back Squat', sets: 5, reps: 5, restSeconds: 180 },
          { exerciseId: '0038', exerciseName: 'Standing Overhead Barbell Press', sets: 5, reps: 5, restSeconds: 180 },
          { exerciseId: '0032', exerciseName: 'Conventional Deadlift', sets: 1, reps: 5, restSeconds: 180 },
        ],
      },
    ],
  },
];
