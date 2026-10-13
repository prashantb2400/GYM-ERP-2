import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  formatWorkoutMessage,
  selectDayByDayOfWeek,
  getTodayWorkoutForMember,
  dispatchCheckinWorkoutRoutine,
} from '@/lib/workout/checkin-dispatcher';
import { supabaseAdmin } from '@/lib/supabase/admin';
import * as waFactory from '@/lib/whatsapp/factory';

describe('Check-In Workout Routine Dispatcher', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    vi.spyOn(supabaseAdmin, 'from').mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              order: vi.fn().mockReturnValue({
                limit: vi.fn().mockReturnValue({
                  maybeSingle: vi.fn().mockResolvedValue({
                    data: null,
                    error: null,
                  }),
                }),
              }),
            }),
          }),
          order: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue({
              data: [],
              error: null,
            }),
          }),
        }),
      }),
    } as any);
  });

  describe('formatWorkoutMessage', () => {
    it('formats a complete workout routine message with exercises and links', () => {
      const exercises = [
        { exerciseName: 'Barbell Flat Bench Press', sets: 4, reps: 6, restSeconds: 120 },
        { exerciseName: 'Dumbbell Incline Press', sets: 3, reps: 10, restSeconds: 90 },
      ];

      const msg = formatWorkoutMessage('PPL Classic', 'Push Day', exercises, 'Alex');

      expect(msg).toContain('Welcome to the Gym, Alex!');
      expect(msg).toContain("Today's Split: *PPL Classic*");
      expect(msg).toContain('Session: *Push Day*');
      expect(msg).toContain('1. *Barbell Flat Bench Press* - 4 sets x 6 reps (120s rest)');
      expect(msg).toContain('2. *Dumbbell Incline Press* - 3 sets x 10 reps (90s rest)');
      expect(msg).toContain('/member/exercise');
      expect(msg).toContain('Crush your session today!');
    });
  });

  describe('selectDayByDayOfWeek', () => {
    it('returns a valid day from a multi-day routine', () => {
      const days = [
        { dayName: 'Push Day' },
        { dayName: 'Pull Day' },
        { dayName: 'Legs Day' },
      ];

      const selected = selectDayByDayOfWeek(days);
      expect(selected).toBeDefined();
      expect(['Push Day', 'Pull Day', 'Legs Day']).toContain(selected.dayName);
    });

    it('returns null for empty days array', () => {
      expect(selectDayByDayOfWeek([])).toBeNull();
    });
  });

  describe('getTodayWorkoutForMember', () => {
    it('returns member assigned routine when active assignment exists', async () => {
      vi.spyOn(supabaseAdmin, 'from').mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                order: vi.fn().mockReturnValue({
                  limit: vi.fn().mockReturnValue({
                    maybeSingle: vi.fn().mockResolvedValue({
                      data: {
                        workout_routines: {
                          name: 'Custom Strength Focus',
                          days: [
                            {
                              dayName: 'Day 1: Heavy Bench',
                              exercises: [{ exerciseName: 'Bench Press', sets: 5, reps: 5 }],
                            },
                          ],
                        },
                      },
                      error: null,
                    }),
                  }),
                }),
              }),
            }),
          }),
        }),
      } as any);

      const workout = await getTodayWorkoutForMember('member-1', 'gym-1');

      expect(workout).toBeDefined();
      expect(workout?.routineName).toBe('Custom Strength Focus');
      expect(workout?.dayName).toBe('Day 1: Heavy Bench');
      expect(workout?.exercises).toHaveLength(1);
    });

    it('falls back to Starter PPL routine when no assigned routine exists', async () => {
      vi.spyOn(supabaseAdmin, 'from').mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                order: vi.fn().mockReturnValue({
                  limit: vi.fn().mockReturnValue({
                    maybeSingle: vi.fn().mockResolvedValue({
                      data: null,
                      error: null,
                    }),
                  }),
                }),
              }),
            }),
            order: vi.fn().mockReturnValue({
              limit: vi.fn().mockResolvedValue({
                data: [],
                error: null,
              }),
            }),
          }),
        }),
      } as any);

      const workout = await getTodayWorkoutForMember('member-2', 'gym-2');

      expect(workout).toBeDefined();
      expect(workout?.routineName).toContain('Push / Pull / Legs');
      expect(workout?.exercises.length).toBeGreaterThanOrEqual(3);
    });
  });

  describe('dispatchCheckinWorkoutRoutine', () => {
    it('dispatches workout message to member phone via WhatsApp provider', async () => {
      const mockSendText = vi.fn().mockResolvedValue({ success: true, messageId: 'msg-123' });
      vi.spyOn(waFactory, 'getWhatsAppProvider').mockResolvedValue({
        sendText: mockSendText,
      } as any);

      vi.spyOn(supabaseAdmin, 'from').mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                order: vi.fn().mockReturnValue({
                  limit: vi.fn().mockReturnValue({
                    maybeSingle: vi.fn().mockResolvedValue({
                      data: null,
                      error: null,
                    }),
                  }),
                }),
              }),
            }),
            order: vi.fn().mockReturnValue({
              limit: vi.fn().mockResolvedValue({
                data: [],
                error: null,
              }),
            }),
          }),
        }),
      } as any);

      const result = await dispatchCheckinWorkoutRoutine({
        memberId: 'member-3',
        gymId: 'gym-3',
        memberName: 'Sarah Connor',
        phone: '9876543210',
        checkinMethod: 'face_recognition',
      });

      expect(result.dispatched).toBe(true);
      expect(mockSendText).toHaveBeenCalledTimes(1);
      expect(mockSendText).toHaveBeenCalledWith(
        '919876543210',
        expect.stringContaining('Welcome to the Gym, Sarah Connor!'),
        'gym-3',
        'member-3'
      );
    });

    it('returns dispatched: false when member has no phone recorded', async () => {
      const result = await dispatchCheckinWorkoutRoutine({
        memberId: 'member-4',
        gymId: 'gym-4',
        memberName: 'John Doe',
        phone: null,
      });

      expect(result.dispatched).toBe(false);
      expect(result.reason).toContain('no phone');
    });

    it('safely catches errors and returns reason without throwing', async () => {
      vi.spyOn(waFactory, 'getWhatsAppProvider').mockRejectedValue(new Error('WhatsApp service down'));

      const result = await dispatchCheckinWorkoutRoutine({
        memberId: 'member-5',
        gymId: 'gym-5',
        memberName: 'Bruce Wayne',
        phone: '9198888777',
      });

      expect(result.dispatched).toBe(false);
      expect(result.reason).toContain('WhatsApp service down');
    });
  });
});
