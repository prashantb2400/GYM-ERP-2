'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  QrCode,
  ScanFace,
  CreditCard,
  UserCheck,
  Sparkles,
  Lock,
  Maximize,
  Minimize,
  Volume2,
  VolumeX,
  ArrowLeft,
  CheckCircle2,
  AlertCircle,
  Clock,
  Dumbbell,
  Flame,
  Calendar,
  Phone,
  ShieldCheck,
  ChevronRight,
  RefreshCw,
  X,
  Award,
} from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import { KioskKeypad } from '@/components/kiosk/KioskKeypad';
import { kioskAudio } from '@/components/kiosk/KioskAudio';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { getInitials } from '@/lib/utils/format';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

type KioskScreen = 'attract' | 'menu' | 'checkin' | 'self-serve' | 'guest-trial' | 'admin-pin';
type CheckInMethod = 'keypad' | 'qr' | 'face';

interface GymConfig {
  gymId: string;
  gymName: string;
  businessName: string;
  tagline: string;
  logoUrl: string | null;
  phone: string | null;
  branchName: string | null;
  branchId: string | null;
  workingHours: { open: string; close: string };
  plans: Array<{
    id: string;
    name: string;
    duration_days: number;
    price: number;
    features: string[];
    is_popular: boolean;
  }>;
  announcement: string;
}

interface CheckInResult {
  state: 'success' | 'already' | 'expired' | 'frozen' | 'error';
  message: string;
  time?: string;
  member?: {
    id: string;
    name: string;
    memberCode: string;
    photoUrl?: string;
    status: string;
    daysRemaining: number;
    totalDue: number;
    lockerNumber?: string;
    attendanceCount?: number;
  };
}

interface MemberLookupData {
  id: string;
  name: string;
  memberCode: string;
  phone: string;
  status: string;
  photoUrl?: string;
  currentPlanName: string;
  planStartDate?: string;
  planEndDate?: string;
  daysRemaining: number;
  totalDue: number;
  attendanceCount: number;
  lockerNumber?: string;
}

const INACTIVITY_TIMEOUT_MS = 45000; // 45 seconds idle returns to attract mode
const DEFAULT_STAFF_PIN = '1234';

