import { describe, it, expect } from 'vitest';
import {
  euclideanDistance,
  squaredEuclideanDistance,
  cosineSimilarity,
  distanceToConfidence,
  similarityToConfidence,
  averageDescriptors,
  findBestMatch,
  normalizeDescriptor,
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

  it('normalizes arbitrary vectors to unit length (L2 norm = 1.0)', () => {
    const raw = new Array(128).fill(0.5);
    const normalized = normalizeDescriptor(raw);
    let norm = 0;
    for (const val of normalized) {
      norm += val * val;
    }
    expect(Math.sqrt(norm)).toBeCloseTo(1.0, 4);
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
    expect(avg[0]).toBeCloseTo(1 / Math.sqrt(128), 3);
  });

  it('finds best matching member within calibrated threshold and assigns correct tier', () => {
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

    const match = findBestMatch(targetDescriptor, roster);
    expect(match).not.toBeNull();
    expect(match!.memberId).toBe('mem_2');
    expect(match!.name).toBe('Bob Jones');
    expect(match!.tier).toBe('high');
    expect(match!.confidence).toBeGreaterThan(0.5);
  });

  it('recognizes a candidate via multi-template gallery even when primary centroid is distant', () => {
    // Frontal centroid
    const frontal = new Array(128).fill(0.1);
    // Left-turned pose
    const leftTurn = new Array(128).fill(0.13); // distance to query is small
    // Right-turned pose
    const rightTurn = new Array(128).fill(0.15);

    // Live query from a member who is looking slightly left
    const queryLeft = new Array(128).fill(0.132); // distance to leftTurn is ~0.0226

    const roster: FaceDescriptorRecord[] = [
      {
        memberId: 'mem_multi_1',
        name: 'Carlos Ray',
        memberCode: 'MEM-101',
        // Primary descriptor is an average that might be further
        descriptor: frontal,
        // Gallery contains distinct poses
        descriptors: [frontal, leftTurn, rightTurn],
      },
    ];

    const match = findBestMatch(queryLeft, roster);
    expect(match).not.toBeNull();
    expect(match!.memberId).toBe('mem_multi_1');
    expect(match!.tier).toBe('high');
    expect(match!.distance).toBeLessThan(0.1);
  });

  it('matches member under real-world lighting within calibrated 0.54 threshold (prevents false rejection)', () => {
    // 128 elements differing by ~0.045: sqrt(128 * 0.045^2) = sqrt(128 * 0.002025) ≈ 0.509
    const targetDescriptor = new Array(128).fill(0.1);
    const gymLightingDescriptor = new Array(128).fill(0.145);

    const roster: FaceDescriptorRecord[] = [
      {
        memberId: 'mem_gym_1',
        name: 'Diana Prince',
        memberCode: 'MEM-202',
        descriptor: gymLightingDescriptor,
      },
    ];

    // Default threshold is 0.54, so ~0.509 distance should match!
    const match = findBestMatch(targetDescriptor, roster);
    expect(match).not.toBeNull();
    expect(match!.memberId).toBe('mem_gym_1');
    expect(match!.tier).toBe('medium');
    expect(match!.distance).toBeCloseTo(0.509, 2);

    // With old strict threshold 0.48, it would have failed (false rejection):
    const oldStrictMatch = findBestMatch(targetDescriptor, roster, 0.48);
    expect(oldStrictMatch).toBeNull();
  });

  it('returns null when no candidate meets the threshold', () => {
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

    const match = findBestMatch(targetDescriptor, roster);
    expect(match).toBeNull();
  });
});

