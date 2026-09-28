import { describe, it, expect, vi, beforeEach } from 'vitest';
import React from 'react';
import { render, screen } from '@testing-library/react';
import AdminDashboardLayout from '@/app/dashboard/layout';
import DashboardHome from '@/app/dashboard/page';
import { useAuthStore } from '@/store/authStore';

// Mock heavy DashboardHome page to prevent JSDOM memory exhaustion
vi.mock('@/app/dashboard/page', () => ({
  default: () => <div data-testid="dashboard-home">Dashboard Home Content</div>,
}));

// Mock AdminTopbar to isolate whether topbar/commandmenu is causing heap blowout
vi.mock('@/components/layout/AdminTopbar', () => ({
  AdminTopbar: () => <div data-testid="admin-topbar">Topbar</div>,
}));

// Mock next/navigation
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn(),
    prefetch: vi.fn(),
  }),
  usePathname: () => '/dashboard',
  useSearchParams: () => new URLSearchParams(),
}));

// Mock next-themes
vi.mock('next-themes', () => ({
  useTheme: () => ({ theme: 'dark', setTheme: vi.fn() }),
}));

// Mock supabase client
vi.mock('@/lib/supabase/client', () => ({
  createClient: () => ({
    auth: {
      getSession: vi.fn().mockResolvedValue({ data: { session: null } }),
      getUser: vi.fn().mockResolvedValue({ data: { user: null } }),
      onAuthStateChange: vi.fn().mockReturnValue({
        data: { subscription: { unsubscribe: vi.fn() } },
      }),
    },
    from: vi.fn().mockReturnValue({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      in: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      limit: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: null, error: null }),
      maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
    }),
    channel: vi.fn().mockReturnValue({
      on: vi.fn().mockReturnThis(),
      subscribe: vi.fn().mockReturnThis(),
    }),
    removeChannel: vi.fn(),
  }),
}));

describe('Dashboard Rendering', () => {
  beforeEach(() => {
    useAuthStore.setState({
      user: null,
      member: null,
      loading: false,
      error: null,
    });
  });

  it('renders redirecting state when user is not authenticated and not loading', () => {
    const { container } = render(
      <AdminDashboardLayout>
        <div>Child content</div>
      </AdminDashboardLayout>
    );

    expect(screen.getByText('Redirecting to login...')).toBeInTheDocument();
    expect(container.querySelector('div')).not.toBeNull();
  });

  it('renders verifying session state when loading and unauthenticated', () => {
    useAuthStore.setState({
      user: null,
      member: null,
      loading: true,
      error: null,
    });

    render(
      <AdminDashboardLayout>
        <div>Child content</div>
      </AdminDashboardLayout>
    );

    expect(screen.getByText('Verifying session...')).toBeInTheDocument();
  });

  it('renders dashboard with sidebar and content when user is authenticated with gymId', () => {
    useAuthStore.setState({
      user: {
        id: 'u1',
        authId: 'a1',
        gymId: 'g1',
        branchId: 'b1',
        name: 'Gym Owner',
        email: 'owner@gym.com',
        role: 'owner',
        permissions: ['*'] as any,
        photoUrl: null,
        isActive: true,
      },
      member: null,
      loading: false,
      error: null,
    });

    const { container } = render(
      <AdminDashboardLayout>
        <DashboardHome />
      </AdminDashboardLayout>
    );

    expect(screen.getByText('GymERP')).toBeInTheDocument();
    expect(screen.getByText('Dashboard')).toBeInTheDocument();
  });

  it('handles authenticated user with empty gymId cleanly without crashing', () => {
    useAuthStore.setState({
      user: {
        id: 'u2',
        authId: 'a2',
        gymId: '',
        branchId: null,
        name: 'New Owner',
        email: 'newowner@gym.com',
        role: 'owner',
        permissions: ['*'] as any,
        photoUrl: null,
        isActive: true,
      },
      member: null,
      loading: false,
      error: null,
    });

    const { container } = render(
      <AdminDashboardLayout>
        <DashboardHome />
      </AdminDashboardLayout>
    );

    expect(container.firstChild).not.toBeNull();
  });
});
