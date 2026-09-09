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

    // Get gym details with owner and subscription
    const { data: gym, error } = await supabaseAdmin
      .from('gyms')
      .select(`
        *,
        users!gyms_owner_id_fkey (*),
        platform_subscriptions (
          *,
          platform_plans (*)
        ),
        platform_invoices (*)
      `)
      .eq('id', id)
      .single();

    if (error) throw error;
    if (!gym) return NextResponse.json({ error: 'Gym not found' }, { status: 404 });

    // Get counts
    const { count: memberCount } = await supabaseAdmin
      .from('members')
      .select('id', { count: 'exact', head: true })
      .eq('gym_id', id);

    const { count: staffCount } = await supabaseAdmin
      .from('users')
      .select('id', { count: 'exact', head: true })
      .eq('gym_id', id)
      .in('role', ['receptionist', 'trainer']);

    return NextResponse.json({
      ...gym,
      member_count: memberCount || 0,
      staff_count: staffCount || 0
    });
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
    
    // Check if we're suspending/reactivating
    if (body.is_suspended !== undefined) {
      // Update gym
      await supabaseAdmin
        .from('gyms')
        .update({ is_suspended: body.is_suspended })
        .eq('id', id);

      // Update subscription status
      const status = body.is_suspended ? 'suspended' : 'active';
      await supabaseAdmin
        .from('platform_subscriptions')
        .update({ status })
        .eq('gym_id', id);
        
      return NextResponse.json({ success: true, message: 'Status updated' });
    }

    // Check if we're changing plan
    if (body.platform_plan_id !== undefined) {
      // Update gym
      await supabaseAdmin
        .from('gyms')
        .update({ platform_plan_id: body.platform_plan_id })
        .eq('id', id);

      // Update subscription
      await supabaseAdmin
        .from('platform_subscriptions')
        .update({ plan_id: body.platform_plan_id })
        .eq('gym_id', id);

      return NextResponse.json({ success: true, message: 'Plan updated' });
    }
    
    // Extend trial or other updates
    if (body.extend_trial_days) {
      const { data: sub } = await supabaseAdmin
        .from('platform_subscriptions')
        .select('current_period_end')
        .eq('gym_id', id)
        .single();
        
      if (sub) {
        const endDate = new Date(sub.current_period_end);
        endDate.setDate(endDate.getDate() + body.extend_trial_days);
        
        await supabaseAdmin
          .from('platform_subscriptions')
          .update({ current_period_end: endDate.toISOString(), status: 'trialing' })
          .eq('gym_id', id);
          
        return NextResponse.json({ success: true, message: 'Trial extended' });
      }
    }

    return NextResponse.json({ error: 'Invalid update payload' }, { status: 400 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
