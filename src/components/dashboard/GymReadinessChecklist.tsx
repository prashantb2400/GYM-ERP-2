'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  CheckCircle2,
  Circle,
  Building2,
  CreditCard,
  QrCode,
  Users,
  UserPlus,
  Sparkles,
  Loader2,
  ArrowRight,
  ChevronRight,
} from 'lucide-react';
import { toast } from 'sonner';

interface GymReadinessChecklistProps {
  gym: any;
  planCount: number;
  staffCount: number;
  activeMemberCount: number;
  onPlansUpdated?: () => void;
}

export function GymReadinessChecklist({
  gym,
  planCount,
  staffCount,
  activeMemberCount,
  onPlansUpdated,
}: GymReadinessChecklistProps) {
  const [seedingPlans, setSeedingPlans] = useState(false);

  // Verification checks
  const isProfileReady = Boolean(gym?.name && (gym?.phone || gym?.email));
  const isUpiReady = Boolean(gym?.settings?.upi_id);
  const isPlansReady = planCount > 0;
  const isStaffReady = staffCount > 0;
  const isMemberReady = activeMemberCount > 0;

  const completedSteps = [
    isProfileReady,
    isUpiReady,
    isPlansReady,
    isStaffReady,
    isMemberReady,
  ].filter(Boolean).length;

  const totalSteps = 5;
  const progressPercent = Math.round((completedSteps / totalSteps) * 100);

  const handleSeedStarterPlans = async () => {
    try {
      setSeedingPlans(true);
      const res = await fetch('/api/plans/seed', { method: 'POST' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to initialize plans');

      toast.success(data.message || '5 standard gym plans initialized successfully!');
      if (onPlansUpdated) {
        onPlansUpdated();
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error creating starter plans';
      toast.error(msg);
    } finally {
      setSeedingPlans(false);
    }
  };

  return (
    <Card className="border-purple-800/40 bg-gradient-to-br from-zinc-950 via-purple-950/20 to-zinc-950 shadow-lg relative overflow-hidden">
      <div className="absolute top-0 right-0 w-80 h-80 bg-purple-600/10 blur-[100px] pointer-events-none" />
      
      <CardHeader className="pb-3 border-b border-zinc-800/80">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <div className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-purple-400" />
              <CardTitle className="text-base font-bold text-zinc-100">
                Gym Launchpad: Pre-Flight Operations Checklist
              </CardTitle>
              <Badge className="bg-purple-900/60 text-purple-300 border-purple-700/40 text-[10px]">
                {progressPercent}% Complete
              </Badge>
            </div>
            <CardDescription className="text-zinc-400 text-xs mt-1">
              Follow these 5 essential steps before admitting members to ensure smooth check-ins, compliant tax receipts, and automated attendance.
            </CardDescription>
          </div>
          <div className="text-right">
            <span className="text-xs font-mono text-zinc-400">
              <strong className="text-purple-400">{completedSteps}</strong> of {totalSteps} Steps Complete
            </span>
          </div>
        </div>

        {/* Progress bar */}
        <div className="w-full bg-zinc-900 h-1.5 rounded-full overflow-hidden mt-3 border border-zinc-800">
          <div
            className="bg-gradient-to-r from-purple-600 to-emerald-500 h-full transition-all duration-500"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
      </CardHeader>

      <CardContent className="pt-4 grid grid-cols-1 md:grid-cols-5 gap-3">
        {/* Step 1: Branch & Facility Profile */}
        <div className={`p-3 rounded-lg border text-xs flex flex-col justify-between ${
          isProfileReady ? 'border-zinc-800 bg-zinc-900/40' : 'border-amber-500/40 bg-amber-950/10'
        }`}>
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <Building2 className="h-4 w-4 text-purple-400" />
              {isProfileReady ? (
                <CheckCircle2 className="h-4 w-4 text-emerald-400" />
              ) : (
                <Circle className="h-4 w-4 text-amber-400" />
              )}
            </div>
            <div className="font-bold text-zinc-200">1. Branch Profile</div>
            <p className="text-[11px] text-zinc-500 mt-1">
              {isProfileReady ? 'Gym & branch contact details configured.' : 'Set address, phone & GSTIN for receipts.'}
            </p>
          </div>
          <div className="pt-3">
            <Link href="/dashboard/settings" className="block">
              <Button variant="outline" size="sm" className="w-full h-7 text-[10px] border-zinc-800 text-zinc-300 hover:text-white">
                {isProfileReady ? 'Edit Profile' : 'Configure'} <ChevronRight className="h-3 w-3 ml-1" />
              </Button>
            </Link>
          </div>
        </div>

        {/* Step 2: UPI & Real Payment QR */}
        <div className={`p-3 rounded-lg border text-xs flex flex-col justify-between ${
          isUpiReady ? 'border-zinc-800 bg-zinc-900/40' : 'border-amber-500/40 bg-amber-950/10'
        }`}>
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <QrCode className="h-4 w-4 text-purple-400" />
              {isUpiReady ? (
                <CheckCircle2 className="h-4 w-4 text-emerald-400" />
              ) : (
                <Circle className="h-4 w-4 text-amber-400" />
              )}
            </div>
            <div className="font-bold text-zinc-200">2. Real UPI QR</div>
            <p className="text-[11px] text-zinc-500 mt-1">
              {isUpiReady ? `Active VPA: ${gym.settings.upi_id}` : 'Set UPI VPA so invoices get real dynamic payment QR.'}
            </p>
          </div>
          <div className="pt-3">
            <Link href="/dashboard/settings" className="block">
              <Button variant="outline" size="sm" className="w-full h-7 text-[10px] border-zinc-800 text-zinc-300 hover:text-white">
                {isUpiReady ? 'View UPI' : 'Set UPI ID'} <ChevronRight className="h-3 w-3 ml-1" />
              </Button>
            </Link>
          </div>
        </div>

        {/* Step 3: Membership Plans Catalog */}
        <div className={`p-3 rounded-lg border text-xs flex flex-col justify-between ${
          isPlansReady ? 'border-zinc-800 bg-zinc-900/40' : 'border-purple-500/50 bg-purple-950/20 shadow-sm shadow-purple-900/20'
        }`}>
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <CreditCard className="h-4 w-4 text-purple-400" />
              {isPlansReady ? (
                <CheckCircle2 className="h-4 w-4 text-emerald-400" />
              ) : (
                <Circle className="h-4 w-4 text-purple-400 animate-pulse" />
              )}
            </div>
            <div className="font-bold text-zinc-200">3. Membership Plans</div>
            <p className="text-[11px] text-zinc-500 mt-1">
              {isPlansReady ? `${planCount} active plans configured.` : 'Define monthly, quarterly & annual packages.'}
            </p>
          </div>
          <div className="pt-3 space-y-1">
            {!isPlansReady ? (
              <Button
                size="sm"
                onClick={handleSeedStarterPlans}
                disabled={seedingPlans}
                className="w-full h-7 text-[10px] bg-purple-600 hover:bg-purple-700 text-white font-semibold"
              >
                {seedingPlans ? <Loader2 className="h-3 w-3 animate-spin" /> : '1-Click Starter Plans'}
              </Button>
            ) : (
              <Link href="/dashboard/plans" className="block">
                <Button variant="outline" size="sm" className="w-full h-7 text-[10px] border-zinc-800 text-zinc-300 hover:text-white">
                  Manage Plans <ChevronRight className="h-3 w-3 ml-1" />
                </Button>
              </Link>
            )}
          </div>
        </div>

        {/* Step 4: Staff & Floor Trainers */}
        <div className={`p-3 rounded-lg border text-xs flex flex-col justify-between ${
          isStaffReady ? 'border-zinc-800 bg-zinc-900/40' : 'border-zinc-800 bg-zinc-900/20'
        }`}>
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <Users className="h-4 w-4 text-purple-400" />
              {isStaffReady ? (
                <CheckCircle2 className="h-4 w-4 text-emerald-400" />
              ) : (
                <Circle className="h-4 w-4 text-zinc-600" />
              )}
            </div>
            <div className="font-bold text-zinc-200">4. Staff & Trainers</div>
            <p className="text-[11px] text-zinc-500 mt-1">
              {isStaffReady ? `${staffCount} active team members.` : 'Add front-desk receptionist or gym trainers.'}
            </p>
          </div>
          <div className="pt-3">
            <Link href="/dashboard/staff" className="block">
              <Button variant="outline" size="sm" className="w-full h-7 text-[10px] border-zinc-800 text-zinc-300 hover:text-white">
                {isStaffReady ? 'View Team' : 'Add Staff'} <ChevronRight className="h-3 w-3 ml-1" />
              </Button>
            </Link>
          </div>
        </div>

        {/* Step 5: Ready to Enroll First Member */}
        <div className={`p-3 rounded-lg border text-xs flex flex-col justify-between ${
          isMemberReady
            ? 'border-zinc-800 bg-zinc-900/40'
            : isPlansReady
              ? 'border-emerald-500/60 bg-emerald-950/20'
              : 'border-zinc-800 bg-zinc-900/20 opacity-70'
        }`}>
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <UserPlus className="h-4 w-4 text-emerald-400" />
              {isMemberReady ? (
                <CheckCircle2 className="h-4 w-4 text-emerald-400" />
              ) : (
                <Circle className="h-4 w-4 text-emerald-500/60" />
              )}
            </div>
            <div className="font-bold text-zinc-200">5. Enroll Member #1</div>
            <p className="text-[11px] text-zinc-500 mt-1">
              {isMemberReady
                ? `${activeMemberCount} members enrolled.`
                : isPlansReady
                  ? 'All prerequisites met! You are ready to enroll.'
                  : 'Requires at least 1 membership plan.'}
            </p>
          </div>
          <div className="pt-3">
            <Link href="/dashboard/members/add" className="block">
              <Button
                size="sm"
                className={`w-full h-7 text-[10px] font-bold ${
                  isPlansReady
                    ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
                    : 'bg-zinc-800 text-zinc-500 hover:bg-zinc-800'
                }`}
              >
                Enroll Member <ArrowRight className="h-3 w-3 ml-1" />
              </Button>
            </Link>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
