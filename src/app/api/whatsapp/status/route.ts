import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { waClient } from '@/lib/whatsapp/client';

export async function GET(request: Request) {
  try {
    const supabase = await createClient();
    const { data: { session }, error: authError } = await supabase.auth.getSession();

    if (authError || !session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const status = await waClient.checkConnection();

    return NextResponse.json({ success: true, data: status });
  } catch (error: any) {
    console.error('Check status error:', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
