'use client';

import React, { useEffect, useRef, useState, useCallback } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { createClient } from '@/lib/supabase/client';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  CameraOff,
  CheckCircle2,
  AlertCircle,
  Volume2,
  VolumeX,
  Loader2,
  ScanFace,
  RefreshCw,
  Fingerprint,
  SwitchCamera,
  FlipHorizontal,
  Sparkles,
} from 'lucide-react';
import { getInitials } from '@/lib/utils/format';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { getRecommendedFacingMode, getRecommendedMirrorState } from '@/lib/utils/device';
import { triggerHapticFeedback } from '@/lib/utils/gesture';
import { fetchWithAuth } from '@/lib/utils/api-client';
import { FingerprintScannerManager } from '@/lib/fingerprint/drivers';
import { identifyMemberFromRoster } from '@/lib/fingerprint/matcher';
import type { RosterMemberFingerprint, ScannerDeviceInfo, ScannerDriverId, FingerType } from '@/lib/fingerprint/types';

import {
  loadFaceApiModels,
  findBestMatch,
  normalizeDescriptor,
  syncRoster,
  recordAttendanceEvent,
  flushAttendanceQueue,
  ConsensusTracker,
  validateFaceQuality,
  selectPrimaryFace,
  detectLegacyDimensionMembers,
  type FaceDescriptorRecord,
  type AttendanceEvent,
} from '@/lib/face-attendance';

export interface BiometricLoggedEvent {
  memberId: string;
  memberName: string;
  memberCode?: string;
  memberPhoto?: string | null;
  action: 'check_in' | 'check_out';
  method: 'face_recognition' | 'fingerprint';
  time: string;
}

interface BiometricScannerCockpitProps {
  variant?: 'cockpit' | 'kiosk';
  onAttendanceLogged?: (event: BiometricLoggedEvent) => void;
  className?: string;
}

interface RecognitionBanner {
  state: 'idle' | 'success' | 'already' | 'error';
  memberName?: string;
  memberPhoto?: string | null;
  memberCode?: string;
  action?: 'check_in' | 'check_out' | 'check_in_duplicate' | 'already_completed';
  time?: string;
  message?: string;
  method?: 'face_recognition' | 'fingerprint';
}

function drawRoundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  if (typeof ctx.roundRect === 'function') {
    ctx.roundRect(x, y, w, h, r);
  } else {
    ctx.rect(x, y, w, h);
  }
}

