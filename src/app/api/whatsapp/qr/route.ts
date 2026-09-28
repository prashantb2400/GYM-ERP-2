/**
 * WhatsApp Bridge QR Code Relay API Route
 *
 * Proxies QR code queries from the browser to the gym's local Baileys bridge
 * via Cloudflare Tunnel. Enables gym owners to link their WhatsApp account
 * directly within the GymERP dashboard without touching the terminal.
 */

import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { supabaseAdmin } from '@/lib/supabase/admin';

export async function GET(request: Request) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Resolve gym and verify permissions from authenticated user
    const { data: userData } = await supabase
      .from('users')
      .select('gym_id, role')
      .eq('auth_id', user.id)
      .single();

    if (!userData?.gym_id) {
      return NextResponse.json({ error: 'No gym associated' }, { status: 403 });
    }

    const canManage = userData.role === 'owner' || userData.role === 'receptionist';
    if (!canManage) {
      return NextResponse.json({ error: 'Forbidden: Insufficient permissions' }, { status: 403 });
    }

    // Fetch gym's bridge configuration
    const { data: gym, error: gymError } = await supabaseAdmin
      .from('gyms')
      .select('whatsapp_mode, bridge_url, bridge_token')
      .eq('id', userData.gym_id)
      .single();

    if (gymError || !gym) {
      return NextResponse.json({ error: 'Gym not found' }, { status: 404 });
    }

    if (gym.whatsapp_mode !== 'local_bridge') {
      return NextResponse.json({
        error: 'Gym is not configured for local bridge mode. Switch to Free Baileys Bridge first.',
        mode: gym.whatsapp_mode,
      }, { status: 400 });
    }

    if (!gym.bridge_url || !gym.bridge_token) {
      return NextResponse.json({
        error: 'Bridge URL or Security Token is not configured for this gym.',
      }, { status: 400 });
    }

    const bridgeBase = gym.bridge_url.replace(/\/$/, '');
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000); // 8s timeout

    try {
      const response = await fetch(`${bridgeBase}/qr`, {
        signal: controller.signal,
        headers: {
          Authorization: `Bearer ${gym.bridge_token}`,
          'Content-Type': 'application/json',
        },
      });

      const data = await response.json();
      return NextResponse.json({ success: true, ...data });
    } catch (fetchErr: any) {
      const isOffline = fetchErr.name === 'AbortError' || fetchErr.cause?.code === 'ECONNREFUSED';
      return NextResponse.json({
        success: false,
        status: 'bridge_unreachable',
        error: isOffline
          ? 'WhatsApp bridge is offline or tunnel URL is unreachable. Please verify desktop app or cloudflared is running.'
          : fetchErr.message,
      }, { status: 502 });
    } finally {
      clearTimeout(timeout);
    }
  } catch (error: any) {
    console.error('QR relay error:', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
