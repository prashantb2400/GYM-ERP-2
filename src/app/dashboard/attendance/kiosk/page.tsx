'use client';

import React, { useEffect, useRef, useState, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useBranch } from '@/hooks/useBranch';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  ArrowLeft,
  Fingerprint,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Volume2,
  VolumeX,
  Loader2,
  UserCheck,
  RefreshCw,
  Cpu,
  Search,
  Users,
  ShieldCheck,
  ScanFace,
  QrCode,
} from 'lucide-react';
import { getInitials } from '@/lib/utils/format';
import { cn } from '@/lib/utils';
import Link from 'next/link';
import { fetchWithAuth } from '@/lib/utils/api-client';
import { FingerprintScannerManager } from '@/lib/fingerprint/drivers';
import { identifyMemberFromRoster } from '@/lib/fingerprint/matcher';
import type { RosterMemberFingerprint, ScannerDeviceInfo, ScannerDriverId, FingerType } from '@/lib/fingerprint/types';

type KioskResultState = 'idle' | 'scanning' | 'success' | 'already' | 'expired' | 'error';

interface KioskResult {
  state: KioskResultState;
  memberName?: string;
  memberPhoto?: string;
  memberCode?: string;
  message?: string;
  totalDue?: number;
  time?: string;
  matchScore?: number;
}

