'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { PlanFeatures, PlanLimits, PlatformPlan, PlatformSubscription } from '@/lib/platform/types';

export function usePlanFeatures() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [plan, setPlan] = useState<PlatformPlan | null>(null);
  const [subscription, setSubscription] = useState<PlatformSubscription | null>(null);
  
  useEffect(() => {
    let isMounted = true;
    
    async function loadPlanData() {
      if (!user?.gymId) {
        setLoading(false);
        return;
      }
      
      const supabase = createClient();
      
      try {
        const { data: gymData, error: gymError } = await supabase
          .from('gyms')
          .select('platform_plan_id')
          .eq('id', user.gymId)
          .single();
          
        if (gymError || !gymData?.platform_plan_id) throw new Error('No plan ID');
        
        const { data: planData, error: planError } = await supabase
          .from('platform_plans')
          .select('*')
          .eq('id', gymData.platform_plan_id)
          .single();
          
        if (planError || !planData) throw new Error('No plan data');
        
        const { data: subData } = await supabase
          .from('platform_subscriptions')
          .select('*')
          .eq('gym_id', user.gymId)
          .order('created_at', { ascending: false })
          .limit(1)
          .single();
          
        if (isMounted) {
          setPlan(planData as PlatformPlan);
          setSubscription(subData as PlatformSubscription || null);
          setLoading(false);
        }
      } catch (err) {
        console.error('Error loading plan features:', err);
        if (isMounted) setLoading(false);
      }
    }
    
    loadPlanData();
    return () => { isMounted = false; };
  }, [user?.gymId]);

  const canUse = (feature: keyof PlanFeatures): boolean => {
    if (!plan) return false;
    return !!plan.features[feature];
  };
  
  const getLimit = (limitKey: keyof PlanLimits): number => {
    if (!plan) return 0;
    return plan.limits[limitKey] || 0;
  };
  
  const isTrialing = subscription?.status === 'trialing';
  
  let daysLeft = 0;
  if (isTrialing && subscription?.trial_end) {
    const end = new Date(subscription.trial_end).getTime();
    const now = new Date().getTime();
    daysLeft = Math.max(0, Math.ceil((end - now) / (1000 * 60 * 60 * 24)));
  }

  return {
    canUse,
    getLimit,
    plan,
    subscription,
    isTrialing,
    daysLeft,
    loading
  };
}
