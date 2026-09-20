import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { getConfig } from './config.js';

let clientInstance: SupabaseClient | null = null;

export function getDb(): SupabaseClient {
  if (clientInstance) {
    return clientInstance;
  }

  const { supabaseUrl, supabaseKey } = getConfig();

  if (!supabaseUrl || !supabaseKey) {
    console.error(
      '[gym-erp-mcp] Warning: NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY is not defined. Database operations may fail.'
    );
  }

  clientInstance = createClient(
    supabaseUrl || 'https://placeholder.supabase.co',
    supabaseKey || 'placeholder-key',
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    }
  );

  return clientInstance;
}

export function resolveGymId(suppliedGymId?: string): string {
  const { defaultGymId } = getConfig();
  const gymId = suppliedGymId || defaultGymId;
  if (!gymId) {
    throw new Error(
      'Gym ID not provided. Either specify "gym_id" in the tool arguments or set GYMERP_GYM_ID in environment.'
    );
  }
  return gymId;
}
