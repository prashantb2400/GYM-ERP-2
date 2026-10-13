'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Camera,
  Scan,
  UserCheck,
  CreditCard,
  Printer,
  Sparkles,
  Lock,
  Volume2,
  VolumeX,
  Maximize,
  Minimize,
  CheckCircle2,
  AlertCircle,
  Dumbbell,
  ArrowRight,
  ArrowLeft,
  RefreshCw,
  Award,
  Flame,
  FileText,
  Utensils,
  ChevronRight,
  X,
  Tablet,
  QrCode,
  Mic,
  MicOff,
} from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import { WaterVoiceOrb, WaterOrbState } from '@/components/kiosk/WaterVoiceOrb';
import { KioskDocumentScanner } from '@/components/kiosk/KioskDocumentScanner';
import { KioskKeypad } from '@/components/kiosk/KioskKeypad';
import { KioskPlateCalculator } from '@/components/kiosk/KioskPlateCalculator';
import { kioskAudio } from '@/components/kiosk/KioskAudio';
import { voiceAgent, type VoiceSpeechEvent } from '@/lib/kiosk/voice-agent';
import { parseKioskVoiceIntent } from '@/lib/kiosk/voice-intent';
import { KioskSpeechRecognizer } from '@/lib/kiosk/speech-listener';
import { calculateBarbellPlates } from '@/lib/workout/plate-calculator';
import { VoiceCaptionBubble } from '@/components/kiosk/VoiceCaptionBubble';
import { Ripple } from '@/components/magicui/ripple';
import { visionWatchdog, WatchdogMatchResult } from '@/lib/kiosk/vision-watchdog';
import { kioskPrinter } from '@/lib/kiosk/printer-driver';
import { KycExtractedData, MemberFitnessProfile, GeneratedBlueprint } from '@/lib/server/llm';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { DoubleBezelCard } from '@/components/ui/card';
import { Button, ButtonIslandIcon } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { getInitials } from '@/lib/utils/format';
import { useRouter } from 'next/navigation';

const appleSpringTransition = {
  type: 'spring' as const,
  stiffness: 340,
  damping: 28,
  mass: 0.8,
};

type KioskStage =
  | 'pairing'
  | 'ambient_idle'
  | 'member_matched'
  | 'guest_detected'
  | 'portrait_capture'
  | 'kyc_document_scan'
  | 'fitness_profiling'
  | 'upi_payment'
  | 'printing_packet'
  | 'admin_pin';

const KIOSK_TOKEN_KEY = 'gymerp_kiosk_device_token';

