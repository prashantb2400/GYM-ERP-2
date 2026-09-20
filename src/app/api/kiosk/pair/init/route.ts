import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import crypto from 'crypto';

import { checkRateLimit, getClientIp } from '@/lib/server/rate-limit';

function generatePairingCode(): string {
  const chars = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ'; // Exclude 0, 1, I, O for readability
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(crypto.randomInt(0, chars.length));
  }
  return `${code.slice(0, 3)}-${code.slice(3)}`;
}

export async function POST(request: Request) {
  try {
    const ip = getClientIp(request);
    const rl = checkRateLimit(`kiosk-pair-init:${ip}`, 15, 60);
    if (!rl.allowed) {
      return NextResponse.json(
        { error: 'Too many pairing requests. Please wait a moment.' },
        { status: 429, headers: { 'Retry-After': String(rl.retryAfter || 60) } }
      );
    }

    const pairingCode = generatePairingCode();
    const tempToken = `ktok_pending_${crypto.randomUUID()}`;
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000).toISOString(); // 15 mins

    // Insert pending device record
    const { data: device, error: insErr } = await supabaseAdmin
      .from('kiosk_devices')
      .insert({
        pairing_code: pairingCode,
        device_token: tempToken,
        status: 'pending',
        pairing_expires_at: expiresAt,
        device_name: 'Android Tablet Kiosk',
      })
      .select('id, pairing_code, pairing_expires_at')
      .single();

    if (insErr) {
      console.warn('Could not insert into kiosk_devices table (table may need migration):', insErr.message);
    }

    const host = request.headers.get('host') || 'localhost:3000';
    const proto = request.headers.get('x-forwarded-proto') || 'http';
    const qrPayload = `${proto}://${host}/dashboard/settings?pairCode=${pairingCode}`;

    return NextResponse.json({
      success: true,
      pairingCode,
      expiresAt,
      qrPayload,
      deviceId: device?.id || crypto.randomUUID(),
    });
  } catch (err: any) {
    console.error('Kiosk pair init error:', err);
    return NextResponse.json(
      { error: err.message || 'Failed to initialize pairing code' },
      { status: 500 }
    );
  }
}
