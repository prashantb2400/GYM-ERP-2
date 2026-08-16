'use client';

import React, { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import {
  Apple,
  Dumbbell,
  Calendar,
  Zap,
  QrCode,
  Flame,
  Award,
  ChevronRight,
  TrendingUp,
  Bell,
  Loader2,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { formatDate, getDaysRemaining, calculateBMI, getBMICategory } from '@/lib/utils/format';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { usePushNotifications } from '@/hooks/usePushNotifications';
import { NumberTicker, SpotlightCard, BorderBeam, GlowCard, BlurInText, GradientText } from '@/components/magicui';

export default function MemberDashboardPage() {
  const supabase = createClient();
  const [loading, setLoading] = useState(true);
  const [member, setMember] = useState<any>(null);
  const { permission, subscribing, subscribeToPush } = usePushNotifications(undefined, member?.id);
  
  // Custom mock weights logs if none entered
  const bmiVal = member?.bmi || 22.4;

  useEffect(() => {
    const fetchMemberData = async () => {
      try {
        setLoading(true);
        const { data: { user: authUser } } = await supabase.auth.getUser();
        if (!authUser) return;

        // Fetch corresponding member record joined with plans, diet, and exercise
        const { data, error } = await supabase
          .from('members')
          .select('*, plans(*), diet_charts(*), exercise_charts(*)')
          .or(`auth_id.eq.${authUser.id},email.eq.${authUser.email}`)
          .single();

        if (data) {
          setMember(data);
        } else {
          // Mock data fallback for standalone layout testing
          setMember({
            name: authUser.user_metadata?.full_name || 'Athletic Pro',
            member_code: 'GYM0099',
            status: 'active',
            plan_start_date: '2026-06-01',
            plan_end_date: '2026-09-01',
            plans: { name: '3 Month Gold Premium Package', duration_days: 90 },
            diet_charts: {
              name: 'Lean Bulk Schedule',
              meals: [
                { meal_name: 'Breakfast', time: '08:00 AM', items: [{ name: 'Oats with milk & scoop of whey', qty: '1 bowl' }] },
                { meal_name: 'Post-Workout', time: '06:30 PM', items: [{ name: 'Whey shake + 2 bananas', qty: '1 serving' }] },
              ]
            },
            exercise_charts: {
              name: 'Push Pull Legs (PPL)',
              days: [
                { day: 'Mon Push', exercises: [{ name: 'Incline Bench Press', sets: 4, reps: '8-12' }] },
                { day: 'Tue Pull', exercises: [{ name: 'Lat Pulldowns', sets: 4, reps: '10-12' }] },
              ]
            },
            bmi: 23.5,
            height_cm: 178,
            weight_kg: 74.5,
            attendance_count: 14,
          });
        }
      } catch (err) {
        console.error('Error fetching member stats:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchMemberData();
  }, []);

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="h-24 bg-zinc-900 animate-pulse rounded-xl" />
        <div className="h-40 bg-zinc-900 animate-pulse rounded-xl" />
        <div className="h-40 bg-zinc-900 animate-pulse rounded-xl" />
      </div>
    );
  }

  const daysLeft = member?.plan_end_date ? getDaysRemaining(member.plan_end_date) : 0;
  const planDaysTotal = member?.plans?.duration_days || 30;
  const progressPercent = Math.max(0, Math.min(100, (daysLeft / planDaysTotal) * 100));

  return (
    <div className="space-y-6">
      
      {/* Profile Overview Card */}
      <SpotlightCard className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-purple-900/60 to-zinc-900 border border-purple-500/25 p-5 shadow-lg shadow-purple-500/5">
        <div className="absolute top-0 right-0 -translate-y-1/3 translate-x-1/3 w-32 h-32 bg-purple-500/10 rounded-full blur-2xl pointer-events-none" />
        
        <div className="flex justify-between items-start">
          <div className="space-y-1">
            <BlurInText text="Active Workout Session" className="text-[10px] text-purple-400 font-extrabold uppercase tracking-widest" />
            <h2 className="text-xl font-black text-zinc-100"><GradientText>Welcome, {member?.name}!</GradientText></h2>
          </div>
          <Badge className="bg-green-500/10 text-green-400 border border-green-500/20 text-[9px] font-bold uppercase rounded px-2 py-0.5">
            Active Member
          </Badge>
        </div>

        {/* Plan Days Left Progress */}
        <div className="mt-6 space-y-2">
          <div className="flex justify-between text-xs font-semibold">
            <span className="text-zinc-400">Plan Validity ({member?.plans?.name || 'Base Plan'})</span>
            <span className="text-purple-400">{daysLeft} days remaining</span>
          </div>
          <Progress value={progressPercent} className="h-2 bg-zinc-800 text-purple-500" />
          <div className="flex justify-between text-[9px] text-zinc-500">
            <span>Started: {member?.plan_start_date ? formatDate(member.plan_start_date) : '-'}</span>
            <span>Ends: {member?.plan_end_date ? formatDate(member.plan_end_date) : '-'}</span>
          </div>
        </div>
      </SpotlightCard>

      {/* PWA Web Push Subscription Banner */}
      {permission !== 'granted' ? (
        <div className="rounded-xl border border-zinc-800 bg-zinc-950 p-4 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 shadow-md">
          <div className="flex gap-3">
            <div className="bg-purple-600/10 p-2.5 rounded-lg h-fit flex items-center justify-center border border-purple-500/10">
              <Bell className="h-5 w-5 text-purple-400 animate-bounce" />
            </div>
            <div className="space-y-0.5">
              <h4 className="text-xs font-bold text-zinc-200">Stay Updated on the Go!</h4>
              <p className="text-[10px] text-zinc-500 leading-normal">Enable push notifications to receive real-time workout triggers, renewal reminders, and diet updates instantly.</p>
            </div>
          </div>
          <Button
            onClick={subscribeToPush}
            disabled={subscribing}
            className="bg-purple-600 hover:bg-purple-700 text-white font-bold text-[10px] h-8 px-4 rounded shadow-sm self-end sm:self-center"
          >
            {subscribing ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : null}
            Enable Alerts
          </Button>
        </div>
      ) : (
        <div className="rounded-xl border border-zinc-900 bg-zinc-900/10 px-4 py-2.5 flex items-center justify-between">
          <span className="text-[10px] text-zinc-500 font-medium">System status settings</span>
          <Badge className="bg-purple-500/10 text-purple-400 border border-purple-500/20 text-[9px] font-bold uppercase rounded px-2 py-0.5 gap-1">
            <Bell className="h-3 w-3 text-purple-400" /> Alerts Enabled
          </Badge>
        </div>
      )}

      {/* QR Code Check-in card */}
      <Card className="border-zinc-900 bg-zinc-900/30 overflow-hidden relative">
        <BorderBeam />
        <CardHeader className="pb-3 border-b border-zinc-900/40">
          <div className="flex items-center gap-2">
            <QrCode className="h-4.5 w-4.5 text-purple-400" />
            <CardTitle className="text-sm font-bold">Self Check-in Pass</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="flex flex-col items-center justify-center p-6 text-center">
          {/* Visual QR Code Generator placeholder */}
          <div className="bg-white p-3.5 rounded-xl shadow-lg border border-zinc-200 flex flex-col items-center justify-center relative">
            <div className="grid grid-cols-5 gap-1.5 w-32 h-32 opacity-85">
              {Array.from({ length: 25 }).map((_, i) => (
                <div
                  key={i}
                  className={`rounded-[2px] ${
                    (i % 2 === 0 && i % 3 === 0) || i === 0 || i === 4 || i === 20 || i === 24 || i % 7 === 0
                      ? 'bg-zinc-950'
                      : 'bg-zinc-100'
                  }`}
                />
              ))}
            </div>
            <div className="absolute bg-white p-1 rounded-md border border-zinc-100">
              <div className="bg-purple-600 h-6 w-6 rounded flex items-center justify-center text-white text-[9px] font-black">
                GE
              </div>
            </div>
          </div>
          
          <span className="text-xs font-bold text-zinc-300 mt-4 tracking-wider uppercase font-mono bg-zinc-950 px-3 py-1 rounded border border-zinc-800">
            {member?.member_code}
          </span>
          <p className="text-[10px] text-zinc-500 mt-2">Hold this QR Code code in front of the reception webcam camera to log attendance.</p>
        </CardContent>
      </Card>

      {/* BMI and Stats Row */}
      <div className="grid grid-cols-2 gap-4">
        <GlowCard className="border-zinc-900 bg-zinc-900/30 p-4 space-y-1">
          <div className="flex items-center gap-1.5 text-zinc-500">
            <Flame className="h-4 w-4 text-purple-400" />
            <span className="text-[10px] font-bold uppercase tracking-wider">Attendance logs</span>
          </div>
          <div className="text-2xl font-black text-zinc-100 mt-1"><NumberTicker value={member?.attendance_count || 0} /></div>
          <span className="text-[9px] text-zinc-500 block leading-none">Days marked this cycle</span>
        </GlowCard>

        <GlowCard className="border-zinc-900 bg-zinc-900/30 p-4 space-y-1">
          <div className="flex items-center gap-1.5 text-zinc-500">
            <TrendingUp className="h-4 w-4 text-purple-400" />
            <span className="text-[10px] font-bold uppercase tracking-wider">BMI Assessment</span>
          </div>
          <div className="text-2xl font-black text-purple-400 mt-1"><NumberTicker value={bmiVal} decimalPlaces={1} /></div>
          <span className="text-[9px] text-zinc-500 block leading-none capitalize">
            {getBMICategory(bmiVal)} ({member?.weight_kg || '70'} kg)
          </span>
        </GlowCard>
      </div>

      {/* Mini Diet Summary */}
      <SpotlightCard>
      <Card className="border-zinc-900 bg-zinc-900/30">
        <CardHeader className="pb-2 flex flex-row justify-between items-center">
          <div className="flex items-center gap-2">
            <Apple className="h-4.5 w-4.5 text-purple-400" />
            <CardTitle className="text-sm font-bold">Nutritional Intake</CardTitle>
          </div>
          <Link href="/member/diet" className="text-[10px] text-purple-400 hover:underline flex items-center font-bold">
            View All <ChevronRight className="h-3 w-3" />
          </Link>
        </CardHeader>
        <CardContent className="pt-2 text-xs">
          {member?.diet_charts?.meals && member.diet_charts.meals.length > 0 ? (
            <div className="space-y-3">
              {member.diet_charts.meals.slice(0, 2).map((meal: any, idx: number) => (
                <div key={idx} className="flex justify-between items-start bg-zinc-950/40 p-2.5 rounded border border-zinc-900">
                  <div>
                    <span className="font-bold text-zinc-200">{meal.meal_name}</span>
                    <ul className="text-[10px] text-zinc-500 list-disc ml-4 mt-1">
                      {meal.items?.slice(0, 2).map((it: any, i: number) => (
                        <li key={i}>{it.name} ({it.qty})</li>
                      ))}
                    </ul>
                  </div>
                  <span className="text-[9px] bg-purple-950/40 text-purple-400 font-bold border border-purple-800/10 px-1.5 py-0.2 rounded font-mono">
                    {meal.time}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <span className="text-zinc-600 italic block py-4 text-center">No diet program assigned.</span>
          )}
        </CardContent>
      </Card>
      </SpotlightCard>

      {/* Mini Workout Summary */}
      <SpotlightCard>
      <Card className="border-zinc-900 bg-zinc-900/30">
        <CardHeader className="pb-2 flex flex-row justify-between items-center">
          <div className="flex items-center gap-2">
            <Dumbbell className="h-4.5 w-4.5 text-purple-400" />
            <CardTitle className="text-sm font-bold">Workout Routines</CardTitle>
          </div>
          <Link href="/member/exercise" className="text-[10px] text-purple-400 hover:underline flex items-center font-bold">
            View All <ChevronRight className="h-3 w-3" />
          </Link>
        </CardHeader>
        <CardContent className="pt-2 text-xs">
          {member?.exercise_charts?.days && member.exercise_charts.days.length > 0 ? (
            <div className="space-y-3">
              {member.exercise_charts.days.slice(0, 2).map((day: any, idx: number) => (
                <div key={idx} className="flex justify-between items-center bg-zinc-950/40 p-2.5 rounded border border-zinc-900">
                  <span className="font-bold text-zinc-200">{day.day}</span>
                  <Badge className="bg-purple-950/40 text-purple-400 border border-purple-800/10 text-[9px]">
                    {day.exercises?.length || 0} Exercises
                  </Badge>
                </div>
              ))}
            </div>
          ) : (
            <span className="text-zinc-600 italic block py-4 text-center">No workout schedule assigned.</span>
          )}
        </CardContent>
      </Card>
      </SpotlightCard>
    </div>
  );
}
