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

  if (!user && (isDashboardPage || isMemberPage)) {
    // Redirect unauthenticated users to landing page or login
    const url = new URL('/login', request.url);
    return NextResponse.redirect(url);
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
        return NextResponse.redirect(new URL(userData.gym_id ? '/dashboard' : '/dashboard/onboarding', request.url));
      } else if (userData.role === 'trainer') {
        return NextResponse.redirect(new URL('/trainer/dashboard', request.url));
      }
    }

    // Check if it's a gym member
    const { data: memberData } = await supabase
      .from('members')
      .select('id')
      .eq('auth_id', user.id)
      .maybeSingle();

    if (memberData) {
      return NextResponse.redirect(new URL('/member/dashboard', request.url));
    }

    // Default for newly registered user without a profile: Onboarding
    return NextResponse.redirect(new URL('/dashboard/onboarding', request.url));
  }

  // Protect API routes (except public webhooks and auth callbacks)
  if (path.startsWith('/api/') && 
      !path.startsWith('/api/auth/') && 
      !path.startsWith('/api/whatsapp/webhook') &&
      !path.startsWith('/api/payments/razorpay/webhook') &&
      !path.startsWith('/api/attendance/face-mark') &&
      !path.startsWith('/api/cron') && // S0-8 FIX: no trailing slash — matches /api/cron and /api/cron/due-reminders
      !path.startsWith('/api/settings/cctv-ping')) {
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
  }

  // Check if gym is suspended or if owner needs onboarding
  if (user && path.startsWith('/dashboard') && !path.startsWith('/dashboard/suspended') && !path.startsWith('/dashboard/onboarding')) {
    const { data: userData } = await supabase
      .from('users')
      .select('gym_id')
      .eq('auth_id', user.id)
      .maybeSingle();
    
    if (userData?.gym_id) {
      const { data: gymData } = await supabase
        .from('gyms')
        .select('is_suspended')
        .eq('id', userData.gym_id)
        .maybeSingle();
      
      if (gymData?.is_suspended === true) {
        return NextResponse.redirect(new URL('/dashboard/suspended', request.url));
      }
    } else {
      // User has no gym assigned yet -> redirect to onboarding
      return NextResponse.redirect(new URL('/dashboard/onboarding', request.url));
    }
  }

  return supabaseResponse;
}
