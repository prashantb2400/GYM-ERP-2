import { MatchResult } from './types';
import { Point2D, LivenessMetrics, evaluateLiveness } from './liveness';

interface CandidateState {
  memberId: string;
  name: string;
  memberCode: string;
  photoUrl?: string | null;
  count: number;
  firstSeenMs: number;
  lastSeenMs: number;
  bestDistance: number;
  bestConfidence: number;
  tier: 'high' | 'medium';
  centroids: Point2D[];
  blinkDetected: boolean;
}

export interface LivenessObservation {
  leftEye?: Point2D[];
  rightEye?: Point2D[];
  landmarks68?: Point2D[];
  centroid?: Point2D;
}

export interface ConsensusVerification {
  isConfirmed: boolean;
  progress: number; // 0.0 to 1.0 (for UI progress display)
  match: MatchResult;
  framesObserved: number;
  targetFrames: number;
  liveness?: LivenessMetrics;
}

export class ConsensusTracker {
  private candidates = new Map<string, CandidateState>();
  private readonly windowMs: number;
  private readonly highConfidenceRequiredFrames: number;
  private readonly mediumConfidenceRequiredFrames: number;
  private readonly requireLiveness: boolean;

  constructor(options?: {
    windowMs?: number;
    highConfidenceRequiredFrames?: number;
    mediumConfidenceRequiredFrames?: number;
    requireLiveness?: boolean;
  }) {
    this.windowMs = options?.windowMs ?? 1200; // 1200ms temporal window for camera frame rate resilience
    this.highConfidenceRequiredFrames = options?.highConfidenceRequiredFrames ?? 2;
    this.mediumConfidenceRequiredFrames = options?.mediumConfidenceRequiredFrames ?? 3;
    this.requireLiveness = options?.requireLiveness ?? false;
  }

  /**
   * Evaluates a candidate match against temporal history.
   * Returns whether multi-frame consensus has been satisfied.
   */
  public evaluate(
    match: MatchResult,
    nowMs = Date.now(),
    observation?: LivenessObservation
  ): ConsensusVerification {
    const { memberId, tier = 'medium', distance, confidence } = match;
    const targetFrames = tier === 'high' ? this.highConfidenceRequiredFrames : this.mediumConfidenceRequiredFrames;

    let state = this.candidates.get(memberId);

    // If candidate does not exist or previous window expired, start fresh window
    if (!state || (nowMs - state.lastSeenMs > this.windowMs)) {
      state = {
        memberId,
        name: match.name,
        memberCode: match.memberCode,
        photoUrl: match.photoUrl,
        count: 1,
        firstSeenMs: nowMs,
        lastSeenMs: nowMs,
        bestDistance: distance,
        bestConfidence: confidence,
        tier,
        centroids: observation?.centroid ? [observation.centroid] : [],
        blinkDetected: false,
      };
      this.candidates.set(memberId, state);
    } else {
      // Candidate seen again inside the valid temporal window
      state.count += 1;
      state.lastSeenMs = nowMs;
      if (distance < state.bestDistance) {
        state.bestDistance = distance;
        state.bestConfidence = confidence;
      }
      if (tier === 'high') {
        state.tier = 'high';
      }
      if (observation?.centroid) {
        state.centroids.push(observation.centroid);
        if (state.centroids.length > 8) {
          state.centroids.shift();
        }
      }
    }

    // Evaluate liveness if observation is supplied
    let livenessMetrics: LivenessMetrics | undefined;
    if (observation) {
      livenessMetrics = evaluateLiveness({
        leftEye: observation.leftEye,
        rightEye: observation.rightEye,
        landmarks68: observation.landmarks68,
        centroidHistory: state.centroids,
        blinkObserved: state.blinkDetected,
      });
      if (livenessMetrics.isBlinking) {
        state.blinkDetected = true;
      }
    }

    let isConfirmed = state.count >= targetFrames;
    if (isConfirmed && this.requireLiveness && livenessMetrics && !livenessMetrics.isLive) {
      // Hold confirmation if liveness threshold is not met
      isConfirmed = false;
    }

    const progress = Math.min(1.0, Math.round((state.count / targetFrames) * 100) / 100);

    const verifiedResult: MatchResult = {
      memberId: state.memberId,
      name: state.name,
      memberCode: state.memberCode,
      photoUrl: state.photoUrl,
      distance: state.bestDistance,
      confidence: state.bestConfidence,
      tier: state.tier,
    };

    if (isConfirmed) {
      // Reset state for this member after confirmed consensus
      this.candidates.delete(memberId);
    }

    this.pruneStale(nowMs);

    return {
      isConfirmed,
      progress,
      match: verifiedResult,
      framesObserved: state.count,
      targetFrames,
      liveness: livenessMetrics,
    };
  }

  /**
   * Resets tracking state for a specific member or all members
   */
  public reset(memberId?: string) {
    if (memberId) {
      this.candidates.delete(memberId);
    } else {
      this.candidates.clear();
    }
  }

  /**
   * Cleans up expired candidate windows to prevent memory leaks
   */
  private pruneStale(nowMs: number) {
    if (this.candidates.size > 20) {
      for (const [id, state] of this.candidates.entries()) {
        if (nowMs - state.lastSeenMs > this.windowMs * 2) {
          this.candidates.delete(id);
        }
      }
    }
  }
}
