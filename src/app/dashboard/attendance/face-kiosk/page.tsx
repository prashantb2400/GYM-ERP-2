'use client';

import React, { useEffect, useRef, useState, useCallback } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { createClient } from '@/lib/supabase/client';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  ArrowLeft,
  CameraOff,
  CheckCircle2,
  AlertCircle,
  Volume2,
  VolumeX,
  Loader2,
  ScanFace,
  RefreshCw,
  LogOut,
  LogIn,
  Fingerprint,
  QrCode,
} from 'lucide-react';
import { getInitials } from '@/lib/utils/format';
import { cn } from '@/lib/utils';
import Link from 'next/link';
import { toast } from 'sonner';
import { fetchWithAuth } from '@/lib/utils/api-client';
import { FingerprintScannerManager } from '@/lib/fingerprint/drivers';
import { identifyMemberFromRoster } from '@/lib/fingerprint/matcher';
import type { RosterMemberFingerprint, ScannerDeviceInfo, ScannerDriverId, FingerType } from '@/lib/fingerprint/types';

import {
  loadFaceApiModels,
  findBestMatch,
  syncRoster,
  recordAttendanceEvent,
  flushAttendanceQueue,
  ConsensusTracker,
  type FaceDescriptorRecord,
  type AttendanceEvent,
} from '@/lib/face-attendance';

type KioskMode = 'auto' | 'in' | 'out';

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

interface RecentEvent {
  name: string;
  time: string;
  action: string;
  photo?: string | null;
  method?: 'face_recognition' | 'fingerprint';
}

function drawRoundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  if (typeof ctx.roundRect === 'function') {
    ctx.roundRect(x, y, w, h, r);
  } else {
    ctx.rect(x, y, w, h);
  }
}

