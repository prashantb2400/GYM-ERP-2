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
    const { status, current_period_end, cancel_reason } = body;

    const updates: any = {};
    if (status !== undefined) updates.status = status;
    if (current_period_end !== undefined) updates.current_period_end = current_period_end;
    if (cancel_reason !== undefined) {
      updates.cancel_reason = cancel_reason;
      updates.canceled_at = new Date().toISOString();
    }

    const { data, error } = await supabaseAdmin
      .from('platform_subscriptions')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    
    return NextResponse.json(data);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
