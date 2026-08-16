'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Dumbbell, Loader2, Phone, KeyRound } from 'lucide-react';
import Link from 'next/link';
import { GridPattern } from '@/components/magicui/grid-pattern';
import { Meteors } from '@/components/magicui/meteors';
import { BorderBeam } from '@/components/magicui/border-beam';
import { ShinyButton } from '@/components/magicui/shiny-button';

export default function MemberLoginPage() {
  const supabase = createClient();
  const router = useRouter();

  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState('');
  const [loading, setLoading] = useState(false);
  const [otpSent, setOtpSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSendOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanPhone = phone.replace(/\D/g, '');
    if (cleanPhone.length !== 10) {
      setError('Please enter a valid 10-digit mobile number');
      return;
    }

    try {
      setLoading(true);
      setError(null);

      // Verify that this phone number is registered as a member in the database first
      const { data: member, error: memberError } = await supabase
        .from('members')
        .select('id')
        .eq('phone', cleanPhone)
        .limit(1);

      if (memberError || !member || member.length === 0) {
        throw new Error('This phone number is not registered. Please register first.');
      }

      // Trigger Supabase Phone Auth SMS OTP
      const { error: otpError } = await supabase.auth.signInWithOtp({
        phone: `+91${cleanPhone}`,
      });

      if (otpError) throw otpError;

      setOtpSent(true);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'An unknown error occurred';
      setError(msg || 'Failed to send OTP code');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanPhone = phone.replace(/\D/g, '');
    if (otp.length !== 6) {
      setError('OTP must be exactly 6 digits');
      return;
    }

    try {
      setLoading(true);
      setError(null);

      // Verify OTP code
      const { error: verifyError } = await supabase.auth.verifyOtp({
        phone: `+91${cleanPhone}`,
        token: otp,
        type: 'sms',
      });

      if (verifyError) throw verifyError;

      router.push('/member/dashboard');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'An unknown error occurred';
      setError(msg || 'Invalid or expired OTP. Please try again.');
    } finally {
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
            Member Portal
          </h2>
          <p className="text-zinc-400 text-lg leading-relaxed">
            Check your remaining plan days, check-in history, download workout charts and diet plans, and download A4 invoice receipts.
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
                  Member Login
                </CardTitle>
                <CardDescription className="text-zinc-400 text-center lg:text-left">
                  {otpSent 
                    ? 'Enter the 6-digit OTP code sent to your mobile phone.' 
                    : 'Enter your registered phone number to verify and access your account.'
                  }
                </CardDescription>
              </CardHeader>
              <CardContent>
                {error && (
                  <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-3 text-sm text-red-400 mb-4">
                    {error}
                  </div>
                )}

                {!otpSent ? (
                  <form onSubmit={handleSendOtp} className="grid gap-4">
                    <div className="grid gap-2">
                      <Label htmlFor="phone" className="text-zinc-300 text-sm">Phone Number</Label>
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500 text-sm font-medium">+91</span>
                        <Input
                          id="phone"
                          type="tel"
                          maxLength={10}
                          placeholder="98765 43210"
                          disabled={loading}
                          value={phone}
                          onChange={(e) => setPhone(e.target.value.replace(/\D/g, ''))}
                          className="pl-12 border-zinc-800 bg-zinc-950 text-zinc-100 placeholder:text-zinc-700 focus:border-purple-600 focus:ring-purple-600"
                        />
                      </div>
                    </div>
                    <ShinyButton
                      type="submit"
                      disabled={loading}
                      className="w-full h-11 bg-purple-600 hover:bg-purple-700 text-white font-medium shadow-lg shadow-purple-600/20 transition-all mt-2 flex justify-center items-center"
                    >
                      {loading ? (
                        <Loader2 className="h-4 w-4 animate-spin text-white mr-2 inline" />
                      ) : (
                        <Phone className="h-4 w-4 mr-2 inline" />
                      )}
                      Send OTP Verification
                    </ShinyButton>
                  </form>
                ) : (
                  <form onSubmit={handleVerifyOtp} className="grid gap-4">
                    <div className="grid gap-2">
                      <Label htmlFor="otp" className="text-zinc-300 text-sm">One-Time Password</Label>
                      <Input
                        id="otp"
                        type="text"
                        maxLength={6}
                        placeholder="Enter 6-digit code"
                        disabled={loading}
                        value={otp}
                        onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
                        className="border-zinc-800 bg-zinc-950 text-zinc-100 placeholder:text-zinc-700 focus:border-purple-600 focus:ring-purple-600 tracking-[0.25em] text-center font-bold text-lg"
                      />
                    </div>
                    <div className="flex justify-between items-center text-xs mt-1">
                      <button 
                        type="button" 
                        onClick={() => setOtpSent(false)} 
                        disabled={loading}
                        className="text-zinc-400 hover:text-white"
                      >
                        Change Phone Number
                      </button>
                      <button 
                        type="button" 
                        onClick={handleSendOtp} 
                        disabled={loading}
                        className="text-purple-400 hover:underline"
                      >
                        Resend OTP
                      </button>
                    </div>
                    <ShinyButton
                      type="submit"
                      disabled={loading}
                      className="w-full h-11 bg-purple-600 hover:bg-purple-700 text-white font-medium shadow-lg shadow-purple-600/20 transition-all mt-2 flex justify-center items-center"
                    >
                      {loading ? (
                        <Loader2 className="h-4 w-4 animate-spin text-white mr-2 inline" />
                      ) : (
                        <KeyRound className="h-4 w-4 mr-2 inline" />
                      )}
                      Verify & Login
                    </ShinyButton>
                  </form>
                )}
              </CardContent>
              <CardFooter className="flex flex-col gap-3 text-center border-t border-zinc-800/40 pt-6">
                <div className="text-xs text-zinc-500">
                  Are you a new member?{' '}
                  <Link href="/member/register" className="text-purple-400 hover:underline">
                    Self-Register here
                  </Link>
                </div>
                <div className="text-xs text-zinc-500">
                  Staff portal?{' '}
                  <Link href="/staff/login" className="text-purple-400 hover:underline">
                    Staff Login
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
