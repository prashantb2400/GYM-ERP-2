import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { checkRateLimit, getClientIp } from '@/lib/server/rate-limit';
import { verifyKioskOrAuth } from '@/lib/server/kiosk-auth';
import { validateBody } from '@/lib/server/validate';
import { kioskTodayWorkoutSchema } from '@/lib/schemas/kiosk';
import { getTodayWorkoutForMember } from '@/lib/workout/checkin-dispatcher';
import { formatTodayWorkoutVoice } from '@/lib/kiosk/voice-intent';

export async function GET(request: Request) {
  try {
    const ip = getClientIp(request);
    const rl = checkRateLimit(`kiosk-workout:${ip}`, 60, 60);
    if (!rl.allowed) {
      return NextResponse.json(
        { error: 'Too many workout query requests. Please wait a moment.' },
        { status: 429, headers: { 'Retry-After': String(rl.retryAfter || 60) } }
      );
    }

    const { searchParams } = new URL(request.url);
    const gymId = searchParams.get('gymId');
    const memberId = searchParams.get('memberId');

    if (!gymId || !memberId) {
      return NextResponse.json(
        { error: 'Both gymId and memberId query parameters are required.' },
        { status: 400 }
      );
    }

    // Verify kiosk hardware or authenticated session
    const authResult = await verifyKioskOrAuth(request, gymId);
    if (!authResult.authorized) {
      return authResult.response;
    }

    return await handleWorkoutQuery(gymId, memberId);
  } catch (err: any) {
    console.error('Kiosk today-workout GET error:', err);
    return NextResponse.json({ error: err.message || 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const ip = getClientIp(request);
    const rl = checkRateLimit(`kiosk-workout:${ip}`, 60, 60);
    if (!rl.allowed) {
      return NextResponse.json(
        { error: 'Too many workout query requests. Please wait a moment.' },
        { status: 429, headers: { 'Retry-After': String(rl.retryAfter || 60) } }
      );
    }

    const validation = await validateBody(request, kioskTodayWorkoutSchema);
    if (!validation.success) {
      return validation.response;
    }

    const { gymId, memberId } = validation.data;

    // Verify kiosk hardware or authenticated session
    const authResult = await verifyKioskOrAuth(request, gymId);
    if (!authResult.authorized) {
      return authResult.response;
    }

    return await handleWorkoutQuery(gymId, memberId);
  } catch (err: any) {
    console.error('Kiosk today-workout POST error:', err);
    return NextResponse.json({ error: err.message || 'Internal server error' }, { status: 500 });
  }
}

async function handleWorkoutQuery(gymId: string, memberId: string) {
  // Query member to verify identity and get their name
  const { data: member, error: mErr } = await supabaseAdmin
    .from('members')
    .select('id, name, member_code, gym_id')
    .eq('id', memberId)
    .eq('gym_id', gymId)
    .maybeSingle();

  if (mErr || !member) {
    return NextResponse.json(
      { error: 'Member not found or does not belong to this gym.' },
      { status: 404 }
    );
  }

  // Resolve today's scheduled split from assigned routine or starter template
  const workout = await getTodayWorkoutForMember(member.id, gymId);

  if (!workout) {
    return NextResponse.json({
      success: true,
      memberId: member.id,
      memberName: member.name,
      routineName: 'General Fitness',
      dayName: 'Full Body Conditioning',
      exerciseCount: 0,
      exercises: [],
      firstExercise: null,
      voicePrompt: `Hey ${member.name}, you have a rest day scheduled today. Stay hydrated and recharge!`,
    });
  }

  const firstExercise =
    workout.exercises?.[0]?.exerciseName ||
    workout.exercises?.[0]?.name ||
    undefined;

  const exerciseCount = workout.exercises?.length || 0;

  const voicePrompt = formatTodayWorkoutVoice(
    member.name,
    workout.routineName,
    workout.dayName,
    exerciseCount,
    firstExercise
  );

  return NextResponse.json({
    success: true,
    memberId: member.id,
    memberName: member.name,
    routineName: workout.routineName,
    dayName: workout.dayName,
    exerciseCount,
    exercises: workout.exercises || [],
    firstExercise: firstExercise || null,
    voicePrompt,
  });
}
