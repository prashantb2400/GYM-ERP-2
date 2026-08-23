import { NextResponse } from 'next/server';
import { requireSuperAdmin } from '@/lib/platform/auth';
import { supabaseAdmin } from '@/lib/supabase/admin';

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const authCheck = await requireSuperAdmin(request);
  if (authCheck instanceof Response) return authCheck;

  try {
    const { id } = await params;
    const body = await request.json();

    // H-17 FIX: Whitelist allowed fields to prevent mass assignment of protected DB columns
    const allowed = ['title', 'content', 'type', 'is_active', 'target_gym_ids', 'expires_at'];
    const safeUpdate: Record<string, unknown> = {};
    for (const key of allowed) {
      if (key in body) safeUpdate[key] = body[key];
    }

    if (Object.keys(safeUpdate).length === 0) {
      return NextResponse.json({ error: 'No valid fields to update' }, { status: 400 });
    }

    const { data, error } = await supabaseAdmin
      .from('platform_announcements')
      .update(safeUpdate)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    
    return NextResponse.json(data);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const authCheck = await requireSuperAdmin(request);
  if (authCheck instanceof Response) return authCheck;

  try {
    const { id } = await params;

    const { error } = await supabaseAdmin
      .from('platform_announcements')
      .delete()
      .eq('id', id);

    if (error) throw error;
    
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