export default function FaceKioskPage() {
  const { user } = useAuth();
  const gymId = user?.gymId;
  const userBranchId = user?.branchId;

  const [mode, setMode] = useState<KioskMode>('auto');
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [isOnline, setIsOnline] = useState(true);
  const [pendingQueueCount, setPendingQueueCount] = useState(0);
  const [todayCount, setTodayCount] = useState(0);

  // Face Recognition State
  const [roster, setRoster] = useState<FaceDescriptorRecord[]>([]);
  const [isLoadingModels, setIsLoadingModels] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [isCameraActive, setIsCameraActive] = useState(false);

  // Fingerprint State
  const [fpRoster, setFpRoster] = useState<RosterMemberFingerprint[]>([]);
  const [loadingFpRoster, setLoadingFpRoster] = useState(true);
  const [fpDeviceInfo, setFpDeviceInfo] = useState<ScannerDeviceInfo | null>(null);
  const [isFpScanning, setIsFpScanning] = useState(false);
  const [selectedFpDriver, setSelectedFpDriver] = useState<ScannerDriverId>('virtual');

  // Shared Output State
  const [recognitionBanner, setRecognitionBanner] = useState<RecognitionBanner>({ state: 'idle' });
  const [recentEvents, setRecentEvents] = useState<RecentEvent[]>([]);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const faceApiRef = useRef<any>(null);

  const isDetectingRef = useRef(false);
  const cooldownMapRef = useRef<Map<string, number>>(new Map());
  const consensusTrackerRef = useRef<ConsensusTracker>(
    new ConsensusTracker({ windowMs: 1200, highConfidenceRequiredFrames: 2, mediumConfidenceRequiredFrames: 3 })
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

  // Camera start
  const startCamera = useCallback(async () => {
    try {
      setCameraError(null);
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: 1280 },
          height: { ideal: 720 },
          facingMode: 'user',
        },
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
      setIsCameraActive(true);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Camera access denied';
      setCameraError(msg);
      setIsCameraActive(false);
    }
  }, []);

  // Camera stop
  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop());
      streamRef.current = null;
    }
    setIsCameraActive(false);
  }, []);

  // Detect fingerprint scanner hardware
  const detectFpHardware = useCallback(async () => {
    try {
      const info = await scannerManager.detectActiveScanner();
      setFpDeviceInfo(info);
      setSelectedFpDriver(info.driverId);
    } catch {
      setFpDeviceInfo({
        driverId: 'virtual',
        name: 'Virtual Optical Sensor (Simulator)',
        connected: true,
      });
      setSelectedFpDriver('virtual');
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
      setIsOnline(!isOffline);
      toast.success('Rosters & biometric hardware refreshed');
    } catch (err) {
      console.error('Manual roster refresh failed:', err);
      toast.error('Failed to refresh biometric data');
    } finally {
      setIsRefreshing(false);
    }
  };

  // Initial setup: Load neural models, camera, fingerprint templates & hardware
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
            setIsOnline(!isOffline);
          }
        }
      } catch (err: unknown) {
        if (mounted) {
          const msg = err instanceof Error ? err.message : 'Failed to initialize kiosk';
          setCameraError(msg);
          setIsLoadingModels(false);
        }
      }
    })();

    // Initialize Fingerprint scanner hardware and download template cache
    detectFpHardware();
    loadFpRoster();

    // Online/Offline status listeners
    const handleOnline = () => {
      setIsOnline(true);
      if (gymId) {
        syncRoster(gymId, user?.branchId || undefined).then(({ roster: r }) => setRoster(r));
        flushAttendanceQueue().then(({ remainingCount }) => setPendingQueueCount(remainingCount));
      }
    };
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Periodic queue flush (every 20 seconds)
    const syncInterval = setInterval(() => {
      if (navigator.onLine) {
        flushAttendanceQueue().then(({ remainingCount }) => setPendingQueueCount(remainingCount));
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

  // Main real-time face detection & matching loop (25-30 FPS ResNet-34 pipeline)
  useEffect(() => {
    let animationFrameId: number;
    let lastDetectionTime = 0;
    const THROTTLE_MS = 50; // Smooth 20-25 FPS processing

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
          const options = new faceapi.TinyFaceDetectorOptions({ inputSize: 320, scoreThreshold: 0.45 });
          const detections = await faceapi
            .detectAllFaces(video, options)
            .withFaceLandmarks()
            .withFaceDescriptors();

          // Prepare visual biometric overlay canvas
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

          for (const det of detections) {
            const { box } = det.detection;
            if (box.width < 65 || box.height < 65) continue;

            const fx = box.x;
            const fy = box.y;
            const fw = box.width;
            const fh = box.height;

            // Instant 1:N Euclidean search in 128-D ResNet metric space
            const match = findBestMatch(det.descriptor, roster, 0.52, 0.40);

            // Extract true 68-landmark eye coordinates for Soukupová & Čech EAR calculation
            const positions = det.landmarks.positions;
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

              // Draw vigilance biometric square & identity plates on canvas
              if (canvasCtx) {
                const x = canvasWidth - (fx + fw); // Mirror alignment
                const y = fy;
                const w = fw;
                const h = fh;
                const cx = x + w / 2;
                const cy = y + h / 2;

                const isSpoofSuspect = consensus.liveness?.flags.includes('zero_motion_spoof_suspect');

                const hudColor = isReadyToLog
                  ? '#10b981' // Verified: Electric Emerald
                  : isSpoofSuspect
                  ? '#f59e0b' // Warning: Amber
                  : consensus.progress >= 0.5
                  ? '#06b6d4' // Candidate Locked: Cyber Cyan
                  : '#8b5cf6'; // Initial recognition: Violet

                // 1. Sleek Vigilance Corner Brackets
                const len = Math.max(18, Math.min(32, w * 0.25));
                canvasCtx.save();
                canvasCtx.strokeStyle = hudColor;
                canvasCtx.lineWidth = 2.5;
                canvasCtx.lineCap = 'round';
                canvasCtx.shadowColor = hudColor;
                canvasCtx.shadowBlur = isReadyToLog ? 14 : 6;

                canvasCtx.beginPath();
                // Top-Left Corner
                canvasCtx.moveTo(x, y + len); canvasCtx.lineTo(x, y); canvasCtx.lineTo(x + len, y);
                // Top-Right Corner
                canvasCtx.moveTo(x + w - len, y); canvasCtx.lineTo(x + w, y); canvasCtx.lineTo(x + w, y + len);
                // Bottom-Right Corner
                canvasCtx.moveTo(x + w, y + h - len); canvasCtx.lineTo(x + w, y + h); canvasCtx.lineTo(x + w - len, y + h);
                // Bottom-Left Corner
                canvasCtx.moveTo(x + len, y + h); canvasCtx.lineTo(x, y + h); canvasCtx.lineTo(x, y + h - len);
                canvasCtx.stroke();

                // Subtle Center Crosshair Tick
                canvasCtx.beginPath();
                canvasCtx.strokeStyle = `${hudColor}60`;
                canvasCtx.lineWidth = 1;
                canvasCtx.moveTo(cx - 6, cy); canvasCtx.lineTo(cx + 6, cy);
                canvasCtx.moveTo(cx, cy - 6); canvasCtx.lineTo(cx, cy + 6);
                canvasCtx.stroke();
                canvasCtx.restore();

                // 2. Identity Header Plate (JUST ABOVE the live square)
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

                // Left Status Dot
                canvasCtx.beginPath();
                canvasCtx.arc(plateX + 12, plateY + plateHeight / 2, 4, 0, Math.PI * 2);
                canvasCtx.fillStyle = hudColor;
                canvasCtx.fill();

                // Member Name
                canvasCtx.fillStyle = '#ffffff';
                canvasCtx.font = 'bold 12px system-ui, -apple-system, sans-serif';
                canvasCtx.fillText(nameLabel, plateX + 22, plateY + 17);

                // Member Code / Status Badge
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

                // 3. Status Footer Banner (JUST BELOW the live square)
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
                    canvasCtx.fillText('✓ ATTENDANCE LOGGED', bannerX + 8, bannerY + 15);
                  } else if (isSpoofSuspect) {
                    canvasCtx.fillStyle = '#f59e0b';
                    canvasCtx.font = 'bold 10px system-ui, sans-serif';
                    canvasCtx.fillText('⚡ BLINK FOR LIVENESS', bannerX + 8, bannerY + 15);
                  } else {
                    const pct = Math.round(consensus.progress * 100);
                    canvasCtx.fillStyle = hudColor;
                    canvasCtx.font = 'bold 9px system-ui, sans-serif';
                    canvasCtx.fillText(`IDENTIFYING · ${pct}%`, bannerX + 8, bannerY + 11);

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
                const COOLDOWN_MS = 2000; // 2s debounce for network safety

                if (elapsedMs > COOLDOWN_MS) {
                  cooldownMapRef.current.set(match.memberId, currentTime);

                  const eventPayload: AttendanceEvent = {
                    gymId: gymId || '',
                    branchId: user?.branchId || undefined,
                    memberId: match.memberId,
                    memberName: match.name,
                    type: mode === 'out' ? 'out' : mode === 'in' ? 'in' : 'in',
                    timestamp: new Date().toISOString(),
                    confidence: match.confidence,
                    method: 'face_recognition',
                  };

                  if (bannerTimeoutRef.current) {
                    clearTimeout(bannerTimeoutRef.current);
                  }

                  recordAttendanceEvent(eventPayload).then(({ success, isOffline, event: resEvent }) => {
                    if (success) {
                      playChime(true, 'success');

                      const anyRes = resEvent as any;
                      const action = anyRes.action || 'check_in';
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

                      setRecentEvents(prev => [
                        { name: match.name, time: timeStr, action, photo: match.photoUrl, method: 'face_recognition' },
                        ...prev.slice(0, 5),
                      ]);

                      if (isOffline) {
                        setPendingQueueCount(q => q + 1);
                      }
                    }
                  });

                  bannerTimeoutRef.current = setTimeout(() => {
                    setRecognitionBanner({ state: 'idle' });
                  }, 3000);

                  break;
                }
              }
            } else if (canvasCtx) {
              // Unrecognized face candidate
              const x = canvasWidth - (fx + fw);
              const y = fy;
              const w = fw;
              const h = fh;
              const len = Math.min(18, w * 0.22);

              canvasCtx.save();
              canvasCtx.strokeStyle = 'rgba(245, 158, 11, 0.7)';
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
                const plateWidth = 145;
                const plateHeight = 22;
                const plateX = Math.max(4, Math.min(canvasWidth - plateWidth - 4, x + (w - plateWidth) / 2));
                const plateY = Math.max(6, y - plateHeight - 6);

                canvasCtx.fillStyle = 'rgba(15, 15, 20, 0.88)';
                canvasCtx.strokeStyle = 'rgba(245, 158, 11, 0.5)';
                canvasCtx.lineWidth = 1;
                canvasCtx.beginPath();
                drawRoundRect(canvasCtx, plateX, plateY, plateWidth, plateHeight, 5);
                canvasCtx.fill();
                canvasCtx.stroke();

                canvasCtx.fillStyle = '#f59e0b';
                canvasCtx.font = 'bold 10px system-ui, sans-serif';
                canvasCtx.fillText('⚠ VISITOR · SCANNING...', plateX + 8, plateY + 15);
                canvasCtx.restore();
              }
            }
          }
        } catch {
          // Ignore transient frame detection errors
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
  }, [roster, mode, gymId, playChime, user?.branchId]);

  // Fingerprint Scanner Scan Handler
  const handleFingerprintScan = async (finger: FingerType = 'left_thumb') => {
    if (isHandlingFpScanRef.current) return;
    isHandlingFpScanRef.current = true;
    setIsFpScanning(true);

    if (bannerTimeoutRef.current) clearTimeout(bannerTimeoutRef.current);

    try {
      // 1. Capture fingerprint via active driver
      const capture = await scannerManager.capture(finger);
      if (!capture.success || !capture.template) {
        throw new Error(capture.error || 'Optical sensor could not read print');
      }

      // 2. Perform 1:N minutiae matching against cached fingerprint roster
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

      // 3. Post check-in/out to server
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
        setRecentEvents(prev => [
          { name: checkinData.member_name, time: timeStr, action: 'check_out', photo: checkinData.member_photo, method: 'fingerprint' },
          ...prev.slice(0, 5),
        ]);
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
        // Successful check-in
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
        setRecentEvents(prev => [
          { name: checkinData.member_name, time: timeStr, action: 'check_in', photo: checkinData.member_photo, method: 'fingerprint' },
          ...prev.slice(0, 5),
        ]);
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

  return (
    <div className="fixed inset-0 bg-zinc-950 z-50 flex flex-col overflow-hidden text-zinc-100 select-none">
      {/* Top Navigation / Status Header Bar */}
      <div className="flex items-center justify-between px-3 sm:px-4 py-2.5 bg-zinc-900/90 border-b border-zinc-800 backdrop-blur-md">
        <div className="flex items-center gap-3">
          <Link href="/dashboard/attendance">
            <Button variant="ghost" size="sm" className="text-zinc-400 hover:text-zinc-100 gap-1.5 h-8">
              <ArrowLeft className="h-4 w-4" />
              <span className="hidden sm:inline">Exit</span>
            </Button>
          </Link>

          <div className="flex items-center gap-2.5">
            <div className="flex -space-x-1 items-center">
              <div className="h-7 w-7 rounded-lg bg-cyan-950/80 border border-cyan-800/60 flex items-center justify-center shadow-xs">
                <ScanFace className="h-4 w-4 text-cyan-400" />
              </div>
              <div className="h-7 w-7 rounded-lg bg-purple-950/80 border border-purple-800/60 flex items-center justify-center shadow-xs">
                <Fingerprint className="h-4 w-4 text-purple-400" />
              </div>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-sm sm:text-base tracking-tight text-zinc-100">
                  AI Face Kiosk
                </span>
                <Badge className="bg-gradient-to-r from-cyan-500/20 to-purple-500/20 text-zinc-200 border-cyan-500/30 text-[10px] px-1.5 py-0 font-semibold hidden sm:inline-flex">
                  Face + Fingerprint
                </Badge>
              </div>
            </div>
          </div>
        </div>

        {/* Universal Kiosk Switcher & Mode Selector */}
        <div className="flex items-center gap-2">
          {/* Universal Kiosk Switcher */}
          <div className="flex items-center bg-zinc-950 p-1 rounded-xl border border-zinc-800 text-xs gap-1">
            <Button
              variant="ghost"
              size="sm"
              className="h-7 px-2.5 text-xs rounded-lg gap-1.5 bg-cyan-600 text-white font-semibold hover:bg-cyan-600 cursor-default"
            >
              <ScanFace className="h-3.5 w-3.5 text-white" />
              <span className="hidden sm:inline">AI Face</span>
            </Button>

            <Link href="/dashboard/attendance/kiosk">
              <Button
                variant="ghost"
                size="sm"
                className="h-7 px-2.5 text-xs rounded-lg gap-1.5 text-zinc-400 hover:text-zinc-200"
              >
                <Fingerprint className="h-3.5 w-3.5 text-purple-400" />
                <span className="hidden sm:inline">Fingerprint</span>
              </Button>
            </Link>

            <Link href="/dashboard/attendance/qr-kiosk">
              <Button
                variant="ghost"
                size="sm"
                className="h-7 px-2.5 text-xs rounded-lg gap-1.5 text-zinc-400 hover:text-zinc-200"
              >
                <QrCode className="h-3.5 w-3.5 text-blue-400" />
                <span className="hidden sm:inline">QR Code</span>
              </Button>
            </Link>
          </div>

          {/* Mode Selector (Auto / In Only / Out Only) */}
          <div className="hidden md:flex items-center bg-zinc-950 p-1 rounded-xl border border-zinc-800 text-xs">
            <button
              onClick={() => setMode('auto')}
              className={cn(
                'px-3 py-1.5 rounded-lg font-medium transition-all',
                mode === 'auto' ? 'bg-primary text-white shadow-sm' : 'text-zinc-400 hover:text-zinc-200'
              )}
            >
              Auto (In/Out)
            </button>
            <button
              onClick={() => setMode('in')}
              className={cn(
                'px-3 py-1.5 rounded-lg font-medium transition-all flex items-center gap-1',
                mode === 'in' ? 'bg-green-600 text-white shadow-sm' : 'text-zinc-400 hover:text-zinc-200'
              )}
            >
              <LogIn className="h-3 w-3" /> In Only
            </button>
            <button
              onClick={() => setMode('out')}
              className={cn(
                'px-3 py-1.5 rounded-lg font-medium transition-all flex items-center gap-1',
                mode === 'out' ? 'bg-amber-600 text-white shadow-sm' : 'text-zinc-400 hover:text-zinc-200'
              )}
            >
              <LogOut className="h-3 w-3" /> Out Only
            </button>
          </div>
        </div>

        {/* Status Indicators & Controls */}
        <div className="flex items-center gap-2 sm:gap-3">
          {/* Face ID Status */}
          <Badge
            variant="outline"
            className={cn(
              'gap-1 text-xs font-semibold hidden md:flex',
              isOnline ? 'text-cyan-400 border-cyan-500/20 bg-cyan-500/10' : 'text-amber-400 border-amber-500/20 bg-amber-500/10'
            )}
          >
            <ScanFace className="h-3 w-3" />
            <span>{roster.length} Faces</span>
          </Badge>

          {/* Fingerprint Status */}
          <Badge
            variant="outline"
            className="gap-1 text-xs font-semibold text-purple-400 border-purple-500/20 bg-purple-500/10 hidden md:flex"
          >
            <Fingerprint className="h-3 w-3" />
            <span>{fpRoster.length} Prints</span>
          </Badge>

          {/* Optical Scanner Driver Switcher */}
          <div className="hidden sm:block">
            <Select
              value={selectedFpDriver}
              onValueChange={(val) => {
                const driverId = val as ScannerDriverId;
                setSelectedFpDriver(driverId);
                scannerManager.setActiveDriver(driverId);
                detectFpHardware();
              }}
            >
              <SelectTrigger className="h-7 text-xs border-zinc-800 bg-zinc-950 text-zinc-300 w-32 md:w-36">
                <SelectValue placeholder="Driver" />
              </SelectTrigger>
              <SelectContent className="bg-zinc-900 border-zinc-800 text-zinc-200">
                <SelectItem value="mantra">Mantra MFS100</SelectItem>
                <SelectItem value="secugen">SecuGen Pro 20</SelectItem>
                <SelectItem value="bridge">Hardware Bridge</SelectItem>
                <SelectItem value="virtual">Virtual Sensor</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Refresh / Sync Button */}
          <Button
            variant="outline"
            size="sm"
            onClick={handleRefreshRoster}
            disabled={isRefreshing}
            className="h-7 px-2 text-xs border-zinc-800 bg-zinc-950 text-zinc-300 hover:text-white gap-1"
            title="Reload Face Descriptors, Fingerprint Templates & Hardware"
          >
            <RefreshCw className={cn('h-3.5 w-3.5', isRefreshing && 'animate-spin')} />
            <span className="hidden lg:inline">Sync</span>
          </Button>

          {/* Sound Toggle */}
          <button
            onClick={() => setSoundEnabled(!soundEnabled)}
            className="text-zinc-400 hover:text-zinc-200 transition-colors p-1"
            title={soundEnabled ? 'Mute Chimes' : 'Enable Chimes'}
          >
            {soundEnabled ? <Volume2 className="h-4 w-4 text-cyan-400" /> : <VolumeX className="h-4 w-4" />}
          </button>

          {/* Today's Tally */}
          <Badge className="bg-primary/10 text-primary border-primary/20 font-bold">
            {todayCount} Today
          </Badge>
        </div>
      </div>

      {/* Main Dual-Biometric Workspace */}
      <div className="flex-1 min-h-0 flex flex-col justify-between p-3 sm:p-4 overflow-y-auto custom-scrollbar">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 max-w-7xl mx-auto w-full my-auto items-stretch">
          {/* Left: Video Feed with Real-Time Vigilance Face HUD (lg:col-span-8) */}
          <div className="lg:col-span-8 flex flex-col">
            <div className="relative w-full aspect-video bg-zinc-900 rounded-3xl overflow-hidden border-2 border-zinc-800 shadow-2xl">
              {/* Live Camera Stream */}
              <video
                ref={videoRef}
                playsInline
                muted
                className="w-full h-full object-cover scale-x-[-1]"
              />

              {/* Canvas for Face Bounding Boxes & Vigilance HUD */}
              <canvas
                ref={canvasRef}
                className="absolute inset-0 w-full h-full object-cover pointer-events-none"
              />

              {/* Vigilance Surveillance Viewport HUD */}
              <div className="absolute inset-3 pointer-events-none border border-zinc-800/40 rounded-2xl">
                <div className="absolute top-0 left-0 w-4 h-4 border-t-2 border-l-2 border-zinc-500/50 rounded-tl" />
                <div className="absolute top-0 right-0 w-4 h-4 border-t-2 border-r-2 border-zinc-500/50 rounded-tr" />
                <div className="absolute bottom-0 left-0 w-4 h-4 border-b-2 border-l-2 border-zinc-500/50 rounded-bl" />
                <div className="absolute bottom-0 right-0 w-4 h-4 border-b-2 border-r-2 border-zinc-500/50 rounded-br" />
              </div>

              <div className="absolute top-3 left-3 flex items-center gap-2 px-2.5 py-1 rounded-md bg-black/65 backdrop-blur-md border border-zinc-700/60 pointer-events-none shadow-lg">
                <span className="h-2 w-2 rounded-full bg-red-500 animate-pulse" />
                <span className="font-mono text-[10px] text-zinc-200 tracking-wider font-semibold">LIVE VIGILANCE FEED</span>
              </div>

              <div className="absolute top-3 right-3 flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-black/65 backdrop-blur-md border border-zinc-700/60 pointer-events-none shadow-lg">
                <span className="h-1.5 w-1.5 rounded-full bg-cyan-400" />
                <span className="font-mono text-[10px] text-cyan-400 tracking-wider font-semibold">RESNET-34 BIOMETRICS</span>
              </div>

              {/* Loading Models State */}
              {isLoadingModels && (
                <div className="absolute inset-0 flex flex-col items-center justify-center bg-zinc-950/80 backdrop-blur-sm gap-2">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                  <p className="text-sm font-medium text-zinc-300">Initializing Neural Engine (WebGL ResNet-34)...</p>
                </div>
              )}

              {/* Camera Error State */}
              {cameraError && (
                <div className="absolute inset-0 flex flex-col items-center justify-center bg-zinc-950/90 p-6 text-center">
                  <CameraOff className="h-10 w-10 text-red-400 mb-3" />
                  <p className="text-sm text-zinc-300 mb-4">{cameraError}</p>
                  <Button onClick={startCamera} className="gap-2">
                    <RefreshCw className="h-4 w-4" /> Retry Camera
                  </Button>
                </div>
              )}

              {/* Empty Face Roster State */}
              {!isLoadingModels && roster.length === 0 && (
                <div className="absolute top-4 left-4 right-4 bg-amber-950/60 border border-amber-800/60 text-amber-300 px-4 py-2.5 rounded-xl text-xs flex items-center gap-2">
                  <AlertCircle className="h-4 w-4 shrink-0" />
                  <span>
                    No members enrolled with Face ID yet.{' '}
                    <Link href="/dashboard/attendance" className="underline hover:text-amber-100 font-medium">
                      Go to Attendance → search a member → click &quot;Enroll Face&quot;
                    </Link>
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Right: Biometric Fingerprint Sensor Touch Dock (lg:col-span-4) */}
          <div className="lg:col-span-4 flex flex-col justify-between bg-zinc-900/60 border-2 border-zinc-800/80 rounded-3xl p-5 shadow-2xl backdrop-blur-md relative overflow-hidden min-h-[300px]">
            {/* Top header of dock */}
            <div className="flex items-center justify-between border-b border-zinc-800/80 pb-3">
              <div className="flex items-center gap-2">
                <div className="h-7 w-7 rounded-lg bg-purple-950/80 border border-purple-800/60 flex items-center justify-center">
                  <Fingerprint className="h-4 w-4 text-purple-400" />
                </div>
                <div>
                  <h2 className="text-xs font-bold uppercase tracking-wider text-zinc-200">Optical Sensor</h2>
                  <p className="text-[10px] text-zinc-500 font-mono">Simultaneous Touch Dock</p>
                </div>
              </div>
              <span className="flex items-center gap-1.5 text-[10px] font-mono text-emerald-400 bg-emerald-950/40 px-2 py-0.5 rounded-full border border-emerald-800/40">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
                {fpDeviceInfo?.connected ? 'Hardware Connected' : 'Sensor Ready'}
              </span>
            </div>

            {/* Interactive Circular Scanner Prism */}
            <div className="my-auto py-3 flex flex-col items-center justify-center">
              <div
                onClick={() => handleFingerprintScan('left_thumb')}
                className={cn(
                  'relative h-44 w-44 sm:h-48 sm:w-48 rounded-full border-4 flex flex-col items-center justify-center cursor-pointer transition-all duration-300 group select-none shadow-2xl',
                  isFpScanning
                    ? 'border-purple-500 bg-purple-950/30 shadow-[0_0_50px_rgba(168,85,247,0.5)] scale-105'
                    : recognitionBanner.state === 'success' && recognitionBanner.method === 'fingerprint'
                    ? 'border-green-500 bg-green-950/20 shadow-[0_0_40px_rgba(34,197,94,0.4)]'
                    : recognitionBanner.state === 'error' && recognitionBanner.method === 'fingerprint'
                    ? 'border-red-500 bg-red-950/20 shadow-[0_0_40px_rgba(239,68,68,0.3)]'
                    : 'border-zinc-800 bg-zinc-950/80 hover:border-purple-500/70 hover:shadow-[0_0_35px_rgba(168,85,247,0.25)]'
                )}
                title="Place finger on optical scanner or click to trigger scan"
              >
                {/* Concentric rotating rings */}
                <div className="absolute inset-2 rounded-full border border-dashed border-zinc-800 group-hover:border-purple-500/40 animate-[spin_40s_linear_infinite]" />
                <div className="absolute inset-6 rounded-full border border-zinc-800/70" />

                {/* Glowing biometric fingerprint icon */}
                <Fingerprint
                  className={cn(
                    'h-20 w-20 transition-all duration-300',
                    isFpScanning
                      ? 'text-purple-400 scale-110 animate-pulse'
                      : recognitionBanner.state === 'success' && recognitionBanner.method === 'fingerprint'
                      ? 'text-green-400'
                      : recognitionBanner.state === 'error' && recognitionBanner.method === 'fingerprint'
                      ? 'text-red-400'
                      : 'text-zinc-500 group-hover:text-purple-400 group-hover:scale-105'
                  )}
                />

                {/* Laser scanning beam */}
                {isFpScanning && (
                  <div className="absolute inset-x-6 h-1 bg-gradient-to-r from-transparent via-purple-300 to-transparent shadow-[0_0_15px_#c084fc] animate-bounce" />
                )}

                {/* Interactive hint on prism */}
                <div className="absolute bottom-4 text-[10px] font-bold tracking-wider uppercase text-zinc-400 group-hover:text-purple-300 transition-colors">
                  {isFpScanning ? 'Verifying...' : 'Touch Sensor'}
                </div>
              </div>

              <p className="text-[11px] text-zinc-400 text-center mt-3 font-medium">
                Place finger on scanner anytime
              </p>
            </div>

            {/* Bottom info of dock */}
            <div className="border-t border-zinc-800/80 pt-3 flex flex-col gap-1.5 text-xs text-zinc-400">
              <div className="flex items-center justify-between text-[11px]">
                <span className="text-zinc-500">Active Driver:</span>
                <span className="font-mono text-zinc-300 truncate max-w-[170px]">
                  {fpDeviceInfo?.name || 'Mantra / SecuGen / Virtual'}
                </span>
              </div>
              <div className="flex items-center justify-between text-[11px]">
                <span className="text-zinc-500">Minutiae Templates:</span>
                <span className="font-mono text-purple-400 font-semibold">
                  {loadingFpRoster ? 'Loading...' : `${fpRoster.length} Members`}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Unified Recognition Result Banner */}
        <div className="mt-3 w-full max-w-2xl mx-auto min-h-[85px] flex items-center justify-center">
          {recognitionBanner.state === 'idle' && (
            <div className="text-center text-zinc-500 py-1">
              <div className="flex items-center justify-center gap-3 sm:gap-4 text-xs sm:text-sm font-medium">
                <span className="flex items-center gap-1.5 text-cyan-400/90">
                  <ScanFace className="h-4 w-4" /> Look at camera
                </span>
                <span className="text-zinc-600 font-bold">OR</span>
                <span className="flex items-center gap-1.5 text-purple-400/90">
                  <Fingerprint className="h-4 w-4" /> Touch optical scanner
                </span>
              </div>
              <p className="text-[11px] text-emerald-400/90 flex items-center justify-center gap-1.5 mt-1 font-mono">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
                Both biometrics running simultaneously • Zero cooldown
              </p>
            </div>
          )}

          {recognitionBanner.state === 'success' && (
            <div
              className={cn(
                'flex items-center gap-4 border rounded-2xl p-4 sm:p-5 w-full shadow-2xl animate-in fade-in slide-in-from-bottom-2 duration-300',
                recognitionBanner.action === 'check_out'
                  ? 'bg-amber-950/40 border-amber-800/60'
                  : 'bg-green-950/40 border-green-800/60'
              )}
            >
              <Avatar className="h-12 w-12 sm:h-14 sm:w-14 border-2 border-primary/50">
                <AvatarImage src={recognitionBanner.memberPhoto || ''} />
                <AvatarFallback className="bg-zinc-800 text-zinc-200 text-lg font-bold">
                  {getInitials(recognitionBanner.memberName || '')}
                </AvatarFallback>
              </Avatar>

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="text-base sm:text-lg font-bold text-zinc-100 truncate">{recognitionBanner.memberName}</p>
                  <span className="text-xs font-mono text-zinc-400 bg-zinc-900 px-2 py-0.5 rounded border border-zinc-800">
                    {recognitionBanner.memberCode}
                  </span>
                </div>

                <div className="flex items-center gap-2 mt-1 flex-wrap">
                  <Badge
                    className={cn(
                      'text-xs font-bold uppercase tracking-wider',
                      recognitionBanner.action === 'check_out'
                        ? 'bg-amber-500/20 text-amber-300 border-amber-500/30'
                        : 'bg-green-500/20 text-green-300 border-green-500/30'
                    )}
                  >
                    {recognitionBanner.action === 'check_out' ? 'Checked Out' : 'Checked In'}
                  </Badge>

                  {/* Modality Badge */}
                  <Badge
                    variant="outline"
                    className={cn(
                      'text-[11px] font-semibold gap-1',
                      recognitionBanner.method === 'fingerprint'
                        ? 'text-purple-400 border-purple-500/30 bg-purple-500/10'
                        : 'text-cyan-400 border-cyan-500/30 bg-cyan-500/10'
                    )}
                  >
                    {recognitionBanner.method === 'fingerprint' ? (
                      <>
                        <Fingerprint className="h-3 w-3" /> Fingerprint
                      </>
                    ) : (
                      <>
                        <ScanFace className="h-3 w-3" /> Face ID
                      </>
                    )}
                  </Badge>

                  <span className="text-xs text-zinc-400">{recognitionBanner.time}</span>
                </div>
                {recognitionBanner.message && (
                  <p className="text-xs text-zinc-300 mt-1">{recognitionBanner.message}</p>
                )}
              </div>

              <CheckCircle2
                className={cn(
                  'h-8 w-8 sm:h-10 sm:w-10 shrink-0',
                  recognitionBanner.action === 'check_out' ? 'text-amber-400' : 'text-green-400'
                )}
              />
            </div>
          )}

          {recognitionBanner.state === 'already' && (
            <div className="flex items-center gap-3 border rounded-2xl p-4 w-full shadow-2xl bg-blue-950/40 border-blue-800/60 animate-in fade-in slide-in-from-bottom-2 duration-300">
              <Avatar className="h-11 w-11 border-2 border-blue-500/50">
                <AvatarImage src={recognitionBanner.memberPhoto || ''} />
                <AvatarFallback className="bg-zinc-800 text-zinc-200 font-bold">
                  {getInitials(recognitionBanner.memberName || '')}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <p className="font-bold text-zinc-100">{recognitionBanner.memberName}</p>
                <p className="text-xs text-blue-300">{recognitionBanner.message || 'Already checked in today'}</p>
              </div>
              <Badge variant="outline" className="text-purple-400 border-purple-500/30 bg-purple-500/10 gap-1 text-xs">
                <Fingerprint className="h-3 w-3" /> Fingerprint
              </Badge>
            </div>
          )}

          {recognitionBanner.state === 'error' && (
            <div className="flex items-center gap-3 border rounded-2xl p-4 w-full shadow-2xl bg-red-950/40 border-red-800/60 animate-in fade-in slide-in-from-bottom-2 duration-300">
              <AlertCircle className="h-8 w-8 text-red-400 shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-red-200 text-sm">{recognitionBanner.message || 'Verification failed'}</p>
                <p className="text-xs text-zinc-400">Please try scanning again or register fingerprint template.</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Bottom Strip: Recent Check-ins */}
      {recentEvents.length > 0 && (
        <div className="px-6 py-2.5 bg-zinc-900/70 border-t border-zinc-800 backdrop-blur-sm">
          <p className="text-[10px] uppercase tracking-widest text-zinc-500 font-bold mb-1.5">Recent Scans</p>
          <div className="flex gap-3 overflow-x-auto pb-1 custom-scrollbar">
            {recentEvents.map((evt, idx) => (
              <div
                key={idx}
                className="flex items-center gap-2.5 bg-zinc-950 border border-zinc-800/80 rounded-xl px-3 py-1.5 shrink-0"
              >
                <Avatar className="h-6 w-6 border border-zinc-800">
                  <AvatarImage src={evt.photo || ''} />
                  <AvatarFallback className="text-[9px] bg-zinc-800 text-zinc-300">
                    {getInitials(evt.name)}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <p className="text-xs font-semibold text-zinc-200">{evt.name}</p>
                  <div className="flex items-center gap-1.5 text-[10px]">
                    <span className={evt.action === 'check_out' ? 'text-amber-400' : 'text-green-400'}>
                      {evt.action === 'check_out' ? 'Out' : 'In'}
                    </span>
                    <span className="text-zinc-600">•</span>
                    {evt.method === 'fingerprint' ? (
                      <span className="text-purple-400 flex items-center gap-0.5">
                        <Fingerprint className="h-2.5 w-2.5" /> Finger
                      </span>
                    ) : (
                      <span className="text-cyan-400 flex items-center gap-0.5">
                        <ScanFace className="h-2.5 w-2.5" /> Face
                      </span>
                    )}
                    <span className="text-zinc-600">•</span>
                    <span className="text-zinc-400">{evt.time}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
