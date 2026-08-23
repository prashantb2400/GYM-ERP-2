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
  UserCheck,
  Zap,
  Menu,
  X,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';

import { AuroraBackground, Particles, Meteors, GradientText, TypewriterText, BlurInText, NumberTicker, SpotlightCard, BorderBeam, ShinyButton } from '@/components/magicui';

export default function LandingPage() {
  const { isAuthenticated } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = React.useState(false);

  return (
    <AuroraBackground className="flex flex-col min-h-screen bg-zinc-950 text-zinc-50 selection:bg-purple-600 selection:text-white w-full">
      <Meteors number={15} />
      {/* Navbar */}
      <header className="sticky top-0 z-50 w-full border-b border-zinc-800 bg-zinc-950/80 backdrop-blur-md">
        <div className="container mx-auto flex h-16 items-center justify-between px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-2">
            <div className="bg-purple-600 p-2 rounded-lg flex items-center justify-center">
              <Dumbbell className="h-6 w-6 text-white rotate-45" />
            </div>
            <span className="text-xl font-bold tracking-tight bg-gradient-to-r from-white via-purple-200 to-purple-400 bg-clip-text text-transparent">
              GymERP
            </span>
          </div>

          <nav className="hidden md:flex items-center gap-6 text-sm font-medium text-zinc-400">
            <a href="#features" className="hover:text-purple-400 transition-colors">Features</a>
            <a href="#pricing" className="hover:text-purple-400 transition-colors">Pricing</a>
            <a href="#faq" className="hover:text-purple-400 transition-colors">FAQ</a>
          </nav>

          <div className="hidden sm:flex items-center gap-3">
            <Link href="/staff/login">
              <Button variant="ghost" className="text-zinc-400 hover:text-white text-sm">
                Staff Login
              </Button>
            </Link>
            <Link href={isAuthenticated ? "/dashboard" : "/login"}>
              <Button className="bg-purple-600 hover:bg-purple-700 text-white text-sm font-medium px-4 py-2 rounded-lg shadow-lg shadow-purple-600/20 transition-all">
                {isAuthenticated ? "Go to Dashboard" : "Owner Login"}
              </Button>
            </Link>
          </div>

          {/* M-29 FIX: Mobile menu hamburger toggle */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="sm:hidden p-2 text-zinc-400 hover:text-white"
            aria-label="Toggle navigation menu"
          >
            {mobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          </button>
        </div>

        {/* Mobile Navigation Drawer */}
        {mobileMenuOpen && (
          <div className="sm:hidden border-b border-zinc-800 bg-zinc-950/95 px-6 py-4 space-y-3">
            <a
              href="#features"
              onClick={() => setMobileMenuOpen(false)}
              className="block text-sm font-medium text-zinc-300 hover:text-purple-400"
            >
              Features
            </a>
            <a
              href="#pricing"
              onClick={() => setMobileMenuOpen(false)}
              className="block text-sm font-medium text-zinc-300 hover:text-purple-400"
            >
              Pricing
            </a>
            <a
              href="#faq"
              onClick={() => setMobileMenuOpen(false)}
              className="block text-sm font-medium text-zinc-300 hover:text-purple-400"
            >
              FAQ
            </a>
            <div className="pt-3 border-t border-zinc-800 flex flex-col gap-2">
              <Link href="/staff/login" onClick={() => setMobileMenuOpen(false)}>
                <Button variant="outline" className="w-full text-zinc-300 border-zinc-800 text-sm">
                  Staff Login
                </Button>
              </Link>
              <Link href={isAuthenticated ? "/dashboard" : "/login"} onClick={() => setMobileMenuOpen(false)}>
                <Button className="w-full bg-purple-600 hover:bg-purple-700 text-white text-sm">
                  {isAuthenticated ? "Go to Dashboard" : "Owner Login"}
                </Button>
              </Link>
            </div>
          </div>
        )}
      </header>

      {/* Hero Section */}
      <section className="relative py-24 md:py-32 overflow-hidden flex flex-col justify-center items-center text-center">
        <Particles className="absolute inset-0 z-0" />
        {/* Ambient background glow */}
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-purple-700/10 rounded-full blur-[120px] pointer-events-none" />
        <div className="absolute top-1/3 left-1/4 w-[300px] h-[300px] bg-blue-600/5 rounded-full blur-[100px] pointer-events-none" />

        <div className="container mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-purple-500/20 bg-purple-500/5 text-purple-400 text-xs font-semibold mb-6 animate-pulse">
            <Zap className="h-3 w-3" /> Built for Indian Gyms 🇮🇳
          </div>
          
          <h1 className="text-4xl sm:text-6xl md:text-7xl font-extrabold tracking-tight leading-tight max-w-5xl mx-auto">
            <GradientText>Supercharge Your Gym Operations With GymERP</GradientText>
          </h1>
          
          <div className="mt-6 text-lg sm:text-xl text-zinc-400 max-w-3xl mx-auto leading-relaxed min-h-[80px]">
            <TypewriterText words={["Automate membership management", "Automate renewal billing", "Automate attendance", "Automate member communications", "All in one multi-tenant SaaS."]} />
          </div>

          <div className="mt-10 flex flex-col sm:flex-row gap-4 justify-center items-center">
            <Link href="/login" passHref legacyBehavior>
              <ShinyButton className="w-full sm:w-auto h-12 bg-purple-600 hover:bg-purple-700 text-white font-medium text-base px-8 rounded-lg shadow-xl shadow-purple-600/30 transition-all flex items-center justify-center gap-2 group">
                Start Free Trial <ChevronRight className="h-5 w-5 group-hover:translate-x-1 transition-transform" />
              </ShinyButton>
            </Link>
            <Link href="#features" passHref legacyBehavior>
              <Button variant="outline" className="w-full sm:w-auto h-12 border-zinc-800 hover:bg-zinc-900 text-zinc-300 font-medium text-base px-8 rounded-lg">
                Explore Features
              </Button>
            </Link>
          </div>

          {/* Stat strips */}
          <div className="mt-20 grid grid-cols-2 md:grid-cols-4 gap-6 max-w-4xl mx-auto border border-zinc-800 bg-zinc-900/40 backdrop-blur-sm p-6 rounded-2xl">
            <div className="text-center border-r border-zinc-800/60 last:border-0">
              <div className="text-3xl font-extrabold text-purple-400"><NumberTicker value={100} />%</div>
              <div className="text-xs text-zinc-500 mt-1 uppercase tracking-wider">Automated Billing</div>
            </div>
            <div className="text-center md:border-r border-zinc-800/60 last:border-0">
              <div className="text-3xl font-extrabold text-purple-400">&lt; <NumberTicker value={1} />s</div>
              <div className="text-xs text-zinc-500 mt-1 uppercase tracking-wider">WhatsApp Sends</div>
            </div>
            <div className="text-center border-r border-zinc-800/60 last:border-0">
              <div className="text-3xl font-extrabold text-purple-400"><NumberTicker value={98} />%</div>
              <div className="text-xs text-zinc-500 mt-1 uppercase tracking-wider">Renewal Retention</div>
            </div>
            <div className="text-center last:border-0">
              <div className="text-3xl font-extrabold text-purple-400"><NumberTicker value={1} /> Click</div>
              <div className="text-xs text-zinc-500 mt-1 uppercase tracking-wider">CCTV Enrollment</div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Grid */}
      <section id="features" className="py-24 border-t border-zinc-900 bg-zinc-900/20">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold tracking-tight">Everything You Need to Run Your Gym</h2>
            <p className="mt-4 text-zinc-400 text-base sm:text-lg">
              Say goodbye to sheets, manual cash logs, and chasing dues. GymERP automates your workload so you can focus on building relationships.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 animate-stagger">
            {/* Card 1 */}
            <SpotlightCard className="glass-card border-zinc-800 bg-zinc-950/40 p-6 flex flex-col justify-between">
              <CardContent className="p-0">
                <div className="bg-purple-600/10 p-3 rounded-lg w-fit text-purple-400 mb-6">
                  <Users className="h-6 w-6" />
                </div>
                <h3 className="text-lg font-bold text-zinc-50 mb-2">Member CRM</h3>
                <p className="text-sm text-zinc-400 leading-relaxed">
                  Track profiles, plan history, metrics, and documents. Access details from any device with mobile-optimized designs.
                </p>
              </CardContent>
            </SpotlightCard>

            {/* Card 2 */}
            <SpotlightCard className="glass-card border-zinc-800 bg-zinc-950/40 p-6 flex flex-col justify-between">
              <CardContent className="p-0">
                <div className="bg-purple-600/10 p-3 rounded-lg w-fit text-purple-400 mb-6">
                  <MessageSquare className="h-6 w-6" />
                </div>
                <h3 className="text-lg font-bold text-zinc-50 mb-2">WhatsApp Automation</h3>
                <p className="text-sm text-zinc-400 leading-relaxed">
                  Auto-send welcome messages, due reminders, and invoices using Meta's official WhatsApp Business Cloud API.
                </p>
              </CardContent>
            </SpotlightCard>

            {/* Card 3 */}
            <SpotlightCard className="glass-card border-zinc-800 bg-zinc-950/40 p-6 flex flex-col justify-between">
              <CardContent className="p-0">
                <div className="bg-purple-600/10 p-3 rounded-lg w-fit text-purple-400 mb-6">
                  <Video className="h-6 w-6" />
                </div>
                <h3 className="text-lg font-bold text-zinc-50 mb-2">CCTV Face Attendance</h3>
                <p className="text-sm text-zinc-400 leading-relaxed">
                  Recognize members instantly on entrance with IP cameras. Automatically log check-ins and trigger real-time tickers.
                </p>
              </CardContent>
            </SpotlightCard>

            {/* Card 4 */}
            <SpotlightCard className="glass-card border-zinc-800 bg-zinc-950/40 p-6 flex flex-col justify-between">
              <CardContent className="p-0">
                <div className="bg-purple-600/10 p-3 rounded-lg w-fit text-purple-400 mb-6">
                  <CreditCard className="h-6 w-6" />
                </div>
                <h3 className="text-lg font-bold text-zinc-50 mb-2">Indian Billing (GST)</h3>
                <p className="text-sm text-zinc-400 leading-relaxed">
                  Create compliant GST invoices split by CGST/SGST. Enable quick payment records, discounts, and outstanding collection trackers.
                </p>
              </CardContent>
            </SpotlightCard>

            {/* Card 5 */}
            <SpotlightCard className="glass-card border-zinc-800 bg-zinc-950/40 p-6 flex flex-col justify-between">
              <CardContent className="p-0">
                <div className="bg-purple-600/10 p-3 rounded-lg w-fit text-purple-400 mb-6">
                  <Apple className="h-6 w-6" />
                </div>
                <h3 className="text-lg font-bold text-zinc-50 mb-2">Diet & Exercise Builders</h3>
                <p className="text-sm text-zinc-400 leading-relaxed">
                  Construct customized meal-by-meal diets and workout schedules. Bundle them into neat PDFs that auto-send on plan renewals.
                </p>
              </CardContent>
            </SpotlightCard>

            {/* Card 6 */}
            <SpotlightCard className="glass-card border-zinc-800 bg-zinc-950/40 p-6 flex flex-col justify-between">
              <CardContent className="p-0">
                <div className="bg-purple-600/10 p-3 rounded-lg w-fit text-purple-400 mb-6">
                  <Clock className="h-6 w-6" />
                </div>
                <h3 className="text-lg font-bold text-zinc-50 mb-2">Daily Summary & Crons</h3>
                <p className="text-sm text-zinc-400 leading-relaxed">
                  Receive a daily executive report on WhatsApp summarizing new joins, renewals, revenue, outstanding dues, and attendance.
                </p>
              </CardContent>
            </SpotlightCard>
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section id="pricing" className="py-24 border-t border-zinc-900">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold tracking-tight">Simple, Transparent Pricing</h2>
            <p className="mt-4 text-zinc-400 text-base sm:text-lg">
              Start completely free, and upgrade features as your membership grows.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-5xl mx-auto">
            {/* Free Tier */}
            <SpotlightCard className="border border-zinc-800 bg-zinc-900/30 p-8 rounded-2xl flex flex-col justify-between relative overflow-hidden">
              <div>
                <h3 className="text-lg font-bold text-zinc-100">Free</h3>
                <div className="mt-4 flex items-baseline">
                  <span className="text-4xl font-extrabold tracking-tight">₹0</span>
                  <span className="text-sm text-zinc-400 ml-1">/month</span>
                </div>
                <p className="mt-4 text-xs text-zinc-400">Great for getting started or small personal studios.</p>
                <ul className="mt-8 space-y-3 text-sm text-zinc-300">
                  <li className="flex items-center gap-2"><Check className="h-4 w-4 text-purple-400 shrink-0" /> Up to 50 members</li>
                  <li className="flex items-center gap-2"><Check className="h-4 w-4 text-purple-400 shrink-0" /> 2 Staff accounts</li>
                  <li className="flex items-center gap-2"><Check className="h-4 w-4 text-purple-400 shrink-0" /> Manual Attendance</li>
                  <li className="flex items-center gap-2"><Check className="h-4 w-4 text-purple-400 shrink-0" /> Basic Invoice PDFs</li>
                  <li className="flex items-center gap-2"><Check className="h-4 w-4 text-purple-400 shrink-0" /> 50 WhatsApp / month</li>
                </ul>
              </div>
              <Link href="/login" passHref legacyBehavior>
                <Button variant="outline" className="w-full mt-8 border-zinc-700 text-zinc-300 hover:bg-zinc-800">
                  Get Started
                </Button>
              </Link>
            </SpotlightCard>

            {/* Pro Tier (Popular) */}
            <SpotlightCard className="border-2 border-purple-500 bg-zinc-900/60 p-8 rounded-2xl flex flex-col justify-between relative shadow-2xl shadow-purple-600/10">
              <BorderBeam />
              <div className="absolute top-0 right-6 -translate-y-1/2 bg-purple-500 text-white px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider">
                Popular
              </div>
              <div>
                <h3 className="text-lg font-bold text-zinc-100">Pro</h3>
                <div className="mt-4 flex items-baseline">
                  <span className="text-4xl font-extrabold tracking-tight">₹999</span>
                  <span className="text-sm text-zinc-400 ml-1">/month</span>
                </div>
                <p className="mt-4 text-xs text-purple-300">Perfect for growing gyms wanting complete automation.</p>
                <ul className="mt-8 space-y-3 text-sm text-zinc-200">
                  <li className="flex items-center gap-2"><Check className="h-4 w-4 text-purple-400 shrink-0" /> Unlimited members</li>
                  <li className="flex items-center gap-2"><Check className="h-4 w-4 text-purple-400 shrink-0" /> 10 Staff accounts</li>
                  <li className="flex items-center gap-2"><Check className="h-4 w-4 text-purple-400 shrink-0" /> WhatsApp Broadcasts</li>
                  <li className="flex items-center gap-2"><Check className="h-4 w-4 text-purple-400 shrink-0" /> Full CRM & Followups</li>
                  <li className="flex items-center gap-2"><Check className="h-4 w-4 text-purple-400 shrink-0" /> Unlimited Diet/Workout PDFs</li>
                  <li className="flex items-center gap-2"><Check className="h-4 w-4 text-purple-400 shrink-0" /> Custom branding</li>
                </ul>
              </div>
              <Link href="/login" passHref legacyBehavior>
                <Button className="w-full mt-8 bg-purple-600 hover:bg-purple-700 text-white shadow-lg shadow-purple-600/20">
                  Start Pro Trial
                </Button>
              </Link>
            </SpotlightCard>

            {/* Enterprise Tier */}
            <SpotlightCard className="border border-zinc-800 bg-zinc-900/30 p-8 rounded-2xl flex flex-col justify-between relative overflow-hidden">
              <div>
                <h3 className="text-lg font-bold text-zinc-100">Enterprise</h3>
                <div className="mt-4 flex items-baseline">
                  <span className="text-4xl font-extrabold tracking-tight">₹2,499</span>
                  <span className="text-sm text-zinc-400 ml-1">/month</span>
                </div>
                <p className="mt-4 text-xs text-zinc-400">For large health clubs wanting hardware integration.</p>
                <ul className="mt-8 space-y-3 text-sm text-zinc-300">
                  <li className="flex items-center gap-2"><Check className="h-4 w-4 text-purple-400 shrink-0" /> Everything in Pro</li>
                  <li className="flex items-center gap-2"><Check className="h-4 w-4 text-purple-400 shrink-0" /> Unlimited staff</li>
                  <li className="flex items-center gap-2"><Check className="h-4 w-4 text-purple-400 shrink-0" /> CCTV Face Attendance</li>
                  <li className="flex items-center gap-2"><Check className="h-4 w-4 text-purple-400 shrink-0" /> Biometric integration</li>
                  <li className="flex items-center gap-2"><Check className="h-4 w-4 text-purple-400 shrink-0" /> Priority Support</li>
                </ul>
              </div>
              <Link href="/login" passHref legacyBehavior>
                <Button variant="outline" className="w-full mt-8 border-zinc-700 text-zinc-300 hover:bg-zinc-800">
                  Contact Sales
                </Button>
              </Link>
            </SpotlightCard>
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section id="faq" className="py-24 border-t border-zinc-900 bg-zinc-900/10">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-4xl">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold tracking-tight">Frequently Asked Questions</h2>
          </div>

          <Accordion type="single" collapsible className="space-y-4">
            <AccordionItem value="item-1" className="border-zinc-800 bg-zinc-900/20 px-6 rounded-xl">
              <AccordionTrigger className="text-left font-semibold text-zinc-100 hover:text-purple-400">
                What do I need to integrate WhatsApp?
              </AccordionTrigger>
              <AccordionContent className="text-zinc-400 leading-relaxed">
                GymERP uses Meta's official WhatsApp Business Cloud API. You will need a Meta Developer Account, a verified Facebook Business Manager, and a dedicated clean phone number that is not currently registered on a mobile WhatsApp application. Our setup guide walks you through the step-by-step registration.
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="item-2" className="border-zinc-800 bg-zinc-900/20 px-6 rounded-xl">
              <AccordionTrigger className="text-left font-semibold text-zinc-100 hover:text-purple-400">
                Do I need to buy expensive cameras for face recognition?
              </AccordionTrigger>
              <AccordionContent className="text-zinc-400 leading-relaxed">
                No! GymERP works with standard IP cameras that support the RTSP protocol, which includes almost all modern cameras from brands like Hikvision, Dahua, and CP Plus. You do not need smart AI cameras — our local Python sidecar service handles the artificial intelligence and face detection matching directly from standard video feeds.
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="item-3" className="border-zinc-800 bg-zinc-900/20 px-6 rounded-xl">
              <AccordionTrigger className="text-left font-semibold text-zinc-100 hover:text-purple-400">
                How does multi-tenancy protect my gym's data?
              </AccordionTrigger>
              <AccordionContent className="text-zinc-400 leading-relaxed">
                Our database uses PostgreSQL Row-Level Security (RLS) policies. Every table contains a gym identifier (`gym_id`). Supabase automatically filters all database queries to ensure that users can only fetch or modify records belonging to their own gym. Your member details, financial statistics, and layouts are completely isolated and invisible to other tenants.
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="item-4" className="border-zinc-800 bg-zinc-900/20 px-6 rounded-xl">
              <AccordionTrigger className="text-left font-semibold text-zinc-100 hover:text-purple-400">
                Can members log into the app?
              </AccordionTrigger>
              <AccordionContent className="text-zinc-400 leading-relaxed">
                Yes! GymERP has a dedicated mobile-friendly Member Portal. Members can log in securely using their phone number and a One-Time Password (OTP) sent via SMS. They can view their remaining plan days, check-in history, download receipts, and view assigned diet or workout plans.
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        </div>
      </section>

      {/* Footer */}
      <footer className="mt-auto border-t border-zinc-900 py-8 bg-zinc-950">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <Dumbbell className="h-5 w-5 text-purple-600 rotate-45" />
            <span className="text-sm font-bold tracking-tight text-zinc-100">GymERP</span>
          </div>
          <div className="flex items-center gap-4">
            <Link href="/privacy" className="text-zinc-500 hover:text-zinc-300 text-sm">Privacy Policy</Link>
            <Link href="/terms" className="text-zinc-500 hover:text-zinc-300 text-sm">Terms of Service</Link>
          </div>
          <p className="text-xs text-zinc-500">
            &copy; {new Date().getFullYear()} GymERP. All rights reserved. Built with love in India. 🇮🇳
          </p>
        </div>
      </footer>
    </AuroraBackground>
  );
}
