import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Admin client for middleware super admin check
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 'placeholder-service-key';

const supabaseAdmin = createClient(
  supabaseUrl,
  supabaseServiceKey,
  {
    auth: { autoRefreshToken: false, persistSession: false }
  }
);

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co',
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'placeholder-anon-key',
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => request.cookies.set(name, value));
          supabaseResponse = NextResponse.next({
            request,
          });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  // Refresh session if expired
  const { data: { user } } = await supabase.auth.getUser();

  const path = request.nextUrl.pathname;
  const isAuthPage = ['/login', '/staff/login', '/member/login', '/member/register'].some(p => path.startsWith(p));
  const isPublicPage = path === '/';
  const isDashboardPage = path.startsWith('/dashboard');
  const isMemberPage = path.startsWith('/member') && !path.startsWith('/member/login') && !path.startsWith('/member/register');
  
  const isSuperAdminRoute = path.startsWith('/superadmin');
  const isSuperAdminLogin = path === '/superadmin/login';

  // Route protection
  if (isSuperAdminRoute) {
    if (!user) {
      if (!isSuperAdminLogin) {
        return NextResponse.redirect(new URL('/superadmin/login', request.url));
      }
    } else {
      // Check if user is super admin
      const { data: superAdmin } = await supabaseAdmin
        .from('super_admins')
        .select('id')
        .eq('user_id', user.id)
        .eq('is_active', true)
        .single();
        
      if (superAdmin) {
        // Is a super admin
        if (isSuperAdminLogin) {
          return NextResponse.redirect(new URL('/superadmin', request.url));
        }
      } else {
        // Not a super admin
        if (!isSuperAdminLogin) {
          return NextResponse.redirect(new URL('/superadmin/login', request.url));
        }
      }
    }
  }

  const isDevBypass = process.env.NODE_ENV === 'development' && request.cookies.get('gymerp_dev_auth')?.value === 'true';

  if (isDevBypass) {
    return supabaseResponse;
  }

  const isKioskRoute = path.includes('/attendance/') && path.includes('kiosk');

  if (!user && (isDashboardPage || isMemberPage) && !isKioskRoute) {
    // Redirect unauthenticated users to login with target destination preserved
    const url = new URL('/login', request.url);
    url.searchParams.set('next', path);
    return NextResponse.redirect(url);
  }

  if (user && isAuthPage && !isSuperAdminRoute) {
    // If user is already logged in, redirect away from login pages
    // Query role using admin client to eliminate RLS/cookie timing issues
    const { data: userData } = await supabaseAdmin
      .from('users')
      .select('role, gym_id')
      .eq('auth_id', user.id)
      .maybeSingle();

    if (userData) {
      if (!userData.gym_id) {
        const { data: ownerGym } = await supabaseAdmin
          .from('gyms')
          .select('id')
          .eq('owner_id', user.id)
          .limit(1)
          .maybeSingle();

        if (ownerGym) {
          return NextResponse.redirect(new URL('/dashboard', request.url));
        }
        return NextResponse.redirect(new URL('/dashboard/onboarding', request.url));
      }
      if (userData.role === 'owner' || userData.role === 'receptionist') {
        return NextResponse.redirect(new URL('/dashboard', request.url));
      } else if (userData.role === 'trainer') {
        return NextResponse.redirect(new URL('/trainer/dashboard', request.url));
      }
    }

    // Check if user is a member
    const { data: memberData } = await supabaseAdmin
      .from('members')
      .select('id')
      .eq('auth_id', user.id)
      .maybeSingle();

    if (memberData || path.startsWith('/member')) {
      return NextResponse.redirect(new URL('/member/dashboard', request.url));
    }

    // Check if user already owns a gym before defaulting to onboarding
    const { data: ownerGym } = await supabaseAdmin
      .from('gyms')
      .select('id')
      .eq('owner_id', user.id)
      .limit(1)
      .maybeSingle();

    if (ownerGym) {
      return NextResponse.redirect(new URL('/dashboard', request.url));
    }

    // Default for /login or /staff/login when no user row exists yet -> onboarding
    return NextResponse.redirect(new URL('/dashboard/onboarding', request.url));
  }

  // Cross-portal protection: ensure owners/staff stay in /dashboard and members stay in /member
  if (user && isMemberPage) {
    const { data: userData } = await supabaseAdmin
      .from('users')
      .select('role, gym_id')
      .eq('auth_id', user.id)
      .maybeSingle();

    if (userData) {
      if (!userData.gym_id) {
        return NextResponse.redirect(new URL('/dashboard/onboarding', request.url));
      }
      return NextResponse.redirect(new URL('/dashboard', request.url));
    }
  }

  if (user && isDashboardPage && !path.startsWith('/dashboard/suspended') && !path.startsWith('/dashboard/onboarding')) {
    const { data: userData } = await supabaseAdmin
      .from('users')
      .select('role, gym_id')
      .eq('auth_id', user.id)
      .maybeSingle();

    if (!userData) {
      // Check if platform super admin
      const { data: superAdmin } = await supabaseAdmin
        .from('super_admins')
        .select('id')
        .eq('user_id', user.id)
        .eq('is_active', true)
        .maybeSingle();

      if (!superAdmin) {
        const { data: memberData } = await supabaseAdmin
          .from('members')
          .select('id')
          .eq('auth_id', user.id)
          .maybeSingle();

        if (memberData) {
          return NextResponse.redirect(new URL('/member/dashboard', request.url));
        }
      }
    }
  }

  // Protect API routes (except public webhooks, auth callbacks, edge hardware endpoints, and kiosk endpoints)
  const isExcludedApiRoute = 
    !path.startsWith('/api/') ||
    path.startsWith('/api/auth/') || 
    path.startsWith('/api/whatsapp/webhook') ||
    path.startsWith('/api/payments/razorpay/webhook') ||
    path.startsWith('/api/cctv/webhook') ||
    path.startsWith('/api/settings/cctv-ping') ||
    path.startsWith('/api/cron/') ||
    path.startsWith('/api/kiosk/');

  if (!isExcludedApiRoute) {
    let authenticatedUser = user;

    if (!authenticatedUser) {
      const authHeader = request.headers.get('authorization');
      if (authHeader?.startsWith('Bearer ')) {
        const token = authHeader.replace(/^Bearer\s+/i, '').trim();
        if (token) {
          try {
            const { data: verified, error: verifyErr } = await supabase.auth.getUser(token);
            if (!verifyErr && verified?.user) {
              authenticatedUser = verified.user;
            }
          } catch {
            // Token verification error
          }
        }
      }
    }

    // If neither cookie session nor valid Bearer token is verified, reject with 401
    if (!authenticatedUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
  }

  // Check if gym is suspended
  if (user && path.startsWith('/dashboard') && !path.startsWith('/dashboard/suspended') && !path.startsWith('/dashboard/onboarding')) {
    const { data: userData } = await supabaseAdmin
      .from('users')
      .select('gym_id')
      .eq('auth_id', user.id)
      .maybeSingle();
    
    if (userData?.gym_id) {
      const { data: gymData } = await supabaseAdmin
        .from('gyms')
        .select('is_suspended')
        .eq('id', userData.gym_id)
        .maybeSingle();
      
      if (gymData?.is_suspended === true) {
        return NextResponse.redirect(new URL('/dashboard/suspended', request.url));
      }
    }
  }

  return supabaseResponse;
}
