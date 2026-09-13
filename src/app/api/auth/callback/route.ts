import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get('code');
  const rawNext = searchParams.get('next') ?? '/dashboard';
  // Prevent open redirect: ensure next is a relative path and not protocol-relative (//)
  const isSafeNext = rawNext.startsWith('/') && !rawNext.startsWith('//') && !rawNext.startsWith('/\\');
  const next = isSafeNext ? rawNext : '/dashboard';

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    
    if (!error) {
      // Check if user exists in the public.users table.
      // If not, they are a brand new owner signing up.
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: userData } = await supabase
          .from('users')
          .select('id, gym_id')
          .eq('auth_id', user.id)
          .single();

        if (!userData) {
          // Redirect new signup to owner onboarding wizard
          return NextResponse.redirect(`${origin}/dashboard/onboarding`);
        } else if (!userData.gym_id) {
          // If user exists but hasn't created a gym profile
          return NextResponse.redirect(`${origin}/dashboard/onboarding`);
        }
      }
      
      const forwardedHost = request.headers.get('x-forwarded-host');
      const host = request.headers.get('host');
      const isLocalEnv = process.env.NODE_ENV === 'development';
      const isTrustedForwardedHost = Boolean(forwardedHost && host && forwardedHost.toLowerCase() === host.toLowerCase());
      
      if (isLocalEnv) {
        return NextResponse.redirect(`${origin}${next}`);
      } else if (isTrustedForwardedHost) {
        return NextResponse.redirect(`https://${forwardedHost}${next}`);
      } else {
        return NextResponse.redirect(`${origin}${next}`);
      }
    }
  }

  // Return the user to an error page with instructions
  return NextResponse.redirect(`${origin}/login?error=auth-code-exchange-failed`);
}