export default function SingleScreenVoiceKioskPage() {
  const router = useRouter();

  // Stage & Hardware State
  const [stage, setStage] = useState<KioskStage>('ambient_idle');
  const [currentTime, setCurrentTime] = useState('');
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [audioPerturbation, setAudioPerturbation] = useState(0);
  const [voiceEvent, setVoiceEvent] = useState<VoiceSpeechEvent>({
    isSpeaking: false,
    phrase: '',
    currentWord: '',
    charIndex: 0,
    audioLevel: 0,
  });

  // Subscribe to voice agent real-time speech and acoustic events
  useEffect(() => {
    const unsubscribe = voiceAgent.subscribe((event) => {
      setVoiceEvent(event);
      setAudioPerturbation(event.audioLevel);
    });
    return unsubscribe;
  }, []);

  // Device Pairing State
  const [pairingCode, setPairingCode] = useState<string | null>(null);
  const [pairingQr, setPairingQr] = useState<string | null>(null);
  const [deviceInfo, setDeviceInfo] = useState<any | null>(null);
  const [gymConfig, setGymConfig] = useState<any | null>(null);

  // Vision Watchdog
  const videoFeedRef = useRef<HTMLVideoElement | null>(null);
  const [cameraActive, setCameraActive] = useState(false);
  const [matchedMember, setMatchedMember] = useState<any | null>(null);
  const [autoResetSeconds, setAutoResetSeconds] = useState(0);

  // Workout, Plate Calculator & Voice Query State
  const [matchedWorkout, setMatchedWorkout] = useState<any | null>(null);
  const [isPlateModalOpen, setIsPlateModalOpen] = useState(false);
  const [plateModalWeight, setPlateModalWeight] = useState(80);
  const [isListeningSpeech, setIsListeningSpeech] = useState(false);
  const [recognizedVoiceQuery, setRecognizedVoiceQuery] = useState<string | null>(null);
  const speechRecognizerRef = useRef<KioskSpeechRecognizer | null>(null);

  // Registration & KYC
  const [memberPhoto, setMemberPhoto] = useState<string | null>(null);
  const [kycResult, setKycResult] = useState<KycExtractedData | null>(null);
  const [nameInput, setNameInput] = useState('');
  const [phoneInput, setPhoneInput] = useState('');
  const [goal, setGoal] = useState<'fat_loss' | 'muscle_gain' | 'strength' | 'general_fitness'>('muscle_gain');
  const [diet, setDiet] = useState<'vegetarian' | 'eggetarian' | 'non_vegetarian' | 'vegan'>('vegetarian');
  const [slot, setSlot] = useState('Morning');

  // Plan & Payment
  const [chosenPlan, setChosenPlan] = useState<any | null>(null);
  const [upiQrUri, setUpiQrUri] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);

  // Admin PIN
  const [adminPin, setAdminPin] = useState('');
  const [pinError, setPinError] = useState(false);

  // 1. Clock
  useEffect(() => {
    const update = () => {
      setCurrentTime(
        new Date().toLocaleTimeString('en-IN', {
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
          hour12: true,
        })
      );
    };
    update();
    const interval = setInterval(update, 1000);
    return () => clearInterval(interval);
  }, []);

  // 2. Kiosk Pairing & Configuration
  const pollTimerRef = useRef<NodeJS.Timeout | null>(null);

  const loadGymConfig = useCallback(async (gymId?: string, branchId?: string) => {
    try {
      const url = gymId ? `/api/kiosk/config?gymId=${gymId}${branchId ? `&branchId=${branchId}` : ''}` : '/api/kiosk/config';
      const res = await fetch(url);
      if (res.ok) {
        const cfg = await res.json();
        setGymConfig(cfg);
      }
    } catch {}
  }, []);

  const startPairingPoll = useCallback((code: string) => {
    if (pollTimerRef.current) clearInterval(pollTimerRef.current);

    pollTimerRef.current = setInterval(async () => {
      try {
        const res = await fetch(`/api/kiosk/pair/status?code=${encodeURIComponent(code)}`);
        const data = await res.json();

        if (res.ok && data.status === 'active' && data.deviceToken) {
          clearInterval(pollTimerRef.current!);
          localStorage.setItem(KIOSK_TOKEN_KEY, data.deviceToken);
          setDeviceInfo(data);
          loadGymConfig(data.gymId, data.branchId);

          kioskAudio.playCelebration();
          voiceAgent.speak(`Tablet successfully connected to ${data.gymName}!`);
          setStage('ambient_idle');
        }
      } catch {}
    }, 3000);
  }, [loadGymConfig]);

  const initNewPairing = useCallback(async () => {
    setStage('pairing');
    try {
      const res = await fetch('/api/kiosk/pair/init', { method: 'POST' });
      const data = await res.json();
      if (res.ok && data.pairingCode) {
        setPairingCode(data.pairingCode);
        setPairingQr(data.qrPayload);
        startPairingPoll(data.pairingCode);
      }
    } catch (e) {
      console.error('Pairing init failure:', e);
    }
  }, [startPairingPoll]);

  useEffect(() => {
    return () => {
      if (pollTimerRef.current) clearInterval(pollTimerRef.current);
    };
  }, []);

  // 3. Check Device Pairing on Mount
  useEffect(() => {
    async function verifyPairing() {
      let savedToken = typeof window !== 'undefined' ? localStorage.getItem(KIOSK_TOKEN_KEY) : null;

      if (!savedToken && typeof window !== 'undefined') {
        const urlParams = new URLSearchParams(window.location.search);
        const urlToken = urlParams.get('token');
        if (urlToken) {
          savedToken = urlToken.trim();
          localStorage.setItem(KIOSK_TOKEN_KEY, savedToken);
        }
      }

      if (!savedToken) {
        initNewPairing();
        return;
      }

      try {
        const res = await fetch(`/api/kiosk/pair/status?token=${encodeURIComponent(savedToken)}`);
        const data = await res.json();

        if (res.ok && data.status === 'active') {
          setDeviceInfo(data);
          loadGymConfig(data.gymId, data.branchId);
          setStage('ambient_idle');
        } else {
          // Token revoked or expired -> initiate fresh pairing
          localStorage.removeItem(KIOSK_TOKEN_KEY);
          initNewPairing();
        }
      } catch {
        // Network hiccup: assume cached credentials
        setStage('ambient_idle');
      }
    }

    verifyPairing();
  }, [initNewPairing, loadGymConfig]);

  // 4. Fetch Member Workout Routine
  const fetchMemberWorkout = useCallback(async (memberId: string) => {
    try {
      const gymId = gymConfig?.gymId || deviceInfo?.gymId;
      if (!gymId) return;

      const savedToken = typeof window !== 'undefined' ? localStorage.getItem(KIOSK_TOKEN_KEY) : null;
      const res = await fetch(`/api/kiosk/today-workout?gymId=${gymId}&memberId=${memberId}`, {
        headers: {
          ...(savedToken ? { 'x-device-token': savedToken } : {}),
        },
      });

      if (res.ok) {
        const data = await res.json();
        if (data.success) {
          setMatchedWorkout(data);
        }
      }
    } catch (err) {
      console.warn('Failed to load workout for matched member:', err);
    }
  }, [gymConfig, deviceInfo]);

  // 5. Speech Recognition & Voice Intent Handler
  const handleVoiceTranscript = useCallback((transcript: string, isFinal: boolean) => {
    if (!isFinal || !transcript) return;
    setRecognizedVoiceQuery(transcript);

    const intent = parseKioskVoiceIntent(transcript);

    if (intent.type === 'plates') {
      setPlateModalWeight(intent.targetWeight);
      setIsPlateModalOpen(true);
      const calc = calculateBarbellPlates(intent.targetWeight, { unit: intent.unit });
      voiceAgent.speakPlateLoading(calc);
    } else if (intent.type === 'workout') {
      if (matchedMember && matchedWorkout) {
        voiceAgent.speakTodayWorkout(
          matchedMember.name,
          matchedWorkout.routineName,
          matchedWorkout.dayName,
          matchedWorkout.exerciseCount,
          matchedWorkout.firstExercise
        );
      } else if (matchedMember) {
        voiceAgent.speak(`Checking your workout routine, ${matchedMember.name}...`);
        fetchMemberWorkout(matchedMember.id);
      } else {
        voiceAgent.speak('Please look directly at the camera so I can verify your profile and show your workout.');
      }
    } else if (intent.type === 'help') {
      voiceAgent.speakHelp();
    } else if (intent.type === 'checkin') {
      voiceAgent.speak('Please look directly at the camera or enter your Member ID on the keypad to check in.');
    }
  }, [matchedMember, matchedWorkout, fetchMemberWorkout]);

  const handlePrintCheckInSlip = useCallback(async () => {
    if (!matchedMember) return;
    try {
      const now = new Date();
      const dateStr = now.toLocaleDateString('en-IN', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
      });
      const timeStr = now.toLocaleTimeString('en-IN', {
        hour: '2-digit',
        minute: '2-digit',
      });

      const slipPayload = {
        gymName: gymConfig?.businessName || deviceInfo?.gymName || 'GymERP Fitness Club',
        branchName: deviceInfo?.branchName || undefined,
        gymPhone: gymConfig?.phone || undefined,
        memberName: matchedMember.name,
        memberCode: matchedMember.memberCode,
        date: dateStr,
        checkInTime: timeStr,
        lockerNumber: matchedMember.lockerNumber || undefined,
        daysRemaining: matchedMember.daysRemaining,
        qrPassData: `GYMPASS:${matchedMember.id || matchedMember.memberCode}:${Date.now()}`,
        workout: matchedWorkout
          ? {
              dayName: matchedWorkout.dayName,
              exercises: (matchedWorkout.exercises || []).map((ex: any) => ({
                name: ex.exerciseName || ex.name || 'Exercise',
                sets: ex.sets,
                reps: ex.reps,
                targetWeightKg: ex.targetWeightKg,
              })),
            }
          : undefined,
        paperWidth: 80 as const,
      };

      const escPosData = kioskPrinter.generateEscPosCheckInSlip(slipPayload);
      const bridgeSent = await kioskPrinter.sendToHardwareBridge(escPosData);
      if (!bridgeSent) {
        const usbSent = await kioskPrinter.directWebUsbPrint(escPosData);
        if (!usbSent) {
          kioskPrinter.printCheckInSlipA4(slipPayload);
        }
      }
    } catch (err) {
      console.warn('Check-in slip printing error:', err);
    }
  }, [matchedMember, matchedWorkout, gymConfig, deviceInfo]);

  const toggleSpeechListening = useCallback(() => {
    kioskAudio.playTap();
    if (!speechRecognizerRef.current) {
      speechRecognizerRef.current = new KioskSpeechRecognizer({ continuous: false, interimResults: false });
    }

    const recognizer = speechRecognizerRef.current;
    if (isListeningSpeech) {
      recognizer.stop();
      setIsListeningSpeech(false);
    } else {
      const started = recognizer.start(
        (transcript, isFinal) => {
          handleVoiceTranscript(transcript, isFinal);
        },
        (active) => {
          setIsListeningSpeech(active);
        },
        (err) => {
          console.warn('Speech recognition error:', err);
          setIsListeningSpeech(false);
        }
      );

      if (!started) {
        voiceAgent.speak('Voice recognition is not supported in this browser. Please use the touch controls on screen.');
      }
    }
  }, [isListeningSpeech, handleVoiceTranscript]);

  // 6. Initialize Camera & Vision Watchdog
  useEffect(() => {
    if (stage === 'pairing') return;

    let stream: MediaStream | null = null;
    async function startCamera() {
      try {
        await visionWatchdog.loadModels();
        stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'user', width: { ideal: 1280 }, height: { ideal: 720 } },
        });

        if (videoFeedRef.current) {
          videoFeedRef.current.srcObject = stream;
          await videoFeedRef.current.play();
          setCameraActive(true);

          visionWatchdog.start(videoFeedRef.current, (result: WatchdogMatchResult) => {
            if (stage !== 'ambient_idle') return;

            if (result.matchType === 'member' && result.member) {
              kioskAudio.playSuccess();
              setMatchedMember(result.member);
              setStage('member_matched');
              fetchMemberWorkout(result.member.id);

              voiceAgent.speakWelcomeMember(
                result.member.name,
                result.member.daysRemaining,
                result.member.lockerNumber
              );

              setAutoResetSeconds(8);
            } else if (result.matchType === 'guest') {
              kioskAudio.playTap();
              setStage('guest_detected');
              voiceAgent.speakGuestDetected(gymConfig?.gymName || 'the gym');
            }
          });
        }
      } catch (err) {
        console.warn('Camera watchdog init error:', err);
      }
    }

    startCamera();

    return () => {
      visionWatchdog.stop();
      if (stream) stream.getTracks().forEach((t) => t.stop());
    };
  }, [stage, gymConfig, fetchMemberWorkout]);

  const resetToIdle = useCallback(() => {
    setStage('ambient_idle');
    setMatchedMember(null);
    setMatchedWorkout(null);
    setRecognizedVoiceQuery(null);
    setMemberPhoto(null);
    setKycResult(null);
    setChosenPlan(null);
    setUpiQrUri(null);
    setNameInput('');
    setPhoneInput('');
    setAdminPin('');
    setPinError(false);
  }, []);

  // Auto reset timer
  useEffect(() => {
    if (autoResetSeconds <= 0) return;
    const t = setTimeout(() => {
      if (autoResetSeconds === 1) {
        resetToIdle();
      } else {
        setAutoResetSeconds((p) => p - 1);
      }
    }, 1000);
    return () => clearTimeout(t);
  }, [autoResetSeconds, resetToIdle]);

  // Determine current water orb state for fluid animation
  const getOrbState = (): WaterOrbState => {
    switch (stage) {
      case 'pairing':
        return 'pairing';
      case 'member_matched':
        return 'celebrating';
      case 'guest_detected':
        return 'voice_speaking';
      case 'portrait_capture':
      case 'kyc_document_scan':
        return 'scanning';
      case 'upi_payment':
      case 'printing_packet':
        return 'celebrating';
      default:
        return cameraActive ? 'face_focus' : 'idle_breathing';
    }
  };

  // 6. Member Photo Snapshot
  const snapPortrait = () => {
    if (!videoFeedRef.current) return;
    kioskAudio.playTap();

    const video = videoFeedRef.current;
    const canvas = document.createElement('canvas');
    canvas.width = 480;
    canvas.height = 480;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      const size = Math.min(video.videoWidth, video.videoHeight);
      const startX = (video.videoWidth - size) / 2;
      const startY = (video.videoHeight - size) / 2;
      ctx.drawImage(video, startX, startY, size, size, 0, 0, 480, 480);
      setMemberPhoto(canvas.toDataURL('image/jpeg', 0.9));
      kioskAudio.playSuccess();
      setStage('kyc_document_scan');
    }
  };

  // 7. KYC Extraction Handler
  const handleKycDone = (data: KycExtractedData) => {
    setKycResult(data);
    if (data.name) setNameInput(data.name);
    setStage('fitness_profiling');
  };

  // 8. Select Plan & Generate Dynamic UPI QR
  const handlePickPlan = (plan: any) => {
    setChosenPlan(plan);
    kioskAudio.playTap();

    const payeeVpa = (gymConfig?.settings as any)?.upi_vpa || 'gymerp@upi';
    const payeeName = gymConfig?.businessName || 'Gym Center';
    const txn = `TXN${Date.now().toString().slice(-6)}`;
    const uri = `upi://pay?pa=${encodeURIComponent(payeeVpa)}&pn=${encodeURIComponent(payeeName)}&am=${plan.price.toFixed(2)}&tr=${txn}&tn=${encodeURIComponent(`Membership - ${plan.name}`)}&cu=INR`;

    setUpiQrUri(uri);
    setStage('upi_payment');
  };

  // 9. Payment Confirmation & Auto-Print
  const handlePaymentAndPrint = async () => {
    if (!chosenPlan || !gymConfig?.gymId) return;
    kioskAudio.playCelebration();
    setIsGenerating(true);
    setStage('printing_packet');

    try {
      const today = new Date().toISOString().split('T')[0];
      const profile: MemberFitnessProfile = {
        name: nameInput || 'Member',
        goal,
        dietaryPreference: diet,
        preferredSlot: slot,
      };

      // Call server blueprint generator
      const res = await fetch('/api/kiosk/blueprint', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          gymId: gymConfig.gymId,
          profile,
        }),
      });

      const data = await res.json();
      voiceAgent.speakRegistrationSuccess(nameInput || 'Member');

      // Auto-print 3-document package
      const invoicePayload = {
        invoiceNumber: `INV-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`,
        gymName: gymConfig.businessName || gymConfig.gymName,
        gymAddress: gymConfig.address?.street || '',
        gymPhone: gymConfig.phone || '',
        memberName: nameInput || 'Member',
        memberCode: `M-${Math.floor(1000 + Math.random() * 9000)}`,
        date: today,
        planName: chosenPlan.name,
        subtotal: chosenPlan.price,
        cgst: Math.round(chosenPlan.price * 0.09),
        sgst: Math.round(chosenPlan.price * 0.09),
        total: Math.round(chosenPlan.price * 1.18),
        paymentMode: 'UPI QR',
      };

      const bpPayload = data.blueprint
        ? {
            memberName: nameInput || 'Member',
            goal,
            caloricTarget: data.blueprint.caloricTarget,
            macros: data.blueprint.macros,
            dietMeals: data.blueprint.dietPlan.meals,
            workoutDays: data.blueprint.workoutPlan.days,
          }
        : undefined;

      kioskPrinter.printA4Package(invoicePayload, bpPayload);
      const escPos = kioskPrinter.generateEscPosReceipt(invoicePayload);
      kioskPrinter.sendToHardwareBridge(escPos).catch(() => {});
    } catch (err) {
      console.error('Print generation error:', err);
    } finally {
      setIsGenerating(false);
    }
  };

  // Controls
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
    voiceAgent.setMuted(next);
  };

  // Staff PIN
  const handlePinKey = (val: string) => {
    setAdminPin(val);
    setPinError(false);
    if (val.length === 4) {
      if (val === '1234') {
        kioskAudio.playSuccess();
        router.push('/dashboard/settings');
      } else {
        kioskAudio.playError();
        setPinError(true);
        setTimeout(() => setAdminPin(''), 600);
      }
    }
  };

  const handleUnpairDevice = () => {
    kioskAudio.playTap();
    if (confirm('Are you sure you want to un-pair this tablet? It will return to the pairing screen.')) {
      localStorage.removeItem(KIOSK_TOKEN_KEY);
      initNewPairing();
    }
  };

  return (
    <div className="relative min-h-[100dvh] w-full bg-[#09090b] text-zinc-100 flex flex-col justify-between p-4 sm:p-8 select-none touch-manipulation overflow-hidden">
      {/* Background Machined Grid & Deep Oceanic Glow */}
      <div className="absolute inset-0 bg-[radial-gradient(#27272a_1px,transparent_1px)] [background-size:24px_24px] opacity-20 pointer-events-none" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[750px] h-[750px] bg-indigo-600/10 rounded-full blur-[160px] pointer-events-none" />

      {/* Hidden background camera feed for vision watchdog */}
      <video
        ref={videoFeedRef}
        playsInline
        muted
        className="hidden"
      />

      {/* TOP STATUS DOCK */}
      <header className="relative z-30 flex items-center justify-between border-b border-zinc-800/60 pb-4">
        <div className="flex items-center gap-3">
          <div className="size-11 sm:size-12 rounded-2xl bg-indigo-500/15 border border-indigo-500/30 flex items-center justify-center text-indigo-400 font-bold shadow-lg shadow-indigo-500/10">
            <Sparkles className="size-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="font-semibold text-lg text-white">
                {gymConfig?.businessName || deviceInfo?.gymName || 'GymERP Reception AI'}
              </h1>
              {deviceInfo?.branchName && (
                <Badge variant="outline" className="border-indigo-500/30 text-indigo-400 bg-indigo-500/10 text-[10px] font-mono">
                  {deviceInfo.branchName}
                </Badge>
              )}
            </div>
            <p className="text-xs text-zinc-400 font-mono">
              Voice Intelligence Terminal • {currentTime}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={toggleSound}
            aria-label="Toggle Audio"
            className="size-11 rounded-xl bg-zinc-900 border border-zinc-800 flex items-center justify-center text-zinc-400 hover:text-white active:scale-95 transition-all"
          >
            {isMuted ? <VolumeX className="size-5 text-red-400" /> : <Volume2 className="size-5" />}
          </button>
          <button
            type="button"
            onClick={toggleFullscreen}
            aria-label="Toggle Fullscreen"
            className="size-11 rounded-xl bg-zinc-900 border border-zinc-800 flex items-center justify-center text-zinc-400 hover:text-white active:scale-95 transition-all"
          >
            {isFullscreen ? <Minimize className="size-5" /> : <Maximize className="size-5" />}
          </button>
          <button
            type="button"
            onClick={() => {
              kioskAudio.playTap();
              setStage('admin_pin');
            }}
            title="Staff Exit"
            className="size-11 rounded-xl bg-zinc-900 border border-zinc-800 flex items-center justify-center text-zinc-500 hover:text-indigo-400 active:scale-95 transition-all"
          >
            <Lock className="size-4" />
          </button>
        </div>
      </header>

      {/* CENTER SPATIAL CANVAS: LIVING VOICE WATER CIRCLE */}
      <main className="relative z-20 my-auto flex flex-col items-center justify-center w-full max-w-4xl mx-auto py-2">
        {/* =========================================================================
            THE LIVING VOICE WATER CIRCLE (Central Living Entity)
           ========================================================================= */}
        <div className="relative mb-6 flex items-center justify-center">
          {/* Magic UI Hydrodynamic Concentric Ripple Backdrop */}
          <Ripple
            numCircles={6}
            mainCircleSize={220}
            tintColor={
              voiceEvent.isSpeaking
                ? 'rgba(6, 182, 212, 0.32)'
                : 'rgba(99, 102, 241, 0.16)'
            }
            className="w-[520px] h-[520px] top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none"
          />

          <WaterVoiceOrb
            state={getOrbState()}
            audioLevel={voiceEvent.audioLevel}
            isSpeaking={voiceEvent.isSpeaking}
            currentWord={voiceEvent.currentWord}
            size={280}
            className="transition-transform duration-500 relative z-10"
          >
            {/* Contextual Inner Icon / Indicator */}
            {stage === 'pairing' ? (
              <div className="space-y-1 text-center">
                <Tablet className="size-8 mx-auto text-cyan-400 animate-pulse" />
                <span className="text-[10px] font-mono text-cyan-200 block uppercase tracking-wider">
                  Pairing Mode
                </span>
              </div>
            ) : stage === 'member_matched' ? (
              <div className="space-y-1 text-center animate-bounce">
                <CheckCircle2 className="size-10 mx-auto text-emerald-400" />
                <span className="text-[10px] font-mono text-emerald-200 block uppercase tracking-wider">
                  Verified
                </span>
              </div>
            ) : stage === 'guest_detected' ? (
              <div className="space-y-1 text-center">
                <Sparkles className="size-10 mx-auto text-indigo-400 animate-pulse" />
                <span className="text-[10px] font-mono text-indigo-200 block uppercase tracking-wider">
                  Listening
                </span>
              </div>
            ) : (
              <div className="space-y-1 text-center">
                <Dumbbell className="size-8 mx-auto text-indigo-300/80 animate-pulse" />
                <span className="text-[10px] font-mono text-zinc-400 block tracking-wider">
                  {cameraActive ? 'RADAR ACTIVE' : 'AI STANDBY'}
                </span>
              </div>
            )}
          </WaterVoiceOrb>
        </div>

        {/* =========================================================================
            DYNAMIC ISLAND REAL-TIME SPEECH KARAOKE PILL
           ========================================================================= */}
        <div className="w-full max-w-md mx-auto mb-5 min-h-[42px] flex items-center justify-center">
          <VoiceCaptionBubble
            phrase={voiceEvent.phrase}
            currentWord={voiceEvent.currentWord}
            charIndex={voiceEvent.charIndex}
            isSpeaking={voiceEvent.isSpeaking}
            audioLevel={voiceEvent.audioLevel}
          />
        </div>

        {/* =========================================================================
            SINGLE-SCREEN CONTEXTUAL FLOATING ISLANDS
           ========================================================================= */}
        <AnimatePresence mode="wait">
          {/* 1. UNPAIRED TABLET: 6-CHAR PAIRING CODE & QR */}
          {stage === 'pairing' && (
            <motion.div
              key="pairing"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={appleSpringTransition}
              className="w-full max-w-sm text-center"
            >
              <DoubleBezelCard className="p-1.5" innerClassName="p-6 text-center space-y-4">
                <div className="space-y-1">
                  <h3 className="text-lg font-bold tracking-tight text-white">Connect Tablet to Gym</h3>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    Open your <strong className="text-foreground">Gym Owner Dashboard</strong> and enter this code under <em className="text-foreground/90">Settings → Pair Kiosk</em>.
                  </p>
                </div>

                <div className="p-4 rounded-xl bg-zinc-950 border border-border/80 inline-block font-mono">
                  <span className="text-3xl sm:text-4xl font-extrabold tracking-widest text-cyan-400">
                    {pairingCode || '...'}
                  </span>
                </div>

                {pairingQr && (
                  <div className="pt-2">
                    <div className="p-3 bg-white rounded-xl inline-block shadow-lg">
                      <QRCodeSVG value={pairingQr} size={140} level="M" />
                    </div>
                    <p className="text-[11px] text-muted-foreground font-mono mt-2">
                      Or scan this QR using owner phone camera
                    </p>
                  </div>
                )}
              </DoubleBezelCard>
            </motion.div>
          )}

          {/* 2. AMBIENT IDLE: WATCHING ROOM */}
          {stage === 'ambient_idle' && (
            <motion.div
              key="idle"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              transition={appleSpringTransition}
              className="text-center space-y-3 max-w-md mx-auto"
            >
              <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-white">
                Step in Front of the Screen
              </h2>
              <p className="text-xs sm:text-sm text-zinc-400 leading-relaxed">
                Registered members are checked in automatically. New visitors will be greeted by our voice assistant.
              </p>

              <div className="pt-2 flex flex-wrap items-center justify-center gap-2">
                <Button
                  variant="outline"
                  size="pill"
                  onClick={toggleSpeechListening}
                  className={cn(
                    "border-border/80 text-xs font-mono shadow-sm transition-all",
                    isListeningSpeech
                      ? "bg-indigo-600/30 border-indigo-400 text-indigo-200 animate-pulse"
                      : "bg-zinc-900/90 text-zinc-300 hover:text-white hover:border-zinc-700"
                  )}
                >
                  <Mic className={cn("size-3.5 mr-1.5", isListeningSpeech ? "text-cyan-400 animate-bounce" : "text-indigo-400")} />
                  <span>{isListeningSpeech ? "Listening... Speak Query" : "Voice Query"}</span>
                </Button>

                <Button
                  variant="outline"
                  size="pill"
                  onClick={() => {
                    kioskAudio.playTap();
                    setIsPlateModalOpen(true);
                  }}
                  className="border-border/80 bg-zinc-900/90 text-zinc-300 hover:text-white hover:border-zinc-700 text-xs font-mono shadow-sm"
                >
                  <Dumbbell className="size-3.5 mr-1.5 text-zinc-400" />
                  <span>Plate Calc</span>
                </Button>

                <Button
                  variant="outline"
                  size="pill"
                  onClick={() => {
                    kioskAudio.playTap();
                    setStage('guest_detected');
                  }}
                  className="border-border/80 bg-zinc-900/90 text-indigo-300 hover:text-white hover:border-indigo-500/50 shadow-sm"
                >
                  <UserCheck className="size-3.5 mr-1.5 text-indigo-400" />
                  <span className="text-xs font-mono">Manual Check-In</span>
                </Button>
              </div>

              {recognizedVoiceQuery && (
                <div className="pt-1">
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-zinc-950/80 border border-zinc-800 text-[11px] font-mono text-zinc-400">
                    <Sparkles className="size-3 text-cyan-400" />
                    Heard: &quot;{recognizedVoiceQuery}&quot;
                  </span>
                </div>
              )}
            </motion.div>
          )}

          {/* 3. REGISTERED MEMBER WELCOMED */}
          {stage === 'member_matched' && matchedMember && (
            <motion.div
              key="matched"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={appleSpringTransition}
              className="w-full max-w-sm mx-auto"
            >
              <DoubleBezelCard className="p-1.5 border-emerald-500/30" innerClassName="p-6 text-center space-y-4">
                <div className="space-y-1">
                  <h3 className="text-2xl font-bold tracking-tight text-white">{matchedMember.name}</h3>
                  <p className="text-xs font-mono text-muted-foreground">ID: {matchedMember.memberCode}</p>
                  <p className="text-xs font-medium text-emerald-400 pt-1 flex items-center justify-center gap-1.5">
                    <span className="size-1.5 rounded-full bg-emerald-400 animate-pulse" />
                    Attendance Marked - Enjoy your workout!
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-2 font-mono text-xs text-left">
                  <div className="p-3 rounded-xl bg-zinc-950/80 border border-border/70">
                    <span className="text-zinc-500 block text-[10px] uppercase tracking-wider">Validity</span>
                    <span className="font-bold text-white text-sm">{matchedMember.daysRemaining} days</span>
                  </div>
                  <div className="p-3 rounded-xl bg-zinc-950/80 border border-border/70">
                    <span className="text-zinc-500 block text-[10px] uppercase tracking-wider">Locker</span>
                    <span className="font-bold text-white text-sm">{matchedMember.lockerNumber || 'General'}</span>
                  </div>
                </div>

                {/* Today's Workout Split Banner */}
                {matchedWorkout && (
                  <div className="p-3 rounded-xl bg-zinc-950/90 border border-indigo-500/30 text-left space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-mono text-indigo-400 uppercase tracking-wider flex items-center gap-1">
                        <Dumbbell className="size-3" /> Today&apos;s Split
                      </span>
                      <span className="text-[10px] font-mono text-zinc-400">
                        {matchedWorkout.exerciseCount} exercises
                      </span>
                    </div>
                    <p className="text-xs font-bold text-white leading-tight">
                      {matchedWorkout.dayName}
                    </p>
                    {matchedWorkout.firstExercise && (
                      <p className="text-[11px] text-zinc-400">
                        Starts with: <span className="text-zinc-200">{matchedWorkout.firstExercise}</span>
                      </p>
                    )}
                  </div>
                )}

                {/* Workout & Plate Voice Actions */}
                <div className="grid grid-cols-3 gap-2 pt-1">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      kioskAudio.playTap();
                      handlePrintCheckInSlip();
                    }}
                    className="bg-zinc-900 border-emerald-500/30 text-emerald-300 hover:text-white text-xs h-9 px-2"
                  >
                    <Printer className="size-3.5 mr-1 text-emerald-400" />
                    Slip
                  </Button>

                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      kioskAudio.playTap();
                      if (matchedWorkout) {
                        voiceAgent.speakTodayWorkout(
                          matchedMember.name,
                          matchedWorkout.routineName,
                          matchedWorkout.dayName,
                          matchedWorkout.exerciseCount,
                          matchedWorkout.firstExercise
                        );
                      }
                    }}
                    className="bg-zinc-900 border-indigo-500/30 text-indigo-300 hover:text-white text-xs h-9 px-2"
                  >
                    <Volume2 className="size-3.5 mr-1 text-indigo-400" />
                    Voice
                  </Button>

                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      kioskAudio.playTap();
                      setIsPlateModalOpen(true);
                    }}
                    className="bg-zinc-900 border-zinc-700 text-zinc-300 hover:text-white text-xs h-9 px-2"
                  >
                    <Dumbbell className="size-3.5 mr-1 text-zinc-400" />
                    Plates
                  </Button>
                </div>

                <p className="text-[11px] font-mono text-zinc-500 pt-1">
                  Resetting in {autoResetSeconds}s...
                </p>
              </DoubleBezelCard>
            </motion.div>
          )}

          {/* 4. GUEST / UNREGISTERED GREETING */}
          {stage === 'guest_detected' && (
            <motion.div
              key="guest"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              transition={appleSpringTransition}
              className="text-center space-y-4 max-w-md mx-auto"
            >
              <div className="space-y-1">
                <h3 className="text-2xl font-bold tracking-tight text-white">Welcome!</h3>
                <p className="text-xs text-zinc-400">
                  You are not in our roster yet. Join membership or grab a free trial pass:
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3 pt-1">
                <button
                  type="button"
                  onClick={() => {
                    kioskAudio.playTap();
                    setStage('portrait_capture');
                  }}
                  className="p-5 rounded-2xl bg-zinc-900/90 hover:bg-zinc-800/90 border border-border/80 hover:border-indigo-500 text-left space-y-2 active:scale-[0.97] transition-[transform,background-color,border-color] duration-150 shadow-lg cursor-pointer"
                >
                  <UserCheck className="size-6 text-indigo-400" />
                  <div>
                    <h4 className="font-bold text-sm text-white">Join Gym</h4>
                    <p className="text-[11px] text-zinc-400">Auto-fill via ID scan and printed plans</p>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    kioskAudio.playTap();
                    router.push('/kiosk');
                  }}
                  className="p-5 rounded-2xl bg-zinc-900/90 hover:bg-zinc-800/90 border border-border/80 hover:border-amber-500 text-left space-y-2 active:scale-[0.97] transition-[transform,background-color,border-color] duration-150 shadow-lg cursor-pointer"
                >
                  <Flame className="size-6 text-amber-400" />
                  <div>
                    <h4 className="font-bold text-sm text-white">1-Day Pass</h4>
                    <p className="text-[11px] text-zinc-400">Instant workout day pass</p>
                  </div>
                </button>
              </div>

              <button
                type="button"
                onClick={resetToIdle}
                className="text-xs font-mono text-zinc-500 hover:text-zinc-300 transition-colors cursor-pointer"
              >
                Back to Idle
              </button>
            </motion.div>
          )}

          {/* 5. SNAP PORTRAIT */}
          {stage === 'portrait_capture' && (
            <motion.div
              key="portrait"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={appleSpringTransition}
              className="text-center space-y-4 max-w-xs mx-auto"
            >
              <DoubleBezelCard className="p-1.5" innerClassName="p-6 text-center space-y-4">
                <div className="space-y-1">
                  <span className="text-[11px] font-mono text-indigo-400 font-semibold tracking-wider uppercase">Step 1 of 4: Photo</span>
                  <h3 className="text-xl font-bold tracking-tight text-white">Look Into Camera</h3>
                </div>

                <Button
                  size="lg"
                  onClick={snapPortrait}
                  className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-medium text-sm shadow-md"
                >
                  <Camera className="size-4" />
                  <span>Snap Portrait</span>
                  <ButtonIslandIcon className="ml-auto">
                    <ChevronRight className="size-3.5" />
                  </ButtonIslandIcon>
                </Button>
              </DoubleBezelCard>
            </motion.div>
          )}

          {/* 6. KYC DOCUMENT SCAN */}
          {stage === 'kyc_document_scan' && (
            <motion.div
              key="kyc_scan"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={appleSpringTransition}
              className="w-full max-w-md text-center space-y-3"
            >
              <div className="space-y-1">
                <span className="text-[11px] font-mono text-indigo-400 font-semibold tracking-wider uppercase">Step 2 of 4: Auto-KYC</span>
                <h3 className="text-xl font-bold tracking-tight text-white">Scan Aadhaar or ID Card</h3>
              </div>

              <KioskDocumentScanner
                gymId={gymConfig?.gymId}
                onExtracted={handleKycDone}
                onCancel={() => setStage('fitness_profiling')}
              />
            </motion.div>
          )}

          {/* 7. FITNESS PROFILING */}
          {stage === 'fitness_profiling' && (
            <motion.div
              key="profiling"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              transition={appleSpringTransition}
              className="w-full max-w-lg space-y-4"
            >
              <div className="text-center space-y-1">
                <span className="text-[11px] font-mono text-indigo-400 font-semibold tracking-wider uppercase">Step 3 of 4: Fitness Profile</span>
                <h3 className="text-xl font-bold tracking-tight text-white">Personalize Nutrition and Workout</h3>
              </div>

              <DoubleBezelCard className="p-1.5" innerClassName="p-5 space-y-3">
                <div className="grid grid-cols-2 gap-2">
                  <input
                    type="text"
                    value={nameInput}
                    onChange={(e) => setNameInput(e.target.value)}
                    placeholder="Your Full Name"
                    className="h-10 rounded-xl bg-zinc-950 border border-border/80 px-3 text-xs text-white focus:outline-none focus:border-indigo-500 transition-colors"
                  />
                  <input
                    type="tel"
                    value={phoneInput}
                    onChange={(e) => setPhoneInput(e.target.value)}
                    placeholder="10-digit Phone"
                    maxLength={10}
                    className="h-10 rounded-xl bg-zinc-950 border border-border/80 px-3 text-xs font-mono text-white focus:outline-none focus:border-indigo-500 transition-colors"
                  />
                </div>

                {/* Goal Selector */}
                <div className="space-y-1">
                  <label className="text-[11px] font-mono text-zinc-400 block uppercase tracking-wider">Goal</label>
                  <div className="grid grid-cols-4 gap-1.5">
                    {[
                      { id: 'fat_loss', label: 'Fat Loss' },
                      { id: 'muscle_gain', label: 'Muscle' },
                      { id: 'strength', label: 'Strength' },
                      { id: 'general_fitness', label: 'Health' },
                    ].map((g) => (
                      <button
                        key={g.id}
                        type="button"
                        onClick={() => setGoal(g.id as any)}
                        className={cn(
                          'py-2 rounded-xl text-xs font-medium border text-center transition-[transform,background-color,border-color] duration-120 active:scale-[0.97] cursor-pointer',
                          goal === g.id
                            ? 'bg-indigo-600 border-indigo-500 text-white shadow-sm'
                            : 'bg-zinc-950 border-border/80 text-zinc-400 hover:text-zinc-200'
                        )}
                      >
                        {g.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Diet Selector */}
                <div className="space-y-1">
                  <label className="text-[11px] font-mono text-zinc-400 block uppercase tracking-wider">Dietary Choice</label>
                  <div className="grid grid-cols-4 gap-1.5">
                    {[
                      { id: 'vegetarian', label: 'Pure Veg' },
                      { id: 'eggetarian', label: 'Eggetarian' },
                      { id: 'non_vegetarian', label: 'Non-Veg' },
                      { id: 'vegan', label: 'Vegan' },
                    ].map((d) => (
                      <button
                        key={d.id}
                        type="button"
                        onClick={() => setDiet(d.id as any)}
                        className={cn(
                          'py-2 rounded-xl text-xs font-medium border text-center transition-[transform,background-color,border-color] duration-120 active:scale-[0.97] cursor-pointer',
                          diet === d.id
                            ? 'bg-emerald-600 border-emerald-500 text-white shadow-sm'
                            : 'bg-zinc-950 border-border/80 text-zinc-400 hover:text-zinc-200'
                        )}
                      >
                        {d.label}
                      </button>
                    ))}
                  </div>
                </div>
              </DoubleBezelCard>

              {/* Plan Options */}
              <div className="grid grid-cols-2 gap-2">
                {gymConfig?.plans?.slice(0, 2).map((p: any) => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => handlePickPlan(p)}
                    className="p-3.5 rounded-2xl bg-zinc-900/90 hover:bg-zinc-800/90 border border-border/80 flex justify-between items-center active:scale-[0.97] transition-[transform,background-color] duration-120 cursor-pointer shadow-md"
                  >
                    <span className="font-bold text-xs text-white">{p.name}</span>
                    <span className="font-mono text-xs font-bold text-emerald-400">
                      ₹{p.price.toLocaleString('en-IN')} →
                    </span>
                  </button>
                ))}
              </div>
            </motion.div>
          )}

          {/* 8. UPI PAYMENT */}
          {stage === 'upi_payment' && chosenPlan && upiQrUri && (
            <motion.div
              key="upi"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={appleSpringTransition}
              className="w-full max-w-xs mx-auto"
            >
              <DoubleBezelCard className="p-1.5" innerClassName="p-6 text-center space-y-4">
                <div className="space-y-1">
                  <span className="text-[11px] font-mono text-emerald-400 font-semibold tracking-wider uppercase">Scan via GPay / PhonePe / Paytm</span>
                  <div className="text-3xl font-mono font-extrabold tracking-tight text-white">
                    ₹{chosenPlan.price.toLocaleString('en-IN')}
                  </div>
                </div>

                <div className="p-3 bg-white rounded-xl inline-block shadow-xl">
                  <QRCodeSVG value={upiQrUri} size={180} level="M" />
                </div>

                <Button
                  size="lg"
                  onClick={handlePaymentAndPrint}
                  className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-medium text-xs shadow-lg"
                >
                  <CheckCircle2 className="size-4" />
                  <span>I Have Paid • Auto-Print Package</span>
                </Button>
              </DoubleBezelCard>
            </motion.div>
          )}

          {/* 9. PRINTING PACKET */}
          {stage === 'printing_packet' && (
            <motion.div
              key="printing"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={appleSpringTransition}
              className="w-full max-w-sm mx-auto"
            >
              <DoubleBezelCard className="p-1.5 border-indigo-500/30" innerClassName="p-6 text-center space-y-4">
                <div className="size-16 rounded-full bg-indigo-500/10 border border-indigo-500/30 text-indigo-400 flex items-center justify-center mx-auto animate-pulse">
                  <Printer className="size-8" />
                </div>

                <div className="space-y-1">
                  <h3 className="text-xl font-bold tracking-tight text-white">Printing Documents</h3>
                  <p className="text-xs text-zinc-400">
                    Tax Invoice, Diet Plan, and Workout Routine are printing now.
                  </p>
                </div>

                <Button
                  size="default"
                  onClick={resetToIdle}
                  className="w-full bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-medium"
                >
                  Done • Return to Screen
                </Button>
              </DoubleBezelCard>
            </motion.div>
          )}

          {/* 10. ADMIN PIN MODAL */}
          {stage === 'admin_pin' && (
            <motion.div
              key="pin"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={appleSpringTransition}
              className="w-full max-w-xs mx-auto text-center"
            >
              <DoubleBezelCard className="p-1.5" innerClassName="p-5 text-center space-y-4">
                <div className="space-y-1">
                  <div className="size-10 rounded-xl bg-zinc-900 border border-border/80 flex items-center justify-center text-indigo-400 mx-auto">
                    <Lock className="size-5" />
                  </div>
                  <h3 className="text-lg font-bold tracking-tight text-white">Staff Security PIN</h3>
                  <p className="text-xs text-muted-foreground">Enter 4-digit PIN (Default: 1234)</p>
                </div>

                <div className="flex justify-center gap-3 py-1">
                  {[0, 1, 2, 3].map((i) => (
                    <div
                      key={i}
                      className={cn(
                        'size-3.5 rounded-full border transition-all duration-150',
                        adminPin.length > i
                          ? pinError
                            ? 'bg-destructive border-destructive scale-110'
                            : 'bg-indigo-500 border-indigo-500 scale-105'
                          : 'border-border/80 bg-zinc-900'
                      )}
                    />
                  ))}
                </div>

                <KioskKeypad value={adminPin} onChange={handlePinKey} maxLength={4} />

                <div className="flex justify-between items-center pt-2">
                  <button
                    type="button"
                    onClick={handleUnpairDevice}
                    className="text-[11px] font-mono text-red-400 hover:underline cursor-pointer"
                  >
                    Unpair Tablet
                  </button>
                  <button
                    type="button"
                    onClick={resetToIdle}
                    className="text-[11px] font-mono text-zinc-400 hover:text-white transition-colors cursor-pointer"
                  >
                    Cancel
                  </button>
                </div>
              </DoubleBezelCard>
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* FOOTER TICKER */}
      <footer className="relative z-30 border-t border-zinc-800/60 pt-3 flex items-center justify-between text-xs text-zinc-500 font-mono">
        <div className="flex items-center gap-2">
          <span className="size-2 rounded-full bg-emerald-400 animate-pulse" />
          <span>KIOSK ACTIVE</span>
          <span>•</span>
          <span>{deviceInfo?.deviceName || 'TABLET TERMINAL'}</span>
        </div>
        <div>{gymConfig?.tagline || 'Every rep counts.'}</div>
      </footer>

      {/* KIOSK BARBELL PLATE CALCULATOR MODAL */}
      <KioskPlateCalculator
        isOpen={isPlateModalOpen}
        initialWeight={plateModalWeight}
        onClose={() => setIsPlateModalOpen(false)}
      />
    </div>
  );
}
