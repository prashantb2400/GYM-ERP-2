import { FaceDescriptorRecord, MatchResult } from './types';

/**
 * Calculates Euclidean (L2) distance between two face descriptors.
 * Lower distance = closer match.
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
 * Calculates Cosine Similarity between two face embedding vectors.
 * Returns a value in range [-1.0, 1.0]. Higher is better.
 */
export function cosineSimilarity(a: ArrayLike<number>, b: ArrayLike<number>): number {
  if (a.length !== b.length) {
    throw new Error(`Vector length mismatch: ${a.length} vs ${b.length}`);
  }

  let dot = 0;
  let normA = 0;
  let normB = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }

  const denominator = Math.sqrt(normA) * Math.sqrt(normB);
  if (denominator <= 0) return 0;
  return dot / denominator;
}

/**
 * Normalizes a descriptor of any dimension to unit length (L2 norm = 1).
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
 * Threshold is treated as ~50% confidence.
 */
export function distanceToConfidence(distance: number, threshold = 0.52): number {
  if (distance <= 0) return 1.0;
  if (distance >= 1.0) return 0.0;
  const confidence = Math.max(0, 1 - (distance / (threshold * 1.4)));
  return Math.round(confidence * 1000) / 1000;
}

/**
 * Converts a Cosine Similarity into a normalized confidence percentage [0.0 - 1.0].
 */
export function similarityToConfidence(similarity: number, threshold = 0.62): number {
  if (similarity >= 1.0) return 1.0;
  if (similarity <= 0) return 0;
  if (similarity < threshold) {
    return Math.max(0, Math.round((similarity / threshold) * 0.45 * 1000) / 1000);
  }
  // Linear interpolation from threshold (0.50) to 1.0 (1.0)
  const confidence = 0.5 + 0.5 * ((similarity - threshold) / (1.0 - threshold));
  return Math.round(Math.min(1.0, confidence) * 1000) / 1000;
}

/**
 * Averages multiple descriptors into one representative vector.
 * Optionally rejects outlier frames (e.g. motion blur, sudden head turn).
 * Normalizes the resulting vector (L2 norm = 1).
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
 * Scans an in-memory roster of enrolled members and finds the best match.
 *
 * Primary Mode: 128-D Metric Space (ResNet-34 / face-api / dlib)
 * Uses squared Euclidean distance (d^2) for instant sub-millisecond evaluation.
 * Calibrated thresholds:
 * - Default threshold: 0.52 (matches under natural gym lighting)
 * - High confidence tier: 0.40 (requires 2-frame consensus)
 *
 * Multi-Template Gallery:
 * Evaluates all 5 enrolled poses in candidate.descriptors to ensure high-angle recall.
 *
 * Ambiguity Rejection (Nearest-Neighbor Margin Filter):
 * Rejects candidates in the medium-confidence zone if a second member is within
 * ambiguityMargin (default 0.04) distance to eliminate false-positive cross-member mismatches.
 */
