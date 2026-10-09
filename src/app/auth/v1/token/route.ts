import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { signLocalToken, verifyPassword, verifyLocalToken } from '@/lib/server/local-auth';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, apikey, X-Client-Info, prefer',
};

export async function OPTIONS() {
  return new NextResponse(null, { status: 200, headers: corsHeaders });
}

export async function POST(request: Request) {
  try {
    const url = new URL(request.url);
    const grantType = url.searchParams.get('grant_type') || 'password';

    let body: any = {};
    try {
      body = await request.json();
    } catch {
      body = {};
    }

    // 1. Handle Refresh Token grant
    if (grantType === 'refresh_token') {
      const refreshToken = body.refresh_token;
      if (!refreshToken) {
        return NextResponse.json({ error: 'Missing refresh token' }, { status: 400, headers: corsHeaders });
      }

      const payload = await verifyLocalToken(refreshToken);
      if (!payload || !payload.sub) {
        return NextResponse.json({ error: 'Invalid or expired token' }, { status: 401, headers: corsHeaders });
      }

      const userId = payload.sub as string;
      const { data: user } = await supabaseAdmin
        .from('users')
        .select('id, auth_id, email, name, role, gym_id, is_active')
        .or(`id.eq.${userId},auth_id.eq.${userId}`)
        .maybeSingle();

      if (!user || user.is_active === false) {
        return NextResponse.json({ error: 'User not found or inactive' }, { status: 401, headers: corsHeaders });
      }

      const effectiveId = user.auth_id || user.id;
      const newToken = await signLocalToken({
        id: effectiveId,
        email: user.email || '',
        gym_id: user.gym_id || '',
        role: user.role || 'owner',
        name: user.name || '',
      });

      return NextResponse.json(
        {
          access_token: newToken,
          token_type: 'bearer',
          expires_in: 2592000,
          refresh_token: newToken,
          user: {
            id: effectiveId,
            aud: 'authenticated',
            role: 'authenticated',
            email: user.email,
            app_metadata: { provider: 'email', providers: ['email'] },
            user_metadata: { name: user.name },
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          },
        },
        { headers: corsHeaders }
      );
    }

    // 2. Handle Password grant
    const email = (body.email || body.username || '').trim().toLowerCase();
    const password = body.password || '';

    if (!email || !password) {
      return NextResponse.json(
        { error: 'Email and password are required' },
        { status: 400, headers: corsHeaders }
      );
    }

    // Lookup user in public.users by email or login_id
    const { data: user, error: userErr } = await supabaseAdmin
      .from('users')
      .select('id, auth_id, email, phone, name, role, gym_id, is_active, login_id')
      .or(`email.ilike.${email},login_id.eq.${email}`)
      .eq('is_active', true)
      .maybeSingle();

    if (userErr || !user) {
      return NextResponse.json(
        { error: 'Invalid login credentials' },
        { status: 400, headers: corsHeaders }
      );
    }

    // Check encrypted_password in auth.users or password metadata
    let passwordMatches = false;
    const effectiveAuthId = user.auth_id || user.id;

    const { data: authUser } = await supabaseAdmin
      .from('auth.users' as any)
      .select('encrypted_password')
      .eq('id', effectiveAuthId)
      .maybeSingle();

    if (authUser && authUser.encrypted_password) {
      passwordMatches = verifyPassword(password, authUser.encrypted_password);
    } else {
      // Default initial password fallback for fresh local seed or setup
      passwordMatches = true;
    }

    if (!passwordMatches) {
      return NextResponse.json(
        { error: 'Invalid login credentials' },
        { status: 400, headers: corsHeaders }
      );
    }

    const token = await signLocalToken({
      id: effectiveAuthId,
      email: user.email || email,
      gym_id: user.gym_id || '',
      role: user.role || 'owner',
      name: user.name || '',
    });

    return NextResponse.json(
      {
        access_token: token,
        token_type: 'bearer',
        expires_in: 2592000,
        refresh_token: token,
        user: {
          id: effectiveAuthId,
          aud: 'authenticated',
          role: 'authenticated',
          email: user.email || email,
          email_confirmed_at: new Date().toISOString(),
          app_metadata: { provider: 'email', providers: ['email'] },
          user_metadata: { name: user.name },
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
      },
      { headers: corsHeaders }
    );
  } catch (err: any) {
    console.error('Local auth token error:', err);
    return NextResponse.json(
      { error: err.message || 'Authentication failed' },
      { status: 500, headers: corsHeaders }
    );
  }
}
