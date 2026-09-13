import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { isMobileDevice, getRecommendedFacingMode, getRecommendedMirrorState } from '@/lib/utils/device';

describe('Device Detection & Kiosk Camera Auto-Configuration', () => {
  const originalNavigator = global.navigator;
  const originalWindow = global.window;

  afterEach(() => {
    // Restore
    Object.defineProperty(global, 'navigator', {
      value: originalNavigator,
      writable: true,
    });
  });

  it('detects Android phone as mobile and recommends environment camera', () => {
    Object.defineProperty(global, 'navigator', {
      value: {
        userAgent: 'Mozilla/5.0 (Linux; Android 13; SM-S918B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/112.0.0.0 Mobile Safari/537.36',
        maxTouchPoints: 5,
      },
      writable: true,
    });

    expect(isMobileDevice()).toBe(true);
    expect(getRecommendedFacingMode()).toBe('environment');
    expect(getRecommendedMirrorState('environment')).toBe(false);
  });

  it('detects iPhone as mobile and recommends environment camera', () => {
    Object.defineProperty(global, 'navigator', {
      value: {
        userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.5 Mobile/15E148 Safari/604.1',
        maxTouchPoints: 5,
      },
      writable: true,
    });

    expect(isMobileDevice()).toBe(true);
    expect(getRecommendedFacingMode()).toBe('environment');
    expect(getRecommendedMirrorState('environment')).toBe(false);
  });

  it('detects iPadOS (Macintosh UA with touch points) as mobile and recommends environment camera', () => {
    Object.defineProperty(global, 'navigator', {
      value: {
        userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.5 Safari/605.1.15',
        maxTouchPoints: 5,
      },
      writable: true,
    });

    expect(isMobileDevice()).toBe(true);
    expect(getRecommendedFacingMode()).toBe('environment');
  });

  it('detects Desktop / Laptop (Mac or Windows without touch / non-mobile UA) and recommends user webcam', () => {
    Object.defineProperty(global, 'navigator', {
      value: {
        userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        maxTouchPoints: 0,
      },
      writable: true,
    });

    expect(isMobileDevice()).toBe(false);
    expect(getRecommendedFacingMode()).toBe('user');
    expect(getRecommendedMirrorState('user')).toBe(true);
  });

  it('correctly maps mirror state based on camera facing mode', () => {
    expect(getRecommendedMirrorState('user')).toBe(true); // webcam mirrored
    expect(getRecommendedMirrorState('environment')).toBe(false); // rear camera normal
  });
});
