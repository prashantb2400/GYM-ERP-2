import { describe, it, expect, beforeEach, vi } from 'vitest';
import { useAuthStore } from '@/store/authStore';

describe('Cold-Boot Auth Hydration & Onboarding Gating', () => {
  beforeEach(() => {
    localStorage.clear();
    useAuthStore.setState({
      user: null,
      member: null,
      loading: true,
      isInitialized: false,
      error: null,
      needsOnboarding: false,
    });
  });

  it('persists and restores user session with gymId across reboots', () => {
    const mockOwner = {
      id: 'owner-1',
      authId: 'auth-1',
      gymId: 'gym-uuid-1234',
      branchId: 'branch-1',
      name: 'Gym Owner',
      email: 'owner@ironfitness.com',
      role: 'owner' as const,
      permissions: ['*'] as any,
      photoUrl: null,
      isActive: true,
    };

    // Simulate login or session resolution
    useAuthStore.getState().setSession({
      user: mockOwner,
      member: null,
      needsOnboarding: false,
    });

    const state = useAuthStore.getState();
    expect(state.user).toEqual(mockOwner);
    expect(state.user?.gymId).toBe('gym-uuid-1234');
    expect(state.needsOnboarding).toBe(false);
    expect(state.loading).toBe(false);
    expect(state.isInitialized).toBe(true);

    // Verify localStorage key for cached gym ID is also set
    expect(localStorage.getItem('gymerp_cached_gym_id')).toBe('gym-uuid-1234');
  });

  it('clears stored session and cached gymId on logout', () => {
    const mockOwner = {
      id: 'owner-1',
      authId: 'auth-1',
      gymId: 'gym-uuid-1234',
      branchId: 'branch-1',
      name: 'Gym Owner',
      email: 'owner@ironfitness.com',
      role: 'owner' as const,
      permissions: ['*'] as any,
      photoUrl: null,
      isActive: true,
    };

    useAuthStore.getState().setSession({
      user: mockOwner,
      member: null,
      needsOnboarding: false,
    });
    expect(localStorage.getItem('gymerp_cached_gym_id')).toBe('gym-uuid-1234');

    useAuthStore.getState().logout();

    const state = useAuthStore.getState();
    expect(state.user).toBeNull();
    expect(state.member).toBeNull();
    expect(state.needsOnboarding).toBe(false);
    expect(localStorage.getItem('gymerp_cached_gym_id')).toBeNull();

    const persistedRaw = localStorage.getItem('gymerp_auth_session');
    if (persistedRaw) {
      const parsed = JSON.parse(persistedRaw);
      expect(parsed.state.user).toBeNull();
      expect(parsed.state.member).toBeNull();
    }
  });

  it('flags needsOnboarding only for genuine unconfigured owners with empty gymId', () => {
    const newOwnerWithoutGym = {
      id: 'new-owner',
      authId: 'auth-new',
      gymId: '',
      branchId: null,
      name: 'Brand New Owner',
      email: 'newowner@test.com',
      role: 'owner' as const,
      permissions: ['settings.manage'] as any,
      photoUrl: null,
      isActive: true,
    };

    useAuthStore.getState().setSession({
      user: newOwnerWithoutGym,
      member: null,
      needsOnboarding: true,
    });

    const state = useAuthStore.getState();
    expect(state.needsOnboarding).toBe(true);
    expect(state.user?.gymId).toBe('');
  });

  it('keeps existing valid session intact during temporary server glitch', () => {
    const existingOwner = {
      id: 'owner-persist',
      authId: 'auth-persist',
      gymId: 'gym-persisted-999',
      branchId: 'branch-main',
      name: 'Persisted Owner',
      email: 'persist@gym.com',
      role: 'owner' as const,
      permissions: ['*'] as any,
      photoUrl: null,
      isActive: true,
    };

    useAuthStore.getState().setSession({
      user: existingOwner,
      member: null,
      needsOnboarding: false,
    });

    // Simulate transient error
    useAuthStore.getState().setError('Network timeout');

    const state = useAuthStore.getState();
    // User must not be wiped by transient error
    expect(state.user).not.toBeNull();
    expect(state.user?.gymId).toBe('gym-persisted-999');
    expect(state.needsOnboarding).toBe(false);
  });
});
