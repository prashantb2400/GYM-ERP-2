import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GET as getRoutines, POST as postRoutines } from '@/app/api/workouts/routines/route';
import { GET as getLogs, POST as postLogs } from '@/app/api/workouts/log/route';
import { supabaseAdmin } from '@/lib/supabase/admin';
import * as authHelper from '@/lib/server/auth-helper';

describe('Workout & Routine API Routes', () => {
  const mockUser = {
    id: 'trainer-001',
    user_metadata: { gym_id: 'gym-123' },
    app_metadata: {},
  };

  beforeEach(() => {
    vi.restoreAllMocks();
    vi.spyOn(authHelper, 'getAuthUser').mockResolvedValue({
      user: mockUser as any,
      error: null,
    });
  });

  describe('GET /api/workouts/routines', () => {
    it('returns starter routines and custom gym routines', async () => {
      const mockSelect = vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          order: vi.fn().mockResolvedValue({
            data: [{ id: 'custom-1', name: 'Arnold Chest Day', split_type: 'Custom' }],
            error: null,
          }),
        }),
      });
      vi.spyOn(supabaseAdmin, 'from').mockReturnValue({ select: mockSelect } as any);

      const request = new Request('http://localhost:3000/api/workouts/routines');
      const response = await getRoutines(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.starterRoutines.length).toBeGreaterThanOrEqual(2);
      expect(data.customRoutines).toHaveLength(1);
      expect(data.customRoutines[0].name).toBe('Arnold Chest Day');
    });

    it('returns 401 when unauthenticated', async () => {
      vi.spyOn(authHelper, 'getAuthUser').mockResolvedValue({
        user: null,
        error: 'Unauthorized',
      });

      const request = new Request('http://localhost:3000/api/workouts/routines');
      const response = await getRoutines(request);
      expect(response.status).toBe(401);
    });
  });

  describe('POST /api/workouts/routines', () => {
    it('creates a new custom workout routine', async () => {
      const mockInsert = vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({
            data: { id: 'routine-new', name: 'Hypertrophy Upper', split_type: 'Upper_Lower' },
            error: null,
          }),
        }),
      });
      vi.spyOn(supabaseAdmin, 'from').mockReturnValue({ insert: mockInsert } as any);

      const request = new Request('http://localhost:3000/api/workouts/routines', {
        method: 'POST',
        body: JSON.stringify({
          action: 'create',
          name: 'Hypertrophy Upper',
          split_type: 'Upper_Lower',
          days_per_week: 4,
          schedule: [],
        }),
      });

      const response = await postRoutines(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.routine.name).toBe('Hypertrophy Upper');
    });

    it('assigns a routine to a member', async () => {
      const mockUpdate = vi.fn().mockReturnValue({
        eq: vi.fn().mockResolvedValue({ error: null }),
      });
      const mockInsert = vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({
            data: { id: 'assign-1', member_id: 'mem-99', routine_id: 'ppl_classic', active: true },
            error: null,
          }),
        }),
      });

      vi.spyOn(supabaseAdmin, 'from').mockImplementation((table: string) => {
        if (table === 'member_assigned_routines') {
          return { update: mockUpdate, insert: mockInsert } as any;
        }
        return {} as any;
      });

      const request = new Request('http://localhost:3000/api/workouts/routines', {
        method: 'POST',
        body: JSON.stringify({
          action: 'assign',
          member_id: 'mem-99',
          routine_id: 'ppl_classic',
        }),
      });

      const response = await postRoutines(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.assignment.active).toBe(true);
    });
  });

  describe('POST /api/workouts/log', () => {
    it('records a completed workout session and calculates volume and 1RMs', async () => {
      const mockInsert = vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({
            data: { id: 'log-101', total_volume_kg: 2400 },
            error: null,
          }),
        }),
      });
      vi.spyOn(supabaseAdmin, 'from').mockReturnValue({ insert: mockInsert } as any);

      const request = new Request('http://localhost:3000/api/workouts/log', {
        method: 'POST',
        body: JSON.stringify({
          member_id: 'mem-10',
          session_name: 'Bench Press Day',
          sets: [
            { exerciseName: 'Barbell Bench Press', weight: 100, reps: 8, rpe: 9 }, // 800kg vol, ~130 1RM
            { exerciseName: 'Barbell Bench Press', weight: 100, reps: 8, rpe: 9 }, // 800kg vol
            { exerciseName: 'Barbell Bench Press', weight: 100, reps: 8, rpe: 9 }, // 800kg vol
          ],
        }),
      });

      const response = await postLogs(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.totalVolumeKg).toBe(2400); // 3 * (100 * 8)
      expect(data.estimatedOneRms['Barbell Bench Press']).toBeGreaterThan(120);
    });
  });
});
