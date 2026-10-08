'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Shield, Loader2, AlertCircle, Eye, EyeOff, Lock, Mail } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';

import { Card, CardContent, CardFooter } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';

import { GridPattern } from '@/components/magicui/grid-pattern';
import { Meteors } from '@/components/magicui/meteors';
import { GradientText } from '@/components/magicui/gradient-text';
import { BorderBeam } from '@/components/magicui/border-beam';

export default function SuperAdminLoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [capsLockActive, setCapsLockActive] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();
  const supabase = createClient();

  const handleKeyEvent = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (typeof e.getModifierState === 'function') {
      setCapsLockActive(e.getModifierState('CapsLock'));
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      const { data, error: authError } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });

      if (authError) {
        throw new Error(authError.message);
      }

      if (!data.session?.user) {
        throw new Error('No user data returned.');
      }

      // Check super_admins table
      const { data: superAdmin, error: saError } = await supabase
        .from('super_admins')
        .select('*')
        .eq('user_id', data.session.user.id)
        .eq('is_active', true)
        .single();

      if (saError || !superAdmin) {
        // Sign out if they are not a super admin
        await supabase.auth.signOut();
        throw new Error('Not authorized as super admin');
      }

      // Success
      router.push('/superadmin');
      router.refresh();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'An unknown error occurred';
      setError(msg || 'An unexpected error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="relative min-h-screen flex items-center justify-center overflow-hidden bg-zinc-950">
      <GridPattern className="absolute inset-0 opacity-20 pointer-events-none" />
      <div className="absolute inset-0 z-0 opacity-50">
        <Meteors number={20} />
      </div>

      <div className="relative z-10 w-full max-w-md px-4">
        <div className="flex flex-col items-center mb-8 text-center space-y-4">
          <div className="bg-amber-500/10 p-3 rounded-2xl border border-amber-500/20 backdrop-blur-xl">
            <Shield className="h-10 w-10 text-amber-500" />
          </div>
          <GradientText
            colors="from-amber-400 via-yellow-300 to-orange-400"
            className="text-3xl font-bold"
          >
            Platform Administration
          </GradientText>
          <p className="text-zinc-400 text-sm">
            Sign in to access the Super Admin dashboard
          </p>
        </div>

        <Card className="relative bg-zinc-900/50 backdrop-blur-xl border-zinc-800 text-zinc-100 shadow-2xl">
          <BorderBeam duration={12} delay={9} colorFrom="#fbbf24" colorTo="#f97316" />
          <form onSubmit={handleLogin}>
            <CardContent className="pt-6 space-y-4">
              {error && (
                <div className="flex items-center gap-2 rounded-lg bg-red-950/50 border border-red-900/50 text-red-400 p-3 text-sm">
                  <AlertCircle className="h-4 w-4 shrink-0" />
                  <span>{error}</span>
                </div>
              )}
              {capsLockActive && (
                <div className="flex items-center gap-2 rounded-lg bg-amber-950/50 border border-amber-900/50 text-amber-400 p-2.5 text-xs">
                  <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                  <span>Caps Lock is ON</span>
                </div>
              )}
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-500" />
                  <Input
                    id="email"
                    type="email"
                    placeholder="admin@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="pl-10 bg-zinc-950/50 border-zinc-800 focus-visible:ring-amber-500 text-zinc-100"
                    required
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-500" />
                  <Input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    onKeyDown={handleKeyEvent}
                    onKeyUp={handleKeyEvent}
                    className="pl-10 pr-10 bg-zinc-950/50 border-zinc-800 focus-visible:ring-amber-500 text-zinc-100"
                    required
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
            </CardContent>
            <CardFooter>
              <Button
                type="submit"
                className="w-full bg-amber-600 hover:bg-amber-700 text-white border-none shadow-[0_0_15px_rgba(245,158,11,0.3)] transition-all hover:shadow-[0_0_25px_rgba(245,158,11,0.5)]"
                disabled={isLoading}
              >
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Authenticating...
                  </>
                ) : (
                  'Sign In'
                )}
              </Button>
            </CardFooter>
          </form>
        </Card>
      </div>
    </div>
  );
}
