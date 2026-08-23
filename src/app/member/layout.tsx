'use client';

import React, { useEffect, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import {
  LayoutDashboard,
  CreditCard,
  CalendarCheck,
  Receipt,
  Apple,
  Dumbbell,
  LogOut,
  User,
  Loader2,
} from 'lucide-react';
import Link from 'next/link';

export default function MemberPortalLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const supabase = createClient();
  
  const [loading, setLoading] = useState(true);
  const [member, setMember] = useState<any>(null);

  useEffect(() => {
    const fetchMemberSession = async () => {
      try {
        setLoading(true);
        const { data: { user: authUser } } = await supabase.auth.getUser();
        
        if (!authUser) {
          router.replace('/member/login');
          return;
        }

        // H-4 FIX: Use strict auth_id eq — .or() with email.eq.undefined breaks PostgREST
        const { data, error } = await supabase
          .from('members')
          .select('*, plans(name)')
          .eq('auth_id', authUser.id)
          .maybeSingle();

        if (error || !data) {
          // H-4 FIX: Don't fall back to mock data — redirect unlinked users to login
          // A missing member record means auth_id was never linked (S0-9 fix resolves this going forward)
          router.replace('/member/login?error=account-not-linked');
          return;
        }

        setMember(data);
      } catch (err) {
        console.error('Session error:', err);
        router.replace('/member/login');
      } finally {
        setLoading(false);
      }
    };

    fetchMemberSession();
  }, [router]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.replace('/member/login');
  };

  const navItems = [
    { label: 'Dashboard', href: '/member/dashboard', icon: LayoutDashboard },
    { label: 'Plan', href: '/member/plan', icon: CreditCard },
    { label: 'Diet', href: '/member/diet', icon: Apple },
    { label: 'Workout', href: '/member/exercise', icon: Dumbbell },
  ];

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-zinc-950 text-white">
        <Loader2 className="h-8 w-8 animate-spin text-purple-500" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 flex flex-col pb-20 sm:pb-0">
      
      {/* Top Header */}
      <header className="border-b border-zinc-900 bg-zinc-900/50 backdrop-blur px-4 py-3.5 flex justify-between items-center sticky top-0 z-50">
        <div className="flex items-center gap-2">
          <div className="bg-purple-600 p-1.5 rounded-lg text-white font-black text-sm">GE</div>
          <span className="font-extrabold tracking-wider text-xs text-zinc-200 uppercase">Member Hub</span>
        </div>

        <div className="flex items-center gap-3">
          <div className="text-right">
            <span className="text-xs font-bold text-zinc-200 block leading-tight">{member?.name}</span>
            <span className="text-[10px] text-zinc-500 block leading-none">{member?.member_code}</span>
          </div>

          <button
            onClick={handleLogout}
            className="p-2 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-900"
            title="Log Out"
          >
            <LogOut className="h-4 w-4" />
          </button>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 max-w-md mx-auto w-full px-4 py-6">
        {children}
      </main>

      {/* Mobile Bottom Navigation Bar */}
      <nav className="fixed bottom-0 inset-x-0 border-t border-zinc-900 bg-zinc-950/80 backdrop-blur-md px-6 py-2 flex justify-between items-center sm:hidden z-50">
        {navItems.map((item) => {
          const isActive = pathname === item.href;
          const Icon = item.icon;
          
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex flex-col items-center gap-1 text-[9px] font-bold tracking-wide transition-colors ${
                isActive ? 'text-purple-400' : 'text-zinc-500 hover:text-zinc-300'
              }`}
            >
              <Icon className="h-5 w-5" />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
