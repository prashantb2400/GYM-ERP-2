'use client';

import { useState, useRef, useCallback, CSSProperties } from 'react';
import {
  TouchPoint,
  SwipeOptions,
  detectSwipeDirection,
  triggerHapticFeedback,
} from '@/lib/utils/gesture';

export interface UseSwipeGestureOptions extends SwipeOptions {
  /** Callback fired when swiping right-to-left (finger slides left) */
  onSwipeLeft?: () => void | Promise<void>;
  /** Callback fired when swiping left-to-right (finger slides right) */
  onSwipeRight?: () => void | Promise<void>;
  /** Minimum delay between consecutive swipe actions in milliseconds (default: 800) */
  cooldownMs?: number;
  /** Whether swipe gesture recognition is currently active (default: true) */
  enabled?: boolean;
}

export interface SwipeGestureBinding {
  onTouchStart: (e: React.TouchEvent) => void;
  onTouchEnd: (e: React.TouchEvent) => void;
  onTouchCancel: () => void;
  onMouseDown: (e: React.MouseEvent) => void;
  onMouseUp: (e: React.MouseEvent) => void;
  onMouseLeave: () => void;
  style: CSSProperties;
}

export function useSwipeGesture(options: UseSwipeGestureOptions = {}) {
  const {
    onSwipeLeft,
    onSwipeRight,
    minDistance = 50,
    maxDuration = 600,
    dominanceRatio = 1.5,
    cooldownMs = 800,
    enabled = true,
  } = options;

  const [isFlipping, setIsFlipping] = useState(false);
  const [swipeFeedback, setSwipeFeedback] = useState<string | null>(null);

  const startPointRef = useRef<TouchPoint | null>(null);
  const isFlippingRef = useRef(false);
  const lastTriggerTimeRef = useRef(0);
  const feedbackTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Helper to check if a touch or click originated on an interactive child element
  const isInteractiveTarget = (target: EventTarget | null): boolean => {
    if (!target || !(target instanceof HTMLElement)) return false;
    return !!target.closest('button, a, input, select, textarea, [role="button"]');
  };

  const executeSwipeAction = useCallback(
    async (direction: 'left' | 'right') => {
      const now = Date.now();
      if (now - lastTriggerTimeRef.current < cooldownMs || isFlippingRef.current) {
        return;
      }

      lastTriggerTimeRef.current = now;
      isFlippingRef.current = true;
      setIsFlipping(true);

      // Trigger physical haptic feedback on mobile
      triggerHapticFeedback(40);

      // Show temporary HUD feedback badge
      const feedbackMsg = direction === 'left' ? 'Switching Camera...' : 'Switching Camera...';
      setSwipeFeedback(feedbackMsg);

      if (feedbackTimerRef.current) {
        clearTimeout(feedbackTimerRef.current);
      }
      feedbackTimerRef.current = setTimeout(() => {
        setSwipeFeedback(null);
      }, 1400);

      try {
        if (direction === 'left' && onSwipeLeft) {
          await onSwipeLeft();
        } else if (direction === 'right' && onSwipeRight) {
          await onSwipeRight();
        } else if (direction === 'right' && onSwipeLeft) {
          // If only onSwipeLeft is provided, treat horizontal swipe as camera toggle
          await onSwipeLeft();
        }
      } catch (err) {
        console.warn('Swipe camera toggle execution error:', err);
      } finally {
        setTimeout(() => {
          isFlippingRef.current = false;
          setIsFlipping(false);
        }, 400);
      }
    },
    [cooldownMs, onSwipeLeft, onSwipeRight]
  );

  // Touch Handlers
  const handleTouchStart = useCallback(
    (e: React.TouchEvent) => {
      if (!enabled || isInteractiveTarget(e.target)) {
        startPointRef.current = null;
        return;
      }
      if (e.touches.length === 1) {
        startPointRef.current = {
          x: e.touches[0].clientX,
          y: e.touches[0].clientY,
          time: Date.now(),
        };
      }
    },
    [enabled]
  );

  const handleTouchEnd = useCallback(
    (e: React.TouchEvent) => {
      if (!enabled || !startPointRef.current || e.changedTouches.length === 0) {
        startPointRef.current = null;
        return;
      }

      const endPoint: TouchPoint = {
        x: e.changedTouches[0].clientX,
        y: e.changedTouches[0].clientY,
        time: Date.now(),
      };

      const direction = detectSwipeDirection(startPointRef.current, endPoint, {
        minDistance,
        maxDuration,
        dominanceRatio,
      });

      startPointRef.current = null;

      if (direction === 'left' || direction === 'right') {
        executeSwipeAction(direction);
      }
    },
    [enabled, minDistance, maxDuration, dominanceRatio, executeSwipeAction]
  );

  const handleTouchCancel = useCallback(() => {
    startPointRef.current = null;
  }, []);

  // Mouse Handlers (for desktop testing and trackpad drag)
  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      if (!enabled || e.button !== 0 || isInteractiveTarget(e.target)) {
        startPointRef.current = null;
        return;
      }
      startPointRef.current = {
        x: e.clientX,
        y: e.clientY,
        time: Date.now(),
      };
    },
    [enabled]
  );

  const handleMouseUp = useCallback(
    (e: React.MouseEvent) => {
      if (!enabled || !startPointRef.current) {
        startPointRef.current = null;
        return;
      }

      const endPoint: TouchPoint = {
        x: e.clientX,
        y: e.clientY,
        time: Date.now(),
      };

      const direction = detectSwipeDirection(startPointRef.current, endPoint, {
        minDistance,
        maxDuration,
        dominanceRatio,
      });

      startPointRef.current = null;

      if (direction === 'left' || direction === 'right') {
        executeSwipeAction(direction);
      }
    },
    [enabled, minDistance, maxDuration, dominanceRatio, executeSwipeAction]
  );

  const handleMouseLeave = useCallback(() => {
    startPointRef.current = null;
  }, []);

  const swipeHandlers: SwipeGestureBinding = {
    onTouchStart: handleTouchStart,
    onTouchEnd: handleTouchEnd,
    onTouchCancel: handleTouchCancel,
    onMouseDown: handleMouseDown,
    onMouseUp: handleMouseUp,
    onMouseLeave: handleMouseLeave,
    style: { touchAction: 'pan-y' },
  };

  return {
    swipeHandlers,
    isFlipping,
    swipeFeedback,
  };
}
