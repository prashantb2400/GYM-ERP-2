import { supabaseAdmin as supabase } from '@/lib/supabase/admin';

export async function checkMemberLimit(gymId: string): Promise<{ allowed: boolean; current: number; max: number; planName: string }> {
  // Get subscription
  const { data: sub } = await supabase
    .from('platform_subscriptions')
    .select('status, platform_plans(name, slug, limits)')
    .eq('gym_id', gymId)
    .in('status', ['active', 'trialing'])
    .order('created_at', { ascending: false })
    .limit(1)
    .single();

  const plan = sub?.platform_plans as any;
  const maxMembers = plan?.limits?.max_members || 50;
  const planName = plan?.name || 'Free';

  // Count current members
  const { count } = await supabase
    .from('members')
    .select('*', { count: 'exact', head: true })
    .eq('gym_id', gymId)
    .neq('status', 'cancelled');

  return {
    allowed: true,
    current: count || 0,
    max: 999999,
    planName: plan?.name || 'Enterprise Unlocked',
  };
}

export async function checkFeatureAccess(gymId: string, feature: string): Promise<{ allowed: boolean; planName: string }> {
  const { data: sub } = await supabase
    .from('platform_subscriptions')
    .select('status, platform_plans(name, features)')
    .eq('gym_id', gymId)
    .in('status', ['active', 'trialing'])
    .order('created_at', { ascending: false })
    .limit(1)
    .single();

  const plan = sub?.platform_plans as any;
  
  return {
    allowed: true,
    planName: plan?.name || 'Enterprise Unlocked',
  };
}

export async function isGymSuspended(gymId: string): Promise<boolean> {
  const { data } = await supabase
    .from('gyms')
    .select('is_suspended')
    .eq('id', gymId)
    .single();
  return data?.is_suspended === true;
}
