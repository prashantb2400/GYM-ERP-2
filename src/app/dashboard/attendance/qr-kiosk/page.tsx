'use client';

import React, { useEffect, useRef, useState, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useBranch } from '@/hooks/useBranch';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  ArrowLeft,
  Camera,
  CameraOff,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Volume2,
  VolumeX,
  Loader2,
  QrCode,
  UserCheck,
  ScanFace,
  Fingerprint,
  SwitchCamera,
} from 'lucide-react';
import { getInitials } from '@/lib/utils/format';
import { cn } from '@/lib/utils';
import Link from 'next/link';
import { fetchWithAuth } from '@/lib/utils/api-client';
import { isMobileDevice, getRecommendedFacingMode } from '@/lib/utils/device';
import { useSwipeGesture } from '@/hooks/useSwipeGesture';

const SCANNER_CONTAINER_ID = 'qr-reader';

type ScanResult = {
  state: 'idle' | 'success' | 'already' | 'expired' | 'error';
  memberName?: string;
  memberPhoto?: string;
  memberCode?: string;
  message?: string;
  time?: string;
};

export default function QrKioskPage() {
  const { user } = useAuth();
  const { selectedBranchId, isOwner } = useBranch();
  const gymId = user?.gymId;
  const effectiveBranchId = !isOwner ? user?.branchId : selectedBranchId;

  const scannerRef = useRef<any>(null);
  const [cameraActive, setCameraActive] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [facingMode, setFacingMode] = useState<'environment' | 'user'>('environment');
  const [availableCameras, setAvailableCameras] = useState<Array<{ id: string; label: string }>>([]);
  const [selectedCameraId, setSelectedCameraId] = useState<string>('');
  const facingModeRef = useRef<'environment' | 'user'>('environment');
  const selectedCameraIdRef = useRef<string>('');
  const processQrCodeRef = useRef<(text: string) => void>(() => {});
  const [scanResult, setScanResult] = useState<ScanResult>({ state: 'idle' });
  const [isProcessing, setIsProcessing] = useState(false);
  const [todayCount, setTodayCount] = useState(0);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [recentCheckins, setRecentCheckins] = useState<Array<{ name: string; time: string; photo?: string }>>([]);
  const lastScannedRef = useRef<string>('');
  const resultTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Device-aware initial camera configuration (auto back-camera on mobile, webcam on laptop)
  useEffect(() => {
    const recFacing = getRecommendedFacingMode();
    setFacingMode(recFacing);
    facingModeRef.current = recFacing;
  }, []);

  const supabase = createClient();

  // Fetch today's count & subscribe to realtime updates
  useEffect(() => {
    if (!gymId) return;
    const today = new Date().toISOString().split('T')[0];

    const loadCount = () => {
      let query = supabase
        .from('attendance')
        .select('id', { count: 'exact', head: true })
        .eq('gym_id', gymId)
        .eq('date', today);

      if (effectiveBranchId) {
        query = query.eq('branch_id', effectiveBranchId);
      }

      query.then(({ count }) => {
        setTodayCount(count || 0);
      });
    };

    loadCount();

    const channel = supabase
      .channel('kiosk-qr-attendance')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'attendance',
          filter: `gym_id=eq.${gymId}`,
        },
        () => {
          loadCount();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [gymId, effectiveBranchId, supabase]);

  // Audio feedback with Web Audio API
  const playBeep = useCallback((success: boolean, type: 'success' | 'already' | 'error' = 'success') => {
    if (!soundEnabled) return;
    try {
      const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
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
        gain.gain.setValueAtTime(0.3, ctx.currentTime);
        osc.start();
        osc.stop(ctx.currentTime + 0.3);
      }
    } catch {
      // Audio not supported, ignore
    }
  }, [soundEnabled]);

  // Process a scanned QR code
  const processQrCode = useCallback(async (decodedText: string) => {
    if (isProcessing) return;
    if (decodedText === lastScannedRef.current) return;

    // Parse the QR payload
    let qrToken = decodedText.trim();
    const match = decodedText.match(/^gymerp:\/\/checkin\/(.+)$/);
    if (match) {
      qrToken = match[1].trim();
    }
    if (!qrToken) return;

    lastScannedRef.current = decodedText;
    setIsProcessing(true);

    if (resultTimeoutRef.current) {
      clearTimeout(resultTimeoutRef.current);
    }

    try {
      const res = await fetchWithAuth('/api/attendance/qr-checkin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          qrToken,
          gymId,
          branchId: effectiveBranchId,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        if (res.status === 403) {
          setScanResult({
            state: 'expired',
            memberName: data.member_name,
            memberPhoto: data.member_photo,
            message: data.error,
          });
          playBeep(false, 'error');
        } else {
          setScanResult({
            state: 'error',
            message: data.error || 'Check-in failed',
          });
          playBeep(false, 'error');
        }
      } else if (data.already_marked) {
        setScanResult({
          state: 'already',
          memberName: data.member_name,
          memberPhoto: data.member_photo,
          memberCode: data.member_code,
          message: data.message,
        });
        playBeep(true, 'already');
      } else {
        const timeStr = data.checked_in_at || new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
        setScanResult({
          state: 'success',
          memberName: data.member_name,
          memberPhoto: data.member_photo,
          memberCode: data.member_code,
          time: timeStr,
        });
        playBeep(true, 'success');
        setTodayCount((c) => c + 1);
        setRecentCheckins((prev) => [
          { name: data.member_name, time: timeStr, photo: data.member_photo },
          ...prev.slice(0, 9),
        ]);
      }
    } catch {
      setScanResult({ state: 'error', message: 'Connection failure' });
      playBeep(false, 'error');
    } finally {
      setIsProcessing(false);
      resultTimeoutRef.current = setTimeout(() => {
        setScanResult({ state: 'idle' });
        lastScannedRef.current = '';
      }, 3500);
    }
  }, [isProcessing, gymId, effectiveBranchId, playBeep]);

  processQrCodeRef.current = processQrCode;

  // Stop html5-qrcode camera scanner safely
  const stopScanner = useCallback(async () => {
    if (scannerRef.current) {
      try {
        if (scannerRef.current.isScanning) {
          await scannerRef.current.stop();
        }
      } catch {
        // Ignored
      }
      try {
        scannerRef.current.clear();
      } catch {
        // Ignored
      }
      scannerRef.current = null;
      setCameraActive(false);
    }
  }, []);

  // Start html5-qrcode camera scanner with device selection, auto-fallback, and flip support
  const startScanner = useCallback(async (preferredCameraId?: string, preferredFacing?: 'environment' | 'user') => {
    try {
      setCameraError(null);
      await stopScanner();

      const { Html5Qrcode } = await import('html5-qrcode');

      // Enumerate cameras if available
      try {
        const devices = await Html5Qrcode.getCameras();
        if (devices && devices.length > 0) {
          setAvailableCameras(devices.map((d) => ({ id: d.id, label: d.label || `Camera ${d.id.slice(0, 5)}` })));
        }
      } catch (camErr) {
        console.warn('Could not enumerate cameras via Html5Qrcode:', camErr);
      }

      const scanner = new Html5Qrcode(SCANNER_CONTAINER_ID);
      scannerRef.current = scanner;

      const qrConfig = {
        fps: 10,
        qrbox: { width: 250, height: 250 },
        aspectRatio: 1.0,
      };

      const targetFacing = preferredFacing || facingModeRef.current || getRecommendedFacingMode();
      const targetId = preferredCameraId || selectedCameraIdRef.current;

      let started = false;

      // 1. If explicit camera ID provided, try starting with specific device
      if (targetId) {
        try {
          await scanner.start(
            targetId,
            qrConfig,
            (decodedText) => processQrCodeRef.current(decodedText),
            () => {}
          );
          started = true;
          setSelectedCameraId(targetId);
          selectedCameraIdRef.current = targetId;
        } catch (deviceErr) {
          console.warn(`Camera ID ${targetId} failed, falling back to facingMode:`, deviceErr);
        }
      }

      // 2. Try preferred facingMode (environment on mobile, user on laptop)
      if (!started) {
        try {
          await scanner.start(
            { facingMode: targetFacing },
            qrConfig,
            (decodedText) => processQrCodeRef.current(decodedText),
            () => {}
          );
          started = true;
          setFacingMode(targetFacing);
          facingModeRef.current = targetFacing;
        } catch (facingErr) {
          console.warn(`FacingMode ${targetFacing} unavailable, falling back:`, facingErr);
        }
      }

      // 3. Fallback to alternate facingMode (e.g. front if back unavailable on mobile)
      if (!started) {
        const fallbackFacing = targetFacing === 'environment' ? 'user' : 'environment';
        await scanner.start(
          { facingMode: fallbackFacing },
          qrConfig,
          (decodedText) => processQrCodeRef.current(decodedText),
          () => {}
        );
        setFacingMode(fallbackFacing);
        facingModeRef.current = fallbackFacing;
      }

      setCameraActive(true);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Camera failed to start';
      console.warn('QR camera start error:', err);
      setCameraError(
        msg.includes('NotAllowedError')
          ? 'Camera permission denied. Please allow camera access.'
          : 'Failed to access camera.'
      );
      setCameraActive(false);
    }
  }, [stopScanner]);

  // Flip between cameras (cycles available video devices or toggles environment/user)
  const flipCamera = useCallback(async () => {
    try {
      if (availableCameras.length > 1) {
        const currentIdx = availableCameras.findIndex((c) => c.id === selectedCameraIdRef.current);
        const nextIdx = (currentIdx + 1) % availableCameras.length;
        const nextCam = availableCameras[nextIdx];
        selectedCameraIdRef.current = nextCam.id;
        setSelectedCameraId(nextCam.id);
        await startScanner(nextCam.id);
      } else {
        const nextFacing = facingModeRef.current === 'environment' ? 'user' : 'environment';
        facingModeRef.current = nextFacing;
        setFacingMode(nextFacing);
        selectedCameraIdRef.current = '';
        setSelectedCameraId('');
        await startScanner(undefined, nextFacing);
      }
    } catch (err) {
      console.warn('Flip camera failed:', err);
    }
  }, [availableCameras, startScanner]);

  // Swipe gesture recognition on QR scanner feed (swipe right-to-left to flip camera)
  const { swipeHandlers, isFlipping, swipeFeedback } = useSwipeGesture({
    onSwipeLeft: flipCamera,
    onSwipeRight: flipCamera,
    cooldownMs: 800,
    enabled: cameraActive,
  });

  useEffect(() => {
    const timer = setTimeout(() => {
      startScanner();
    }, 400);

    return () => {
      clearTimeout(timer);
      if (resultTimeoutRef.current) clearTimeout(resultTimeoutRef.current);
      stopScanner();
    };
  }, [startScanner, stopScanner]);

  return (
    <div className="fixed inset-0 bg-zinc-950 z-50 flex flex-col overflow-hidden text-zinc-100 select-none">
      {/* Top Navigation Bar */}
      <div className="flex items-center justify-between flex-nowrap gap-1.5 sm:gap-2 px-2.5 sm:px-4 h-12 sm:h-14 bg-zinc-900/90 border-b border-zinc-800 backdrop-blur-md shrink-0">
        <div className="flex items-center gap-1.5 sm:gap-3 shrink-0">
          <Link href="/dashboard/attendance">
            <Button variant="ghost" size="sm" className="text-zinc-400 hover:text-zinc-100 gap-1 h-8 w-8 sm:w-auto p-0 sm:px-2.5" title="Exit Kiosk">
              <ArrowLeft className="h-4 w-4" />
              <span className="hidden sm:inline text-xs">Exit</span>
            </Button>
          </Link>

          <div className="flex items-center gap-1.5 sm:gap-2">
            <div className="h-7 w-7 sm:h-8 sm:w-8 rounded-lg bg-blue-950/60 border border-blue-800/40 flex items-center justify-center shadow-xs">
              <QrCode className="h-4 w-4 text-blue-400 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <h1 className="font-bold text-xs sm:text-base tracking-tight text-zinc-100 whitespace-nowrap">
                  <span className="sm:hidden">QR</span>
                  <span className="hidden sm:inline">QR Kiosk</span>
                </h1>
                <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse shrink-0" title="Scanner Live" />
              </div>
            </div>
          </div>
        </div>

        {/* Universal Kiosk Switcher */}
        <div className="flex items-center bg-zinc-950 p-0.5 sm:p-1 rounded-xl border border-zinc-800 text-xs gap-0.5 sm:gap-1 shrink-0">
          <Link href="/dashboard/attendance/face-kiosk">
            <Button
              variant="ghost"
              size="sm"
              className="h-7 px-2 sm:px-2.5 text-xs rounded-lg gap-1.5 text-zinc-400 hover:text-zinc-200"
            >
              <ScanFace className="h-3.5 w-3.5 text-cyan-400" />
              <span className="hidden md:inline">AI Face</span>
            </Button>
          </Link>

          <Button
            variant="ghost"
            size="sm"
            className="h-7 px-2 sm:px-2.5 text-xs rounded-lg gap-1.5 bg-blue-600 text-white font-semibold hover:bg-blue-600 cursor-default"
          >
            <QrCode className="h-3.5 w-3.5 text-white" />
            <span className="hidden md:inline">QR Code</span>
          </Button>

          <Link href="/dashboard/attendance/kiosk">
            <Button
              variant="ghost"
              size="sm"
              className="h-7 px-2 sm:px-2.5 text-xs rounded-lg gap-1.5 text-zinc-400 hover:text-zinc-200"
            >
              <Fingerprint className="h-3.5 w-3.5 text-purple-400" />
              <span className="hidden md:inline">Fingerprint</span>
            </Button>
          </Link>
        </div>

        {/* Status Indicators & Audio */}
        <div className="flex items-center gap-1 sm:gap-2 shrink-0">
          {/* Active Camera Badge */}
          <Badge
            variant="outline"
            className="hidden sm:inline-flex text-[10px] font-mono text-zinc-300 border-zinc-800 bg-zinc-950 px-2 py-0.5"
            title={facingMode === 'environment' ? 'Rear / Back Camera' : 'Front Webcam'}
          >
            {facingMode === 'environment' ? 'Rear Cam' : 'Webcam'}
          </Badge>

          <Button
            variant="outline"
            size="sm"
            onClick={flipCamera}
            disabled={isFlipping}
            className="h-7 w-7 sm:h-8 sm:w-auto sm:px-2.5 text-xs border-zinc-800 bg-zinc-950 text-zinc-300 hover:text-white gap-1 active:scale-95"
            title="Flip Camera (Front / Rear)"
          >
            <SwitchCamera className={cn("h-3.5 w-3.5 text-blue-400 transition-transform duration-500", isFlipping && "animate-spin")} />
            <span className="hidden sm:inline text-xs">Flip</span>
          </Button>

          <Badge variant="outline" className={cameraActive ? 'text-green-400 border-green-500/20 bg-green-500/10 font-bold text-[10px] sm:text-xs py-0.5' : 'text-zinc-500 font-bold text-[10px] sm:text-xs py-0.5'}>
            {cameraActive ? 'Live' : 'Off'}
          </Badge>

          <Button
            size="icon"
            variant="ghost"
            onClick={() => setSoundEnabled(!soundEnabled)}
            className="h-7 w-7 text-zinc-400 hover:text-zinc-200"
            title={soundEnabled ? 'Mute Chimes' : 'Enable Chimes'}
          >
            {soundEnabled ? <Volume2 className="h-4 w-4 text-blue-400" /> : <VolumeX className="h-4 w-4" />}
          </Button>

          <Badge className="bg-blue-600/20 text-blue-300 border-blue-500/30 font-bold text-[10px] sm:text-xs px-1.5 sm:px-2 py-0.5 whitespace-nowrap">
            {todayCount} <span className="hidden xs:inline sm:inline">Today</span>
          </Badge>
        </div>
      </div>

      {/* Main Scanner Viewport */}
      <div className="flex-1 flex flex-col items-center justify-center relative px-3 sm:px-4 py-2">
        <div
          {...swipeHandlers}
          className="relative w-full max-w-[290px] sm:max-w-[340px] aspect-square mx-auto cursor-grab active:cursor-grabbing select-none"
        >
          <div
            id={SCANNER_CONTAINER_ID}
            className={cn(
              'w-full h-full rounded-2xl sm:rounded-3xl overflow-hidden bg-zinc-900 border-2 transition-all duration-300 shadow-2xl [&_video]:object-cover [&_video]:rounded-2xl',
              isFlipping && 'opacity-50 scale-95',
              scanResult.state === 'success' ? 'border-green-500 shadow-green-500/20' :
              scanResult.state === 'already' ? 'border-blue-500 shadow-blue-500/20' :
              scanResult.state === 'expired' ? 'border-red-500 shadow-red-500/20' :
              scanResult.state === 'error' ? 'border-red-500 shadow-red-500/20' :
              'border-zinc-800'
            )}
          />

          {/* Swipe Feedback HUD Toast */}
          {swipeFeedback && (
            <div className="absolute inset-0 z-40 flex items-center justify-center pointer-events-none">
              <div className="flex items-center gap-2.5 px-3.5 py-2 rounded-2xl bg-black/85 backdrop-blur-md border border-blue-500/50 text-white shadow-2xl animate-in fade-in zoom-in-95 duration-200">
                <SwitchCamera className="h-5 w-5 text-blue-400 animate-spin" />
                <span className="text-xs font-semibold tracking-wide">
                  {facingMode === 'environment' ? 'Switching to Webcam...' : 'Switching to Rear Cam...'}
                </span>
              </div>
            </div>
          )}

          {/* Floating Flip Camera Pill */}
          <div className="absolute bottom-3 right-3 z-30 flex items-center gap-1.5">
            <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-black/85 border border-zinc-700/80 text-[10px] font-mono text-zinc-300 backdrop-blur-md select-none shadow-lg">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
              <span>{facingMode === 'environment' ? 'Rear Cam' : 'Webcam'}</span>
              <span className="text-zinc-500">•</span>
              <span className="text-zinc-400 text-[9px] flex items-center gap-0.5">
                <span>Swipe</span>
                <span className="text-blue-400 font-bold">←</span>
                <span>to flip</span>
              </span>
            </div>
            <button
              type="button"
              onClick={flipCamera}
              disabled={isFlipping}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-black/85 hover:bg-zinc-900 active:scale-95 text-zinc-200 hover:text-white border border-zinc-700/80 backdrop-blur-md text-xs font-medium shadow-xl transition-all cursor-pointer disabled:opacity-50"
              title="Flip camera between front and rear"
              aria-label="Flip Camera"
            >
              <SwitchCamera className={cn("h-3.5 w-3.5 text-blue-400 transition-transform duration-500", isFlipping && "animate-spin")} />
              <span>Flip</span>
            </button>
          </div>

          {cameraError && (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-zinc-900/95 rounded-2xl p-6 text-center z-30">
              <CameraOff className="h-10 w-10 text-zinc-400 mb-3" />
              <p className="text-zinc-300 text-sm mb-4 max-w-xs">{cameraError}</p>
              <div className="flex items-center gap-2">
                <Button onClick={async () => { await stopScanner(); await startScanner(); }} className="gap-2 bg-blue-600 hover:bg-blue-500">
                  <Camera className="h-4 w-4" /> Retry
                </Button>
                <Button
                  onClick={flipCamera}
                  disabled={isFlipping}
                  variant="outline"
                  className="gap-2 border-zinc-700 bg-zinc-900 hover:bg-zinc-800 text-zinc-200"
                >
                  <SwitchCamera className={cn("h-4 w-4 text-blue-400", isFlipping && "animate-spin")} />
                  Switch Camera
                </Button>
              </div>
            </div>
          )}

          {isProcessing && (
            <div className="absolute inset-0 flex items-center justify-center bg-zinc-950/70 rounded-2xl backdrop-blur-xs z-20">
              <Loader2 className="h-10 w-10 text-blue-400 animate-spin" />
            </div>
          )}
        </div>

        {/* Dedicated Mobile Camera Control Strip (Immediately under QR scan region) */}
        <div className="flex sm:hidden items-center justify-between gap-2 p-2 mt-3 bg-zinc-900/90 rounded-2xl border border-zinc-800 shadow-xl w-full max-w-[320px]">
          {/* Active Sensor Badge */}
          <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-zinc-950 border border-zinc-800 text-[11px] font-mono text-zinc-300">
            <span className={cn("h-2 w-2 rounded-full", facingMode === 'environment' ? "bg-emerald-400 animate-pulse" : "bg-blue-400")} />
            <span>{facingMode === 'environment' ? 'Rear Cam' : 'Webcam'}</span>
          </div>

          {/* Prominent Mobile Flip Camera Button */}
          <button
            type="button"
            onClick={flipCamera}
            disabled={isFlipping}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 active:scale-95 text-white font-semibold text-xs shadow-md shadow-blue-950/50 transition-all cursor-pointer disabled:opacity-50"
            title="Flip camera between front and rear"
            aria-label="Flip Camera"
          >
            <SwitchCamera className={cn("h-3.5 w-3.5 text-white transition-transform duration-500", isFlipping && "animate-spin")} />
            <span>Flip to {facingMode === 'environment' ? 'Front' : 'Rear'}</span>
          </button>
        </div>

        {/* Scan Result Feedback Card */}
        <div className="mt-6 w-full max-w-[420px] min-h-[110px] flex items-center justify-center">
          {scanResult.state === 'idle' && (
            <div className="text-center text-zinc-500">
              <p className="text-sm font-medium">Hold your Member Pass QR code in front of the camera</p>
              <p className="text-xs text-zinc-600 mt-1">Mobile QR passes & physical gym cards supported</p>
            </div>
          )}

          {scanResult.state === 'success' && (
            <div className="flex items-center gap-4 bg-green-950/40 border border-green-800/60 rounded-2xl p-4 w-full shadow-xl animate-in fade-in slide-in-from-bottom-2 duration-300">
              <Avatar className="h-14 w-14 border-2 border-green-500/50">
                <AvatarImage src={scanResult.memberPhoto || ''} />
                <AvatarFallback className="bg-green-900 text-green-200 font-bold text-lg">
                  {getInitials(scanResult.memberName || '')}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1">
                <p className="text-green-300 text-base font-bold">{scanResult.memberName}</p>
                <p className="text-green-400 text-xs font-mono">{scanResult.memberCode}</p>
                <p className="text-zinc-400 text-[10px]">{scanResult.time}</p>
              </div>
              <CheckCircle2 className="h-8 w-8 text-green-400 shrink-0" />
            </div>
          )}

          {scanResult.state === 'already' && (
            <div className="flex items-center gap-4 bg-blue-950/40 border border-blue-800/60 rounded-2xl p-4 w-full shadow-xl animate-in fade-in slide-in-from-bottom-2 duration-300">
              <Avatar className="h-14 w-14 border-2 border-blue-500/50">
                <AvatarImage src={scanResult.memberPhoto || ''} />
                <AvatarFallback className="bg-blue-900 text-blue-200 font-bold text-lg">
                  {getInitials(scanResult.memberName || '')}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1">
                <p className="text-blue-300 text-base font-bold">{scanResult.memberName}</p>
                <p className="text-blue-400 text-xs">Already checked in today ✓</p>
                <p className="text-zinc-400 text-[10px] font-mono mt-0.5">{scanResult.memberCode}</p>
              </div>
              <UserCheck className="h-8 w-8 text-blue-400 shrink-0" />
            </div>
          )}

          {scanResult.state === 'expired' && (
            <div className="flex items-center gap-4 bg-red-950/40 border border-red-800/60 rounded-2xl p-4 w-full shadow-xl animate-in fade-in slide-in-from-bottom-2 duration-300">
              <Avatar className="h-14 w-14 border-2 border-red-500/50">
                <AvatarImage src={scanResult.memberPhoto || ''} />
                <AvatarFallback className="bg-red-900 text-red-200 font-bold text-lg">
                  {getInitials(scanResult.memberName || '')}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1">
                <p className="text-red-300 text-base font-bold">{scanResult.memberName}</p>
                <p className="text-red-400 text-xs font-semibold">{scanResult.message}</p>
                <p className="text-zinc-500 text-[10px]">Please renew membership at desk</p>
              </div>
              <AlertTriangle className="h-8 w-8 text-red-400 shrink-0" />
            </div>
          )}

          {scanResult.state === 'error' && (
            <div className="flex items-center gap-3 bg-red-950/40 border border-red-800/60 rounded-2xl p-4 w-full shadow-xl animate-in fade-in slide-in-from-bottom-2 duration-300">
              <XCircle className="h-8 w-8 text-red-400 shrink-0" />
              <div>
                <p className="text-red-300 font-bold text-sm">Access Denied</p>
                <p className="text-red-400/80 text-xs">{scanResult.message}</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Bottom Recent Check-ins Bar */}
      {recentCheckins.length > 0 && (
        <div className="px-4 pb-3 pt-2 bg-zinc-900/60 border-t border-zinc-800 backdrop-blur-sm">
          <div className="max-w-4xl mx-auto flex items-center justify-between">
            <p className="text-[10px] uppercase tracking-widest text-zinc-500 font-bold">Recent Check-ins</p>
            <div className="flex gap-2.5 overflow-x-auto pb-0.5">
              {recentCheckins.map((item, i) => (
                <div
                  key={i}
                  className="flex items-center gap-2 bg-zinc-950/80 border border-zinc-800/80 rounded-lg px-2.5 py-1.5 shrink-0 shadow-sm"
                >
                  <Avatar className="h-6 w-6">
                    <AvatarImage src={item.photo || ''} />
                    <AvatarFallback className="text-[9px] bg-zinc-800 text-zinc-400">
                      {getInitials(item.name)}
                    </AvatarFallback>
                  </Avatar>
                  <span className="text-xs font-medium text-zinc-300">{item.name}</span>
                  <span className="text-[10px] text-blue-400 font-mono">{item.time}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
