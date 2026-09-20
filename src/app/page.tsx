'use client';

// Reading this as: High-converting B2B/B2C Gym Management SaaS landing page and autonomous kiosk operating system for modern commercial gym owners, fitness studio founders, and lobby kiosk operators, with a Linear-calibrated, high-contrast dark-tech language, leaning toward Tailwind CSS + Geist Typography + Phosphor Icons + restrained spring motion.
// DESIGN_VARIANCE: 7 | MOTION_INTENSITY: 6 | VISUAL_DENSITY: 4

import React, { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { motion, useReducedMotion } from 'framer-motion';
import { useAuth } from '@/hooks/useAuth';
import {
  Barbell,
  Camera,
  ShieldCheck,
  Check,
  ArrowRight,
  DeviceMobile,
  Sparkle,
  Receipt,
  Users,
  ChartLineUp,
  Cpu,
  Fingerprint,
  QrCode,
  Buildings,
  Clock,
  LockKey,
  Play,
  WhatsappLogo,
  Shield,
  Eye,
  CheckCircle,
} from '@phosphor-icons/react';
import { Button, ButtonIslandIcon } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { DoubleBezelCard } from '@/components/ui/card';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';

type ModalityTab = 'voice_kiosk' | 'cctv_ai' | 'face_kiosk' | 'attendance_matrix';

export default function LandingPage() {
  const { isAuthenticated } = useAuth();
  const shouldReduceMotion = useReducedMotion();
  const [activeTab, setActiveTab] = useState<ModalityTab>('voice_kiosk');

  const modalities: Record<ModalityTab, {
    title: string;
    badge: string;
    caption: string;
    image: string;
    specs: string[];
  }> = {
    voice_kiosk: {
      title: 'Autonomous AI Voice Water Kiosk',
      badge: 'Lobby Tablet Hardware',
      caption: 'Circular water visual halo with speech-to-speech AI, zero-password pairing, Aadhaar KYC OCR, and thermal receipt printing.',
      image: '/showcase/kiosk-agent.png',
      specs: ['Circular Water UI', 'Aadhaar OCR', 'Thermal ESC-POS', 'Sub-second Voice'],
    },
    cctv_ai: {
      title: 'CCTV Surveillance & Vigilance Matrix',
      badge: 'Entrance RTSP Stream',
      caption: 'Edge AI camera matrix silently matches faces at the entrance door, acting as a fail-safe for members who bypass the kiosk.',
      image: '/showcase/cctv-dashboard.png',
      specs: ['1080p RTSP Ingest', 'Edge Vector Match', 'Expired Plan Alerts', 'Tailgating Detection'],
    },
    face_kiosk: {
      title: 'Zero-Install WebGL Face Kiosk',
      badge: 'Browser Terminal',
      caption: 'Client-side 128-d biometric matching running inside standard Google Chrome with zero desktop drivers or software installation.',
      image: '/showcase/face-kiosk.png',
      specs: ['Chrome WebGL', '128-D Embeddings', '3D Liveness Check', 'Zero Native Install'],
    },
    attendance_matrix: {
      title: 'Multi-Branch Attendance Station Switcher',
      badge: 'Centralized Control',
      caption: 'Unified switcher across all four modalities with real-time floor logs, member filtering, and Excel compliance export.',
      image: '/showcase/attendance-dashboard.png',
      specs: ['Universal Switcher', 'Live Floor Counter', 'Method Filter Pills', 'CSV & Excel Export'],
    },
  };

  const currentModality = modalities[activeTab];

  return (
    <div className="flex flex-col min-h-[100dvh] bg-background text-foreground selection:bg-primary selection:text-primary-foreground">
      {/* 1. Single-Line Top Navigation */}
      <header className="sticky top-0 z-50 w-full h-16 border-b border-border/70 bg-background/80 backdrop-blur-xl">
        <div className="container mx-auto h-full flex items-center justify-between px-4 sm:px-6 lg:px-8 max-w-7xl">
          <div className="flex items-center gap-3">
            <div className="h-8 w-8 rounded-xl bg-primary/20 border border-primary/30 flex items-center justify-center text-primary shadow-[inset_0_1px_0_0_rgba(255,255,255,0.2)]">
              <Barbell weight="duotone" className="h-4.5 w-4.5" />
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm font-semibold tracking-tight text-foreground font-mono">
                GymERP
              </span>
              <span className="hidden sm:inline-block text-[10px] font-mono px-2 py-0.5 border border-border/80 bg-muted/40 text-muted-foreground rounded-full">
                v2.5
              </span>
            </div>
          </div>

          <nav className="hidden md:flex items-center gap-8 text-xs font-medium text-muted-foreground">
            <a href="#modalities" className="hover:text-foreground transition-colors">Modalities</a>
            <a href="#capabilities" className="hover:text-foreground transition-colors">Capabilities</a>
            <a href="#pricing" className="hover:text-foreground transition-colors">Pricing</a>
            <a href="#faq" className="hover:text-foreground transition-colors">FAQ</a>
          </nav>

          <div className="flex items-center gap-3">
            <Link href="/staff/login">
              <Button variant="ghost" size="pill-sm" className="text-xs text-muted-foreground hover:text-foreground active:scale-[0.98]">
                Staff Portal
              </Button>
            </Link>
            <Link href={isAuthenticated ? '/dashboard' : '/login'}>
              <Button size="pill-sm" className="text-xs font-semibold bg-primary hover:bg-primary/90 text-primary-foreground shadow-[0_1px_2px_rgba(0,0,0,0.3),inset_0_1px_0_0_rgba(255,255,255,0.2)] active:scale-[0.98]">
                {isAuthenticated ? 'Go to Dashboard' : 'Gym Login'}
              </Button>
            </Link>
          </div>
        </div>
      </header>

      {/* 2. Asymmetric Split Hero Section (Fits Viewport, Max 4 Text Elements) */}
      <section className="relative pt-20 pb-16 md:pt-24 md:pb-24 overflow-hidden border-b border-border/60">
        {/* Subtle radial ambient illumination */}
        <div className="absolute top-0 right-1/4 w-[600px] h-[300px] bg-primary/[0.07] rounded-full blur-[140px] pointer-events-none -z-10" />

        <div className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-7xl">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-12 items-center">
            {/* Left Column: Typography, Value Prop, CTAs, Operational Metrics */}
            <div className="lg:col-span-6 space-y-6">
              {/* Text Element 1: Eyebrow */}
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-border/80 bg-muted/40 text-muted-foreground text-[10px] font-mono font-semibold uppercase tracking-[0.18em]">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75 duration-1000" />
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
                </span>
                <span>AUTONOMOUS FITNESS OPERATING SYSTEM</span>
              </div>

              {/* Text Element 2: Display Headline (Max 2 lines) */}
              <h1 className="text-3xl sm:text-5xl lg:text-5.5xl font-bold tracking-[-0.035em] text-foreground leading-[1.12]">
                The autonomous operating system for modern gyms.
              </h1>

              {/* Text Element 3: High-Contrast Subtext (17 words, max 20 words cap) */}
              <p className="text-sm sm:text-base text-muted-foreground max-w-[55ch] leading-relaxed">
                Biometric face kiosks, automated WhatsApp GST billing, and CCTV entrance vigilance for high-performance fitness facilities.
              </p>

              {/* Text Element 4: Single-Line Primary & Secondary CTAs */}
              <div className="pt-2 flex flex-wrap gap-3.5 items-center">
                <Link href="/login">
                  <Button size="pill" className="text-xs sm:text-sm font-semibold bg-primary hover:bg-primary/90 text-primary-foreground pl-6 pr-3 shadow-[0_1px_2px_rgba(0,0,0,0.3),inset_0_1px_0_0_rgba(255,255,255,0.22)] active:scale-[0.98] cursor-pointer group">
                    <span>Start Free Trial</span>
                    <ButtonIslandIcon>
                      <ArrowRight weight="bold" className="h-3.5 w-3.5" />
                    </ButtonIslandIcon>
                  </Button>
                </Link>
                <a href="#modalities">
                  <Button variant="outline" size="pill" className="text-xs sm:text-sm border-border/80 bg-card/40 backdrop-blur-md hover:bg-muted/80 text-foreground px-6 active:scale-[0.98] cursor-pointer">
                    Explore Modalities
                  </Button>
                </a>
              </div>

              {/* High-SNR Metrics Bar */}
              <div className="pt-6 border-t border-border/60 grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="p-3 rounded-xl border border-border/70 bg-card/40 backdrop-blur-sm">
                  <div className="font-mono text-lg font-bold text-foreground tabular-nums">0.4s</div>
                  <div className="text-[10px] font-mono text-muted-foreground uppercase tracking-wider font-semibold">Check-In Speed</div>
                </div>
                <div className="p-3 rounded-xl border border-border/70 bg-card/40 backdrop-blur-sm">
                  <div className="font-mono text-lg font-bold text-foreground tabular-nums">100%</div>
                  <div className="text-[10px] font-mono text-muted-foreground uppercase tracking-wider font-semibold">GST Compliance</div>
                </div>
                <div className="p-3 rounded-xl border border-border/70 bg-card/40 backdrop-blur-sm">
                  <div className="font-mono text-lg font-bold text-foreground tabular-nums">4 Modes</div>
                  <div className="text-[10px] font-mono text-muted-foreground uppercase tracking-wider font-semibold">Attendance Hub</div>
                </div>
                <div className="p-3 rounded-xl border border-border/70 bg-card/40 backdrop-blur-sm">
                  <div className="font-mono text-lg font-bold text-foreground tabular-nums">RLS-4</div>
                  <div className="text-[10px] font-mono text-muted-foreground uppercase tracking-wider font-semibold">Tenant Isolation</div>
                </div>
              </div>
            </div>

            {/* Right Column: High-Resolution Real Product Showcase Card */}
            <div className="lg:col-span-6">
              <DoubleBezelCard className="p-2 sm:p-2.5 shadow-[0_24px_70px_-15px_rgba(0,0,0,0.7)]" innerClassName="p-0 overflow-hidden">
                <div className="h-10 border-b border-border/70 bg-muted/30 px-4 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="h-2.5 w-2.5 rounded-full bg-border" />
                    <div className="h-2.5 w-2.5 rounded-full bg-border" />
                    <div className="h-2.5 w-2.5 rounded-full bg-border" />
                    <span className="text-[11px] font-mono text-muted-foreground ml-2 hidden sm:inline">
                      kiosk.gymerp.app/agent
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="flex items-center gap-1.5 text-[10px] font-mono text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-0.5 rounded-full font-semibold">
                      <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
                      Voice Halo Live
                    </span>
                  </div>
                </div>

                <div className="relative aspect-[16/10] w-full bg-zinc-950 overflow-hidden group">
                  <Image
                    src="/showcase/kiosk-agent.png"
                    alt="Autonomous Voice Water Kiosk Interface"
                    fill
                    className="object-cover object-top transition-transform duration-500 group-hover:scale-[1.02]"
                    priority
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent flex items-end p-5">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="text-[9px] font-mono border-primary/40 bg-primary/15 text-primary-foreground rounded-full">
                          AI Voice Agent
                        </Badge>
                        <span className="text-xs font-semibold text-white">Lobby Welcome Tablet</span>
                      </div>
                      <p className="text-xs text-zinc-300">
                        Zero-friction check-in with circular water UI, instant Aadhaar OCR, and dynamic UPI renewal.
                      </p>
                    </div>
                  </div>
                </div>
              </DoubleBezelCard>
            </div>
          </div>
        </div>
      </section>

      {/* 3. Four Physical Modalities (Interactive Visual Tabs Showcase) */}
      <section id="modalities" className="py-20 md:py-28 border-b border-border/60 bg-muted/10">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-7xl">
          <div className="max-w-3xl mb-12">
            <h2 className="text-2xl sm:text-4xl font-bold tracking-tight text-foreground">
              Four physical modalities. One real-time ledger.
            </h2>
            <p className="mt-3 text-sm text-muted-foreground leading-relaxed max-w-[65ch]">
              Tailored for how gyms actually operate. Check in via lobby voice tablet, entrance CCTV camera, reception browser, or dynamic QR passes.
            </p>
          </div>

          {/* Interactive Modality Selector Pills */}
          <div className="flex flex-wrap gap-2.5 mb-8">
            <button
              onClick={() => setActiveTab('voice_kiosk')}
              className={`px-4 py-2 rounded-xl text-xs font-medium font-mono transition-all cursor-pointer flex items-center gap-2 border ${
                activeTab === 'voice_kiosk'
                  ? 'bg-primary text-primary-foreground border-primary shadow-sm'
                  : 'bg-card/60 text-muted-foreground border-border/70 hover:text-foreground hover:bg-muted/80'
              }`}
            >
              <Cpu weight="duotone" className="h-4 w-4" />
              1. Voice Water Kiosk
            </button>
            <button
              onClick={() => setActiveTab('cctv_ai')}
              className={`px-4 py-2 rounded-xl text-xs font-medium font-mono transition-all cursor-pointer flex items-center gap-2 border ${
                activeTab === 'cctv_ai'
                  ? 'bg-primary text-primary-foreground border-primary shadow-sm'
                  : 'bg-card/60 text-muted-foreground border-border/70 hover:text-foreground hover:bg-muted/80'
              }`}
            >
              <Camera weight="duotone" className="h-4 w-4" />
              2. CCTV Surveillance Matrix
            </button>
            <button
              onClick={() => setActiveTab('face_kiosk')}
              className={`px-4 py-2 rounded-xl text-xs font-medium font-mono transition-all cursor-pointer flex items-center gap-2 border ${
                activeTab === 'face_kiosk'
                  ? 'bg-primary text-primary-foreground border-primary shadow-sm'
                  : 'bg-card/60 text-muted-foreground border-border/70 hover:text-foreground hover:bg-muted/80'
              }`}
            >
              <DeviceMobile weight="duotone" className="h-4 w-4" />
              3. WebGL Face Station
            </button>
            <button
              onClick={() => setActiveTab('attendance_matrix')}
              className={`px-4 py-2 rounded-xl text-xs font-medium font-mono transition-all cursor-pointer flex items-center gap-2 border ${
                activeTab === 'attendance_matrix'
                  ? 'bg-primary text-primary-foreground border-primary shadow-sm'
                  : 'bg-card/60 text-muted-foreground border-border/70 hover:text-foreground hover:bg-muted/80'
              }`}
            >
              <Fingerprint weight="duotone" className="h-4 w-4" />
              4. Centralized Switcher
            </button>
          </div>

          {/* Active Modality Detail Box */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center rounded-2xl border border-border/80 bg-card/60 backdrop-blur-md p-6 sm:p-8">
            <div className="lg:col-span-5 space-y-4">
              <Badge variant="outline" className="text-[10px] font-mono border-primary/30 text-primary bg-primary/10 rounded-full">
                {currentModality.badge}
              </Badge>
              <h3 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground">
                {currentModality.title}
              </h3>
              <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
                {currentModality.caption}
              </p>
              <div className="pt-2 flex flex-wrap gap-2">
                {currentModality.specs.map((spec) => (
                  <span
                    key={spec}
                    className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-mono border border-border/80 bg-muted/30 text-foreground"
                  >
                    <Check weight="bold" className="h-3 w-3 text-primary" />
                    {spec}
                  </span>
                ))}
              </div>
            </div>

            <div className="lg:col-span-7">
              <div className="relative aspect-[16/10] w-full rounded-xl overflow-hidden border border-border/80 bg-zinc-950 shadow-inner">
                <Image
                  src={currentModality.image}
                  alt={currentModality.title}
                  fill
                  className="object-cover object-top"
                />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 4. Rhythmic Bento Capabilities Grid (Max 1 Eyebrow per 3 Sections) */}
      <section id="capabilities" className="py-24 md:py-32 border-b border-border/60">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-7xl">
          {/* Eyebrow 2 of 2 across the entire page */}
          <div className="max-w-3xl mb-14">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full border border-border/80 bg-muted/40 text-muted-foreground text-[10px] font-mono font-semibold uppercase tracking-[0.18em] mb-4">
              ENGINEERED FOR RIGOR
            </div>
            <h2 className="text-2xl sm:text-4xl font-bold tracking-tight text-foreground">
              Built for floor speed and zero receptionist bottlenecks
            </h2>
            <p className="mt-3 text-xs sm:text-sm text-muted-foreground leading-relaxed max-w-[65ch]">
              Eliminate paper registers, manual dues tracking, and attendance fraud with automated edge hardware bridges.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {/* Bento Tile 1 (Span 2): Face & Biometrics Vector Engine */}
            <DoubleBezelCard className="md:col-span-2 p-1.5" innerClassName="h-full flex flex-col justify-between p-6 sm:p-8 bg-card/60">
              <div>
                <div className="h-9 w-9 rounded-xl bg-primary/15 border border-primary/30 text-primary flex items-center justify-center mb-4">
                  <Cpu weight="duotone" className="h-5 w-5" />
                </div>
                <h3 className="text-base sm:text-lg font-semibold tracking-tight text-foreground">
                  Edge Biometric Vector Matching
                </h3>
                <p className="text-xs sm:text-sm text-muted-foreground mt-2 leading-relaxed">
                  Turn existing standard IP cameras, Android lobby tablets, and USB scanners into unforgeable check-in stations. 128-dimensional facial embedding vectors are matched locally via WebGL WASM and local Python sidecar services with sub-second response times.
                </p>
              </div>
              <div className="mt-8 pt-4 border-t border-border/60 flex flex-wrap gap-2 text-[10px] font-mono text-muted-foreground font-semibold">
                <span className="bg-muted/40 px-3 py-1 rounded-full border border-border/80">RTSP Stream Support</span>
                <span className="bg-muted/40 px-3 py-1 rounded-full border border-border/80">Dual-Camera Flipping</span>
                <span className="bg-muted/40 px-3 py-1 rounded-full border border-border/80">Offline Grace Period</span>
              </div>
            </DoubleBezelCard>

            {/* Bento Tile 2 (Span 1): Official WhatsApp Cloud API */}
            <div className="rounded-2xl border border-border/80 bg-card/50 backdrop-blur-md p-6 sm:p-7 flex flex-col justify-between shadow-2xs">
              <div>
                <div className="h-9 w-9 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 flex items-center justify-center mb-4">
                  <WhatsappLogo weight="duotone" className="h-5 w-5" />
                </div>
                <h3 className="text-base font-semibold tracking-tight text-foreground">
                  WhatsApp Cloud Automation
                </h3>
                <p className="text-xs sm:text-sm text-muted-foreground mt-2 leading-relaxed">
                  Send GST-compliant tax invoices, payment receipts, and expiring plan reminders via Meta's verified WhatsApp Cloud API. Zero ban risk, 100% deliverability.
                </p>
              </div>
              <div className="mt-8 pt-4 border-t border-border/60 text-[10px] font-mono text-emerald-400 font-semibold flex items-center gap-1.5">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                Meta Verified Cloud API
              </div>
            </div>

            {/* Bento Tile 3 (Span 1): Nutrition & Workout Studio Blueprints */}
            <div className="rounded-2xl border border-border/80 bg-card/50 backdrop-blur-md p-6 sm:p-7 flex flex-col justify-between shadow-2xs">
              <div>
                <div className="h-9 w-9 rounded-xl bg-amber-500/15 border border-amber-500/30 text-amber-400 flex items-center justify-center mb-4">
                  <Receipt weight="duotone" className="h-5 w-5" />
                </div>
                <h3 className="text-base font-semibold tracking-tight text-foreground">
                  Nutrition & Workout Blueprints
                </h3>
                <p className="text-xs sm:text-sm text-muted-foreground mt-2 leading-relaxed">
                  Construct customized meal-by-meal diets and workout splits. Export studio-grade PDFs that automatically attach to member welcome packages.
                </p>
              </div>
              <div className="mt-8 pt-4 border-t border-border/60 text-[10px] font-mono text-muted-foreground font-semibold">
                Calibrated Macro Math & Split Templates
              </div>
            </div>

            {/* Bento Tile 4 (Span 2): Multi-Branch Hierarchy & PostgreSQL RLS */}
            <DoubleBezelCard className="md:col-span-2 p-1.5" innerClassName="h-full flex flex-col justify-between p-6 sm:p-8 bg-card/60">
              <div>
                <div className="h-9 w-9 rounded-xl bg-primary/15 border border-primary/30 text-primary flex items-center justify-center mb-4">
                  <ShieldCheck weight="duotone" className="h-5 w-5" />
                </div>
                <h3 className="text-base sm:text-lg font-semibold tracking-tight text-foreground">
                  Multi-Branch Hierarchy & PostgreSQL RLS Isolation
                </h3>
                <p className="text-xs sm:text-sm text-muted-foreground mt-2 leading-relaxed">
                  Gym owners view consolidated enterprise analytics while staff and trainers are strictly quarantined to their assigned facility via PostgreSQL Row-Level Security. Trainers only access workout routines and client logs; financial records remain confidential.
                </p>
              </div>
              <div className="mt-8 pt-4 border-t border-border/60 flex flex-wrap gap-2 text-[10px] font-mono text-muted-foreground font-semibold">
                <span className="bg-muted/40 px-3 py-1 rounded-full border border-border/80">PostgreSQL RLS Policies</span>
                <span className="bg-muted/40 px-3 py-1 rounded-full border border-border/80">Granular Role RBAC</span>
                <span className="bg-muted/40 px-3 py-1 rounded-full border border-border/80">Multi-Location Branch Switcher</span>
              </div>
            </DoubleBezelCard>
          </div>
        </div>
      </section>

      {/* 5. Investment Scale / Transparent Pricing (Zero Banned Em-Dashes) */}
      <section id="pricing" className="py-24 md:py-32 border-b border-border/60 bg-muted/10">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-6xl">
          <div className="max-w-2xl mx-auto text-center mb-16">
            <h2 className="text-2xl sm:text-4xl font-bold tracking-tight text-foreground">
              Transparent, predictable pricing
            </h2>
            <p className="mt-3 text-xs sm:text-sm text-muted-foreground leading-relaxed">
              Start free, scale into hardware kiosks and multi-branch management as your facility expands.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-5 max-w-5xl mx-auto">
            {/* Free Starter */}
            <div className="rounded-2xl border border-border/80 bg-card/50 backdrop-blur-md p-7 sm:p-8 flex flex-col justify-between shadow-2xs">
              <div>
                <h3 className="text-sm font-semibold tracking-tight text-foreground">Starter</h3>
                <div className="mt-4 flex items-baseline">
                  <span className="text-3xl font-bold font-mono tracking-tight text-foreground tabular-nums">₹0</span>
                  <span className="text-xs text-muted-foreground ml-1 font-mono">/month</span>
                </div>
                <p className="mt-3 text-xs text-muted-foreground">Essential management for personal fitness studios.</p>
                <ul className="mt-6 space-y-2.5 text-xs text-muted-foreground">
                  <li className="flex items-center gap-2"><Check weight="bold" className="h-3.5 w-3.5 text-foreground shrink-0" /> Up to 50 active members</li>
                  <li className="flex items-center gap-2"><Check weight="bold" className="h-3.5 w-3.5 text-foreground shrink-0" /> 2 Staff accounts</li>
                  <li className="flex items-center gap-2"><Check weight="bold" className="h-3.5 w-3.5 text-foreground shrink-0" /> QR & Manual Attendance</li>
                  <li className="flex items-center gap-2"><Check weight="bold" className="h-3.5 w-3.5 text-foreground shrink-0" /> GST Invoice PDF Engine</li>
                  <li className="flex items-center gap-2"><Check weight="bold" className="h-3.5 w-3.5 text-foreground shrink-0" /> Member Web Portal</li>
                </ul>
              </div>
              <Link href="/login" className="mt-8">
                <Button variant="outline" size="pill" className="w-full text-xs border-border/80 bg-card/40 backdrop-blur-md hover:bg-muted/80 text-foreground active:scale-[0.98]">
                  Start Free Trial
                </Button>
              </Link>
            </div>

            {/* Professional Tier (Recommended) */}
            <DoubleBezelCard className="p-1.5 ring-2 ring-primary/80 shadow-[0_16px_50px_rgba(99,102,241,0.25)] relative" innerClassName="h-full flex flex-col justify-between p-7 sm:p-8 bg-card/90">
              <div className="absolute top-0 right-6 -translate-y-1/2 bg-primary text-primary-foreground px-3 py-1 rounded-full text-[9px] font-mono font-bold uppercase tracking-wider shadow-md">
                Recommended
              </div>
              <div>
                <h3 className="text-sm font-semibold tracking-tight text-foreground">Professional</h3>
                <div className="mt-4 flex items-baseline">
                  <span className="text-3xl font-bold font-mono tracking-tight text-foreground tabular-nums">₹999</span>
                  <span className="text-xs text-muted-foreground ml-1 font-mono">/month</span>
                </div>
                <p className="mt-3 text-xs text-muted-foreground">Full automation for growing commercial health clubs.</p>
                <ul className="mt-6 space-y-2.5 text-xs text-foreground/90">
                  <li className="flex items-center gap-2"><Check weight="bold" className="h-3.5 w-3.5 text-primary shrink-0" /> Unlimited active members</li>
                  <li className="flex items-center gap-2"><Check weight="bold" className="h-3.5 w-3.5 text-primary shrink-0" /> 10 Staff & Trainer accounts</li>
                  <li className="flex items-center gap-2"><Check weight="bold" className="h-3.5 w-3.5 text-primary shrink-0" /> WhatsApp Cloud Automation</li>
                  <li className="flex items-center gap-2"><Check weight="bold" className="h-3.5 w-3.5 text-primary shrink-0" /> Biometric Kiosk Terminal</li>
                  <li className="flex items-center gap-2"><Check weight="bold" className="h-3.5 w-3.5 text-primary shrink-0" /> Nutrition & Workout Blueprints</li>
                  <li className="flex items-center gap-2"><Check weight="bold" className="h-3.5 w-3.5 text-primary shrink-0" /> Outstanding Due Collection CRM</li>
                </ul>
              </div>
              <Link href="/login" className="mt-8">
                <Button size="pill" className="w-full text-xs font-semibold bg-primary hover:bg-primary/90 text-primary-foreground shadow-[0_1px_2px_rgba(0,0,0,0.3),inset_0_1px_0_0_rgba(255,255,255,0.2)] active:scale-[0.98] flex items-center justify-between pl-5 pr-2">
                  <span>Start Free Trial</span>
                  <ButtonIslandIcon>
                    <ArrowRight weight="bold" className="h-3.5 w-3.5" />
                  </ButtonIslandIcon>
                </Button>
              </Link>
            </DoubleBezelCard>

            {/* Enterprise Tier */}
            <div className="rounded-2xl border border-border/80 bg-card/50 backdrop-blur-md p-7 sm:p-8 flex flex-col justify-between shadow-2xs">
              <div>
                <h3 className="text-sm font-semibold tracking-tight text-foreground">Enterprise Multi-Branch</h3>
                <div className="mt-4 flex items-baseline">
                  <span className="text-3xl font-bold font-mono tracking-tight text-foreground tabular-nums">₹2,499</span>
                  <span className="text-xs text-muted-foreground ml-1 font-mono">/month</span>
                </div>
                <p className="mt-3 text-xs text-muted-foreground">For gym franchises and multi-facility chains.</p>
                <ul className="mt-6 space-y-2.5 text-xs text-muted-foreground">
                  <li className="flex items-center gap-2"><Check weight="bold" className="h-3.5 w-3.5 text-foreground shrink-0" /> Unlimited branches & locations</li>
                  <li className="flex items-center gap-2"><Check weight="bold" className="h-3.5 w-3.5 text-foreground shrink-0" /> Unlimited staff & trainer roles</li>
                  <li className="flex items-center gap-2"><Check weight="bold" className="h-3.5 w-3.5 text-foreground shrink-0" /> CCTV RTSP Face Recognition AI</li>
                  <li className="flex items-center gap-2"><Check weight="bold" className="h-3.5 w-3.5 text-foreground shrink-0" /> Consolidated Multi-Branch P&L</li>
                  <li className="flex items-center gap-2"><Check weight="bold" className="h-3.5 w-3.5 text-foreground shrink-0" /> Dedicated Technical SLA</li>
                </ul>
              </div>
              <Link href="/login" className="mt-8">
                <Button variant="outline" size="pill" className="w-full text-xs border-border/80 bg-card/40 backdrop-blur-md hover:bg-muted/80 text-foreground active:scale-[0.98]">
                  Start Free Trial
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* 6. High-SNR FAQ Section */}
      <section id="faq" className="py-24 md:py-32 border-b border-border/60">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-3xl">
          <div className="text-center mb-12">
            <h2 className="text-2xl font-bold tracking-tight text-foreground">
              Frequently asked questions
            </h2>
          </div>

          <Accordion type="single" collapsible className="space-y-3">
            <AccordionItem value="item-1" className="border border-border/70 bg-card/60 px-5 rounded-xl">
              <AccordionTrigger className="text-left text-xs sm:text-sm font-semibold text-foreground hover:no-underline">
                What is required to integrate WhatsApp automation?
              </AccordionTrigger>
              <AccordionContent className="text-xs text-muted-foreground leading-relaxed">
                GymERP communicates directly via Meta verified WhatsApp Business Cloud API. You only need a Meta Developer App and a dedicated phone number. All messages use official pre-approved templates for zero spam reports and 100% guaranteed delivery of receipts and renewal notices.
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="item-2" className="border border-border/70 bg-card/60 px-5 rounded-xl">
              <AccordionTrigger className="text-left text-xs sm:text-sm font-semibold text-foreground hover:no-underline">
                Do I need to purchase proprietary biometric hardware?
              </AccordionTrigger>
              <AccordionContent className="text-xs text-muted-foreground leading-relaxed">
                No. GymERP works with standard USB optical fingerprint scanners (like Mantra MFS100 / Startek) and any RTSP IP camera (Hikvision, CP Plus, Dahua). Our lightweight sidecar daemon runs on your front desk PC and handles AI face descriptor extraction locally with zero cloud latency.
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="item-3" className="border border-border/70 bg-card/60 px-5 rounded-xl">
              <AccordionTrigger className="text-left text-xs sm:text-sm font-semibold text-foreground hover:no-underline">
                How is data separated between gym branches?
              </AccordionTrigger>
              <AccordionContent className="text-xs text-muted-foreground leading-relaxed">
                We enforce PostgreSQL Row-Level Security. Staff assigned to Branch A cannot read or modify member records, payments, or attendance logs from Branch B. Only gym owners have cross-branch reporting visibility.
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="item-4" className="border border-border/70 bg-card/60 px-5 rounded-xl">
              <AccordionTrigger className="text-left text-xs sm:text-sm font-semibold text-foreground hover:no-underline">
                Is there a dedicated app for members?
              </AccordionTrigger>
              <AccordionContent className="text-xs text-muted-foreground leading-relaxed">
                Yes. GymERP includes an ultra-fast mobile Member Portal. Members log in using their registered mobile number with SMS OTP. They can view attendance streaks, remaining plan days, download payment receipts, and view assigned trainer workout and diet routines.
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        </div>
      </section>

      {/* 7. Clean Editorial Footer (Zero Em-Dashes) */}
      <footer className="mt-auto py-8 bg-background">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-7xl flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2.5">
            <div className="h-6 w-6 rounded-md bg-primary/10 border border-primary/20 flex items-center justify-center text-primary">
              <Barbell weight="duotone" className="h-3.5 w-3.5" />
            </div>
            <span className="text-xs font-semibold tracking-tight text-foreground font-mono">GymERP</span>
            <span className="text-[11px] text-muted-foreground/60 font-mono ml-2">Operating System for Modern Gyms</span>
          </div>
          <div className="flex items-center gap-5 text-xs text-muted-foreground">
            <Link href="/privacy" className="hover:text-foreground transition-colors">Privacy Policy</Link>
            <Link href="/terms" className="hover:text-foreground transition-colors">Terms of Service</Link>
            <span className="text-[11px] font-mono text-emerald-400 flex items-center gap-1.5">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
              All Systems Operational
            </span>
          </div>
        </div>
      </footer>
    </div>
  );
}
