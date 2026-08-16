import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

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
    allowed: (count || 0) < maxMembers,
    current: count || 0,
    max: maxMembers,
    planName,
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
  const features = plan?.features || {};
  
  return {
    allowed: !!features[feature],
    planName: plan?.name || 'Free',
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