export default function KioskPage() {
  const router = useRouter();

  // Core State
  const [screen, setScreen] = useState<KioskScreen>('attract');
  const [gymConfig, setGymConfig] = useState<GymConfig | null>(null);
  const [currentTime, setCurrentTime] = useState<string>('');
  const [currentDate, setCurrentDate] = useState<string>('');
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isMuted, setIsMuted] = useState(false);

  // Inactivity Timer
  const inactivityTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Check-In Sub-State
  const [checkInMethod, setCheckInMethod] = useState<CheckInMethod>('keypad');
  const [keypadInput, setKeypadInput] = useState('');
  const [isSubmittingCheckIn, setIsSubmittingCheckIn] = useState(false);
  const [checkInResult, setCheckInResult] = useState<CheckInResult | null>(null);
  const [resetCountdown, setResetCountdown] = useState<number>(0);

  // QR Scanner Sub-State
  const qrScannerRef = useRef<any>(null);
  const [qrActive, setQrActive] = useState(false);

  // Self-Serve & Renew Sub-State
  const [lookupPhone, setLookupPhone] = useState('');
  const [isLookingUp, setIsLookingUp] = useState(false);
  const [lookupError, setLookupError] = useState<string | null>(null);
  const [memberData, setMemberData] = useState<MemberLookupData | null>(null);
  const [selectedPlanForRenewal, setSelectedPlanForRenewal] = useState<any | null>(null);
  const [upiQrPayload, setUpiQrPayload] = useState<{
    upiUri: string;
    amount: number;
    transactionRef: string;
    payeeName: string;
    payeeVpa: string;
  } | null>(null);
  const [paymentVerified, setPaymentVerified] = useState(false);

  // Guest Day Pass Sub-State
  const [guestStep, setGuestStep] = useState<1 | 2 | 3>(1);
  const [guestName, setGuestName] = useState('');
  const [guestPhone, setGuestPhone] = useState('');
  const [guestGoal, setGuestGoal] = useState('Muscle Building');
  const [guestSlot, setGuestSlot] = useState('Morning');
  const [isRegisteringGuest, setIsRegisteringGuest] = useState(false);
  const [guestPassIssued, setGuestPassIssued] = useState<{
    passCode: string;
    guestName: string;
    timestamp: string;
  } | null>(null);

  // Admin PIN Sub-State
  const [enteredPin, setEnteredPin] = useState('');
  const [pinError, setPinError] = useState(false);

  // 1. Clock updates
  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setCurrentTime(
        now.toLocaleTimeString('en-IN', {
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
          hour12: true,
        })
      );
      setCurrentDate(
        now.toLocaleDateString('en-IN', {
          weekday: 'long',
          day: 'numeric',
          month: 'long',
          year: 'numeric',
        })
      );
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  // 2. Fetch Kiosk Config
  const loadKioskConfig = useCallback(async () => {
    try {
      const res = await fetch('/api/kiosk/config');
      if (res.ok) {
        const data = await res.json();
        setGymConfig(data);
      }
    } catch (e) {
      console.error('Failed to load kiosk config:', e);
    }
  }, []);

  useEffect(() => {
    loadKioskConfig();
  }, [loadKioskConfig]);

  // Stop QR scanner
  const stopQrScanner = useCallback(() => {
    if (qrScannerRef.current) {
      try {
        qrScannerRef.current.stop().then(() => {
          qrScannerRef.current = null;
        }).catch(() => {});
      } catch {}
    }
    setQrActive(false);
  }, []);

  // Reset to attract mode completely
  const handleResetToAttract = useCallback(() => {
    stopQrScanner();
    setScreen('attract');
    setKeypadInput('');
    setCheckInResult(null);
    setMemberData(null);
    setUpiQrPayload(null);
    setPaymentVerified(false);
    setGuestStep(1);
    setGuestName('');
    setGuestPhone('');
    setGuestPassIssued(null);
    setEnteredPin('');
    setPinError(false);
  }, [stopQrScanner]);

  // 3. User Activity Reset Handler
  const resetInactivityTimer = useCallback(() => {
    if (inactivityTimerRef.current) {
      clearTimeout(inactivityTimerRef.current);
    }
    // Only auto-reset if NOT on attract screen and NOT waiting on PIN
    if (screen !== 'attract' && screen !== 'admin-pin') {
      inactivityTimerRef.current = setTimeout(() => {
        handleResetToAttract();
      }, INACTIVITY_TIMEOUT_MS);
    }
  }, [screen, handleResetToAttract]);

  useEffect(() => {
    const events = ['touchstart', 'mousedown', 'keydown'];
    const handleActivity = () => resetInactivityTimer();

    events.forEach((evt) => window.addEventListener(evt, handleActivity));
    resetInactivityTimer();

    return () => {
      events.forEach((evt) => window.removeEventListener(evt, handleActivity));
      if (inactivityTimerRef.current) clearTimeout(inactivityTimerRef.current);
    };
  }, [resetInactivityTimer]);

  // Fullscreen helper
  const toggleFullscreen = () => {
    kioskAudio.playTap();
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
      setIsFullscreen(true);
    } else {
      document.exitFullscreen().catch(() => {});
      setIsFullscreen(false);
    }
  };

  const toggleSound = () => {
    const next = !isMuted;
    setIsMuted(next);
    kioskAudio.setSoundEnabled(!next);
    if (!next) kioskAudio.playTap();
  };

  // 4. Check-in Execution
  const executeCheckIn = async (queryValue: string, method: CheckInMethod) => {
    if (!queryValue || !gymConfig?.gymId) return;

    setIsSubmittingCheckIn(true);
    try {
      const res = await fetch('/api/kiosk/check-in', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          gymId: gymConfig.gymId,
          branchId: gymConfig.branchId,
          query: queryValue,
          method: method === 'qr' ? 'qr_scan' : method === 'face' ? 'face_recognition' : 'keypad',
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        kioskAudio.playError();
        setCheckInResult({
          state: 'error',
          message: data.error || 'Check-in failed. Please verify your details.',
        });
      } else {
        if (data.state === 'success') {
          kioskAudio.playSuccess();
        } else if (data.state === 'already') {
          kioskAudio.playError();
        } else {
          kioskAudio.playError();
        }
        setCheckInResult(data);
      }

      // Auto reset countdown after checkin feedback
      setResetCountdown(6);
    } catch (e: any) {
      kioskAudio.playError();
      setCheckInResult({
        state: 'error',
        message: e.message || 'Connection error. Please speak with staff.',
      });
      setResetCountdown(5);
    } finally {
      setIsSubmittingCheckIn(false);
    }
  };

  // Check-in result countdown timer
  useEffect(() => {
    if (!checkInResult || resetCountdown <= 0) return;
    const timer = setTimeout(() => {
      if (resetCountdown === 1) {
        handleResetToAttract();
      } else {
        setResetCountdown((prev) => prev - 1);
      }
    }, 1000);
    return () => clearTimeout(timer);
  }, [checkInResult, resetCountdown]);

  // 5. QR Code Camera Scanner
  const startQrScanner = async () => {
    try {
      setQrActive(true);
      const { Html5Qrcode } = await import('html5-qrcode');
      if (qrScannerRef.current) {
        try {
          await qrScannerRef.current.stop();
        } catch {}
      }

      const scanner = new Html5Qrcode('kiosk-qr-viewport');
      qrScannerRef.current = scanner;

      await scanner.start(
        { facingMode: 'user' },
        { fps: 15, qrbox: { width: 250, height: 250 } },
        (decodedText) => {
          kioskAudio.playTap();
          stopQrScanner();
          executeCheckIn(decodedText, 'qr');
        },
        () => {}
      );
    } catch (err) {
      console.warn('QR camera could not start:', err);
      setQrActive(false);
    }
  };

  // 6. Member Account Lookup
  const handleMemberLookup = async () => {
    if (!lookupPhone || !gymConfig?.gymId) return;
    kioskAudio.playTap();
    setIsLookingUp(true);
    setLookupError(null);

    try {
      const res = await fetch('/api/kiosk/member-lookup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          gymId: gymConfig.gymId,
          query: lookupPhone,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        kioskAudio.playError();
        setLookupError(data.error || 'Member not found');
      } else {
        kioskAudio.playSuccess();
        setMemberData(data.member);
      }
    } catch (e: any) {
      kioskAudio.playError();
      setLookupError('Network error during lookup');
    } finally {
      setIsLookingUp(false);
    }
  };

  // 7. Generate UPI QR Code for Dues or Renewal
  const handleGenerateUpiQr = async (amount: number, purpose: string) => {
    if (!gymConfig?.gymId) return;
    kioskAudio.playTap();
    try {
      const res = await fetch('/api/kiosk/upi-qr', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          gymId: gymConfig.gymId,
          memberId: memberData?.id,
          amount,
          purpose,
        }),
      });

      const data = await res.json();
      if (res.ok) {
        setUpiQrPayload(data);
      }
    } catch (err) {
      console.error('Failed to generate UPI QR:', err);
    }
  };

  // 8. Guest Lead Submission
  const handleRegisterGuest = async () => {
    if (!guestName || !guestPhone || !gymConfig?.gymId) return;
    kioskAudio.playTap();
    setIsRegisteringGuest(true);

    try {
      const res = await fetch('/api/kiosk/lead', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          gymId: gymConfig.gymId,
          branchId: gymConfig.branchId,
          name: guestName,
          phone: guestPhone,
          goal: guestGoal,
          preferredSlot: guestSlot,
        }),
      });

      const data = await res.json();
      if (res.ok) {
        kioskAudio.playCelebration();
        setGuestPassIssued(data);
      } else {
        kioskAudio.playError();
        alert(data.error || 'Failed to generate guest pass');
      }
    } catch {
      kioskAudio.playError();
    } finally {
      setIsRegisteringGuest(false);
    }
  };

  // 9. Admin PIN Verification
  const handleAdminPinKey = (val: string) => {
    setEnteredPin(val);
    setPinError(false);
    if (val.length === 4) {
      if (val === DEFAULT_STAFF_PIN) {
        kioskAudio.playSuccess();
        router.push('/dashboard/attendance');
      } else {
        kioskAudio.playError();
        setPinError(true);
        setTimeout(() => setEnteredPin(''), 600);
      }
    }
  };

  return (
    <main className="relative min-h-[100dvh] flex flex-col justify-between p-4 sm:p-8 bg-[#09090b] text-zinc-100 overflow-hidden">
      {/* Background Machined Grid & Ambient Glow */}
      <div className="absolute inset-0 bg-[radial-gradient(#27272a_1px,transparent_1px)] [background-size:24px_24px] opacity-25 pointer-events-none" />
      <div className="absolute -top-40 left-1/2 -translate-x-1/2 w-[700px] h-[400px] bg-indigo-600/10 rounded-full blur-[140px] pointer-events-none" />

      {/* TOP STATUS DOCK */}
      <header className="relative z-10 flex items-center justify-between border-b border-zinc-800/60 pb-4">
        <div className="flex items-center gap-3">
          {gymConfig?.logoUrl ? (
            <img
              src={gymConfig.logoUrl}
              alt="Logo"
              className="size-10 sm:size-12 rounded-xl object-cover ring-1 ring-white/10"
            />
          ) : (
            <div className="size-10 sm:size-12 rounded-xl bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center font-mono font-bold text-indigo-400">
              GYM
            </div>
          )}
          <div>
            <div className="flex items-center gap-2">
              <h1 className="font-semibold text-lg sm:text-xl tracking-tight text-zinc-100">
                {gymConfig?.gymName || 'GymERP Reception'}
              </h1>
              {gymConfig?.branchName && (
                <Badge variant="outline" className="border-indigo-500/30 text-indigo-400 bg-indigo-500/10 text-xs">
                  {gymConfig.branchName}
                </Badge>
              )}
            </div>
            <p className="text-xs text-zinc-400 font-mono">
              Self-Service Terminal • {currentTime || 'Loading clock...'}
            </p>
          </div>
        </div>

        {/* Controls: Audio, Fullscreen, Secret Staff Unlock */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={toggleSound}
            aria-label="Toggle Audio"
            className="size-11 rounded-xl bg-zinc-900 border border-zinc-800 flex items-center justify-center text-zinc-400 hover:text-zinc-200 active:scale-95 transition-all"
          >
            {isMuted ? <VolumeX className="size-5 text-red-400" /> : <Volume2 className="size-5" />}
          </button>

          <button
            type="button"
            onClick={toggleFullscreen}
            aria-label="Toggle Fullscreen"
            className="size-11 rounded-xl bg-zinc-900 border border-zinc-800 flex items-center justify-center text-zinc-400 hover:text-zinc-200 active:scale-95 transition-all"
          >
            {isFullscreen ? <Minimize className="size-5" /> : <Maximize className="size-5" />}
          </button>

          {/* Secret Staff Exit Button */}
          <button
            type="button"
            onClick={() => {
              kioskAudio.playTap();
              setScreen('admin-pin');
            }}
            title="Staff Exit"
            className="size-11 rounded-xl bg-zinc-900/60 hover:bg-zinc-900 border border-zinc-800/80 flex items-center justify-center text-zinc-500 hover:text-indigo-400 active:scale-95 transition-all"
          >
            <Lock className="size-4" />
          </button>
        </div>
      </header>

      {/* BODY CONTENT ROUTING */}
      <section className="relative z-10 my-auto py-4 sm:py-6 flex flex-col items-center justify-center w-full max-w-5xl mx-auto">
        <AnimatePresence mode="wait">
          {/* =========================================================================
              1. ATTRACT MODE (SCREENSAVER)
             ========================================================================= */}
          {screen === 'attract' && (
            <motion.div
              key="attract"
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.96 }}
              transition={{ duration: 0.3 }}
              onClick={() => {
                kioskAudio.playTap();
                setScreen('menu');
              }}
              className="w-full cursor-pointer flex flex-col items-center text-center space-y-8 py-10"
            >
              {/* Pulsing Hardware Bezel */}
              <div className="relative p-3 rounded-[3rem] bg-zinc-900/40 border border-zinc-800 shadow-2xl backdrop-blur-sm">
                <div className="p-8 sm:p-12 rounded-[2.5rem] bg-gradient-to-b from-zinc-900/90 to-zinc-950 border border-white/5 flex flex-col items-center space-y-4">
                  <div className="size-24 sm:size-28 rounded-3xl bg-indigo-600/10 border border-indigo-500/30 flex items-center justify-center text-indigo-400 shadow-[0_0_40px_rgba(99,102,241,0.15)] animate-pulse">
                    <Dumbbell className="size-12 sm:size-14" />
                  </div>

                  <div className="space-y-2">
                    <h2 className="text-3xl sm:text-5xl font-bold tracking-tight text-white">
                      {gymConfig?.businessName || 'Welcome to GymERP'}
                    </h2>
                    <p className="text-zinc-400 text-base sm:text-lg max-w-lg">
                      {gymConfig?.tagline || 'Crush your goals every single day.'}
                    </p>
                  </div>

                  <div className="pt-4 flex items-center gap-3">
                    <span className="inline-flex size-2 rounded-full bg-emerald-400 animate-ping" />
                    <span className="font-mono text-zinc-400 text-sm">{currentDate}</span>
                  </div>
                </div>
              </div>

              {/* Big Touch CTA */}
              <div className="flex flex-col items-center space-y-3">
                <div className="px-8 py-4 rounded-full bg-indigo-600 hover:bg-indigo-500 active:scale-95 text-white font-medium text-lg sm:text-xl tracking-wide shadow-lg shadow-indigo-600/25 flex items-center gap-3 transition-all">
                  <Sparkles className="size-5" />
                  <span>Tap Screen to Begin</span>
                  <ChevronRight className="size-5" />
                </div>
                <p className="text-zinc-500 text-xs font-mono">
                  Touch anywhere • Express Check-in • Instant Renewals • Guest Passes
                </p>
              </div>
            </motion.div>
          )}

          {/* =========================================================================
              2. KIOSK MAIN DECK (MENU)
             ========================================================================= */}
          {screen === 'menu' && (
            <motion.div
              key="menu"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              transition={{ duration: 0.25 }}
              className="w-full space-y-8"
            >
              <div className="text-center space-y-2">
                <h2 className="text-2xl sm:text-4xl font-bold tracking-tight">
                  How can we help you today?
                </h2>
                <p className="text-zinc-400 text-sm sm:text-base">
                  Select an option below to proceed on this terminal
                </p>
              </div>

              {/* 3 Large Touch Cards */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-4xl mx-auto">
                {/* 1. Fast Check-in */}
                <button
                  type="button"
                  onClick={() => {
                    kioskAudio.playTap();
                    setScreen('checkin');
                  }}
                  className="group relative text-left p-6 sm:p-8 rounded-3xl bg-zinc-900/70 hover:bg-zinc-800/80 active:bg-zinc-800 border border-zinc-800 hover:border-indigo-500/50 active:scale-[0.97] transition-all shadow-xl flex flex-col justify-between min-h-[220px]"
                >
                  <div className="size-14 rounded-2xl bg-indigo-600/10 border border-indigo-500/20 text-indigo-400 flex items-center justify-center group-hover:scale-105 transition-transform">
                    <UserCheck className="size-7" />
                  </div>
                  <div className="space-y-1 pt-6">
                    <h3 className="text-xl font-bold text-white group-hover:text-indigo-300 transition-colors">
                      Member Check-In
                    </h3>
                    <p className="text-xs sm:text-sm text-zinc-400 leading-relaxed">
                      Enter your mobile number, scan your dynamic QR code, or face match.
                    </p>
                  </div>
                </button>

                {/* 2. Account & Renew */}
                <button
                  type="button"
                  onClick={() => {
                    kioskAudio.playTap();
                    setScreen('self-serve');
                  }}
                  className="group relative text-left p-6 sm:p-8 rounded-3xl bg-zinc-900/70 hover:bg-zinc-800/80 active:bg-zinc-800 border border-zinc-800 hover:border-emerald-500/50 active:scale-[0.97] transition-all shadow-xl flex flex-col justify-between min-h-[220px]"
                >
                  <div className="size-14 rounded-2xl bg-emerald-600/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center group-hover:scale-105 transition-transform">
                    <CreditCard className="size-7" />
                  </div>
                  <div className="space-y-1 pt-6">
                    <h3 className="text-xl font-bold text-white group-hover:text-emerald-300 transition-colors">
                      Account & Renew
                    </h3>
                    <p className="text-xs sm:text-sm text-zinc-400 leading-relaxed">
                      Check plan validity, view pending dues, or pay instantly with UPI QR.
                    </p>
                  </div>
                </button>

                {/* 3. New Visitor / Free Pass */}
                <button
                  type="button"
                  onClick={() => {
                    kioskAudio.playTap();
                    setScreen('guest-trial');
                  }}
                  className="group relative text-left p-6 sm:p-8 rounded-3xl bg-zinc-900/70 hover:bg-zinc-800/80 active:bg-zinc-800 border border-zinc-800 hover:border-amber-500/50 active:scale-[0.97] transition-all shadow-xl flex flex-col justify-between min-h-[220px]"
                >
                  <div className="size-14 rounded-2xl bg-amber-600/10 border border-amber-500/20 text-amber-400 flex items-center justify-center group-hover:scale-105 transition-transform">
                    <Flame className="size-7" />
                  </div>
                  <div className="space-y-1 pt-6">
                    <h3 className="text-xl font-bold text-white group-hover:text-amber-300 transition-colors">
                      Free 1-Day Pass
                    </h3>
                    <p className="text-xs sm:text-sm text-zinc-400 leading-relaxed">
                      First time here? Register for an instant day pass & workout today.
                    </p>
                  </div>
                </button>
              </div>

              <div className="text-center pt-4">
                <button
                  type="button"
                  onClick={handleResetToAttract}
                  className="text-xs text-zinc-500 hover:text-zinc-300 font-mono flex items-center gap-1.5 mx-auto"
                >
                  <ArrowLeft className="size-3.5" />
                  <span>Return to idle screen</span>
                </button>
              </div>
            </motion.div>
          )}

          {/* =========================================================================
              3. CHECK-IN SCREEN
             ========================================================================= */}
          {screen === 'checkin' && (
            <motion.div
              key="checkin"
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.98 }}
              className="w-full max-w-xl mx-auto space-y-6"
            >
              <div className="flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => {
                    kioskAudio.playTap();
                    stopQrScanner();
                    setCheckInResult(null);
                    setScreen('menu');
                  }}
                  className="inline-flex items-center gap-2 text-sm text-zinc-400 hover:text-white px-3 py-1.5 rounded-xl bg-zinc-900 border border-zinc-800 active:scale-95"
                >
                  <ArrowLeft className="size-4" />
                  <span>Back to Menu</span>
                </button>
                <span className="text-xs font-mono text-indigo-400">Step 1 of 1 • Touch Check-In</span>
              </div>

              {/* If check-in result is showing */}
              {checkInResult ? (
                <div className="p-1.5 rounded-[2.5rem] bg-zinc-900 border border-zinc-800 shadow-2xl">
                  <div className="p-8 rounded-[2rem] bg-zinc-950 text-center space-y-6">
                    {checkInResult.state === 'success' ? (
                      <div className="size-20 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 flex items-center justify-center mx-auto animate-bounce">
                        <CheckCircle2 className="size-10" />
                      </div>
                    ) : checkInResult.state === 'already' ? (
                      <div className="size-20 rounded-full bg-indigo-500/10 border border-indigo-500/30 text-indigo-400 flex items-center justify-center mx-auto">
                        <UserCheck className="size-10" />
                      </div>
                    ) : (
                      <div className="size-20 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-400 flex items-center justify-center mx-auto">
                        <AlertCircle className="size-10" />
                      </div>
                    )}

                    <div className="space-y-1">
                      <h3 className="text-2xl sm:text-3xl font-bold tracking-tight">
                        {checkInResult.member?.name || 'Check-in Update'}
                      </h3>
                      <p className="text-sm font-mono text-zinc-400">
                        {checkInResult.member?.memberCode ? `ID: ${checkInResult.member.memberCode}` : ''}
                      </p>
                      <p className={cn(
                        'text-base font-medium pt-2',
                        checkInResult.state === 'success' && 'text-emerald-400',
                        checkInResult.state === 'already' && 'text-indigo-400',
                        checkInResult.state === 'expired' && 'text-amber-400',
                        checkInResult.state === 'error' && 'text-red-400'
                      )}>
                        {checkInResult.message}
                      </p>
                    </div>

                    {/* Member telemetry summary */}
                    {checkInResult.member && (
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 p-4 rounded-2xl bg-zinc-900/60 border border-zinc-800/80 font-mono text-xs text-left">
                        <div>
                          <span className="text-zinc-500 block">Plan Validity</span>
                          <span className="font-semibold text-zinc-200">
                            {checkInResult.member.daysRemaining} days left
                          </span>
                        </div>
                        <div>
                          <span className="text-zinc-500 block">Total Workouts</span>
                          <span className="font-semibold text-zinc-200">
                            {checkInResult.member.attendanceCount || 1} sessions
                          </span>
                        </div>
                        <div className="col-span-2 sm:col-span-1">
                          <span className="text-zinc-500 block">Locker Assigned</span>
                          <span className="font-semibold text-zinc-200">
                            {checkInResult.member.lockerNumber || 'General'}
                          </span>
                        </div>
                      </div>
                    )}

                    {/* Expired Action */}
                    {checkInResult.state === 'expired' && (
                      <button
                        type="button"
                        onClick={() => {
                          kioskAudio.playTap();
                          setCheckInResult(null);
                          setLookupPhone(keypadInput);
                          setScreen('self-serve');
                        }}
                        className="w-full py-3.5 rounded-xl bg-amber-600 hover:bg-amber-500 text-white font-medium text-sm flex items-center justify-center gap-2"
                      >
                        <CreditCard className="size-4" />
                        <span>Renew Plan Now at Kiosk</span>
                      </button>
                    )}

                    <div className="pt-2">
                      <p className="text-xs text-zinc-500 font-mono">
                        Returning to screensaver in {resetCountdown}s...
                      </p>
                      <button
                        type="button"
                        onClick={handleResetToAttract}
                        className="mt-2 text-xs text-indigo-400 hover:underline"
                      >
                        Done (Touch to close now)
                      </button>
                    </div>
                  </div>
                </div>
              ) : (
                /* Check-In Input Deck */
                <div className="space-y-6">
                  {/* Method Pills */}
                  <div className="grid grid-cols-2 gap-2 p-1.5 rounded-2xl bg-zinc-900 border border-zinc-800">
                    <button
                      type="button"
                      onClick={() => {
                        kioskAudio.playTap();
                        stopQrScanner();
                        setCheckInMethod('keypad');
                      }}
                      className={cn(
                        'py-2.5 rounded-xl text-xs sm:text-sm font-medium transition-all flex items-center justify-center gap-2',
                        checkInMethod === 'keypad'
                          ? 'bg-zinc-800 text-white shadow-sm'
                          : 'text-zinc-400 hover:text-zinc-200'
                      )}
                    >
                      <Phone className="size-4" />
                      <span>Mobile Number</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        kioskAudio.playTap();
                        setCheckInMethod('qr');
                        startQrScanner();
                      }}
                      className={cn(
                        'py-2.5 rounded-xl text-xs sm:text-sm font-medium transition-all flex items-center justify-center gap-2',
                        checkInMethod === 'qr'
                          ? 'bg-zinc-800 text-white shadow-sm'
                          : 'text-zinc-400 hover:text-zinc-200'
                      )}
                    >
                      <QrCode className="size-4" />
                      <span>Scan QR Code</span>
                    </button>
                  </div>

                  {/* Mode A: Tactile Keypad */}
                  {checkInMethod === 'keypad' && (
                    <div className="space-y-5">
                      {/* Input Display */}
                      <div className="h-16 rounded-2xl bg-zinc-900/90 border border-zinc-800 flex items-center justify-center px-6 text-2xl sm:text-3xl font-mono tracking-widest text-white shadow-inner">
                        {keypadInput ? (
                          <span>{keypadInput}</span>
                        ) : (
                          <span className="text-zinc-600 text-lg font-sans tracking-normal">
                            Enter 10-digit mobile number
                          </span>
                        )}
                      </div>

                      {/* Numeric Keypad */}
                      <KioskKeypad
                        value={keypadInput}
                        onChange={setKeypadInput}
                        maxLength={10}
                        disabled={isSubmittingCheckIn}
                      />

                      {/* Submit Action */}
                      <button
                        type="button"
                        disabled={keypadInput.length < 10 || isSubmittingCheckIn}
                        onClick={() => executeCheckIn(keypadInput, 'keypad')}
                        className="w-full h-14 rounded-2xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 disabled:hover:bg-indigo-600 text-white font-medium text-lg flex items-center justify-center gap-2 shadow-lg shadow-indigo-600/20 active:scale-[0.98] transition-all"
                      >
                        {isSubmittingCheckIn ? (
                          <>
                            <RefreshCw className="size-5 animate-spin" />
                            <span>Verifying...</span>
                          </>
                        ) : (
                          <>
                            <UserCheck className="size-5" />
                            <span>Confirm Check-In</span>
                          </>
                        )}
                      </button>
                    </div>
                  )}

                  {/* Mode B: QR Scanner */}
                  {checkInMethod === 'qr' && (
                    <div className="space-y-4 text-center">
                      <div className="relative w-full aspect-square max-w-[320px] mx-auto rounded-3xl overflow-hidden border-2 border-dashed border-zinc-700 bg-zinc-950 flex items-center justify-center">
                        <div id="kiosk-qr-viewport" className="w-full h-full" />
                        {!qrActive && (
                          <div className="absolute inset-0 flex flex-col items-center justify-center p-6 text-zinc-400 bg-zinc-950/80">
                            <QrCode className="size-12 mb-3 text-indigo-400" />
                            <p className="text-sm font-medium">Initializing camera...</p>
                            <button
                              type="button"
                              onClick={startQrScanner}
                              className="mt-3 text-xs text-indigo-400 underline"
                            >
                              Restart Camera
                            </button>
                          </div>
                        )}
                      </div>
                      <p className="text-xs text-zinc-400">
                        Hold your GymERP dynamic QR code pass up to the camera
                      </p>
                    </div>
                  )}
                </div>
              )}
            </motion.div>
          )}

          {/* =========================================================================
              4. MEMBER SELF-SERVE & PLAN RENEWAL WITH DYNAMIC UPI QR
             ========================================================================= */}
          {screen === 'self-serve' && (
            <motion.div
              key="self-serve"
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.98 }}
              className="w-full max-w-xl mx-auto space-y-6"
            >
              <div className="flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => {
                    kioskAudio.playTap();
                    setMemberData(null);
                    setUpiQrPayload(null);
                    setScreen('menu');
                  }}
                  className="inline-flex items-center gap-2 text-sm text-zinc-400 hover:text-white px-3 py-1.5 rounded-xl bg-zinc-900 border border-zinc-800 active:scale-95"
                >
                  <ArrowLeft className="size-4" />
                  <span>Back to Menu</span>
                </button>
                <span className="text-xs font-mono text-emerald-400">Account & Renewal Terminal</span>
              </div>

              {!memberData ? (
                /* Step 1: Look up account */
                <div className="space-y-5">
                  <div className="text-center space-y-1">
                    <h3 className="text-xl font-bold">Lookup Your Membership</h3>
                    <p className="text-xs text-zinc-400">Enter your registered 10-digit mobile number</p>
                  </div>

                  <div className="h-16 rounded-2xl bg-zinc-900/90 border border-zinc-800 flex items-center justify-center px-6 text-2xl font-mono tracking-widest text-white">
                    {lookupPhone || <span className="text-zinc-600 text-base font-sans">Mobile number</span>}
                  </div>

                  {lookupError && (
                    <p className="text-sm text-center text-red-400">{lookupError}</p>
                  )}

                  <KioskKeypad
                    value={lookupPhone}
                    onChange={setLookupPhone}
                    maxLength={10}
                    disabled={isLookingUp}
                  />

                  <button
                    type="button"
                    disabled={lookupPhone.length < 10 || isLookingUp}
                    onClick={handleMemberLookup}
                    className="w-full h-14 rounded-2xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 text-white font-medium text-lg flex items-center justify-center gap-2 shadow-lg active:scale-[0.98] transition-all"
                  >
                    {isLookingUp ? (
                      <>
                        <RefreshCw className="size-5 animate-spin" />
                        <span>Searching...</span>
                      </>
                    ) : (
                      <>
                        <CreditCard className="size-5" />
                        <span>Find Account</span>
                      </>
                    )}
                  </button>
                </div>
              ) : (
                /* Step 2: Member Account Details & Renewal */
                <div className="space-y-6">
                  {/* Member Overview Card */}
                  <div className="p-6 rounded-3xl bg-zinc-900/90 border border-zinc-800 space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <Avatar className="size-14 rounded-2xl border border-zinc-700">
                          <AvatarImage src={memberData.photoUrl || ''} />
                          <AvatarFallback className="bg-indigo-600/30 text-indigo-300 font-bold">
                            {getInitials(memberData.name)}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <h4 className="font-bold text-lg text-white">{memberData.name}</h4>
                          <p className="text-xs font-mono text-zinc-400">
                            {memberData.memberCode} • {memberData.phone}
                          </p>
                        </div>
                      </div>
                      <Badge
                        variant="outline"
                        className={cn(
                          'capitalize',
                          memberData.status === 'active'
                            ? 'border-emerald-500/30 text-emerald-400 bg-emerald-500/10'
                            : 'border-amber-500/30 text-amber-400 bg-amber-500/10'
                        )}
                      >
                        {memberData.status}
                      </Badge>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 pt-2 font-mono text-xs">
                      <div className="p-3 rounded-xl bg-zinc-950/60 border border-zinc-800/60">
                        <span className="text-zinc-500 block">Current Plan</span>
                        <span className="font-bold text-zinc-200">{memberData.currentPlanName}</span>
                      </div>
                      <div className="p-3 rounded-xl bg-zinc-950/60 border border-zinc-800/60">
                        <span className="text-zinc-500 block">Days Left</span>
                        <span className="font-bold text-indigo-400">{memberData.daysRemaining} days</span>
                      </div>
                      <div className="p-3 rounded-xl bg-zinc-950/60 border border-zinc-800/60 col-span-2 sm:col-span-1">
                        <span className="text-zinc-500 block">Pending Due</span>
                        <span className={cn('font-bold', memberData.totalDue > 0 ? 'text-amber-400' : 'text-emerald-400')}>
                          ₹{memberData.totalDue.toLocaleString('en-IN')}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* UPI QR Payment Modal / Overlay */}
                  {upiQrPayload ? (
                    <div className="p-6 rounded-3xl bg-zinc-950 border border-emerald-500/30 text-center space-y-4 shadow-2xl">
                      <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
                        <div className="text-left">
                          <h4 className="font-bold text-base text-white">Scan & Pay via UPI</h4>
                          <p className="text-xs text-zinc-400 font-mono">
                            Ref: {upiQrPayload.transactionRef}
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            kioskAudio.playTap();
                            setUpiQrPayload(null);
                          }}
                          className="size-8 rounded-lg bg-zinc-900 flex items-center justify-center text-zinc-400 hover:text-white"
                        >
                          <X className="size-4" />
                        </button>
                      </div>

                      {/* The QR Code */}
                      <div className="p-4 bg-white rounded-2xl inline-block shadow-lg mx-auto">
                        <QRCodeSVG value={upiQrPayload.upiUri} size={220} level="M" />
                      </div>

                      <div className="space-y-1">
                        <div className="text-3xl font-mono font-bold text-emerald-400">
                          ₹{upiQrPayload.amount.toLocaleString('en-IN')}
                        </div>
                        <p className="text-xs text-zinc-400">
                          Compatible with Google Pay, PhonePe, Paytm, BHIM, and any UPI app
                        </p>
                      </div>

                      {paymentVerified ? (
                        <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 flex items-center justify-center gap-2">
                          <CheckCircle2 className="size-5" />
                          <span className="font-medium">Payment confirmed! Receipt sent via WhatsApp.</span>
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={() => {
                            kioskAudio.playCelebration();
                            setPaymentVerified(true);
                          }}
                          className="w-full py-3.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-medium text-sm flex items-center justify-center gap-2 shadow-lg shadow-emerald-600/20 active:scale-95 transition-all"
                        >
                          <CheckCircle2 className="size-4" />
                          <span>I Have Completed Payment</span>
                        </button>
                      )}
                    </div>
                  ) : (
                    /* Actions: Pay Due or Renew */
                    <div className="space-y-3">
                      {memberData.totalDue > 0 && (
                        <button
                          type="button"
                          onClick={() => handleGenerateUpiQr(memberData.totalDue, 'Clear Outstanding Balance')}
                          className="w-full py-4 rounded-2xl bg-amber-600 hover:bg-amber-500 text-white font-medium text-base flex items-center justify-between px-6 shadow-lg shadow-amber-600/20 active:scale-95 transition-all"
                        >
                          <div className="text-left">
                            <span className="block font-bold">Clear Due Balance</span>
                            <span className="text-xs opacity-90">Pay pending fees immediately</span>
                          </div>
                          <span className="font-mono text-xl font-bold">
                            ₹{memberData.totalDue.toLocaleString('en-IN')} →
                          </span>
                        </button>
                      )}

                      {/* Renewal Plans */}
                      <div className="space-y-2 pt-2">
                        <h5 className="text-xs font-mono uppercase tracking-wider text-zinc-400">
                          Available Renewal Plans
                        </h5>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          {gymConfig?.plans.map((p) => (
                            <button
                              key={p.id}
                              type="button"
                              onClick={() => handleGenerateUpiQr(p.price, `Renew ${p.name}`)}
                              className="p-4 rounded-2xl bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 hover:border-indigo-500/40 text-left space-y-2 active:scale-95 transition-all"
                            >
                              <div className="flex items-center justify-between">
                                <span className="font-bold text-sm text-white">{p.name}</span>
                                <span className="font-mono text-emerald-400 font-bold">
                                  ₹{p.price.toLocaleString('en-IN')}
                                </span>
                              </div>
                              <p className="text-xs text-zinc-500 font-mono">
                                {p.duration_days} Days Validity
                              </p>
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </motion.div>
          )}

          {/* =========================================================================
              5. GUEST / WALK-IN FREE TRIAL PASS
             ========================================================================= */}
          {screen === 'guest-trial' && (
            <motion.div
              key="guest-trial"
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.98 }}
              className="w-full max-w-xl mx-auto space-y-6"
            >
              <div className="flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => {
                    kioskAudio.playTap();
                    setScreen('menu');
                  }}
                  className="inline-flex items-center gap-2 text-sm text-zinc-400 hover:text-white px-3 py-1.5 rounded-xl bg-zinc-900 border border-zinc-800 active:scale-95"
                >
                  <ArrowLeft className="size-4" />
                  <span>Back to Menu</span>
                </button>
                <span className="text-xs font-mono text-amber-400">Free 1-Day Pass Registration</span>
              </div>

              {guestPassIssued ? (
                /* Pass Activated Card */
                <div className="p-1.5 rounded-[2.5rem] bg-gradient-to-b from-amber-500/20 to-zinc-900 border border-amber-500/40 shadow-2xl">
                  <div className="p-8 rounded-[2rem] bg-zinc-950 text-center space-y-6">
                    <div className="size-20 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-400 flex items-center justify-center mx-auto animate-pulse">
                      <Award className="size-10" />
                    </div>

                    <div className="space-y-1">
                      <h3 className="text-2xl sm:text-3xl font-bold tracking-tight text-white">
                        Day Pass Activated!
                      </h3>
                      <p className="text-zinc-400 text-sm">
                        Welcome, {guestPassIssued.guestName}! Show this ticket to our floor trainer.
                      </p>
                    </div>

                    <div className="p-4 rounded-2xl bg-zinc-900 border border-zinc-800 inline-block font-mono">
                      <span className="text-xs text-zinc-500 block">PASS NUMBER</span>
                      <span className="text-3xl font-bold tracking-widest text-amber-400">
                        {guestPassIssued.passCode}
                      </span>
                      <span className="text-[10px] text-zinc-500 block mt-1">Valid Today Only</span>
                    </div>

                    <button
                      type="button"
                      onClick={handleResetToAttract}
                      className="w-full py-3.5 rounded-xl bg-amber-600 hover:bg-amber-500 text-white font-medium text-sm flex items-center justify-center gap-2"
                    >
                      <span>Done • Start Workout</span>
                    </button>
                  </div>
                </div>
              ) : (
                /* 3-Step Touch Registration */
                <div className="space-y-5">
                  <div className="text-center space-y-1">
                    <h3 className="text-xl font-bold">Get Your Free 1-Day Trial Pass</h3>
                    <p className="text-xs text-zinc-400">Experience our equipment, trainers, and facility</p>
                  </div>

                  {guestStep === 1 && (
                    <div className="space-y-4">
                      <div>
                        <label className="text-xs text-zinc-400 font-mono block mb-1.5">Your Full Name</label>
                        <input
                          type="text"
                          value={guestName}
                          onChange={(e) => setGuestName(e.target.value)}
                          placeholder="e.g. Rahul Sharma"
                          className="w-full h-14 rounded-2xl bg-zinc-900 border border-zinc-800 px-4 text-lg text-white focus:outline-none focus:border-amber-500"
                        />
                      </div>

                      <div>
                        <label className="text-xs text-zinc-400 font-mono block mb-1.5">10-Digit Mobile Phone</label>
                        <input
                          type="tel"
                          value={guestPhone}
                          onChange={(e) => setGuestPhone(e.target.value)}
                          placeholder="9876543210"
                          maxLength={10}
                          className="w-full h-14 rounded-2xl bg-zinc-900 border border-zinc-800 px-4 text-lg font-mono text-white focus:outline-none focus:border-amber-500"
                        />
                      </div>

                      <button
                        type="button"
                        disabled={!guestName.trim() || guestPhone.length < 10}
                        onClick={() => {
                          kioskAudio.playTap();
                          setGuestStep(2);
                        }}
                        className="w-full h-14 rounded-2xl bg-amber-600 hover:bg-amber-500 disabled:opacity-40 text-white font-medium text-base flex items-center justify-center gap-2 shadow-lg"
                      >
                        <span>Next: Select Goal</span>
                        <ChevronRight className="size-4" />
                      </button>
                    </div>
                  )}

                  {guestStep === 2 && (
                    <div className="space-y-4">
                      <label className="text-xs text-zinc-400 font-mono block">Primary Fitness Goal</label>
                      <div className="grid grid-cols-2 gap-3">
                        {['Fat Loss & Toning', 'Muscle Building', 'Strength & Conditioning', 'General Health'].map((g) => (
                          <button
                            key={g}
                            type="button"
                            onClick={() => {
                              kioskAudio.playTap();
                              setGuestGoal(g);
                              setGuestStep(3);
                            }}
                            className={cn(
                              'p-4 rounded-2xl border text-left text-sm font-medium transition-all active:scale-95',
                              guestGoal === g
                                ? 'bg-amber-500/10 border-amber-500 text-amber-300'
                                : 'bg-zinc-900 border-zinc-800 text-zinc-300 hover:bg-zinc-800'
                            )}
                          >
                            {g}
                          </button>
                        ))}
                      </div>

                      <button
                        type="button"
                        onClick={() => setGuestStep(1)}
                        className="text-xs text-zinc-500 hover:text-zinc-300 flex items-center gap-1 mx-auto"
                      >
                        <ArrowLeft className="size-3" />
                        <span>Back</span>
                      </button>
                    </div>
                  )}

                  {guestStep === 3 && (
                    <div className="space-y-5">
                      <label className="text-xs text-zinc-400 font-mono block">Preferred Workout Time</label>
                      <div className="grid grid-cols-3 gap-3">
                        {['Morning (6AM - 11AM)', 'Afternoon (11AM - 4PM)', 'Evening (4PM - 10PM)'].map((slot) => (
                          <button
                            key={slot}
                            type="button"
                            onClick={() => {
                              kioskAudio.playTap();
                              setGuestSlot(slot);
                            }}
                            className={cn(
                              'p-4 rounded-2xl border text-center text-xs font-medium transition-all active:scale-95',
                              guestSlot === slot
                                ? 'bg-amber-500/10 border-amber-500 text-amber-300'
                                : 'bg-zinc-900 border-zinc-800 text-zinc-300 hover:bg-zinc-800'
                            )}
                          >
                            {slot}
                          </button>
                        ))}
                      </div>

                      <button
                        type="button"
                        disabled={isRegisteringGuest}
                        onClick={handleRegisterGuest}
                        className="w-full h-14 rounded-2xl bg-amber-600 hover:bg-amber-500 text-white font-medium text-lg flex items-center justify-center gap-2 shadow-lg active:scale-95 transition-all"
                      >
                        {isRegisteringGuest ? (
                          <>
                            <RefreshCw className="size-5 animate-spin" />
                            <span>Issuing Pass...</span>
                          </>
                        ) : (
                          <>
                            <Award className="size-5" />
                            <span>Issue Free Day Pass</span>
                          </>
                        )}
                      </button>
                    </div>
                  )}
                </div>
              )}
            </motion.div>
          )}

          {/* =========================================================================
              6. ADMIN PIN LOCKDOWN MODAL
             ========================================================================= */}
          {screen === 'admin-pin' && (
            <motion.div
              key="admin-pin"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-sm mx-auto space-y-6 text-center"
            >
              <div className="space-y-1">
                <div className="size-12 rounded-2xl bg-zinc-900 border border-zinc-800 flex items-center justify-center text-indigo-400 mx-auto mb-3">
                  <Lock className="size-6" />
                </div>
                <h3 className="text-xl font-bold text-white">Staff Security PIN</h3>
                <p className="text-xs text-zinc-400">
                  Enter 4-digit PIN to exit kiosk mode (Default: 1234)
                </p>
              </div>

              {/* PIN Bullets Display */}
              <div className="flex justify-center gap-4 py-2">
                {[0, 1, 2, 3].map((i) => (
                  <div
                    key={i}
                    className={cn(
                      'size-4 rounded-full border transition-all duration-150',
                      enteredPin.length > i
                        ? pinError
                          ? 'bg-red-500 border-red-500'
                          : 'bg-indigo-500 border-indigo-500'
                        : 'border-zinc-700 bg-zinc-900'
                    )}
                  />
                ))}
              </div>

              {pinError && <p className="text-xs text-red-400 font-mono">Incorrect Security PIN</p>}

              {/* PIN Keypad */}
              <KioskKeypad
                value={enteredPin}
                onChange={handleAdminPinKey}
                maxLength={4}
              />

              <button
                type="button"
                onClick={() => {
                  kioskAudio.playTap();
                  setEnteredPin('');
                  setScreen('menu');
                }}
                className="text-xs text-zinc-500 hover:text-zinc-300 font-mono"
              >
                Cancel & Return
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </section>

      {/* FOOTER TICKER */}
      <footer className="relative z-10 border-t border-zinc-800/60 pt-4 flex flex-col sm:flex-row items-center justify-between text-xs text-zinc-500 font-mono gap-2">
        <div className="flex items-center gap-2">
          <span className="size-2 rounded-full bg-emerald-500 inline-block" />
          <span>TERMINAL ONLINE</span>
          <span>•</span>
          <span>Kiosk ID: {gymConfig?.branchId ? `BR-${gymConfig.branchId.slice(0, 6)}` : 'HQ-MAIN'}</span>
        </div>
        <div>
          {gymConfig?.announcement || 'Consistency beats motivation. Every rep counts.'}
        </div>
      </footer>
    </main>
  );
}
