'use client';

import React, { useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Dumbbell,
  Loader2,
  Lock,
  User,
  Eye,
  EyeOff,
  AlertCircle,
  HelpCircle,
  ShieldAlert,
  Sparkles,
} from 'lucide-react';
import Link from 'next/link';
import { GridPattern } from '@/components/magicui/grid-pattern';
import { Meteors } from '@/components/magicui/meteors';
import { BorderBeam } from '@/components/magicui/border-beam';
import { ShinyButton } from '@/components/magicui/shiny-button';
import { useAuthStore } from '@/store/authStore';

function StaffLoginForm() {
  const supabase = createClient();
  const router = useRouter();
  const searchParams = useSearchParams();

  const rawNext = searchParams.get('next');
  const safeNext = (rawNext && rawNext.startsWith('/') && !rawNext.startsWith('//') && !rawNext.startsWith('/\\'))
    ? rawNext
    : null;

  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [capsLockActive, setCapsLockActive] = useState(false);
  const [showHelpDialog, setShowHelpDialog] = useState(false);

  const handleKeyEvent = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (typeof e.getModifierState === 'function') {
      setCapsLockActive(e.getModifierState('CapsLock'));
    }
  };

  const handleStaffLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanIdentifier = identifier.trim();
    if (!cleanIdentifier || !password.trim()) {
      setError('Please fill in both Login ID/Email and password');
      return;
    }

    try {
      setLoading(true);
      setError(null);

      let targetEmail = cleanIdentifier;

      // If user typed a login_id instead of an email, resolve it via secure RPC
      if (!cleanIdentifier.includes('@')) {
        const { data: email, error: rpcError } = await supabase.rpc('get_email_by_login_id', {
          p_login_id: cleanIdentifier,
        });

        if (rpcError || !email) {
          throw new Error('Invalid Login ID or inactive staff account');
        }
        targetEmail = email;
      }

      // Perform auth sign in using resolved email
      const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
        email: targetEmail,
        password: password,
      });

      if (signInError) throw signInError;

      // Fetch user profile via /api/auth/me to properly sync store and determine trainer vs staff destination
      let destination = safeNext || '/dashboard';

      try {
        const sessionToken = signInData.session?.access_token;
        const headers: Record<string, string> = {};
        if (sessionToken) {
          headers['Authorization'] = `Bearer ${sessionToken}`;
        }

        const meRes = await fetch('/api/auth/me', { headers });
        if (meRes.ok) {
          const meData = await meRes.json();
          if (meData.user) {
            useAuthStore.getState().setSession({
              user: meData.user,
              member: null,
              needsOnboarding: false,
            });

            if (meData.user.role === 'trainer') {
              destination = safeNext && safeNext.startsWith('/trainer')
                ? safeNext
                : '/trainer/dashboard';
            } else if (safeNext) {
              destination = safeNext;
            } else {
              destination = '/dashboard';
            }
          }
        }
      } catch (meErr) {
        console.warn('Session verification fallback in staff login:', meErr);
      }

      router.push(destination);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'An unknown error occurred';
      if (msg.includes('Invalid login credentials')) {
        setError('Incorrect Login ID, Email, or Password. Please verify and try again.');
      } else {
        setError(msg || 'Authentication failed. Please try again.');
      }
      setLoading(false);
    }
  };

  return (
    <div className="relative">
      <BorderBeam />
      <Card className="border-zinc-800 bg-zinc-900/60 backdrop-blur-xl relative z-10">
        <CardHeader className="space-y-1">
          <CardTitle className="text-2xl font-bold tracking-tight text-center lg:text-left">
            Staff Login
          </CardTitle>
          <CardDescription className="text-zinc-400 text-center lg:text-left">
            Enter your assigned Login ID or staff email address.
          </CardDescription>
        </CardHeader>
        <form onSubmit={handleStaffLogin}>
          <CardContent className="grid gap-4">
            {error && (
              <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-3 text-sm text-red-400 flex items-center gap-2">
                <AlertCircle className="h-4 w-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {capsLockActive && (
              <div className="bg-amber-500/10 border border-amber-500/20 rounded-lg p-2.5 text-xs text-amber-400 flex items-center gap-2">
                <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                <span>Caps Lock is ON</span>
              </div>
            )}

            <div className="grid gap-2">
              <Label htmlFor="identifier" className="text-zinc-300 text-sm">
                Login ID or Email
              </Label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-500" />
                <Input
                  id="identifier"
                  type="text"
                  placeholder="e.g. front_desk_1 or staff@gym.com"
                  disabled={loading}
                  value={identifier}
                  onChange={(e) => setIdentifier(e.target.value)}
                  className="pl-10 border-zinc-800 bg-zinc-950 text-zinc-100 placeholder:text-zinc-600 focus:border-purple-600 focus:ring-purple-600"
                />
              </div>
            </div>

            <div className="grid gap-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="password" className="text-zinc-300 text-sm">Password</Label>
                <button
                  type="button"
                  onClick={() => setShowHelpDialog(true)}
                  className="text-xs text-purple-400 hover:underline flex items-center gap-1"
                >
                  <HelpCircle className="h-3 w-3" />
                  Forgot password?
                </button>
              </div>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-500" />
                <Input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  disabled={loading}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  onKeyDown={handleKeyEvent}
                  onKeyUp={handleKeyEvent}
                  className="pl-10 pr-10 border-zinc-800 bg-zinc-950 text-zinc-100 focus:border-purple-600 focus:ring-purple-600"
                />
                <button
                  type="button"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300 transition-colors"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <ShinyButton
              type="submit"
              disabled={loading}
              className="w-full h-11 bg-purple-600 hover:bg-purple-700 text-white font-medium shadow-lg shadow-purple-600/20 transition-all mt-2 flex justify-center items-center"
            >
              {loading ? (
                <Loader2 className="h-4 w-4 animate-spin text-white mr-2 inline" />
              ) : null}
              Sign In
            </ShinyButton>

            {/* Evaluation Staff Accounts Quick Fill */}
            <div className="mt-2 p-3 rounded-xl bg-purple-500/10 border border-purple-500/20 text-xs flex items-center justify-between gap-2 shadow-xs">
              <div className="min-w-0">
                <div className="text-[11px] font-bold text-purple-300 uppercase tracking-wider flex items-center gap-1.5">
                  <Sparkles className="h-3.5 w-3.5 text-purple-400 shrink-0" />
                  <span className="truncate">Staff Evaluation</span>
                </div>
                <p className="text-[10px] text-zinc-400 mt-0.5 truncate">
                  Coach: coach_raj / coach123
                </p>
              </div>
              <div className="flex items-center gap-1.5 shrink-0">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setIdentifier('coach_raj');
                    setPassword('coach123');
                  }}
                  className="h-7 text-[11px] px-2 bg-purple-950/60 border-purple-800/60 text-purple-200 hover:text-white hover:bg-purple-900/60 active:scale-95 transition-all cursor-pointer"
                >
                  Fill Coach
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setIdentifier('front_desk_1');
                    setPassword('staff123');
                  }}
                  className="h-7 text-[11px] px-2 bg-zinc-900 border-zinc-800 text-zinc-300 hover:text-white hover:bg-zinc-800 active:scale-95 transition-all cursor-pointer"
                >
                  Desk
                </Button>
              </div>
            </div>
          </CardContent>
        </form>

        <CardFooter className="flex flex-col gap-3 text-center border-t border-zinc-800/40 pt-6">
          <div className="text-xs text-zinc-500">
            Are you the gym owner?{' '}
            <Link href="/login" className="text-purple-400 hover:underline">
              Owner Login
            </Link>
          </div>
          <div className="text-xs text-zinc-500">
            Gym member?{' '}
            <Link href="/member/login" className="text-purple-400 hover:underline">
              Access Portal
            </Link>
          </div>
        </CardFooter>
      </Card>

      {/* Staff Password Help Dialog */}
      <Dialog open={showHelpDialog} onOpenChange={setShowHelpDialog}>
        <DialogContent className="border-zinc-800 bg-zinc-900 text-zinc-100 max-w-md">
          <DialogHeader>
            <div className="flex items-center gap-2 mb-2 text-purple-400">
              <ShieldAlert className="h-5 w-5" />
              <DialogTitle className="text-lg font-bold text-white">Staff Password Assistance</DialogTitle>
            </div>
            <DialogDescription className="text-zinc-300 text-sm leading-relaxed space-y-3">
              <p>
                Staff and trainer accounts are issued and maintained directly by your gym owner or branch administrator.
              </p>
              <p>
                If you have forgotten your password or your account is locked, please reach out to your gym owner or head receptionist. They can reset your password immediately from the <strong className="text-zinc-100">Staff Management</strong> section in their dashboard.
              </p>
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-end pt-3">
            <Button
              onClick={() => setShowHelpDialog(false)}
              className="bg-purple-600 hover:bg-purple-700 text-white"
            >
              Understood
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default function StaffLoginPage() {
  return (
    <div className="relative flex min-h-screen bg-zinc-950 text-zinc-50 selection:bg-purple-600 selection:text-white overflow-hidden">
      <GridPattern className="absolute inset-0 z-0 opacity-50" />
      <Meteors number={12} />

      {/* Left panel - Decorative (hidden on mobile) */}
      <div className="hidden lg:flex lg:w-1/2 bg-zinc-900 border-r border-zinc-800 relative justify-center items-center overflow-hidden z-10">
        <div className="absolute top-1/4 left-1/4 w-[300px] h-[300px] bg-purple-700/10 rounded-full blur-[100px] pointer-events-none" />

        <div className="relative z-10 text-center max-w-lg px-8">
          <div className="bg-purple-600 p-4 rounded-2xl w-fit mx-auto mb-8 shadow-xl shadow-purple-600/20">
            <Dumbbell className="h-12 w-12 text-white rotate-45" />
          </div>
          <h2 className="text-4xl font-extrabold tracking-tight bg-gradient-to-r from-white via-zinc-200 to-zinc-400 bg-clip-text text-transparent mb-4">
            Team Workspace
          </h2>
          <p className="text-zinc-400 text-lg leading-relaxed">
            Receptionists and Trainers access page metrics, follow-ups, diets, and attendance tickers. Keep active schedules in check.
          </p>
        </div>
      </div>

      {/* Right panel - Auth Form */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-6 relative z-10">
        <div className="w-full max-w-md relative z-10">
          <div className="flex items-center gap-2 mb-8 justify-center lg:justify-start">
            <div className="bg-purple-600 p-1.5 rounded-lg flex items-center justify-center">
              <Dumbbell className="h-5 w-5 text-white rotate-45" />
            </div>
            <span className="text-lg font-bold tracking-tight bg-gradient-to-r from-white to-purple-400 bg-clip-text text-transparent">
              GymERP
            </span>
          </div>

          <Suspense fallback={
            <div className="flex justify-center items-center h-48">
              <Loader2 className="h-8 w-8 animate-spin text-purple-600" />
            </div>
          }>
            <StaffLoginForm />
          </Suspense>
        </div>
      </div>
    </div>
  );
}
