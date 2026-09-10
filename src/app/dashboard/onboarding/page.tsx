'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Dumbbell, Loader2, ArrowRight } from 'lucide-react';
import { toast } from 'sonner';

export default function OnboardingPage() {
  const supabase = createClient();
  const router = useRouter();

  const [gymName, setGymName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [tagline, setTagline] = useState('');
  const [city, setCity] = useState('');
  const [state, setState] = useState('');
  
  const [loading, setLoading] = useState(false);
  const [checking, setChecking] = useState(true);
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    // Check if user is logged in
    const checkUser = async () => {
      const { data: { user: authUser } } = await supabase.auth.getUser();
      if (!authUser) {
        router.push('/login');
        return;
      }
      
      setUser(authUser);
      setEmail(authUser.email || '');

      // Check if they already have a gym assigned in users table
      const { data: userData } = await supabase
        .from('users')
        .select('gym_id')
        .eq('auth_id', authUser.id)
        .single();

      if (userData?.gym_id) {
        router.push('/dashboard');
        return;
      }
      
      setChecking(false);
    };
    
    checkUser();
  }, [router, supabase]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!gymName.trim()) {
      toast.error('Gym Name is required');
      return;
    }

    try {
      setLoading(true);

      // 1. Create Gym row
      const { data: gymData, error: gymError } = await supabase
        .from('gyms')
        .insert({
          name: gymName.trim(),
          phone: phone.trim() || null,
          email: email.trim() || null,
          tagline: tagline.trim() || null,
          address: { city: city.trim(), state: state.trim() },
          owner_id: user.id,
          subscription_tier: 'free',
          is_setup_complete: true,
        })
        .select()
        .single();

      if (gymError || !gymData) {
        throw new Error(gymError?.message || 'Failed to create gym workspace');
      }

      // 1b. Create Default Branch for the gym
      const { data: branchData, error: branchError } = await supabase
        .from('branches')
        .insert({
          gym_id: gymData.id,
          name: `${gymName.trim()} Main Branch`,
          phone: phone.trim() || null,
          address: { city: city.trim(), state: state.trim() },
          is_active: true,
        })
        .select()
        .single();

      if (branchError) {
        console.error('Failed to create default branch:', branchError);
      }

      // 2. Create Counter row for GYM0001 codes
      const { error: counterError } = await supabase
        .from('counters')
        .insert({
          gym_id: gymData.id,
          member_count: 0,
          invoice_count: 0,
        });

      if (counterError) throw counterError;

      // 3. Create Subscription row
      const { error: subError } = await supabase
        .from('subscriptions')
        .insert({
          gym_id: gymData.id,
          tier: 'free',
          max_members: 50,
          is_active: true,
        });

      if (subError) throw subError;

      // 3b. Assign Free platform plan
      // First, find the Free platform plan
      const { data: freePlan } = await supabase
        .from('platform_plans')
        .select('id')
        .eq('slug', 'free')
        .single();
      
      if (freePlan) {
        const trialEnd = new Date();
        trialEnd.setDate(trialEnd.getDate() + 14); // 14-day Pro trial
        
        // Find the Pro plan for the trial
        const { data: proPlan } = await supabase
          .from('platform_plans')
          .select('id')
          .eq('slug', 'pro')
          .single();
        
        await supabase.from('platform_subscriptions').insert({
          gym_id: gymData.id,
          plan_id: proPlan?.id || freePlan.id, // Start with Pro trial, fallback to Free
          status: proPlan ? 'trialing' : 'active',
          billing_cycle: 'monthly',
          current_period_start: new Date().toISOString(),
          current_period_end: trialEnd.toISOString(),
          trial_end: proPlan ? trialEnd.toISOString() : null,
        });
      }

      // 4. Create User profile row (Owner)
      const { error: userError } = await supabase
        .from('users')
        .insert({
          auth_id: user.id,
          gym_id: gymData.id,
          branch_id: branchData?.id || null,
          name: user.user_metadata?.full_name || email.split('@')[0] || 'Gym Owner',
          email: email,
          role: 'owner',
          permissions: ['*'], // Owner gets wildcard bypass
          is_active: true,
        });

      if (userError) throw userError;

      toast.success('Workspace created! You have a 14-day Pro trial. 🎉');
      router.push('/dashboard');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'An unknown error occurred';
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  if (checking) {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-zinc-950 text-zinc-50">
        <Loader2 className="h-8 w-8 animate-spin text-purple-600" />
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-zinc-950 text-zinc-50 items-center justify-center p-6 relative">
      <div className="absolute top-1/4 left-1/4 w-[400px] h-[400px] bg-purple-700/5 rounded-full blur-[100px] pointer-events-none" />
      
      <div className="w-full max-w-lg relative z-10">
        <div className="flex items-center gap-2 mb-8 justify-center">
          <div className="bg-purple-600 p-1.5 rounded-lg flex items-center justify-center">
            <Dumbbell className="h-5 w-5 text-white rotate-45" />
          </div>
          <span className="text-lg font-bold tracking-tight bg-gradient-to-r from-white to-purple-400 bg-clip-text text-transparent">
            GymERP
          </span>
        </div>

        <Card className="border-zinc-800 bg-zinc-900/40 backdrop-blur-md">
          <CardHeader className="space-y-1">
            <CardTitle className="text-2xl font-bold tracking-tight text-center">
              Configure Your Gym Workspace
            </CardTitle>
            <CardDescription className="text-zinc-400 text-center">
              Let's set up your branch profile and billing details to get started.
            </CardDescription>
          </CardHeader>
          <form onSubmit={handleSubmit}>
            <CardContent className="grid gap-4">
              <div className="grid gap-2">
                <Label htmlFor="gymName" className="text-zinc-300 text-sm">Gym Name *</Label>
                <Input
                  id="gymName"
                  type="text"
                  placeholder="e.g. Iron Fitness Studio"
                  required
                  disabled={loading}
                  value={gymName}
                  onChange={(e) => setGymName(e.target.value)}
                  className="border-zinc-800 bg-zinc-950 text-zinc-100 placeholder:text-zinc-700 focus:border-purple-600 focus:ring-purple-600"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="phone" className="text-zinc-300 text-sm">Mobile Number</Label>
                  <Input
                    id="phone"
                    type="tel"
                    placeholder="98765 43210"
                    disabled={loading}
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="border-zinc-800 bg-zinc-950 text-zinc-100 placeholder:text-zinc-700 focus:border-purple-600"
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="email" className="text-zinc-300 text-sm">Gym Email Address</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="gym@domain.com"
                    disabled={loading}
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="border-zinc-800 bg-zinc-950 text-zinc-100 placeholder:text-zinc-700 focus:border-purple-600"
                  />
                </div>
              </div>

              <div className="grid gap-2">
                <Label htmlFor="tagline" className="text-zinc-300 text-sm">Tagline / Motto</Label>
                <Input
                  id="tagline"
                  type="text"
                  placeholder="e.g. Consistency is Key"
                  disabled={loading}
                  value={tagline}
                  onChange={(e) => setTagline(e.target.value)}
                  className="border-zinc-800 bg-zinc-950 text-zinc-100 placeholder:text-zinc-700 focus:border-purple-600"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="city" className="text-zinc-300 text-sm">City</Label>
                  <Input
                    id="city"
                    type="text"
                    placeholder="e.g. Mumbai"
                    disabled={loading}
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    className="border-zinc-800 bg-zinc-950 text-zinc-100 placeholder:text-zinc-700 focus:border-purple-600"
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="state" className="text-zinc-300 text-sm">State</Label>
                  <Input
                    id="state"
                    type="text"
                    placeholder="e.g. Maharashtra"
                    disabled={loading}
                    value={state}
                    onChange={(e) => setState(e.target.value)}
                    className="border-zinc-800 bg-zinc-950 text-zinc-100 placeholder:text-zinc-700 focus:border-purple-600"
                  />
                </div>
              </div>
            </CardContent>
            <CardFooter>
              <Button
                type="submit"
                disabled={loading}
                className="w-full h-11 bg-purple-600 hover:bg-purple-700 text-white font-medium shadow-lg shadow-purple-600/20 transition-all flex items-center justify-center gap-2"
              >
                {loading ? (
                  <Loader2 className="h-4 w-4 animate-spin text-white" />
                ) : (
                  <>
                    Initialize My Gym <ArrowRight className="h-4 w-4" />
                  </>
                )}
              </Button>
            </CardFooter>
          </form>
        </Card>
      </div>
    </div>
  );
}
