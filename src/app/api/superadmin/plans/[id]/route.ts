import { NextResponse } from 'next/server';
import { requireSuperAdmin } from '@/lib/platform/auth';
import { supabaseAdmin } from '@/lib/supabase/admin';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const authCheck = await requireSuperAdmin(request);
  if (authCheck instanceof Response) return authCheck;

  try {
    const { id } = await params;
    
    // Get plan details
    const { data: plan, error: planError } = await supabaseAdmin
      .from('platform_plans')
      .select('*')
      .eq('id', id)
      .single();

    if (planError) throw planError;
    if (!plan) return NextResponse.json({ error: 'Plan not found' }, { status: 404 });

    // Get active subscriptions count
    const { count, error: countError } = await supabaseAdmin
      .from('platform_subscriptions')
      .select('id', { count: 'exact', head: true })
      .eq('plan_id', id)
      .eq('status', 'active');

    if (countError) throw countError;

    return NextResponse.json({ ...plan, subscriber_count: count || 0 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

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
      .from('platform_plans')
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
    
    // Check for active subscriptions
    const { count, error: countError } = await supabaseAdmin
      .from('platform_subscriptions')
      .select('id', { count: 'exact', head: true })
      .eq('plan_id', id)
      .eq('status', 'active');

    if (countError) throw countError;
    
    if (count && count > 0) {
      return NextResponse.json(
        { error: 'Cannot delete plan with active subscriptions' },
        { status: 400 }
      );
    }

    // Soft delete
    const { data, error } = await supabaseAdmin
      .from('platform_plans')
      .update({ is_active: false })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    
    return NextResponse.json(data);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
