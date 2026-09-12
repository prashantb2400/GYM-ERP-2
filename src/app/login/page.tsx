'use client';

import React, { useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Dumbbell, Loader2, Mail, Lock, User, CheckCircle2 } from 'lucide-react';
import Link from 'next/link';
import { GridPattern } from '@/components/magicui/grid-pattern';
import { Meteors } from '@/components/magicui/meteors';
import { BorderBeam } from '@/components/magicui/border-beam';
import { useAuthStore } from '@/store/authStore';

// ── Google SVG Icon ──────────────────────────────────────────────────────────
function GoogleIcon() {
  return (
    <svg className="h-4 w-4 mr-2 shrink-0" aria-hidden="true" viewBox="0 0 488 512" xmlns="http://www.w3.org/2000/svg">
      <path fill="currentColor" d="M488 261.8C488 403.3 391.1 504 248 504 110.8 504 0 393.2 0 256S110.8 8 248 8c66.8 0 123 24.5 166.3 64.9l-67.5 64.9C258.5 52.6 94.3 116.6 94.3 256c0 86.5 69.1 156.6 153.7 156.6 98.2 0 135-70.4 140.8-106.9H248v-85.3h236.1c2.3 12.7 3.9 24.9 3.9 41.4z" />
    </svg>
  );
}

// ── Divider ──────────────────────────────────────────────────────────────────
function OrDivider() {
  return (
    <div className="relative my-4">
      <div className="absolute inset-0 flex items-center">
        <span className="w-full border-t border-zinc-800" />
      </div>
      <div className="relative flex justify-center text-xs">
        <span className="bg-zinc-900 px-2 text-zinc-500">or continue with</span>
      </div>
    </div>
  );
}

