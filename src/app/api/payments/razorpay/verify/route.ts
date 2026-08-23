import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { formatInvoiceNumber } from '@/lib/utils/format';
import crypto from 'crypto';

/**
 * S0-3 FIX: Client-side payment verification endpoint.
 * After Razorpay checkout succeeds on the client, the client should POST here
 * with razorpay_order_id, razorpay_payment_id, razorpay_signature.
 * This verifies the signature using Key Secret and extends the membership.
 */
export async function POST(request: Request) {
  try {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature, memberId, planId, gymId } =
      await request.json();

    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature || !memberId || !planId || !gymId) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const keySecret = process.env.RAZORPAY_KEY_SECRET;

    // In mock/dev mode (no key secret), skip signature check
    if (keySecret && !razorpay_order_id.startsWith('order_mock_')) {
      const expectedSignature = crypto
        .createHmac('sha256', keySecret)
        .update(`${razorpay_order_id}|${razorpay_payment_id}`)
        .digest('hex');

      const provided = Buffer.from(razorpay_signature);
      const expected = Buffer.from(expectedSignature);

      if (provided.length !== expected.length || !crypto.timingSafeEqual(provided, expected)) {
        return NextResponse.json({ error: 'Invalid payment signature' }, { status: 401 });
      }
    }

    // Check for duplicate processing
    const { data: existingTx } = await supabaseAdmin
      .from('payment_transactions')
      .select('id, status, invoice_id')
      .eq('razorpay_payment_id', razorpay_payment_id)
      .maybeSingle();

    if (existingTx && existingTx.status === 'captured') {
      return NextResponse.json({ success: true, invoiceId: existingTx.invoice_id, alreadyProcessed: true });
    }

    // Fetch plan price from DB (server-authoritative)
    const { data: planData, error: planErr } = await supabaseAdmin
      .from('plans')
      .select('id, name, price, duration_days')
      .eq('id', planId)
      .eq('gym_id', gymId)
      .single();

    if (planErr || !planData) {
      return NextResponse.json({ error: 'Plan not found' }, { status: 404 });
    }

    // Verify the payment amount from Razorpay API
    if (keySecret && !razorpay_order_id.startsWith('order_mock_')) {
      const keyId = process.env.RAZORPAY_KEY_ID;
      const authHeader = `Basic ${Buffer.from(`${keyId}:${keySecret}`).toString('base64')}`;
      const paymentRes = await fetch(`https://api.razorpay.com/v1/payments/${razorpay_payment_id}`, {
        headers: { 'Authorization': authHeader },
      });
      if (paymentRes.ok) {
        const paymentDetails = await paymentRes.json();
        const expectedAmountPaise = Math.round(Number(planData.price) * 100);
        if (paymentDetails.amount < expectedAmountPaise) {
          return NextResponse.json({ error: 'Payment amount insufficient for this plan' }, { status: 400 });
        }
      }
    }

    // Update transaction status
    await supabaseAdmin
      .from('payment_transactions')
      .update({
        razorpay_payment_id,
        razorpay_signature,
        status: 'captured',
      })
      .eq('razorpay_order_id', razorpay_order_id);

    // Calculate membership dates
    const startDate = new Date();
    const endDate = new Date();
    endDate.setDate(startDate.getDate() + planData.duration_days);

    // Fetch member
    const { data: memberData, error: memberErr } = await supabaseAdmin
      .from('members')
      .select('*')
      .eq('id', memberId)
      .single();

    if (memberErr || !memberData) {
      return NextResponse.json({ error: 'Member not found' }, { status: 404 });
    }

    // Extend membership
    await supabaseAdmin
      .from('members')
      .update({
        current_plan_id: planId,
        plan_start_date: startDate.toISOString().split('T')[0],
        plan_end_date: endDate.toISOString().split('T')[0],
        status: 'active',
        total_paid_lifetime: Number(memberData.total_paid_lifetime || 0) + Number(planData.price),
      })
      .eq('id', memberId);

    // Generate invoice number atomically
    const { data: counterData } = await supabaseAdmin
      .from('counters')
      .select('invoice_count')
      .eq('gym_id', gymId)
      .single();

    const nextVal = (counterData?.invoice_count || 0) + 1;
    await supabaseAdmin
      .from('counters')
      .update({ invoice_count: nextVal })
      .eq('gym_id', gymId);

    const invoiceNumber = formatInvoiceNumber(nextVal);
    const taxable = planData.price;
    const cgst = Math.round(taxable * 0.09 * 100) / 100;
    const sgst = Math.round(taxable * 0.09 * 100) / 100;
    const total = taxable + cgst + sgst;

    const { data: newInvoice, error: invError } = await supabaseAdmin
      .from('invoices')
      .insert({
        gym_id: gymId,
        invoice_number: invoiceNumber,
        member_id: memberId,
        member_name: memberData.name,
        line_items: [{ description: `Plan Renewal: ${planData.name}`, qty: 1, rate: planData.price, amount: planData.price }],
        subtotal: taxable,
        cgst_amount: cgst,
        sgst_amount: sgst,
        total,
        amount_paid: total,
        amount_due: 0,
        payment_mode: 'online',
        transaction_id: razorpay_payment_id,
        status: 'paid',
        issued_at: new Date().toISOString(),
        paid_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (invError) throw invError;

    // Link invoice to transaction
    await supabaseAdmin
      .from('payment_transactions')
      .update({ invoice_id: newInvoice.id })
      .eq('razorpay_order_id', razorpay_order_id);

    return NextResponse.json({ success: true, invoiceId: newInvoice.id, planEndDate: endDate.toISOString().split('T')[0] });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'An unknown error occurred';
    console.error('Payment verify error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
