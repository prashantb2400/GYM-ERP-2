import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';

export async function POST(request: Request) {
  try {
    const { amount, memberId, planId, gymId } = await request.json();

    if (!amount || !memberId || !planId || !gymId) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const keyId = process.env.RAZORPAY_KEY_ID;
    const keySecret = process.env.RAZORPAY_KEY_SECRET;

    // Standard Next.js server order creation helper
    let orderId = `order_mock_${Math.random().toString(36).substring(2, 15)}`;
    let isMock = true;

    if (keyId && keySecret) {
      // Create real Razorpay order using fetch & Basic Auth
      const authHeader = `Basic ${Buffer.from(`${keyId}:${keySecret}`).toString('base64')}`;
      
      const res = await fetch('https://api.razorpay.com/v1/orders', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': authHeader,
        },
        body: JSON.stringify({
          amount: Math.round(amount * 100), // Razorpay accepts in paise
          currency: 'INR',
          receipt: `receipt_${memberId.substring(0, 8)}_${Date.now()}`,
          notes: {
            memberId,
            planId,
            gymId,
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
    } else {
      // Razorpay keys not set
    }

    // Insert order transaction in payment_transactions table for tracking
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
      amount: amount,
      isMock,
    });
  } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'An unknown error occurred';
    console.error('Razorpay Create Order Exception:', err);
    return NextResponse.json({ error: msg || 'Internal server error' }, { status: 500 });
  }
}
