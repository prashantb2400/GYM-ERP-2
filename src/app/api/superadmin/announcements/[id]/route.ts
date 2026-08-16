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

    const { data, error } = await supabaseAdmin
      .from('platform_announcements')
      .update(body)
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
