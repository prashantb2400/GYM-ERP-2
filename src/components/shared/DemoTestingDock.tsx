'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/authStore';
import {
  Sparkles,
  Zap,
  Users,
  Dumbbell,
  MessageCircle,
  LayoutDashboard,
  Mic,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { toast } from 'sonner';
import { DEFAULT_PERMISSIONS, UserRole } from '@/types/auth';

export function DemoTestingDock() {
  const [collapsed, setCollapsed] = useState(false);
  const [mounted, setMounted] = useState(false);
  const pathname = usePathname();
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const member = useAuthStore((s) => s.member);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return null;

  // Don't show in superadmin
  if (pathname.startsWith('/superadmin')) return null;

  const currentRole = member ? 'member' : (user?.role || 'owner');

  const switchRole = (newRole: 'owner' | 'receptionist' | 'trainer' | 'member') => {
    if (newRole === 'member') {
      useAuthStore.getState().setSession({
        user: null,
        member: {
          id: 'demo-member-001',
          authId: 'demo-auth-member-001',
          gymId: 'demo-gym-ironpulse',
          branchId: null,
          name: 'Rahul Sharma',
          phone: '9876543210',
          memberCode: 'MEM-1042',
          photoUrl: null,
        },
        needsOnboarding: false,
      });
      document.cookie = 'gymerp_dev_auth=true; path=/; max-age=86400';
      toast.success('Switched to Member Mobile Perspective!');
      router.push('/member/exercise');
      return;
    }

    const roleConfigs = {
      owner: {
        name: 'Vikram Malhotra (Owner)',
        email: 'admin@gymerp.local',
        role: 'owner' as UserRole,
        permissions: DEFAULT_PERMISSIONS.owner,
        dest: '/dashboard',
      },
      receptionist: {
        name: 'Priya Patel (Receptionist)',
        email: 'priya.reception@ironfitness.com',
        role: 'receptionist' as UserRole,
        permissions: DEFAULT_PERMISSIONS.receptionist,
        dest: '/dashboard/attendance',
      },
      trainer: {
        name: 'Raj Singh (Coach)',
        email: 'raj.coach@ironfitness.com',
        role: 'trainer' as UserRole,
        permissions: DEFAULT_PERMISSIONS.trainer,
        dest: '/dashboard/workouts',
      },
    };

    const cfg = roleConfigs[newRole];
    useAuthStore.getState().setSession({
      user: {
        id: `demo-${newRole}-001`,
        authId: `demo-auth-${newRole}-001`,
        gymId: 'demo-gym-ironpulse',
        branchId: null,
        photoUrl: null,
        email: cfg.email,
        name: cfg.name,
        role: cfg.role,
        permissions: cfg.permissions,
        isActive: true,
      },
      member: null,
      needsOnboarding: false,
    });
    document.cookie = 'gymerp_dev_auth=true; path=/; max-age=86400';
    toast.success(`Switched role to ${newRole.toUpperCase()}`);
    router.push(cfg.dest);
  };

  const quickLinks = [
    { label: 'Speed Cockpit', href: '/dashboard/attendance', icon: Zap },
    { label: '3-Step Stepper', href: '/dashboard/members/add', icon: Users },
    { label: 'Floor Logger', href: '/member/exercise', icon: Dumbbell },
    { label: 'WhatsApp Studio', href: '/dashboard/whatsapp', icon: MessageCircle },
    { label: 'Owner Analytics', href: '/dashboard', icon: LayoutDashboard },
    { label: 'Voice Kiosk', href: '/kiosk/agent', icon: Mic },
  ];

  if (collapsed) {
    return (
      <div className="fixed bottom-4 right-4 z-50">
        <button
          onClick={() => setCollapsed(false)}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-purple-600/90 hover:bg-purple-600 text-white shadow-xl shadow-purple-600/30 text-xs font-semibold backdrop-blur-md border border-purple-400/30 transition-all hover:scale-105 cursor-pointer"
        >
          <Sparkles className="h-3.5 w-3.5 animate-pulse text-amber-300" />
          <span>Evaluation Dock</span>
          <ChevronUp className="h-3.5 w-3.5 ml-0.5" />
        </button>
      </div>
    );
  }

  return (
    <div className="fixed bottom-3 left-1/2 -translate-x-1/2 z-50 max-w-[95vw] sm:max-w-max">
      <div className="flex flex-wrap items-center gap-2 px-3 py-2 rounded-2xl bg-zinc-950/90 border border-purple-500/30 backdrop-blur-xl shadow-2xl shadow-purple-950/50 text-xs text-zinc-200">
        <div className="flex items-center gap-1.5 pr-2 border-r border-zinc-800">
          <div className="h-2 w-2 rounded-full bg-emerald-400 animate-ping" />
          <span className="font-bold text-purple-300 text-[11px] tracking-wide flex items-center gap-1">
            <Sparkles className="h-3 w-3 text-amber-400" />
            EVALUATION DOCK
          </span>
        </div>

        {/* Quick Links */}
        <div className="flex items-center gap-1 overflow-x-auto scrollbar-none py-0.5">
          {quickLinks.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-1 px-2.5 py-1 rounded-lg font-medium text-[11px] transition-all whitespace-nowrap ${
                  isActive
                    ? 'bg-purple-600 text-white shadow-sm'
                    : 'text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800/60'
                }`}
              >
                <Icon className="h-3 w-3" />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </div>

        {/* Role Switcher */}
        <div className="flex items-center gap-1 pl-2 border-l border-zinc-800">
          <span className="text-[10px] text-zinc-500 uppercase font-semibold hidden md:inline">Role:</span>
          {(['owner', 'receptionist', 'trainer', 'member'] as const).map((r) => (
            <button
              key={r}
              onClick={() => switchRole(r)}
              className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase transition-all cursor-pointer ${
                currentRole === r
                  ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                  : 'text-zinc-500 hover:text-zinc-300 hover:bg-zinc-900'
              }`}
            >
              {r === 'owner' ? 'Owner' : r === 'receptionist' ? 'Front-Desk' : r === 'trainer' ? 'Coach' : 'Member'}
            </button>
          ))}
        </div>

        {/* Minimize Button */}
        <button
          onClick={() => setCollapsed(true)}
          className="text-zinc-500 hover:text-zinc-300 p-1 hover:bg-zinc-900 rounded cursor-pointer"
          title="Minimize Dock"
        >
          <ChevronDown className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
}
