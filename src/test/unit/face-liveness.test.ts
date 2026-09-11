import { describe, it, expect } from 'vitest';
import {
  calculateEyeAspectRatio,
  calculateSpatialVariance,
  evaluateLiveness,
  type Point2D,
} from '@/lib/face-attendance/liveness';
import { ConsensusTracker } from '@/lib/face-attendance/consensus-tracker';
import type { MatchResult } from '@/lib/face-attendance/types';

describe('Biometric Liveness & Anti-Spoofing Detection', () => {
  // 6 landmark points for an open eye
  // p0: outer corner (0, 10), p1: top outer (5, 5), p2: top inner (15, 5),
  // p3: inner corner (20, 10), p4: bottom inner (15, 15), p5: bottom outer (5, 15)
  const openEye: Point2D[] = [
    { x: 0, y: 10 },
    { x: 5, y: 5 },
    { x: 15, y: 5 },
    { x: 20, y: 10 },
    { x: 15, y: 15 },
    { x: 5, y: 15 },
  ];

  // 6 landmark points for a closed / blinking eye (vertical height collapses)
  const closedEye: Point2D[] = [
    { x: 0, y: 10 },
    { x: 5, y: 9.5 },
    { x: 15, y: 9.5 },
    { x: 20, y: 10 },
    { x: 15, y: 10.5 },
    { x: 5, y: 10.5 },
  ];

  it('correctly calculates Eye Aspect Ratio (EAR) for an open human eye', () => {
    const ear = calculateEyeAspectRatio(openEye);
    // Vertical distances: ||p1-p5|| = 10, ||p2-p4|| = 10. Horizontal: ||p0-p3|| = 20
    // EAR = (10 + 10) / (2 * 20) = 20 / 40 = 0.50
    expect(ear).toBeCloseTo(0.5, 2);
    expect(ear).toBeGreaterThan(0.2);
  });

  it('correctly calculates Eye Aspect Ratio (EAR) for a blinking / closed eye', () => {
    const ear = calculateEyeAspectRatio(closedEye);
    // Vertical distances: 1 + 1 = 2. Horizontal: 20
    // EAR = 2 / 40 = 0.05
    expect(ear).toBeCloseTo(0.05, 2);
    expect(ear).toBeLessThan(0.18);
  });

  it('returns 0 for empty or malformed eye landmarks', () => {
    expect(calculateEyeAspectRatio([])).toBe(0);
    expect(calculateEyeAspectRatio([{ x: 0, y: 0 }])).toBe(0);
  });

  it('measures spatial variance across frame centroid history', () => {
    const staticCentroids: Point2D[] = [
      { x: 100, y: 100 },
      { x: 100, y: 100 },
      { x: 100, y: 100 },
    ];
    expect(calculateSpatialVariance(staticCentroids)).toBe(0);

    const naturalCentroids: Point2D[] = [
      { x: 100.1, y: 100.0 },
      { x: 100.4, y: 100.2 },
      { x: 99.8, y: 99.9 },
    ];
    const variance = calculateSpatialVariance(naturalCentroids);
    expect(variance).toBeGreaterThan(0.1);
    expect(variance).toBeLessThan(5.0);
  });

  it('flags completely static photo attack when motion variance is near zero across 3+ frames', () => {
    const result = evaluateLiveness({
      leftEye: openEye,
      rightEye: openEye,
      centroidHistory: [
        { x: 150, y: 150 },
        { x: 150, y: 150 },
        { x: 150, y: 150 },
      ],
    });

    expect(result.isMotionNatural).toBe(false);
    expect(result.flags).toContain('zero_motion_spoof_suspect');
    expect(result.motionVariance).toBe(0);
  });

  it('scores live when subject exhibits natural human micro-motion', () => {
    const naturalEye: Point2D[] = [
      { x: 0, y: 10 },
      { x: 5, y: 7 },
      { x: 15, y: 7 },
      { x: 20, y: 10 },
      { x: 15, y: 13 },
      { x: 5, y: 13 },
    ]; // EAR ~ (6 + 6) / 40 = 0.30

    const result = evaluateLiveness({
      leftEye: naturalEye,
      rightEye: naturalEye,
      centroidHistory: [
        { x: 150.0, y: 150.0 },
        { x: 150.8, y: 150.3 },
        { x: 151.2, y: 149.7 },
      ],
    });

    expect(result.isLive).toBe(true);
    expect(result.score).toBeGreaterThanOrEqual(0.65);
    expect(result.flags).toContain('natural_micro_motion');
  });

  it('ConsensusTracker seamlessly integrates liveness verification when required', () => {
    const tracker = new ConsensusTracker({
      windowMs: 650,
      highConfidenceRequiredFrames: 2,
      requireLiveness: true,
    });

    const match: MatchResult = {
      memberId: 'mem_live_1',
      name: 'Test Member',
      memberCode: 'MEM-001',
      distance: 0.30,
      confidence: 0.95,
      tier: 'high',
    };

    const naturalEye: Point2D[] = [
      { x: 0, y: 10 },
      { x: 5, y: 7 },
      { x: 15, y: 7 },
      { x: 20, y: 10 },
      { x: 15, y: 13 },
      { x: 5, y: 13 },
    ];

    const now = 2000;
    // Frame 1
    const v1 = tracker.evaluate(match, now, {
      leftEye: naturalEye,
      rightEye: naturalEye,
      centroid: { x: 100, y: 100 },
    });
    expect(v1.isConfirmed).toBe(false);

    // Frame 2 with slight natural micro-movement
    const v2 = tracker.evaluate(match, now + 120, {
      leftEye: naturalEye,
      rightEye: naturalEye,
      centroid: { x: 100.8, y: 100.4 },
    });
    expect(v2.isConfirmed).toBe(true);
    expect(v2.liveness?.isLive).toBe(true);
  });
});
