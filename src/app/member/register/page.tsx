'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Dumbbell, Loader2, Phone, User, Calendar, Award } from 'lucide-react';
import Link from 'next/link';

function RegisterForm() {
  const supabase = createClient();
  const router = useRouter();
  const searchParams = useSearchParams();

  const [gymId, setGymId] = useState('');
  const [gyms, setGyms] = useState<{ id: string; name: string }[]>([]);
  const [gymName, setGymName] = useState('');
  
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [dob, setDob] = useState('');
  const [gender, setGender] = useState<'male' | 'female' | 'other' | ''>('');
  
  const [otp, setOtp] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    // Fetch all gyms to allow selection if gymId is not in searchParams
    const fetchGyms = async () => {
      const { data, error: gymError } = await supabase
        .from('gyms')
        .select('id, name');
      
      if (!gymError && data) {
        setGyms(data);
      }
    };
    fetchGyms();

    const queryGymId = searchParams.get('gym');
    if (queryGymId) {
      setGymId(queryGymId);
      // Fetch specific gym name
      supabase
        .from('gyms')
        .select('name')
        .eq('id', queryGymId)
        .single()
        .then(({ data }) => {
          if (data) setGymName(data.name);
        });
    }
  }, [searchParams, supabase]);

  const handleSendOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanPhone = phone.replace(/\D/g, '');
    
    if (!gymId) {
      setError('Please select a gym branch');
      return;
    }
    if (!name.trim()) {
      setError('Please enter your full name');
      return;
    }
    if (cleanPhone.length !== 10) {
      setError('Please enter a valid 10-digit mobile number');
      return;
    }

    try {
      setLoading(true);
      setError(null);

      // Check if this phone number is already registered
      const { data: existingMember } = await supabase
        .from('members')
        .select('id')
        .eq('phone', cleanPhone)
        .eq('gym_id', gymId)
        .limit(1);

      if (existingMember && existingMember.length > 0) {
        throw new Error('This phone number is already registered at this gym branch.');
      }

      // Send OTP to phone
      const { error: otpError } = await supabase.auth.signInWithOtp({
        phone: `+91${cleanPhone}`,
      });

      if (otpError) throw otpError;

      setOtpSent(true);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'An unknown error occurred';
      setError(msg || 'Failed to send OTP. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyAndRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanPhone = phone.replace(/\D/g, '');
    if (otp.length !== 6) {
      setError('OTP must be exactly 6 digits');
      return;
    }

    try {
      setLoading(true);
      setError(null);

      // Verify OTP to sign in / create user session
      const { data: authData, error: verifyError } = await supabase.auth.verifyOtp({
        phone: `+91${cleanPhone}`,
        token: otp,
        type: 'sms',
      });

      if (verifyError || !authData.user) {
        throw new Error(verifyError?.message || 'Invalid or expired OTP');
      }

      // H-19 FIX: Call secure server API instead of broken client-side RPC+insert.
      // The old code used supabase.rpc('generate_member_code') which failed with
      // 'Not authorized' because the caller didn't have owner/receptionist role,
      // and direct .from('members').insert() was blocked by RLS.
      const res = await fetch('/api/members/self-register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          authUserId: authData.user.id,
          gymId,
          name: name.trim(),
          phone: cleanPhone,
          dob: dob || null,
          gender: gender || null,
        }),
      });

      if (!res.ok) {
        const body = await res.json();
        throw new Error(body.error || 'Registration failed');
      }

      setSuccess(true);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'An unknown error occurred';
      setError(msg || 'Verification and registration failed');
      setLoading(false);
    }
  };

  if (success) {
    return (
      <Card className="border-zinc-800 bg-zinc-900/40 backdrop-blur-md">
        <CardHeader className="text-center">
          <div className="bg-purple-600/10 p-4 rounded-full w-fit mx-auto mb-6 text-purple-400">
            <Award className="h-12 w-12" />
          </div>
          <CardTitle className="text-2xl font-bold tracking-tight">Registration Submitted!</CardTitle>
          <CardDescription className="text-zinc-400 mt-2">
            Welcome to the fitness family, <span className="text-zinc-200 font-semibold">{name}</span>!
          </CardDescription>
        </CardHeader>
        <CardContent className="text-center text-sm text-zinc-400 leading-relaxed px-6 pb-6">
          <p>
            Your profile has been created successfully with status <span className="text-purple-400 font-semibold">Pending</span>.
          </p>
          <p className="mt-4">
            Please visit the gym reception desk to verify your details, select a membership plan, and activate your account.
          </p>
        </CardContent>
        <CardFooter className="justify-center border-t border-zinc-800/40 pt-6">
          <Link href="/member/login" passHref legacyBehavior>
            <Button className="bg-purple-600 hover:bg-purple-700 text-white px-6">
              Go to Login Page
            </Button>
          </Link>
        </CardFooter>
      </Card>
    );
  }

  return (
    <Card className="border-zinc-800 bg-zinc-900/40 backdrop-blur-md">
      <CardHeader className="space-y-1">
        <CardTitle className="text-2xl font-bold tracking-tight text-center lg:text-left">
          Member Registration
        </CardTitle>
        <CardDescription className="text-zinc-400 text-center lg:text-left">
          {gymName ? `Registering at branch: ${gymName}` : 'Fill in details below to register at your gym branch.'}
        </CardDescription>
      </CardHeader>
      {!otpSent ? (
        <form onSubmit={handleSendOtp}>
          <CardContent className="grid gap-4">
            {error && (
              <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-3 text-sm text-red-400">
                {error}
              </div>
            )}
            
            {!gymName && (
              <div className="grid gap-2">
                <Label htmlFor="gymSelect" className="text-zinc-300 text-sm">Select Gym Branch</Label>
                <Select value={gymId} onValueChange={setGymId} disabled={loading}>
                  <SelectTrigger id="gymSelect" className="border-zinc-800 bg-zinc-950 text-zinc-100">
                    <SelectValue placeholder="Choose a gym branch" />
                  </SelectTrigger>
                  <SelectContent className="bg-zinc-900 border-zinc-800 text-zinc-100">
                    {gyms.map(g => (
                      <SelectItem key={g.id} value={g.id} className="focus:bg-zinc-800 focus:text-white">
                        {g.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            <div className="grid gap-2">
              <Label htmlFor="name" className="text-zinc-300 text-sm">Full Name</Label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-500" />
                <Input
                  id="name"
                  type="text"
                  placeholder="e.g. Raj Kumar"
                  disabled={loading}
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="pl-10 border-zinc-800 bg-zinc-950 text-zinc-100 placeholder:text-zinc-700 focus:border-purple-600 focus:ring-purple-600"
                />
              </div>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="phone" className="text-zinc-300 text-sm">Mobile Phone Number</Label>
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

            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="dob" className="text-zinc-300 text-sm">DOB (Optional)</Label>
                <div className="relative">
                  <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-500" />
                  <Input
                    id="dob"
                    type="date"
                    disabled={loading}
                    value={dob}
                    onChange={(e) => setDob(e.target.value)}
                    className="pl-10 border-zinc-800 bg-zinc-950 text-zinc-100 focus:border-purple-600 focus:ring-purple-600"
                  />
                </div>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="genderSelect" className="text-zinc-300 text-sm">Gender (Optional)</Label>
                <Select value={gender} onValueChange={(v: any) => setGender(v)} disabled={loading}>
                  <SelectTrigger id="genderSelect" className="border-zinc-800 bg-zinc-950 text-zinc-100">
                    <SelectValue placeholder="Select" />
                  </SelectTrigger>
                  <SelectContent className="bg-zinc-900 border-zinc-800 text-zinc-100">
                    <SelectItem value="male" className="focus:bg-zinc-800 focus:text-white">Male</SelectItem>
                    <SelectItem value="female" className="focus:bg-zinc-800 focus:text-white">Female</SelectItem>
                    <SelectItem value="other" className="focus:bg-zinc-800 focus:text-white">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <Button
              type="submit"
              disabled={loading}
              className="w-full h-11 bg-purple-600 hover:bg-purple-700 text-white font-medium shadow-lg shadow-purple-600/20 transition-all mt-2"
            >
              {loading ? (
                <Loader2 className="h-4 w-4 animate-spin text-white mr-2 inline" />
              ) : (
                <Phone className="h-4 w-4 mr-2 inline" />
              )}
              Verify Phone via OTP
            </Button>
          </CardContent>
        </form>
      ) : (
        <form onSubmit={handleVerifyAndRegister}>
          <CardContent className="grid gap-4">
            {error && (
              <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-3 text-sm text-red-400">
                {error}
              </div>
            )}
            <div className="grid gap-2">
              <Label htmlFor="otp" className="text-zinc-300 text-sm">Enter 6-digit OTP Code</Label>
              <Input
                id="otp"
                type="text"
                maxLength={6}
                placeholder="000000"
                disabled={loading}
                value={otp}
                onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
                className="border-zinc-800 bg-zinc-950 text-zinc-100 focus:border-purple-600 focus:ring-purple-600 tracking-[0.25em] text-center font-bold text-lg"
              />
            </div>
            <div className="flex justify-between items-center text-xs mt-1">
              <button 
                type="button" 
                onClick={() => setOtpSent(false)} 
                disabled={loading}
                className="text-zinc-400 hover:text-white"
              >
                Back to Details
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
            <Button
              type="submit"
              disabled={loading}
              className="w-full h-11 bg-purple-600 hover:bg-purple-700 text-white font-medium shadow-lg shadow-purple-600/20 transition-all mt-2"
            >
              {loading ? (
                <Loader2 className="h-4 w-4 animate-spin text-white mr-2 inline" />
              ) : null}
              Confirm Registration
            </Button>
          </CardContent>
        </form>
      )}
      <CardFooter className="flex flex-col gap-3 text-center border-t border-zinc-800/40 pt-6">
        <div className="text-xs text-zinc-500">
          Already registered?{' '}
          <Link href="/member/login" className="text-purple-400 hover:underline">
            Member Login
          </Link>
        </div>
      </CardFooter>
    </Card>
  );
}

export default function MemberRegisterPage() {
  return (
    <div className="flex min-h-screen bg-zinc-950 text-zinc-50 selection:bg-purple-600 selection:text-white">
      {/* Left panel - Decorative */}
      <div className="hidden lg:flex lg:w-1/2 bg-zinc-900 border-r border-zinc-800 relative justify-center items-center overflow-hidden">
        <div className="absolute top-1/4 left-1/4 w-[300px] h-[300px] bg-purple-700/10 rounded-full blur-[100px] pointer-events-none" />
        <div className="relative z-10 text-center max-w-lg px-8">
          <div className="bg-purple-600 p-4 rounded-2xl w-fit mx-auto mb-8 shadow-xl shadow-purple-600/20">
            <Dumbbell className="h-12 w-12 text-white rotate-45" />
          </div>
          <h2 className="text-4xl font-extrabold tracking-tight bg-gradient-to-r from-white via-zinc-200 to-zinc-400 bg-clip-text text-transparent mb-4">
            Join the Gym
          </h2>
          <p className="text-zinc-400 text-lg leading-relaxed">
            Register yourself securely using your mobile phone, and walk into the branch to complete your membership setup and start working out.
          </p>
        </div>
      </div>

      {/* Right panel - Registration Form */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-6 relative">
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
            <RegisterForm />
          </Suspense>
        </div>
      </div>
    </div>
  );
}
