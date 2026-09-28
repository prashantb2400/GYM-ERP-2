import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { checkRateLimit, getClientIp } from '@/lib/server/rate-limit';
import { getAuthUser } from '@/lib/server/auth-helper';
import { validateBody } from '@/lib/server/validate';
import { renewMemberSchema } from '@/lib/schemas/members';
import { calculateGST } from '@/lib/utils/format';

export async function POST(request: Request) {
  try {
    const ip = getClientIp(request);
    const rl = checkRateLimit(`renew-member:${ip}`, 30, 60);
    if (!rl.allowed) {
      return NextResponse.json(
        { error: 'Too many requests. Please slow down.' },
        { status: 429, headers: { 'Retry-After': String(rl.retryAfter || 60) } }
      );
    }

    // 1. Verify caller session
    const { user: sessionUser, error: authErr } = await getAuthUser(request);
    if (!sessionUser || authErr) {
      return NextResponse.json({ error: authErr || 'Unauthorized' }, { status: 401 });
    }

    // 2. Validate request body
    const validation = await validateBody(request, renewMemberSchema);
    if (!validation.success) {
      return validation.response;
    }

    const {
      memberId,
      planId,
      startDate,
      endDate,
      discountPercent,
      discountAmount,
      amountPaid: rawAmountPaid,
      paymentMode,
      transactionId,
      notes,
      sendWhatsApp,
    } = validation.data;

    // 3. Resolve caller permissions and gym association
    const { data: callerUser, error: userErr } = await supabaseAdmin
      .from('users')
      .select('id, gym_id, role, permissions')
      .eq('auth_id', sessionUser.id)
      .single();

    if (userErr || !callerUser?.gym_id) {
      return NextResponse.json({ error: 'Caller user profile or gym not found' }, { status: 403 });
    }

    const allowedRoles = ['owner', 'admin', 'receptionist'];
    const hasPermission =
      allowedRoles.includes(callerUser.role) ||
      (Array.isArray(callerUser.permissions) && callerUser.permissions.includes('members.edit'));

    if (!hasPermission) {
      return NextResponse.json(
        { error: 'Forbidden: Insufficient permissions to renew membership' },
        { status: 403 }
      );
    }

    const gymId = callerUser.gym_id;

    // 4. Fetch member scoped to gym
    const { data: member, error: memberErr } = await supabaseAdmin
      .from('members')
      .select('id, name, member_code, phone, whatsapp_phone, branch_id, status, total_due, total_paid_lifetime')
      .eq('gym_id', gymId)
      .eq('id', memberId)
      .single();

    if (memberErr || !member) {
      return NextResponse.json({ error: 'Member not found in current gym' }, { status: 404 });
    }

    // 5. Fetch plan scoped to gym
    const { data: plan, error: planErr } = await supabaseAdmin
      .from('plans')
      .select('id, name, duration_days, price')
      .eq('gym_id', gymId)
      .eq('id', planId)
      .single();

    if (planErr || !plan) {
      return NextResponse.json({ error: 'Selected membership plan not found' }, { status: 404 });
    }

    // 6. Generate invoice number via RPC or fallback timestamp
    let invoiceNo = '';
    try {
      const { data: generatedNo } = await supabaseAdmin.rpc('generate_invoice_number', {
        p_gym_id: gymId,
      });
      if (generatedNo) {
        invoiceNo = String(generatedNo);
      }
    } catch {
      // Fallback if RPC function is unavailable
    }

    if (!invoiceNo) {
      const year = new Date().getFullYear();
      const randSuffix = Math.floor(1000 + Math.random() * 9000);
      invoiceNo = `INV-${year}-${randSuffix}`;
    }

    // 7. Calculate financial totals with GST
    const basePrice = Math.max(0, Number(plan.price) || 0);
    const discAmt = Math.max(0, Number(discountAmount) || 0);
    const { cgst, sgst, total: totalAmount } = calculateGST(basePrice, discAmt);
    const safeAmountPaid = Math.min(totalAmount, Math.max(0, Number(rawAmountPaid) || 0));
    const amountDue = Math.max(0, totalAmount - safeAmountPaid);
    const invoiceStatus = amountDue <= 0 ? 'paid' : safeAmountPaid > 0 ? 'partial' : 'pending';

    const lineItems = [
      {
        description: `Membership Plan Renewal: ${plan.name} (${plan.duration_days} Days)`,
        qty: 1,
        rate: basePrice,
        amount: basePrice,
      },
    ];

    // 8. Create Tax Invoice record
    const { data: invoice, error: invoiceErr } = await supabaseAdmin
      .from('invoices')
      .insert({
        gym_id: gymId,
        branch_id: member.branch_id || null,
        invoice_number: invoiceNo,
        member_id: member.id,
        member_name: member.name,
        plan_id: plan.id,
        line_items: lineItems,
        subtotal: basePrice,
        discount_percent: discountPercent || 0,
        discount_amount: discAmt,
        cgst_amount: cgst,
        sgst_amount: sgst,
        total: totalAmount,
        amount_paid: safeAmountPaid,
        amount_due: amountDue,
        payment_mode: safeAmountPaid > 0 ? paymentMode : null,
        transaction_id: transactionId || null,
        status: invoiceStatus,
        sent_via_whatsapp: false,
        created_by: callerUser.id,
        issued_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (invoiceErr) {
      console.error('Renewal invoice creation error:', invoiceErr);
      return NextResponse.json({ error: 'Failed to create renewal invoice' }, { status: 500 });
    }

    // 9. If outstanding balance due, insert due_records entry
    if (amountDue > 0) {
      await supabaseAdmin.from('due_records').insert({
        gym_id: gymId,
        member_id: member.id,
        invoice_id: invoice.id,
        amount: amountDue,
        collected_amount: 0,
        status: 'pending',
        due_date: new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0],
      });
    }

    // 10. Update member plan, validity dates, status, and financial ledgers
    const updatedTotalDue = Math.max(0, (Number(member.total_due) || 0) + amountDue);
    const updatedTotalPaid = (Number(member.total_paid_lifetime) || 0) + safeAmountPaid;

    const { data: updatedMember, error: memberUpdateErr } = await supabaseAdmin
      .from('members')
      .update({
        current_plan_id: plan.id,
        plan_start_date: startDate,
        plan_end_date: endDate,
        status: 'active',
        total_due: updatedTotalDue,
        total_paid_lifetime: updatedTotalPaid,
        updated_at: new Date().toISOString(),
      })
      .eq('id', member.id)
      .select()
      .single();

    if (memberUpdateErr) {
      console.error('Member renewal update error:', memberUpdateErr);
      return NextResponse.json({ error: 'Failed to update member status' }, { status: 500 });
    }

    // 11. Auto-complete any open renewal follow-up for this member
    await supabaseAdmin
      .from('followups')
      .update({
        status: 'completed',
        completed_at: new Date().toISOString(),
        completed_by: callerUser.id,
        outcome: `Renewed: ${plan.name} (${startDate} to ${endDate})`,
      })
      .eq('gym_id', gymId)
      .eq('member_id', member.id)
      .eq('type', 'renewal')
      .eq('status', 'open');

    // 12. Optional WhatsApp notification
    let whatsAppSent = false;
    if (sendWhatsApp) {
      const recipientPhone = member.whatsapp_phone || member.phone;
      if (recipientPhone) {
        try {
          const gymProfile = await supabaseAdmin
            .from('gyms')
            .select('name')
            .eq('id', gymId)
            .single();

          const gymName = gymProfile.data?.name || 'Your Gym';
          const renewMsg = `Hello ${member.name}! Your membership at ${gymName} has been renewed with the ${plan.name} plan until ${endDate}. Invoice #${invoiceNo}. Thank you for working out with us!`;

          const { waClient } = await import('@/lib/whatsapp/client');
          await waClient.sendText(recipientPhone, renewMsg, gymId, member.id);
          whatsAppSent = true;

          await supabaseAdmin
            .from('invoices')
            .update({ sent_via_whatsapp: true })
            .eq('id', invoice.id);
        } catch (waErr) {
          console.warn('Failed to send renewal WhatsApp notification:', waErr);
        }
      }
    }

    return NextResponse.json({
      success: true,
      invoice,
      member: updatedMember,
      whatsAppSent,
      message: `Membership successfully renewed for ${member.name}!`,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Internal server error';
    console.error('Unhandled member renewal error:', err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
