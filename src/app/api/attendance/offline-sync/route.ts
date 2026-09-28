/**
 * Offline Attendance Batch Synchronization Route
 *
 * Receives queued attendance events captured during network outages,
 * validates tenant authorization, prevents duplicate daily check-ins,
 * and updates member attendance metrics atomically.
 */

import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { getAuthUser } from '@/lib/server/auth-helper';
import { verifyKioskOrAuth } from '@/lib/server/kiosk-auth';

interface IncomingCheckInEvent {
  localId: string;
  gymId: string;
  memberId: string;
  memberName: string;
  branchId?: string | null;
  method: 'face' | 'fingerprint' | 'qr' | 'manual';
  timestamp: string;
  notes?: string;
}

export async function POST(request: Request) {
  try {
    const authResult = await verifyKioskOrAuth(request);
    if (!authResult.authorized) {
      return authResult.response;
    }

    const callerGymId = authResult.gymId;
    if (!callerGymId) {
      return NextResponse.json({ error: 'No gym associated with request' }, { status: 403 });
    }

    const body = await request.json();
    const { events } = body;

    if (!events || !Array.isArray(events) || events.length === 0) {
      return NextResponse.json({ error: 'Invalid or empty events payload' }, { status: 400 });
    }

    let synced = 0;
    let duplicates = 0;
    let failed = 0;

    for (const event of events as IncomingCheckInEvent[]) {
      try {
        if (!event.memberId || !event.timestamp) {
          failed++;
          continue;
        }

        const eventGymId = event.gymId || callerGymId;

        // Multi-tenant check: ensure event belongs to authorized gym
        if (eventGymId !== callerGymId) {
          failed++;
          continue;
        }

        // Parse date and time from event timestamp
        const eventDate = new Date(event.timestamp);
        const dateStr = !isNaN(eventDate.getTime())
          ? eventDate.toISOString().split('T')[0]
          : new Date().toISOString().split('T')[0];

        const timeStr = !isNaN(eventDate.getTime())
          ? eventDate.toTimeString().split(' ')[0]
          : new Date().toTimeString().split(' ')[0];

        // 1. Prevent duplicate attendance for the same day
        const { data: existing } = await supabaseAdmin
          .from('attendance')
          .select('id')
          .eq('gym_id', eventGymId)
          .eq('member_id', event.memberId)
          .eq('date', dateStr)
          .limit(1)
          .maybeSingle();

        if (existing) {
          duplicates++;
          continue;
        }

        // 2. Insert attendance record
        const { error: insertErr } = await supabaseAdmin
          .from('attendance')
          .insert({
            gym_id: eventGymId,
            branch_id: event.branchId || null,
            member_id: event.memberId,
            member_name: event.memberName || 'Member',
            method: event.method || 'manual',
            date: dateStr,
            check_in_time: timeStr,
            marked_by: 'offline_sync',
            notes: event.notes ? `[Offline Sync] ${event.notes}` : '[Offline Sync]',
          });

        if (insertErr) {
          console.error('Failed to sync offline attendance event:', insertErr);
          failed++;
          continue;
        }

        // 3. Atomically update member attendance count
        const { data: memberData } = await supabaseAdmin
          .from('members')
          .select('attendance_count')
          .eq('gym_id', eventGymId)
          .eq('id', event.memberId)
          .single();

        const currentCount = memberData?.attendance_count || 0;

        await supabaseAdmin
          .from('members')
          .update({
            attendance_count: currentCount + 1,
            last_attendance: event.timestamp,
          })
          .eq('gym_id', eventGymId)
          .eq('id', event.memberId);

        synced++;
      } catch (itemErr) {
        console.error('Error processing offline attendance record:', itemErr);
        failed++;
      }
    }

    return NextResponse.json({
      success: true,
      total: events.length,
      synced,
      duplicates,
      failed,
    });
  } catch (error: any) {
    console.error('Offline attendance batch sync failed:', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
