import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { getAuthUser } from '@/lib/server/auth-helper';

export async function GET(request: Request) {
  try {
    const { user, error: authErr } = await getAuthUser(request);
    if (!user || authErr) {
      return NextResponse.json({ error: authErr || 'Unauthorized' }, { status: 401 });
    }

    // Resolve gym_id
    const { data: userData } = await supabaseAdmin
      .from('users')
      .select('gym_id, branch_id, role')
      .eq('auth_id', user.id)
      .maybeSingle();

    let gymId = userData?.gym_id;
    if (!gymId) {
      const { data: ownedGym } = await supabaseAdmin
        .from('gyms')
        .select('id')
        .eq('owner_id', user.id)
        .maybeSingle();
      gymId = ownedGym?.id;
    }

    if (!gymId) {
      return NextResponse.json({ error: 'No gym workspace found' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const branchId = searchParams.get('branchId') || userData?.branch_id;

    let query = supabaseAdmin
      .from('cctv_cameras')
      .select('*, branches(id, name)')
      .eq('gym_id', gymId)
      .order('created_at', { ascending: true });

    if (branchId && branchId !== 'all') {
      query = query.or(`branch_id.eq.${branchId},branch_id.is.null`);
    }

    const { data: cameras, error: camErr } = await query;
    if (camErr) throw camErr;

    return NextResponse.json({
      success: true,
      cameras: cameras || [],
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Failed to fetch cameras';
    console.error('Fetch CCTV cameras error:', err);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const { user, error: authErr } = await getAuthUser(request);
    if (!user || authErr) {
      return NextResponse.json({ error: authErr || 'Unauthorized' }, { status: 401 });
    }

    // Resolve gym_id
    const { data: userData } = await supabaseAdmin
      .from('users')
      .select('gym_id, branch_id, role')
      .eq('auth_id', user.id)
      .maybeSingle();

    let gymId = userData?.gym_id;
    if (!gymId) {
      const { data: ownedGym } = await supabaseAdmin
        .from('gyms')
        .select('id')
        .eq('owner_id', user.id)
        .maybeSingle();
      gymId = ownedGym?.id;
    }

    if (!gymId) {
      return NextResponse.json({ error: 'No gym workspace found' }, { status: 403 });
    }

    const body = await request.json();
    const { name, rtspUrl, location, branchId, settings } = body;

    if (!name || !rtspUrl) {
      return NextResponse.json(
        { error: 'Camera name and RTSP stream URL are required' },
        { status: 400 }
      );
    }

    // Clean RTSP URL
    const cleanUrl = String(rtspUrl).trim();
    if (!cleanUrl.startsWith('rtsp://') && !cleanUrl.startsWith('rtsps://') && !cleanUrl.startsWith('http://') && !cleanUrl.startsWith('https://')) {
      return NextResponse.json(
        { error: 'Stream URL must start with rtsp://, rtsps://, or http(s)://' },
        { status: 400 }
      );
    }

    const { data: newCamera, error: insertErr } = await supabaseAdmin
      .from('cctv_cameras')
      .insert({
        gym_id: gymId,
        branch_id: branchId || null,
        name: String(name).trim(),
        rtsp_url: cleanUrl,
        location: location ? String(location).trim() : 'Main Entrance',
        status: 'offline',
        is_active: true,
        fps: 0.0,
        settings: settings || {
          motion_threshold: 0.5,
          face_detection: true,
          record_attendance: true,
        },
      })
      .select('*, branches(id, name)')
      .single();

    if (insertErr) throw insertErr;

    return NextResponse.json({
      success: true,
      camera: newCamera,
      message: 'CCTV camera added successfully',
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Failed to create camera';
    console.error('Create CCTV camera error:', err);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
