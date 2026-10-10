import { NextRequest, NextResponse } from 'next/server';
import { getWhatsAppProvider } from '@/lib/whatsapp/factory';
import { getAuthUser } from '@/lib/server/auth-helper';

export async function POST(req: NextRequest) {
  try {
    const { user, error: authError } = await getAuthUser(req);
    if (!user || authError) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const phone = body.phone?.trim();

    if (!phone) {
      return NextResponse.json({ success: false, error: 'Phone number is required' }, { status: 400 });
    }

    const gymId = body.gym_id || user.user_metadata?.gym_id || user.app_metadata?.gym_id;
    const provider = await getWhatsAppProvider(gymId);

    if (!provider.requestPairingCode) {
      return NextResponse.json(
        {
          success: false,
          error: 'Pairing codes are only supported when using the Self-Hosted WhatsApp Bridge.',
        },
        { status: 400 }
      );
    }

    const result = await provider.requestPairingCode(phone);
    if (!result.success) {
      return NextResponse.json(
        { success: false, error: result.error || 'Failed to request pairing code' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      pairingCode: result.pairingCode,
      instructions: 'Open WhatsApp > Settings > Linked Devices > Link with phone number instead, and enter this code.',
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