export default function FingerprintKioskPage() {
  const { user } = useAuth();
  const { selectedBranchId, isOwner } = useBranch();
  const gymId = user?.gymId;
  const effectiveBranchId = !isOwner ? user?.branchId : selectedBranchId;

  const [roster, setRoster] = useState<RosterMemberFingerprint[]>([]);
  const [loadingRoster, setLoadingRoster] = useState(true);
  const [deviceInfo, setDeviceInfo] = useState<ScannerDeviceInfo | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [kioskResult, setKioskResult] = useState<KioskResult>({ state: 'idle' });
  const [todayCount, setTodayCount] = useState(0);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [recentCheckins, setRecentCheckins] = useState<Array<{ name: string; time: string; photo?: string }>>([]);
  const [manualQuery, setManualQuery] = useState('');
  const [isManualProcessing, setIsManualProcessing] = useState(false);

  const scannerManager = FingerprintScannerManager.getInstance();
  const resultTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isHandlingScanRef = useRef(false);

  const supabase = createClient();

  // Play Web Audio feedback sound
  const playChime = useCallback((success: boolean, type: 'success' | 'already' | 'error' = 'success') => {
    if (!soundEnabled) return;
    try {
      const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);

      if (type === 'already') {
        osc.frequency.setValueAtTime(587.33, ctx.currentTime); // D5
        osc.frequency.setValueAtTime(880, ctx.currentTime + 0.1); // A5
        gain.gain.setValueAtTime(0.2, ctx.currentTime);
        osc.start();
        osc.stop(ctx.currentTime + 0.25);
      } else if (success) {
        osc.frequency.setValueAtTime(523.25, ctx.currentTime); // C5
        osc.frequency.setValueAtTime(659.25, ctx.currentTime + 0.08); // E5
        osc.frequency.setValueAtTime(783.99, ctx.currentTime + 0.16); // G5
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
      // Audio not supported in environment
    }
  }, [soundEnabled]);

  // Load roster of enrolled fingerprint templates
  const loadRoster = useCallback(async () => {
    if (!gymId) return;
    setLoadingRoster(true);
    try {
      const branchParam = effectiveBranchId ? `&branchId=${effectiveBranchId}` : '';
      const res = await fetchWithAuth(`/api/attendance/fingerprint-roster?gymId=${gymId}${branchParam}`);
      const data = await res.json();
      if (res.ok && data.roster) {
        setRoster(data.roster);
      }
    } catch (err) {
      console.error('Failed to load fingerprint roster:', err);
    } finally {
      setLoadingRoster(false);
    }
  }, [gymId, effectiveBranchId]);

  // Load today's check-in stats
  const fetchTodayCount = useCallback(async () => {
    if (!gymId) return;
    const today = new Date().toISOString().split('T')[0];
    let query = supabase
      .from('attendance')
      .select('id, member_name, check_in_time, members(photo_url)')
      .eq('gym_id', gymId)
      .eq('date', today)
      .order('check_in_time', { ascending: false });

    if (effectiveBranchId) {
      query = query.eq('branch_id', effectiveBranchId);
    }

    const { data, count } = await query;
    if (data) {
      setTodayCount(data.length);
      setRecentCheckins(
        data.slice(0, 5).map((log: any) => ({
          name: log.member_name,
          time: new Date(log.check_in_time).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }),
          photo: log.members?.photo_url,
        }))
      );
    }
  }, [gymId, effectiveBranchId, supabase]);

  // Detect scanner hardware
  const detectHardware = useCallback(async () => {
    try {
      const info = await scannerManager.detectActiveScanner();
      setDeviceInfo(info);
    } catch {
      setDeviceInfo({
        driverId: 'virtual',
        name: 'Virtual Optical Sensor (Simulator)',
        connected: true,
      });
    }
  }, [scannerManager]);

  useEffect(() => {
    detectHardware();
    loadRoster();
    fetchTodayCount();

    if (gymId) {
      const channel = supabase
        .channel('kiosk-fingerprint-attendance')
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'attendance',
            filter: `gym_id=eq.${gymId}`,
          },
          () => {
            fetchTodayCount();
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [detectHardware, loadRoster, fetchTodayCount, gymId, supabase]);

  // Process live scan from sensor
  const handleScanTouch = async (finger: FingerType = 'left_thumb') => {
    if (isHandlingScanRef.current) return;
    isHandlingScanRef.current = true;
    setIsScanning(true);
    setKioskResult({ state: 'scanning' });

    if (resultTimeoutRef.current) clearTimeout(resultTimeoutRef.current);

    try {
      // 1. Capture fingerprint via active driver
      const capture = await scannerManager.capture(finger);
      if (!capture.success || !capture.template) {
        throw new Error(capture.error || 'Optical sensor could not read print');
      }

      // 2. Perform high-speed 1:N minutiae matching against loaded roster
      const match = identifyMemberFromRoster(capture.template, roster);

      if (!match.matched || !match.member) {
        setKioskResult({
          state: 'error',
          message: 'Fingerprint not recognized. Please enroll or try again.',
        });
        playChime(false, 'error');
        return;
      }

      const matchedMember = match.member;
      const score = match.matchResult?.score || 85;

      // 3. Post check-in to server
      const checkinRes = await fetchWithAuth('/api/attendance/fingerprint-checkin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          gymId,
          branchId: effectiveBranchId,
          memberId: matchedMember.id,
          score,
          driverId: capture.driverId,
        }),
      });

      const checkinData = await checkinRes.json();

      if (!checkinRes.ok) {
        if (checkinRes.status === 403) {
          setKioskResult({
            state: 'expired',
            memberName: checkinData.member_name,
            memberCode: checkinData.member_code,
            memberPhoto: checkinData.member_photo,
            message: checkinData.error,
          });
          playChime(false, 'error');
        } else {
          setKioskResult({
            state: 'error',
            message: checkinData.error || 'Check-in failed',
          });
          playChime(false, 'error');
        }
      } else if (checkinData.already_marked) {
        setKioskResult({
          state: 'already',
          memberName: checkinData.member_name,
          memberCode: checkinData.member_code,
          memberPhoto: checkinData.member_photo,
          totalDue: checkinData.total_due,
          message: 'Already checked in today',
        });
        playChime(true, 'already');
      } else {
        setKioskResult({
          state: 'success',
          memberName: checkinData.member_name,
          memberCode: checkinData.member_code,
          memberPhoto: checkinData.member_photo,
          totalDue: checkinData.total_due,
          time: checkinData.checked_in_at,
          matchScore: score,
        });
        playChime(true, 'success');
        setTodayCount((prev) => prev + 1);
        setRecentCheckins((prev) => [
          {
            name: checkinData.member_name,
            time: checkinData.checked_in_at,
            photo: checkinData.member_photo,
          },
          ...prev.slice(0, 4),
        ]);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Sensor read failed';
      setKioskResult({ state: 'error', message: msg });
      playChime(false, 'error');
    } finally {
      setIsScanning(false);
      isHandlingScanRef.current = false;

      // Auto-reset kiosk view to ready state after 3.5 seconds
      resultTimeoutRef.current = setTimeout(() => {
        setKioskResult({ state: 'idle' });
      }, 3500);
    }
  };

  // Manual search fallback (e.g. member with injured finger)
  const handleManualCheckIn = async (member: RosterMemberFingerprint) => {
    setIsManualProcessing(true);
    if (resultTimeoutRef.current) clearTimeout(resultTimeoutRef.current);

    try {
      const res = await fetchWithAuth('/api/attendance/fingerprint-checkin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          gymId,
          branchId: effectiveBranchId,
          memberId: member.id,
          score: 100,
          driverId: 'manual_desk',
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Manual check-in failed');

      if (data.already_marked) {
        setKioskResult({
          state: 'already',
          memberName: data.member_name,
          memberCode: data.member_code,
          memberPhoto: data.member_photo,
          message: 'Already checked in today',
        });
        playChime(true, 'already');
      } else {
        setKioskResult({
          state: 'success',
          memberName: data.member_name,
          memberCode: data.member_code,
          memberPhoto: data.member_photo,
          time: data.checked_in_at,
        });
        playChime(true, 'success');
        setTodayCount((prev) => prev + 1);
        setManualQuery('');
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed';
      setKioskResult({ state: 'error', message: msg });
      playChime(false, 'error');
    } finally {
      setIsManualProcessing(false);
      resultTimeoutRef.current = setTimeout(() => {
        setKioskResult({ state: 'idle' });
      }, 3500);
    }
  };

  const filteredRoster = manualQuery.trim()
    ? roster.filter(
        (m) =>
          m.name.toLowerCase().includes(manualQuery.toLowerCase()) ||
          m.member_code.toLowerCase().includes(manualQuery.toLowerCase())
      )
    : [];

  return (
    <div className="fixed inset-0 bg-zinc-950 z-50 flex flex-col overflow-hidden text-zinc-100 select-none">
      {/* Top Navigation Bar */}
      <div className="flex flex-wrap sm:flex-nowrap items-center justify-between gap-2 px-3 sm:px-4 py-2.5 bg-zinc-900/90 border-b border-zinc-800 backdrop-blur-md">
        <div className="flex items-center gap-2 sm:gap-3">
          <Link href="/dashboard/attendance">
            <Button variant="ghost" size="sm" className="text-zinc-400 hover:text-zinc-100 gap-1.5 h-8 px-2 sm:px-3" title="Exit Kiosk">
              <ArrowLeft className="h-4 w-4" />
              <span className="hidden sm:inline text-xs">Exit</span>
            </Button>
          </Link>

          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-lg bg-purple-950/60 border border-purple-800/40 flex items-center justify-center shadow-xs">
              <Fingerprint className="h-4 w-4 text-purple-400 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <h1 className="font-bold text-sm sm:text-base tracking-tight text-zinc-100">
                  Fingerprint Station
                </h1>
                <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" title="Sensor Live" />
              </div>
            </div>
          </div>
        </div>

        {/* Universal Kiosk Switcher */}
        <div className="flex items-center bg-zinc-950 p-1 rounded-xl border border-zinc-800 text-xs gap-1">
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
            className="h-7 px-2 sm:px-2.5 text-xs rounded-lg gap-1.5 bg-purple-600 text-white font-semibold hover:bg-purple-600 cursor-default"
          >
            <Fingerprint className="h-3.5 w-3.5 text-white" />
            <span className="hidden md:inline">Fingerprint</span>
          </Button>

          <Link href="/dashboard/attendance/qr-kiosk">
            <Button
              variant="ghost"
              size="sm"
              className="h-7 px-2 sm:px-2.5 text-xs rounded-lg gap-1.5 text-zinc-400 hover:text-zinc-200"
            >
              <QrCode className="h-3.5 w-3.5 text-blue-400" />
              <span className="hidden md:inline">QR Code</span>
            </Button>
          </Link>
        </div>

        <div className="flex items-center gap-1.5 sm:gap-2.5">
          {/* Driver Switcher / Status (Desktop) */}
          <div className="hidden md:block">
            <Select
              value={deviceInfo?.driverId || 'virtual'}
              onValueChange={(val) => {
                scannerManager.setActiveDriver(val as ScannerDriverId);
                detectHardware();
              }}
            >
              <SelectTrigger className="h-7 text-xs border-zinc-800 bg-zinc-900 text-zinc-300 w-32">
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

          <Button
            size="icon"
            variant="ghost"
            onClick={() => {
              detectHardware();
              loadRoster();
            }}
            disabled={loadingRoster}
            className="h-7 w-7 text-zinc-400 hover:text-zinc-200"
            title="Refresh Roster & Hardware"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${loadingRoster ? 'animate-spin text-purple-400' : ''}`} />
          </Button>

          <button
            onClick={() => setSoundEnabled(!soundEnabled)}
            className="text-zinc-400 hover:text-zinc-200 transition-colors p-1"
            title={soundEnabled ? 'Mute Chimes' : 'Enable Chimes'}
          >
            {soundEnabled ? <Volume2 className="h-4 w-4 text-purple-400" /> : <VolumeX className="h-4 w-4" />}
          </button>

          <Badge className="bg-purple-600/10 text-purple-300 border-purple-500/30 font-bold px-2 py-0.5 text-xs">
            {todayCount} Today
          </Badge>
        </div>
      </div>

      {/* Main Kiosk Viewport */}
      <div className="flex-1 flex flex-col items-center justify-center relative px-4 py-6 max-w-4xl mx-auto w-full">
        {/* Optical Sensor Prism Stage */}
        <div className="flex flex-col items-center justify-center">
          {/* Circular scanner prism */}
          <div
            onClick={() => handleScanTouch('left_thumb')}
            className={cn(
              'relative h-48 w-48 sm:h-64 sm:w-64 rounded-full border-4 flex flex-col items-center justify-center cursor-pointer transition-all duration-500 group select-none shadow-2xl',
              isScanning
                ? 'border-purple-500 bg-purple-950/20 shadow-[0_0_60px_rgba(168,85,247,0.5)] scale-105'
                : kioskResult.state === 'success'
                ? 'border-green-500 bg-green-950/20 shadow-[0_0_50px_rgba(34,197,94,0.4)]'
                : kioskResult.state === 'already'
                ? 'border-blue-500 bg-blue-950/20 shadow-[0_0_40px_rgba(59,130,246,0.3)]'
                : kioskResult.state === 'expired' || kioskResult.state === 'error'
                ? 'border-red-500 bg-red-950/20 shadow-[0_0_40px_rgba(239,68,68,0.3)]'
                : 'border-zinc-800 bg-zinc-900/60 hover:border-purple-500/60 hover:shadow-[0_0_40px_rgba(168,85,247,0.25)]'
            )}
          >
            {/* Concentric glowing rings */}
            <div className="absolute inset-3 rounded-full border border-dashed border-zinc-800/80 animate-[spin_60s_linear_infinite]" />
            <div className="absolute inset-8 rounded-full border border-zinc-800/50" />

            {/* Glowing biometric fingerprint icon */}
            <Fingerprint
              className={cn(
                'h-20 w-20 sm:h-28 sm:w-28 transition-all duration-300',
                isScanning
                  ? 'text-purple-400 scale-110 animate-pulse'
                  : kioskResult.state === 'success'
                  ? 'text-green-400'
                  : kioskResult.state === 'already'
                  ? 'text-blue-400'
                  : kioskResult.state === 'expired' || kioskResult.state === 'error'
                  ? 'text-red-400'
                  : 'text-zinc-500 group-hover:text-purple-400 group-hover:scale-105'
              )}
            />

            {/* Laser scanning beam */}
            {isScanning && (
              <div className="absolute inset-x-8 h-1 bg-gradient-to-r from-transparent via-purple-300 to-transparent shadow-[0_0_15px_#c084fc] animate-bounce" />
            )}

            {/* Interactive hint on prism */}
            <div className="absolute bottom-6 text-[11px] font-bold tracking-wider uppercase text-zinc-400 group-hover:text-purple-300 transition-colors">
              {isScanning ? 'Verifying...' : 'Touch Sensor'}
            </div>
          </div>

          <p className="text-xs text-zinc-500 mt-4 text-center">
            {deviceInfo?.name} • Place registered left thumb firmly on optical sensor
          </p>
        </div>

        {/* Dynamic Result Banner */}
        <div className="mt-6 w-full max-w-md min-h-[110px] flex items-center justify-center">
          {kioskResult.state === 'idle' && (
            <div className="text-center text-zinc-500 text-xs py-2">
              <span className="inline-flex items-center gap-1.5 bg-zinc-900 border border-zinc-800 px-3 py-1.5 rounded-full">
                <ShieldCheck className="h-3.5 w-3.5 text-purple-400" />
                1:N Optical Minutiae Matcher Active
              </span>
            </div>
          )}

          {kioskResult.state === 'scanning' && (
            <div className="flex items-center gap-3 bg-purple-950/30 border border-purple-800/50 rounded-2xl p-4 w-full animate-in fade-in duration-200">
              <Loader2 className="h-8 w-8 text-purple-400 animate-spin shrink-0" />
              <div>
                <p className="text-purple-300 font-bold text-sm">Scanning Biometrics...</p>
                <p className="text-purple-400/70 text-xs">Matching minutiae against {roster.length} gym members</p>
              </div>
            </div>
          )}

          {kioskResult.state === 'success' && (
            <div className="flex items-center gap-4 bg-green-950/40 border border-green-700/60 rounded-2xl p-4 w-full shadow-xl animate-in fade-in slide-in-from-bottom-2 duration-300">
              <Avatar className="h-14 w-14 border-2 border-green-500/60">
                <AvatarImage src={kioskResult.memberPhoto || ''} />
                <AvatarFallback className="bg-green-900 text-green-200 font-black text-lg">
                  {getInitials(kioskResult.memberName || '')}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <p className="text-green-300 text-lg font-black">{kioskResult.memberName}</p>
                  <Badge className="bg-green-500/20 text-green-300 border-green-500/30 text-[9px]">Verified ✓</Badge>
                </div>
                <div className="flex items-center gap-3 text-xs text-green-400/80 mt-0.5">
                  <span className="font-mono">{kioskResult.memberCode}</span>
                  <span>•</span>
                  <span>{kioskResult.time}</span>
                  {kioskResult.totalDue && kioskResult.totalDue > 0 ? (
                    <>
                      <span>•</span>
                      <span className="text-amber-400 font-bold">₹{kioskResult.totalDue} Due</span>
                    </>
                  ) : null}
                </div>
              </div>
              <CheckCircle2 className="h-9 w-9 text-green-400 shrink-0" />
            </div>
          )}

          {kioskResult.state === 'already' && (
            <div className="flex items-center gap-4 bg-blue-950/40 border border-blue-700/50 rounded-2xl p-4 w-full shadow-xl animate-in fade-in slide-in-from-bottom-2 duration-300">
              <Avatar className="h-14 w-14 border-2 border-blue-500/50">
                <AvatarImage src={kioskResult.memberPhoto || ''} />
                <AvatarFallback className="bg-blue-900 text-blue-200 font-bold text-lg">
                  {getInitials(kioskResult.memberName || '')}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1">
                <p className="text-blue-300 text-base font-bold">{kioskResult.memberName}</p>
                <p className="text-blue-400 text-xs">Already checked in today ✓</p>
                <p className="text-zinc-400 text-[10px] font-mono mt-0.5">{kioskResult.memberCode}</p>
              </div>
              <UserCheck className="h-8 w-8 text-blue-400 shrink-0" />
            </div>
          )}

          {kioskResult.state === 'expired' && (
            <div className="flex items-center gap-4 bg-red-950/40 border border-red-800/60 rounded-2xl p-4 w-full shadow-xl animate-in fade-in slide-in-from-bottom-2 duration-300">
              <Avatar className="h-14 w-14 border-2 border-red-500/50">
                <AvatarImage src={kioskResult.memberPhoto || ''} />
                <AvatarFallback className="bg-red-900 text-red-200 font-bold text-lg">
                  {getInitials(kioskResult.memberName || '')}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1">
                <p className="text-red-300 text-base font-bold">{kioskResult.memberName}</p>
                <p className="text-red-400 text-xs font-semibold">{kioskResult.message}</p>
                <p className="text-zinc-500 text-[10px]">Please renew membership at desk</p>
              </div>
              <AlertTriangle className="h-8 w-8 text-red-400 shrink-0" />
            </div>
          )}

          {kioskResult.state === 'error' && (
            <div className="flex items-center gap-3 bg-red-950/40 border border-red-800/60 rounded-2xl p-4 w-full shadow-xl animate-in fade-in slide-in-from-bottom-2 duration-300">
              <XCircle className="h-8 w-8 text-red-400 shrink-0" />
              <div>
                <p className="text-red-300 font-bold text-sm">Access Denied</p>
                <p className="text-red-400/80 text-xs">{kioskResult.message}</p>
              </div>
            </div>
          )}
        </div>

        {/* Quick Manual Search Fallback */}
        <div className="w-full max-w-md mt-4">
          <div className="relative">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-zinc-500" />
            <Input
              value={manualQuery}
              onChange={(e) => setManualQuery(e.target.value)}
              placeholder="Injured finger? Search name or code..."
              className="pl-9 h-9 bg-zinc-900/60 border-zinc-800 text-xs text-zinc-200 placeholder:text-zinc-600 rounded-xl"
            />
          </div>

          {filteredRoster.length > 0 && (
            <div className="mt-1 bg-zinc-900 border border-zinc-800 rounded-xl p-2 max-h-40 overflow-y-auto space-y-1 shadow-2xl">
              {filteredRoster.slice(0, 4).map((m) => (
                <div
                  key={m.id}
                  onClick={() => handleManualCheckIn(m)}
                  className="flex items-center justify-between p-2 rounded-lg hover:bg-zinc-800 cursor-pointer transition-colors"
                >
                  <div className="flex items-center gap-2">
                    <Avatar className="h-7 w-7">
                      <AvatarImage src={m.photo_url || ''} />
                      <AvatarFallback className="text-[10px] bg-zinc-800 text-zinc-300">
                        {getInitials(m.name)}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="text-xs font-semibold text-zinc-200">{m.name}</p>
                      <p className="text-[10px] text-zinc-500 font-mono">{m.member_code}</p>
                    </div>
                  </div>
                  <Button size="sm" variant="outline" className="h-6 text-[10px] border-zinc-700">
                    Check In
                  </Button>
                </div>
              ))}
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
                  <span className="text-[10px] text-purple-400 font-mono">{item.time}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
