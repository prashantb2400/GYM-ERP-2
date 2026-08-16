import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';

export async function POST(request: Request) {
  try {
    const { subscription, userId, memberId } = await request.json();

    if (!subscription || !subscription.endpoint || !subscription.keys) {
      return NextResponse.json({ error: 'Invalid web push subscription payload' }, { status: 400 });
    }

    // Save or update subscription details
    const { error } = await supabaseAdmin
      .from('push_subscriptions')
      .upsert({
        endpoint: subscription.endpoint,
        keys: subscription.keys,
        user_id: userId || null,
        member_id: memberId || null,
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
