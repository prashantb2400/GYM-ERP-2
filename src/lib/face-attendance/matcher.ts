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
 * Typically:
 * >= 0.75: Same person (High confidence / Tier 1)
 * 0.62 - 0.75: Same person (Standard match / Tier 2)
 * < 0.50: Different person
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
export function distanceToConfidence(distance: number, threshold = 0.54): number {
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
 * Averages multiple descriptors of any dimension into one representative vector.
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
 * Automatically detects vector dimension:
 * - High-dimensional vectors (>= 512-d, e.g. Human FaceRes 1024 or InsightFace 512):
 *   Uses Cosine Similarity (higher is better, threshold default: 0.62, high confidence: 0.74).
 * - Legacy 128-d vectors (face-api.js):
 *   Uses Euclidean Distance (lower is better, threshold default: 0.54, high confidence: 0.42).
 *
 * Supports Multi-Template Gallery:
 * Evaluates all distinct pose vectors in candidate.descriptors and takes the optimal match.
 */
export function findBestMatch(
  queryDescriptor: ArrayLike<number>,
  roster: FaceDescriptorRecord[],
  threshold = 0.54,
  highConfidenceThreshold = 0.42
): MatchResult | null {
  if (!roster || roster.length === 0 || !queryDescriptor) return null;

  const isHighDim = queryDescriptor.length >= 512;
  // For high-dim (cosine similarity): default threshold is 0.62, high confidence is 0.74
  const similarityThreshold = isHighDim
    ? (threshold !== 0.54 && threshold >= 0.55 ? threshold : 0.62)
    : 0.62;
  const highConfidenceSimilarity = isHighDim
    ? (highConfidenceThreshold !== 0.42 && highConfidenceThreshold >= 0.65 ? highConfidenceThreshold : 0.74)
    : 0.74;

  if (isHighDim) {
    // High-dimensional Cosine Similarity search
    let bestSimilarity = -Infinity;
    let bestMatch: FaceDescriptorRecord | null = null;

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
        bestSimilarity = candidateMaxSimilarity;
        bestMatch = candidate;
      }
    }

    if (bestMatch && bestSimilarity >= similarityThreshold) {
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

  // Legacy Euclidean distance search for 128-d vectors
  const maxSqDistance = threshold * threshold;
  let bestSqDistance = Infinity;
  let bestMatch: FaceDescriptorRecord | null = null;

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
      dimension: 128,
      tier,
    };
  }

  return null;
}
