'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Dumbbell, ShieldCheck, CreditCard, Sparkles, Loader2, ArrowRight, ArrowLeft, CheckCircle2, QrCode, Copy, Check, Tablet } from 'lucide-react';
import { useAuthStore } from '@/store/authStore';
import { QRCodeSVG } from 'qrcode.react';

interface PlanItem {
  name: string;
  durationDays: number;
  price: number;
  features: string[];
  selected: boolean;
}

export default function SetupWizardPage() {
  const router = useRouter();

  const [step, setStep] = useState(1);
  const [checking, setChecking] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [kioskUrl, setKioskUrl] = useState<string>('');
  const [copied, setCopied] = useState(false);

  // Step 1: Gym Profile
  const [gymName, setGymName] = useState('');
  const [phone, setPhone] = useState('');
  const [city, setCity] = useState('');
  const [state, setState] = useState('');
  const [upiVpa, setUpiVpa] = useState('');

  // Step 2: Admin Account
  const [ownerName, setOwnerName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  // Step 3: Starter Plans
  const [plans, setPlans] = useState<PlanItem[]>([
    { name: '1 Month Membership', durationDays: 30, price: 1200, features: ['Full Gym Access', 'Locker Room'], selected: true },
    { name: '3 Months Membership', durationDays: 90, price: 3000, features: ['Full Gym Access', 'Fitness Assessment'], selected: true },
    { name: '1 Year Membership', durationDays: 365, price: 10000, features: ['Full Gym Access', 'Diet Plan', 'Locker Room'], selected: true },
  ]);

  // Check if system is already initialized
  useEffect(() => {
    async function checkStatus() {
      try {
        const res = await fetch('/api/setup/status');
        const data = await res.json();
        if (data.initialized) {
          router.replace('/login');
          return;
        }
      } catch (err) {
        console.warn('Status check failed:', err);
      } finally {
        setChecking(false);
      }
    }
    checkStatus();
  }, [router]);

  const handleNextStep1 = () => {
    setError(null);
    if (!gymName.trim()) {
      setError('Please enter your Gym Name.');
      return;
    }
    setStep(2);
  };

  const handleNextStep2 = () => {
    setError(null);
    if (!ownerName.trim()) {
      setError('Please enter the owner or administrator name.');
      return;
    }
    if (!email.trim() || !email.includes('@')) {
      setError('Please enter a valid administrator email address.');
      return;
    }
    if (!password || password.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }
    setStep(3);
  };

  const handlePlanPriceChange = (index: number, newPrice: number) => {
    setPlans((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], price: newPrice };
      return next;
    });
  };

  const handlePlanToggle = (index: number) => {
    setPlans((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], selected: !next[index].selected };
      return next;
    });
  };

  const handleFinalSubmit = async () => {
    setError(null);
    setSubmitting(true);

    try {
      const selectedPlans = plans.filter((p) => p.selected);

      const payload = {
        gym: {
          name: gymName.trim(),
          phone: phone.trim(),
          city: city.trim(),
          state: state.trim(),
          upiVpa: upiVpa.trim(),
        },
        owner: {
          name: ownerName.trim(),
          email: email.trim().toLowerCase(),
          password,
        },
        plans: selectedPlans,
      };

      const res = await fetch('/api/setup/init', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Initialization failed');
      }

      // Save token and state in client store
      if (data.token) {
        localStorage.setItem('gymerp_token', data.token);
        localStorage.setItem('gymerp_cached_gym_id', data.gymId);
        document.cookie = `gymerp_token=${data.token}; path=/; max-age=2592000; SameSite=Lax`;
      }

      useAuthStore.getState().setSession({
        user: data.user,
        member: null,
        needsOnboarding: false,
      });

      const origin = typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000';
      const tokenParam = data.kioskToken ? `&token=${encodeURIComponent(data.kioskToken)}` : '';
      setKioskUrl(`${origin}/kiosk/agent?gymId=${data.gymId}${tokenParam}`);
      setSubmitting(false);
      setStep(4);
    } catch (err: any) {
      setError(err.message || 'Failed to complete setup');
      setSubmitting(false);
    }
  };

  const handleCopyKioskUrl = () => {
    if (kioskUrl) {
      navigator.clipboard.writeText(kioskUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  if (checking) {
    return (
      <div className="min-h-screen bg-[#09090b] flex flex-col items-center justify-center text-white">
        <Loader2 className="w-8 h-8 animate-spin text-purple-500 mb-4" />
        <p className="text-zinc-400 text-sm">Checking appliance status...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#09090b] text-white flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-xl">
        {/* Header Badge */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-purple-600/20 border border-purple-500/30 text-purple-400 mb-4 shadow-lg shadow-purple-500/10">
            <Dumbbell className="w-7 h-7" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight bg-gradient-to-r from-white via-zinc-200 to-purple-400 bg-clip-text text-transparent">
            Welcome to GymERP
          </h1>
          <p className="text-sm text-zinc-400 mt-1">
            Complete the 3-step offline setup to configure your gym appliance.
          </p>
        </div>

        {/* Step Indicator */}
        <div className="flex items-center justify-between mb-8 px-4">
          <div className="flex items-center gap-2">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-colors ${step > 1 ? 'bg-emerald-600 text-white' : step === 1 ? 'bg-purple-600 text-white' : 'bg-zinc-800 text-zinc-500'}`}>
              {step > 1 ? <Check className="w-4 h-4" /> : '1'}
            </div>
            <span className={`text-xs font-medium ${step >= 1 ? 'text-zinc-200' : 'text-zinc-500'}`}>Profile</span>
          </div>
          <div className={`h-0.5 flex-1 mx-2 sm:mx-3 ${step >= 2 ? 'bg-purple-600' : 'bg-zinc-800'}`} />
          <div className="flex items-center gap-2">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-colors ${step > 2 ? 'bg-emerald-600 text-white' : step === 2 ? 'bg-purple-600 text-white' : 'bg-zinc-800 text-zinc-500'}`}>
              {step > 2 ? <Check className="w-4 h-4" /> : '2'}
            </div>
            <span className={`text-xs font-medium ${step >= 2 ? 'text-zinc-200' : 'text-zinc-500'}`}>Admin</span>
          </div>
          <div className={`h-0.5 flex-1 mx-2 sm:mx-3 ${step >= 3 ? 'bg-purple-600' : 'bg-zinc-800'}`} />
          <div className="flex items-center gap-2">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-colors ${step > 3 ? 'bg-emerald-600 text-white' : step === 3 ? 'bg-purple-600 text-white' : 'bg-zinc-800 text-zinc-500'}`}>
              {step > 3 ? <Check className="w-4 h-4" /> : '3'}
            </div>
            <span className={`text-xs font-medium ${step >= 3 ? 'text-zinc-200' : 'text-zinc-500'}`}>Plans</span>
          </div>
          <div className={`h-0.5 flex-1 mx-2 sm:mx-3 ${step >= 4 ? 'bg-purple-600' : 'bg-zinc-800'}`} />
          <div className="flex items-center gap-2">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-colors ${step === 4 ? 'bg-emerald-600 text-white' : 'bg-zinc-800 text-zinc-500'}`}>
              {step === 4 ? <Sparkles className="w-4 h-4" /> : '4'}
            </div>
            <span className={`text-xs font-medium ${step === 4 ? 'text-emerald-300' : 'text-zinc-500'}`}>Ready</span>
          </div>
        </div>

        {/* Wizard Card */}
        <Card className="bg-[#18181b] border-zinc-800 text-zinc-100 shadow-2xl">
          {error && (
            <div className="m-6 mb-0 p-3 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 text-sm">
              {error}
            </div>
          )}

          {/* STEP 1: GYM PROFILE */}
          {step === 1 && (
            <>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Dumbbell className="w-5 h-5 text-purple-400" />
                  Gym Details
                </CardTitle>
                <CardDescription className="text-zinc-400">
                  Enter the primary details for your gym facility.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-1.5">
                  <Label htmlFor="gymName" className="text-xs text-zinc-300">Gym Name *</Label>
                  <Input
                    id="gymName"
                    placeholder="e.g. Apex Performance Gym"
                    value={gymName}
                    onChange={(e) => setGymName(e.target.value)}
                    className="bg-zinc-900 border-zinc-700"
                    autoFocus
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label htmlFor="phone" className="text-xs text-zinc-300">Gym Phone Number</Label>
                    <Input
                      id="phone"
                      placeholder="e.g. 9876543210"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      className="bg-zinc-900 border-zinc-700"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="city" className="text-xs text-zinc-300">City</Label>
                    <Input
                      id="city"
                      placeholder="e.g. Mumbai"
                      value={city}
                      onChange={(e) => setCity(e.target.value)}
                      className="bg-zinc-900 border-zinc-700"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label htmlFor="state" className="text-xs text-zinc-300">State</Label>
                    <Input
                      id="state"
                      placeholder="e.g. Maharashtra"
                      value={state}
                      onChange={(e) => setState(e.target.value)}
                      className="bg-zinc-900 border-zinc-700"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="upiVpa" className="text-xs text-zinc-300">UPI ID for Invoices (Optional)</Label>
                    <Input
                      id="upiVpa"
                      placeholder="e.g. mygym@upi"
                      value={upiVpa}
                      onChange={(e) => setUpiVpa(e.target.value)}
                      className="bg-zinc-900 border-zinc-700"
                    />
                  </div>
                </div>
              </CardContent>
              <CardFooter className="flex justify-end pt-4 border-t border-zinc-800">
                <Button
                  onClick={handleNextStep1}
                  className="bg-purple-600 hover:bg-purple-500 text-white flex items-center gap-2 active:scale-98 transition-all"
                >
                  Continue to Admin Setup
                  <ArrowRight className="w-4 h-4" />
                </Button>
              </CardFooter>
            </>
          )}

          {/* STEP 2: ADMIN CREDENTIALS */}
          {step === 2 && (
            <>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <ShieldCheck className="w-5 h-5 text-purple-400" />
                  Administrator Credentials
                </CardTitle>
                <CardDescription className="text-zinc-400">
                  Create your master owner login to manage billing, members, and kiosks.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-1.5">
                  <Label htmlFor="ownerName" className="text-xs text-zinc-300">Owner Full Name *</Label>
                  <Input
                    id="ownerName"
                    placeholder="e.g. Alex Johnson"
                    value={ownerName}
                    onChange={(e) => setOwnerName(e.target.value)}
                    className="bg-zinc-900 border-zinc-700"
                    autoFocus
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="email" className="text-xs text-zinc-300">Admin Email Address *</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="admin@mygym.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="bg-zinc-900 border-zinc-700"
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label htmlFor="password" className="text-xs text-zinc-300">Password *</Label>
                    <Input
                      id="password"
                      type="password"
                      placeholder="At least 6 characters"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="bg-zinc-900 border-zinc-700"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="confirmPassword" className="text-xs text-zinc-300">Confirm Password *</Label>
                    <Input
                      id="confirmPassword"
                      type="password"
                      placeholder="Repeat password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      className="bg-zinc-900 border-zinc-700"
                    />
                  </div>
                </div>
              </CardContent>
              <CardFooter className="flex justify-between pt-4 border-t border-zinc-800">
                <Button
                  variant="outline"
                  onClick={() => setStep(1)}
                  className="border-zinc-700 text-zinc-300 hover:bg-zinc-800 flex items-center gap-2 active:scale-98 transition-all"
                >
                  <ArrowLeft className="w-4 h-4" />
                  Back
                </Button>
                <Button
                  onClick={handleNextStep2}
                  className="bg-purple-600 hover:bg-purple-500 text-white flex items-center gap-2 active:scale-98 transition-all"
                >
                  Continue to Plans
                  <ArrowRight className="w-4 h-4" />
                </Button>
              </CardFooter>
            </>
          )}

          {/* STEP 3: MEMBERSHIP PLANS */}
          {step === 3 && (
            <>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <CreditCard className="w-5 h-5 text-purple-400" />
                  Starter Membership Plans
                </CardTitle>
                <CardDescription className="text-zinc-400">
                  Review and customize initial membership pricing for new members.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {plans.map((plan, idx) => (
                  <div
                    key={plan.durationDays}
                    className={`p-3.5 rounded-xl border transition-all flex items-center justify-between gap-4 ${plan.selected ? 'bg-zinc-900/80 border-purple-500/40' : 'bg-zinc-900/30 border-zinc-800 opacity-60'}`}
                  >
                    <div className="flex items-center gap-3">
                      <input
                        type="checkbox"
                        checked={plan.selected}
                        onChange={() => handlePlanToggle(idx)}
                        className="w-4 h-4 rounded text-purple-600 bg-zinc-800 border-zinc-700 focus:ring-0"
                      />
                      <div>
                        <div className="text-sm font-semibold text-white">{plan.name}</div>
                        <div className="text-xs text-zinc-400">{plan.durationDays} Days Duration</div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-zinc-400">₹</span>
                      <Input
                        type="number"
                        value={plan.price}
                        onChange={(e) => handlePlanPriceChange(idx, Number(e.target.value))}
                        disabled={!plan.selected}
                        className="w-24 h-9 bg-zinc-800 border-zinc-700 text-right font-mono"
                      />
                    </div>
                  </div>
                ))}
              </CardContent>
              <CardFooter className="flex justify-between pt-4 border-t border-zinc-800">
                <Button
                  variant="outline"
                  onClick={() => setStep(2)}
                  disabled={submitting}
                  className="border-zinc-700 text-zinc-300 hover:bg-zinc-800 flex items-center gap-2 active:scale-98 transition-all"
                >
                  <ArrowLeft className="w-4 h-4" />
                  Back
                </Button>
                <Button
                  onClick={handleFinalSubmit}
                  disabled={submitting}
                  className="bg-emerald-600 hover:bg-emerald-500 text-white flex items-center gap-2 active:scale-98 transition-all"
                >
                  {submitting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Setting Up Gym...
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4" />
                      Launch GymERP
                    </>
                  )}
                </Button>
              </CardFooter>
            </>
          )}

          {/* STEP 4: KIOSK PAIRING & COMPLETION */}
          {step === 4 && (
            <>
              <CardHeader className="text-center pb-2">
                <div className="w-12 h-12 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 mx-auto flex items-center justify-center mb-3">
                  <CheckCircle2 className="w-6 h-6" />
                </div>
                <CardTitle className="text-xl text-white">Gym Setup Completed!</CardTitle>
                <CardDescription className="text-zinc-400 text-sm">
                  Your local database, owner credentials, and starter plans are active.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6 pt-2">
                {/* Kiosk Auto-Pairing Card */}
                <div className="p-4 rounded-xl bg-zinc-900 border border-zinc-800 space-y-4">
                  <div className="flex items-center gap-2 text-sm font-semibold text-zinc-200">
                    <Tablet className="w-4 h-4 text-purple-400" />
                    Front-Desk Kiosk Quick Pairing
                  </div>
                  <p className="text-xs text-zinc-400">
                    Point your front-desk tablet or smartphone camera at this QR code to launch the autonomous AI voice kiosk:
                  </p>
                  
                  <div className="flex flex-col sm:flex-row items-center justify-center gap-6 p-4 rounded-xl bg-zinc-950/80 border border-zinc-800/80">
                    <div className="p-2.5 bg-white rounded-xl shadow-lg shrink-0">
                      <QRCodeSVG value={kioskUrl || 'http://localhost:3000/kiosk/agent'} size={140} level="M" />
                    </div>
                    <div className="flex-1 space-y-2 text-center sm:text-left min-w-0 w-full">
                      <div className="text-xs font-semibold text-zinc-300">Lobby Kiosk Direct URL</div>
                      <div className="text-xs text-zinc-400 font-mono break-all bg-zinc-900/90 p-2 rounded border border-zinc-800">
                        {kioskUrl || 'http://localhost:3000/kiosk/agent'}
                      </div>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={handleCopyKioskUrl}
                        className="border-zinc-700 text-zinc-300 hover:bg-zinc-800 text-xs flex items-center gap-1.5 w-full sm:w-auto active:scale-98 transition-all"
                      >
                        {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                        {copied ? 'Copied to Clipboard' : 'Copy Kiosk Link'}
                      </Button>
                    </div>
                  </div>
                </div>

                {/* Local Network Info */}
                <div className="p-3.5 rounded-lg bg-purple-500/10 border border-purple-500/20 text-xs text-purple-200 flex items-start gap-2.5">
                  <ShieldCheck className="w-4 h-4 text-purple-400 shrink-0 mt-0.5" />
                  <div>
                    <strong>Local Appliance Ready:</strong> Other devices on your gym Wi-Fi can access this portal using your local network IP or <span className="font-mono text-purple-300">gymerp.local:3000</span>.
                  </div>
                </div>
              </CardContent>
              <CardFooter className="pt-2 border-t border-zinc-800">
                <Button
                  onClick={() => router.replace('/dashboard')}
                  className="w-full bg-purple-600 hover:bg-purple-500 text-white flex items-center justify-center gap-2 py-5 text-sm font-semibold active:scale-98 transition-all"
                >
                  Enter Owner Dashboard
                  <ArrowRight className="w-4 h-4" />
                </Button>
              </CardFooter>
            </>
          )}
        </Card>
      </div>
    </div>
  );
}
