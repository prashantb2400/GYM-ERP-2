import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get('code');
  const rawNext = searchParams.get('next') ?? '/dashboard';

  // H-5 FIX: Validate 'next' to prevent open redirect attacks.
  // Must be a relative path starting with / but NOT // (protocol-relative URL)
  const next = rawNext.startsWith('/') && !rawNext.startsWith('//')
    ? rawNext
    : '/dashboard';

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    
    if (!error) {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: userData } = await supabase
          .from('users')
          .select('id, gym_id')
          .eq('auth_id', user.id)
          .maybeSingle();

        if (!userData) {
          return NextResponse.redirect(`${origin}/dashboard/onboarding`);
        } else if (!userData.gym_id) {
          return NextResponse.redirect(`${origin}/dashboard/onboarding`);
        }
      }
      
      const forwardedHost = request.headers.get('x-forwarded-host');
      const isLocalEnv = process.env.NODE_ENV === 'development';

      // H-5 FIX: Validate x-forwarded-host against allowed hosts
      const allowedHosts = [
        process.env.NEXT_PUBLIC_SITE_URL?.replace(/^https?:\/\//, '') ?? '',
        'gym-erp-2.vercel.app',
        'localhost',
      ].filter(Boolean);

      const isTrustedHost = forwardedHost && allowedHosts.some(h => forwardedHost === h || forwardedHost.endsWith(`.${h}`));

      if (isLocalEnv) {
        return NextResponse.redirect(`${origin}${next}`);
      } else if (forwardedHost && isTrustedHost) {
        return NextResponse.redirect(`https://${forwardedHost}${next}`);
      } else {
        return NextResponse.redirect(`${origin}${next}`);
      }
    }
  }

  return NextResponse.redirect(`${origin}/login?error=auth-code-exchange-failed`);
}
