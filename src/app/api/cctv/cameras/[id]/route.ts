import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { getAuthUser } from '@/lib/server/auth-helper';

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { user, error: authErr } = await getAuthUser(request);
    if (!user || authErr) {
      return NextResponse.json({ error: authErr || 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const updateData: Record<string, any> = {
      updated_at: new Date().toISOString(),
    };

    if (body.name !== undefined) updateData.name = String(body.name).trim();
    if (body.rtspUrl !== undefined) updateData.rtsp_url = String(body.rtspUrl).trim();
    if (body.location !== undefined) updateData.location = String(body.location).trim();
    if (body.branchId !== undefined) updateData.branch_id = body.branchId || null;
    if (body.isActive !== undefined) updateData.is_active = Boolean(body.isActive);
    if (body.status !== undefined) updateData.status = body.status;
    if (body.settings !== undefined) updateData.settings = body.settings;

    const { data: updated, error: updErr } = await supabaseAdmin
      .from('cctv_cameras')
      .update(updateData)
      .eq('id', id)
      .select('*, branches(id, name)')
      .single();

    if (updErr) throw updErr;

    return NextResponse.json({
      success: true,
      camera: updated,
      message: 'Camera updated successfully',
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Failed to update camera';
    console.error('Update CCTV camera error:', err);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { user, error: authErr } = await getAuthUser(request);
    if (!user || authErr) {
      return NextResponse.json({ error: authErr || 'Unauthorized' }, { status: 401 });
    }

    const { error: delErr } = await supabaseAdmin
      .from('cctv_cameras')
      .delete()
      .eq('id', id);

    if (delErr) throw delErr;

    return NextResponse.json({
      success: true,
      message: 'Camera deleted successfully',
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Failed to delete camera';
    console.error('Delete CCTV camera error:', err);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
