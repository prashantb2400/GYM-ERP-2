import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { createClient } from '@/lib/supabase/server';

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { subscription } = await request.json();

    if (!subscription || !subscription.endpoint || !subscription.keys) {
      return NextResponse.json({ error: 'Invalid web push subscription payload' }, { status: 400 });
    }

    // Resolve caller's database records to ensure proper tenant ownership
    const { data: userData } = await supabaseAdmin
      .from('users')
      .select('id')
      .eq('auth_id', user.id)
      .single();

    const { data: memberData } = await supabaseAdmin
      .from('members')
      .select('id')
      .eq('auth_id', user.id)
      .single();

    const resolvedUserId = userData?.id || null;
    const resolvedMemberId = memberData?.id || null;

    if (!resolvedUserId && !resolvedMemberId) {
      return NextResponse.json({ error: 'User profile not found' }, { status: 403 });
    }

    // Save or update subscription details
    const { error } = await supabaseAdmin
      .from('push_subscriptions')
      .upsert({
        endpoint: subscription.endpoint,
        keys: subscription.keys,
        user_id: resolvedUserId,
        member_id: resolvedMemberId,
      }, {
        onConflict: 'endpoint'
      });

    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'An unknown error occurred';
    console.error('Push Subscription Registration Exception:', err);
    return NextResponse.json({ error: msg || 'Failed to register subscription' }, { status: 500 });
  }
}
