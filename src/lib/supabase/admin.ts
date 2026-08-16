import { createClient } from '@supabase/supabase-js';

// Admin client that bypasses RLS (Row-Level Security).
// Use ONLY in secure server contexts.
export const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  }
);
