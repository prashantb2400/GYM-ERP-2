import { describe, it, expect } from 'vitest';
import {
  euclideanDistance,
  squaredEuclideanDistance,
  distanceToConfidence,
  averageDescriptors,
  findBestMatch,
} from '@/lib/face-attendance/matcher';
import { ConsensusTracker } from '@/lib/face-attendance/consensus-tracker';
import type { FaceDescriptorRecord, MatchResult } from '@/lib/face-attendance/types';

describe('Face Descriptor Vector Matcher', () => {
  it('calculates exact zero Euclidean distance for identical vectors', () => {
    const v1 = new Float32Array(128).fill(0.25);
    const v2 = new Float32Array(128).fill(0.25);
    expect(euclideanDistance(v1, v2)).toBe(0);
    expect(squaredEuclideanDistance(v1, v2)).toBe(0);
    expect(distanceToConfidence(0)).toBe(1.0);
  });

  it('calculates correct Euclidean distance for known vectors', () => {
    // 3-dimensional sanity check: sqrt((1-4)^2 + (2-6)^2) = sqrt(9 + 16) = 5
    const a = [1, 2];
    const b = [4, 6];
    expect(euclideanDistance(a, b)).toBe(5);
    expect(squaredEuclideanDistance(a, b)).toBe(25);
  });

  it('throws error when vector lengths mismatch', () => {
    const v1 = [1, 2, 3];
    const v2 = [1, 2];
    expect(() => euclideanDistance(v1, v2)).toThrow('Vector length mismatch');
  });

  it('correctly averages multiple 128-d descriptors into a normalized unit vector and filters outliers', () => {
    const d1 = new Array(128).fill(0.1);
    const d2 = new Array(128).fill(0.11);
    const d3 = new Array(128).fill(0.09);
    const outlier = new Array(128).fill(0.85); // Bad blurry frame

    // When 4 frames are passed, outlier should be rejected
    const avg = averageDescriptors([d1, d2, d3, outlier], true);

    expect(avg.length).toBe(128);

    // Calculate L2 norm of the resulting averaged vector
    let norm = 0;
    for (const val of avg) {
      norm += val * val;
    }
    expect(Math.sqrt(norm)).toBeCloseTo(1.0, 4);

    // Ensure the vector is close to 0.1 rather than skewed towards 0.85
    // Normalized unit vector of all equal components has magnitude 1/sqrt(128) ≈ 0.088388
    expect(avg[0]).toBeCloseTo(1 / Math.sqrt(128), 3);
  });

  it('finds best matching member within threshold and assigns correct tier', () => {
    const targetDescriptor = new Array(128).fill(0.1);
    const closeDescriptor = new Array(128).fill(0.12); // distance ~0.226 -> tier 'high'
    const farDescriptor = new Array(128).fill(0.8);

    const roster: FaceDescriptorRecord[] = [
      {
        memberId: 'mem_1',
        name: 'Alice Smith',
        memberCode: 'MEM-001',
        descriptor: farDescriptor,
      },
      {
        memberId: 'mem_2',
        name: 'Bob Jones',
        memberCode: 'MEM-002',
        descriptor: closeDescriptor,
      },
    ];

    const match = findBestMatch(targetDescriptor, roster, 0.48, 0.38);
    expect(match).not.toBeNull();
    expect(match!.memberId).toBe('mem_2');
    expect(match!.name).toBe('Bob Jones');
    expect(match!.tier).toBe('high');
    expect(match!.confidence).toBeGreaterThan(0.5);
  });

  it('returns null when no candidate meets the strict threshold', () => {
    const targetDescriptor = new Array(128).fill(0.1);
    const farDescriptor = new Array(128).fill(0.9);

    const roster: FaceDescriptorRecord[] = [
      {
        memberId: 'mem_1',
        name: 'Alice Smith',
        memberCode: 'MEM-001',
        descriptor: farDescriptor,
      },
    ];

    const match = findBestMatch(targetDescriptor, roster, 0.48);
    expect(match).toBeNull();
  });
});

describe('ConsensusTracker Multi-Frame Temporal Verification', () => {
  it('confirms high-confidence match after 2 consecutive frames', () => {
    const tracker = new ConsensusTracker({ windowMs: 650, highConfidenceRequiredFrames: 2, mediumConfidenceRequiredFrames: 3 });
    const match: MatchResult = {
      memberId: 'm123',
      name: 'John Doe',
      memberCode: 'GYM001',
      distance: 0.32,
      confidence: 0.95,
      tier: 'high',
    };

    const now = 1000;
    const v1 = tracker.evaluate(match, now);
    expect(v1.isConfirmed).toBe(false);
    expect(v1.progress).toBe(0.5);

    const v2 = tracker.evaluate(match, now + 120);
    expect(v2.isConfirmed).toBe(true);
    expect(v2.progress).toBe(1.0);
  });

  it('requires 3 consecutive frames for medium-confidence match', () => {
    const tracker = new ConsensusTracker({ windowMs: 650, highConfidenceRequiredFrames: 2, mediumConfidenceRequiredFrames: 3 });
    const match: MatchResult = {
      memberId: 'm456',
      name: 'Jane Smith',
      memberCode: 'GYM002',
      distance: 0.44,
      confidence: 0.72,
      tier: 'medium',
    };

    const now = 1000;
    const v1 = tracker.evaluate(match, now);
    expect(v1.isConfirmed).toBe(false);
    expect(v1.progress).toBeCloseTo(0.33, 2);

    const v2 = tracker.evaluate(match, now + 120);
    expect(v2.isConfirmed).toBe(false);
    expect(v2.progress).toBeCloseTo(0.67, 2);

    const v3 = tracker.evaluate(match, now + 240);
    expect(v3.isConfirmed).toBe(true);
    expect(v3.progress).toBe(1.0);
  });

  it('resets window if too much time elapses between frames', () => {
    const tracker = new ConsensusTracker({ windowMs: 500, highConfidenceRequiredFrames: 2 });
    const match: MatchResult = {
      memberId: 'm789',
      name: 'Mike Brown',
      memberCode: 'GYM003',
      distance: 0.30,
      confidence: 0.96,
      tier: 'high',
    };

    const now = 1000;
    const v1 = tracker.evaluate(match, now);
    expect(v1.isConfirmed).toBe(false);

    // 800ms later (exceeds 500ms window)
    const v2 = tracker.evaluate(match, now + 800);
    expect(v2.isConfirmed).toBe(false);
    expect(v2.framesObserved).toBe(1); // Fresh window
  });
});
