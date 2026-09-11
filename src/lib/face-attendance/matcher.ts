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
 * Converts a Euclidean distance into a normalized confidence percentage [0.0 - 1.0].
 * Threshold is treated as 50% confidence.
 */
export function distanceToConfidence(distance: number, threshold = 0.48): number {
  if (distance <= 0) return 1.0;
  if (distance >= 1.0) return 0.0;
  // Non-linear scaling prioritizing high-confidence matches (<0.38)
  const confidence = Math.max(0, 1 - (distance / (threshold * 1.5)));
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

  // Normalize vector to unit length
  let norm = 0;
  for (let i = 0; i < length; i++) {
    norm += avg[i] * avg[i];
  }
  norm = Math.sqrt(norm);

  if (norm > 0) {
    for (let i = 0; i < length; i++) {
      avg[i] /= norm;
    }
  }

  return Array.from(avg);
}

/**
 * Scans an in-memory roster of enrolled members and finds the best match
 * using squared Euclidean distance for high performance.
 *
 * Threshold:
 * - default 0.48: standard strict threshold
 * - highConfidence 0.38: instant match threshold
 */
export function findBestMatch(
  queryDescriptor: ArrayLike<number>,
  roster: FaceDescriptorRecord[],
  threshold = 0.48,
  highConfidenceThreshold = 0.38
): MatchResult | null {
  if (!roster || roster.length === 0) return null;

  const maxSqDistance = threshold * threshold;
  let bestSqDistance = Infinity;
  let bestMatch: FaceDescriptorRecord | null = null;

  for (let i = 0; i < roster.length; i++) {
    const candidate = roster[i];
    if (!candidate.descriptor || candidate.descriptor.length !== queryDescriptor.length) {
      continue;
    }

    const sqDist = squaredEuclideanDistance(queryDescriptor, candidate.descriptor);
    if (sqDist < bestSqDistance) {
      bestSqDistance = sqDist;
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