export function BiometricScannerCockpit({
  variant = 'cockpit',
  onAttendanceLogged,
  className,
}: BiometricScannerCockpitProps) {
  const { user } = useAuth();
  const gymId = user?.gymId;
  const userBranchId = user?.branchId;

  const [soundEnabled, setSoundEnabled] = useState(true);
  const [isOnline, setIsOnline] = useState(true);
  const [todayCount, setTodayCount] = useState(0);

  // Face Recognition State
  const [roster, setRoster] = useState<FaceDescriptorRecord[]>([]);
  const [legacyMemberCount, setLegacyMemberCount] = useState(0);
  const [isLoadingModels, setIsLoadingModels] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [facingMode, setFacingMode] = useState<'user' | 'environment'>('user');
  const [isMirrored, setIsMirrored] = useState(true);
  const [availableCameras, setAvailableCameras] = useState<MediaDeviceInfo[]>([]);
  const [isFlippingCamera, setIsFlippingCamera] = useState(false);

  const isMirroredRef = useRef(true);
  const facingModeRef = useRef<'user' | 'environment'>('user');
  const selectedCameraIdRef = useRef<string>('');
  const isFlippingCameraRef = useRef(false);

  // Device-aware initial camera configuration
  useEffect(() => {
    const recFacing = getRecommendedFacingMode();
    const recMirrored = getRecommendedMirrorState(recFacing);
    setFacingMode(recFacing);
    facingModeRef.current = recFacing;
    setIsMirrored(recMirrored);
    isMirroredRef.current = recMirrored;
  }, []);

  // Fingerprint State
  const [fpRoster, setFpRoster] = useState<RosterMemberFingerprint[]>([]);
  const [loadingFpRoster, setLoadingFpRoster] = useState(true);
  const [fpDeviceInfo, setFpDeviceInfo] = useState<ScannerDeviceInfo | null>(null);
  const [isFpScanning, setIsFpScanning] = useState(false);

  // Shared Output State
  const [recognitionBanner, setRecognitionBanner] = useState<RecognitionBanner>({ state: 'idle' });

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const faceApiRef = useRef<any>(null);

  const isDetectingRef = useRef(false);
  const cooldownMapRef = useRef<Map<string, number>>(new Map());
  const consensusTrackerRef = useRef<ConsensusTracker>(
    new ConsensusTracker({
      windowMs: 1500,
      highConfidenceRequiredFrames: 4,
      mediumConfidenceRequiredFrames: 6,
      minObservationDurationMs: 250,
      requireLiveness: false,
    })
  );
  const bannerTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const scannerManager = FingerprintScannerManager.getInstance();
  const isHandlingFpScanRef = useRef(false);
  const supabase = createClient();

  // Load today's initial attendance tally
  useEffect(() => {
    if (!gymId) return;
    const today = new Date().toISOString().split('T')[0];
    supabase
      .from('attendance')
      .select('id', { count: 'exact', head: true })
      .eq('gym_id', gymId)
      .eq('date', today)
      .then(({ count }) => {
        setTodayCount(count || 0);
      });
  }, [gymId, supabase]);

  // Multi-harmonic Web Audio chime feedback
  const playChime = useCallback((success: boolean, type: 'success' | 'already' | 'error' = 'success') => {
    if (!soundEnabled) return;
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      const ctx = new AudioCtx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);

      if (type === 'already') {
        osc.frequency.setValueAtTime(587.33, ctx.currentTime);
        osc.frequency.setValueAtTime(880, ctx.currentTime + 0.1);
        gain.gain.setValueAtTime(0.2, ctx.currentTime);
        osc.start();
        osc.stop(ctx.currentTime + 0.25);
      } else if (success) {
        osc.frequency.setValueAtTime(523.25, ctx.currentTime);
        osc.frequency.setValueAtTime(659.25, ctx.currentTime + 0.08);
        osc.frequency.setValueAtTime(783.99, ctx.currentTime + 0.16);
        gain.gain.setValueAtTime(0.25, ctx.currentTime);
        osc.start();
        osc.stop(ctx.currentTime + 0.35);
      } else {
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(220, ctx.currentTime);
        gain.gain.setValueAtTime(0.25, ctx.currentTime);
        osc.start();
        osc.stop(ctx.currentTime + 0.3);
      }
    } catch {
      // Audio not supported or blocked
    }
  }, [soundEnabled]);

  // Enumerate cameras
  const enumerateCameras = useCallback(async () => {
    try {
      if (typeof navigator !== 'undefined' && navigator.mediaDevices?.enumerateDevices) {
        const devices = await navigator.mediaDevices.enumerateDevices();
        const videoInputs = devices.filter(d => d.kind === 'videoinput');
        setAvailableCameras(videoInputs);
        return videoInputs;
      }
    } catch (e) {
      console.warn('Failed to enumerate cameras:', e);
    }
    return [];
  }, []);

  // Camera start with automatic fallback
  const startCamera = useCallback(async (
    targetFacing?: 'user' | 'environment',
    targetDeviceId?: string,
    targetMirrored?: boolean
  ) => {
    try {
      setCameraError(null);
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(t => t.stop());
        streamRef.current = null;
      }

      const effectiveFacing = targetFacing || facingModeRef.current || getRecommendedFacingMode();
      const deviceId = targetDeviceId || (targetFacing ? undefined : selectedCameraIdRef.current);

      let stream: MediaStream | null = null;

      try {
        const constraints: MediaStreamConstraints = {
          video: deviceId
            ? { deviceId: { exact: deviceId }, width: { ideal: 1280 }, height: { ideal: 720 } }
            : { facingMode: effectiveFacing, width: { ideal: 1280 }, height: { ideal: 720 } },
        };
        stream = await navigator.mediaDevices.getUserMedia(constraints);
      } catch (firstErr) {
        const fallbackFacing = effectiveFacing === 'environment' ? 'user' : 'environment';
        try {
          stream = await navigator.mediaDevices.getUserMedia({
            video: { facingMode: fallbackFacing, width: { ideal: 1280 }, height: { ideal: 720 } },
          });
        } catch (secondErr) {
          stream = await navigator.mediaDevices.getUserMedia({
            video: { width: { ideal: 1280 }, height: { ideal: 720 } },
          });
        }
      }

      if (!stream) {
        throw new Error('No video stream returned from camera');
      }

      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }

      const videoTrack = stream.getVideoTracks()[0];
      const settings = videoTrack?.getSettings?.();
      let actualFacing: 'user' | 'environment' = effectiveFacing;

      if (settings?.deviceId) {
        selectedCameraIdRef.current = settings.deviceId;
      }
      if (settings?.facingMode === 'user' || settings?.facingMode === 'environment') {
        actualFacing = settings.facingMode;
        setFacingMode(settings.facingMode);
        facingModeRef.current = settings.facingMode;
      } else if (targetFacing) {
        actualFacing = targetFacing;
        setFacingMode(targetFacing);
        facingModeRef.current = targetFacing;
      }

      const shouldMirror = targetMirrored !== undefined
        ? targetMirrored
        : getRecommendedMirrorState(actualFacing);

      setIsMirrored(shouldMirror);
      isMirroredRef.current = shouldMirror;

      setIsCameraActive(true);
      enumerateCameras();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Camera access denied';
      setCameraError(msg);
      setIsCameraActive(false);
    }
  }, [enumerateCameras]);

  // Camera stop
  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop());
      streamRef.current = null;
    }
    setIsCameraActive(false);
  }, []);

  // Flip camera
  const handleFlipCamera = useCallback(async () => {
    if (isFlippingCameraRef.current) return;
    isFlippingCameraRef.current = true;
    setIsFlippingCamera(true);

    triggerHapticFeedback(40);

    consensusTrackerRef.current.reset();
    if (canvasRef.current) {
      const ctx = canvasRef.current.getContext('2d');
      if (ctx) {
        ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
      }
    }

    try {
      if (availableCameras.length > 1) {
        const currentIdx = availableCameras.findIndex(c => c.deviceId === selectedCameraIdRef.current);
        const nextIdx = (currentIdx + 1) % availableCameras.length;
        const nextCam = availableCameras[nextIdx];
        const nextDeviceId = nextCam.deviceId;
        const label = (nextCam.label || '').toLowerCase();
        const isBack = label.includes('back') || label.includes('rear') || label.includes('environment');
        const nextFacing: 'user' | 'environment' = isBack ? 'environment' : 'user';
        const nextMirrored = !isBack;
        await startCamera(nextFacing, nextDeviceId, nextMirrored);
      } else {
        const nextFacing = facingModeRef.current === 'user' ? 'environment' : 'user';
        const nextMirrored = nextFacing === 'user';
        await startCamera(nextFacing, undefined, nextMirrored);
      }
    } catch (err) {
      console.warn('Flip camera error:', err);
    } finally {
      setTimeout(() => {
        isFlippingCameraRef.current = false;
        setIsFlippingCamera(false);
      }, 350);
    }
  }, [availableCameras, startCamera]);

  // Toggle mirror orientation
  const handleToggleMirror = useCallback(() => {
    setIsMirrored(prev => {
      const next = !prev;
      isMirroredRef.current = next;
      return next;
    });
  }, []);

  // Detect fingerprint scanner hardware
  const detectFpHardware = useCallback(async () => {
    try {
      const info = await scannerManager.detectActiveScanner();
      setFpDeviceInfo(info);
    } catch {
      setFpDeviceInfo({
        driverId: 'virtual',
        name: 'Virtual Optical Sensor',
        connected: true,
      });
    }
  }, [scannerManager]);

  // Load roster of enrolled fingerprint templates
  const loadFpRoster = useCallback(async () => {
    if (!gymId) return;
    setLoadingFpRoster(true);
    try {
      const branchParam = userBranchId ? `&branchId=${userBranchId}` : '';
      const res = await fetchWithAuth(`/api/attendance/fingerprint-roster?gymId=${gymId}${branchParam}`);
      const data = await res.json();
      if (res.ok && data.roster) {
        setFpRoster(data.roster);
      }
    } catch (err) {
      console.error('Failed to load fingerprint roster:', err);
    } finally {
      setLoadingFpRoster(false);
    }
  }, [gymId, userBranchId]);

  // Unified Roster & Hardware Refresh
  const handleRefreshRoster = async () => {
    if (!gymId) return;
    setIsRefreshing(true);
    try {
      const [{ roster: loadedRoster, isOffline }] = await Promise.all([
        syncRoster(gymId, user?.branchId || undefined),
        loadFpRoster(),
        detectFpHardware(),
      ]);
      setRoster(loadedRoster);
      const legacy = detectLegacyDimensionMembers(loadedRoster, 128);
      setLegacyMemberCount(legacy.count);
      setIsOnline(!isOffline);
      toast.success('Rosters and biometric sensor synced');
    } catch (err) {
      console.error('Manual roster refresh failed:', err);
      toast.error('Failed to refresh biometric data');
    } finally {
      setIsRefreshing(false);
    }
  };

  // Initial setup: Load neural models, camera, fingerprint templates and hardware
  useEffect(() => {
    let mounted = true;

    (async () => {
      try {
        setIsLoadingModels(true);
        const api = await loadFaceApiModels('/models/face');
        if (mounted) {
          faceApiRef.current = api;
          setIsLoadingModels(false);
          await startCamera();
        }

        if (gymId && mounted) {
          const { roster: loadedRoster, isOffline } = await syncRoster(gymId, user?.branchId || undefined);
          if (mounted) {
            setRoster(loadedRoster);
            const legacy = detectLegacyDimensionMembers(loadedRoster, 128);
            setLegacyMemberCount(legacy.count);
            setIsOnline(!isOffline);
          }
        }
      } catch (err: unknown) {
        if (mounted) {
          const msg = err instanceof Error ? err.message : 'Failed to initialize biometric camera';
          setCameraError(msg);
          setIsLoadingModels(false);
        }
      }
    })();

    detectFpHardware();
    loadFpRoster();

    const handleOnline = () => {
      setIsOnline(true);
      if (gymId) {
        syncRoster(gymId, user?.branchId || undefined).then(({ roster: r }) => {
          setRoster(r);
          const legacy = detectLegacyDimensionMembers(r, 128);
          setLegacyMemberCount(legacy.count);
        });
        flushAttendanceQueue();
      }
    };
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    const syncInterval = setInterval(() => {
      if (navigator.onLine) {
        flushAttendanceQueue();
      }
    }, 20000);

    return () => {
      mounted = false;
      stopCamera();
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      clearInterval(syncInterval);
    };
  }, [gymId, user?.branchId, startCamera, stopCamera, detectFpHardware, loadFpRoster]);

  // Main real-time face detection & matching loop (ResNet-34 pipeline)
  useEffect(() => {
    let animationFrameId: number;
    let lastDetectionTime = 0;
    const THROTTLE_MS = 50;

    const detectLoop = async (now: number) => {
      if (
        !isDetectingRef.current &&
        videoRef.current &&
        videoRef.current.readyState >= 2 &&
        faceApiRef.current &&
        roster.length > 0 &&
        now - lastDetectionTime >= THROTTLE_MS
      ) {
        isDetectingRef.current = true;
        lastDetectionTime = now;

        const faceapi = faceApiRef.current;
        const video = videoRef.current;

        try {
          const options = new faceapi.TinyFaceDetectorOptions({ inputSize: 416, scoreThreshold: 0.55 });
          const detections = await faceapi
            .detectAllFaces(video, options)
            .withFaceLandmarks()
            .withFaceDescriptors();

          let canvasCtx: CanvasRenderingContext2D | null = null;
          let canvasWidth = 0;
          let canvasHeight = 0;
          if (canvasRef.current) {
            const canvas = canvasRef.current;
            canvas.width = video.videoWidth;
            canvas.height = video.videoHeight;
            canvasWidth = canvas.width;
            canvasHeight = canvas.height;
            canvasCtx = canvas.getContext('2d');
            if (canvasCtx) {
              canvasCtx.clearRect(0, 0, canvas.width, canvas.height);
            }
          }

          const currentTime = Date.now();

          if (!detections || detections.length === 0) {
            consensusTrackerRef.current.reportUnrecognized(currentTime);
          } else {
            const { primaryFace, secondaryFaces } = selectPrimaryFace<any>(
              detections,
              video.videoWidth,
              video.videoHeight
            );

            if (canvasCtx && secondaryFaces && secondaryFaces.length > 0) {
              for (const sec of (secondaryFaces as any[])) {
                const box = sec?.detection?.box || sec?.box;
                if (!box) continue;
                const sx = isMirroredRef.current ? canvasWidth - (box.x + box.width) : box.x;
                const sy = box.y;
                const sw = box.width;
                const sh = box.height;
                canvasCtx.save();
                canvasCtx.strokeStyle = 'rgba(161, 161, 170, 0.35)';
                canvasCtx.lineWidth = 1;
                canvasCtx.setLineDash([3, 3]);
                canvasCtx.strokeRect(sx, sy, sw, sh);
                canvasCtx.restore();
              }
            }

            if (primaryFace) {
              const primaryAny = primaryFace as any;
              const box = primaryAny?.detection?.box || primaryAny?.box;
              if (!box) {
                isDetectingRef.current = false;
                return;
              }
              const fx = box.x;
              const fy = box.y;
              const fw = box.width;
              const fh = box.height;
              const x = isMirroredRef.current ? canvasWidth - (fx + fw) : fx;
              const y = fy;
              const w = fw;
              const h = fh;
              const cx = x + w / 2;
              const cy = y + h / 2;

              const quality = validateFaceQuality(
                box,
                primaryFace.detection.score,
                primaryFace.landmarks?.positions
              );

              if (!quality.isValid) {
                consensusTrackerRef.current.reportUnrecognized(currentTime);

                if (canvasCtx) {
                  const len = Math.min(22, w * 0.22);
                  canvasCtx.save();
                  canvasCtx.strokeStyle = 'rgba(234, 179, 8, 0.85)';
                  canvasCtx.lineWidth = 2;
                  canvasCtx.lineCap = 'round';
                  canvasCtx.setLineDash([4, 4]);

                  canvasCtx.beginPath();
                  canvasCtx.moveTo(x, y + len); canvasCtx.lineTo(x, y); canvasCtx.lineTo(x + len, y);
                  canvasCtx.moveTo(x + w - len, y); canvasCtx.lineTo(x + w, y); canvasCtx.lineTo(x + w, y + len);
                  canvasCtx.moveTo(x + w, y + h - len); canvasCtx.lineTo(x + w, y + h); canvasCtx.lineTo(x + w - len, y + h);
                  canvasCtx.moveTo(x + len, y + h); canvasCtx.lineTo(x, y + h); canvasCtx.lineTo(x, y + h - len);
                  canvasCtx.stroke();
                  canvasCtx.restore();

                  const diagText = quality.diagnosticMessage?.toUpperCase() || 'ADJUST POSITION';
                  canvasCtx.save();
                  const plateWidth = Math.max(165, diagText.length * 8 + 32);
                  const plateHeight = 24;
                  const plateX = Math.max(4, Math.min(canvasWidth - plateWidth - 4, x + (w - plateWidth) / 2));
                  const plateY = Math.max(6, y - plateHeight - 8);

                  canvasCtx.fillStyle = 'rgba(15, 15, 20, 0.92)';
                  canvasCtx.strokeStyle = 'rgba(234, 179, 8, 0.7)';
                  canvasCtx.lineWidth = 1;
                  canvasCtx.beginPath();
                  drawRoundRect(canvasCtx, plateX, plateY, plateWidth, plateHeight, 5);
                  canvasCtx.fill();
                  canvasCtx.stroke();

                  canvasCtx.fillStyle = '#eab308';
                  canvasCtx.font = 'bold 10px system-ui, sans-serif';
                  canvasCtx.fillText(`! ${diagText}`, plateX + 10, plateY + 16);
                  canvasCtx.restore();
                }
              } else {
                const normDescriptor = normalizeDescriptor(primaryFace.descriptor);
                const match = findBestMatch(normDescriptor, roster, 0.40, 0.35, 0.05);

                const positions = primaryFace.landmarks.positions;
                const leftEye = positions.slice(36, 42).map((p: any) => ({ x: p.x, y: p.y }));
                const rightEye = positions.slice(42, 48).map((p: any) => ({ x: p.x, y: p.y }));
                const centroid = { x: fx + fw / 2, y: fy + fh / 2 };

                if (match) {
                  const consensus = consensusTrackerRef.current.evaluate(match, currentTime, {
                    leftEye,
                    rightEye,
                    centroid,
                  });
                  const isReadyToLog = consensus.isConfirmed;

                  if (canvasCtx) {
                    const isSpoofSuspect = consensus.liveness?.flags.includes('zero_motion_spoof_suspect');

                    const hudColor = isReadyToLog
                      ? '#10b981'
                      : isSpoofSuspect
                      ? '#f59e0b'
                      : consensus.progress >= 0.5
                      ? '#06b6d4'
                      : '#8b5cf6';

                    const len = Math.max(18, Math.min(32, w * 0.25));
                    canvasCtx.save();
                    canvasCtx.strokeStyle = hudColor;
                    canvasCtx.lineWidth = 2.5;
                    canvasCtx.lineCap = 'round';
                    canvasCtx.shadowColor = hudColor;
                    canvasCtx.shadowBlur = isReadyToLog ? 14 : 6;

                    canvasCtx.beginPath();
                    canvasCtx.moveTo(x, y + len); canvasCtx.lineTo(x, y); canvasCtx.lineTo(x + len, y);
                    canvasCtx.moveTo(x + w - len, y); canvasCtx.lineTo(x + w, y); canvasCtx.lineTo(x + w, y + len);
                    canvasCtx.moveTo(x + w, y + h - len); canvasCtx.lineTo(x + w, y + h); canvasCtx.lineTo(x + w - len, y + h);
                    canvasCtx.moveTo(x + len, y + h); canvasCtx.lineTo(x, y + h); canvasCtx.lineTo(x, y + h - len);
                    canvasCtx.stroke();

                    canvasCtx.beginPath();
                    canvasCtx.strokeStyle = `${hudColor}60`;
                    canvasCtx.lineWidth = 1;
                    canvasCtx.moveTo(cx - 6, cy); canvasCtx.lineTo(cx + 6, cy);
                    canvasCtx.moveTo(cx, cy - 6); canvasCtx.lineTo(cx, cy + 6);
                    canvasCtx.stroke();
                    canvasCtx.restore();

                    const nameLabel = match.name.toUpperCase();
                    const codeLabel = match.memberCode ? `#${match.memberCode}` : (isReadyToLog ? 'VERIFIED' : 'ACTIVE');

                    canvasCtx.font = 'bold 12px system-ui, -apple-system, sans-serif';
                    const nameWidth = canvasCtx.measureText(nameLabel).width;
                    canvasCtx.font = 'bold 9px monospace';
                    const codeWidth = canvasCtx.measureText(codeLabel).width;

                    const plateHeight = 26;
                    const plateWidth = Math.max(130, nameWidth + codeWidth + 36);
                    const plateX = Math.max(4, Math.min(canvasWidth - plateWidth - 4, x + (w - plateWidth) / 2));
                    const plateY = Math.max(6, y - plateHeight - 8);

                    canvasCtx.save();
                    canvasCtx.fillStyle = 'rgba(9, 9, 13, 0.92)';
                    canvasCtx.strokeStyle = hudColor;
                    canvasCtx.lineWidth = 1.5;
                    canvasCtx.shadowColor = hudColor;
                    canvasCtx.shadowBlur = 4;
                    canvasCtx.beginPath();
                    drawRoundRect(canvasCtx, plateX, plateY, plateWidth, plateHeight, 6);
                    canvasCtx.fill();
                    canvasCtx.stroke();

                    canvasCtx.beginPath();
                    canvasCtx.arc(plateX + 12, plateY + plateHeight / 2, 4, 0, Math.PI * 2);
                    canvasCtx.fillStyle = hudColor;
                    canvasCtx.fill();

                    canvasCtx.fillStyle = '#ffffff';
                    canvasCtx.font = 'bold 12px system-ui, -apple-system, sans-serif';
                    canvasCtx.fillText(nameLabel, plateX + 22, plateY + 17);

                    const badgeX = plateX + plateWidth - codeWidth - 14;
                    const badgeY = plateY + 4;
                    canvasCtx.fillStyle = `${hudColor}26`;
                    canvasCtx.beginPath();
                    drawRoundRect(canvasCtx, badgeX, badgeY, codeWidth + 8, 18, 4);
                    canvasCtx.fill();
                    canvasCtx.fillStyle = hudColor;
                    canvasCtx.font = 'bold 9px monospace';
                    canvasCtx.fillText(codeLabel, badgeX + 4, badgeY + 12);
                    canvasCtx.restore();

                    const bannerHeight = 22;
                    const bannerY = y + h + 8;
                    if (bannerY + bannerHeight < canvasHeight) {
                      canvasCtx.save();
                      const bannerWidth = Math.max(120, Math.min(plateWidth, w + 20));
                      const bannerX = Math.max(4, Math.min(canvasWidth - bannerWidth - 4, x + (w - bannerWidth) / 2));

                      canvasCtx.fillStyle = 'rgba(9, 9, 13, 0.90)';
                      canvasCtx.strokeStyle = `${hudColor}bb`;
                      canvasCtx.lineWidth = 1;
                      canvasCtx.beginPath();
                      drawRoundRect(canvasCtx, bannerX, bannerY, bannerWidth, bannerHeight, 5);
                      canvasCtx.fill();
                      canvasCtx.stroke();

                      if (isReadyToLog) {
                        canvasCtx.fillStyle = '#10b981';
                        canvasCtx.font = 'bold 10px system-ui, sans-serif';
                        canvasCtx.fillText('OK ATTENDANCE LOGGED', bannerX + 8, bannerY + 15);
                      } else if (isSpoofSuspect) {
                        canvasCtx.fillStyle = '#f59e0b';
                        canvasCtx.font = 'bold 10px system-ui, sans-serif';
                        canvasCtx.fillText('BLINK FOR LIVENESS', bannerX + 8, bannerY + 15);
                      } else {
                        const pct = Math.round(consensus.progress * 100);
                        canvasCtx.fillStyle = hudColor;
                        canvasCtx.font = 'bold 9px system-ui, sans-serif';
                        canvasCtx.fillText(`IDENTIFYING: ${pct}%`, bannerX + 8, bannerY + 11);

                        const trackX = bannerX + 8;
                        const trackY = bannerY + 14;
                        const trackWidth = bannerWidth - 16;
                        canvasCtx.fillStyle = 'rgba(255, 255, 255, 0.15)';
                        canvasCtx.fillRect(trackX, trackY, trackWidth, 3);
                        canvasCtx.fillStyle = hudColor;
                        canvasCtx.fillRect(trackX, trackY, trackWidth * consensus.progress, 3);
                      }
                      canvasCtx.restore();
                    }
                  }

                  if (isReadyToLog) {
                    const lastScanned = cooldownMapRef.current.get(match.memberId) || 0;
                    const elapsedMs = currentTime - lastScanned;
                    const COOLDOWN_MS = 2500;

                    if (elapsedMs > COOLDOWN_MS) {
                      cooldownMapRef.current.set(match.memberId, currentTime);

                      const eventPayload: AttendanceEvent = {
                        gymId: gymId || '',
                        branchId: user?.branchId || undefined,
                        memberId: match.memberId,
                        memberName: match.name,
                        type: 'in',
                        timestamp: new Date().toISOString(),
                        confidence: match.confidence,
                        method: 'face_recognition',
                      };

                      if (bannerTimeoutRef.current) {
                        clearTimeout(bannerTimeoutRef.current);
                      }

                      recordAttendanceEvent(eventPayload).then(({ success, event: resEvent }) => {
                        if (success) {
                          playChime(true, 'success');

                          const anyRes = resEvent as any;
                          const action: 'check_in' | 'check_out' = anyRes.action === 'check_out' ? 'check_out' : 'check_in';
                          const timeStr = anyRes.time || new Date().toLocaleTimeString('en-IN');

                          setRecognitionBanner({
                            state: 'success',
                            memberName: match.name,
                            memberCode: match.memberCode,
                            memberPhoto: match.photoUrl,
                            action,
                            time: timeStr,
                            method: 'face_recognition',
                          });

                          if (action === 'check_in') {
                            setTodayCount(c => c + 1);
                          }

                          if (onAttendanceLogged) {
                            onAttendanceLogged({
                              memberId: match.memberId,
                              memberName: match.name,
                              memberCode: match.memberCode,
                              memberPhoto: match.photoUrl,
                              action,
                              method: 'face_recognition',
                              time: timeStr,
                            });
                          }
                        }
                      });

                      bannerTimeoutRef.current = setTimeout(() => {
                        setRecognitionBanner({ state: 'idle' });
                      }, 3000);
                    }
                  }
                } else {
                  consensusTrackerRef.current.reportUnrecognized(currentTime);

                  if (canvasCtx) {
                    const len = Math.min(22, w * 0.22);
                    canvasCtx.save();
                    canvasCtx.strokeStyle = 'rgba(239, 68, 68, 0.75)';
                    canvasCtx.lineWidth = 1.8;
                    canvasCtx.lineCap = 'round';
                    canvasCtx.setLineDash([4, 4]);

                    canvasCtx.beginPath();
                    canvasCtx.moveTo(x, y + len); canvasCtx.lineTo(x, y); canvasCtx.lineTo(x + len, y);
                    canvasCtx.moveTo(x + w - len, y); canvasCtx.lineTo(x + w, y); canvasCtx.lineTo(x + w, y + len);
                    canvasCtx.moveTo(x + w, y + h - len); canvasCtx.lineTo(x + w, y + h); canvasCtx.lineTo(x + w - len, y + h);
                    canvasCtx.moveTo(x + len, y + h); canvasCtx.lineTo(x, y + h); canvasCtx.lineTo(x, y + h - len);
                    canvasCtx.stroke();
                    canvasCtx.restore();

                    if (w >= 70) {
                      canvasCtx.save();
                      const plateWidth = 175;
                      const plateHeight = 24;
                      const plateX = Math.max(4, Math.min(canvasWidth - plateWidth - 4, x + (w - plateWidth) / 2));
                      const plateY = Math.max(6, y - plateHeight - 8);

                      canvasCtx.fillStyle = 'rgba(15, 15, 20, 0.92)';
                      canvasCtx.strokeStyle = 'rgba(239, 68, 68, 0.6)';
                      canvasCtx.lineWidth = 1;
                      canvasCtx.beginPath();
                      drawRoundRect(canvasCtx, plateX, plateY, plateWidth, plateHeight, 5);
                      canvasCtx.fill();
                      canvasCtx.stroke();

                      canvasCtx.fillStyle = '#ef4444';
                      canvasCtx.font = 'bold 10px system-ui, sans-serif';
                      canvasCtx.fillText('! VISITOR: NOT ENROLLED', plateX + 10, plateY + 16);
                      canvasCtx.restore();
                    }
                  }
                }
              }
            }
          }
        } catch {
          // Ignore transient frame errors
        } finally {
          isDetectingRef.current = false;
        }
      }

      animationFrameId = requestAnimationFrame(detectLoop);
    };

    animationFrameId = requestAnimationFrame(detectLoop);

    return () => {
      cancelAnimationFrame(animationFrameId);
      if (bannerTimeoutRef.current) clearTimeout(bannerTimeoutRef.current);
    };
  }, [roster, gymId, playChime, user?.branchId, onAttendanceLogged]);

  // Fingerprint Scanner Scan Handler
  const handleFingerprintScan = async (finger: FingerType = 'left_thumb') => {
    if (isHandlingFpScanRef.current) return;
    isHandlingFpScanRef.current = true;
    setIsFpScanning(true);

    if (bannerTimeoutRef.current) clearTimeout(bannerTimeoutRef.current);

    try {
      const capture = await scannerManager.capture(finger);
      if (!capture.success || !capture.template) {
        throw new Error(capture.error || 'Optical sensor could not read print');
      }

      const match = identifyMemberFromRoster(capture.template, fpRoster);

      if (!match.matched || !match.member) {
        setRecognitionBanner({
          state: 'error',
          message: 'Fingerprint not recognized. Please enroll or try again.',
          method: 'fingerprint',
        });
        playChime(false, 'error');
        return;
      }

      const matchedMember = match.member;
      const score = match.matchResult?.score || 88;

      const checkinRes = await fetchWithAuth('/api/attendance/fingerprint-checkin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          gymId,
          branchId: user?.branchId || undefined,
          memberId: matchedMember.id,
          score,
          driverId: capture.driverId,
        }),
      });

      const checkinData = await checkinRes.json();

      if (!checkinRes.ok) {
        setRecognitionBanner({
          state: 'error',
          memberName: checkinData.member_name || matchedMember.name,
          memberCode: checkinData.member_code || matchedMember.member_code,
          memberPhoto: checkinData.member_photo || matchedMember.photo_url,
          message: checkinData.error || 'Check-in failed',
          method: 'fingerprint',
        });
        playChime(false, 'error');
      } else if (checkinData.action === 'check_out') {
        const timeStr = checkinData.time || new Date().toLocaleTimeString('en-IN');
        setRecognitionBanner({
          state: 'success',
          memberName: checkinData.member_name,
          memberCode: checkinData.member_code,
          memberPhoto: checkinData.member_photo,
          action: 'check_out',
          time: timeStr,
          method: 'fingerprint',
          message: checkinData.message,
        });
        playChime(true, 'success');

        if (onAttendanceLogged) {
          onAttendanceLogged({
            memberId: matchedMember.id,
            memberName: checkinData.member_name,
            memberCode: checkinData.member_code,
            memberPhoto: checkinData.member_photo,
            action: 'check_out',
            method: 'fingerprint',
            time: timeStr,
          });
        }
      } else if (checkinData.action === 'already_completed' || checkinData.already_marked) {
        const timeStr = new Date().toLocaleTimeString('en-IN');
        setRecognitionBanner({
          state: 'already',
          memberName: checkinData.member_name,
          memberCode: checkinData.member_code,
          memberPhoto: checkinData.member_photo,
          action: 'check_in_duplicate',
          time: timeStr,
          method: 'fingerprint',
          message: checkinData.message || 'Already checked in today',
        });
        playChime(true, 'already');
      } else {
        const timeStr = checkinData.checked_in_at || new Date().toLocaleTimeString('en-IN');
        setRecognitionBanner({
          state: 'success',
          memberName: checkinData.member_name,
          memberCode: checkinData.member_code,
          memberPhoto: checkinData.member_photo,
          action: 'check_in',
          time: timeStr,
          method: 'fingerprint',
        });
        playChime(true, 'success');
        setTodayCount(c => c + 1);

        if (onAttendanceLogged) {
          onAttendanceLogged({
            memberId: matchedMember.id,
            memberName: checkinData.member_name,
            memberCode: checkinData.member_code,
            memberPhoto: checkinData.member_photo,
            action: 'check_in',
            method: 'fingerprint',
            time: timeStr,
          });
        }
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Sensor read failed';
      setRecognitionBanner({
        state: 'error',
        message: msg,
        method: 'fingerprint',
      });
      playChime(false, 'error');
    } finally {
      setIsFpScanning(false);
      isHandlingFpScanRef.current = false;
      bannerTimeoutRef.current = setTimeout(() => {
        setRecognitionBanner({ state: 'idle' });
      }, 3500);
    }
  };

  const isKiosk = variant === 'kiosk';

  return (
    <div className={cn('relative flex flex-col', className)}>
      {/* Viewport and Biometric Surface */}
      <div
        className={cn(
          'relative w-full rounded-2xl overflow-hidden border border-zinc-800 bg-zinc-950 shadow-2xl select-none group',
          isKiosk ? 'aspect-video max-h-[70vh]' : 'aspect-video sm:aspect-[16/10] max-h-[420px]'
        )}
      >
        {/* Live Camera Feed */}
        <video
          ref={videoRef}
          playsInline
          muted
          className={cn(
            'w-full h-full object-cover transition-all duration-300',
            isMirrored && 'scale-x-[-1]',
            isFlippingCamera && 'opacity-50 scale-95 blur-[2px]'
          )}
        />

        {/* Canvas for Face Bounding Boxes & HUD */}
        <canvas
          ref={canvasRef}
          className="absolute inset-0 w-full h-full object-cover pointer-events-none"
        />

        {/* Vigilance Corner Reticles */}
        <div className="absolute inset-3 pointer-events-none border border-zinc-800/30 rounded-xl">
          <div className="absolute top-0 left-0 w-3 h-3 border-t-2 border-l-2 border-zinc-500/50 rounded-tl" />
          <div className="absolute top-0 right-0 w-3 h-3 border-t-2 border-r-2 border-zinc-500/50 rounded-tr" />
          <div className="absolute bottom-0 left-0 w-3 h-3 border-b-2 border-l-2 border-zinc-500/50 rounded-bl" />
          <div className="absolute bottom-0 right-0 w-3 h-3 border-b-2 border-r-2 border-zinc-500/50 rounded-br" />
        </div>

        {/* Top-Left: Live Feed Indicator */}
        <div className="absolute top-3 left-3 flex items-center gap-2 px-2.5 py-1 rounded-lg bg-black/75 backdrop-blur-md border border-zinc-800 pointer-events-none shadow-md z-20">
          <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
          <span className="font-mono text-[10px] text-zinc-200 tracking-wider font-semibold">
            {isCameraActive ? 'AI FACE LIVE' : 'INITIALIZING'}
          </span>
        </div>

        {/* Top-Right: ResNet-34 Architecture Badge */}
        <div className="absolute top-3 right-3 hidden sm:flex items-center gap-1.5 px-2 py-1 rounded-lg bg-black/75 backdrop-blur-md border border-zinc-800 pointer-events-none shadow-md z-20">
          <span className="h-1.5 w-1.5 rounded-full bg-cyan-400" />
          <span className="font-mono text-[10px] text-cyan-300 tracking-wider font-semibold">
            RESNET-34 BIOMETRICS
          </span>
        </div>

        {/* Floating Minimal Micro-Controls (Bottom Right) */}
        <div className="absolute bottom-3 right-3 flex items-center gap-1.5 z-30 opacity-90 sm:opacity-75 group-hover:opacity-100 transition-opacity">
          <button
            type="button"
            onClick={handleFlipCamera}
            disabled={isFlippingCamera}
            className="h-8 w-8 rounded-lg bg-black/80 hover:bg-zinc-900 border border-zinc-800 hover:border-cyan-500/60 text-zinc-300 hover:text-cyan-300 backdrop-blur-md shadow-md flex items-center justify-center cursor-pointer transition-all active:scale-95 disabled:opacity-50"
            title="Switch Camera (Front / Rear)"
            aria-label="Switch Camera"
          >
            <SwitchCamera className={cn('h-3.5 w-3.5', isFlippingCamera && 'animate-spin')} />
          </button>

          <button
            type="button"
            onClick={handleToggleMirror}
            className="h-8 w-8 rounded-lg bg-black/80 hover:bg-zinc-900 border border-zinc-800 hover:border-cyan-500/60 text-zinc-300 hover:text-cyan-300 backdrop-blur-md shadow-md flex items-center justify-center cursor-pointer transition-all active:scale-95"
            title={isMirrored ? 'Disable Mirror' : 'Enable Mirror'}
            aria-label="Toggle Mirror"
          >
            <FlipHorizontal className={cn('h-3.5 w-3.5', isMirrored && 'text-cyan-400')} />
          </button>

          <button
            type="button"
            onClick={() => setSoundEnabled(!soundEnabled)}
            className="h-8 w-8 rounded-lg bg-black/80 hover:bg-zinc-900 border border-zinc-800 hover:border-cyan-500/60 text-zinc-300 hover:text-cyan-300 backdrop-blur-md shadow-md flex items-center justify-center cursor-pointer transition-all active:scale-95"
            title={soundEnabled ? 'Mute Chimes' : 'Enable Chimes'}
            aria-label="Toggle Sound"
          >
            {soundEnabled ? <Volume2 className="h-3.5 w-3.5 text-cyan-400" /> : <VolumeX className="h-3.5 w-3.5 text-zinc-500" />}
          </button>

          <button
            type="button"
            onClick={handleRefreshRoster}
            disabled={isRefreshing}
            className="h-8 w-8 rounded-lg bg-black/80 hover:bg-zinc-900 border border-zinc-800 hover:border-cyan-500/60 text-zinc-300 hover:text-cyan-300 backdrop-blur-md shadow-md flex items-center justify-center cursor-pointer transition-all active:scale-95 disabled:opacity-50"
            title="Sync Roster and Sensor"
            aria-label="Sync"
          >
            <RefreshCw className={cn('h-3.5 w-3.5', isRefreshing && 'animate-spin')} />
          </button>
        </div>

        {/* Loading Models State */}
        {isLoadingModels && (
          <div className="absolute inset-0 z-30 flex flex-col items-center justify-center bg-zinc-950/85 backdrop-blur-sm gap-2">
            <Loader2 className="h-8 w-8 animate-spin text-cyan-400" />
            <p className="text-xs font-medium text-zinc-300">Initializing Neural Engine (ResNet-34)...</p>
          </div>
        )}

        {/* Camera Error State */}
        {cameraError && (
          <div className="absolute inset-0 z-30 flex flex-col items-center justify-center bg-zinc-950/95 p-6 text-center">
            <CameraOff className="h-9 w-9 text-red-400 mb-2" />
            <p className="text-xs text-zinc-300 mb-3 max-w-sm">{cameraError}</p>
            <div className="flex items-center gap-2">
              <Button onClick={() => startCamera()} size="sm" className="gap-1.5 bg-cyan-600 hover:bg-cyan-500 text-xs h-8">
                <RefreshCw className="h-3.5 w-3.5" /> Retry Camera
              </Button>
              <Button
                onClick={handleFlipCamera}
                disabled={isFlippingCamera}
                variant="outline"
                size="sm"
                className="gap-1.5 border-zinc-700 bg-zinc-900 text-zinc-200 text-xs h-8"
              >
                <SwitchCamera className="h-3.5 w-3.5" /> Switch
              </Button>
            </div>
          </div>
        )}

        {/* Empty Roster Warning */}
        {!isLoadingModels && roster.length === 0 && (
          <div className="absolute top-12 left-3 right-3 z-20 bg-amber-950/70 border border-amber-800/60 text-amber-300 px-3 py-2 rounded-xl text-xs flex items-center gap-2">
            <AlertCircle className="h-4 w-4 shrink-0 text-amber-400" />
            <span>No members enrolled with Face ID yet. Use quick search below to enroll members.</span>
          </div>
        )}

        {/* Dynamic Island Recognition Celebration Capsule (Mounted inside Viewfinder) */}
        {recognitionBanner.state === 'success' && (
          <div className="absolute inset-x-3 bottom-3 sm:bottom-4 z-40 flex justify-center pointer-events-none">
            <div
              className={cn(
                'flex items-center gap-3 border rounded-xl px-4 py-2.5 max-w-md w-full shadow-2xl backdrop-blur-xl animate-in fade-in slide-in-from-bottom-3 duration-200 pointer-events-auto',
                recognitionBanner.action === 'check_out'
                  ? 'bg-amber-950/90 border-amber-700/80 text-amber-100'
                  : 'bg-emerald-950/90 border-emerald-700/80 text-emerald-100'
              )}
            >
              <Avatar className="h-10 w-10 border-2 border-white/20 shrink-0">
                <AvatarImage src={recognitionBanner.memberPhoto || ''} />
                <AvatarFallback className="bg-zinc-800 text-zinc-200 text-xs font-bold">
                  {getInitials(recognitionBanner.memberName || '')}
                </AvatarFallback>
              </Avatar>

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-bold text-white truncate">{recognitionBanner.memberName}</p>
                  {recognitionBanner.memberCode && (
                    <span className="text-[10px] font-mono text-zinc-300 bg-black/40 px-1.5 py-0.2 rounded border border-white/10">
                      {recognitionBanner.memberCode}
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-2 mt-0.5 text-xs">
                  <span className="font-semibold uppercase tracking-wider text-[10px]">
                    {recognitionBanner.action === 'check_out' ? 'Checked Out' : 'Checked In'}
                  </span>
                  <span>•</span>
                  <span className="font-mono text-[10px] opacity-80">{recognitionBanner.time}</span>
                  <span>•</span>
                  <span className="text-[10px] font-medium opacity-90">
                    {recognitionBanner.method === 'fingerprint' ? 'Fingerprint' : 'Face ID'}
                  </span>
                </div>
              </div>

              <CheckCircle2 className="h-6 w-6 text-emerald-300 shrink-0" />
            </div>
          </div>
        )}

        {recognitionBanner.state === 'already' && (
          <div className="absolute inset-x-3 bottom-3 sm:bottom-4 z-40 flex justify-center pointer-events-none">
            <div className="flex items-center gap-3 border rounded-xl px-4 py-2.5 max-w-md w-full shadow-2xl backdrop-blur-xl bg-blue-950/90 border-blue-700/80 text-blue-100 animate-in fade-in slide-in-from-bottom-3 duration-200 pointer-events-auto">
              <Avatar className="h-9 w-9 border border-blue-400/40 shrink-0">
                <AvatarImage src={recognitionBanner.memberPhoto || ''} />
                <AvatarFallback className="bg-zinc-800 text-zinc-200 text-xs font-bold">
                  {getInitials(recognitionBanner.memberName || '')}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold text-white truncate">{recognitionBanner.memberName}</p>
                <p className="text-xs text-blue-200">{recognitionBanner.message || 'Already checked in today'}</p>
              </div>
              <CheckCircle2 className="h-5 w-5 text-blue-300 shrink-0" />
            </div>
          </div>
        )}

        {recognitionBanner.state === 'error' && (
          <div className="absolute inset-x-3 bottom-3 sm:bottom-4 z-40 flex justify-center pointer-events-none">
            <div className="flex items-center gap-3 border rounded-xl px-4 py-2.5 max-w-md w-full shadow-2xl backdrop-blur-xl bg-red-950/90 border-red-700/80 text-red-100 animate-in fade-in slide-in-from-bottom-3 duration-200 pointer-events-auto">
              <AlertCircle className="h-6 w-6 text-red-400 shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold text-red-200">{recognitionBanner.message || 'Scan verification failed'}</p>
                <p className="text-[10px] text-zinc-400">Position face toward lens or tap sensor again</p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Optical Sensor Dock & Biometric Status Strip */}
      <div className="mt-2.5 flex items-center justify-between gap-2 px-1">
        {/* Left: Interactive Optical Touch Dock */}
        <button
          type="button"
          onClick={() => handleFingerprintScan('left_thumb')}
          disabled={isFpScanning}
          className={cn(
            'flex items-center gap-2.5 px-3 py-1.5 rounded-xl border transition-all text-left group active:scale-95 cursor-pointer',
            isFpScanning
              ? 'border-purple-500 bg-purple-950/30 shadow-[0_0_20px_rgba(168,85,247,0.3)]'
              : 'border-zinc-800/80 bg-zinc-900/60 hover:border-purple-500/50 hover:bg-zinc-900'
          )}
          title="Click to trigger optical fingerprint verification"
        >
          <div className="relative h-6 w-6 rounded-full bg-purple-950/80 border border-purple-800/60 flex items-center justify-center shrink-0">
            <Fingerprint className={cn('h-3.5 w-3.5 text-purple-400 transition-transform', isFpScanning && 'scale-110 animate-pulse')} />
            {isFpScanning && (
              <span className="absolute inset-0 rounded-full border border-purple-400 animate-ping opacity-75" />
            )}
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-semibold text-zinc-200 group-hover:text-purple-300 transition-colors">
                {isFpScanning ? 'Reading sensor...' : 'Optical Sensor'}
              </span>
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
            </div>
            <p className="text-[10px] text-zinc-500 font-mono">
              {fpRoster.length} Fingerprints Cached
            </p>
          </div>
        </button>

        {/* Right: Simultaneous Biometric Status */}
        <div className="flex items-center gap-2 text-[10px] font-mono text-zinc-400">
          <span className="hidden sm:inline-flex items-center gap-1 bg-zinc-900/60 border border-zinc-800 px-2 py-1 rounded-lg text-zinc-300">
            <ScanFace className="h-3 w-3 text-cyan-400" />
            <span>{roster.length} Face IDs</span>
          </span>
          <span className="flex items-center gap-1 bg-zinc-900/60 border border-zinc-800 px-2 py-1 rounded-lg text-zinc-300">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
            <span>{todayCount} Today</span>
          </span>
        </div>
      </div>
    </div>
  );
}
