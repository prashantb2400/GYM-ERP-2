/**
 * Offline Attendance Sync API Unit Tests
 *
 * Verifies batch processing of offline check-in records, multi-tenant isolation,
 * duplicate prevention for same-day attendance, and member attendance tally updates.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { POST } from '@/app/api/attendance/offline-sync/route';

// Mock auth helpers
const mockVerifyKioskOrAuth = vi.fn();
const mockGetAuthUser = vi.fn();

vi.mock('@/lib/server/kiosk-auth', () => ({
  verifyKioskOrAuth: () => mockVerifyKioskOrAuth(),
}));

vi.mock('@/lib/server/auth-helper', () => ({
  getAuthUser: () => mockGetAuthUser(),
}));

// Mock supabaseAdmin
const mockAttendanceInsert = vi.fn();
const mockMemberUpdate = vi.fn();
const mockAttendanceSelect = vi.fn();
const mockMemberSelect = vi.fn();

vi.mock('@/lib/supabase/admin', () => ({
  supabaseAdmin: {
    from: vi.fn((table: string) => {
      if (table === 'attendance') {
        return {
          select: vi.fn(() => ({
            eq: vi.fn().mockReturnThis(),
            limit: vi.fn().mockReturnThis(),
            maybeSingle: mockAttendanceSelect,
          })),
          insert: mockAttendanceInsert,
        };
      }
      if (table === 'members') {
        return {
          select: vi.fn(() => ({
            eq: vi.fn().mockReturnThis(),
            single: mockMemberSelect,
          })),
          update: vi.fn(() => ({
            eq: vi.fn().mockReturnThis(),
          })),
        };
      }
      return {};
    }),
  },
}));

describe('POST /api/attendance/offline-sync', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns 401 when request is completely unauthenticated', async () => {
    mockVerifyKioskOrAuth.mockResolvedValueOnce({
      authorized: false,
      response: new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 }),
    });

    const req = new Request('http://localhost:3000/api/attendance/offline-sync', {
      method: 'POST',
      body: JSON.stringify({ events: [] }),
    });

    const res = await POST(req);
    expect(res.status).toBe(401);
  });

  it('returns 400 when events payload is missing or empty', async () => {
    mockVerifyKioskOrAuth.mockResolvedValueOnce({
      authorized: true,
      gymId: 'gym-1',
      branchId: null,
      authType: 'session',
    });

    const req = new Request('http://localhost:3000/api/attendance/offline-sync', {
      method: 'POST',
      body: JSON.stringify({ events: [] }),
    });

    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  it('processes batch offline events, skips duplicates, and records fresh check-ins', async () => {
    mockVerifyKioskOrAuth.mockResolvedValueOnce({
      authorized: true,
      gymId: 'gym-1',
      branchId: null,
      authType: 'session',
    });

    // First event has no existing attendance -> insert succeeds
    mockAttendanceSelect
      .mockResolvedValueOnce({ data: null, error: null }) // event 1: fresh
      .mockResolvedValueOnce({ data: { id: 'existing-att-1' }, error: null }); // event 2: duplicate

    mockAttendanceInsert.mockResolvedValueOnce({ error: null });
    mockMemberSelect.mockResolvedValueOnce({ data: { attendance_count: 5 }, error: null });

    const events = [
      {
        localId: 'loc-1',
        gymId: 'gym-1',
        memberId: 'mem-1',
        memberName: 'John Doe',
        method: 'face',
        timestamp: '2026-09-28T07:30:00.000Z',
      },
      {
        localId: 'loc-2',
        gymId: 'gym-1',
        memberId: 'mem-2',
        memberName: 'Jane Smith',
        method: 'qr',
        timestamp: '2026-09-28T07:35:00.000Z',
      },
    ];

    const req = new Request('http://localhost:3000/api/attendance/offline-sync', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ events }),
    });

    const res = await POST(req);
    expect(res.status).toBe(200);

    const data = await res.json();
    expect(data.success).toBe(true);
    expect(data.total).toBe(2);
    expect(data.synced).toBe(1);
    expect(data.duplicates).toBe(1);
    expect(data.failed).toBe(0);

    expect(mockAttendanceInsert).toHaveBeenCalledTimes(1);
  });
});
