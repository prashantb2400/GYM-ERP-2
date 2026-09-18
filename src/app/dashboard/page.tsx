'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useGym } from '@/hooks/useGym';
import {
  Users,
  IndianRupee,
  CalendarDays,
  CalendarCheck,
  Clock,
  UserPlus,
  PlusCircle,
  MessageCircle,
  FileText,
  Loader2,
  TrendingUp,
  Activity,
  Sparkles,
  Dumbbell,
  Apple,
  Receipt,
  Zap,
  ArrowUpRight,
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, DoubleBezelCard } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { formatCurrency, formatDate, formatDateTime } from '@/lib/utils/format';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import { toast } from 'sonner';

const AttendanceOverviewChart = dynamic(
  () => import('@/components/dashboard/AttendanceOverviewChart'),
  {
    ssr: false,
    loading: () => (
      <div className="h-full flex items-center justify-center text-xs text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin text-muted-foreground mr-2" />
        Loading analytics...
      </div>
    ),
  }
);
import { QuickAddMember } from '@/components/shared/QuickAddMember';
import { GymReadinessChecklist } from '@/components/dashboard/GymReadinessChecklist';

export default function DashboardHome() {
  const supabase = createClient();
  const { user } = useAuth();
  const { gym } = useGym();

  const isOwner = user?.role === 'owner';
  const isReceptionist = user?.role === 'receptionist';
  const isTrainer = user?.role === 'trainer';

  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    activeMembers: 0,
    monthlyRevenue: 0,
    duesOutstanding: 0,
    expiringSoon: 0,
    exercisePlans: 0,
    dietPlans: 0,
  });
  const [todayStats, setTodayStats] = useState({ revenue: 0, checkins: 0, newMembers: 0 });

  const [ticker, setTicker] = useState<any[]>([]);
  const [chartData, setChartData] = useState<any[]>([]);
  const [quickAddOpen, setQuickAddOpen] = useState(false);
  const [demoSeeded, setDemoSeeded] = useState(false);
  const [seeding, setSeeding] = useState(false);
  const [planCount, setPlanCount] = useState(0);
  const [staffCount, setStaffCount] = useState(0);
  const [mounted, setMounted] = useState(false);
  const [hasInitiallyLoaded, setHasInitiallyLoaded] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (gym?.settings?.demo_seeded) {
      setDemoSeeded(true);
    }
  }, [gym]);

  const handleSeedDemo = async () => {
    try {
      setSeeding(true);
      const res = await fetch('/api/demo/seed', { method: 'POST' });
      const data = await res.json();
      if (data.success) {
        toast.success(data.message);
        setDemoSeeded(true);
        window.location.reload();
      } else {
        toast.error(data.message || 'Failed to seed demo data');
      }
    } catch (err) {
      toast.error('Failed to seed demo data');
    } finally {
      setSeeding(false);
    }
  };

  useEffect(() => {
    if (!user?.gymId) {
      const timer = setTimeout(() => {
        if (!user?.gymId) setLoading(false);
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [user?.gymId]);

  const fetchDashboardData = useCallback(async () => {
    if (!user?.gymId) return;

    try {
      if (!hasInitiallyLoaded) {
        setLoading(true);
      }

      // 1. Fetch active member count
        const { count: activeCount } = await supabase
          .from('members')
          .select('*', { count: 'exact', head: true })
          .eq('gym_id', user.gymId)
          .eq('status', 'active');

        let revenueSum = 0;
        let duesSum = 0;
        let expiringCount = 0;
        let exerciseCount = 0;
        let dietCount = 0;

        if (isTrainer) {
          // Floor Trainers: Fetch workouts and nutrition plans (NEVER query invoices or financial dues)
          const [{ count: exCount }, { count: dtCount }] = await Promise.all([
            supabase
              .from('exercise_plans')
              .select('*', { count: 'exact', head: true })
              .eq('gym_id', user.gymId),
            supabase
              .from('diet_plans')
              .select('*', { count: 'exact', head: true })
              .eq('gym_id', user.gymId),
          ]);
          exerciseCount = exCount || 0;
          dietCount = dtCount || 0;
        } else {
          // Owner & Receptionist: dues and expiring counts
          const endOfWeek = new Date();
          endOfWeek.setDate(endOfWeek.getDate() + 7);

          const [{ data: memberDues }, { count: expCount }] = await Promise.all([
            supabase.from('members').select('total_due').eq('gym_id', user.gymId),
            supabase
              .from('members')
              .select('*', { count: 'exact', head: true })
              .eq('gym_id', user.gymId)
              .eq('status', 'active')
              .lte('plan_end_date', endOfWeek.toISOString().split('T')[0])
              .gte('plan_end_date', new Date().toISOString().split('T')[0]),
          ]);

          duesSum = memberDues?.reduce((acc, curr) => acc + Number(curr.total_due || 0), 0) || 0;
          expiringCount = expCount || 0;

          if (isOwner) {
            // Only gym owners fetch gross monthly revenue across invoices
            const startOfMonth = new Date();
            startOfMonth.setDate(1);
            startOfMonth.setHours(0, 0, 0, 0);

            const { data: invoicesData } = await supabase
              .from('invoices')
              .select('total')
              .eq('gym_id', user.gymId)
              .gte('issued_at', startOfMonth.toISOString());

            revenueSum = invoicesData?.reduce((acc, curr) => acc + Number(curr.total || 0), 0) || 0;

            const [{ count: pCount }, { count: sCount }] = await Promise.all([
              supabase.from('plans').select('*', { count: 'exact', head: true }).eq('gym_id', user.gymId),
              supabase.from('users').select('*', { count: 'exact', head: true }).eq('gym_id', user.gymId),
            ]);
            setPlanCount(pCount || 0);
            setStaffCount(sCount || 0);
          }
        }

        setStats({
          activeMembers: activeCount || 0,
          monthlyRevenue: revenueSum,
          duesOutstanding: duesSum,
          expiringSoon: expiringCount || 0,
          exercisePlans: exerciseCount,
          dietPlans: dietCount,
        });

        // Today's snapshot
        const todayStart = new Date();
        todayStart.setHours(0, 0, 0, 0);
        const todayISO = todayStart.toISOString();

        let todayRevenue = 0;
        if (!isTrainer) {
          // Revenue today (for front desk reconciliation / owner)
          const { data: todayInvoices } = await supabase
            .from('invoices')
            .select('amount_paid')
            .eq('gym_id', user.gymId)
            .gte('issued_at', todayISO);
          todayRevenue = todayInvoices?.reduce((a, c) => a + Number(c.amount_paid || 0), 0) || 0;
        }

        // Check-ins today
        const today = new Date().toISOString().split('T')[0];
        const { count: todayCheckins } = await supabase
          .from('attendance')
          .select('*', { count: 'exact', head: true })
          .eq('gym_id', user.gymId)
          .eq('date', today);

        // New members today
        const { count: todayNew } = await supabase
          .from('members')
          .select('*', { count: 'exact', head: true })
          .eq('gym_id', user.gymId)
          .gte('admission_date', todayStart.toISOString().split('T')[0]);

        setTodayStats({ revenue: todayRevenue, checkins: todayCheckins || 0, newMembers: todayNew || 0 });

        // 5. Fetch last 5 check-ins for the ticker
        const { data: attendanceData } = await supabase
          .from('attendance')
          .select('*')
          .eq('gym_id', user.gymId)
          .order('check_in_time', { ascending: false })
          .limit(5);

        setTicker(attendanceData || []);

        // 6. Generate mock/real chart data (weekly attendance counts)
        // For rendering demo chart, fetch count grouped by date
        const { data: attendanceHistory } = await supabase
          .from('attendance')
          .select('date')
          .eq('gym_id', user.gymId)
          .order('date', { ascending: false })
          .limit(50);

        const dateCounts: Record<string, number> = {};
        attendanceHistory?.forEach(row => {
          const dateStr = formatDate(row.date);
          dateCounts[dateStr] = (dateCounts[dateStr] || 0) + 1;
        });

        const sortedData = Object.keys(dateCounts)
          .map(key => ({ name: key, count: dateCounts[key] }))
          .reverse()
          .slice(-7); // Last 7 unique days

        // Real data
        setChartData(sortedData);

      } catch (err) {
        console.error('Error fetching dashboard stats:', err);
      } finally {
        setHasInitiallyLoaded(true);
        setLoading(false);
      }
  }, [user?.gymId, isOwner, isReceptionist, isTrainer, hasInitiallyLoaded]);

  useEffect(() => {
    if (!user?.gymId) return;

    fetchDashboardData();

    // 7. Supabase Realtime channel subscription for live check-in ticker updates
    const channel = supabase
      .channel('attendance-ticker')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'attendance',
          filter: `gym_id=eq.${user.gymId}`,
        },
        (payload) => {
          setTicker(prev => [payload.new, ...prev.slice(0, 4)]);
          // Increment check-in count in stats dynamically
          // trigger sound notification or toast
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user?.gymId]);

  if (loading && !hasInitiallyLoaded) {
    return (
      <div className="flex h-[50vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-purple-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {stats.activeMembers === 0 && !demoSeeded && isOwner && (
        <div className="rounded-xl border border-primary/30 bg-primary/5 p-4 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="text-xl">🎯</div>
            <div>
              <p className="font-semibold text-foreground text-xs sm:text-sm">See GymERP in action</p>
              <p className="text-xs text-muted-foreground mt-0.5">Load sample data — 5 members, plans, invoices & attendance — to explore all features</p>
            </div>
          </div>
          <div className="flex gap-2 shrink-0">
            <Button
              onClick={handleSeedDemo}
              disabled={seeding}
              size="sm"
              className="bg-primary hover:bg-primary/90 text-primary-foreground text-xs"
            >
              {seeding ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : <Sparkles className="h-3 w-3 mr-1" />}
              {seeding ? 'Loading...' : 'Load Demo Data'}
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setDemoSeeded(true)}
              className="text-muted-foreground hover:text-foreground text-xs"
            >
              Dismiss
            </Button>
          </div>
        </div>
      )}

      {/* Welcome header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground apple-display">
            Welcome back, {user?.name || 'Admin'}
          </h1>
          <p className="text-xs text-muted-foreground mt-1">
            Operational snapshot for {gym?.name || 'your gym'} today.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2.5">
          {!isTrainer && (
            <Button 
              size="pill-sm"
              className="bg-primary hover:bg-primary/90 text-primary-foreground font-semibold text-xs gap-1.5 shadow-[0_1px_2px_rgba(0,0,0,0.3),inset_0_1px_0_0_rgba(255,255,255,0.2)] active:scale-[0.97] transition-[transform,background-color] duration-120 ease-out cursor-pointer"
              onClick={() => setQuickAddOpen(true)}
            >
              <Zap className="h-3.5 w-3.5" />
              Quick Add
            </Button>
          )}
          {!isTrainer && (
            <Link href="/dashboard/members/add">
              <Button variant="outline" size="pill-sm" className="text-xs border-white/[0.1] bg-card/50 backdrop-blur-md hover:bg-white/[0.08] gap-1.5 active:scale-[0.97] transition-[transform,background-color] duration-120 ease-out cursor-pointer">
                <UserPlus className="h-3.5 w-3.5" />
                Add Member
              </Button>
            </Link>
          )}
          {isTrainer && (
            <Link href="/dashboard/exercise">
              <Button size="pill-sm" className="bg-primary hover:bg-primary/90 text-primary-foreground font-semibold text-xs gap-1.5 shadow-[0_1px_2px_rgba(0,0,0,0.3),inset_0_1px_0_0_rgba(255,255,255,0.2)] active:scale-[0.97] transition-[transform,background-color] duration-120 ease-out">
                <Dumbbell className="h-3.5 w-3.5" />
                Workout Plans
              </Button>
            </Link>
          )}
          {isTrainer && (
            <Link href="/dashboard/diet">
              <Button variant="outline" size="pill-sm" className="text-xs border-white/[0.1] bg-card/50 backdrop-blur-md hover:bg-white/[0.08] gap-1.5 active:scale-[0.97] transition-[transform,background-color] duration-120 ease-out">
                <Apple className="h-3.5 w-3.5" />
                Diet Charts
              </Button>
            </Link>
          )}
        </div>
      </div>

      {/* Pre-Flight Gym Setup Checklist (Visible for Owners when starting up) */}
      {isOwner && stats.activeMembers === 0 && (
        <GymReadinessChecklist
          gym={gym}
          planCount={planCount}
          staffCount={staffCount}
          activeMemberCount={stats.activeMembers}
          onPlansUpdated={fetchDashboardData}
        />
      )}

      {/* Today's Operational Snapshot Bar (Machined Double-Bezel Architecture) */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
        <DoubleBezelCard className="p-1" innerClassName="p-4 bg-card/60 backdrop-blur-md flex items-center justify-between">
          <div>
            <p className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground font-semibold">
              {isTrainer ? 'Active Routines' : "Today's Collections"}
            </p>
            <p className="text-2xl font-bold font-mono tracking-tight text-foreground tabular-nums mt-0.5">
              {isTrainer ? stats.exercisePlans : formatCurrency(todayStats.revenue)}
            </p>
          </div>
          <div className="h-9 w-9 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 flex items-center justify-center shadow-xs">
            {isTrainer ? <Dumbbell className="h-4.5 w-4.5" /> : <IndianRupee className="h-4.5 w-4.5" />}
          </div>
        </DoubleBezelCard>
        <DoubleBezelCard className="p-1" innerClassName="p-4 bg-card/60 backdrop-blur-md flex items-center justify-between">
          <div>
            <p className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground font-semibold">
              Check-ins Today
            </p>
            <p className="text-2xl font-bold font-mono tracking-tight text-foreground tabular-nums mt-0.5">
              {todayStats.checkins}
            </p>
          </div>
          <div className="h-9 w-9 rounded-xl bg-primary/15 border border-primary/30 text-primary flex items-center justify-center shadow-xs">
            <CalendarCheck className="h-4.5 w-4.5" />
          </div>
        </DoubleBezelCard>
        <DoubleBezelCard className="p-1" innerClassName="p-4 bg-card/60 backdrop-blur-md flex items-center justify-between">
          <div>
            <p className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground font-semibold">
              New Members Today
            </p>
            <p className="text-2xl font-bold font-mono tracking-tight text-foreground tabular-nums mt-0.5">
              {todayStats.newMembers}
            </p>
          </div>
          <div className="h-9 w-9 rounded-xl bg-blue-500/15 border border-blue-500/30 text-blue-400 flex items-center justify-center shadow-xs">
            <UserPlus className="h-4.5 w-4.5" />
          </div>
        </DoubleBezelCard>
      </div>

      {/* Primary KPI Metric Cards (Machined Double-Bezel Enclosures) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <DoubleBezelCard className="p-1" innerClassName="p-5 bg-card/60 backdrop-blur-md">
          <div className="flex flex-row items-center justify-between space-y-0 pb-2">
            <span className="text-[10px] font-mono font-semibold uppercase tracking-wider text-muted-foreground">
              {isTrainer ? 'Active Trainees' : 'Active Members'}
            </span>
            <Users className="h-4 w-4 text-muted-foreground/70" />
          </div>
          <div className="pt-1">
            <div className="text-2xl sm:text-3xl font-mono font-bold tracking-tight text-foreground tabular-nums">
              {stats.activeMembers}
            </div>
            <p className="text-[11px] text-muted-foreground mt-1">Currently enrolled profiles</p>
          </div>
        </DoubleBezelCard>

        {isTrainer ? (
          <Link href="/dashboard/exercise" className="block group">
            <DoubleBezelCard className="p-1 group-hover:ring-primary/40" innerClassName="p-5 bg-card/60 backdrop-blur-md group-hover:bg-card/75 transition-all">
              <div className="flex flex-row items-center justify-between space-y-0 pb-2">
                <span className="text-[10px] font-mono font-semibold uppercase tracking-wider text-muted-foreground">
                  Workout Routines
                </span>
                <Dumbbell className="h-4 w-4 text-muted-foreground/70 group-hover:text-primary transition-colors" />
              </div>
              <div className="pt-1">
                <div className="text-2xl sm:text-3xl font-mono font-bold tracking-tight text-foreground tabular-nums">
                  {stats.exercisePlans}
                </div>
                <p className="text-[11px] text-muted-foreground mt-1">Active exercise routines</p>
              </div>
            </DoubleBezelCard>
          </Link>
        ) : isOwner ? (
          <DoubleBezelCard className="p-1" innerClassName="p-5 bg-card/60 backdrop-blur-md">
            <div className="flex flex-row items-center justify-between space-y-0 pb-2">
              <span className="text-[10px] font-mono font-semibold uppercase tracking-wider text-muted-foreground">
                Monthly Revenue
              </span>
              <IndianRupee className="h-4 w-4 text-emerald-400" />
            </div>
            <div className="pt-1">
              <div className="text-2xl sm:text-3xl font-mono font-bold tracking-tight text-foreground tabular-nums">
                {formatCurrency(stats.monthlyRevenue)}
              </div>
              <p className="text-[11px] text-muted-foreground mt-1">Invoices issued this month</p>
            </div>
          </DoubleBezelCard>
        ) : (
          <DoubleBezelCard className="p-1" innerClassName="p-5 bg-card/60 backdrop-blur-md">
            <div className="flex flex-row items-center justify-between space-y-0 pb-2">
              <span className="text-[10px] font-mono font-semibold uppercase tracking-wider text-muted-foreground">
                Today's Collections
              </span>
              <IndianRupee className="h-4 w-4 text-emerald-400" />
            </div>
            <div className="pt-1">
              <div className="text-2xl sm:text-3xl font-mono font-bold tracking-tight text-foreground tabular-nums">
                {formatCurrency(todayStats.revenue)}
              </div>
              <p className="text-[11px] text-muted-foreground mt-1">Desk payment collections</p>
            </div>
          </DoubleBezelCard>
        )}

        {isTrainer ? (
          <Link href="/dashboard/diet" className="block group">
            <DoubleBezelCard className="p-1 group-hover:ring-primary/40" innerClassName="p-5 bg-card/60 backdrop-blur-md group-hover:bg-card/75 transition-all">
              <div className="flex flex-row items-center justify-between space-y-0 pb-2">
                <span className="text-[10px] font-mono font-semibold uppercase tracking-wider text-muted-foreground">
                  Diet Charts
                </span>
                <Apple className="h-4 w-4 text-muted-foreground/70 group-hover:text-emerald-400 transition-colors" />
              </div>
              <div className="pt-1">
                <div className="text-2xl sm:text-3xl font-mono font-bold tracking-tight text-foreground tabular-nums">
                  {stats.dietPlans}
                </div>
                <p className="text-[11px] text-muted-foreground mt-1">Nutrition & meal charts</p>
              </div>
            </DoubleBezelCard>
          </Link>
        ) : (
          <Link href="/dashboard/due" className="block group">
            <DoubleBezelCard className="p-1 group-hover:ring-amber-500/40" innerClassName="p-5 bg-card/60 backdrop-blur-md group-hover:bg-card/75 transition-all">
              <div className="flex flex-row items-center justify-between space-y-0 pb-2">
                <span className="text-[10px] font-mono font-semibold uppercase tracking-wider text-muted-foreground">
                  Dues Outstanding
                </span>
                <CalendarDays className="h-4 w-4 text-muted-foreground/70 group-hover:text-amber-400 transition-colors" />
              </div>
              <div className="pt-1">
                <div className="text-2xl sm:text-3xl font-mono font-bold tracking-tight text-foreground tabular-nums">
                  {formatCurrency(stats.duesOutstanding)}
                </div>
                <p className="text-[11px] text-muted-foreground mt-1">Pending payments to collect</p>
              </div>
            </DoubleBezelCard>
          </Link>
        )}

        <Link href={isTrainer ? "/dashboard/attendance" : "/dashboard/members?filter=expiring"} className="block group">
          <DoubleBezelCard className="p-1 group-hover:ring-primary/40" innerClassName="p-5 bg-card/60 backdrop-blur-md group-hover:bg-card/75 transition-all">
            <div className="flex flex-row items-center justify-between space-y-0 pb-2">
              <span className="text-[10px] font-mono font-semibold uppercase tracking-wider text-muted-foreground">
                {isTrainer ? 'Floor Check-ins' : 'Expiring Soon'}
              </span>
              <Clock className="h-4 w-4 text-muted-foreground/70 group-hover:text-primary transition-colors" />
            </div>
            <div className="pt-1">
              <div className="text-2xl sm:text-3xl font-mono font-bold tracking-tight text-foreground tabular-nums">
                {isTrainer ? todayStats.checkins : stats.expiringSoon}
              </div>
              <p className="text-[11px] text-muted-foreground mt-1">
                {isTrainer ? "Today's check-ins" : 'Plans ending in 7 days'}
              </p>
            </div>
          </DoubleBezelCard>
        </Link>
      </div>

      {/* Grid: Live Ticker & Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Live Attendance Ticker */}
        <Card className="rounded-2xl border border-white/[0.08] bg-card/50 backdrop-blur-md shadow-[0_4px_24px_rgba(0,0,0,0.25),inset_0_1px_0_0_rgba(255,255,255,0.06)] lg:col-span-1 flex flex-col">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Activity className="h-4 w-4 text-primary" />
                <CardTitle className="text-sm font-semibold tracking-tight text-foreground">Live Check-ins</CardTitle>
              </div>
              <span className="flex items-center gap-1.5 text-[10px] font-mono uppercase tracking-wider text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-0.5 rounded-full font-semibold">
                <span className="relative flex h-1.5 w-1.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75 duration-1000" />
                  <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-500" />
                </span>
                Live
              </span>
            </div>
            <CardDescription className="text-muted-foreground text-[11px]">Real-time attendance stream</CardDescription>
          </CardHeader>
          <CardContent className="flex-1 overflow-y-auto max-h-[340px] space-y-1">
            {ticker.length === 0 ? (
              <div className="text-center text-muted-foreground text-xs py-12">No attendance logged yet today.</div>
            ) : (
              <div className="divide-y divide-white/[0.04]">
                {ticker.map((entry) => (
                  <div key={entry.id} className="flex items-center justify-between py-2 px-1 rounded-xl hover:bg-white/[0.03] transition-colors">
                    <div className="flex items-center gap-3">
                      <div className="h-8 w-8 rounded-full bg-white/[0.06] border border-white/[0.1] flex items-center justify-center text-xs font-mono font-medium text-foreground shadow-2xs">
                        {(entry.member_name || 'Member').slice(0, 2).toUpperCase()}
                      </div>
                      <div>
                        <div className="text-xs font-medium text-foreground">{entry.member_name || 'Member'}</div>
                        <div className="text-[10px] text-muted-foreground mt-0.5 flex items-center gap-1.5">
                          <Badge variant="outline" className="text-[9px] font-mono uppercase px-1.5 py-0 border-white/[0.08] bg-white/[0.03] rounded-full">
                            {entry.method || 'check-in'}
                          </Badge>
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <span className="text-[11px] font-mono text-muted-foreground tabular-nums">
                        {entry.check_in_time ? (formatDateTime(entry.check_in_time).split(',')[1] || formatDateTime(entry.check_in_time)) : ''}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Attendance Velocity Chart */}
        <Card className="rounded-2xl border border-white/[0.08] bg-card/50 backdrop-blur-md shadow-[0_4px_24px_rgba(0,0,0,0.25),inset_0_1px_0_0_rgba(255,255,255,0.06)] lg:col-span-2">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-primary" />
                <CardTitle className="text-sm font-semibold tracking-tight text-foreground">Attendance Velocity</CardTitle>
              </div>
            </div>
            <CardDescription className="text-muted-foreground text-[11px]">Member check-in frequencies for the last 7 active days</CardDescription>
          </CardHeader>
          <CardContent className="h-[280px]">
            {!mounted || chartData.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-muted-foreground pb-8">
                <CalendarDays className="h-8 w-8 mb-2 opacity-40" />
                <p className="text-xs font-medium">No check-ins yet this week</p>
                <p className="text-[11px] mt-0.5">Members will appear here once they check in</p>
              </div>
            ) : (
              <AttendanceOverviewChart chartData={chartData} />
            )}
          </CardContent>
        </Card>
      </div>

      {/* Quick Action Bento Grid */}
      <div className="space-y-3">
        <h3 className="text-[10px] font-mono font-semibold uppercase tracking-wider text-muted-foreground">
          Management Shortcuts
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <Link href="/dashboard/members" className="block group">
            <div className="rounded-2xl border border-white/[0.08] bg-card/50 backdrop-blur-md hover:bg-card/75 hover:border-white/[0.14] active:scale-[0.98] shadow-[0_4px_20px_rgba(0,0,0,0.2),inset_0_1px_0_0_rgba(255,255,255,0.06)] transition-[border-color,background-color,transform] duration-150 ease-out p-4 flex items-start gap-3.5 h-full">
              <div className="bg-primary/15 border border-primary/25 p-2 rounded-xl text-primary shrink-0 group-hover:scale-105 transition-transform duration-150 ease-out shadow-xs">
                <Users className="h-4.5 w-4.5" />
              </div>
              <div>
                <div className="flex items-center gap-1">
                  <h4 className="text-xs font-semibold text-foreground tracking-tight">
                    {isTrainer ? 'Trainee List' : 'Member List'}
                  </h4>
                  <ArrowUpRight className="h-3 w-3 text-muted-foreground/60 opacity-0 group-hover:opacity-100 transition-opacity" />
                </div>
                <p className="text-[11px] text-muted-foreground mt-0.5 leading-relaxed">Search profiles, view logs, check details.</p>
              </div>
            </div>
          </Link>

          {isTrainer ? (
            <Link href="/dashboard/exercise" className="block group">
              <div className="rounded-2xl border border-white/[0.08] bg-card/50 backdrop-blur-md hover:bg-card/75 hover:border-white/[0.14] active:scale-[0.98] shadow-[0_4px_20px_rgba(0,0,0,0.2),inset_0_1px_0_0_rgba(255,255,255,0.06)] transition-[border-color,background-color,transform] duration-150 ease-out p-4 flex items-start gap-3.5 h-full">
                <div className="bg-primary/15 border border-primary/25 p-2 rounded-xl text-primary shrink-0 group-hover:scale-105 transition-transform duration-150 ease-out shadow-xs">
                  <Dumbbell className="h-4.5 w-4.5" />
                </div>
                <div>
                  <div className="flex items-center gap-1">
                    <h4 className="text-xs font-semibold text-foreground tracking-tight">Workout Routines</h4>
                    <ArrowUpRight className="h-3 w-3 text-muted-foreground/60 opacity-0 group-hover:opacity-100 transition-opacity" />
                  </div>
                  <p className="text-[11px] text-muted-foreground mt-0.5 leading-relaxed">Assign exercise splits, sets, and reps.</p>
                </div>
              </div>
            </Link>
          ) : (
            <Link href="/dashboard/invoices" className="block group">
              <div className="rounded-2xl border border-white/[0.08] bg-card/50 backdrop-blur-md hover:bg-card/75 hover:border-white/[0.14] active:scale-[0.98] shadow-[0_4px_20px_rgba(0,0,0,0.2),inset_0_1px_0_0_rgba(255,255,255,0.06)] transition-[border-color,background-color,transform] duration-150 ease-out p-4 flex items-start gap-3.5 h-full">
                <div className="bg-primary/15 border border-primary/25 p-2 rounded-xl text-primary shrink-0 group-hover:scale-105 transition-transform duration-150 ease-out shadow-xs">
                  <Receipt className="h-4.5 w-4.5" />
                </div>
                <div>
                  <div className="flex items-center gap-1">
                    <h4 className="text-xs font-semibold text-foreground tracking-tight">Billing & Invoices</h4>
                    <ArrowUpRight className="h-3 w-3 text-muted-foreground/60 opacity-0 group-hover:opacity-100 transition-opacity" />
                  </div>
                  <p className="text-[11px] text-muted-foreground mt-0.5 leading-relaxed">Print receipts, view payment history.</p>
                </div>
              </div>
            </Link>
          )}

          {isTrainer ? (
            <Link href="/dashboard/diet" className="block group">
              <div className="rounded-2xl border border-white/[0.08] bg-card/50 backdrop-blur-md hover:bg-card/75 hover:border-white/[0.14] active:scale-[0.98] shadow-[0_4px_20px_rgba(0,0,0,0.2),inset_0_1px_0_0_rgba(255,255,255,0.06)] transition-[border-color,background-color,transform] duration-150 ease-out p-4 flex items-start gap-3.5 h-full">
                <div className="bg-emerald-500/15 border border-emerald-500/25 p-2 rounded-xl text-emerald-400 shrink-0 group-hover:scale-105 transition-transform duration-150 ease-out shadow-xs">
                  <Apple className="h-4.5 w-4.5" />
                </div>
                <div>
                  <div className="flex items-center gap-1">
                    <h4 className="text-xs font-semibold text-foreground tracking-tight">Diet Charts</h4>
                    <ArrowUpRight className="h-3 w-3 text-muted-foreground/60 opacity-0 group-hover:opacity-100 transition-opacity" />
                  </div>
                  <p className="text-[11px] text-muted-foreground mt-0.5 leading-relaxed">Customize daily macro and meal targets.</p>
                </div>
              </div>
            </Link>
          ) : isReceptionist ? (
            <Link href="/dashboard/due" className="block group">
              <div className="rounded-2xl border border-white/[0.08] bg-card/50 backdrop-blur-md hover:bg-card/75 hover:border-white/[0.14] active:scale-[0.98] shadow-[0_4px_20px_rgba(0,0,0,0.2),inset_0_1px_0_0_rgba(255,255,255,0.06)] transition-[border-color,background-color,transform] duration-150 ease-out p-4 flex items-start gap-3.5 h-full">
                <div className="bg-amber-500/15 border border-amber-500/25 p-2 rounded-xl text-amber-400 shrink-0 group-hover:scale-105 transition-transform duration-150 ease-out shadow-xs">
                  <IndianRupee className="h-4.5 w-4.5" />
                </div>
                <div>
                  <div className="flex items-center gap-1">
                    <h4 className="text-xs font-semibold text-foreground tracking-tight">Due Collection</h4>
                    <ArrowUpRight className="h-3 w-3 text-muted-foreground/60 opacity-0 group-hover:opacity-100 transition-opacity" />
                  </div>
                  <p className="text-[11px] text-muted-foreground mt-0.5 leading-relaxed">Collect fee dues, record desk receipts.</p>
                </div>
              </div>
            </Link>
          ) : (
            <Link href="/dashboard/analytics" className="block group">
              <div className="rounded-2xl border border-white/[0.08] bg-card/50 backdrop-blur-md hover:bg-card/75 hover:border-white/[0.14] active:scale-[0.98] shadow-[0_4px_20px_rgba(0,0,0,0.2),inset_0_1px_0_0_rgba(255,255,255,0.06)] transition-[border-color,background-color,transform] duration-150 ease-out p-4 flex items-start gap-3.5 h-full">
                <div className="bg-primary/15 border border-primary/25 p-2 rounded-xl text-primary shrink-0 group-hover:scale-105 transition-transform duration-150 ease-out shadow-xs">
                  <TrendingUp className="h-4.5 w-4.5" />
                </div>
                <div>
                  <div className="flex items-center gap-1">
                    <h4 className="text-xs font-semibold text-foreground tracking-tight">Analytics</h4>
                    <ArrowUpRight className="h-3 w-3 text-muted-foreground/60 opacity-0 group-hover:opacity-100 transition-opacity" />
                  </div>
                  <p className="text-[11px] text-muted-foreground mt-0.5 leading-relaxed">Gross sales volume, profit margins, growth.</p>
                </div>
              </div>
            </Link>
          )}

          {isTrainer ? (
            <Link href="/dashboard/attendance" className="block group">
              <div className="rounded-2xl border border-white/[0.08] bg-card/50 backdrop-blur-md hover:bg-card/75 hover:border-white/[0.14] active:scale-[0.98] shadow-[0_4px_20px_rgba(0,0,0,0.2),inset_0_1px_0_0_rgba(255,255,255,0.06)] transition-[border-color,background-color,transform] duration-150 ease-out p-4 flex items-start gap-3.5 h-full">
                <div className="bg-primary/15 border border-primary/25 p-2 rounded-xl text-primary shrink-0 group-hover:scale-105 transition-transform duration-150 ease-out shadow-xs">
                  <CalendarCheck className="h-4.5 w-4.5" />
                </div>
                <div>
                  <div className="flex items-center gap-1">
                    <h4 className="text-xs font-semibold text-foreground tracking-tight">Attendance</h4>
                    <ArrowUpRight className="h-3 w-3 text-muted-foreground/60 opacity-0 group-hover:opacity-100 transition-opacity" />
                  </div>
                  <p className="text-[11px] text-muted-foreground mt-0.5 leading-relaxed">Track daily client gym check-ins.</p>
                </div>
              </div>
            </Link>
          ) : isReceptionist ? (
            <Link href="/dashboard/attendance" className="block group">
              <div className="rounded-2xl border border-white/[0.08] bg-card/50 backdrop-blur-md hover:bg-card/75 hover:border-white/[0.14] active:scale-[0.98] shadow-[0_4px_20px_rgba(0,0,0,0.2),inset_0_1px_0_0_rgba(255,255,255,0.06)] transition-[border-color,background-color,transform] duration-150 ease-out p-4 flex items-start gap-3.5 h-full">
                <div className="bg-primary/15 border border-primary/25 p-2 rounded-xl text-primary shrink-0 group-hover:scale-105 transition-transform duration-150 ease-out shadow-xs">
                  <CalendarCheck className="h-4.5 w-4.5" />
                </div>
                <div>
                  <div className="flex items-center gap-1">
                    <h4 className="text-xs font-semibold text-foreground tracking-tight">Attendance</h4>
                    <ArrowUpRight className="h-3 w-3 text-muted-foreground/60 opacity-0 group-hover:opacity-100 transition-opacity" />
                  </div>
                  <p className="text-[11px] text-muted-foreground mt-0.5 leading-relaxed">Verify member entries and manage kiosks.</p>
                </div>
              </div>
            </Link>
          ) : (
            <Link href="/dashboard/settings" className="block group">
              <div className="rounded-2xl border border-white/[0.08] bg-card/50 backdrop-blur-md hover:bg-card/75 hover:border-white/[0.14] active:scale-[0.98] shadow-[0_4px_20px_rgba(0,0,0,0.2),inset_0_1px_0_0_rgba(255,255,255,0.06)] transition-[border-color,background-color,transform] duration-150 ease-out p-4 flex items-start gap-3.5 h-full">
                <div className="bg-primary/15 border border-primary/25 p-2 rounded-xl text-primary shrink-0 group-hover:scale-105 transition-transform duration-150 ease-out shadow-xs">
                  <FileText className="h-4.5 w-4.5" />
                </div>
                <div>
                  <div className="flex items-center gap-1">
                    <h4 className="text-xs font-semibold text-foreground tracking-tight">Settings</h4>
                    <ArrowUpRight className="h-3 w-3 text-muted-foreground/60 opacity-0 group-hover:opacity-100 transition-opacity" />
                  </div>
                  <p className="text-[11px] text-muted-foreground mt-0.5 leading-relaxed">Operating hours, branches & integrations.</p>
                </div>
              </div>
            </Link>
          )}
        </div>
      </div>
      
      <QuickAddMember
        open={quickAddOpen}
        onClose={() => setQuickAddOpen(false)}
        onSuccess={() => {}}
      />
    </div>
  );
}
