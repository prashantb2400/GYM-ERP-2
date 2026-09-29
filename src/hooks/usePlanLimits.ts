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
    planName: 'Enterprise Unlocked',
    planSlug: 'enterprise',
    maxMembers: 999999,
    maxStaff: 999999,
    features: { whatsapp: true, cctv: true, biometrics: true, analytics: true, leads: true, customBranding: true },
    usage: { currentMembers: 0, currentStaff: 0 },
    isTrialing: false,
    trialEndsAt: null,
    subscriptionStatus: 'active',
    canAddMember: true,
    canAddStaff: true,
    canUseWhatsApp: true,
    canUseCCTV: true,
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
      const currentMembers = memberCount || 0;
      const currentStaff = staffCount || 0;

      setLimits({
        planName: plan?.name || 'Enterprise Unlocked',
        planSlug: plan?.slug || 'enterprise',
        maxMembers: 999999,
        maxStaff: 999999,
        features: {
          whatsapp: true,
          cctv: true,
          biometrics: true,
          analytics: true,
          leads: true,
          customBranding: true,
        },
        usage: { currentMembers, currentStaff },
        isTrialing: false,
        trialEndsAt: null,
        subscriptionStatus: 'active',
        canAddMember: true,
        canAddStaff: true,
        canUseWhatsApp: true,
        canUseCCTV: true,
        loading: false,
      });
    };

    fetchLimits();
  }, [user?.gymId, supabase]);

  return limits;
}