// ── Main login form (needs useSearchParams so wrapped in Suspense) ────────────
function OwnerLoginForm() {
  const supabase = createClient();
  const router = useRouter();
  const searchParams = useSearchParams();

  // Read error forwarded from /api/auth/callback
  const callbackError = searchParams.get('error');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(
    callbackError === 'auth-code-exchange-failed'
      ? 'Authentication failed. Please try again.'
      : callbackError
  );
  const [signUpSuccess, setSignUpSuccess] = useState(false);

  // Sign-in state
  const [signInEmail, setSignInEmail] = useState('');
  const [signInPassword, setSignInPassword] = useState('');

  // Sign-up state
  const [signUpName, setSignUpName] = useState('');
  const [signUpEmail, setSignUpEmail] = useState('');
  const [signUpPassword, setSignUpPassword] = useState('');
  const [signUpConfirm, setSignUpConfirm] = useState('');

  // ── Sign In ──────────────────────────────────────────────────────────────
  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!signInEmail.trim() || !signInPassword.trim()) {
      setError('Please enter your email and password.');
      return;
    }
    try {
      setLoading(true);
      setError(null);

      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: signInEmail.trim(),
        password: signInPassword,
      });

      if (signInError) throw signInError;

      // Check if user has an existing gym profile via /api/auth/me (auto-healing enabled)
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        try {
          const { data: sessionData } = await supabase.auth.getSession();
          const headers: Record<string, string> = {};
          if (sessionData?.session?.access_token) {
            headers['Authorization'] = `Bearer ${sessionData.session.access_token}`;
          }
          const meRes = await fetch('/api/auth/me', { headers });
          if (meRes.ok) {
            const meData = await meRes.json();
            if (meData.user?.gymId) {
              if (typeof window !== 'undefined') {
                localStorage.setItem('gymerp_cached_gym_id', meData.user.gymId);
              }
              useAuthStore.getState().setSession({ user: meData.user, member: null, needsOnboarding: false });
              router.push('/dashboard');
              return;
            }
          }
        } catch (meErr) {
          console.warn('Login session verification fallback:', meErr);
        }

        const { data: userData } = await supabase
          .from('users')
          .select('gym_id')
          .eq('auth_id', user.id)
          .maybeSingle();

        if (userData?.gym_id) {
          router.push('/dashboard');
        } else {
          router.push('/dashboard/onboarding');
        }
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'An unknown error occurred';
      setError(
        msg.includes('Invalid login credentials')
          ? 'Incorrect email or password. Please try again.'
          : msg || 'Sign in failed. Please try again.'
      );
    } finally {
      setLoading(false);
    }
  };

  // ── Sign Up ──────────────────────────────────────────────────────────────
  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!signUpName.trim() || !signUpEmail.trim() || !signUpPassword || !signUpConfirm) {
      setError('Please fill in all fields.');
      return;
    }
    if (signUpPassword.length < 6) {
      setError('Password must be at least 6 characters long.');
      return;
    }
    if (signUpPassword !== signUpConfirm) {
      setError('Passwords do not match.');
      return;
    }
    try {
      setLoading(true);
      setError(null);

      const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
        email: signUpEmail.trim(),
        password: signUpPassword,
        options: {
          data: { full_name: signUpName.trim() },
          emailRedirectTo: `${window.location.origin}/api/auth/callback`,
        },
      });

      if (signUpError) throw signUpError;

      // If email confirmation is disabled in Supabase, user is immediately authenticated
      if (signUpData?.session) {
        router.push('/dashboard/onboarding');
        return;
      }

      setSignUpSuccess(true);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'An unknown error occurred';
      if (msg.toLowerCase().includes('rate limit')) {
        setError('Supabase email rate limit exceeded (built-in service is limited to 3-4 emails/hr). Please disable "Confirm email" in your Supabase Auth settings or configure custom SMTP.');
      } else if (msg.includes('already registered')) {
        setError('An account with this email already exists. Please sign in.');
      } else {
        setError(msg || 'Sign up failed. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  // ── Google OAuth ─────────────────────────────────────────────────────────
  const handleGoogleLogin = async () => {
    try {
      setLoading(true);
      setError(null);
      const { error: loginError } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/api/auth/callback`,
        },
      });
      if (loginError) throw loginError;
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'An unknown error occurred';
      setError(msg || 'Failed to sign in with Google');
      setLoading(false);
    }
  };

  // ── Email verification sent screen ───────────────────────────────────────
  if (signUpSuccess) {
    return (
      <Card className="border-zinc-800 bg-zinc-900/60 backdrop-blur-xl">
        <CardHeader className="text-center space-y-3 pt-8">
          <div className="mx-auto bg-green-500/10 p-4 rounded-full w-fit border border-green-500/20">
            <CheckCircle2 className="h-10 w-10 text-green-400" />
          </div>
          <CardTitle className="text-2xl font-bold">Check Your Email</CardTitle>
          <CardDescription className="text-zinc-400">
            We sent a verification link to{' '}
            <span className="text-zinc-200 font-medium">{signUpEmail}</span>.
            Click the link in the email to activate your account.
          </CardDescription>
        </CardHeader>
        <CardContent className="text-center pb-6">
          <p className="text-xs text-zinc-500 mt-2">
            Didn&apos;t receive the email? Check your spam folder or{' '}
            <button
              className="text-purple-400 hover:underline"
              onClick={() => setSignUpSuccess(false)}
            >
              try again
            </button>
            .
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="relative">
      <BorderBeam />
      <Card className="border-zinc-800 bg-zinc-900/60 backdrop-blur-xl relative z-10">
        <CardHeader className="space-y-1 pb-4">
          <CardTitle className="text-2xl font-bold tracking-tight text-center lg:text-left">
            Owner Login
          </CardTitle>
          <CardDescription className="text-zinc-400 text-center lg:text-left">
            Sign in or create your GymERP workspace.
          </CardDescription>
        </CardHeader>

        <CardContent>
          {/* Global error */}
          {error && (
            <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-3 text-sm text-red-400 mb-4">
              {error}
            </div>
          )}

          <Tabs defaultValue="signin" onValueChange={() => setError(null)}>
            <TabsList className="w-full mb-5 bg-zinc-800/60 border border-zinc-700/50">
              <TabsTrigger value="signin" className="flex-1 data-[state=active]:bg-zinc-700 data-[state=active]:text-white text-zinc-400">
                Sign In
              </TabsTrigger>
              <TabsTrigger value="signup" className="flex-1 data-[state=active]:bg-zinc-700 data-[state=active]:text-white text-zinc-400">
                Sign Up
              </TabsTrigger>
            </TabsList>

            {/* ── Sign In Tab ── */}
            <TabsContent value="signin">
              <form onSubmit={handleSignIn} className="grid gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="signInEmail" className="text-zinc-300 text-sm">Email</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-500" />
                    <Input
                      id="signInEmail"
                      type="email"
                      autoComplete="email"
                      placeholder="owner@yourgym.com"
                      disabled={loading}
                      value={signInEmail}
                      onChange={(e) => setSignInEmail(e.target.value)}
                      className="pl-10 border-zinc-800 bg-zinc-950 text-zinc-100 placeholder:text-zinc-600 focus:border-purple-600 focus:ring-purple-600"
                    />
                  </div>
                </div>
                <div className="grid gap-2">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="signInPassword" className="text-zinc-300 text-sm">Password</Label>
                    <Link
                      href="/forgot-password"
                      className="text-xs text-purple-400 hover:underline"
                    >
                      Forgot password?
                    </Link>
                  </div>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-500" />
                    <Input
                      id="signInPassword"
                      type="password"
                      autoComplete="current-password"
                      placeholder="••••••••"
                      disabled={loading}
                      value={signInPassword}
                      onChange={(e) => setSignInPassword(e.target.value)}
                      className="pl-10 border-zinc-800 bg-zinc-950 text-zinc-100 focus:border-purple-600 focus:ring-purple-600"
                    />
                  </div>
                </div>
                <Button
                  type="submit"
                  disabled={loading}
                  className="w-full h-11 bg-purple-600 hover:bg-purple-700 text-white font-medium shadow-lg shadow-purple-600/20 mt-1"
                >
                  {loading && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                  Sign In
                </Button>
              </form>

              <OrDivider />

              <Button
                type="button"
                variant="outline"
                disabled={loading}
                onClick={handleGoogleLogin}
                className="w-full h-11 border-zinc-700 bg-zinc-800/50 hover:bg-zinc-800 text-zinc-200 hover:text-white flex items-center justify-center"
              >
                {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <GoogleIcon />}
                Continue with Google
              </Button>
            </TabsContent>

            {/* ── Sign Up Tab ── */}
            <TabsContent value="signup">
              <form onSubmit={handleSignUp} className="grid gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="signUpName" className="text-zinc-300 text-sm">Full Name</Label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-500" />
                    <Input
                      id="signUpName"
                      type="text"
                      autoComplete="name"
                      placeholder="Amit Sharma"
                      disabled={loading}
                      value={signUpName}
                      onChange={(e) => setSignUpName(e.target.value)}
                      className="pl-10 border-zinc-800 bg-zinc-950 text-zinc-100 placeholder:text-zinc-600 focus:border-purple-600 focus:ring-purple-600"
                    />
                  </div>
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="signUpEmail" className="text-zinc-300 text-sm">Email</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-500" />
                    <Input
                      id="signUpEmail"
                      type="email"
                      autoComplete="email"
                      placeholder="owner@yourgym.com"
                      disabled={loading}
                      value={signUpEmail}
                      onChange={(e) => setSignUpEmail(e.target.value)}
                      className="pl-10 border-zinc-800 bg-zinc-950 text-zinc-100 placeholder:text-zinc-600 focus:border-purple-600 focus:ring-purple-600"
                    />
                  </div>
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="signUpPassword" className="text-zinc-300 text-sm">Password <span className="text-zinc-500 font-normal">(min 6 characters)</span></Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-500" />
                    <Input
                      id="signUpPassword"
                      type="password"
                      autoComplete="new-password"
                      placeholder="••••••••"
                      disabled={loading}
                      value={signUpPassword}
                      onChange={(e) => setSignUpPassword(e.target.value)}
                      className="pl-10 border-zinc-800 bg-zinc-950 text-zinc-100 focus:border-purple-600 focus:ring-purple-600"
                    />
                  </div>
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="signUpConfirm" className="text-zinc-300 text-sm">Confirm Password</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-500" />
                    <Input
                      id="signUpConfirm"
                      type="password"
                      autoComplete="new-password"
                      placeholder="••••••••"
                      disabled={loading}
                      value={signUpConfirm}
                      onChange={(e) => setSignUpConfirm(e.target.value)}
                      className="pl-10 border-zinc-800 bg-zinc-950 text-zinc-100 focus:border-purple-600 focus:ring-purple-600"
                    />
                  </div>
                </div>
                <Button
                  type="submit"
                  disabled={loading}
                  className="w-full h-11 bg-purple-600 hover:bg-purple-700 text-white font-medium shadow-lg shadow-purple-600/20 mt-1"
                >
                  {loading && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                  Create Account
                </Button>
              </form>

              <OrDivider />

              <Button
                type="button"
                variant="outline"
                disabled={loading}
                onClick={handleGoogleLogin}
                className="w-full h-11 border-zinc-700 bg-zinc-800/50 hover:bg-zinc-800 text-zinc-200 hover:text-white flex items-center justify-center"
              >
                {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <GoogleIcon />}
                Sign Up with Google
              </Button>
            </TabsContent>
          </Tabs>
        </CardContent>

        <CardFooter className="flex flex-col gap-2 text-center border-t border-zinc-800/40 pt-5 pb-6">
          <div className="text-xs text-zinc-500">
            Are you a staff member?{' '}
            <Link href="/staff/login" className="text-purple-400 hover:underline">
              Login here
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
    </div>
  );
}

// ── Page wrapper (Suspense required for useSearchParams) ─────────────────────
export default function OwnerLoginPage() {
  return (
    <div className="relative flex min-h-screen bg-zinc-950 text-zinc-50 selection:bg-purple-600 selection:text-white overflow-hidden">
      <GridPattern className="absolute inset-0 z-0 opacity-50" />
      <Meteors number={12} />

      {/* Left panel — decorative, desktop only */}
      <div className="hidden lg:flex lg:w-1/2 bg-zinc-900 border-r border-zinc-800 relative justify-center items-center overflow-hidden z-10">
        <div className="absolute top-1/4 left-1/4 w-[300px] h-[300px] bg-purple-700/10 rounded-full blur-[100px] pointer-events-none" />
        <div className="absolute bottom-1/4 right-1/4 w-[300px] h-[300px] bg-blue-600/5 rounded-full blur-[100px] pointer-events-none" />
        <div className="relative z-10 text-center max-w-lg px-8">
          <div className="bg-purple-600 p-4 rounded-2xl w-fit mx-auto mb-8 shadow-xl shadow-purple-600/20">
            <Dumbbell className="h-12 w-12 text-white rotate-45" />
          </div>
          <h2 className="text-4xl font-extrabold tracking-tight bg-gradient-to-r from-white via-zinc-200 to-zinc-400 bg-clip-text text-transparent mb-4">
            Build a Stronger Gym Business
          </h2>
          <p className="text-zinc-400 text-lg leading-relaxed">
            Automate your admin tasks — check-ins, invoices, dues, WhatsApp reminders — and focus on your members&apos; growth.
          </p>
        </div>
      </div>

      {/* Right panel — auth form */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-6 relative z-10">
        <div className="w-full max-w-md relative z-10">
          {/* Logo */}
          <div className="flex items-center gap-2 mb-8 justify-center lg:justify-start">
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
            <OwnerLoginForm />
          </Suspense>
        </div>
      </div>
    </div>
  );
}
