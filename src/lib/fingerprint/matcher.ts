import { MinutiaePoint, FingerprintTemplate, MatchScoreResult, RosterMemberFingerprint } from './types';

// Constants for biometric verification (ISO/IEC 19794-2 alignment standards)
const DISTANCE_TOLERANCE_PX = 14; // Max spatial Euclidean distance between aligned minutiae (pixels)
const ANGLE_TOLERANCE_RAD = 0.35; // Max angular tolerance (~20 degrees)
const MIN_MINUTIAE_THRESHOLD = 6;  // Minimum minutiae required for reliable matching
const MATCH_ACCEPTANCE_SCORE = 55; // Minimum score (0-100) to accept genuine match

/**
 * Normalizes an angle into the range [-PI, PI]
 */
function normalizeAngle(angle: number): number {
  while (angle > Math.PI) angle -= 2 * Math.PI;
  while (angle < -Math.PI) angle += 2 * Math.PI;
  return angle;
}

/**
 * Calculates the angular difference between two angles in radians.
 */
function angleDifference(a: number, b: number): number {
  const diff = Math.abs(normalizeAngle(a - b));
  return Math.min(diff, 2 * Math.PI - diff);
}

/**
 * Compares two fingerprint templates and returns detailed matching metrics.
 * Uses translation- and rotation-invariant minutiae alignment.
 */
export function matchTemplates(
  probe: FingerprintTemplate,
  candidate: FingerprintTemplate
): MatchScoreResult {
  const pMin = probe.minutiae || [];
  const cMin = candidate.minutiae || [];

  if (pMin.length < MIN_MINUTIAE_THRESHOLD || cMin.length < MIN_MINUTIAE_THRESHOLD) {
    return {
      isMatch: false,
      score: 0,
      confidence: 0,
      matchedPairs: 0,
      totalCandidateMinutiae: cMin.length,
      totalProbeMinutiae: pMin.length,
    };
  }

  let bestMatchedPairs = 0;

  // Select top quality minutiae to test as reference origin pairs
  const probeRefs = [...pMin].sort((a, b) => (b.quality || 50) - (a.quality || 50)).slice(0, 8);
  const candRefs = [...cMin].sort((a, b) => (b.quality || 50) - (a.quality || 50)).slice(0, 8);

  // Try aligning probe to candidate using reference pairs
  for (const pRef of probeRefs) {
    for (const cRef of candRefs) {
      // If minutiae types are strictly opposite (and both known), skip reference pair
      if (pRef.type !== 'unknown' && cRef.type !== 'unknown' && pRef.type !== cRef.type) {
        continue;
      }

      const dTheta = normalizeAngle(cRef.angle - pRef.angle);
      const cosTheta = Math.cos(dTheta);
      const sinTheta = Math.sin(dTheta);

      // Track candidate minutiae that have already been paired
      const matchedCandIndices = new Set<number>();
      let currentPairs = 0;

      for (const p of pMin) {
        // Transform probe minutia relative to pRef and align to cRef
        const relX = p.x - pRef.x;
        const relY = p.y - pRef.y;

        const rotX = relX * cosTheta - relY * sinTheta;
        const rotY = relX * sinTheta + relY * cosTheta;

        const alignedX = rotX + cRef.x;
        const alignedY = rotY + cRef.y;
        const alignedAngle = normalizeAngle(p.angle + dTheta);

        // Search for nearest matching candidate minutia within tolerance
        let bestDistSq = DISTANCE_TOLERANCE_PX * DISTANCE_TOLERANCE_PX;
        let bestCandIdx = -1;

        for (let j = 0; j < cMin.length; j++) {
          if (matchedCandIndices.has(j)) continue;

          const c = cMin[j];

          // Minutiae type must match if both are known
          if (p.type !== 'unknown' && c.type !== 'unknown' && p.type !== c.type) {
            continue;
          }

          const dx = alignedX - c.x;
          const dy = alignedY - c.y;
          const distSq = dx * dx + dy * dy;

          if (distSq <= bestDistSq) {
            const angleDiff = angleDifference(alignedAngle, c.angle);
            if (angleDiff <= ANGLE_TOLERANCE_RAD) {
              bestDistSq = distSq;
              bestCandIdx = j;
            }
          }
        }

        if (bestCandIdx !== -1) {
          matchedCandIndices.add(bestCandIdx);
          currentPairs++;
        }
      }

      if (currentPairs > bestMatchedPairs) {
        bestMatchedPairs = currentPairs;
      }
    }
  }

  // Calculate similarity score (Harmonic mean proportion)
  const totalMinutiae = (pMin.length + cMin.length) / 2;
  const rawScore = (bestMatchedPairs / totalMinutiae) * 100;
  const score = Math.min(100, Math.round(rawScore));
  const confidence = Math.min(99.9, Math.round((bestMatchedPairs / Math.max(1, pMin.length)) * 100 * 10) / 10);
  const isMatch = score >= MATCH_ACCEPTANCE_SCORE && bestMatchedPairs >= 10;

  return {
    isMatch,
    score,
    confidence,
    matchedPairs: bestMatchedPairs,
    totalCandidateMinutiae: cMin.length,
    totalProbeMinutiae: pMin.length,
  };
}

/**
 * 1:N Identification Engine:
 * Compares a probe template against a roster of gym members and returns the best matching member.
 */
export function identifyMemberFromRoster(
  probeTemplate: FingerprintTemplate,
  roster: RosterMemberFingerprint[],
  acceptanceThreshold = MATCH_ACCEPTANCE_SCORE
): {
  matched: boolean;
  member?: RosterMemberFingerprint;
  matchResult?: MatchScoreResult;
} {
  let bestMember: RosterMemberFingerprint | undefined;
  let highestScoreResult: MatchScoreResult = {
    isMatch: false,
    score: 0,
    confidence: 0,
    matchedPairs: 0,
    totalCandidateMinutiae: 0,
    totalProbeMinutiae: 0,
  };

  for (const member of roster) {
    if (!member.fingerprint_template || !member.fingerprint_template.minutiae) {
      continue;
    }

    const result = matchTemplates(probeTemplate, member.fingerprint_template);

    if (result.score > highestScoreResult.score) {
      highestScoreResult = result;
      if (result.isMatch && result.score >= acceptanceThreshold) {
        bestMember = member;
      }
    }
  }

  if (bestMember && highestScoreResult.isMatch) {
    return {
      matched: true,
      member: bestMember,
      matchResult: highestScoreResult,
    };
  }

  return {
    matched: false,
    matchResult: highestScoreResult,
  };
}
