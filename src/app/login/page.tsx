'use client';

import React, { useState, useMemo, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Dumbbell,
  Loader2,
  Mail,
  Lock,
  User,
  CheckCircle2,
  Eye,
  EyeOff,
  AlertCircle,
  Check,
  ShieldCheck,
  Sparkles,
} from 'lucide-react';
import Link from 'next/link';
import { GridPattern } from '@/components/magicui/grid-pattern';
import { Meteors } from '@/components/magicui/meteors';
import { BorderBeam } from '@/components/magicui/border-beam';
import { useAuthStore } from '@/store/authStore';

// Google SVG Icon
function GoogleIcon() {
  return (
    <svg className="h-4 w-4 mr-2 shrink-0" aria-hidden="true" viewBox="0 0 488 512" xmlns="http://www.w3.org/2000/svg">
      <path fill="currentColor" d="M488 261.8C488 403.3 391.1 504 248 504 110.8 504 0 393.2 0 256S110.8 8 248 8c66.8 0 123 24.5 166.3 64.9l-67.5 64.9C258.5 52.6 94.3 116.6 94.3 256c0 86.5 69.1 156.6 153.7 156.6 98.2 0 135-70.4 140.8-106.9H248v-85.3h236.1c2.3 12.7 3.9 24.9 3.9 41.4z" />
    </svg>
  );
}

// Divider
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

