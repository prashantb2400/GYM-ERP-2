'use client';
import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useAuth } from '@/hooks/useAuth';

interface PlanLimits {
  planName: string;
  planSlug: string;
  maxMembers: number;
  maxStaff: number;
  features: {
    whatsapp: boolean;
    cctv: boolean;
    biometrics: boolean;
    analytics: boolean;
    leads: boolean;
    customBranding: boolean;
  };
  usage: {
    currentMembers: number;
    currentStaff: number;
  };
  isTrialing: boolean;
  trialEndsAt: string | null;
  subscriptionStatus: string;
  canAddMember: boolean;
  canAddStaff: boolean;
  canUseWhatsApp: boolean;
  canUseCCTV: boolean;
  loading: boolean;
}

export function usePlanLimits(): PlanLimits {
  const { user } = useAuth();
  const supabase = createClient();
  const [limits, setLimits] = useState<PlanLimits>({
    planName: 'Free',
    planSlug: 'free',
    maxMembers: 50,
    maxStaff: 1,
    features: { whatsapp: false, cctv: false, biometrics: false, analytics: false, leads: false, customBranding: false },
    usage: { currentMembers: 0, currentStaff: 0 },
    isTrialing: false,
    trialEndsAt: null,
    subscriptionStatus: 'active',
    canAddMember: true,
    canAddStaff: true,
    canUseWhatsApp: false,
    canUseCCTV: false,
    loading: true,
  });

  useEffect(() => {
    if (!user?.gymId) return;
    
    const fetchLimits = async () => {
      // 1. Get platform subscription + plan for this gym
      const { data: sub } = await supabase
        .from('platform_subscriptions')
        .select('*, platform_plans(*)')
        .eq('gym_id', user.gymId)
        .in('status', ['active', 'trialing'])
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      // 2. Get current usage counts
      const { count: memberCount } = await supabase
        .from('members')
        .select('*', { count: 'exact', head: true })
        .eq('gym_id', user.gymId)
        .neq('status', 'cancelled');

      const { count: staffCount } = await supabase
        .from('users')
        .select('*', { count: 'exact', head: true })
        .eq('gym_id', user.gymId)
        .in('role', ['receptionist', 'trainer'])
        .eq('is_active', true);

      const plan = sub?.platform_plans as any;
      const planLimits = plan?.limits || {};
      const planFeatures = plan?.features || {};
      
      const maxMembers = planLimits.max_members || 50;
      const maxStaff = planLimits.max_staff || 1;
      const currentMembers = memberCount || 0;
      const currentStaff = staffCount || 0;

      setLimits({
        planName: plan?.name || 'Free',
        planSlug: plan?.slug || 'free',
        maxMembers,
        maxStaff,
        features: {
          whatsapp: planFeatures.whatsapp || false,
          cctv: planFeatures.cctv || false,
          biometrics: planFeatures.biometrics || false,
          analytics: planFeatures.analytics || true,
          leads: planFeatures.leads || false,
          customBranding: planFeatures.custom_branding || false,
        },
        usage: { currentMembers, currentStaff },
        isTrialing: sub?.status === 'trialing',
        trialEndsAt: sub?.trial_end || null,
        subscriptionStatus: sub?.status || 'none',
        canAddMember: currentMembers < maxMembers,
        canAddStaff: currentStaff < maxStaff,
        canUseWhatsApp: planFeatures.whatsapp || false,
        canUseCCTV: planFeatures.cctv || false,
        loading: false,
      });
    };

    fetchLimits();
  }, [user?.gymId, supabase]);

  return limits;
}
