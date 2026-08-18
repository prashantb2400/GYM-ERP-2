'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Dumbbell, Loader2 } from 'lucide-react';
import Link from 'next/link';
import { GridPattern } from '@/components/magicui/grid-pattern';
import { Meteors } from '@/components/magicui/meteors';
import { BorderBeam } from '@/components/magicui/border-beam';
import { ShinyButton } from '@/components/magicui/shiny-button';

export default function StaffLoginPage() {
  const supabase = createClient();
  const router = useRouter();
  
  const [loginId, setLoginId] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleStaffLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!loginId.trim() || !password.trim()) {
      setError('Please fill in all fields');
      return;
    }

    try {
      setLoading(true);
      setError(null);

      // Call database function to resolve login_id to email (bypasses RLS secure definer)
      const { data: email, error: rpcError } = await supabase.rpc('get_email_by_login_id', {
        p_login_id: loginId.trim(),
      });

      if (rpcError || !email) {
        throw new Error('Invalid Login ID or inactive account');
      }

      // Perform auth sign in using resolved email
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: email,
        password: password,
      });

      if (signInError) throw signInError;
      
      router.push('/dashboard');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'An unknown error occurred';
      setError(msg || 'Incorrect Login ID or Password');
      setLoading(false);
    }
  };

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

          <div className="relative">
            <BorderBeam />
            <Card className="border-zinc-800 bg-zinc-900/60 backdrop-blur-xl relative z-10">
              <CardHeader className="space-y-1">
                <CardTitle className="text-2xl font-bold tracking-tight text-center lg:text-left">
                  Staff Login
                </CardTitle>
                <CardDescription className="text-zinc-400 text-center lg:text-left">
                  Enter the Login ID and password assigned to you by the gym owner.
                </CardDescription>
              </CardHeader>
              <form onSubmit={handleStaffLogin}>
                <CardContent className="grid gap-4">
                  {error && (
                    <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-3 text-sm text-red-400">
                      {error}
                    </div>
                  )}
                  <div className="grid gap-2">
                    <Label htmlFor="loginId" className="text-zinc-300 text-sm">Login ID</Label>
                    <Input
                      id="loginId"
                      type="text"
                      placeholder="e.g. front_desk_1"
                      disabled={loading}
                      value={loginId}
                      onChange={(e) => setLoginId(e.target.value)}
                      className="border-zinc-800 bg-zinc-950 text-zinc-100 placeholder:text-zinc-600 focus:border-purple-600 focus:ring-purple-600"
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="password" className="text-zinc-300 text-sm">Password</Label>
                    <Input
                      id="password"
                      type="password"
                      disabled={loading}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="border-zinc-800 bg-zinc-950 text-zinc-100 focus:border-purple-600 focus:ring-purple-600"
                    />
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
          </div>
        </div>
      </div>
    </div>
  );
}
