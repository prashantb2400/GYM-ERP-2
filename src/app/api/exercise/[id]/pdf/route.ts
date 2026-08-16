import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { generateExercisePlanHTML } from '@/lib/pdf/exercise-template';
import { ExercisePlanData } from '@/lib/pdf/types';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = await createClient();
    const planId = id;

    // Fetch gym profile
    const { data: gymProfile } = await supabase
      .from('gym_profiles')
      .select('*')
      .limit(1)
      .single();

    const gymData = gymProfile || {
      name: 'Gym Name',
      address: 'Gym Address',
      phone: '1234567890',
      email: 'contact@gym.com'
    };

    // Creating mock data since we don't know the exact schema for exercise plans
    const templateData: ExercisePlanData = {
      gym: {
        name: gymData.name,
        address: `${gymData.address?.street || ''} ${gymData.address?.city || ''} ${gymData.address?.state || ''} ${gymData.address?.pin || ''}`.trim() || gymData.address || 'Address not provided',
        phone: gymData.phone || 'N/A',
        email: gymData.email || 'N/A',
      },
      member: {
        id: planId,
        name: 'John Doe', // Mocked
        level: 'Intermediate',
        goal: 'Hypertrophy',
      },
      dateIssued: new Date().toISOString(),
      trainerName: 'Master Trainer',
      duration: '8 Weeks',
      days: [
        {
          dayName: 'Day 1 - Monday',
          focus: 'Chest & Triceps',
          exercises: [
            {
              name: 'Barbell Bench Press',
              sets: 4,
              reps: '8-10',
              rest: '90s',
              muscleGroups: ['Chest', 'Triceps'],
              notes: 'Focus on slow eccentric movement.'
            },
            {
              name: 'Incline Dumbbell Press',
              sets: 3,
              reps: '10-12',
              rest: '60s',
              muscleGroups: ['Upper Chest']
            },
            {
              name: 'Tricep Pushdowns',
              sets: 3,
              reps: '12-15',
              rest: '45s',
              muscleGroups: ['Triceps']
            }
          ]
        },
        {
          dayName: 'Day 2 - Wednesday',
          focus: 'Back & Biceps',
          exercises: [
            {
              name: 'Lat Pulldown',
              sets: 4,
              reps: '10-12',
              rest: '60s',
              muscleGroups: ['Lats'],
            },
            {
              name: 'Barbell Row',
              sets: 3,
              reps: '8-10',
              rest: '90s',
              muscleGroups: ['Middle Back'],
            },
            {
              name: 'Barbell Bicep Curl',
              sets: 3,
              reps: '12-15',
              rest: '45s',
              muscleGroups: ['Biceps']
            }
          ]
        }
      ]
    };

    const html = generateExercisePlanHTML(templateData);

    return new NextResponse(html, {
      headers: {
        'Content-Type': 'text/html; charset=utf-8',
        'Content-Disposition': `inline; filename="exercise-plan-${planId}.pdf"`,
      },
    });
  } catch (error) {
    console.error('Failed to generate exercise plan PDF:', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}
