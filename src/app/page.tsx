'use client';

import React from 'react';
import Link from 'next/link';
import { useAuth } from '@/hooks/useAuth';
import {
  Dumbbell,
  MessageSquare,
  Users,
  CreditCard,
  TrendingUp,
  Apple,
  Clock,
  Shield,
  Video,
  ChevronRight,
  Check,
  Star,
  Activity,
  Zap,
  Building2,
  Lock,
  ArrowRight,
  ScanFace,
  QrCode,
  Fingerprint,
  Sparkles,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';

export default function LandingPage() {
  const { isAuthenticated } = useAuth();

  return (
    <div className="flex flex-col min-h-screen bg-background text-foreground selection:bg-primary selection:text-primary-foreground">
      {/* Top Navbar */}
      <header className="sticky top-0 z-50 w-full border-b border-white/[0.08] bg-background/70 backdrop-blur-xl">
        <div className="container mx-auto flex h-16 items-center justify-between px-4 sm:px-6 lg:px-8 max-w-7xl">
          <div className="flex items-center gap-3">
            <div className="h-8.5 w-8.5 rounded-xl bg-primary/20 border border-primary/30 flex items-center justify-center text-primary shadow-[inset_0_1px_0_0_rgba(255,255,255,0.2)]">
              <Dumbbell className="h-4.5 w-4.5" />
            </div>
            <div className="flex items-center gap-2">
              <span className="text-base font-semibold tracking-tight text-foreground">
                GymERP
              </span>
              <Badge variant="outline" className="hidden sm:inline-flex text-[9px] font-mono px-2 py-0 border-white/[0.1] bg-white/[0.04] text-muted-foreground rounded-full">
                v2.4
              </Badge>
            </div>
          </div>

          <nav className="hidden md:flex items-center gap-7 text-xs font-medium text-muted-foreground">
            <a href="#features" className="hover:text-foreground transition-colors">Features</a>
            <a href="#preview" className="hover:text-foreground transition-colors">Platform</a>
            <a href="#pricing" className="hover:text-foreground transition-colors">Pricing</a>
            <a href="#faq" className="hover:text-foreground transition-colors">FAQ</a>
          </nav>

          <div className="flex items-center gap-2.5">
            <Link href="/staff/login">
              <Button variant="ghost" size="pill-sm" className="text-xs text-muted-foreground hover:text-foreground active:scale-[0.97]">
                Staff Login
              </Button>
            </Link>
            <Link href={isAuthenticated ? "/dashboard" : "/login"}>
              <Button size="pill-sm" className="text-xs font-semibold bg-primary hover:bg-primary/90 text-primary-foreground shadow-[0_1px_2px_rgba(0,0,0,0.3),inset_0_1px_0_0_rgba(255,255,255,0.2)] active:scale-[0.97] transition-[transform,background-color] duration-120 ease-out">
                {isAuthenticated ? "Go to Dashboard" : "Owner Login"}
              </Button>
            </Link>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative pt-20 pb-16 md:pt-28 md:pb-20 overflow-hidden">
        {/* Subtle radial ambient illumination */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[350px] bg-primary/[0.08] rounded-full blur-[140px] pointer-events-none -z-10" />

        <div className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-5xl text-center relative">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full border border-white/[0.1] bg-white/[0.04] backdrop-blur-md text-muted-foreground text-xs font-semibold mb-6 shadow-2xs">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75 duration-1000" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-primary" />
            </span>
            <span>The Operating System for Modern Indian Gyms 🇮🇳</span>
          </div>

          <h1 className="text-3xl sm:text-5xl md:text-6xl font-bold tracking-tight text-foreground leading-[1.12] max-w-4xl mx-auto apple-display">
            Complete control over memberships, billing & attendance.
          </h1>

          <p className="mt-5 text-sm sm:text-base text-muted-foreground max-w-2xl mx-auto leading-relaxed">
            Biometric face & optical fingerprint kiosks, automated WhatsApp GST invoicing, and custom diet blueprint engines — architected for multi-branch scale.
          </p>

          <div className="mt-8 flex flex-col sm:flex-row gap-3 justify-center items-center">
            <Link href="/login" className="w-full sm:w-auto">
              <Button size="pill" className="w-full sm:w-auto text-xs sm:text-sm font-semibold bg-primary hover:bg-primary/90 text-primary-foreground px-7 shadow-[0_1px_2px_rgba(0,0,0,0.3),inset_0_1px_0_0_rgba(255,255,255,0.22)] active:scale-[0.97] transition-[transform,background-color] duration-120 ease-out gap-2 cursor-pointer">
                Start Free Trial
                <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
            <a href="#features" className="w-full sm:w-auto">
              <Button variant="outline" size="pill" className="w-full sm:w-auto text-xs sm:text-sm border-white/[0.1] bg-card/40 backdrop-blur-md hover:bg-white/[0.08] text-foreground px-7 active:scale-[0.97] transition-[transform,background-color] duration-120 ease-out cursor-pointer">
                Explore Features
              </Button>
            </a>
          </div>

          {/* Operational metrics strip */}
          <div className="mt-14 grid grid-cols-2 md:grid-cols-4 gap-3.5 max-w-3xl mx-auto">
            <div className="rounded-2xl border border-white/[0.08] bg-card/50 backdrop-blur-md p-4 text-center shadow-[0_4px_24px_rgba(0,0,0,0.25),inset_0_1px_0_0_rgba(255,255,255,0.06)]">
              <div className="font-mono text-xl sm:text-2xl font-bold text-foreground tabular-nums">100%</div>
              <div className="text-[10px] font-mono text-muted-foreground uppercase tracking-wider mt-0.5 font-semibold">GST Invoicing</div>
            </div>
            <div className="rounded-2xl border border-white/[0.08] bg-card/50 backdrop-blur-md p-4 text-center shadow-[0_4px_24px_rgba(0,0,0,0.25),inset_0_1px_0_0_rgba(255,255,255,0.06)]">
              <div className="font-mono text-xl sm:text-2xl font-bold text-foreground tabular-nums">&lt; 1s</div>
              <div className="text-[10px] font-mono text-muted-foreground uppercase tracking-wider mt-0.5 font-semibold">WhatsApp Dispatch</div>
            </div>
            <div className="rounded-2xl border border-white/[0.08] bg-card/50 backdrop-blur-md p-4 text-center shadow-[0_4px_24px_rgba(0,0,0,0.25),inset_0_1px_0_0_rgba(255,255,255,0.06)]">
              <div className="font-mono text-xl sm:text-2xl font-bold text-foreground tabular-nums">99.9%</div>
              <div className="text-[10px] font-mono text-muted-foreground uppercase tracking-wider mt-0.5 font-semibold">Kiosk Uptime</div>
            </div>
            <div className="rounded-2xl border border-white/[0.08] bg-card/50 backdrop-blur-md p-4 text-center shadow-[0_4px_24px_rgba(0,0,0,0.25),inset_0_1px_0_0_rgba(255,255,255,0.06)]">
              <div className="font-mono text-xl sm:text-2xl font-bold text-foreground tabular-nums">RLS-4</div>
              <div className="text-[10px] font-mono text-muted-foreground uppercase tracking-wider mt-0.5 font-semibold">Branch Isolation</div>
            </div>
          </div>
        </div>
      </section>

      {/* Platform Showcase: Authentic Dashboard Preview Card */}
      <section id="preview" className="py-14 border-t border-white/[0.08] bg-muted/10 relative">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-6xl">
          <div className="rounded-2xl border border-white/[0.1] bg-card/60 backdrop-blur-2xl shadow-[0_24px_70px_-15px_rgba(0,0,0,0.7),inset_0_1px_0_0_rgba(255,255,255,0.12)] overflow-hidden">
            {/* Window chrome header */}
            <div className="h-10 border-b border-white/[0.08] bg-white/[0.03] backdrop-blur-md px-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="h-2.5 w-2.5 rounded-full bg-zinc-600/70" />
                <div className="h-2.5 w-2.5 rounded-full bg-zinc-600/70" />
                <div className="h-2.5 w-2.5 rounded-full bg-zinc-600/70" />
                <span className="text-[11px] font-mono text-muted-foreground ml-2 hidden sm:inline">
                  gymerp.app/dashboard
                </span>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="text-[10px] font-mono border-white/[0.08] bg-white/[0.04] text-muted-foreground rounded-full">
                  <Building2 className="h-2.5 w-2.5 mr-1" /> Connaught Place Branch
                </Badge>
                <span className="flex items-center gap-1.5 text-[10px] font-mono text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-full font-semibold">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                  RTSP Online
                </span>
              </div>
            </div>

            {/* Mockup Dashboard Content */}
            <div className="p-5 sm:p-7 space-y-5 bg-background/50">
              {/* Snapshot row */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="rounded-2xl border border-white/[0.08] bg-card/60 backdrop-blur-md p-4 flex items-center justify-between shadow-2xs">
                  <div>
                    <span className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground font-semibold">Today's Collections</span>
                    <div className="text-xl font-bold font-mono text-foreground mt-0.5 tabular-nums">₹48,250</div>
                  </div>
                  <div className="h-8 w-8 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 flex items-center justify-center text-xs font-bold shadow-xs">
                    ₹
                  </div>
                </div>
                <div className="rounded-2xl border border-white/[0.08] bg-card/60 backdrop-blur-md p-4 flex items-center justify-between shadow-2xs">
                  <div>
                    <span className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground font-semibold">Live Floor Attendance</span>
                    <div className="text-xl font-bold font-mono text-foreground mt-0.5 tabular-nums">142 Checked-in</div>
                  </div>
                  <div className="h-8 w-8 rounded-xl bg-primary/15 border border-primary/30 text-primary flex items-center justify-center shadow-xs">
                    <Users className="h-4 w-4" />
                  </div>
                </div>
                <div className="rounded-2xl border border-white/[0.08] bg-card/60 backdrop-blur-md p-4 flex items-center justify-between shadow-2xs">
                  <div>
                    <span className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground font-semibold">Active Trainee Profiles</span>
                    <div className="text-xl font-bold font-mono text-foreground mt-0.5 tabular-nums">389 Members</div>
                  </div>
                  <div className="h-8 w-8 rounded-xl bg-blue-500/15 border border-blue-500/30 text-blue-400 flex items-center justify-center shadow-xs">
                    <TrendingUp className="h-4 w-4" />
                  </div>
                </div>
              </div>

              {/* Feed & analytics split */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Live stream mock */}
                <div className="rounded-2xl border border-white/[0.08] bg-card/50 backdrop-blur-md p-4.5 space-y-3 md:col-span-2 shadow-2xs">
                  <div className="flex items-center justify-between border-b border-white/[0.06] pb-2.5">
                    <div className="flex items-center gap-2">
                      <Activity className="h-3.5 w-3.5 text-primary" />
                      <span className="text-xs font-semibold tracking-tight text-foreground">Real-Time Attendance Feed</span>
                    </div>
                    <span className="text-[10px] font-mono text-muted-foreground">Updated in real-time</span>
                  </div>
                  <div className="divide-y divide-white/[0.04] text-xs">
                    <div className="flex items-center justify-between py-2.5">
                      <div className="flex items-center gap-2.5">
                        <div className="h-7.5 w-7.5 rounded-full bg-white/[0.06] border border-white/[0.1] flex items-center justify-center font-mono text-[10px] font-bold text-foreground shadow-2xs">AS</div>
                        <div>
                          <div className="font-medium text-foreground">Aryan Sharma</div>
                          <div className="text-[10px] text-muted-foreground">Annual Pro • Personal Training</div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="text-[9px] font-mono border-emerald-500/30 text-emerald-400 bg-emerald-500/10 rounded-full font-semibold">FACE VERIFIED</Badge>
                        <span className="text-[10px] font-mono text-muted-foreground tabular-nums">09:42 AM</span>
                      </div>
                    </div>
                    <div className="flex items-center justify-between py-2.5">
                      <div className="flex items-center gap-2.5">
                        <div className="h-7.5 w-7.5 rounded-full bg-white/[0.06] border border-white/[0.1] flex items-center justify-center font-mono text-[10px] font-bold text-foreground shadow-2xs">PV</div>
                        <div>
                          <div className="font-medium text-foreground">Pooja Verma</div>
                          <div className="text-[10px] text-muted-foreground">Quarterly Strength</div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="text-[9px] font-mono border-blue-500/30 text-blue-400 bg-blue-500/10 rounded-full font-semibold">FINGERPRINT</Badge>
                        <span className="text-[10px] font-mono text-muted-foreground tabular-nums">09:39 AM</span>
                      </div>
                    </div>
                    <div className="flex items-center justify-between py-2.5">
                      <div className="flex items-center gap-2.5">
                        <div className="h-7.5 w-7.5 rounded-full bg-white/[0.06] border border-white/[0.1] flex items-center justify-center font-mono text-[10px] font-bold text-foreground shadow-2xs">RK</div>
                        <div>
                          <div className="font-medium text-foreground">Rahul Kapoor</div>
                          <div className="text-[10px] text-muted-foreground">Monthly Cardio</div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="text-[9px] font-mono border-white/[0.08] bg-white/[0.03] text-muted-foreground rounded-full font-semibold">QR SCAN</Badge>
                        <span className="text-[10px] font-mono text-muted-foreground tabular-nums">09:35 AM</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* WhatsApp Status Mini card */}
                <div className="rounded-2xl border border-white/[0.08] bg-card/50 backdrop-blur-md p-4.5 space-y-3 flex flex-col justify-between shadow-2xs">
                  <div>
                    <div className="flex items-center gap-2 border-b border-white/[0.06] pb-2.5">
                      <MessageSquare className="h-3.5 w-3.5 text-emerald-400" />
                      <span className="text-xs font-semibold tracking-tight text-foreground">WhatsApp Engine</span>
                    </div>
                    <div className="mt-3 space-y-2 text-xs">
                      <div className="flex justify-between text-muted-foreground text-[11px]">
                        <span>Cloud API Gateway</span>
                        <span className="text-emerald-400 font-mono font-medium">Connected</span>
                      </div>
                      <div className="flex justify-between text-muted-foreground text-[11px]">
                        <span>Auto-Invoices Today</span>
                        <span className="font-mono text-foreground tabular-nums">24 Sent</span>
                      </div>
                      <div className="flex justify-between text-muted-foreground text-[11px]">
                        <span>Renewal Nudges</span>
                        <span className="font-mono text-foreground tabular-nums">11 Queued</span>
                      </div>
                    </div>
                  </div>
                  <div className="rounded-xl bg-white/[0.03] border border-white/[0.06] p-2.5 text-[11px] text-muted-foreground leading-relaxed">
                    ⚡ Instant PDF delivery on payment confirmation.
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Feature Bento Grid */}
      <section id="features" className="py-20 border-t border-white/[0.08]">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-6xl">
          <div className="text-center max-w-2xl mx-auto mb-14">
            <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground apple-display">
              Engineered for floor speed & operational rigor
            </h2>
            <p className="mt-2 text-xs sm:text-sm text-muted-foreground">
              Eliminate paper logs, spreadsheet sync errors, and uncollected dues with purpose-built automation.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Card 1 (Span 2) */}
            <div className="md:col-span-2 rounded-2xl border border-white/[0.08] bg-card/50 backdrop-blur-md shadow-[0_4px_24px_rgba(0,0,0,0.2),inset_0_1px_0_0_rgba(255,255,255,0.06)] p-7 flex flex-col justify-between">
              <div>
                <div className="h-9 w-9 rounded-xl bg-primary/15 border border-primary/30 text-primary flex items-center justify-center mb-4 shadow-xs">
                  <ScanFace className="h-5 w-5" />
                </div>
                <h3 className="text-base font-semibold tracking-tight text-foreground">
                  Biometric Face & Optical Fingerprint Kiosks
                </h3>
                <p className="text-xs sm:text-sm text-muted-foreground mt-1.5 leading-relaxed">
                  Turn any standard IP camera, tablet, or USB biometric scanner into an unforgeable attendance kiosk. 128-dimensional face embedding vectors matched locally via browser WASM and Python sidecar with sub-second response times.
                </p>
              </div>
              <div className="mt-6 pt-4 border-t border-white/[0.06] flex flex-wrap gap-2 text-[10px] font-mono text-muted-foreground font-semibold">
                <span className="bg-white/[0.04] px-2.5 py-1 rounded-full border border-white/[0.08]">RTSP Stream Support</span>
                <span className="bg-white/[0.04] px-2.5 py-1 rounded-full border border-white/[0.08]">Dual-Camera Flipping</span>
                <span className="bg-white/[0.04] px-2.5 py-1 rounded-full border border-white/[0.08]">Offline Grace Period</span>
              </div>
            </div>

            {/* Card 2 */}
            <div className="rounded-2xl border border-white/[0.08] bg-card/50 backdrop-blur-md shadow-[0_4px_24px_rgba(0,0,0,0.2),inset_0_1px_0_0_rgba(255,255,255,0.06)] p-7 flex flex-col justify-between">
              <div>
                <div className="h-9 w-9 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 flex items-center justify-center mb-4 shadow-xs">
                  <MessageSquare className="h-5 w-5" />
                </div>
                <h3 className="text-base font-semibold tracking-tight text-foreground">
                  Official WhatsApp Automation
                </h3>
                <p className="text-xs sm:text-sm text-muted-foreground mt-1.5 leading-relaxed">
                  Send GST-compliant tax invoices, payment receipts, and expiring plan reminders via Meta's verified WhatsApp Cloud API. Zero ban risk, 100% deliverability.
                </p>
              </div>
              <div className="mt-6 pt-4 border-t border-white/[0.06] text-[10px] font-mono text-muted-foreground font-semibold">
                Meta Verified Cloud API
              </div>
            </div>

            {/* Card 3 */}
            <div className="rounded-2xl border border-white/[0.08] bg-card/50 backdrop-blur-md shadow-[0_4px_24px_rgba(0,0,0,0.2),inset_0_1px_0_0_rgba(255,255,255,0.06)] p-7 flex flex-col justify-between">
              <div>
                <div className="h-9 w-9 rounded-xl bg-amber-500/15 border border-amber-500/30 text-amber-400 flex items-center justify-center mb-4 shadow-xs">
                  <Apple className="h-5 w-5" />
                </div>
                <h3 className="text-base font-semibold tracking-tight text-foreground">
                  Nutrition & Workout Blueprints
                </h3>
                <p className="text-xs sm:text-sm text-muted-foreground mt-1.5 leading-relaxed">
                  Construct customized meal-by-meal diets and workout splits. Export studio-grade PDFs that automatically attach to member welcome packages.
                </p>
              </div>
              <div className="mt-6 pt-4 border-t border-white/[0.06] text-[10px] font-mono text-muted-foreground font-semibold">
                Calibrated Macro Math & Split Templates
              </div>
            </div>

            {/* Card 4 (Span 2) */}
            <div className="md:col-span-2 rounded-2xl border border-white/[0.08] bg-card/50 backdrop-blur-md shadow-[0_4px_24px_rgba(0,0,0,0.2),inset_0_1px_0_0_rgba(255,255,255,0.06)] p-7 flex flex-col justify-between">
              <div>
                <div className="h-9 w-9 rounded-xl bg-primary/15 border border-primary/30 text-primary flex items-center justify-center mb-4 shadow-xs">
                  <Shield className="h-5 w-5" />
                </div>
                <h3 className="text-base font-semibold tracking-tight text-foreground">
                  Multi-Branch Hierarchy & Role-Based Security
                </h3>
                <p className="text-xs sm:text-sm text-muted-foreground mt-1.5 leading-relaxed">
                  Gym owners view consolidated enterprise analytics while staff and trainers are strictly quarantined to their assigned facility via PostgreSQL Row-Level Security (RLS). Trainers only access workout routines and client logs; financial data remains strictly confidential.
                </p>
              </div>
              <div className="mt-6 pt-4 border-t border-white/[0.06] flex flex-wrap gap-2 text-[10px] font-mono text-muted-foreground font-semibold">
                <span className="bg-white/[0.04] px-2.5 py-1 rounded-full border border-white/[0.08]">PostgreSQL RLS Policies</span>
                <span className="bg-white/[0.04] px-2.5 py-1 rounded-full border border-white/[0.08]">Granular Role RBAC</span>
                <span className="bg-white/[0.04] px-2.5 py-1 rounded-full border border-white/[0.08]">Multi-Location Branch Switcher</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section id="pricing" className="py-20 border-t border-white/[0.08] bg-muted/10">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-6xl">
          <div className="text-center max-w-2xl mx-auto mb-14">
            <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground apple-display">
              Simple, transparent pricing
            </h2>
            <p className="mt-2 text-xs sm:text-sm text-muted-foreground">
              Start free, scale into hardware kiosks and multi-branch management as your membership expands.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-5 max-w-5xl mx-auto">
            {/* Free Starter */}
            <div className="rounded-2xl border border-white/[0.08] bg-card/50 backdrop-blur-md shadow-[0_4px_24px_rgba(0,0,0,0.2),inset_0_1px_0_0_rgba(255,255,255,0.06)] p-7 sm:p-8 flex flex-col justify-between">
              <div>
                <h3 className="text-sm font-semibold tracking-tight text-foreground">Starter</h3>
                <div className="mt-4 flex items-baseline">
                  <span className="text-3xl font-bold font-mono tracking-tight text-foreground tabular-nums">₹0</span>
                  <span className="text-xs text-muted-foreground ml-1 font-mono">/month</span>
                </div>
                <p className="mt-3 text-xs text-muted-foreground">Essential management for personal fitness studios.</p>
                <ul className="mt-6 space-y-2.5 text-xs text-muted-foreground">
                  <li className="flex items-center gap-2"><Check className="h-3.5 w-3.5 text-foreground shrink-0" /> Up to 50 active members</li>
                  <li className="flex items-center gap-2"><Check className="h-3.5 w-3.5 text-foreground shrink-0" /> 2 Staff accounts</li>
                  <li className="flex items-center gap-2"><Check className="h-3.5 w-3.5 text-foreground shrink-0" /> QR & Manual Attendance</li>
                  <li className="flex items-center gap-2"><Check className="h-3.5 w-3.5 text-foreground shrink-0" /> GST Invoice PDF Engine</li>
                  <li className="flex items-center gap-2"><Check className="h-3.5 w-3.5 text-foreground shrink-0" /> Member Web Portal</li>
                </ul>
              </div>
              <Link href="/login" className="mt-8">
                <Button variant="outline" size="pill" className="w-full text-xs border-white/[0.1] bg-card/40 backdrop-blur-md hover:bg-white/[0.08] text-foreground active:scale-[0.97] transition-[transform,background-color] duration-120 ease-out cursor-pointer">
                  Get Started Free
                </Button>
              </Link>
            </div>

            {/* Professional Tier (Highlighted) */}
            <div className="rounded-2xl border-2 border-primary/80 bg-card/85 backdrop-blur-2xl p-7 sm:p-8 flex flex-col justify-between relative shadow-[0_12px_45px_rgba(99,102,241,0.25),inset_0_1px_0_0_rgba(255,255,255,0.2)]">
              <div className="absolute top-0 right-6 -translate-y-1/2 bg-primary text-primary-foreground px-3 py-1 rounded-full text-[9px] font-mono font-bold uppercase tracking-wider shadow-md">
                Recommended
              </div>
              <div>
                <h3 className="text-sm font-semibold tracking-tight text-foreground">Professional</h3>
                <div className="mt-4 flex items-baseline">
                  <span className="text-3xl font-bold font-mono tracking-tight text-foreground tabular-nums">₹999</span>
                  <span className="text-xs text-muted-foreground ml-1 font-mono">/month</span>
                </div>
                <p className="mt-3 text-xs text-muted-foreground">Full automation for growing health clubs.</p>
                <ul className="mt-6 space-y-2.5 text-xs text-foreground/90">
                  <li className="flex items-center gap-2"><Check className="h-3.5 w-3.5 text-primary shrink-0" /> Unlimited active members</li>
                  <li className="flex items-center gap-2"><Check className="h-3.5 w-3.5 text-primary shrink-0" /> 10 Staff & Trainer accounts</li>
                  <li className="flex items-center gap-2"><Check className="h-3.5 w-3.5 text-primary shrink-0" /> WhatsApp Cloud Automation</li>
                  <li className="flex items-center gap-2"><Check className="h-3.5 w-3.5 text-primary shrink-0" /> Biometric Kiosk Terminal</li>
                  <li className="flex items-center gap-2"><Check className="h-3.5 w-3.5 text-primary shrink-0" /> Nutrition & Workout Blueprints</li>
                  <li className="flex items-center gap-2"><Check className="h-3.5 w-3.5 text-primary shrink-0" /> Outstanding Due Collection CRM</li>
                </ul>
              </div>
              <Link href="/login" className="mt-8">
                <Button size="pill" className="w-full text-xs font-semibold bg-primary hover:bg-primary/90 text-primary-foreground shadow-[0_1px_2px_rgba(0,0,0,0.3),inset_0_1px_0_0_rgba(255,255,255,0.2)] active:scale-[0.97] transition-[transform,background-color] duration-120 ease-out cursor-pointer">
                  Start Pro Trial
                </Button>
              </Link>
            </div>

            {/* Enterprise Tier */}
            <div className="rounded-2xl border border-white/[0.08] bg-card/50 backdrop-blur-md shadow-[0_4px_24px_rgba(0,0,0,0.2),inset_0_1px_0_0_rgba(255,255,255,0.06)] p-7 sm:p-8 flex flex-col justify-between">
              <div>
                <h3 className="text-sm font-semibold tracking-tight text-foreground">Enterprise Multi-Branch</h3>
                <div className="mt-4 flex items-baseline">
                  <span className="text-3xl font-bold font-mono tracking-tight text-foreground tabular-nums">₹2,499</span>
                  <span className="text-xs text-muted-foreground ml-1 font-mono">/month</span>
                </div>
                <p className="mt-3 text-xs text-muted-foreground">For gym franchises and multi-facility chains.</p>
                <ul className="mt-6 space-y-2.5 text-xs text-muted-foreground">
                  <li className="flex items-center gap-2"><Check className="h-3.5 w-3.5 text-foreground shrink-0" /> Unlimited branches & locations</li>
                  <li className="flex items-center gap-2"><Check className="h-3.5 w-3.5 text-foreground shrink-0" /> Unlimited staff & trainer roles</li>
                  <li className="flex items-center gap-2"><Check className="h-3.5 w-3.5 text-foreground shrink-0" /> CCTV RTSP Face Recognition AI</li>
                  <li className="flex items-center gap-2"><Check className="h-3.5 w-3.5 text-foreground shrink-0" /> Consolidated Multi-Branch P&L</li>
                  <li className="flex items-center gap-2"><Check className="h-3.5 w-3.5 text-foreground shrink-0" /> Dedicated Technical SLA</li>
                </ul>
              </div>
              <Link href="/login" className="mt-8">
                <Button variant="outline" size="pill" className="w-full text-xs border-white/[0.1] bg-card/40 backdrop-blur-md hover:bg-white/[0.08] text-foreground active:scale-[0.97] transition-[transform,background-color] duration-120 ease-out cursor-pointer">
                  Contact Sales
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section id="faq" className="py-20 border-t border-border/60">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-3xl">
          <div className="text-center mb-12">
            <h2 className="text-2xl font-bold tracking-tight text-foreground">Frequently Asked Questions</h2>
          </div>

          <Accordion type="single" collapsible className="space-y-3">
            <AccordionItem value="item-1" className="border border-border/70 bg-card/60 px-5 rounded-xl">
              <AccordionTrigger className="text-left text-xs sm:text-sm font-semibold text-foreground hover:no-underline">
                What is required to integrate WhatsApp automation?
              </AccordionTrigger>
              <AccordionContent className="text-xs text-muted-foreground leading-relaxed">
                GymERP communicates directly via Meta's official WhatsApp Business Cloud API. You only need a Meta Developer App and a dedicated phone number. All messages use official pre-approved templates for zero spam reports and 100% guaranteed delivery of receipts and renewal notices.
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="item-2" className="border-border/70 bg-card/60 px-5 rounded-xl border">
              <AccordionTrigger className="text-left text-xs sm:text-sm font-semibold text-foreground hover:no-underline">
                Do I need to purchase proprietary biometric hardware?
              </AccordionTrigger>
              <AccordionContent className="text-xs text-muted-foreground leading-relaxed">
                No. GymERP works with standard USB optical fingerprint scanners (like Mantra MFS100 / Startek) and any RTSP IP camera (Hikvision, CP Plus, Dahua). Our lightweight sidecar daemon runs on your front desk PC and handles AI face descriptor extraction locally with zero cloud latency.
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="item-3" className="border-border/70 bg-card/60 px-5 rounded-xl border">
              <AccordionTrigger className="text-left text-xs sm:text-sm font-semibold text-foreground hover:no-underline">
                How is data separated between gym branches?
              </AccordionTrigger>
              <AccordionContent className="text-xs text-muted-foreground leading-relaxed">
                We enforce PostgreSQL Row-Level Security (RLS). Staff assigned to Branch A cannot read or modify member records, payments, or attendance logs from Branch B. Only gym owners have cross-branch reporting visibility.
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="item-4" className="border-border/70 bg-card/60 px-5 rounded-xl border">
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

      {/* Footer */}
      <footer className="mt-auto border-t border-border/70 py-8 bg-background">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-7xl flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2.5">
            <div className="h-6 w-6 rounded-md bg-primary/10 border border-primary/20 flex items-center justify-center text-primary">
              <Dumbbell className="h-3.5 w-3.5" />
            </div>
            <span className="text-xs font-semibold tracking-tight text-foreground">GymERP</span>
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
