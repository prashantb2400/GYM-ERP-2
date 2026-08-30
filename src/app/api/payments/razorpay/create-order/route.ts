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
    
    // Resolve gym from authenticated user
    const { data: userData } = await supabase
      .from('users')
      .select('gym_id, role')
      .eq('auth_id', user.id)
      .single();
    
    if (!userData?.gym_id) {
      return NextResponse.json({ error: 'No gym associated with user' }, { status: 403 });
    }
    
    const { memberId, planId } = await request.json();
    const gymId = userData.gym_id; // Server-side resolved, not client-supplied

    if (!memberId || !planId) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Resolve price server-side from the plan to prevent price manipulation
    const { data: planData, error: planError } = await supabaseAdmin
      .from('plans')
      .select('price')
      .eq('id', planId)
      .eq('gym_id', gymId)
      .eq('is_active', true)
      .single();

    if (planError || !planData) {
      return NextResponse.json({ error: 'Plan not found or inactive' }, { status: 404 });
    }

    const amount = Number(planData.price);

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
      keyId: keyId || '',
      amount: amount,
      isMock,
    });
  } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'An unknown error occurred';
    console.error('Razorpay Create Order Exception:', err);
    return NextResponse.json({ error: msg || 'Internal server error' }, { status: 500 });
  }
}
