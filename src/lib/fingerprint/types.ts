/**
 * Types for GymERP Biometric Fingerprint Engine
 */

export type MinutiaeType = 'ending' | 'bifurcation' | 'unknown';

export interface MinutiaePoint {
  x: number;
  y: number;
  angle: number; // in radians, 0 to 2*PI
  type: MinutiaeType;
  quality?: number; // 0 to 100
}

export interface FingerprintTemplate {
  version: '1.0';
  format: 'ISO_19794_2' | 'ANSI_378' | 'GYMERP_MINUTIAE';
  width: number;
  height: number;
  minutiae: MinutiaePoint[];
  quality: number; // 0 to 100
  finger: string;
  createdAt: string;
  rawTemplateBase64?: string;
}

export type FingerType =
  | 'right_thumb'
  | 'right_index'
  | 'right_middle'
  | 'left_thumb'
  | 'left_index'
  | 'left_middle';

export type ScannerDriverId = 'mantra' | 'secugen' | 'bridge' | 'virtual';

export interface ScannerDeviceInfo {
  driverId: ScannerDriverId;
  name: string;
  connected: boolean;
  port?: number;
  serialNumber?: string;
  firmwareVersion?: string;
  model?: string;
}

export interface CaptureResult {
  success: boolean;
  template?: FingerprintTemplate;
  quality: number; // 0 - 100
  imageBase64?: string; // Grayscale or SVG preview
  error?: string;
  driverId: ScannerDriverId;
  nfiqScore?: number; // NIST Fingerprint Image Quality (1=best, 5=worst)
}

export type BiometricSensitivityMode = 'strict' | 'normal' | 'callus_adapted';

export interface MatchScoreResult {
  isMatch: boolean;
  score: number; // 0 to 100
  confidence: number; // 0 to 100%
  matchedPairs: number;
  totalCandidateMinutiae: number;
  totalProbeMinutiae: number;
}

export interface RosterMemberFingerprint {
  id: string;
  name: string;
  member_code: string;
  status: string;
  photo_url?: string | null;
  plan_end_date?: string | null;
  total_due?: number;
  branch_id?: string | null;
  fingerprint_template: FingerprintTemplate | null;
  fingerprint_finger?: string | null;
}
