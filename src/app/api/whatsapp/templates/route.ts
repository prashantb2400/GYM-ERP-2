import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { WA_TEMPLATES } from '@/lib/whatsapp/templates';
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

    const { searchParams } = new URL(request.url);
    const fetchStatuses = searchParams.get('fetch_statuses') === 'true';

    const templates: any = { ...WA_TEMPLATES };

    if (fetchStatuses) {
      const wa = await getWhatsAppProvider(userData?.gym_id);
      const statusPromises = Object.keys(templates).map(async (key) => {
        try {
          const status = await wa.getTemplateStatus(templates[key].name);
          templates[key].meta_status = status.status;
        } catch (e) {
          templates[key].meta_status = 'UNKNOWN';
        }
      });
      await Promise.all(statusPromises);
    }

    return NextResponse.json({ success: true, data: templates });
  } catch (error: any) {
    console.error('Fetch templates error:', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
