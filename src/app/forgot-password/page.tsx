'use client';

import React, { useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dumbbell, Loader2, Mail, ArrowLeft, CheckCircle2 } from 'lucide-react';
import Link from 'next/link';
import { GridPattern } from '@/components/magicui/grid-pattern';
import { Meteors } from '@/components/magicui/meteors';
import { BorderBeam } from '@/components/magicui/border-beam';

export default function ForgotPasswordPage() {
  const supabase = createClient();
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) {
      setError('Please enter your email address.');
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const { error: resetError } = await supabase.auth.resetPasswordForEmail(
        email.trim(),
        {
          redirectTo: `${window.location.origin}/reset-password`,
        }
      );

      if (resetError) throw resetError;

      // Always show success — don't reveal whether email exists
      setSubmitted(true);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'An unknown error occurred';
      setError(msg || 'Failed to send reset email. Please try again.');
    } finally {
      setLoading(false);
    }
  };

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

        <div className="relative">
          <BorderBeam />
          <Card className="border-zinc-800 bg-zinc-900/60 backdrop-blur-xl relative z-10">
            {submitted ? (
              <>
                <CardHeader className="text-center space-y-3 pt-8">
                  <div className="mx-auto bg-green-500/10 p-4 rounded-full w-fit border border-green-500/20">
                    <CheckCircle2 className="h-10 w-10 text-green-400" />
                  </div>
                  <CardTitle className="text-2xl font-bold">Check Your Email</CardTitle>
                  <CardDescription className="text-zinc-400">
                    If an account exists for{' '}
                    <span className="text-zinc-200 font-medium">{email}</span>, we have sent
                    a password reset link. It may take a minute to arrive.
                  </CardDescription>
                </CardHeader>
                <CardContent className="text-center pb-8">
                  <p className="text-xs text-zinc-500 mb-6">
                    Check your spam folder if you don&apos;t see it.
                  </p>
                  <Link
                    href="/login"
                    className="inline-flex items-center gap-2 text-sm text-purple-400 hover:underline"
                  >
                    <ArrowLeft className="h-3.5 w-3.5" />
                    Back to Login
                  </Link>
                </CardContent>
              </>
            ) : (
              <>
                <CardHeader className="space-y-1">
                  <CardTitle className="text-2xl font-bold tracking-tight">
                    Forgot Password?
                  </CardTitle>
                  <CardDescription className="text-zinc-400">
                    Enter your email address and we will send you a link to reset your password.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {error && (
                    <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-3 text-sm text-red-400 mb-4">
                      {error}
                    </div>
                  )}
                  <form onSubmit={handleSubmit} className="grid gap-4">
                    <div className="grid gap-2">
                      <Label htmlFor="email" className="text-zinc-300 text-sm">
                        Email Address
                      </Label>
                      <div className="relative">
                        <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-500" />
                        <Input
                          id="email"
                          type="email"
                          autoComplete="email"
                          placeholder="owner@yourgym.com"
                          disabled={loading}
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          className="pl-10 border-zinc-800 bg-zinc-950 text-zinc-100 placeholder:text-zinc-600 focus:border-purple-600 focus:ring-purple-600"
                        />
                      </div>
                    </div>
                    <Button
                      type="submit"
                      disabled={loading}
                      className="w-full h-11 bg-purple-600 hover:bg-purple-700 text-white font-medium shadow-lg shadow-purple-600/20 mt-1"
                    >
                      {loading && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                      Send Reset Link
                    </Button>
                    <Link
                      href="/login"
                      className="inline-flex items-center justify-center gap-2 text-sm text-zinc-400 hover:text-white mt-1"
                    >
                      <ArrowLeft className="h-3.5 w-3.5" />
                      Back to Login
                    </Link>
                  </form>
                </CardContent>
              </>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}
