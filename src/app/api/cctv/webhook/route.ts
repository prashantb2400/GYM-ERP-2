import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import crypto from 'crypto';

export async function POST(request: Request) {
  try {
    const authHeader = request.headers.get('Authorization') || request.headers.get('authorization');
    const tokenFromHeader = authHeader?.startsWith('Bearer ') ? authHeader.replace(/^Bearer\s+/i, '').trim() : null;

    const body = await request.json();
    const token = tokenFromHeader || body.token;

    // Verify CCTV auth token
    const expectedToken = process.env.CCTV_AUTH_TOKEN;
    if (!expectedToken) {
      return NextResponse.json({ error: 'CCTV webhook service not configured' }, { status: 503 });
    }
    if (!token) {
      return NextResponse.json({ error: 'Missing authentication token' }, { status: 401 });
    }

    const tokenBuf = Buffer.from(String(token));
    const expectedBuf = Buffer.from(expectedToken);
    const isValid = tokenBuf.length === expectedBuf.length && crypto.timingSafeEqual(tokenBuf, expectedBuf);

    if (!isValid) {
      return NextResponse.json({ error: 'Unauthorized edge handshake' }, { status: 401 });
    }

    const { cameraId, eventType, memberId, confidence, snapshotUrl, fps } = body;

    if (!cameraId || !eventType) {
      return NextResponse.json({ error: 'cameraId and eventType are required' }, { status: 400 });
    }

    // Resolve camera
    const { data: camera, error: camErr } = await supabaseAdmin
      .from('cctv_cameras')
      .select('id, gym_id, branch_id, name, is_active')
      .eq('id', cameraId)
      .maybeSingle();

    if (camErr || !camera) {
      return NextResponse.json({ error: 'Camera record not found' }, { status: 404 });
    }

    const gymId = camera.gym_id;
    const branchId = camera.branch_id;
    const nowIso = new Date().toISOString();
    const todayDate = new Date().toISOString().split('T')[0];

    // Always update camera heartbeat and FPS
    await supabaseAdmin
      .from('cctv_cameras')
      .update({
        status: 'online',
        fps: typeof fps === 'number' ? fps : 15.0,
        last_ping_at: nowIso,
        updated_at: nowIso,
      })
      .eq('id', camera.id);

    // 1. Handle Heartbeat event
    if (eventType === 'heartbeat') {
      return NextResponse.json({
        success: true,
        message: 'Heartbeat acknowledged',
        cameraId: camera.id,
      });
    }

    // 2. Handle Unknown Visitor Detection
    if (eventType === 'unknown_face') {
      const { data: alert, error: alertErr } = await supabaseAdmin
        .from('vigilance_events')
        .insert({
          gym_id: gymId,
          branch_id: branchId,
          camera_id: camera.id,
          event_type: 'unknown_visitor',
          confidence: confidence || 0.0,
          snapshot_url: snapshotUrl || '',
          status: 'unresolved',
          metadata: {
            detected_at: nowIso,
            camera_name: camera.name,
          },
        })
        .select()
        .single();

      if (alertErr) throw alertErr;

      return NextResponse.json({
        success: true,
        type: 'unknown_visitor',
        vigilanceEventId: alert.id,
      });
    }

    // 3. Handle Known Face Match
    if (eventType === 'face_match') {
      if (!memberId) {
        return NextResponse.json({ error: 'memberId required for face_match' }, { status: 400 });
      }

      // Fetch member profile ensuring tenant isolation
      const { data: member, error: memErr } = await supabaseAdmin
        .from('members')
        .select('id, name, phone, status, expiry_date, member_code')
        .eq('id', memberId)
        .eq('gym_id', gymId)
        .maybeSingle();

      if (memErr || !member) {
        return NextResponse.json({ error: 'Member not found' }, { status: 404 });
      }

      let attendanceMarked = false;
      let attendanceRecord = null;

      // Check today's attendance for deduplication
      const { data: existingAttendance } = await supabaseAdmin
        .from('attendance')
        .select('id, check_in_time, method')
        .eq('gym_id', gymId)
        .eq('member_id', member.id)
        .eq('date', todayDate)
        .maybeSingle();

      if (!existingAttendance) {
        // Mark attendance via CCTV fail-safe
        const { data: newAttendance, error: attErr } = await supabaseAdmin
          .from('attendance')
          .insert({
            gym_id: gymId,
            member_id: member.id,
            member_name: member.name,
            date: todayDate,
            check_in_time: nowIso,
            method: 'cctv',
            device_id: camera.id,
            device_name: camera.name,
            confidence: confidence || 0.9,
            snapshot_url: snapshotUrl || null,
          })
          .select()
          .single();

        if (!attErr && newAttendance) {
          attendanceMarked = true;
          attendanceRecord = newAttendance;

          // Update member last_attendance
          await supabaseAdmin
            .from('members')
            .update({
              last_attendance: nowIso,
              updated_at: nowIso,
            })
            .eq('id', member.id);
        }
      }

      // Vigilance Check: Is member expired or defaulting?
      const isExpired = member.status === 'expired' || (member.expiry_date && new Date(member.expiry_date) < new Date());
      let vigilanceEvent: any = null;

      if (isExpired) {
        const { data: expAlert } = await supabaseAdmin
          .from('vigilance_events')
          .insert({
            gym_id: gymId,
            branch_id: branchId,
            camera_id: camera.id,
            event_type: 'expired_member',
            member_id: member.id,
            member_name: member.name,
            confidence: confidence || 0.9,
            snapshot_url: snapshotUrl || '',
            status: 'unresolved',
            metadata: {
              expiry_date: member.expiry_date,
              phone: member.phone,
              member_code: member.member_code,
              detected_at: nowIso,
            },
          })
          .select()
          .single();

        vigilanceEvent = expAlert;
      }

      return NextResponse.json({
        success: true,
        memberId: member.id,
        memberName: member.name,
        attendanceMarked,
        alreadyCheckedIn: Boolean(existingAttendance),
        vigilanceEventId: vigilanceEvent?.id || null,
      });
    }

    return NextResponse.json({ error: `Unsupported eventType: ${eventType}` }, { status: 400 });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'CCTV webhook processing error';
    console.error('CCTV webhook error:', err);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
