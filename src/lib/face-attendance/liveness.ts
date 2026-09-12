/**
 * Biometric Liveness & Presentation Attack Detection (PAD)
 * Evaluates Eye Aspect Ratio (EAR), blink dynamics, and micro-motion variance.
 * Standardized on 68-landmark facial geometry (Soukupová & Čech, 2016).
 * Designed to prevent photo, screen, and static spoof attacks in kiosk environments.
 */

export interface Point2D {
  x: number;
  y: number;
}

export interface Box2D {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface LivenessMetrics {
  earLeft: number;
  earRight: number;
  avgEar: number;
  isBlinking: boolean;
  motionVariance: number;
  isMotionNatural: boolean;
  score: number; // 0.0 to 1.0
  isLive: boolean;
  flags: string[];
}

/**
 * Extracts Left and Right 6-point eye landmark arrays from standard 68-point face landmarks.
 * 68-point model landmark indices:
 * Left Eye:  36..41 (outer corner: 36, top: 37, 38, inner corner: 39, bottom: 40, 41)
 * Right Eye: 42..47 (inner corner: 42, top: 43, 44, outer corner: 45, bottom: 46, 47)
 */
export function extractEyeLandmarksFrom68(landmarks: Point2D[]): {
  leftEye: Point2D[];
  rightEye: Point2D[];
} | null {
  if (!landmarks || landmarks.length < 68) return null;
  return {
    leftEye: landmarks.slice(36, 42),
    rightEye: landmarks.slice(42, 48),
  };
}

/**
 * Calculates Eye Aspect Ratio (EAR) from 6 landmark points.
 * Standard formula based on Soukupová & Čech (2016):
 * EAR = (||p1 - p5|| + ||p2 - p4||) / (2 * ||p0 - p3||)
 *
 * Normal open human eye: 0.20 - 0.45
 * Closed / Blinking eye: < 0.18
 */
export function calculateEyeAspectRatio(eye: Point2D[]): number {
  if (!eye || eye.length < 6) return 0;
  const dist = (pA: Point2D, pB: Point2D) =>
    Math.sqrt((pA.x - pB.x) ** 2 + (pA.y - pB.y) ** 2);

  const dVertical1 = dist(eye[1], eye[5]);
  const dVertical2 = dist(eye[2], eye[4]);
  const dHorizontal = dist(eye[0], eye[3]);

  if (dHorizontal === 0) return 0;
  return Number(((dVertical1 + dVertical2) / (2.0 * dHorizontal)).toFixed(4));
}

/**
 * Calculates standard deviation / spatial variance of 2D coordinates across temporal frames.
 */
export function calculateSpatialVariance(points: Point2D[]): number {
  if (points.length < 2) return 0;
  let sumX = 0;
  let sumY = 0;
  for (const p of points) {
    sumX += p.x;
    sumY += p.y;
  }
  const meanX = sumX / points.length;
  const meanY = sumY / points.length;

  let variance = 0;
  for (const p of points) {
    variance += (p.x - meanX) ** 2 + (p.y - meanY) ** 2;
  }
  return Number(Math.sqrt(variance / points.length).toFixed(3));
}

/**
 * Evaluates liveness metrics from current eye landmarks and temporal observation history.
 */
export function evaluateLiveness(params: {
  leftEye?: Point2D[];
  rightEye?: Point2D[];
  landmarks68?: Point2D[];
  centroidHistory?: Point2D[];
  blinkObserved?: boolean;
}): LivenessMetrics {
  let { leftEye, rightEye } = params;
  const { landmarks68, centroidHistory = [], blinkObserved = false } = params;
  const flags: string[] = [];

  // Extract eye points from 68-point landmarks if provided
  if ((!leftEye || !rightEye) && landmarks68 && landmarks68.length >= 68) {
    const extracted = extractEyeLandmarksFrom68(landmarks68);
    if (extracted) {
      leftEye = leftEye || extracted.leftEye;
      rightEye = rightEye || extracted.rightEye;
    }
  }

  let earLeft = 0;
  let earRight = 0;
  if (leftEye && leftEye.length >= 6) {
    earLeft = calculateEyeAspectRatio(leftEye);
  }
  if (rightEye && rightEye.length >= 6) {
    earRight = calculateEyeAspectRatio(rightEye);
  }

  const hasEyes = earLeft > 0 && earRight > 0;
  const avgEar = hasEyes ? Number(((earLeft + earRight) / 2).toFixed(4)) : 0;
  const isBlinking = blinkObserved || (hasEyes && avgEar < 0.18);

  // Motion variance across recent frames
  const motionVariance = calculateSpatialVariance(centroidHistory);

  // Base score
  let score = 0.5;

  // 1. Biological eye geometry sanity check
  if (hasEyes) {
    if (avgEar >= 0.18 && avgEar <= 0.55) {
      score += 0.25; // Plausible open human eye ratio
    } else if (avgEar < 0.18) {
      score += 0.20; // Natural blink event
      flags.push('eye_blink_captured');
    } else {
      score -= 0.20;
      flags.push('unnatural_eye_aspect_ratio');
    }

    // Eye symmetry check
    const asymmetry = Math.abs(earLeft - earRight);
    if (asymmetry > 0.18) {
      flags.push('eye_asymmetry_detected');
      score -= 0.1;
    }
  }

  // 2. Micro-motion variance check (Static 2D vs Living Subject)
  let isMotionNatural = true;
  if (centroidHistory.length >= 3) {
    if (motionVariance < 0.05) {
      // Completely static image (photo on a stand or screen spoof)
      isMotionNatural = false;
      score -= 0.35;
      flags.push('zero_motion_spoof_suspect');
    } else if (motionVariance > 75) {
      // Rapid jitter / excessive erratic motion
      isMotionNatural = false;
      score -= 0.2;
      flags.push('excessive_motion');
    } else {
      // Natural human micro-tremor (breathing, posture micro-adjustments: 0.1px - 35px)
      score += 0.25;
      flags.push('natural_micro_motion');
    }
  }

  score = Math.max(0.0, Math.min(1.0, Number(score.toFixed(2))));
  const isLive = score >= 0.65;

  return {
    earLeft,
    earRight,
    avgEar,
    isBlinking,
    motionVariance,
    isMotionNatural,
    score,
    isLive,
    flags,
  };
}
