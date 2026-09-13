/**
 * Swipe and gesture recognition utilities.
 * Accurately detects deliberate horizontal swipes while rejecting vertical page scrolling.
 */

export interface TouchPoint {
  x: number;
  y: number;
  time: number;
}

export interface SwipeOptions {
  /** Minimum displacement in pixels to qualify as a swipe (default: 50) */
  minDistance?: number;
  /** Maximum duration in milliseconds for the swipe gesture (default: 600) */
  maxDuration?: number;
  /** Ratio of primary axis displacement to secondary axis displacement (default: 1.5) */
  dominanceRatio?: number;
}

export type SwipeDirection = 'left' | 'right' | 'up' | 'down' | null;

/**
 * Calculates the swipe direction from a start point to an end point.
 * Ensures the gesture was fast, deliberate, and dominated by the primary axis.
 */
export function detectSwipeDirection(
  start: TouchPoint,
  end: TouchPoint,
  options: SwipeOptions = {}
): SwipeDirection {
  const { minDistance = 50, maxDuration = 600, dominanceRatio = 1.5 } = options;

  const dx = end.x - start.x;
  const dy = end.y - start.y;
  const dt = end.time - start.time;

  // 1. Time threshold check (must be within maxDuration and non-negative)
  if (dt < 0 || dt > maxDuration) {
    return null;
  }

  const absDx = Math.abs(dx);
  const absDy = Math.abs(dy);

  // 2. Horizontal Swipe Check
  if (absDx >= minDistance && absDx >= absDy * dominanceRatio) {
    return dx < 0 ? 'left' : 'right';
  }

  // 3. Vertical Swipe Check
  if (absDy >= minDistance && absDy >= absDx * dominanceRatio) {
    return dy < 0 ? 'up' : 'down';
  }

  // Not a dominated swipe or below distance threshold
  return null;
}

/**
 * Checks if a gesture is specifically a Right-to-Left swipe (finger moved left).
 */
export function isRightToLeftSwipe(
  start: TouchPoint,
  end: TouchPoint,
  options?: SwipeOptions
): boolean {
  return detectSwipeDirection(start, end, options) === 'left';
}

/**
 * Checks if a gesture is specifically a Left-to-Right swipe (finger moved right).
 */
export function isLeftToRightSwipe(
  start: TouchPoint,
  end: TouchPoint,
  options?: SwipeOptions
): boolean {
  return detectSwipeDirection(start, end, options) === 'right';
}

/**
 * Triggers haptic feedback if supported by the browser/device.
 */
export function triggerHapticFeedback(durationMs: number = 40): void {
  if (typeof window !== 'undefined' && typeof navigator !== 'undefined' && 'vibrate' in navigator) {
    try {
      navigator.vibrate(durationMs);
    } catch {
      // Haptics not allowed or unsupported
    }
  }
}
