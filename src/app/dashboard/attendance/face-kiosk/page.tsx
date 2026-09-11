'use client';

import React, { useEffect, useRef, useState, useCallback } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { createClient } from '@/lib/supabase/client';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  ArrowLeft,
  Camera,
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
  Wifi,
  WifiOff,
} from 'lucide-react';
import { getInitials } from '@/lib/utils/format';
import { cn } from '@/lib/utils';
import Link from 'next/link';

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
}

export default function FaceKioskPage() {
  const { user } = useAuth();
  const gymId = user?.gymId;

  const [mode, setMode] = useState<KioskMode>('auto');
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [isOnline, setIsOnline] = useState(true);
  const [pendingQueueCount, setPendingQueueCount] = useState(0);
  const [todayCount, setTodayCount] = useState(0);

  const [roster, setRoster] = useState<FaceDescriptorRecord[]>([]);
  const [isLoadingModels, setIsLoadingModels] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [isCameraActive, setIsCameraActive] = useState(false);

  const [recognitionBanner, setRecognitionBanner] = useState<RecognitionBanner>({ state: 'idle' });
  const [recentEvents, setRecentEvents] = useState<Array<{ name: string; time: string; action: string; photo?: string | null }>>([]);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const faceApiRef = useRef<any>(null);

  const handleRefreshRoster = async () => {
    if (!gymId) return;
    setIsRefreshing(true);
    try {
      const { roster: loadedRoster, isOffline } = await syncRoster(gymId, user?.branchId || undefined);
      setRoster(loadedRoster);
      setIsOnline(!isOffline);
    } catch (err) {
      console.error('Manual roster refresh failed:', err);
    } finally {
      setIsRefreshing(false);
    }
  };

  const isDetectingRef = useRef(false);
  const cooldownMapRef = useRef<Map<string, number>>(new Map());
  const consensusTrackerRef = useRef<ConsensusTracker>(
    new ConsensusTracker({ windowMs: 650, highConfidenceRequiredFrames: 2, mediumConfidenceRequiredFrames: 3 })
  );
  const bannerTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

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

  // Play audio chime using Web Audio API
  const playChime = useCallback((success: boolean) => {
    if (!soundEnabled) return;
    try {
      const ctx = new AudioContext();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.frequency.value = success ? 880 : 380;
      osc.type = 'sine';
      gain.gain.value = 0.25;
      osc.start();
      osc.stop(ctx.currentTime + (success ? 0.2 : 0.4));
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

  // Initial setup: Load neural models and download/sync roster
  useEffect(() => {
    let mounted = true;

    (async () => {
      try {
        setIsLoadingModels(true);
        const api = await loadFaceApiModels();
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
  }, [gymId, startCamera, stopCamera]);

  // Main real-time face detection & matching loop (throttled at ~8-10 FPS)
  useEffect(() => {
    let animationFrameId: number;
    let lastDetectionTime = 0;
    const THROTTLE_MS = 120; // ~8.3 FPS

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
          const options = new faceapi.TinyFaceDetectorOptions({ inputSize: 416, scoreThreshold: 0.65 });
          const allDetections = await faceapi
            .detectAllFaces(video, options)
            .withFaceLandmarks()
            .withFaceDescriptors();

          // Pre-descriptor Quality Gate: Filter out tiny distant background faces
          const detections = allDetections.filter(d => {
            const box = d.detection.box;
            return box.width >= 85 && box.height >= 85 && d.detection.score >= 0.65;
          });

          // Draw visual biometric bounding HUD on overlay canvas
          let canvasCtx: CanvasRenderingContext2D | null = null;
          if (canvasRef.current) {
            const canvas = canvasRef.current;
            canvas.width = video.videoWidth;
            canvas.height = video.videoHeight;
            canvasCtx = canvas.getContext('2d');
            if (canvasCtx) {
              canvasCtx.clearRect(0, 0, canvas.width, canvas.height);
            }
          }

          // Process each detected face against the roster
          const currentTime = Date.now();
          for (const det of detections) {
            const box = det.detection.box;
            // Strict accuracy threshold: 0.48, Instant Tier 1: 0.38
            const match = findBestMatch(det.descriptor, roster, 0.48, 0.38);

            if (match) {
              const leftEye = det.landmarks ? det.landmarks.getLeftEye() : undefined;
              const rightEye = det.landmarks ? det.landmarks.getRightEye() : undefined;
              const centroid = { x: box.x + box.width / 2, y: box.y + box.height / 2 };

              const consensus = consensusTrackerRef.current.evaluate(match, currentTime, {
                leftEye,
                rightEye,
                centroid,
              });
              const isReadyToLog = consensus.isConfirmed;

              // Draw interactive biometric lock reticle on canvas
              if (canvasCtx) {
                const isSpoofSuspect = consensus.liveness?.flags.includes('zero_motion_spoof_suspect');
                const hudColor = isReadyToLog
                  ? '#10b981'
                  : isSpoofSuspect
                  ? '#f59e0b'
                  : consensus.progress >= 0.5
                  ? '#06b6d4'
                  : '#8b5cf6';

                const label = isReadyToLog
                  ? `${match.name} · Verified ✓`
                  : isSpoofSuspect
                  ? `${match.name} (Checking Liveness...)`
                  : `${match.name} (${Math.round(consensus.progress * 100)}%)`;

                const x = box.x;
                const y = box.y;
                const w = box.width;
                const h = box.height;
                const len = Math.min(22, w * 0.25);

                canvasCtx.strokeStyle = hudColor;
                canvasCtx.lineWidth = 2.5;
                canvasCtx.lineCap = 'round';

                // Corner brackets
                canvasCtx.beginPath();
                canvasCtx.moveTo(x, y + len); canvasCtx.lineTo(x, y); canvasCtx.lineTo(x + len, y);
                canvasCtx.moveTo(x + w - len, y); canvasCtx.lineTo(x + w, y); canvasCtx.lineTo(x + w, y + len);
                canvasCtx.moveTo(x + w, y + h - len); canvasCtx.lineTo(x + w, y + h); canvasCtx.lineTo(x + w - len, y + h);
                canvasCtx.moveTo(x + len, y + h); canvasCtx.lineTo(x, y + h); canvasCtx.lineTo(x, y + h - len);
                canvasCtx.stroke();

                // Name Pill
                canvasCtx.fillStyle = 'rgba(9, 9, 11, 0.85)';
                canvasCtx.beginPath();
                const textWidth = Math.max(120, canvasCtx.measureText(label).width + 24);
                canvasCtx.roundRect(x, Math.max(8, y - 26), textWidth, 20, 5);
                canvasCtx.fill();
                canvasCtx.strokeStyle = hudColor;
                canvasCtx.lineWidth = 1;
                canvasCtx.stroke();

                canvasCtx.fillStyle = hudColor;
                canvasCtx.font = 'bold 11px system-ui, sans-serif';
                canvasCtx.fillText(label, x + 8, Math.max(22, y - 12));

                // Temporal lock progress bar
                if (consensus.progress > 0 && !isReadyToLog) {
                  const barY = y + h + 6;
                  canvasCtx.fillStyle = 'rgba(24, 24, 27, 0.8)';
                  canvasCtx.fillRect(x, barY, w, 4);
                  canvasCtx.fillStyle = hudColor;
                  canvasCtx.fillRect(x, barY, w * consensus.progress, 4);
                }
              }

              if (isReadyToLog) {
                const lastScanned = cooldownMapRef.current.get(match.memberId) || 0;
                const elapsedMs = currentTime - lastScanned;
                const COOLDOWN_MS = 30000; // 30 seconds

                if (elapsedMs > COOLDOWN_MS) {
                  // Member recognized through multi-frame consensus and ready to log!
                  cooldownMapRef.current.set(match.memberId, currentTime);

                  // Determine attendance event payload
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

                  // Clear previous banner timeout
                  if (bannerTimeoutRef.current) {
                    clearTimeout(bannerTimeoutRef.current);
                  }

                  // Record event
                  recordAttendanceEvent(eventPayload).then(({ success, isOffline, event: resEvent }) => {
                    if (success) {
                      playChime(true);

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
                      });

                      if (action === 'check_in') {
                        setTodayCount(c => c + 1);
                      }

                      setRecentEvents(prev => [
                        { name: match.name, time: timeStr, action, photo: match.photoUrl },
                        ...prev.slice(0, 4),
                      ]);

                      if (isOffline) {
                        setPendingQueueCount(q => q + 1);
                      }
                    }
                  });

                  // Auto-clear banner after 3.5 seconds
                  bannerTimeoutRef.current = setTimeout(() => {
                    setRecognitionBanner({ state: 'idle' });
                  }, 3500);

                  break; // Process one member per loop cycle to maintain clean UI
                }
              }
            } else if (canvasCtx) {
              // Unrecognized face candidate (distant stranger or non-member)
              const x = box.x;
              const y = box.y;
              const w = box.width;
              const h = box.height;
              const len = Math.min(16, w * 0.2);

              canvasCtx.strokeStyle = 'rgba(161, 161, 170, 0.4)';
              canvasCtx.lineWidth = 1.5;
              canvasCtx.beginPath();
              canvasCtx.moveTo(x, y + len); canvasCtx.lineTo(x, y); canvasCtx.lineTo(x + len, y);
              canvasCtx.moveTo(x + w - len, y); canvasCtx.lineTo(x + w, y); canvasCtx.lineTo(x + w, y + len);
              canvasCtx.moveTo(x + w, y + h - len); canvasCtx.lineTo(x + w, y + h); canvasCtx.lineTo(x + w - len, y + h);
              canvasCtx.moveTo(x + len, y + h); canvasCtx.lineTo(x, y + h); canvasCtx.lineTo(x, y + h - len);
              canvasCtx.stroke();
            }
          }
        } catch {
          // Ignore transient detection errors
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
  }, [roster, mode, gymId, playChime]);

  return (
    <div className="fixed inset-0 bg-zinc-950 z-50 flex flex-col overflow-hidden text-zinc-100">
      {/* Top Header Bar */}
      <div className="flex items-center justify-between px-4 py-3 bg-zinc-900/80 border-b border-zinc-800 backdrop-blur-sm">
        <div className="flex items-center gap-3">
          <Link href="/dashboard/attendance">
            <Button variant="ghost" size="sm" className="text-zinc-400 hover:text-zinc-100 gap-1.5">
              <ArrowLeft className="h-4 w-4" />
              <span className="hidden sm:inline">Exit</span>
            </Button>
          </Link>

          <div className="flex items-center gap-2">
            <ScanFace className="h-5 w-5 text-primary" />
            <span className="font-bold text-sm sm:text-base tracking-tight">AI Face Kiosk</span>
          </div>
        </div>

        {/* Mode Selector (Auto / Check-In / Check-Out) */}
        <div className="flex items-center bg-zinc-950 p-1 rounded-xl border border-zinc-800 text-xs">
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

        {/* Status Indicators */}
        <div className="flex items-center gap-3">
          {/* Online / Offline Status */}
          <Badge
            variant="outline"
            className={cn(
              'gap-1 text-xs font-semibold',
              isOnline ? 'text-green-400 border-green-500/20 bg-green-500/10' : 'text-amber-400 border-amber-500/20 bg-amber-500/10'
            )}
          >
            {isOnline ? <Wifi className="h-3 w-3" /> : <WifiOff className="h-3 w-3" />}
            {isOnline ? `${roster.length} Synced` : `Offline (${pendingQueueCount} queued)`}
          </Badge>

          {/* Refresh Roster Button */}
          <Button
            variant="outline"
            size="sm"
            onClick={handleRefreshRoster}
            disabled={isRefreshing}
            className="h-7 px-2 text-xs border-zinc-800 bg-zinc-950 text-zinc-300 hover:text-white gap-1"
            title="Reload enrolled face descriptors from server"
          >
            <RefreshCw className={cn('h-3.5 w-3.5', isRefreshing && 'animate-spin')} />
            <span className="hidden sm:inline">Refresh</span>
          </Button>

          {/* Sound Toggle */}
          <button
            onClick={() => setSoundEnabled(!soundEnabled)}
            className="text-zinc-400 hover:text-zinc-200 transition-colors"
          >
            {soundEnabled ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4" />}
          </button>

          {/* Today's Tally */}
          <Badge className="bg-primary/10 text-primary border-primary/20 font-bold">
            {todayCount} Today
          </Badge>
        </div>
      </div>

      {/* Main Viewport & Overlay */}
      <div className="flex-1 relative flex flex-col items-center justify-center p-4">
        <div className="relative w-full max-w-[640px] aspect-video bg-zinc-900 rounded-3xl overflow-hidden border-2 border-zinc-800 shadow-2xl">
          {/* Live Camera Stream */}
          <video
            ref={videoRef}
            playsInline
            muted
            className="w-full h-full object-cover scale-x-[-1]"
          />

          {/* Canvas for Face Bounding Boxes */}
          <canvas
            ref={canvasRef}
            className="absolute inset-0 w-full h-full object-cover scale-x-[-1] pointer-events-none"
          />

          {/* Oval Target Framing Guide */}
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div
              className={cn(
                'w-48 h-64 rounded-[50%] border-2 border-dashed transition-all duration-300',
                recognitionBanner.state === 'success'
                  ? 'border-green-400 bg-green-500/10 scale-105'
                  : 'border-zinc-500/40'
              )}
            />
          </div>

          {/* Loading Models State */}
          {isLoadingModels && (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-zinc-950/80 backdrop-blur-sm gap-2">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <p className="text-sm font-medium text-zinc-300">Initializing Neural Engine (WebGL)...</p>
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

          {/* Empty Roster State */}
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

        {/* Recognition Result Banner */}
        <div className="mt-6 w-full max-w-[500px] min-h-[100px] flex items-center justify-center">
          {recognitionBanner.state === 'idle' && (
            <div className="text-center text-zinc-500">
              <p className="text-sm font-medium">Walk in front of camera to check in/out</p>
              <p className="text-xs text-zinc-600 mt-0.5">30s cooldown per member</p>
            </div>
          )}

          {recognitionBanner.state === 'success' && (
            <div
              className={cn(
                'flex items-center gap-4 border rounded-2xl p-5 w-full shadow-2xl animate-in fade-in slide-in-from-bottom-2 duration-300',
                recognitionBanner.action === 'check_out'
                  ? 'bg-amber-950/40 border-amber-800/60'
                  : 'bg-green-950/40 border-green-800/60'
              )}
            >
              <Avatar className="h-14 w-14 border-2 border-primary/50">
                <AvatarImage src={recognitionBanner.memberPhoto || ''} />
                <AvatarFallback className="bg-zinc-800 text-zinc-200 text-lg font-bold">
                  {getInitials(recognitionBanner.memberName || '')}
                </AvatarFallback>
              </Avatar>

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="text-lg font-bold text-zinc-100 truncate">{recognitionBanner.memberName}</p>
                  <span className="text-xs font-mono text-zinc-400 bg-zinc-900 px-2 py-0.5 rounded border border-zinc-800">
                    {recognitionBanner.memberCode}
                  </span>
                </div>

                <div className="flex items-center gap-2 mt-1">
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
                  <span className="text-xs text-zinc-400">{recognitionBanner.time}</span>
                </div>
              </div>

              <CheckCircle2
                className={cn(
                  'h-10 w-10 shrink-0',
                  recognitionBanner.action === 'check_out' ? 'text-amber-400' : 'text-green-400'
                )}
              />
            </div>
          )}
        </div>
      </div>

      {/* Bottom Strip: Recent Check-ins */}
      {recentEvents.length > 0 && (
        <div className="px-6 py-3 bg-zinc-900/60 border-t border-zinc-800/80">
          <p className="text-[10px] uppercase tracking-widest text-zinc-500 font-bold mb-2">Recent Scans</p>
          <div className="flex gap-3 overflow-x-auto pb-1 custom-scrollbar">
            {recentEvents.map((evt, idx) => (
              <div
                key={idx}
                className="flex items-center gap-2.5 bg-zinc-950 border border-zinc-800/80 rounded-xl px-3.5 py-2 shrink-0"
              >
                <Avatar className="h-7 w-7 border border-zinc-800">
                  <AvatarImage src={evt.photo || ''} />
                  <AvatarFallback className="text-[10px] bg-zinc-800 text-zinc-300">
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
