import { FaceDescriptorRecord, MatchResult } from './types';

/**
 * Calculates Euclidean (L2) distance between two 128-d face descriptors.
 * Lower distance = closer match.
 * Typically:
 * < 0.38: Same person, high confidence (Tier 1)
 * 0.38 - 0.48: Same person, standard confidence (Tier 2)
 * > 0.48: Different person
 */
export function euclideanDistance(a: ArrayLike<number>, b: ArrayLike<number>): number {
  if (a.length !== b.length) {
    throw new Error(`Vector length mismatch: ${a.length} vs ${b.length}`);
  }

  let sum = 0;
  for (let i = 0; i < a.length; i++) {
    const diff = a[i] - b[i];
    sum += diff * diff;
  }
  return Math.sqrt(sum);
}

/**
 * Calculates squared Euclidean distance.
 * Omitting Math.sqrt during 1:N searches provides ~2x faster comparisons.
 */
export function squaredEuclideanDistance(a: ArrayLike<number>, b: ArrayLike<number>): number {
  if (a.length !== b.length) {
    throw new Error(`Vector length mismatch: ${a.length} vs ${b.length}`);
  }

  let sum = 0;
  for (let i = 0; i < a.length; i++) {
    const diff = a[i] - b[i];
    sum += diff * diff;
  }
  return sum;
}

/**
 * Normalizes a 128-d descriptor to unit length (L2 norm = 1).
 */
export function normalizeDescriptor(descriptor: ArrayLike<number>): number[] {
  let norm = 0;
  for (let i = 0; i < descriptor.length; i++) {
    norm += descriptor[i] * descriptor[i];
  }
  norm = Math.sqrt(norm);
  if (norm <= 0) return Array.from(descriptor);
  const normalized = new Float32Array(descriptor.length);
  for (let i = 0; i < descriptor.length; i++) {
    normalized[i] = descriptor[i] / norm;
  }
  return Array.from(normalized);
}

/**
 * Converts a Euclidean distance into a normalized confidence percentage [0.0 - 1.0].
 * Threshold is treated as 50% confidence.
 */
export function distanceToConfidence(distance: number, threshold = 0.54): number {
  if (distance <= 0) return 1.0;
  if (distance >= 1.0) return 0.0;
  // Non-linear scaling prioritizing high-confidence matches (<0.42)
  const confidence = Math.max(0, 1 - (distance / (threshold * 1.4)));
  return Math.round(confidence * 1000) / 1000;
}

/**
 * Averages multiple 128-d descriptors into one representative vector.
 * Optionally rejects outlier frames (e.g. motion blur, sudden head turn) to prevent template contamination.
 * Normalizes the resulting vector (L2 norm = 1) for consistent distance comparisons.
 */
export function averageDescriptors(
  descriptors: ArrayLike<number>[],
  filterOutliers = true
): number[] {
  if (!descriptors || descriptors.length === 0) {
    throw new Error('At least one descriptor is required to average');
  }

  const length = descriptors[0].length;
  let cleanDescriptors = descriptors;

  // If we have 4+ frames and outlier filtering is requested, discard the most distant frame
  if (filterOutliers && descriptors.length >= 4) {
    let maxTotalDist = -1;
    let outlierIndex = -1;

    for (let i = 0; i < descriptors.length; i++) {
      let totalDist = 0;
      for (let j = 0; j < descriptors.length; j++) {
        if (i !== j) {
          totalDist += squaredEuclideanDistance(descriptors[i], descriptors[j]);
        }
      }
      if (totalDist > maxTotalDist) {
        maxTotalDist = totalDist;
        outlierIndex = i;
      }
    }

    if (outlierIndex >= 0) {
      cleanDescriptors = descriptors.filter((_, idx) => idx !== outlierIndex);
    }
  }

  const avg = new Float32Array(length);

  for (const desc of cleanDescriptors) {
    if (desc.length !== length) {
      throw new Error(`Inconsistent descriptor dimension: ${desc.length} vs ${length}`);
    }
    for (let i = 0; i < length; i++) {
      avg[i] += desc[i];
    }
  }

  const count = cleanDescriptors.length;
  for (let i = 0; i < length; i++) {
    avg[i] /= count;
  }

  return normalizeDescriptor(avg);
}

/**
 * Scans an in-memory roster of enrolled members and finds the best match
 * using squared Euclidean distance for high performance.
 *
 * Supports Multi-Template Gallery:
 * If a candidate record has multiple descriptors (e.g. [front, left, right]),
 * calculates the distance against each stored pose and takes the minimum distance.
 * Falls back to candidate.descriptor if gallery is not present.
 *
 * Calibrated Thresholds:
 * - standard match threshold: 0.54 (calibrated for varying gym lighting)
 * - highConfidence match threshold: 0.42 (instant Tier 1 match)
 */
export function findBestMatch(
  queryDescriptor: ArrayLike<number>,
  roster: FaceDescriptorRecord[],
  threshold = 0.54,
  highConfidenceThreshold = 0.42
): MatchResult | null {
  if (!roster || roster.length === 0) return null;

  const maxSqDistance = threshold * threshold;
  let bestSqDistance = Infinity;
  let bestMatch: FaceDescriptorRecord | null = null;

  for (let i = 0; i < roster.length; i++) {
    const candidate = roster[i];
    let candidateMinSqDist = Infinity;

    // Check multi-template gallery if present
    if (candidate.descriptors && Array.isArray(candidate.descriptors) && candidate.descriptors.length > 0) {
      for (let d = 0; d < candidate.descriptors.length; d++) {
        const desc = candidate.descriptors[d];
        if (desc && desc.length === queryDescriptor.length) {
          const sqDist = squaredEuclideanDistance(queryDescriptor, desc);
          if (sqDist < candidateMinSqDist) {
            candidateMinSqDist = sqDist;
          }
        }
      }
    }

    // Check single/primary descriptor
    if (candidate.descriptor && candidate.descriptor.length === queryDescriptor.length) {
      const sqDist = squaredEuclideanDistance(queryDescriptor, candidate.descriptor);
      if (sqDist < candidateMinSqDist) {
        candidateMinSqDist = sqDist;
      }
    }

    if (candidateMinSqDist < bestSqDistance) {
      bestSqDistance = candidateMinSqDist;
      bestMatch = candidate;
    }
  }

  if (bestMatch && bestSqDistance <= maxSqDistance) {
    const bestDistance = Math.sqrt(bestSqDistance);
    const tier: 'high' | 'medium' = bestDistance <= highConfidenceThreshold ? 'high' : 'medium';

    return {
      memberId: bestMatch.memberId,
      name: bestMatch.name,
      memberCode: bestMatch.memberCode,
      photoUrl: bestMatch.photoUrl,
      distance: Math.round(bestDistance * 1000) / 1000,
      confidence: distanceToConfidence(bestDistance, threshold),
      tier,
    };
  }

  return null;
}
