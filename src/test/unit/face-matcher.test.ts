import { describe, it, expect } from 'vitest';
import {
  euclideanDistance,
  distanceToConfidence,
  averageDescriptors,
  findBestMatch,
} from '@/lib/face-attendance/matcher';
import type { FaceDescriptorRecord } from '@/lib/face-attendance/types';

describe('Face Descriptor Vector Matcher', () => {
  it('calculates exact zero Euclidean distance for identical vectors', () => {
    const v1 = new Float32Array(128).fill(0.25);
    const v2 = new Float32Array(128).fill(0.25);
    expect(euclideanDistance(v1, v2)).toBe(0);
    expect(distanceToConfidence(0)).toBe(1.0);
  });

  it('calculates correct Euclidean distance for known vectors', () => {
    // 3-dimensional sanity check: sqrt((1-4)^2 + (2-6)^2) = sqrt(9 + 16) = 5
    const a = [1, 2];
    const b = [4, 6];
    expect(euclideanDistance(a, b)).toBe(5);
  });

  it('throws error when vector lengths mismatch', () => {
    const v1 = [1, 2, 3];
    const v2 = [1, 2];
    expect(() => euclideanDistance(v1, v2)).toThrow('Vector length mismatch');
  });

  it('correctly averages multiple 128-d descriptors into a normalized unit vector', () => {
    const d1 = new Array(128).fill(0.1);
    const d2 = new Array(128).fill(0.3);
    const avg = averageDescriptors([d1, d2]);

    expect(avg.length).toBe(128);

    // Calculate L2 norm of the resulting averaged vector
    let norm = 0;
    for (const val of avg) {
      norm += val * val;
    }
    expect(Math.sqrt(norm)).toBeCloseTo(1.0, 4);
  });

  it('finds best matching member within threshold', () => {
    const targetDescriptor = new Array(128).fill(0.1);
    const closeDescriptor = new Array(128).fill(0.12); // distance close
    const farDescriptor = new Array(128).fill(0.8);   // distance far

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

    const match = findBestMatch(targetDescriptor, roster, 0.52);
    expect(match).not.toBeNull();
    expect(match!.memberId).toBe('mem_2');
    expect(match!.name).toBe('Bob Jones');
    expect(match!.confidence).toBeGreaterThan(0.5);
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

    const match = findBestMatch(targetDescriptor, roster, 0.40);
    expect(match).toBeNull();
  });
});
