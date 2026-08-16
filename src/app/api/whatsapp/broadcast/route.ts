import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { waClient } from '@/lib/whatsapp/client';
import { TemplateParam } from '@/lib/whatsapp/types';

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const { data: { session }, error: authError } = await supabase.auth.getSession();

    if (authError || !session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { phones, templateName, paramsPerPhone, gymId } = body;

    if (!phones || !Array.isArray(phones) || phones.length === 0) {
      return NextResponse.json({ error: 'Missing or invalid phones array' }, { status: 400 });
    }
    if (!templateName) {
      return NextResponse.json({ error: 'Missing templateName' }, { status: 400 });
    }
    if (!paramsPerPhone || !Array.isArray(paramsPerPhone) || paramsPerPhone.length !== phones.length) {
      return NextResponse.json({ error: 'Missing or invalid paramsPerPhone array' }, { status: 400 });
    }

    // In a real production setup, we might want to return an accepted response 
    // and process in a background queue. Here we'll just await it for simplicity, 
    // or run it without awaiting. But since NextJS lambdas kill background processes 
    // after response, we must await it if not using a queue like Inngest/BullMQ.
    
    // We await for now, but client should handle large lists properly.
    const results = await waClient.broadcastTemplate(phones, templateName, paramsPerPhone as TemplateParam[][], gymId);

    return NextResponse.json({ success: true, results });
  } catch (error: any) {
    console.error('Broadcast error:', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
