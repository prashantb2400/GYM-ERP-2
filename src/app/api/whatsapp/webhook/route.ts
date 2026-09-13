import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { getDaysRemaining, formatDate } from '@/lib/utils/format';
import { waClient } from '@/lib/whatsapp/client';
import { WAWebhookBody } from '@/lib/whatsapp/types';
import crypto from 'crypto';

/** Verify Meta's X-Hub-Signature-256 header */
async function verifyMetaSignature(request: Request, bodyText: string): Promise<boolean> {
  const appSecret = process.env.WHATSAPP_APP_SECRET;
  if (!appSecret) {
    console.error('WHATSAPP_APP_SECRET is not configured — rejecting webhook');
    return false;
  }
  const signature = request.headers.get('x-hub-signature-256');
  if (!signature) return false;
  const expectedSig = 'sha256=' + crypto
    .createHmac('sha256', appSecret)
    .update(bodyText)
    .digest('hex');
  const sigBuf = Buffer.from(signature);
  const expBuf = Buffer.from(expectedSig);
  if (sigBuf.length !== expBuf.length) {
    return false;
  }
  return crypto.timingSafeEqual(sigBuf, expBuf);
}

export async function GET(request: Request) {
  // Meta webhook verification handshake
  const { searchParams } = new URL(request.url);
  const mode = searchParams.get('hub.mode');
  const token = searchParams.get('hub.verify_token');
  const challenge = searchParams.get('hub.challenge');

  const expectedToken = process.env.WHATSAPP_VERIFY_TOKEN;
  if (!expectedToken) {
    return new Response('Webhook verify token not configured', { status: 503 });
  }

  if (mode === 'subscribe' && token === expectedToken) {
    return new Response(challenge, { status: 200 });
  }

  return new Response('Forbidden Handshake', { status: 403 });
}

export async function POST(request: Request) {
  try {
    const bodyText = await request.text();

    // Verify the payload actually came from Meta
    const isValid = await verifyMetaSignature(request, bodyText);
    if (!isValid) {
      return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
    }

    const body: WAWebhookBody = JSON.parse(bodyText);

    
    // First, pass it to the client to handle statuses
    await waClient.handleWebhook(body);

    // Check if it is a WhatsApp message entry
    const entry = body.entry?.[0];
    const changes = entry?.changes?.[0];
    const value = changes?.value;
    const message = value?.messages?.[0];

    if (!message) {
      return NextResponse.json({ status: 'ignored' });
    }

    const senderPhone = message.from; 
    const textBody = message.text?.body?.trim().toLowerCase();

    if (!textBody) {
      return NextResponse.json({ status: 'no_text' });
    }

    // 1. Locate member matching the sender's phone
    const cleanNumericPhone = senderPhone.replace(/\D/g, '');
    const standardFormat = cleanNumericPhone.startsWith('91') && cleanNumericPhone.length === 12 
      ? cleanNumericPhone.substring(2) 
      : cleanNumericPhone;

    const { data: member, error: memberErr } = await supabaseAdmin
      .from('members')
      .select('*, plans(*)')
      .or(`phone.like.%${standardFormat}%,whatsapp_phone.like.%${standardFormat}%`)
      .limit(1)
      .maybeSingle();

    if (!member) {
      // We could send a text back if needed, e.g., "You are not registered..."
      return NextResponse.json({ status: 'unknown_sender' });
    }

    const gymId = member.gym_id;
    const memberId = member.id;

    // 2. Interactive keyword logic router
    let replyText = '';

    if (textBody === '1' || textBody.includes('status')) {
      if (member.plan_end_date) {
        const remaining = getDaysRemaining(member.plan_end_date);
        const dateStr = formatDate(member.plan_end_date);
        
        replyText = `*Membership Status*\nYour current plan is active until ${dateStr} (${remaining} days remaining).`;
      } else {
        replyText = `You do not have an active membership plan.`;
      }
    } else if (textBody === '2' || textBody.includes('renew')) {
      replyText = `To renew your membership, please visit the gym desk or use our app. Let us know if you need any assistance!`;
    } else {
      replyText = `Hi ${member.name}, I'm the gym's virtual assistant. Reply with:\n1 - Check membership status\n2 - Renewal info`;
    }

    // 3. Send auto-reply
    await waClient.sendText(senderPhone, replyText, gymId, memberId);

    return NextResponse.json({ status: 'success' });
  } catch (error) {
    console.error('Webhook error:', error);
    return NextResponse.json({ status: 'error' }, { status: 500 });
  }
}
