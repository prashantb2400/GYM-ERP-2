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

    // Fetch exercise chart or check if planId belongs to a member
    let { data: chart } = await supabase
      .from('exercise_charts')
      .select('*, gyms(*)')
      .eq('id', planId)
      .single();

    let memberData: any = null;
    let gymRecord = chart?.gyms as any;

    if (!chart) {
      const { data: member } = await supabase
        .from('members')
        .select('*, exercise_charts(*), gyms(*)')
        .eq('id', planId)
        .single();
      if (member) {
        memberData = member;
        chart = member.exercise_charts as any;
        gymRecord = member.gyms as any;
      }
    }

    const gymData = gymRecord || {
      name: 'Gym Name',
      address: 'Gym Address',
      phone: '1234567890',
      email: 'contact@gym.com'
    };

    const defaultDays = [
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
            muscleGroups: ['Upper Chest'],
            notes: ''
          }
        ]
      }
    ];

    const days = Array.isArray(chart?.days) && chart.days.length > 0
      ? chart.days.map((d: any) => ({
          dayName: d.day || d.dayName || 'Workout Day',
          focus: d.focus || d.name || 'General',
          exercises: Array.isArray(d.exercises) ? d.exercises.map((ex: any) => ({
            name: ex.name || 'Exercise',
            sets: Number(ex.sets) || 3,
            reps: String(ex.reps || '10-12'),
            rest: ex.rest_seconds ? `${ex.rest_seconds}s` : (ex.rest || '60s'),
            muscleGroups: Array.isArray(ex.muscleGroups) ? ex.muscleGroups : [ex.target || 'General'],
            notes: ex.notes || ''
          })) : []
        }))
      : defaultDays;

    const templateData: ExercisePlanData = {
      gym: {
        name: gymData.business_name || gymData.name,
        address: typeof gymData.address === 'object' && gymData.address !== null
          ? `${gymData.address.street || ''} ${gymData.address.city || ''} ${gymData.address.state || ''} ${gymData.address.pin || ''}`.trim() || 'Address not provided'
          : (gymData.address || 'Address not provided'),
        phone: gymData.phone || 'N/A',
        email: gymData.email || 'N/A',
      },
      member: {
        id: memberData?.id || planId,
        name: memberData?.name || chart?.name || 'Member',
        level: memberData?.fitness_level || 'Intermediate',
        goal: memberData?.health_goals?.[0] || 'General Fitness',
      },
      dateIssued: new Date().toISOString(),
      trainerName: 'Master Trainer',
      duration: '8 Weeks',
      days,
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
