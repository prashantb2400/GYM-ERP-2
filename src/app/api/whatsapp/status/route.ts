import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getWhatsAppProvider } from '@/lib/whatsapp/factory';

export async function GET(request: Request) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: userData } = await supabase
      .from('users')
      .select('gym_id')
      .eq('auth_id', user.id)
      .single();

    const wa = await getWhatsAppProvider(userData?.gym_id);
    const status = await wa.checkConnection();

    return NextResponse.json({
      success: true,
      data: {
        ...status,
        provider: wa.providerName,
        mode: wa.mode,
      },
    });
  } catch (error: any) {
    console.error('Check status error:', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
