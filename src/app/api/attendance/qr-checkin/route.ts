import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { createClient } from '@/lib/supabase/server';
import { isSuperAdmin } from '@/lib/platform/auth';
import { checkRateLimit, getClientIp } from '@/lib/server/rate-limit';
import { getBranchScope, isBranchScopeError } from '@/lib/server/branch-scope';

export async function POST(request: Request) {
  try {
    const ip = getClientIp(request);
    const rl = checkRateLimit(`qr-checkin:${ip}`, 60, 60);
    if (!rl.allowed) {
      return NextResponse.json(
        { error: 'Too many requests. Please slow down.' },
        { status: 429, headers: { 'Retry-After': String(rl.retryAfter || 60) } }
      );
    }

    // 1. Verify the caller is an authenticated staff/owner
    const supabase = await createClient();
    const { data: { user: sessionUser } } = await supabase.auth.getUser();
    if (!sessionUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { qrToken, gymId: requestedGymId, branchId: requestedBranchId } = await request.json();

    if (!qrToken) {
      return NextResponse.json({ error: 'Missing qrToken' }, { status: 400 });
    }

    // Tenant & Branch isolation: resolve scope from caller's account
    const scope = await getBranchScope(sessionUser.id, {
      requestedGymId,
      requestedBranchId,
    });

    if (isBranchScopeError(scope)) {
      return NextResponse.json({ error: scope.error }, { status: scope.status });
    }

    const gymId = scope.gymId;

    // 2. Look up the member by qr_token + gym_id
    const { data: member, error: memberErr } = await supabaseAdmin
      .from('members')
      .select('id, name, member_code, status, photo_url, attendance_count, branch_id')
      .eq('gym_id', gymId)
      .eq('qr_token', qrToken)
      .single();

    if (memberErr || !member) {
      return NextResponse.json({ error: 'Member not found. Invalid QR code.' }, { status: 404 });
    }

    // Verify branch confinement: staff can only check in members assigned to their branch
    if (scope.branchId && member.branch_id && member.branch_id !== scope.branchId) {
      return NextResponse.json({
        error: 'Access denied: Member is registered at another branch',
        member_name: member.name,
        status: member.status,
      }, { status: 403 });
    }

    if (member.status !== 'active') {
      return NextResponse.json({
        error: `Membership is ${member.status}`,
        member_name: member.name,
        member_photo: member.photo_url,
        status: member.status,
      }, { status: 403 });
    }

    const todayString = new Date().toISOString().split('T')[0];

    // 3. Check if already checked in today
    const { data: existing } = await supabaseAdmin
      .from('attendance')
      .select('id')
      .eq('gym_id', gymId)
      .eq('member_id', member.id)
      .eq('date', todayString)
      .single();

    if (existing) {
      return NextResponse.json({
        success: true,
        already_marked: true,
        message: 'Already checked in today',
        member_name: member.name,
        member_photo: member.photo_url,
        member_code: member.member_code,
      });
    }

    // 4. Insert attendance record
    const { error: insertErr } = await supabaseAdmin
      .from('attendance')
      .insert({
        gym_id: gymId,
        branch_id: scope.branchId || member.branch_id || null,
        member_id: member.id,
        member_name: member.name,
        date: todayString,
        method: 'qr_scan',
        notes: 'Check-in via QR code kiosk',
      });

    if (insertErr) throw insertErr;

    // 5. Update member attendance stats
    await supabaseAdmin
      .from('members')
      .update({
        attendance_count: (member.attendance_count || 0) + 1,
        last_attendance: new Date().toISOString(),
      })
      .eq('id', member.id);

    return NextResponse.json({
      success: true,
      already_marked: false,
      member_name: member.name,
      member_photo: member.photo_url,
      member_code: member.member_code,
      checked_in_at: new Date().toLocaleTimeString('en-IN'),
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'An unknown error occurred';
    console.error('QR Check-in API failure:', err);
    return NextResponse.json({ error: msg || 'Internal check-in failure' }, { status: 500 });
  }
}