export function findBestMatch(
  queryDescriptor: ArrayLike<number>,
  roster: FaceDescriptorRecord[],
  threshold = 0.52,
  highConfidenceThreshold = 0.38,
  ambiguityMargin = 0.04
): MatchResult | null {
  if (!roster || roster.length === 0 || !queryDescriptor) return null;

  const isHighDim = queryDescriptor.length >= 512;

  if (isHighDim) {
    // High-dimensional Cosine Similarity search (legacy backward compatibility)
    const similarityThreshold = threshold !== 0.52 && threshold >= 0.55 ? threshold : 0.62;
    const highConfidenceSimilarity = highConfidenceThreshold !== 0.38 && highConfidenceThreshold >= 0.65 ? highConfidenceThreshold : 0.74;

    let bestSimilarity = -Infinity;
    let secondBestSimilarity = -Infinity;
    let bestMatch: FaceDescriptorRecord | null = null;
    let secondBestMatch: FaceDescriptorRecord | null = null;

    for (let i = 0; i < roster.length; i++) {
      const candidate = roster[i];
      let candidateMaxSimilarity = -Infinity;

      // Check multi-template gallery
      if (candidate.descriptors && Array.isArray(candidate.descriptors) && candidate.descriptors.length > 0) {
        for (let d = 0; d < candidate.descriptors.length; d++) {
          const desc = candidate.descriptors[d];
          if (desc && desc.length === queryDescriptor.length) {
            const sim = cosineSimilarity(queryDescriptor, desc);
            if (sim > candidateMaxSimilarity) {
              candidateMaxSimilarity = sim;
            }
          }
        }
      }

      // Check single/primary descriptor
      if (candidate.descriptor && candidate.descriptor.length === queryDescriptor.length) {
        const sim = cosineSimilarity(queryDescriptor, candidate.descriptor);
        if (sim > candidateMaxSimilarity) {
          candidateMaxSimilarity = sim;
        }
      }

      if (candidateMaxSimilarity > bestSimilarity) {
        secondBestSimilarity = bestSimilarity;
        secondBestMatch = bestMatch;
        bestSimilarity = candidateMaxSimilarity;
        bestMatch = candidate;
      } else if (candidateMaxSimilarity > secondBestSimilarity) {
        secondBestSimilarity = candidateMaxSimilarity;
        secondBestMatch = candidate;
      }
    }

    if (bestMatch && bestSimilarity >= similarityThreshold) {
      // Ambiguity filter for high-dim cosine space
      if (
        secondBestMatch &&
        secondBestMatch.memberId !== bestMatch.memberId &&
        bestSimilarity < highConfidenceSimilarity &&
        bestSimilarity - secondBestSimilarity < 0.03
      ) {
        // Ambiguous candidate
        return null;
      }

      const tier: 'high' | 'medium' = bestSimilarity >= highConfidenceSimilarity ? 'high' : 'medium';
      return {
        memberId: bestMatch.memberId,
        name: bestMatch.name,
        memberCode: bestMatch.memberCode,
        photoUrl: bestMatch.photoUrl,
        distance: Math.round((1 - bestSimilarity) * 1000) / 1000,
        similarity: Math.round(bestSimilarity * 1000) / 1000,
        confidence: similarityToConfidence(bestSimilarity, similarityThreshold),
        dimension: queryDescriptor.length,
        tier,
      };
    }

    return null;
  }

  // Production ResNet-34 128-D Euclidean Distance Search
  const maxSqDistance = threshold * threshold;
  let bestSqDistance = Infinity;
  let secondBestSqDistance = Infinity;
  let bestMatch: FaceDescriptorRecord | null = null;
  let secondBestMatch: FaceDescriptorRecord | null = null;

  for (let i = 0; i < roster.length; i++) {
    const candidate = roster[i];
    let candidateMinSqDist = Infinity;

    // Check multi-template gallery
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
      secondBestSqDistance = bestSqDistance;
      secondBestMatch = bestMatch;
      bestSqDistance = candidateMinSqDist;
      bestMatch = candidate;
    } else if (candidateMinSqDist < secondBestSqDistance) {
      secondBestSqDistance = candidateMinSqDist;
      secondBestMatch = candidate;
    }
  }

  if (bestMatch && bestSqDistance <= maxSqDistance) {
    const bestDistance = Math.sqrt(bestSqDistance);
    const secondBestDistance = Math.sqrt(secondBestSqDistance);

    // Ambiguity filter: If in the medium tier and runner-up from a different member
    // is within ambiguityMargin, reject ambiguous match to prevent cross-member misidentification
    if (
      secondBestMatch &&
      secondBestMatch.memberId !== bestMatch.memberId &&
      bestDistance > highConfidenceThreshold &&
      secondBestDistance - bestDistance < ambiguityMargin
    ) {
      // Ambiguous: two members are virtually equidistant to this face query
      return null;
    }

    const tier: 'high' | 'medium' = bestDistance <= highConfidenceThreshold ? 'high' : 'medium';

    return {
      memberId: bestMatch.memberId,
      name: bestMatch.name,
      memberCode: bestMatch.memberCode,
      photoUrl: bestMatch.photoUrl,
      distance: Math.round(bestDistance * 1000) / 1000,
      confidence: distanceToConfidence(bestDistance, threshold),
      dimension: 128,
      tier,
    };
  }

  return null;
}

/**
 * Detects members in the roster whose enrolled descriptors have incompatible dimensions.
 */
export function detectLegacyDimensionMembers(
  roster: FaceDescriptorRecord[],
  targetDimension = 128
): {
  count: number;
  incompatibleMembers: Array<{ memberId: string; name: string; dimension: number }>;
} {
  const incompatible: Array<{ memberId: string; name: string; dimension: number }> = [];
  if (!roster) return { count: 0, incompatibleMembers: [] };

  for (const member of roster) {
    const dim = member.dimension || member.descriptor?.length || 0;
    if (dim > 0 && dim !== targetDimension) {
      incompatible.push({
        memberId: member.memberId,
        name: member.name,
        dimension: dim,
      });
    }
  }

  return {
    count: incompatible.length,
    incompatibleMembers: incompatible,
  };
}
