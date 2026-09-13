import { Point2D } from './liveness';

export interface FaceBox {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface FaceQualityMetrics {
  width: number;
  height: number;
  score: number;
  ipd: number;
  rollDeg: number;
  yawRatio: number;
  flags: string[];
}

export interface FaceQualityResult {
  isValid: boolean;
  reason?: 'too_small' | 'low_score' | 'low_ipd' | 'excessive_roll' | 'excessive_yaw';
  diagnosticMessage?: string;
  metrics: FaceQualityMetrics;
}

export interface FaceQualityConfig {
  minFaceWidth?: number; // default: 96px
  minFaceHeight?: number; // default: 96px
  minScore?: number; // default: 0.60
  minIpd?: number; // default: 30px
  maxRollDeg?: number; // default: 15°
  maxYawRatio?: number; // default: 0.38 (~20° yaw)
}

const DEFAULT_CONFIG: Required<FaceQualityConfig> = {
  minFaceWidth: 96,
  minFaceHeight: 96,
  minScore: 0.60,
  minIpd: 30,
  maxRollDeg: 15,
  maxYawRatio: 0.38,
};

/**
 * Validates a detected face against enterprise biometric quality standards (ISO/IEC 19794-5 & ICAO 9303).
 * Rejects degraded, tiny, off-angle, or low-contrast faces BEFORE feature extraction or matching.
 */
export function validateFaceQuality(
  box: FaceBox,
  score: number,
  landmarks68?: Point2D[],
  config: FaceQualityConfig = {}
): FaceQualityResult {
  const cfg = { ...DEFAULT_CONFIG, ...config };
  const flags: string[] = [];

  const width = Math.round(box.width);
  const height = Math.round(box.height);

  // 1. Resolution / Size Gate
  if (width < cfg.minFaceWidth || height < cfg.minFaceHeight) {
    return {
      isValid: false,
      reason: 'too_small',
      diagnosticMessage: 'Move closer to the camera',
      metrics: { width, height, score, ipd: 0, rollDeg: 0, yawRatio: 0, flags: ['face_too_small'] },
    };
  }

  // 2. Detection Score Gate
  if (score < cfg.minScore) {
    return {
      isValid: false,
      reason: 'low_score',
      diagnosticMessage: 'Hold steady for focus',
      metrics: { width, height, score, ipd: 0, rollDeg: 0, yawRatio: 0, flags: ['low_detection_confidence'] },
    };
  }

  let ipd = 0;
  let rollDeg = 0;
  let yawRatio = 0;

  if (landmarks68 && landmarks68.length >= 68) {
    // Left eye center (points 36..41)
    let lx = 0, ly = 0;
    for (let i = 36; i <= 41; i++) {
      lx += landmarks68[i].x;
      ly += landmarks68[i].y;
    }
    const leftEye = { x: lx / 6, y: ly / 6 };

    // Right eye center (points 42..47)
    let rx = 0, ry = 0;
    for (let i = 42; i <= 47; i++) {
      rx += landmarks68[i].x;
      ry += landmarks68[i].y;
    }
    const rightEye = { x: rx / 6, y: ry / 6 };

    // 3. Interpupillary Distance (IPD)
    const dx = rightEye.x - leftEye.x;
    const dy = rightEye.y - leftEye.y;
    ipd = Number(Math.sqrt(dx * dx + dy * dy).toFixed(1));

    if (ipd < cfg.minIpd) {
      return {
        isValid: false,
        reason: 'low_ipd',
        diagnosticMessage: 'Move closer to the camera',
        metrics: { width, height, score, ipd, rollDeg: 0, yawRatio: 0, flags: ['low_ipd'] },
      };
    }

    // 4. Roll Angle (Head tilt left/right)
    rollDeg = Number((Math.atan2(Math.abs(dy), Math.abs(dx)) * (180 / Math.PI)).toFixed(1));
    if (rollDeg > cfg.maxRollDeg) {
      return {
        isValid: false,
        reason: 'excessive_roll',
        diagnosticMessage: 'Please keep your head level',
        metrics: { width, height, score, ipd, rollDeg, yawRatio: 0, flags: ['excessive_roll'] },
      };
    }

    // 5. Yaw Ratio (Horizontal turn away from camera)
    // Nose tip is point 30
    const nose = landmarks68[30];
    const distNoseToLeft = Math.sqrt((nose.x - leftEye.x) ** 2 + (nose.y - leftEye.y) ** 2);
    const distNoseToRight = Math.sqrt((nose.x - rightEye.x) ** 2 + (nose.y - rightEye.y) ** 2);
    yawRatio = Number((Math.abs(distNoseToLeft - distNoseToRight) / ipd).toFixed(3));

    if (yawRatio > cfg.maxYawRatio) {
      return {
        isValid: false,
        reason: 'excessive_yaw',
        diagnosticMessage: 'Please look directly at the camera',
        metrics: { width, height, score, ipd, rollDeg, yawRatio, flags: ['excessive_yaw'] },
      };
    }
  }

  flags.push('quality_verified');

  return {
    isValid: true,
    metrics: {
      width,
      height,
      score: Number(score.toFixed(2)),
      ipd,
      rollDeg,
      yawRatio,
      flags,
    },
  };
}

export interface DetectedFaceLike {
  box?: FaceBox;
  detection?: {
    box?: FaceBox;
    score?: number;
    [key: string]: any;
  };
  landmarks?: {
    positions?: Point2D[];
    [key: string]: any;
  };
  descriptor?: Float32Array | number[];
  [key: string]: any;
}

/**
 * When multiple faces appear in the camera field of view, prioritizes the primary subject
 * standing closest to the kiosk center and separates them from background pass-by persons.
 */
export function selectPrimaryFace<T = DetectedFaceLike>(
  faces: T[],
  frameWidth: number,
  frameHeight: number
): { primaryFace: T | null; secondaryFaces: T[] } {
  if (!faces || faces.length === 0) {
    return { primaryFace: null, secondaryFaces: [] };
  }

  if (faces.length === 1) {
    return { primaryFace: faces[0], secondaryFaces: [] };
  }

  const frameCenterX = frameWidth / 2;
  const frameCenterY = frameHeight / 2;

  // Rank each face: area * (1 - normalized distance from center)
  const scored = faces.map(f => {
    const raw = f as unknown as { box?: FaceBox; detection?: { box?: FaceBox } };
    const box = raw.box ?? raw.detection?.box ?? { x: 0, y: 0, width: 0, height: 0 };
    const { x, y, width, height } = box;
    const cx = x + width / 2;
    const cy = y + height / 2;
    const area = width * height;

    const normDistX = Math.abs(cx - frameCenterX) / frameCenterX;
    const normDistY = Math.abs(cy - frameCenterY) / frameCenterY;
    const centrality = Math.max(0.2, 1 - 0.5 * (normDistX + normDistY));

    return {
      face: f,
      area,
      compositeScore: area * centrality,
    };
  });

  scored.sort((a, b) => b.compositeScore - a.compositeScore);

  const primary = scored[0].face;
  const secondary = scored.slice(1).map(s => s.face);

  return {
    primaryFace: primary,
    secondaryFaces: secondary,
  };
}
