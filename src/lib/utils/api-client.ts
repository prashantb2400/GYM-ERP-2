import { createClient } from '@/lib/supabase/client';

/**
 * Fetch wrapper that automatically injects the current Supabase session's
 * Authorization: Bearer <access_token> header.
 * Ensures API route handlers on Vercel never fail due to missing or blocked cookies.
 */
export async function fetchWithAuth(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
  const supabase = createClient();
  const headers = new Headers(init?.headers || {});

  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (session?.access_token && !headers.has('Authorization')) {
      headers.set('Authorization', `Bearer ${session.access_token}`);
    }
  } catch (err) {
    console.warn('Unable to retrieve session token for fetchWithAuth:', err);
  }

  return fetch(input, {
    ...init,
    headers,
  });
}
