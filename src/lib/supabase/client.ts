import { createBrowserClient } from '@supabase/ssr';

let client: ReturnType<typeof createBrowserClient> | undefined;

function getSupabaseUrl(): string {
  const envUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (typeof window !== 'undefined') {
    // If explicitly configured for Cloud Supabase, use cloud URL
    if (envUrl && envUrl.includes('.supabase.co')) {
      return envUrl;
    }
    // For local LAN appliances (gymerp.local or LAN IP), route via origin proxy
    return window.location.origin;
  }
  return envUrl || 'https://placeholder.supabase.co';
}

export function createClient() {
  const supabaseUrl = getSupabaseUrl();
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'placeholder-anon-key';

  if (typeof window === 'undefined') {
    return createBrowserClient(supabaseUrl, anonKey);
  }
  if (!client) {
    client = createBrowserClient(supabaseUrl, anonKey);
  }
  return client;
}
