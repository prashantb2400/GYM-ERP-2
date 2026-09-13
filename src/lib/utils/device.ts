/**
 * Device and platform detection utilities for attendance kiosks.
 * Enables automatic camera selection:
 * - Mobile / Tablet -> Back / Environment camera (unmirrored)
 * - Laptop / Desktop -> Front / Webcam (mirrored)
 */

export function isMobileDevice(): boolean {
  if (typeof window === 'undefined' || typeof navigator === 'undefined') {
    return false;
  }

  const ua = navigator.userAgent || navigator.vendor || (window as unknown as { opera?: string }).opera || '';

  // 1. Mobile phone and tablet user agents (Android, iPhone, iPad, Windows Phone, etc.)
  const isMobileUA = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(ua);
  if (isMobileUA) return true;

  // 2. iPad running iPadOS 13+ (reports as Macintosh in Safari with multiple touch points)
  const isIPad = /Macintosh/i.test(ua) && typeof navigator.maxTouchPoints === 'number' && navigator.maxTouchPoints > 1;
  if (isIPad) return true;

  // 3. For devices without explicit mobile UA:
  // Must have touch hardware
  const touchPoints = typeof navigator.maxTouchPoints === 'number' ? navigator.maxTouchPoints : 0;
  const hasTouch = touchPoints > 0;
  if (!hasTouch) {
    // Standard desktop or laptop with mouse/trackpad
    return false;
  }

  // Small handheld touch screens or coarse pointer (tablets / mobile browsers in desktop mode)
  const isCoarsePointer = typeof window.matchMedia === 'function' && window.matchMedia('(pointer: coarse)').matches;
  const isSmallScreen = typeof window.innerWidth === 'number' && window.innerWidth < 1024;

  return isSmallScreen || isCoarsePointer;
}

/**
 * Returns the recommended camera facing mode for attendance kiosks:
 * - Mobile / Tablet -> 'environment' (back camera for pointing at gym members or scanning passes)
 * - Desktop / Laptop -> 'user' (front webcam)
 */
export function getRecommendedFacingMode(): 'environment' | 'user' {
  return isMobileDevice() ? 'environment' : 'user';
}

/**
 * Returns the recommended mirror state:
 * - Front camera ('user') -> true (mirrored for natural selfie view)
 * - Rear camera ('environment') -> false (unmirrored for natural outward view)
 */
export function getRecommendedMirrorState(facingMode: 'environment' | 'user'): boolean {
  return facingMode === 'user';
}
