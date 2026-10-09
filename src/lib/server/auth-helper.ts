import { supabaseAdmin } from '@/lib/supabase/admin';
import { createClient } from '@/lib/supabase/server';
import { User } from '@supabase/supabase-js';

export interface AuthResolutionResult {
  user: User | null;
  error: string | null;
}

/**
 * Extracts and authenticates the user from an incoming API request.
 * Prioritizes Authorization: Bearer <token> (resilient to cross-domain, partitioned, or blocked cookies),
 * with a fallback to server cookies.
 */
export async function getAuthUser(request: Request): Promise<AuthResolutionResult> {
  // 1. Check Bearer token from header
  const authHeader = request.headers.get('Authorization') || request.headers.get('authorization');
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.replace(/^Bearer\s+/i, '').trim();
    if (token) {
      try {
        const { data: { user: tokenUser }, error: tokenErr } = await supabaseAdmin.auth.getUser(token);
        if (tokenUser && !tokenErr) {
          return { user: tokenUser, error: null };
        }
      } catch (tokenException) {
        console.warn('Bearer token authentication error:', tokenException);
      }

      // 1b. Fallback: Verify local offline token signed with PGRST_JWT_SECRET
      try {
        const { verifyLocalToken } = await import('@/lib/server/local-auth');
        const localPayload = await verifyLocalToken(token);
        if (localPayload && localPayload.sub) {
          const offlineUser: User = {
            id: localPayload.sub as string,
            app_metadata: { provider: 'email' },
            user_metadata: (localPayload.user_metadata as any) || {},
            aud: 'authenticated',
            created_at: new Date().toISOString(),
          } as any;
          return { user: offlineUser, error: null };
        }
      } catch (localErr) {
        console.warn('Local offline token validation error:', localErr);
      }
    }
  }

  // 2. Fallback to cookie-based session
  try {
    const supabase = await createClient();
    const { data: { user: cookieUser }, error: cookieErr } = await supabase.auth.getUser();
    if (cookieUser && !cookieErr) {
      return { user: cookieUser, error: null };
    }
  } catch (cookieException) {
    console.warn('Cookie authentication error:', cookieException);
  }

  return { user: null, error: 'Unauthorized: Valid authentication token or session required' };
}
