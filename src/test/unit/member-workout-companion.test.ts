import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GET as getRoutines } from '@/app/api/workouts/routines/route';
import { GET as getLogs, POST as postLogs } from '@/app/api/workouts/log/route';
import { supabaseAdmin } from '@/lib/supabase/admin';
import * as authHelper from '@/lib/server/auth-helper';
import { calculateBarbellPlates } from '@/lib/workout/plate-calculator';
import { estimateOneRepMax } from '@/lib/workout/one-rep-max';

describe('Member Workout Companion Workflows', () => {
  const mockMemberUser = {
    id: 'auth-member-888',
    user_metadata: {}, // Intentionally empty metadata to test gym_id auto-healing from members table
    app_metadata: {},
  };

  beforeEach(() => {
    vi.restoreAllMocks();
    vi.spyOn(authHelper, 'getAuthUser').mockResolvedValue({
      user: mockMemberUser as any,
      error: null,
    });
  });

  describe('Member Routine Resolution (GET /api/workouts/routines?member_id=...)', () => {
    it('resolves assigned routine and recovers gym_id when metadata is absent', async () => {
      // Mock lookup from members table
      const mockFrom = vi.spyOn(supabaseAdmin, 'from').mockImplementation((table: string) => {
        if (table === 'members') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                maybeSingle: vi.fn().mockResolvedValue({
                  data: { gym_id: 'gym-recovery-999' },
                  error: null,
                }),
              }),
            }),
          } as any;
        }

        if (table === 'member_assigned_routines') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                eq: vi.fn().mockReturnValue({
                  order: vi.fn().mockReturnValue({
                    limit: vi.fn().mockReturnValue({
                      maybeSingle: vi.fn().mockResolvedValue({
                        data: {
                          id: 'assignment-1',
                          active: true,
                          workout_routines: {
                            id: 'routine-custom-1',
                            name: 'Athlete Hypertrophy Split',
                            split_type: 'PPL',
                          },
                        },
                        error: null,
                      }),
                    }),
                  }),
                }),
              }),
            }),
          } as any;
        }

        return {} as any;
      });

      const request = new Request('http://localhost:3000/api/workouts/routines?member_id=member-777');
      const response = await getRoutines(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.assignedRoutine).toBeDefined();
      expect(data.assignedRoutine.workout_routines.name).toBe('Athlete Hypertrophy Split');
      expect(data.starterRoutines.length).toBeGreaterThanOrEqual(2);
    });
  });

  describe('Member Session Logging (POST /api/workouts/log)', () => {
    it('logs member workout and calculates volume and 1RMs with recovered gym_id', async () => {
      vi.spyOn(supabaseAdmin, 'from').mockImplementation((table: string) => {
        if (table === 'members') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                maybeSingle: vi.fn().mockResolvedValue({
                  data: { gym_id: 'gym-recovery-999' },
                  error: null,
                }),
              }),
            }),
          } as any;
        }

        if (table === 'workout_logs') {
          return {
            insert: vi.fn().mockReturnValue({
              select: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({
                  data: {
                    id: 'log-uuid-555',
                    gym_id: 'gym-recovery-999',
                    member_id: 'member-777',
                    session_name: 'Push Day A',
                    total_volume_kg: 2400,
                    duration_minutes: 50,
                  },
                  error: null,
                }),
              }),
            }),
          } as any;
        }

        return {} as any;
      });

      const request = new Request('http://localhost:3000/api/workouts/log', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          member_id: 'member-777',
          session_name: 'Push Day A',
          duration_minutes: 50,
          sets: [
            { exerciseName: 'Flat Bench Press', weight: 80, reps: 10, rpe: 9 }, // 800kg vol, 1RM: 80 * (1 + 11/30) = 109.3kg
            { exerciseName: 'Flat Bench Press', weight: 80, reps: 10, rpe: 9 }, // 800kg vol
            { exerciseName: 'Overhead Press', weight: 40, reps: 10, rpe: 8 },  // 400kg vol
            { exerciseName: 'Overhead Press', weight: 40, reps: 10, rpe: 8 },  // 400kg vol
          ],
          notes: 'Great pump on bench press today',
        }),
      });

      const response = await postLogs(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.totalVolumeKg).toBe(2400);
      expect(data.estimatedOneRms['Flat Bench Press']).toBeGreaterThan(100);
      expect(data.estimatedOneRms['Overhead Press']).toBeGreaterThan(50);
    });
  });

  describe('Member History Retrieval (GET /api/workouts/log?member_id=...)', () => {
    it('retrieves member workout history sessions', async () => {
      vi.spyOn(supabaseAdmin, 'from').mockImplementation((table: string) => {
        if (table === 'members') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                maybeSingle: vi.fn().mockResolvedValue({
                  data: { gym_id: 'gym-recovery-999' },
                  error: null,
                }),
              }),
            }),
          } as any;
        }

        if (table === 'workout_logs') {
          const queryMock: any = {};
          queryMock.eq = vi.fn().mockReturnValue(queryMock);
          queryMock.order = vi.fn().mockReturnValue(queryMock);
          queryMock.limit = vi.fn().mockResolvedValue({
            data: [
              { id: 'log-1', session_name: 'Legs A', total_volume_kg: 3200, date: '2026-10-12' },
              { id: 'log-2', session_name: 'Pull A', total_volume_kg: 2800, date: '2026-10-10' },
            ],
            error: null,
          });
          return {
            select: vi.fn().mockReturnValue(queryMock),
          } as any;
        }

        return {} as any;
      });

      const request = new Request('http://localhost:3000/api/workouts/log?member_id=member-777');
      const response = await getLogs(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.logs).toHaveLength(2);
      expect(data.logs[0].session_name).toBe('Legs A');
    });
  });

  describe('Client Gym Floor Math for Member Portal', () => {
    it('calculates barbell plate loading accurately for member', () => {
      // 72.5kg target on Olympic 20kg bar -> 52.5kg on plates -> 26.25kg per side (25 + 1.25)
      const res = calculateBarbellPlates(72.5, { barWeight: 20, unit: 'kg' });
      expect(res.weightPerSide).toBe(26.25);
      expect(res.actualTotalWeight).toBe(72.5);
      expect(res.remainder).toBe(0);
      expect(res.platesPerSide).toEqual([
        { plate: 25, count: 1 },
        { plate: 1.25, count: 1 },
      ]);
    });

    it('estimates 1RM with RPE calculation accurately for member', () => {
      // 100kg for 5 reps @ RPE 9 -> effective reps: 5 + (10 - 9) = 6
      // Epley: 100 * (1 + 6/30) = 120kg
      const est = estimateOneRepMax(100, 5, 'epley', 9);
      expect(est.estimatedOneRm).toBe(120);
      expect(est.percentages.ninetyFive).toBe(114);
      expect(est.percentages.ninety).toBe(108);
      expect(est.percentages.eighty).toBe(96);
    });
  });
});
