import { describe, it, expect, vi, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import {
  detectSwipeDirection,
  isRightToLeftSwipe,
  isLeftToRightSwipe,
  triggerHapticFeedback,
  TouchPoint,
} from '@/lib/utils/gesture';
import { useSwipeGesture } from '@/hooks/useSwipeGesture';

describe('Swipe & Gesture Detection Engine', () => {
  describe('detectSwipeDirection', () => {
    it('detects a clean right-to-left swipe (finger moves left)', () => {
      const start: TouchPoint = { x: 300, y: 200, time: 1000 };
      const end: TouchPoint = { x: 180, y: 205, time: 1250 }; // dx = -120, dy = 5, dt = 250ms

      const direction = detectSwipeDirection(start, end);
      expect(direction).toBe('left');
      expect(isRightToLeftSwipe(start, end)).toBe(true);
      expect(isLeftToRightSwipe(start, end)).toBe(false);
    });

    it('detects a clean left-to-right swipe (finger moves right)', () => {
      const start: TouchPoint = { x: 100, y: 150, time: 1000 };
      const end: TouchPoint = { x: 220, y: 140, time: 1200 }; // dx = +120, dy = -10, dt = 200ms

      const direction = detectSwipeDirection(start, end);
      expect(direction).toBe('right');
      expect(isLeftToRightSwipe(start, end)).toBe(true);
      expect(isRightToLeftSwipe(start, end)).toBe(false);
    });

    it('rejects vertical page scrolling (dy dominates dx)', () => {
      const start: TouchPoint = { x: 200, y: 200, time: 1000 };
      const end: TouchPoint = { x: 185, y: 350, time: 1200 }; // dx = -15, dy = +150, dt = 200ms

      const direction = detectSwipeDirection(start, end);
      expect(direction).toBe('down');
      expect(isRightToLeftSwipe(start, end)).toBe(false);
    });

    it('rejects diagonal gestures where neither axis is dominant', () => {
      const start: TouchPoint = { x: 200, y: 200, time: 1000 };
      const end: TouchPoint = { x: 130, y: 140, time: 1250 }; // dx = -70, dy = -60

      const direction = detectSwipeDirection(start, end);
      expect(direction).toBeNull();
      expect(isRightToLeftSwipe(start, end)).toBe(false);
    });

    it('rejects short gestures below minDistance threshold', () => {
      const start: TouchPoint = { x: 200, y: 200, time: 1000 };
      const end: TouchPoint = { x: 165, y: 202, time: 1150 }; // dx = -35 (below 50px default)

      const direction = detectSwipeDirection(start, end);
      expect(direction).toBeNull();
      expect(isRightToLeftSwipe(start, end)).toBe(false);
    });

    it('rejects slow drags exceeding maxDuration', () => {
      const start: TouchPoint = { x: 300, y: 200, time: 1000 };
      const end: TouchPoint = { x: 150, y: 205, time: 1800 }; // dt = 800ms (exceeds 600ms default)

      const direction = detectSwipeDirection(start, end);
      expect(direction).toBeNull();
      expect(isRightToLeftSwipe(start, end)).toBe(false);
    });

    it('rejects negative time intervals (clock skew)', () => {
      const start: TouchPoint = { x: 300, y: 200, time: 1000 };
      const end: TouchPoint = { x: 150, y: 200, time: 900 }; // dt = -100ms

      expect(detectSwipeDirection(start, end)).toBeNull();
    });

    it('respects custom swipe options', () => {
      const start: TouchPoint = { x: 100, y: 100, time: 1000 };
      const end: TouchPoint = { x: 70, y: 100, time: 1200 }; // dx = -30

      expect(detectSwipeDirection(start, end)).toBeNull();
      expect(detectSwipeDirection(start, end, { minDistance: 25 })).toBe('left');
    });
  });

  describe('triggerHapticFeedback', () => {
    const originalNavigator = global.navigator;

    afterEach(() => {
      vi.restoreAllMocks();
    });

    it('calls navigator.vibrate when supported', () => {
      const vibrateMock = vi.fn();
      vi.stubGlobal('navigator', { ...originalNavigator, vibrate: vibrateMock });

      triggerHapticFeedback(50);
      expect(vibrateMock).toHaveBeenCalledWith(50);
    });

    it('gracefully handles missing or throwing vibrate API', () => {
      vi.stubGlobal('navigator', { ...originalNavigator, vibrate: undefined });
      expect(() => triggerHapticFeedback(40)).not.toThrow();
    });
  });

  describe('useSwipeGesture Hook', () => {
    it('binds touch handlers and fires onSwipeLeft on right-to-left swipe', async () => {
      const onSwipeLeft = vi.fn();
      const { result } = renderHook(() => useSwipeGesture({ onSwipeLeft }));

      expect(result.current.swipeHandlers.style.touchAction).toBe('pan-y');

      // Simulate touch start
      act(() => {
        result.current.swipeHandlers.onTouchStart({
          touches: [{ clientX: 250, clientY: 100 }] as any,
          target: document.createElement('div'),
        } as any);
      });

      // Simulate touch end 150ms later with -100px delta X
      await act(async () => {
        result.current.swipeHandlers.onTouchEnd({
          changedTouches: [{ clientX: 150, clientY: 105 }] as any,
        } as any);
      });

      expect(onSwipeLeft).toHaveBeenCalledTimes(1);
    });

    it('ignores touches originating on interactive buttons', async () => {
      const onSwipeLeft = vi.fn();
      const { result } = renderHook(() => useSwipeGesture({ onSwipeLeft }));

      const buttonEl = document.createElement('button');

      act(() => {
        result.current.swipeHandlers.onTouchStart({
          touches: [{ clientX: 250, clientY: 100 }] as any,
          target: buttonEl,
        } as any);
      });

      await act(async () => {
        result.current.swipeHandlers.onTouchEnd({
          changedTouches: [{ clientX: 150, clientY: 105 }] as any,
        } as any);
      });

      expect(onSwipeLeft).not.toHaveBeenCalled();
    });

    it('enforces cooldown against rapid multi-swipes', async () => {
      const onSwipeLeft = vi.fn();
      const { result } = renderHook(() => useSwipeGesture({ onSwipeLeft, cooldownMs: 1000 }));

      // First swipe
      act(() => {
        result.current.swipeHandlers.onTouchStart({
          touches: [{ clientX: 300, clientY: 100 }] as any,
          target: document.createElement('div'),
        } as any);
      });
      await act(async () => {
        result.current.swipeHandlers.onTouchEnd({
          changedTouches: [{ clientX: 150, clientY: 100 }] as any,
        } as any);
      });
      expect(onSwipeLeft).toHaveBeenCalledTimes(1);

      // Immediate second swipe within cooldown
      act(() => {
        result.current.swipeHandlers.onTouchStart({
          touches: [{ clientX: 300, clientY: 100 }] as any,
          target: document.createElement('div'),
        } as any);
      });
      await act(async () => {
        result.current.swipeHandlers.onTouchEnd({
          changedTouches: [{ clientX: 150, clientY: 100 }] as any,
        } as any);
      });

      // Still 1, not 2!
      expect(onSwipeLeft).toHaveBeenCalledTimes(1);
    });
  });
});
