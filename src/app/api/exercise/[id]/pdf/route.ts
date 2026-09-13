import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { generateExercisePlanHTML } from '@/lib/pdf/exercise-template';
import { ExercisePlanData, WorkoutDay, Exercise } from '@/lib/pdf/types';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const planId = id;

    // 1. Fetch exercise chart by ID or check if ID belongs to a member (using admin client to bypass RLS for print)
    let { data: chart } = await supabaseAdmin
      .from('exercise_charts')
      .select('*, gyms(*)')
      .eq('id', planId)
      .single();

    let memberData: any = null;
    let gymRecord = chart?.gyms as any;

    if (!chart) {
      const { data: member } = await supabaseAdmin
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

    const gymId = chart?.gym_id || memberData?.gym_id;

    // 2. Resolve Gym Profile
    let gymProfile = gymRecord;
    if (!gymProfile && gymId) {
      const { data: g } = await supabaseAdmin.from('gyms').select('*').eq('id', gymId).single();
      gymProfile = g;
    }

    // 3. Resolve Branch Profile (if assigned to branch)
    let branchData: any = null;
    const branchId = memberData?.branch_id || chart?.branch_id;
    if (branchId) {
      const { data: branch } = await supabaseAdmin.from('branches').select('*').eq('id', branchId).maybeSingle();
      branchData = branch;
    }

    const rawGymName = gymProfile?.name?.trim() || gymProfile?.business_name?.trim() || '';
    const resolvedGymName = (rawGymName && rawGymName !== 'Gym Center' && rawGymName !== 'Iron Peak Fitness & Performance' && rawGymName !== 'Iron Peak Fitness')
      ? rawGymName
      : 'Fitness Club';

    const gymData = {
      name: resolvedGymName,
      tagline: gymProfile?.tagline || '',
      address: gymProfile?.address || {},
      phone: gymProfile?.phone || '',
      email: gymProfile?.email || '',
    };

    // Format address
    const activeAddress = branchData?.address && Object.keys(branchData.address).length > 0
      ? branchData.address
      : gymData.address;

    let addressStr = '';
    if (typeof activeAddress === 'string') {
      addressStr = activeAddress;
    } else if (typeof activeAddress === 'object' && activeAddress !== null) {
      const { street, city, state, pin, postal_code } = activeAddress;
      addressStr = [street, city, state, pin || postal_code].filter(Boolean).join(', ');
    }
    if (!addressStr) addressStr = 'Official Gym Address';

    // 4. Transform Days & Exercises
    const rawDays: any[] = Array.isArray(chart?.days) && chart.days.length > 0 ? chart.days : [];

    const days: WorkoutDay[] = rawDays.map((d: any, dIdx: number) => {
      const rawExercises: any[] = Array.isArray(d.exercises) ? d.exercises : [];

      const exercises: Exercise[] = rawExercises.map((ex: any) => ({
        name: ex.name || 'Compound Movement',
        sets: Number(ex.sets) || 3,
        reps: String(ex.reps || '10-12'),
        rest: ex.rest_seconds ? `${ex.rest_seconds}s` : (ex.rest ? String(ex.rest) : '60s'),
        muscleGroups: Array.isArray(ex.muscleGroups) ? ex.muscleGroups : (ex.category ? [ex.category] : []),
        notes: ex.notes || '',
        tempo: ex.tempo || '2-0-1 Control',
      }));

      return {
        dayName: d.day || d.dayName || `Day ${dIdx + 1}: Training Routine`,
        focus: d.focus || d.name || 'Strength & Hypertrophy',
        exercises,
      };
    });

    const isTemplate = !memberData;
    const planTitle = chart?.name || (isTemplate ? 'Standard Gym Training Program' : 'Personalized Member Workout Program');

    const templateData: ExercisePlanData = {
      gym: {
        name: gymData.name,
        tagline: gymData.tagline,
        branchName: branchData?.name,
        address: addressStr,
        phone: branchData?.phone || gymData.phone || 'N/A',
        email: branchData?.email || gymData.email || 'N/A',
      },
      planTitle,
      isTemplate,
      member: {
        id: memberData?.id || chart?.id || planId,
        name: memberData?.name || 'Trainee / Athlete',
        memberCode: memberData?.member_code,
        phone: memberData?.phone,
        level: memberData?.fitness_level || 'Intermediate',
        goal: memberData?.health_goals?.[0] || chart?.name || 'Hypertrophy & Strength',
      },
      dateIssued: new Date().toISOString(),
      trainerName: chart?.created_by_name || 'Strength & Conditioning Coach',
      duration: '8 - 12 Weeks',
      daysPerWeek: days.length,
      trainerNotes: chart?.description || 'Ensure strict eccentric tempo on all working sets. Track your weights daily to enforce progressive overload.',
      days,
    };

    const html = generateExercisePlanHTML(templateData);

    return new NextResponse(html, {
      headers: {
        'Content-Type': 'text/html; charset=utf-8',
        'Content-Disposition': `inline; filename="workout-plan-${planId}.html"`,
      },
    });
  } catch (error) {
    console.error('Failed to generate exercise plan PDF:', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}
