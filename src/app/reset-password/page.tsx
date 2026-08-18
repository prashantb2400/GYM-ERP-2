'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dumbbell, Loader2, Lock, CheckCircle2, AlertTriangle } from 'lucide-react';
import Link from 'next/link';
import { GridPattern } from '@/components/magicui/grid-pattern';
import { Meteors } from '@/components/magicui/meteors';
import { BorderBeam } from '@/components/magicui/border-beam';

function ResetPasswordForm() {
  const supabase = createClient();
  const router = useRouter();
  const searchParams = useSearchParams();

  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [sessionReady, setSessionReady] = useState(false);

  // Supabase sends the recovery token as a URL hash fragment.
  // The PKCE flow exchanges the code automatically when the page loads.
  useEffect(() => {
    // Listen for the PASSWORD_RECOVERY event — Supabase fires this
    // after successfully exchanging the token from the email link.
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event) => {
        if (event === 'PASSWORD_RECOVERY') {
          setSessionReady(true);
        }
      }
    );

    // Also check if there is already a session (user may have refreshed the page)
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) setSessionReady(true);
    });

    return () => subscription.unsubscribe();
  }, [supabase.auth]);

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!password || !confirm) {
      setError('Please fill in both fields.');
      return;
    }
    if (password.length < 6) {
      setError('Password must be at least 6 characters long.');
      return;
    }
    if (password !== confirm) {
      setError('Passwords do not match.');
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const { error: updateError } = await supabase.auth.updateUser({
        password,
      });

      if (updateError) throw updateError;

      setSuccess(true);

      // Redirect to login after 3 seconds
      setTimeout(() => router.push('/login'), 3000);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'An unknown error occurred';
      setError(msg || 'Failed to update password. The link may have expired.');
    } finally {
      setLoading(false);
    }
  };

  // Check for error in URL (e.g. expired link)
  const urlError = searchParams.get('error_description') || searchParams.get('error');

  return (
    <div className="relative">
      <BorderBeam />
      <Card className="border-zinc-800 bg-zinc-900/60 backdrop-blur-xl relative z-10">
        {success ? (
          <>
            <CardHeader className="text-center space-y-3 pt-8">
              <div className="mx-auto bg-green-500/10 p-4 rounded-full w-fit border border-green-500/20">
                <CheckCircle2 className="h-10 w-10 text-green-400" />
              </div>
              <CardTitle className="text-2xl font-bold">Password Updated!</CardTitle>
              <CardDescription className="text-zinc-400">
                Your password has been changed successfully. Redirecting you to login…
              </CardDescription>
            </CardHeader>
            <CardContent className="text-center pb-8">
              <Link
                href="/login"
                className="text-sm text-purple-400 hover:underline"
              >
                Go to Login now
              </Link>
            </CardContent>
          </>
        ) : urlError ? (
          <>
            <CardHeader className="text-center space-y-3 pt-8">
              <div className="mx-auto bg-red-500/10 p-4 rounded-full w-fit border border-red-500/20">
                <AlertTriangle className="h-10 w-10 text-red-400" />
              </div>
              <CardTitle className="text-2xl font-bold">Link Expired</CardTitle>
              <CardDescription className="text-zinc-400">
                This password reset link has expired or is invalid. Please request a new one.
              </CardDescription>
            </CardHeader>
            <CardContent className="text-center pb-8">
              <Link
                href="/forgot-password"
                className="inline-flex items-center gap-2 text-sm bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-md font-medium"
              >
                Request New Link
              </Link>
            </CardContent>
          </>
        ) : (
          <>
            <CardHeader className="space-y-1">
              <CardTitle className="text-2xl font-bold tracking-tight">
                Set New Password
              </CardTitle>
              <CardDescription className="text-zinc-400">
                Choose a strong password for your GymERP account.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {error && (
                <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-3 text-sm text-red-400 mb-4">
                  {error}
                </div>
              )}
              {!sessionReady && (
                <div className="bg-amber-500/10 border border-amber-500/20 rounded-lg p-3 text-sm text-amber-400 mb-4 flex items-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin shrink-0" />
                  Verifying reset link…
                </div>
              )}
              <form onSubmit={handleReset} className="grid gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="newPassword" className="text-zinc-300 text-sm">
                    New Password <span className="text-zinc-500 font-normal">(min 6 characters)</span>
                  </Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-500" />
                    <Input
                      id="newPassword"
                      type="password"
                      autoComplete="new-password"
                      placeholder="••••••••"
                      disabled={loading || !sessionReady}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="pl-10 border-zinc-800 bg-zinc-950 text-zinc-100 focus:border-purple-600 focus:ring-purple-600"
                    />
                  </div>
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="confirmPassword" className="text-zinc-300 text-sm">
                    Confirm New Password
                  </Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-500" />
                    <Input
                      id="confirmPassword"
                      type="password"
                      autoComplete="new-password"
                      placeholder="••••••••"
                      disabled={loading || !sessionReady}
                      value={confirm}
                      onChange={(e) => setConfirm(e.target.value)}
                      className="pl-10 border-zinc-800 bg-zinc-950 text-zinc-100 focus:border-purple-600 focus:ring-purple-600"
                    />
                  </div>
                </div>
                <Button
                  type="submit"
                  disabled={loading || !sessionReady}
                  className="w-full h-11 bg-purple-600 hover:bg-purple-700 text-white font-medium shadow-lg shadow-purple-600/20 mt-1"
                >
                  {loading && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                  Update Password
                </Button>
              </form>
            </CardContent>
          </>
        )}
      </Card>
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <div className="relative flex min-h-screen bg-zinc-950 text-zinc-50 selection:bg-purple-600 selection:text-white overflow-hidden items-center justify-center">
      <GridPattern className="absolute inset-0 z-0 opacity-50" />
      <Meteors number={8} />

      <div className="relative z-10 w-full max-w-md px-6">
        {/* Logo */}
        <div className="flex items-center gap-2 mb-8 justify-center">
          <div className="bg-purple-600 p-1.5 rounded-lg flex items-center justify-center">
            <Dumbbell className="h-5 w-5 text-white rotate-45" />
          </div>
          <span className="text-lg font-bold tracking-tight bg-gradient-to-r from-white to-purple-400 bg-clip-text text-transparent">
            GymERP
          </span>
        </div>

        <Suspense
          fallback={
            <div className="flex justify-center items-center h-64">
              <Loader2 className="h-8 w-8 animate-spin text-purple-600" />
            </div>
          }
        >
          <ResetPasswordForm />
        </Suspense>
      </div>
    </div>
  );
}
