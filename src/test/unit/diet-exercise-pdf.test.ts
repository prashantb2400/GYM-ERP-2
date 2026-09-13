import { describe, it, expect } from 'vitest';
import { generateDietChartHTML } from '@/lib/pdf/diet-template';
import { generateExercisePlanHTML } from '@/lib/pdf/exercise-template';
import { DietChartData, ExercisePlanData } from '@/lib/pdf/types';

describe('Diet Chart PDF Printout Generation', () => {
  const mockDietData: DietChartData = {
    gym: {
      name: 'Iron Forge Club',
      branchName: 'Downtown Flagship',
      address: 'Plot 42, Sector 18, Gurugram, Haryana - 122002',
      phone: '+91 98765 43210',
      email: 'care@ironforge.com',
    },
    planTitle: 'Clean Muscle Bulk 2,800 Kcal',
    isTemplate: false,
    member: {
      id: 'mem-123456',
      name: 'Rahul Sharma',
      memberCode: 'MEM-0042',
      weight: 78,
      height: '180 cm',
      goal: 'Lean Muscle Hypertrophy',
    },
    dateIssued: '2026-09-13T10:00:00Z',
    targetCalories: 2800,
    trainerName: 'Vikram Rajput (Certified S&C)',
    trainerNotes: 'Drink 4L water daily. Consume post-workout shake within 40 mins.',
    waterIntakeLiters: 4,
    meals: [
      {
        name: 'Breakfast',
        time: '08:00 AM',
        calories: 560,
        protein: 38,
        items: [
          { name: 'Whole Boiled Eggs', qty: '4 whole (200g)', calories: 280, protein: 24 },
          { name: 'Rolled Oats with Honey', qty: '80g oats', calories: 280, protein: 14 },
        ],
      },
      {
        name: 'Lunch',
        time: '01:30 PM',
        calories: 650,
        protein: 52,
        items: [
          { name: 'Grilled Chicken Breast', qty: '180g', calories: 300, protein: 46 },
          { name: 'Steamed Brown Rice', qty: '200g', calories: 230, protein: 5 },
          { name: 'Mixed Greens Salad', qty: '1 bowl', calories: 120, protein: 1 },
        ],
      },
    ],
    totalCalories: 1210,
    totalProtein: 90,
  };

  it('renders official gym & branch identity', () => {
    const html = generateDietChartHTML(mockDietData);
    expect(html).toContain('Iron Forge Club');
    expect(html).toContain('Downtown Flagship');
    expect(html).toContain('Plot 42, Sector 18, Gurugram');
    expect(html).toContain('+91 98765 43210');
  });

  it('renders member details and target metrics', () => {
    const html = generateDietChartHTML(mockDietData);
    expect(html).toContain('Rahul Sharma');
    expect(html).toContain('MEM-0042');
    expect(html).toContain('78 kg');
    expect(html).toContain('2800'); // Target calories
    expect(html).toContain('Vikram Rajput');
  });

  it('renders structured meal-by-meal table with food items and macro badges', () => {
    const html = generateDietChartHTML(mockDietData);
    expect(html).toContain('Breakfast');
    expect(html).toContain('08:00 AM');
    expect(html).toContain('Whole Boiled Eggs');
    expect(html).toContain('4 whole (200g)');
    expect(html).toContain('Grilled Chicken Breast');
    expect(html).toContain('Lunch');
    expect(html).toContain('560 kcal');
  });

  it('includes golden rules and print controls', () => {
    const html = generateDietChartHTML(mockDietData);
    expect(html).toContain('Golden Rules of Fitness Nutrition');
    expect(html).toContain('Print / Save PDF');
    expect(html).toContain('window.print()');
    expect(html).toContain('@media print');
  });
});

describe('Exercise Plan PDF Printout Generation', () => {
  const mockWorkoutData: ExercisePlanData = {
    gym: {
      name: 'Titan Athletic Club',
      branchName: 'West End Annex',
      address: '100 Feet Road, Indiranagar, Bengaluru - 560038',
      phone: '+91 80 4455 6677',
      email: 'train@titanclub.com',
    },
    planTitle: 'Push - Pull - Legs (3-Day Split)',
    isTemplate: true,
    member: {
      id: 'plan-789',
      name: 'Master Split Trainee',
      level: 'Advanced',
      goal: 'Maximum Hypertrophy & Power',
    },
    dateIssued: '2026-09-13T10:00:00Z',
    trainerName: 'Coach Devendra',
    duration: '8 - 12 Weeks',
    trainerNotes: 'Ensure 3-second eccentric descent on all bench and squat sets.',
    days: [
      {
        dayName: 'Monday: Push (Chest, Delts & Triceps)',
        focus: 'Chest & Deltoid Development',
        exercises: [
          {
            name: 'Barbell Flat Bench Press',
            sets: 4,
            reps: '8-10',
            rest: '90s',
            muscleGroups: ['Chest', 'Triceps'],
            notes: 'Touch chest lightly, explosive upward drive',
            tempo: '3-0-1',
          },
          {
            name: 'Dumbbell Lateral Raise',
            sets: 4,
            reps: '12-15',
            rest: '45s',
            muscleGroups: ['Lateral Deltoid'],
            notes: 'Lead with elbows, strict posture',
            tempo: '2-0-1',
          },
        ],
      },
    ],
  };

  it('renders official gym credentials and split title', () => {
    const html = generateExercisePlanHTML(mockWorkoutData);
    expect(html).toContain('Titan Athletic Club');
    expect(html).toContain('West End Annex');
    expect(html).toContain('Push - Pull - Legs (3-Day Split)');
    expect(html).toContain('Master Gym Training Split');
  });

  it('renders structured day routines with exercises, sets, reps, and rest', () => {
    const html = generateExercisePlanHTML(mockWorkoutData);
    expect(html).toContain('Monday: Push (Chest, Delts & Triceps)');
    expect(html).toContain('Barbell Flat Bench Press');
    expect(html).toContain('8-10');
    expect(html).toContain('90s');
    expect(html).toContain('Touch chest lightly');
  });

  it('includes weight log column, coaching rules, and print toolbar', () => {
    const html = generateExercisePlanHTML(mockWorkoutData);
    expect(html).toContain('Weight Log');
    expect(html).toContain('ex-log-box');
    expect(html).toContain('Progressive Overload');
    expect(html).toContain('Print / Save PDF');
    expect(html).toContain('@media print');
  });
});
