/**
 * Attendance Check-In Workout Routine Dispatcher
 * Automatically formats and dispatches the member's scheduled workout
 * split to their WhatsApp when they scan/check in at the gym.
 */

import { supabaseAdmin } from '@/lib/supabase/admin';
import { getWhatsAppProvider } from '@/lib/whatsapp/factory';
import { STARTER_ROUTINES } from '@/lib/workout/exercise-types';

export interface CheckinDispatchOptions {
  memberId: string;
  gymId: string;
  memberName: string;
  phone?: string | null;
  checkinMethod?: string;
}

export interface CheckinDispatchResult {
  dispatched: boolean;
  routineName?: string;
  reason?: string;
}

/**
 * Returns the workout routine day appropriate for today's day of week.
 */
export function selectDayByDayOfWeek(days: any[]): any {
  if (!days || days.length === 0) return null;
  const dayOfWeek = new Date().getDay(); // 0 is Sunday, 1 is Monday ... 6 is Saturday
  // Map day of week to routine index (Mon=0, Tue=1, Wed=2, Thu=0, Fri=1, Sat=2, Sun=0)
  const mappedIndex = dayOfWeek === 0 ? 0 : (dayOfWeek - 1) % days.length;
  return days[mappedIndex] || days[0];
}

/**
 * Formats a workout routine into an interactive WhatsApp message.
 */
export function formatWorkoutMessage(
  routineName: string,
  dayName: string,
  exercises: any[],
  memberName: string,
  appUrl: string = process.env.NEXT_PUBLIC_APP_URL || 'https://gymerp.live'
): string {
  const greeting = `🏋️‍♂️ *Welcome to the Gym, ${memberName}!*`;
  const routineHeader = `Today's Split: *${routineName}*\nSession: *${dayName}*`;

  const exerciseLines = (exercises || [])
    .map((ex, idx) => {
      const name = ex.exerciseName || ex.name || 'Exercise';
      const sets = ex.sets || 3;
      const reps = ex.reps || '8-12';
      const rest = ex.restSeconds || ex.rest_seconds || 90;
      return `${idx + 1}. *${name}* - ${sets} sets x ${reps} reps (${rest}s rest)`;
    })
    .join('\n');

  const companionLink = `📲 *Log sets & calculate plates on your phone:*\n${appUrl}/member/exercise`;
  const footer = `Crush your session today! 💪🔥`;

  return `${greeting}\n\n${routineHeader}\n\n📋 *Today's Exercises:*\n${exerciseLines}\n\n${companionLink}\n\n${footer}`;
}

/**
 * Resolves the member's active workout routine or starter template.
 */
export async function getTodayWorkoutForMember(memberId: string, gymId: string): Promise<{
  routineName: string;
  dayName: string;
  exercises: any[];
} | null> {
  try {
    // 1. Check for member-assigned routine
    const { data: assignment } = await supabaseAdmin
      .from('member_assigned_routines')
      .select('*, workout_routines(*)')
      .eq('gym_id', gymId)
      .eq('member_id', memberId)
      .eq('active', true)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (assignment?.workout_routines?.days && Array.isArray(assignment.workout_routines.days)) {
      const targetDay = selectDayByDayOfWeek(assignment.workout_routines.days);
      if (targetDay) {
        return {
          routineName: assignment.workout_routines.name,
          dayName: targetDay.dayName || targetDay.name || 'Today\'s Split',
          exercises: targetDay.exercises || [],
        };
      }
    }

    // 2. Check for custom gym routines
    const { data: customRoutines } = await supabaseAdmin
      .from('workout_routines')
      .select('*')
      .eq('gym_id', gymId)
      .order('created_at', { ascending: false })
      .limit(1);

    if (customRoutines && customRoutines.length > 0 && Array.isArray(customRoutines[0].days)) {
      const routine = customRoutines[0];
      const targetDay = selectDayByDayOfWeek(routine.days);
      if (targetDay) {
        return {
          routineName: routine.name,
          dayName: targetDay.dayName || targetDay.name || 'Today\'s Split',
          exercises: targetDay.exercises || [],
        };
      }
    }

    // 3. Fallback to Starter PPL routine
    const starter = STARTER_ROUTINES[0];
    const starterDay = selectDayByDayOfWeek(starter.days);
    return {
      routineName: starter.name,
      dayName: starterDay.dayName,
      exercises: starterDay.exercises,
    };
  } catch (err) {
    console.warn('Error fetching member workout for check-in dispatch:', err);
    return null;
  }
}

/**
 * Dispatches today's workout split to the member via WhatsApp upon check-in.
 * Executes safely without throwing errors.
 */
export async function dispatchCheckinWorkoutRoutine(
  options: CheckinDispatchOptions
): Promise<CheckinDispatchResult> {
  const { memberId, gymId, memberName, phone } = options;

  if (!phone) {
    return { dispatched: false, reason: 'Member has no phone number recorded' };
  }

  try {
    const workout = await getTodayWorkoutForMember(memberId, gymId);
    if (!workout || !workout.exercises || workout.exercises.length === 0) {
      return { dispatched: false, reason: 'No workout exercises resolved' };
    }

    const messageText = formatWorkoutMessage(
      workout.routineName,
      workout.dayName,
      workout.exercises,
      memberName
    );

    const provider = await getWhatsAppProvider(gymId);
    const cleanPhone = phone.replace(/\D/g, '');
    const standardPhone = cleanPhone.length === 10 ? `91${cleanPhone}` : cleanPhone;

    await provider.sendText(standardPhone, messageText, gymId, memberId);

    return {
      dispatched: true,
      routineName: `${workout.routineName} (${workout.dayName})`,
    };
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : 'Failed to dispatch WhatsApp workout';
    console.warn('Check-in workout dispatch error (non-fatal):', errorMsg);
    return {
      dispatched: false,
      reason: errorMsg,
    };
  }
}
