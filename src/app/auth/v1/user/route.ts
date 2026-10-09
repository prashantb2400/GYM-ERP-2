import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { verifyLocalToken } from '@/lib/server/local-auth';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, apikey, X-Client-Info, prefer',
};

export async function OPTIONS() {
  return new NextResponse(null, { status: 200, headers: corsHeaders });
}

export async function GET(request: Request) {
  try {
    const authHeader = request.headers.get('Authorization') || request.headers.get('authorization') || '';
    const token = authHeader.replace(/^Bearer\s+/i, '').trim();

    if (!token) {
      return NextResponse.json({ error: 'Missing Bearer token' }, { status: 401, headers: corsHeaders });
    }

    const payload = await verifyLocalToken(token);
    if (!payload || !payload.sub) {
      return NextResponse.json({ error: 'Invalid or expired token' }, { status: 401, headers: corsHeaders });
    }

    const userId = payload.sub as string;
    const { data: user } = await supabaseAdmin
      .from('users')
      .select('id, auth_id, email, name, role, gym_id, is_active')
      .or(`id.eq.${userId},auth_id.eq.${userId}`)
      .maybeSingle();

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 401, headers: corsHeaders });
    }

    const effectiveId = user.auth_id || user.id;

    return NextResponse.json(
      {
        id: effectiveId,
        aud: 'authenticated',
        role: 'authenticated',
        email: user.email || (payload.email as string) || '',
        app_metadata: { provider: 'email', providers: ['email'] },
        user_metadata: { name: user.name || '' },
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
      { headers: corsHeaders }
    );
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Unauthorized' }, { status: 401, headers: corsHeaders });
  }
}