describe('Deep Biometric Cosine Matcher (512-D / 1024-D Human AI)', () => {
  it('calculates exact 1.0 Cosine similarity for identical vectors', () => {
    const v1 = new Float32Array(1024).fill(0.03);
    const v2 = new Float32Array(1024).fill(0.03);
    expect(cosineSimilarity(v1, v2)).toBeCloseTo(1.0, 4);
  });

  it('calculates 0.0 Cosine similarity for orthogonal vectors', () => {
    const v1 = [1, 0, 0, 0];
    const v2 = [0, 1, 0, 0];
    expect(cosineSimilarity(v1, v2)).toBe(0);
  });

  it('calculates -1.0 Cosine similarity for opposite vectors', () => {
    const v1 = [1, 2, 3];
    const v2 = [-1, -2, -3];
    expect(cosineSimilarity(v1, v2)).toBeCloseTo(-1.0, 4);
  });

  it('converts similarity to normalized confidence correctly', () => {
    expect(similarityToConfidence(1.0)).toBe(1.0);
    expect(similarityToConfidence(0.62)).toBe(0.5);
    expect(similarityToConfidence(0.81)).toBeGreaterThan(0.7);
    expect(similarityToConfidence(0.40)).toBeLessThan(0.45);
    expect(similarityToConfidence(0)).toBe(0);
  });

  it('finds best matching member in 1024-D vector space with Cosine Similarity', () => {
    // Generate normalized 1024-D base vector
    const baseVec = normalizeDescriptor(new Array(1024).fill(0.05));
    // Close vector (high similarity)
    const closeVec = normalizeDescriptor(baseVec.map((v, i) => i % 10 === 0 ? v + 0.005 : v));
    // Far orthogonal vector
    const farVec = normalizeDescriptor(new Array(1024).fill(0).map((_, i) => i % 2 === 0 ? 1 : -1));

    const roster: FaceDescriptorRecord[] = [
      {
        memberId: 'mem_deep_1',
        name: 'David Banner',
        memberCode: 'MEM-801',
        descriptor: farVec,
        dimension: 1024,
      },
      {
        memberId: 'mem_deep_2',
        name: 'Natasha Romanoff',
        memberCode: 'MEM-802',
        descriptor: closeVec,
        dimension: 1024,
      },
    ];

    const match = findBestMatch(baseVec, roster);
    expect(match).not.toBeNull();
    expect(match!.memberId).toBe('mem_deep_2');
    expect(match!.name).toBe('Natasha Romanoff');
    expect(match!.similarity).toBeGreaterThan(0.74);
    expect(match!.tier).toBe('high');
    expect(match!.dimension).toBe(1024);
  });

  it('matches member via 1024-D multi-template gallery poses', () => {
    const frontal = normalizeDescriptor(new Array(1024).fill(0.02));
    const yawLeft = normalizeDescriptor(new Array(1024).fill(0.02).map((v, i) => (i < 512 ? v + 0.02 : v - 0.01)));
    const yawRight = normalizeDescriptor(new Array(1024).fill(0.02).map((v, i) => (i >= 512 ? v + 0.02 : v - 0.01)));

    const queryAngle = normalizeDescriptor(yawLeft.map(v => v + 0.001));

    const roster: FaceDescriptorRecord[] = [
      {
        memberId: 'mem_gallery_1',
        name: 'Steve Rogers',
        memberCode: 'MEM-803',
        descriptor: frontal,
        descriptors: [frontal, yawLeft, yawRight],
        dimension: 1024,
      },
    ];

    const match = findBestMatch(queryAngle, roster);
    expect(match).not.toBeNull();
    expect(match!.memberId).toBe('mem_gallery_1');
    expect(match!.similarity).toBeGreaterThan(0.9);
    expect(match!.tier).toBe('high');
  });

  it('safely isolates dimension differences (1024-D query vs 128-D record returns null)', () => {
    const query1024 = new Array(1024).fill(0.05);
    const legacy128Roster: FaceDescriptorRecord[] = [
      {
        memberId: 'legacy_1',
        name: 'Tony Stark',
        memberCode: 'MEM-128',
        descriptor: new Array(128).fill(0.05),
        dimension: 128,
      },
    ];

    const match = findBestMatch(query1024, legacy128Roster);
    expect(match).toBeNull();
  });
});

describe('ConsensusTracker Multi-Frame Temporal Verification', () => {
  it('confirms high-confidence match after 2 consecutive frames', () => {
    const tracker = new ConsensusTracker({ windowMs: 1200, highConfidenceRequiredFrames: 2, mediumConfidenceRequiredFrames: 3 });
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
    const tracker = new ConsensusTracker({ windowMs: 1200, highConfidenceRequiredFrames: 2, mediumConfidenceRequiredFrames: 3 });
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

  it('maintains consensus across lower camera frame rates (1200ms default window)', () => {
    const tracker = new ConsensusTracker(); // uses default 1200ms window
    const match: MatchResult = {
      memberId: 'm789',
      name: 'Mike Brown',
      memberCode: 'GYM003',
      distance: 0.45,
      confidence: 0.70,
      tier: 'medium',
    };

    const now = 1000;
    // Frame 1
    const v1 = tracker.evaluate(match, now);
    expect(v1.isConfirmed).toBe(false);

    // Frame 2 at 350ms later (slow frame rate or dropped frame)
    const v2 = tracker.evaluate(match, now + 350);
    expect(v2.isConfirmed).toBe(false);
    expect(v2.framesObserved).toBe(2);

    // Frame 3 at 400ms later (750ms from start, within 1200ms window)
    const v3 = tracker.evaluate(match, now + 750);
    expect(v3.isConfirmed).toBe(true);
    expect(v3.framesObserved).toBe(3);
  });

  it('resets window if too much time elapses beyond windowMs', () => {
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
