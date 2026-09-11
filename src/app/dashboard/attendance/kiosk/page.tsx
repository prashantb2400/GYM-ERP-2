'use client';

import React, { useEffect, useRef, useState, useCallback } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import { createClient } from '@/lib/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Camera, CameraOff, CheckCircle2, XCircle, AlertTriangle, Volume2, VolumeX, Loader2, QrCode, UserCheck } from 'lucide-react';
import { getInitials } from '@/lib/utils/format';
import { cn } from '@/lib/utils';
import Link from 'next/link';
import { fetchWithAuth } from '@/lib/utils/api-client';

const SCANNER_CONTAINER_ID = 'qr-reader';

type ScanResult = {
  state: 'idle' | 'success' | 'already' | 'expired' | 'error';
  memberName?: string;
  memberPhoto?: string;
  memberCode?: string;
  message?: string;
};

export default function KioskPage() {
  const { user } = useAuth();
  const gymId = user?.gymId;
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const [cameraActive, setCameraActive] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [scanResult, setScanResult] = useState<ScanResult>({ state: 'idle' });
  const [isProcessing, setIsProcessing] = useState(false);
  const [todayCount, setTodayCount] = useState(0);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [recentCheckins, setRecentCheckins] = useState<Array<{ name: string; time: string; photo?: string }>>([]);
  const lastScannedRef = useRef<string>('');
  const resultTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const supabase = createClient();

  // Fetch today's count
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

  // Play success beep using Web Audio API
  const playBeep = useCallback((success: boolean) => {
    if (!soundEnabled) return;
    try {
      const ctx = new AudioContext();
      const oscillator = ctx.createOscillator();
      const gain = ctx.createGain();
      oscillator.connect(gain);
      gain.connect(ctx.destination);
      oscillator.frequency.value = success ? 880 : 440;
      oscillator.type = 'sine';
      gain.gain.value = 0.3;
      oscillator.start();
      oscillator.stop(ctx.currentTime + (success ? 0.15 : 0.3));
    } catch {
      // Audio not available, silently ignore
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

    // Clear any previous result timeout
    if (resultTimeoutRef.current) {
      clearTimeout(resultTimeoutRef.current);
    }

    try {
      const res = await fetchWithAuth('/api/attendance/qr-checkin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ qrToken, gymId, branchId: user?.branchId }),
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
          playBeep(false);
        } else {
          setScanResult({
            state: 'error',
            message: data.error || 'Check-in failed',
          });
          playBeep(false);
        }
      } else if (data.already_marked) {
        setScanResult({
          state: 'already',
          memberName: data.member_name,
          memberPhoto: data.member_photo,
          memberCode: data.member_code,
          message: 'Already checked in today',
        });
        playBeep(false);
      } else {
        setScanResult({
          state: 'success',
          memberName: data.member_name,
          memberPhoto: data.member_photo,
          memberCode: data.member_code,
        });
        playBeep(true);
        setTodayCount(prev => prev + 1);
        setRecentCheckins(prev => [
          { name: data.member_name, time: data.checked_in_at, photo: data.member_photo },
          ...prev.slice(0, 4),
        ]);
      }
    } catch {
      setScanResult({ state: 'error', message: 'Network error. Please try again.' });
      playBeep(false);
    } finally {
      setIsProcessing(false);
      // Auto-reset after 3 seconds
      resultTimeoutRef.current = setTimeout(() => {
        setScanResult({ state: 'idle' });
        lastScannedRef.current = '';
      }, 3000);
    }
  }, [isProcessing, gymId, playBeep]);

  // Start camera
  const startScanner = useCallback(async () => {
    try {
      setCameraError(null);
      const html5Qr = new Html5Qrcode(SCANNER_CONTAINER_ID);
      scannerRef.current = html5Qr;

      await html5Qr.start(
        { facingMode: 'environment' },
        {
          fps: 10,
          qrbox: { width: 280, height: 280 },
          aspectRatio: 1,
        },
        (decodedText) => {
          processQrCode(decodedText);
        },
        () => {
          // QR code not found in frame, keep scanning
        }
      );
      setCameraActive(true);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Camera access denied';
      setCameraError(msg);
      setCameraActive(false);
    }
  }, [processQrCode]);

  // Stop camera
  const stopScanner = useCallback(async () => {
    if (scannerRef.current) {
      try {
        await scannerRef.current.stop();
        scannerRef.current.clear();
      } catch {
        // Already stopped
      }
      scannerRef.current = null;
    }
    setCameraActive(false);
  }, []);

  // Auto-start camera on mount
  useEffect(() => {
    const timer = setTimeout(() => {
      startScanner();
    }, 500);

    return () => {
      clearTimeout(timer);
      if (resultTimeoutRef.current) clearTimeout(resultTimeoutRef.current);
      if (scannerRef.current) {
        scannerRef.current.stop().catch(() => {});
      }
    };
  }, [startScanner]);

  return (
    <div className="fixed inset-0 bg-zinc-950 z-50 flex flex-col overflow-hidden">
      {/* Top Bar */}
      <div className="flex items-center justify-between px-4 py-3 bg-zinc-900/80 border-b border-zinc-800 backdrop-blur-sm">
        <Link href="/dashboard/attendance">
          <Button variant="ghost" size="sm" className="text-zinc-400 hover:text-zinc-100 gap-2">
            <ArrowLeft className="h-4 w-4" />
            <span className="hidden sm:inline">Exit Kiosk</span>
          </Button>
        </Link>

        <div className="flex items-center gap-2">
          <QrCode className="h-5 w-5 text-primary" />
          <span className="font-bold text-zinc-100 text-sm sm:text-base">QR Attendance Kiosk</span>
        </div>

        <div className="flex items-center gap-3">
          <Badge variant="outline" className={cameraActive ? "text-green-400 border-green-500/20 bg-green-500/10 font-bold" : "text-zinc-500 font-bold"}>
            {cameraActive ? "Live" : "Idle"}
          </Badge>
          <button
            onClick={() => setSoundEnabled(!soundEnabled)}
            className="text-zinc-500 hover:text-zinc-300 transition-colors"
          >
            {soundEnabled ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4" />}
          </button>
          <Badge className="bg-primary/10 text-primary border-primary/20 font-bold">
            {todayCount} today
          </Badge>
        </div>
      </div>

      {/* Main Scanner Area */}
      <div className="flex-1 flex flex-col items-center justify-center relative px-4">
        {/* Scanner viewport */}
        <div className="relative w-full max-w-[360px] aspect-square">
          {/* Camera feed */}
          <div
            id={SCANNER_CONTAINER_ID}
            className={cn(
              'w-full h-full rounded-2xl overflow-hidden bg-zinc-900 border-2 transition-colors duration-300',
              scanResult.state === 'success' ? 'border-green-500' :
              scanResult.state === 'already' ? 'border-blue-500' :
              scanResult.state === 'expired' ? 'border-red-500' :
              scanResult.state === 'error' ? 'border-red-500' :
              'border-zinc-700'
            )}
          />

          {/* Camera error overlay */}
          {cameraError && (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-zinc-900 rounded-2xl p-6 text-center">
              <CameraOff className="h-12 w-12 text-zinc-600 mb-4" />
              <p className="text-zinc-400 text-sm mb-4">{cameraError}</p>
              <Button onClick={async () => { await stopScanner(); await startScanner(); }} className="gap-2">
                <Camera className="h-4 w-4" /> Retry Camera
              </Button>
            </div>
          )}

          {/* Processing overlay */}
          {isProcessing && (
            <div className="absolute inset-0 flex items-center justify-center bg-zinc-950/60 rounded-2xl backdrop-blur-sm">
              <Loader2 className="h-10 w-10 text-primary animate-spin" />
            </div>
          )}
        </div>

        {/* Result Display */}
        <div className="mt-6 w-full max-w-[400px] min-h-[120px] flex items-center justify-center">
          {scanResult.state === 'idle' && (
            <div className="text-center text-zinc-500">
              <p className="text-sm">Point camera at a member&apos;s QR code</p>
            </div>
          )}

          {scanResult.state === 'success' && (
            <div className="flex items-center gap-4 bg-green-950/30 border border-green-800/50 rounded-2xl p-5 w-full animate-in fade-in slide-in-from-bottom-2 duration-300">
              <Avatar className="h-14 w-14 border-2 border-green-500/50">
                <AvatarImage src={scanResult.memberPhoto || ''} />
                <AvatarFallback className="bg-green-900 text-green-300 text-lg font-bold">
                  {getInitials(scanResult.memberName || '')}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1">
                <p className="text-green-400 text-lg font-bold">{scanResult.memberName}</p>
                <p className="text-green-500/70 text-sm font-mono">{scanResult.memberCode}</p>
              </div>
              <CheckCircle2 className="h-10 w-10 text-green-400 shrink-0" />
            </div>
          )}

          {scanResult.state === 'already' && (
            <div className="flex items-center gap-4 bg-blue-950/30 border border-blue-800/50 rounded-2xl p-5 w-full animate-in fade-in slide-in-from-bottom-2 duration-300">
              <Avatar className="h-14 w-14 border-2 border-blue-500/50">
                <AvatarImage src={scanResult.memberPhoto || ''} />
                <AvatarFallback className="bg-blue-900 text-blue-300 text-lg font-bold">
                  {getInitials(scanResult.memberName || '')}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1">
                <p className="text-blue-400 text-lg font-bold">{scanResult.memberName}</p>
                <p className="text-blue-500/70 text-sm">Already checked in today ✓</p>
              </div>
              <UserCheck className="h-10 w-10 text-blue-400 shrink-0" />
            </div>
          )}

          {scanResult.state === 'expired' && (
            <div className="flex items-center gap-4 bg-red-950/30 border border-red-800/50 rounded-2xl p-5 w-full animate-in fade-in slide-in-from-bottom-2 duration-300">
              <Avatar className="h-14 w-14 border-2 border-red-500/50">
                <AvatarImage src={scanResult.memberPhoto || ''} />
                <AvatarFallback className="bg-red-900 text-red-300 text-lg font-bold">
                  {getInitials(scanResult.memberName || '')}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1">
                <p className="text-red-400 text-lg font-bold">{scanResult.memberName}</p>
                <p className="text-red-500/70 text-sm">{scanResult.message}</p>
              </div>
              <AlertTriangle className="h-10 w-10 text-red-400 shrink-0" />
            </div>
          )}

          {scanResult.state === 'error' && (
            <div className="flex items-center gap-4 bg-red-950/30 border border-red-800/50 rounded-2xl p-5 w-full animate-in fade-in slide-in-from-bottom-2 duration-300">
              <XCircle className="h-10 w-10 text-red-400 shrink-0" />
              <p className="text-red-400 font-medium">{scanResult.message}</p>
            </div>
          )}
        </div>
      </div>

      {/* Bottom Recent Check-ins */}
      {recentCheckins.length > 0 && (
        <div className="px-4 pb-4 pt-2 bg-zinc-900/50 border-t border-zinc-800">
          <p className="text-[10px] uppercase tracking-widest text-zinc-600 font-bold mb-2">Recent</p>
          <div className="flex gap-3 overflow-x-auto pb-1">
            {recentCheckins.map((checkin, i) => (
              <div key={i} className="flex items-center gap-2 bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 shrink-0">
                <Avatar className="h-7 w-7">
                  <AvatarImage src={checkin.photo || ''} />
                  <AvatarFallback className="text-[10px] bg-zinc-800 text-zinc-400">
                    {getInitials(checkin.name)}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <p className="text-xs font-medium text-zinc-300 whitespace-nowrap">{checkin.name}</p>
                  <p className="text-[10px] text-zinc-600">{checkin.time}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
