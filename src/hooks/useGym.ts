'use client';

import { useEffect, useState, useRef } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Gym } from '@/types/database';
import { useAuth } from './useAuth';
import { fetchWithAuth } from '@/lib/utils/api-client';

export function useGym() {
  const supabase = createClient();
  const { user, member } = useAuth();
  const [gym, setGym] = useState<Gym | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const gymId = user?.gymId || member?.gymId;
  const fetchedGymIdRef = useRef<string | null>(null);

  useEffect(() => {
    if (!gymId) {
      setLoading(false);
      return;
    }

    if (fetchedGymIdRef.current === gymId && gym?.id === gymId) {
      return;
    }

    const fetchGymDetails = async () => {
      try {
        if (!gym) setLoading(true);

        // 1. Primary: Server-side API route (bypasses RLS recursion)
        const res = await fetchWithAuth('/api/settings');
        if (res.ok) {
          const json = await res.json();
          if (json.gym) {
            setGym(json.gym);
            fetchedGymIdRef.current = gymId;
            return;
          }
        }

        // 2. Fallback: Direct Supabase query with maybeSingle
        const { data, error: fetchError } = await supabase
          .from('gyms')
          .select('*')
          .eq('id', gymId)
          .maybeSingle();

        if (fetchError) {
          console.warn('Direct Supabase gym fetch warning:', fetchError);
        } else if (data) {
          setGym(data);
          fetchedGymIdRef.current = gymId;
        }
      } catch (err: unknown) {
        const msg =
          err instanceof Error
            ? err.message
            : typeof err === 'object' && err && 'message' in err
              ? String((err as any).message)
              : 'Error fetching gym details';
        setError(msg);
      } finally {
        setLoading(false);
      }
    };

    fetchGymDetails();
  }, [gymId]);

  const updateGymSettings = async (updates: Partial<Gym>) => {
    if (!gymId) return { error: 'No gym ID found in current session' };

    try {
      setLoading(true);

      // 1. Primary: Server-side API route
      const res = await fetchWithAuth('/api/settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      });

      if (res.ok) {
        const json = await res.json();
        if (json.gym) {
          setGym(json.gym);
          return { data: json.gym, error: null };
        }
      }

      // 2. Fallback: Direct Supabase client update
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
      const msg =
        err instanceof Error
          ? err.message
          : typeof err === 'object' && err && 'message' in err
            ? String((err as any).message)
            : 'Error updating gym details';
      return { data: null, error: msg };
    } finally {
      setLoading(false);
    }
  };

  return {
    gym,
    loading,
    error,
    updateGymSettings,
    brandColor: '#3b82f6', // default primary token from DESIGN.md
  };
}
