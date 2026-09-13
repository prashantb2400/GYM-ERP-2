import { describe, it, expect } from 'vitest';
import { validateFaceQuality, selectPrimaryFace } from '@/lib/face-attendance/quality-gate';
import type { Point2D } from '@/lib/face-attendance/liveness';

describe('Biometric Face Quality Gate', () => {
  // Mock 68 landmarks for a standard frontal face
  // Left eye points 36..41 centered at (100, 100)
  // Right eye points 42..47 centered at (150, 100) -> IPD = 50px, roll = 0°
  // Nose tip at (125, 120) -> dist to left = sqrt(25^2 + 20^2) = 32.0, dist to right = 32.0 -> yawRatio = 0
  const mockFrontalLandmarks: Point2D[] = new Array(68).fill({ x: 0, y: 0 });
  for (let i = 36; i <= 41; i++) {
    mockFrontalLandmarks[i] = { x: 100, y: 100 };
  }
  for (let i = 42; i <= 47; i++) {
    mockFrontalLandmarks[i] = { x: 150, y: 100 };
  }
  mockFrontalLandmarks[30] = { x: 125, y: 120 }; // Nose tip

  it('rejects faces that are smaller than the 96px resolution threshold', () => {
    const box = { x: 10, y: 10, width: 64, height: 64 };
    const res = validateFaceQuality(box, 0.85);

    expect(res.isValid).toBe(false);
    expect(res.reason).toBe('too_small');
    expect(res.diagnosticMessage).toContain('closer');
  });

  it('rejects low confidence detector scores below 0.60', () => {
    const box = { x: 10, y: 10, width: 140, height: 140 };
    const res = validateFaceQuality(box, 0.45);

    expect(res.isValid).toBe(false);
    expect(res.reason).toBe('low_score');
    expect(res.diagnosticMessage).toContain('focus');
  });

  it('rejects faces with Interpupillary Distance (IPD) below 30px', () => {
    // Eyes placed only 15px apart
    const lowIpdLandmarks = [...mockFrontalLandmarks];
    for (let i = 42; i <= 47; i++) {
      lowIpdLandmarks[i] = { x: 115, y: 100 }; // 115 - 100 = 15px
    }

    const box = { x: 10, y: 10, width: 120, height: 120 };
    const res = validateFaceQuality(box, 0.85, lowIpdLandmarks);

    expect(res.isValid).toBe(false);
    expect(res.reason).toBe('low_ipd');
    expect(res.diagnosticMessage).toContain('closer');
  });

  it('rejects faces with excessive roll (head tilted beyond 15 degrees)', () => {
    // Left eye at (100, 100), Right eye at (150, 130) -> dy = 30, dx = 50 -> atan2(30/50) ≈ 31°
    const tiltedLandmarks = [...mockFrontalLandmarks];
    for (let i = 42; i <= 47; i++) {
      tiltedLandmarks[i] = { x: 150, y: 130 };
    }

    const box = { x: 10, y: 10, width: 120, height: 120 };
    const res = validateFaceQuality(box, 0.85, tiltedLandmarks);

    expect(res.isValid).toBe(false);
    expect(res.reason).toBe('excessive_roll');
    expect(res.diagnosticMessage).toContain('level');
  });

  it('rejects faces with excessive yaw (turned sideways beyond threshold)', () => {
    // Nose tip heavily displaced to the right (x = 145 vs left eye at 100, right eye at 150)
    const turnedLandmarks = [...mockFrontalLandmarks];
    turnedLandmarks[30] = { x: 148, y: 120 };

    const box = { x: 10, y: 10, width: 120, height: 120 };
    const res = validateFaceQuality(box, 0.85, turnedLandmarks);

    expect(res.isValid).toBe(false);
    expect(res.reason).toBe('excessive_yaw');
    expect(res.diagnosticMessage).toContain('directly');
  });

  it('approves compliant frontal faces passing all quality gates', () => {
    const box = { x: 50, y: 50, width: 160, height: 160 };
    const res = validateFaceQuality(box, 0.88, mockFrontalLandmarks);

    expect(res.isValid).toBe(true);
    expect(res.metrics.ipd).toBe(50);
    expect(res.metrics.rollDeg).toBe(0);
    expect(res.metrics.flags).toContain('quality_verified');
  });
});

describe('Primary Face Selector (Multi-Face Deconfliction)', () => {
  it('returns single face directly when only one face is detected', () => {
    const face = { box: { x: 100, y: 100, width: 120, height: 120 }, id: 'user1' };
    const result = selectPrimaryFace([face], 640, 480);

    expect(result.primaryFace).toBe(face);
    expect(result.secondaryFaces.length).toBe(0);
  });

  it('prioritizes foreground centered face over smaller background passers-by', () => {
    // Primary subject: large (160x160) and centered at (320, 240)
    const primaryCandidate = {
      box: { x: 240, y: 160, width: 160, height: 160 },
      id: 'primary',
    };
    // Background passer-by: smaller (80x80) and near edge at (500, 100)
    const backgroundCandidate = {
      box: { x: 500, y: 100, width: 80, height: 80 },
      id: 'background',
    };

    const result = selectPrimaryFace([backgroundCandidate, primaryCandidate], 640, 480);

    expect(result.primaryFace?.id).toBe('primary');
    expect(result.secondaryFaces.length).toBe(1);
    expect(result.secondaryFaces[0].id).toBe('background');
  });
});
