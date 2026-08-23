import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

export async function POST(request: Request) {
  try {
    // Verify caller session
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

    const { memberId, planId, gymId } = await request.json();

    if (!memberId || !planId || !gymId) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // ── S0-2 FIX: Fetch price strictly from DB — never trust client-supplied amount ──
    const { data: planData, error: planErr } = await supabaseAdmin
      .from('plans')
      .select('id, name, price, duration_days')
      .eq('id', planId)
      .eq('gym_id', gymId)
      .single();

    if (planErr || !planData) {
      return NextResponse.json({ error: 'Plan not found' }, { status: 404 });
    }

    const amount = planData.price; // Server-authoritative price in ₹

    const keyId = process.env.RAZORPAY_KEY_ID;
    const keySecret = process.env.RAZORPAY_KEY_SECRET;

    let orderId = `order_mock_${Math.random().toString(36).substring(2, 15)}`;
    let isMock = true;

    if (keyId && keySecret) {
      const authHeader = `Basic ${Buffer.from(`${keyId}:${keySecret}`).toString('base64')}`;

      const res = await fetch('https://api.razorpay.com/v1/orders', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': authHeader,
        },
        body: JSON.stringify({
          amount: Math.round(amount * 100), // paise, server-calculated
          currency: 'INR',
          receipt: `receipt_${memberId.substring(0, 8)}_${Date.now()}`,
          notes: {
            memberId,
            planId,
            gymId,
            // Store server-authoritative price in notes for webhook verification
            serverAmount: Math.round(amount * 100),
          },
        }),
      });

      if (res.ok) {
        const orderData = await res.json();
        orderId = orderData.id;
        isMock = false;
      } else {
        const errorText = await res.text();
        console.error('Razorpay Order Creation API failed:', errorText);
        return NextResponse.json({ error: 'Failed to communicate with payment processor' }, { status: 500 });
      }
    }

    // Log transaction with server-authoritative amount
    const { error: txError } = await supabaseAdmin
      .from('payment_transactions')
      .insert({
        gym_id: gymId,
        member_id: memberId,
        amount: amount,
        razorpay_order_id: orderId,
        status: 'created',
      });

    if (txError) {
      console.error('Failed to log payment transaction:', txError);
    }

    return NextResponse.json({
      orderId,
      keyId: keyId || 'rzp_test_mockKey123',
      amount: amount, // Return server-authoritative amount to display to user
      isMock,
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'An unknown error occurred';
    console.error('Razorpay Create Order Exception:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
