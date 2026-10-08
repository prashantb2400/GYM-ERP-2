import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { supabaseAdmin } from '@/lib/supabase/admin';

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
      const { data: { user } } = await supabase.auth.getUser();

      const forwardedHost = request.headers.get('x-forwarded-host');
      const host = request.headers.get('host');
      const isLocalEnv = process.env.NODE_ENV === 'development';
      const isTrustedForwardedHost = Boolean(forwardedHost && host && forwardedHost.toLowerCase() === host.toLowerCase());

      const buildRedirect = (targetPath: string) => {
        if (isLocalEnv) {
          return NextResponse.redirect(`${origin}${targetPath}`);
        } else if (isTrustedForwardedHost) {
          return NextResponse.redirect(`https://${forwardedHost}${targetPath}`);
        } else {
          return NextResponse.redirect(`${origin}${targetPath}`);
        }
      };

      if (user) {
        // 1. Check if user is a member
        const { data: memberData } = await supabaseAdmin
          .from('members')
          .select('id, gym_id')
          .eq('auth_id', user.id)
          .maybeSingle();

        if (memberData) {
          const target = next.startsWith('/member') ? next : '/member/dashboard';
          return buildRedirect(target);
        }

        // 2. Check if user is in users table (owner, trainer, receptionist, admin)
        const { data: userData } = await supabaseAdmin
          .from('users')
          .select('id, gym_id, role')
          .eq('auth_id', user.id)
          .maybeSingle();

        if (userData) {
          if (userData.role === 'trainer') {
            const target = next.startsWith('/trainer') ? next : '/trainer/dashboard';
            return buildRedirect(target);
          }

          if (userData.role === 'owner' && !userData.gym_id) {
            return buildRedirect('/dashboard/onboarding');
          }

          const target = (next && next !== '/' && !next.startsWith('/member')) ? next : '/dashboard';
          return buildRedirect(target);
        }

        // 3. User has no record yet. If destination is explicitly a member page, preserve it
        if (next.startsWith('/member')) {
          return buildRedirect(next);
        }

        // New signup defaulting to owner onboarding
        return buildRedirect('/dashboard/onboarding');
      }

      return buildRedirect(next);
    }
  }

  // Return user to login with error
  return NextResponse.redirect(`${origin}/login?error=auth-code-exchange-failed`);
}
