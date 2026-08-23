import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

/**
 * H-10 FIX: Push notification subscription endpoint.
 * Derives userId/memberId from the authenticated session — never trusts client-supplied IDs.
 * This prevents IDOR attacks where a user could register any arbitrary userId/memberId.
 */
export async function POST(request: Request) {
  try {
    const cookieStore = await cookies();
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() { return cookieStore.getAll(); },
          setAll() {},
        },
      }
    );

    const { data: { user: callerAuth } } = await supabase.auth.getUser();
    if (!callerAuth) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { subscription } = await request.json();

    if (!subscription || !subscription.endpoint || !subscription.keys) {
      return NextResponse.json({ error: 'Invalid web push subscription payload' }, { status: 400 });
    }

    // Derive user/member identity from session — never trust client body
    let resolvedUserId: string | null = null;
    let resolvedMemberId: string | null = null;

    // Check if caller is a gym staff member
    const { data: userData } = await supabaseAdmin
      .from('users')
      .select('id')
      .eq('auth_id', callerAuth.id)
      .maybeSingle();

    if (userData) {
      resolvedUserId = userData.id;
    } else {
      // Check if caller is a gym member
      const { data: memberData } = await supabaseAdmin
        .from('members')
        .select('id')
        .eq('auth_id', callerAuth.id)
        .maybeSingle();

      if (memberData) {
        resolvedMemberId = memberData.id;
      }
    }

    const { error } = await supabaseAdmin
      .from('push_subscriptions')
      .upsert({
        endpoint: subscription.endpoint,
        keys: subscription.keys,
        user_id: resolvedUserId,
        member_id: resolvedMemberId,
      }, {
        onConflict: 'endpoint',
      });

    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'An unknown error occurred';
    console.error('Push Subscription Registration Exception:', err);
    return NextResponse.json({ error: 'Failed to register subscription' }, { status: 500 });
  }
}
