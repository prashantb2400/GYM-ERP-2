import { supabaseAdmin } from '@/lib/supabase/admin';
import { PlanFeatures, PlanLimits, PlatformPlan, PlatformSubscription } from './types';

export async function getGymPlanDetails(gymId: string): Promise<{
  plan: PlatformPlan | null;
  subscription: PlatformSubscription | null;
  features: PlanFeatures | null;
  limits: PlanLimits | null;
}> {
  const { data: gymData, error: gymError } = await supabaseAdmin
    .from('gyms')
    .select('platform_plan_id')
    .eq('id', gymId)
    .single();

  if (gymError || !gymData?.platform_plan_id) {
    return { plan: null, subscription: null, features: null, limits: null };
  }

  const { data: planData, error: planError } = await supabaseAdmin
    .from('platform_plans')
    .select('*')
    .eq('id', gymData.platform_plan_id)
    .single();

  if (planError || !planData) {
    return { plan: null, subscription: null, features: null, limits: null };
  }

  const { data: subData, error: subError } = await supabaseAdmin
    .from('platform_subscriptions')
    .select('*')
    .eq('gym_id', gymId)
    .order('created_at', { ascending: false })
    .limit(1)
    .single();

  return {
    plan: planData as PlatformPlan,
    subscription: (subData as PlatformSubscription) || null,
    features: planData.features as PlanFeatures,
    limits: planData.limits as PlanLimits,
  };
}

export async function checkFeature(gymId: string, feature: keyof PlanFeatures): Promise<boolean> {
  const { features } = await getGymPlanDetails(gymId);
  if (!features) return false;
  return !!features[feature];
}

export async function checkLimit(gymId: string, limitKey: keyof PlanLimits, currentUsage: number): Promise<boolean> {
  const { limits } = await getGymPlanDetails(gymId);
  if (!limits) return false;
  
  const limitValue = limits[limitKey];
  // -1 usually implies unlimited
  if (limitValue === -1) return true;
  
  return currentUsage < limitValue;
}
