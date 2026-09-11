/**
 * Public Integration Contract & Types for In-Browser Face Attendance Module
 */

export interface FaceDescriptorRecord {
  memberId: string;
  name: string;
  memberCode: string;
  photoUrl?: string | null;
  descriptor: number[]; // 128-float array (primary / centroid)
  descriptors?: number[][]; // multi-template gallery of distinct pose vectors
  branchId?: string | null;
}

export interface MatchResult {
  memberId: string;
  name: string;
  memberCode: string;
  photoUrl?: string | null;
  distance: number;
  confidence: number;
  tier?: 'high' | 'medium';
}

export interface QualityMetrics {
  minFaceWidthPx: number;
  minDetectionScore: number;
}

export interface AttendanceEvent {
  id?: string;
  gymId: string;
  branchId?: string;
  memberId: string;
  memberName: string;
  type: 'in' | 'out';
  timestamp: string; // ISO 8601
  confidence: number;
  method: 'face_recognition';
  deviceId?: string;
  synced?: boolean;
}

export interface FaceAttendanceConfig {
  gymId: string;
  threshold?: number; // Maximum Euclidean distance (default: 0.52)
  cooldownMs?: number; // Suppress repeat scans for member (default: 30,000 ms)
  mode?: 'auto' | 'in' | 'out'; // Default: 'auto' (toggle between in and out)
  minFaceSize?: number; // Minimum bounding box width in pixels (default: 80)
  onAttendance?: (event: AttendanceEvent) => void;
  onError?: (err: Error) => void;
}

export interface EnrollmentFrame {
  descriptor: Float32Array;
  score: number;
}

export interface EnrollmentResult {
  success: boolean;
  averagedDescriptor?: number[];
  descriptors?: number[][];
  error?: string;
}
