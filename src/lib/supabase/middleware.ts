import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Admin client for middleware super admin check
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  {
    auth: { autoRefreshToken: false, persistSession: false }
  }
);

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
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
  const isPublicPage = path === '/' || path.startsWith('/api/whatsapp/webhook');
  const isDashboardPage = path.startsWith('/dashboard');
  const isMemberPage = path.startsWith('/member') && !path.startsWith('/member/login') && !path.startsWith('/member/register');
  
  const isSuperAdminRoute = path.startsWith('/superadmin');
  const isSuperAdminLogin = path === '/superadmin/login';

  // Helper to preserve refreshed cookies across redirects (M-1 fix)
  const redirectWithCookies = (url: URL | string) => {
    const redirectResponse = NextResponse.redirect(url);
    supabaseResponse.cookies.getAll().forEach((cookie) => {
      redirectResponse.cookies.set(cookie.name, cookie.value, cookie);
    });
    return redirectResponse;
  };

  // Route protection
  if (isSuperAdminRoute) {
    if (!user) {
      if (!isSuperAdminLogin) {
        return redirectWithCookies(new URL('/superadmin/login', request.url));
      }
    } else {
      // Check if user is super admin
      const { data: superAdmin } = await supabaseAdmin
        .from('super_admins')
        .select('id')
        .eq('user_id', user.id)
        .eq('is_active', true)
        .maybeSingle();
        
      if (superAdmin) {
        // Is a super admin
        if (isSuperAdminLogin) {
          return redirectWithCookies(new URL('/superadmin', request.url));
        }
      } else {
        // Not a super admin
        if (!isSuperAdminLogin) {
          return redirectWithCookies(new URL('/superadmin/login', request.url));
        }
      }
    }
  }

  if (!user && (isDashboardPage || isMemberPage)) {
    // Redirect unauthenticated users to login
    const url = new URL('/login', request.url);
    return redirectWithCookies(url);
  }

  if (user && isAuthPage && !isSuperAdminRoute) {
    // If user is already logged in, redirect away from login pages
    const { data: userData } = await supabase
      .from('users')
      .select('role, gym_id')
      .eq('auth_id', user.id)
      .maybeSingle();

    if (userData) {
      if (userData.role === 'owner' || userData.role === 'receptionist') {
        return redirectWithCookies(new URL(userData.gym_id ? '/dashboard' : '/dashboard/onboarding', request.url));
      } else if (userData.role === 'trainer') {
        return redirectWithCookies(new URL('/trainer/dashboard', request.url));
      }
    }

    // Check if it's a gym member
    const { data: memberData } = await supabase
      .from('members')
      .select('id')
      .eq('auth_id', user.id)
      .maybeSingle();

    if (memberData) {
      return redirectWithCookies(new URL('/member/dashboard', request.url));
    }

    // Default for newly registered user without a profile: Onboarding
    return redirectWithCookies(new URL('/dashboard/onboarding', request.url));
  }

  // Protect API routes (except public webhooks and auth callbacks)
  if (path.startsWith('/api/') && 
      !path.startsWith('/api/auth/') && 
      !path.startsWith('/api/whatsapp/webhook') &&
      !path.startsWith('/api/payments/razorpay/webhook') &&
      !path.startsWith('/api/payments/razorpay/verify') &&
      !path.startsWith('/api/attendance/face-mark') &&
      !path.startsWith('/api/cron') &&
      !path.startsWith('/api/settings/cctv-ping')) {
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
  }

  // M-2 FIX: Optimized gym check in 1 step using joined relation or single query
  if (user && path.startsWith('/dashboard') && !path.startsWith('/dashboard/suspended') && !path.startsWith('/dashboard/onboarding')) {
    const { data: userData } = await supabase
      .from('users')
      .select('gym_id, gyms:gym_id(is_suspended)')
      .eq('auth_id', user.id)
      .maybeSingle();
    
    if (userData?.gym_id) {
      const gym = Array.isArray(userData.gyms) ? userData.gyms[0] : userData.gyms;
      if (gym?.is_suspended === true) {
        return redirectWithCookies(new URL('/dashboard/suspended', request.url));
      }
    } else {
      // User has no gym assigned yet -> redirect to onboarding
      return redirectWithCookies(new URL('/dashboard/onboarding', request.url));
    }
  }

  return supabaseResponse;
}
