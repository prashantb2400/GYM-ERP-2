import { NextResponse } from 'next/server';
import { generateDietAndExerciseBlueprint, MemberFitnessProfile } from '@/lib/server/llm';
import { supabaseAdmin } from '@/lib/supabase/admin';

import { checkRateLimit, getClientIp } from '@/lib/server/rate-limit';

export async function POST(request: Request) {
  try {
    const ip = getClientIp(request);
    const rl = checkRateLimit(`kiosk-blueprint:${ip}`, 15, 60);
    if (!rl.allowed) {
      return NextResponse.json(
        { error: 'Rate limit exceeded for AI blueprint generation. Please wait.' },
        { status: 429, headers: { 'Retry-After': String(rl.retryAfter || 60) } }
      );
    }

    const { profile, memberId, gymId } = await request.json();

    if (!profile || !gymId) {
      return NextResponse.json({ error: 'Missing profile or gymId' }, { status: 400 });
    }

    // Optional kiosk device token verification
    const deviceToken = request.headers.get('x-device-token');
    if (deviceToken) {
      const { data: dev } = await supabaseAdmin
        .from('kiosk_devices')
        .select('id, status')
        .eq('device_token', deviceToken)
        .eq('gym_id', gymId)
        .eq('status', 'active')
        .maybeSingle();

      if (!dev) {
        return NextResponse.json({ error: 'Unauthorized kiosk terminal' }, { status: 401 });
      }
    }

    // 1. Generate blueprint (using secret server LLM or calibrated rules)
    const blueprint = await generateDietAndExerciseBlueprint(profile);

    let dietChartId: string | null = null;
    let exerciseChartId: string | null = null;

    // 2. Persist to diet_charts table
    try {
      const { data: dietData } = await supabaseAdmin
        .from('diet_charts')
        .insert({
          gym_id: gymId,
          name: blueprint.dietPlan.name,
          description: blueprint.dietPlan.description,
          meals: blueprint.dietPlan.meals,
          target_calories: blueprint.caloricTarget,
          is_template: false,
        })
        .select('id')
        .single();

      if (dietData?.id) {
        dietChartId = dietData.id;
      }
    } catch (dErr) {
      console.warn('Diet chart insert warning:', dErr);
    }

    // 3. Persist to exercise_charts table
    try {
      const { data: exerciseData } = await supabaseAdmin
        .from('exercise_charts')
        .insert({
          gym_id: gymId,
          name: blueprint.workoutPlan.name,
          description: blueprint.workoutPlan.description,
          days: blueprint.workoutPlan.days,
          is_template: false,
        })
        .select('id')
        .single();

      if (exerciseData?.id) {
        exerciseChartId = exerciseData.id;
      }
    } catch (eErr) {
      console.warn('Exercise chart insert warning:', eErr);
    }

    // 4. Update member with chart IDs if memberId exists
    if (memberId && (dietChartId || exerciseChartId)) {
      await supabaseAdmin
        .from('members')
        .update({
          diet_chart_id: dietChartId || null,
          exercise_chart_id: exerciseChartId || null,
        })
        .eq('id', memberId)
        .eq('gym_id', gymId);
    }

    return NextResponse.json({
      success: true,
      blueprint,
      dietChartId,
      exerciseChartId,
    });
  } catch (err: any) {
    console.error('Blueprint generation API error:', err);
    return NextResponse.json(
      { error: err.message || 'Failed to generate fitness blueprint' },
      { status: 500 }
    );
  }
}
