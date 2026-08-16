'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Gym } from '@/types/database';
import { useAuth } from './useAuth';

export function useGym() {
  const supabase = createClient();
  const { user, member } = useAuth();
  const [gym, setGym] = useState<Gym | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const gymId = user?.gymId || member?.gymId;

  useEffect(() => {
    if (!gymId) {
      setLoading(false);
      return;
    }

    const fetchGymDetails = async () => {
      try {
        setLoading(true);
        const { data, error: fetchError } = await supabase
          .from('gyms')
          .select('*')
          .eq('id', gymId)
          .single();

        if (fetchError) throw fetchError;
        setGym(data);
      } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'An unknown error occurred';
        setError(msg || 'Error fetching gym details');
      } finally {
        setLoading(false);
      }
    };

    fetchGymDetails();
  }, [gymId, supabase]);

  const updateGymSettings = async (updates: Partial<Gym>) => {
    if (!gymId) return { error: 'No gym ID found in current session' };

    try {
      setLoading(true);
      const { data, error: updateError } = await supabase
        .from('gyms')
        .update(updates)
        .eq('id', gymId)
        .select()
        .single();

      if (updateError) throw updateError;
      setGym(data);
      return { data, error: null };
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'An unknown error occurred';
      return { data: null, error: msg || 'Error updating gym details' };
    } finally {
      setLoading(false);
    }
  };

  return {
    gym,
    loading,
    error,
    updateGymSettings,
    brandColor: gym?.settings?.whatsapp_enabled ? '#9333ea' : '#3b82f6', // default fallback color
  };
}