// Main login form (wrapped in Suspense for useSearchParams)
function OwnerLoginForm() {
  const supabase = createClient();
  const router = useRouter();
  const searchParams = useSearchParams();

  // Read error forwarded from /api/auth/callback
  const callbackError = searchParams.get('error');

  // Destination preservation
  const rawNext = searchParams.get('next');
  const safeNext = (rawNext && rawNext.startsWith('/') && !rawNext.startsWith('//') && !rawNext.startsWith('/\\'))
    ? rawNext
    : '/dashboard';

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
  const [showSignInPassword, setShowSignInPassword] = useState(false);

  // Sign-up state
  const [signUpName, setSignUpName] = useState('');
  const [signUpEmail, setSignUpEmail] = useState('');
  const [signUpPassword, setSignUpPassword] = useState('');
  const [signUpConfirm, setSignUpConfirm] = useState('');
  const [showSignUpPassword, setShowSignUpPassword] = useState(false);
  const [showSignUpConfirm, setShowSignUpConfirm] = useState(false);
  const [agreedToTerms, setAgreedToTerms] = useState(true);

  // Caps Lock detection
  const [capsLockActive, setCapsLockActive] = useState(false);

  const handleKeyEvent = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (typeof e.getModifierState === 'function') {
      setCapsLockActive(e.getModifierState('CapsLock'));
    }
  };

  // Password strength evaluation
  const passwordStrength = useMemo(() => {
    const pwd = signUpPassword;
    if (!pwd) return { score: 0, label: '', color: '' };
    let score = 0;
    if (pwd.length >= 6) score += 1;
    if (pwd.length >= 8) score += 1;
    if (/[A-Z]/.test(pwd) && /[a-z]/.test(pwd)) score += 1;
    if (/[0-9]/.test(pwd)) score += 1;
    if (/[^A-Za-z0-9]/.test(pwd)) score += 1;

    if (score <= 1) return { score: 1, label: 'Weak', color: 'bg-red-500' };
    if (score <= 3) return { score: 2, label: 'Fair', color: 'bg-amber-500' };
    if (score === 4) return { score: 3, label: 'Good', color: 'bg-blue-500' };
    return { score: 4, label: 'Strong', color: 'bg-green-500' };
  }, [signUpPassword]);

  // Sign In handler
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
              router.push(safeNext);
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
          router.push(safeNext);
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

  // Sign Up handler
  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!signUpName.trim() || !signUpEmail.trim() || !signUpPassword || !signUpConfirm) {
      setError('Please fill in all fields.');
      return;
    }
    if (!agreedToTerms) {
      setError('Please agree to the Terms of Service and Privacy Policy to register.');
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

  // Google OAuth
  const handleGoogleLogin = async () => {
    try {
      setLoading(true);
      setError(null);
      const { error: loginError } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/api/auth/callback?next=${encodeURIComponent(safeNext)}`,
        },
      });
      if (loginError) throw loginError;
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'An unknown error occurred';
      setError(msg || 'Failed to sign in with Google');
      setLoading(false);
    }
  };

  // Email verification sent screen
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
            <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-3 text-sm text-red-400 mb-4 flex items-center gap-2">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Caps lock warning banner */}
          {capsLockActive && (
            <div className="bg-amber-500/10 border border-amber-500/20 rounded-lg p-2.5 text-xs text-amber-400 mb-4 flex items-center gap-2">
              <AlertCircle className="h-3.5 w-3.5 shrink-0" />
              <span>Caps Lock is ON</span>
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

            {/* Sign In Tab */}
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
                      type={showSignInPassword ? 'text' : 'password'}
                      autoComplete="current-password"
                      placeholder="••••••••"
                      disabled={loading}
                      value={signInPassword}
                      onChange={(e) => setSignInPassword(e.target.value)}
                      onKeyDown={handleKeyEvent}
                      onKeyUp={handleKeyEvent}
                      className="pl-10 pr-10 border-zinc-800 bg-zinc-950 text-zinc-100 focus:border-purple-600 focus:ring-purple-600"
                    />
                    <button
                      type="button"
                      aria-label={showSignInPassword ? 'Hide password' : 'Show password'}
                      onClick={() => setShowSignInPassword(!showSignInPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300 transition-colors"
                    >
                      {showSignInPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>
                <Button
                  type="submit"
                  disabled={loading}
                  className="w-full h-11 bg-purple-600 hover:bg-purple-700 text-white font-medium shadow-lg shadow-purple-600/20 mt-1 cursor-pointer active:scale-[0.99] transition-all"
                >
                  {loading && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                  Sign In
                </Button>

                {/* Evaluation Demo Account Quick Fill */}
                <div className="mt-2 p-3 rounded-xl bg-purple-500/10 border border-purple-500/20 text-xs flex items-center justify-between gap-2 shadow-xs">
                  <div className="min-w-0">
                    <div className="text-[11px] font-bold text-purple-300 uppercase tracking-wider flex items-center gap-1.5">
                      <Sparkles className="h-3.5 w-3.5 text-purple-400 shrink-0" />
                      <span className="truncate">Evaluation Account</span>
                    </div>
                    <p className="text-[10px] text-zinc-400 mt-0.5 truncate">
                      admin@gymerp.local / admin123
                    </p>
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setSignInEmail('admin@gymerp.local');
                      setSignInPassword('admin123');
                    }}
                    className="h-7 text-[11px] px-2.5 bg-purple-950/60 border-purple-800/60 text-purple-200 hover:text-white hover:bg-purple-900/60 active:scale-95 transition-all shrink-0 cursor-pointer"
                  >
                    Quick Fill
                  </Button>
                </div>
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

            {/* Sign Up Tab */}
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
                  <div className="flex items-center justify-between">
                    <Label htmlFor="signUpPassword" className="text-zinc-300 text-sm">Password</Label>
                    {passwordStrength.label && (
                      <span className="text-xs text-zinc-400">
                        Strength: <span className="font-medium text-zinc-200">{passwordStrength.label}</span>
                      </span>
                    )}
                  </div>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-500" />
                    <Input
                      id="signUpPassword"
                      type={showSignUpPassword ? 'text' : 'password'}
                      autoComplete="new-password"
                      placeholder="At least 6 characters"
                      disabled={loading}
                      value={signUpPassword}
                      onChange={(e) => setSignUpPassword(e.target.value)}
                      onKeyDown={handleKeyEvent}
                      onKeyUp={handleKeyEvent}
                      className="pl-10 pr-10 border-zinc-800 bg-zinc-950 text-zinc-100 focus:border-purple-600 focus:ring-purple-600"
                    />
                    <button
                      type="button"
                      aria-label={showSignUpPassword ? 'Hide password' : 'Show password'}
                      onClick={() => setShowSignUpPassword(!showSignUpPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300 transition-colors"
                    >
                      {showSignUpPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                  {/* Password Strength Indicator Bar */}
                  {signUpPassword && (
                    <div className="grid grid-cols-4 gap-1.5 mt-1">
                      {[1, 2, 3, 4].map((step) => (
                        <div
                          key={step}
                          className={`h-1 rounded-full transition-all duration-200 ${
                            step <= passwordStrength.score ? passwordStrength.color : 'bg-zinc-800'
                          }`}
                        />
                      ))}
                    </div>
                  )}
                </div>
                <div className="grid gap-2">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="signUpConfirm" className="text-zinc-300 text-sm">Confirm Password</Label>
                    {signUpConfirm && (
                      <span className="text-xs flex items-center gap-1">
                        {signUpPassword === signUpConfirm ? (
                          <span className="text-green-400 flex items-center gap-1">
                            <Check className="h-3 w-3" /> Matched
                          </span>
                        ) : (
                          <span className="text-red-400">Mismatch</span>
                        )}
                      </span>
                    )}
                  </div>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-500" />
                    <Input
                      id="signUpConfirm"
                      type={showSignUpConfirm ? 'text' : 'password'}
                      autoComplete="new-password"
                      placeholder="Re-enter password"
                      disabled={loading}
                      value={signUpConfirm}
                      onChange={(e) => setSignUpConfirm(e.target.value)}
                      onKeyDown={handleKeyEvent}
                      onKeyUp={handleKeyEvent}
                      className="pl-10 pr-10 border-zinc-800 bg-zinc-950 text-zinc-100 focus:border-purple-600 focus:ring-purple-600"
                    />
                    <button
                      type="button"
                      aria-label={showSignUpConfirm ? 'Hide password' : 'Show password'}
                      onClick={() => setShowSignUpConfirm(!showSignUpConfirm)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300 transition-colors"
                    >
                      {showSignUpConfirm ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>

                {/* Terms of Service and Privacy Policy consent */}
                <div className="flex items-start gap-2 pt-1">
                  <input
                    id="termsAgreement"
                    type="checkbox"
                    checked={agreedToTerms}
                    onChange={(e) => setAgreedToTerms(e.target.checked)}
                    className="mt-1 h-3.5 w-3.5 rounded border-zinc-700 bg-zinc-900 text-purple-600 focus:ring-purple-600 focus:ring-offset-zinc-900"
                  />
                  <Label htmlFor="termsAgreement" className="text-xs text-zinc-400 font-normal leading-relaxed cursor-pointer">
                    I agree to the{' '}
                    <Link href="/terms" target="_blank" className="text-purple-400 hover:underline">
                      Terms of Service
                    </Link>{' '}
                    and{' '}
                    <Link href="/privacy" target="_blank" className="text-purple-400 hover:underline">
                      Privacy Policy
                    </Link>
                    .
                  </Label>
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

// Page wrapper (Suspense required for useSearchParams)
export default function OwnerLoginPage() {
  return (
    <div className="relative flex min-h-screen bg-zinc-950 text-zinc-50 selection:bg-purple-600 selection:text-white overflow-hidden">
      <GridPattern className="absolute inset-0 z-0 opacity-50" />
      <Meteors number={12} />

      {/* Left panel - decorative, desktop only */}
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
            Automate your admin tasks - check-ins, invoices, dues, WhatsApp reminders - and focus on your members&apos; growth.
          </p>
        </div>
      </div>

      {/* Right panel - auth form */}
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
