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
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
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
          <h1 className="text-2xl font-bold tracking-tight text-foreground">
            Welcome back, {user?.name || 'Admin'}
          </h1>
          <p className="text-xs text-muted-foreground mt-1">
            Operational snapshot for {gym?.name || 'your gym'} today.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {!isTrainer && (
            <Button 
              size="sm"
              className="bg-primary hover:bg-primary/90 text-primary-foreground font-medium text-xs gap-1.5 shadow-xs active:scale-[0.97] transition-[transform,background-color] duration-150 ease-out"
              onClick={() => setQuickAddOpen(true)}
            >
              <Zap className="h-3.5 w-3.5" />
              Quick Add
            </Button>
          )}
          {!isTrainer && (
            <Link href="/dashboard/members/add">
              <Button variant="outline" size="sm" className="text-xs border-border/80 hover:bg-muted/50 gap-1.5 active:scale-[0.97] transition-[transform,background-color] duration-150 ease-out">
                <UserPlus className="h-3.5 w-3.5" />
                Add Member
              </Button>
            </Link>
          )}
          {isTrainer && (
            <Link href="/dashboard/exercise">
              <Button size="sm" className="bg-primary hover:bg-primary/90 text-primary-foreground font-medium text-xs gap-1.5 active:scale-[0.97] transition-[transform,background-color] duration-150 ease-out">
                <Dumbbell className="h-3.5 w-3.5" />
                Workout Plans
              </Button>
            </Link>
          )}
          {isTrainer && (
            <Link href="/dashboard/diet">
              <Button variant="outline" size="sm" className="text-xs border-border/80 hover:bg-muted/50 gap-1.5 active:scale-[0.97] transition-[transform,background-color] duration-150 ease-out">
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

      {/* Today's Operational Snapshot Bar */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="rounded-xl bg-card/70 border border-border/70 p-3.5 flex items-center justify-between shadow-2xs">
          <div>
            <p className="text-[11px] font-mono uppercase tracking-wider text-muted-foreground font-medium">
              {isTrainer ? 'Active Routines' : "Today's Collections"}
            </p>
            <p className="text-xl font-bold font-mono tracking-tight text-foreground tabular-nums mt-0.5">
              {isTrainer ? stats.exercisePlans : formatCurrency(todayStats.revenue)}
            </p>
          </div>
          <div className="h-8 w-8 rounded-lg bg-emerald-500/10 text-emerald-400 flex items-center justify-center">
            {isTrainer ? <Dumbbell className="h-4 w-4" /> : <IndianRupee className="h-4 w-4" />}
          </div>
        </div>
        <div className="rounded-xl bg-card/70 border border-border/70 p-3.5 flex items-center justify-between shadow-2xs">
          <div>
            <p className="text-[11px] font-mono uppercase tracking-wider text-muted-foreground font-medium">
              Check-ins Today
            </p>
            <p className="text-xl font-bold font-mono tracking-tight text-foreground tabular-nums mt-0.5">
              {todayStats.checkins}
            </p>
          </div>
          <div className="h-8 w-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
            <CalendarCheck className="h-4 w-4" />
          </div>
        </div>
        <div className="rounded-xl bg-card/70 border border-border/70 p-3.5 flex items-center justify-between shadow-2xs">
          <div>
            <p className="text-[11px] font-mono uppercase tracking-wider text-muted-foreground font-medium">
              New Members Today
            </p>
            <p className="text-xl font-bold font-mono tracking-tight text-foreground tabular-nums mt-0.5">
              {todayStats.newMembers}
            </p>
          </div>
          <div className="h-8 w-8 rounded-lg bg-blue-500/10 text-blue-400 flex items-center justify-center">
            <UserPlus className="h-4 w-4" />
          </div>
        </div>
      </div>

      {/* Primary KPI Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="border-border/70 bg-card/70 backdrop-blur-xs">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-[11px] font-mono font-semibold uppercase tracking-wider text-muted-foreground">
              {isTrainer ? 'Active Trainees' : 'Active Members'}
            </CardTitle>
            <Users className="h-4 w-4 text-muted-foreground/70" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl sm:text-3xl font-mono font-bold tracking-tight text-foreground tabular-nums">
              {stats.activeMembers}
            </div>
            <p className="text-[11px] text-muted-foreground mt-1">Currently enrolled profiles</p>
          </CardContent>
        </Card>

        {isTrainer ? (
          <Link href="/dashboard/exercise" className="block group">
            <Card className="border-border/70 bg-card/70 backdrop-blur-xs group-hover:border-border transition-colors">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-[11px] font-mono font-semibold uppercase tracking-wider text-muted-foreground">
                  Workout Routines
                </CardTitle>
                <Dumbbell className="h-4 w-4 text-muted-foreground/70 group-hover:text-primary transition-colors" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl sm:text-3xl font-mono font-bold tracking-tight text-foreground tabular-nums">
                  {stats.exercisePlans}
                </div>
                <p className="text-[11px] text-muted-foreground mt-1">Active exercise routines</p>
              </CardContent>
            </Card>
          </Link>
        ) : isOwner ? (
          <Card className="border-border/70 bg-card/70 backdrop-blur-xs">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-[11px] font-mono font-semibold uppercase tracking-wider text-muted-foreground">
                Monthly Revenue
              </CardTitle>
              <IndianRupee className="h-4 w-4 text-emerald-400" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl sm:text-3xl font-mono font-bold tracking-tight text-foreground tabular-nums">
                {formatCurrency(stats.monthlyRevenue)}
              </div>
              <p className="text-[11px] text-muted-foreground mt-1">Invoices issued this month</p>
            </CardContent>
          </Card>
        ) : (
          <Card className="border-border/70 bg-card/70 backdrop-blur-xs">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-[11px] font-mono font-semibold uppercase tracking-wider text-muted-foreground">
                Today's Collections
              </CardTitle>
              <IndianRupee className="h-4 w-4 text-emerald-400" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl sm:text-3xl font-mono font-bold tracking-tight text-foreground tabular-nums">
                {formatCurrency(todayStats.revenue)}
              </div>
              <p className="text-[11px] text-muted-foreground mt-1">Desk payment collections</p>
            </CardContent>
          </Card>
        )}

        {isTrainer ? (
          <Link href="/dashboard/diet" className="block group">
            <Card className="border-border/70 bg-card/70 backdrop-blur-xs group-hover:border-border transition-colors">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-[11px] font-mono font-semibold uppercase tracking-wider text-muted-foreground">
                  Diet Charts
                </CardTitle>
                <Apple className="h-4 w-4 text-muted-foreground/70 group-hover:text-emerald-400 transition-colors" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl sm:text-3xl font-mono font-bold tracking-tight text-foreground tabular-nums">
                  {stats.dietPlans}
                </div>
                <p className="text-[11px] text-muted-foreground mt-1">Nutrition & meal charts</p>
              </CardContent>
            </Card>
          </Link>
        ) : (
          <Link href="/dashboard/due" className="block group">
            <Card className="border-border/70 bg-card/70 backdrop-blur-xs group-hover:border-border transition-colors">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-[11px] font-mono font-semibold uppercase tracking-wider text-muted-foreground">
                  Dues Outstanding
                </CardTitle>
                <CalendarDays className="h-4 w-4 text-muted-foreground/70 group-hover:text-amber-400 transition-colors" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl sm:text-3xl font-mono font-bold tracking-tight text-foreground tabular-nums">
                  {formatCurrency(stats.duesOutstanding)}
                </div>
                <p className="text-[11px] text-muted-foreground mt-1">Pending payments to collect</p>
              </CardContent>
            </Card>
          </Link>
        )}

        <Link href={isTrainer ? "/dashboard/attendance" : "/dashboard/members?filter=expiring"} className="block group">
          <Card className="border-border/70 bg-card/70 backdrop-blur-xs group-hover:border-border transition-colors">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-[11px] font-mono font-semibold uppercase tracking-wider text-muted-foreground">
                {isTrainer ? 'Floor Check-ins' : 'Expiring Soon'}
              </CardTitle>
              <Clock className="h-4 w-4 text-muted-foreground/70 group-hover:text-primary transition-colors" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl sm:text-3xl font-mono font-bold tracking-tight text-foreground tabular-nums">
                {isTrainer ? todayStats.checkins : stats.expiringSoon}
              </div>
              <p className="text-[11px] text-muted-foreground mt-1">
                {isTrainer ? "Today's check-ins" : 'Plans ending in 7 days'}
              </p>
            </CardContent>
          </Card>
        </Link>
      </div>

      {/* Grid: Live Ticker & Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Live Attendance Ticker */}
        <Card className="border-border/70 bg-card/70 backdrop-blur-xs lg:col-span-1 flex flex-col">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Activity className="h-4 w-4 text-primary" />
                <CardTitle className="text-sm font-semibold text-foreground">Live Check-ins</CardTitle>
              </div>
              <span className="flex items-center gap-1 text-[10px] font-mono text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                Live
              </span>
            </div>
            <CardDescription className="text-muted-foreground text-[11px]">Real-time attendance stream</CardDescription>
          </CardHeader>
          <CardContent className="flex-1 overflow-y-auto max-h-[340px] space-y-3">
            {ticker.length === 0 ? (
              <div className="text-center text-muted-foreground text-xs py-12">No attendance logged yet today.</div>
            ) : (
              <div className="divide-y divide-border/60">
                {ticker.map((entry) => (
                  <div key={entry.id} className="flex items-center justify-between py-2.5 first:pt-0 last:pb-0">
                    <div className="flex items-center gap-3">
                      <div className="h-8 w-8 rounded-full bg-muted/70 border border-border/80 flex items-center justify-center text-xs font-mono font-medium text-foreground">
                        {(entry.member_name || 'Member').slice(0, 2).toUpperCase()}
                      </div>
                      <div>
                        <div className="text-xs font-medium text-foreground">{entry.member_name || 'Member'}</div>
                        <div className="text-[10px] text-muted-foreground mt-0.5 flex items-center gap-1.5">
                          <Badge variant="outline" className="text-[10px] font-mono uppercase px-1.5 py-0 border-border/70">
                            {entry.method || 'check-in'}
                          </Badge>
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <span className="text-[11px] font-mono text-muted-foreground">
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
        <Card className="border-border/70 bg-card/70 backdrop-blur-xs lg:col-span-2">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-primary" />
                <CardTitle className="text-sm font-semibold text-foreground">Attendance Velocity</CardTitle>
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
        <h3 className="text-xs font-mono font-semibold uppercase tracking-wider text-muted-foreground">
          Management Shortcuts
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <Link href="/dashboard/members" className="block group">
            <div className="rounded-xl border border-border/70 bg-card/70 hover:border-border hover:bg-card/90 active:scale-[0.98] transition-[border-color,background-color,transform] duration-150 ease-out p-4 flex items-start gap-3.5 h-full">
              <div className="bg-primary/10 p-2 rounded-lg text-primary shrink-0 group-hover:scale-105 transition-transform duration-150 ease-out">
                <Users className="h-4.5 w-4.5" />
              </div>
              <div>
                <div className="flex items-center gap-1">
                  <h4 className="text-xs font-semibold text-foreground">
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
              <div className="rounded-xl border border-border/70 bg-card/70 hover:border-border hover:bg-card/90 active:scale-[0.98] transition-[border-color,background-color,transform] duration-150 ease-out p-4 flex items-start gap-3.5 h-full">
                <div className="bg-primary/10 p-2 rounded-lg text-primary shrink-0 group-hover:scale-105 transition-transform duration-150 ease-out">
                  <Dumbbell className="h-4.5 w-4.5" />
                </div>
                <div>
                  <div className="flex items-center gap-1">
                    <h4 className="text-xs font-semibold text-foreground">Workout Routines</h4>
                    <ArrowUpRight className="h-3 w-3 text-muted-foreground/60 opacity-0 group-hover:opacity-100 transition-opacity" />
                  </div>
                  <p className="text-[11px] text-muted-foreground mt-0.5 leading-relaxed">Assign exercise splits, sets, and reps.</p>
                </div>
              </div>
            </Link>
          ) : (
            <Link href="/dashboard/invoices" className="block group">
              <div className="rounded-xl border border-border/70 bg-card/70 hover:border-border hover:bg-card/90 active:scale-[0.98] transition-[border-color,background-color,transform] duration-150 ease-out p-4 flex items-start gap-3.5 h-full">
                <div className="bg-primary/10 p-2 rounded-lg text-primary shrink-0 group-hover:scale-105 transition-transform duration-150 ease-out">
                  <Receipt className="h-4.5 w-4.5" />
                </div>
                <div>
                  <div className="flex items-center gap-1">
                    <h4 className="text-xs font-semibold text-foreground">Billing & Invoices</h4>
                    <ArrowUpRight className="h-3 w-3 text-muted-foreground/60 opacity-0 group-hover:opacity-100 transition-opacity" />
                  </div>
                  <p className="text-[11px] text-muted-foreground mt-0.5 leading-relaxed">Print receipts, view payment history.</p>
                </div>
              </div>
            </Link>
          )}

          {isTrainer ? (
            <Link href="/dashboard/diet" className="block group">
              <div className="rounded-xl border border-border/70 bg-card/70 hover:border-border hover:bg-card/90 active:scale-[0.98] transition-[border-color,background-color,transform] duration-150 ease-out p-4 flex items-start gap-3.5 h-full">
                <div className="bg-emerald-500/10 p-2 rounded-lg text-emerald-400 shrink-0 group-hover:scale-105 transition-transform duration-150 ease-out">
                  <Apple className="h-4.5 w-4.5" />
                </div>
                <div>
                  <div className="flex items-center gap-1">
                    <h4 className="text-xs font-semibold text-foreground">Diet Charts</h4>
                    <ArrowUpRight className="h-3 w-3 text-muted-foreground/60 opacity-0 group-hover:opacity-100 transition-opacity" />
                  </div>
                  <p className="text-[11px] text-muted-foreground mt-0.5 leading-relaxed">Customize daily macro and meal targets.</p>
                </div>
              </div>
            </Link>
          ) : isReceptionist ? (
            <Link href="/dashboard/due" className="block group">
              <div className="rounded-xl border border-border/70 bg-card/70 hover:border-border hover:bg-card/90 active:scale-[0.98] transition-[border-color,background-color,transform] duration-150 ease-out p-4 flex items-start gap-3.5 h-full">
                <div className="bg-amber-500/10 p-2 rounded-lg text-amber-400 shrink-0 group-hover:scale-105 transition-transform duration-150 ease-out">
                  <IndianRupee className="h-4.5 w-4.5" />
                </div>
                <div>
                  <div className="flex items-center gap-1">
                    <h4 className="text-xs font-semibold text-foreground">Due Collection</h4>
                    <ArrowUpRight className="h-3 w-3 text-muted-foreground/60 opacity-0 group-hover:opacity-100 transition-opacity" />
                  </div>
                  <p className="text-[11px] text-muted-foreground mt-0.5 leading-relaxed">Collect fee dues, record desk receipts.</p>
                </div>
              </div>
            </Link>
          ) : (
            <Link href="/dashboard/analytics" className="block group">
              <div className="rounded-xl border border-border/70 bg-card/70 hover:border-border hover:bg-card/90 active:scale-[0.98] transition-[border-color,background-color,transform] duration-150 ease-out p-4 flex items-start gap-3.5 h-full">
                <div className="bg-primary/10 p-2 rounded-lg text-primary shrink-0 group-hover:scale-105 transition-transform duration-150 ease-out">
                  <TrendingUp className="h-4.5 w-4.5" />
                </div>
                <div>
                  <div className="flex items-center gap-1">
                    <h4 className="text-xs font-semibold text-foreground">Analytics</h4>
                    <ArrowUpRight className="h-3 w-3 text-muted-foreground/60 opacity-0 group-hover:opacity-100 transition-opacity" />
                  </div>
                  <p className="text-[11px] text-muted-foreground mt-0.5 leading-relaxed">Gross sales volume, profit margins, growth.</p>
                </div>
              </div>
            </Link>
          )}

          {isTrainer ? (
            <Link href="/dashboard/attendance" className="block group">
              <div className="rounded-xl border border-border/70 bg-card/70 hover:border-border hover:bg-card/90 active:scale-[0.98] transition-[border-color,background-color,transform] duration-150 ease-out p-4 flex items-start gap-3.5 h-full">
                <div className="bg-primary/10 p-2 rounded-lg text-primary shrink-0 group-hover:scale-105 transition-transform duration-150 ease-out">
                  <CalendarCheck className="h-4.5 w-4.5" />
                </div>
                <div>
                  <div className="flex items-center gap-1">
                    <h4 className="text-xs font-semibold text-foreground">Attendance</h4>
                    <ArrowUpRight className="h-3 w-3 text-muted-foreground/60 opacity-0 group-hover:opacity-100 transition-opacity" />
                  </div>
                  <p className="text-[11px] text-muted-foreground mt-0.5 leading-relaxed">Track daily client gym check-ins.</p>
                </div>
              </div>
            </Link>
          ) : isReceptionist ? (
            <Link href="/dashboard/attendance" className="block group">
              <div className="rounded-xl border border-border/70 bg-card/70 hover:border-border hover:bg-card/90 active:scale-[0.98] transition-[border-color,background-color,transform] duration-150 ease-out p-4 flex items-start gap-3.5 h-full">
                <div className="bg-primary/10 p-2 rounded-lg text-primary shrink-0 group-hover:scale-105 transition-transform duration-150 ease-out">
                  <CalendarCheck className="h-4.5 w-4.5" />
                </div>
                <div>
                  <div className="flex items-center gap-1">
                    <h4 className="text-xs font-semibold text-foreground">Attendance</h4>
                    <ArrowUpRight className="h-3 w-3 text-muted-foreground/60 opacity-0 group-hover:opacity-100 transition-opacity" />
                  </div>
                  <p className="text-[11px] text-muted-foreground mt-0.5 leading-relaxed">Verify member entries and manage kiosks.</p>
                </div>
              </div>
            </Link>
          ) : (
            <Link href="/dashboard/settings" className="block group">
              <div className="rounded-xl border border-border/70 bg-card/70 hover:border-border hover:bg-card/90 active:scale-[0.98] transition-[border-color,background-color,transform] duration-150 ease-out p-4 flex items-start gap-3.5 h-full">
                <div className="bg-primary/10 p-2 rounded-lg text-primary shrink-0 group-hover:scale-105 transition-transform duration-150 ease-out">
                  <FileText className="h-4.5 w-4.5" />
                </div>
                <div>
                  <div className="flex items-center gap-1">
                    <h4 className="text-xs font-semibold text-foreground">Settings</h4>
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
