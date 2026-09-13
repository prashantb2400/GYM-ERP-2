import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { waClient } from '@/lib/whatsapp/client';
import { TemplateParam } from '@/lib/whatsapp/types';
import { isSuperAdmin } from '@/lib/platform/auth';
import { checkRateLimit } from '@/lib/server/rate-limit';

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const rl = checkRateLimit(`wa-broadcast:${user.id}`, 10, 60);
    if (!rl.allowed) {
      return NextResponse.json(
        { error: 'Too many broadcast requests. Please wait before retrying.' },
        { status: 429, headers: { 'Retry-After': String(rl.retryAfter || 60) } }
      );
    }

    const body = await request.json();
    const { phones, templateName, paramsPerPhone, gymId: requestedGymId } = body;

    // Resolve gym and permissions from authenticated user
    const { data: userData } = await supabase
      .from('users')
      .select('gym_id, role, permissions')
      .eq('auth_id', user.id)
      .single();

    const superAdmin = await isSuperAdmin(user.id);
    const canBroadcast = userData?.role === 'owner' || userData?.permissions?.includes('whatsapp.broadcast') || superAdmin;

    if (!canBroadcast) {
      return NextResponse.json({ error: 'Forbidden: Only gym owners can trigger mass WhatsApp broadcasts' }, { status: 403 });
    }

    let targetGymId = userData?.gym_id;

    if (!targetGymId) {
      if (superAdmin && requestedGymId) {
        targetGymId = requestedGymId;
      } else {
        return NextResponse.json({ error: 'No gym associated with user' }, { status: 403 });
      }
    } else if (requestedGymId && requestedGymId !== targetGymId) {
      if (!superAdmin) {
        return NextResponse.json({ error: 'Forbidden: Cross-tenant broadcast prohibited' }, { status: 403 });
      }
      targetGymId = requestedGymId;
    }

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
    const results = await waClient.broadcastTemplate(phones, templateName, paramsPerPhone as TemplateParam[][], targetGymId);

    return NextResponse.json({ success: true, results });
  } catch (error: any) {
    console.error('Broadcast error:', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
