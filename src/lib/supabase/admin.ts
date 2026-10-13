import { createClient } from '@supabase/supabase-js';

// Admin client that bypasses RLS (Row-Level Security).
// Use ONLY in secure server contexts.
const supabaseUrl =
  process.env.INTERNAL_SUPABASE_URL ||
  process.env.NEXT_PUBLIC_APP_URL ||
  process.env.NEXT_PUBLIC_SUPABASE_URL ||
  'http://localhost:3000';

const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 'placeholder-service-key';

export const supabaseAdmin = createClient(
  supabaseUrl,
  supabaseKey,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  }
);
