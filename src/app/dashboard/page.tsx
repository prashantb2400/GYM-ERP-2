'use client';

import React, { useEffect, useState } from 'react';
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
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { formatCurrency, formatDate, formatDateTime } from '@/lib/utils/format';
import Link from 'next/link';
import { toast } from 'sonner';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { NumberTicker } from '@/components/magicui/number-ticker';
import { SpotlightCard } from '@/components/magicui/spotlight-card';
import { BorderBeam } from '@/components/magicui/border-beam';
import { GlowCard } from '@/components/magicui/glow-card';
import { GlowingBadge } from '@/components/magicui/glowing-badge';
import { AnimatedList } from '@/components/magicui/animated-list';
import { GradientText } from '@/components/magicui/gradient-text';
import { GridPattern } from '@/components/magicui/grid-pattern';
import { QuickAddMember } from '@/components/shared/QuickAddMember';

export default function DashboardHome() {
  const supabase = createClient();
  const { user } = useAuth();
  const { gym } = useGym();

  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    activeMembers: 0,
    monthlyRevenue: 0,
    duesOutstanding: 0,
    expiringSoon: 0,
  });
  const [todayStats, setTodayStats] = useState({ revenue: 0, checkins: 0, newMembers: 0 });

  const [ticker, setTicker] = useState<any[]>([]);
  const [chartData, setChartData] = useState<any[]>([]);
  const [quickAddOpen, setQuickAddOpen] = useState(false);
  const [demoSeeded, setDemoSeeded] = useState(false);
  const [seeding, setSeeding] = useState(false);

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
    if (!user?.gymId) return;

    const fetchDashboardData = async () => {
      try {
        setLoading(true);

        // 1. Fetch counts
        const { count: activeCount } = await supabase
          .from('members')
          .select('*', { count: 'exact', head: true })
          .eq('gym_id', user.gymId)
          .eq('status', 'active');

        // 2. Fetch monthly revenue (sum of invoices issued this month)
        const startOfMonth = new Date();
        startOfMonth.setDate(1);
        startOfMonth.setHours(0, 0, 0, 0);

        const { data: invoicesData } = await supabase
          .from('invoices')
          .select('total')
          .eq('gym_id', user.gymId)
          .gte('issued_at', startOfMonth.toISOString());

        const revenueSum = invoicesData?.reduce((acc, curr) => acc + Number(curr.total), 0) || 0;

        // 3. Fetch outstanding dues
        const { data: memberDues } = await supabase
          .from('members')
          .select('total_due')
          .eq('gym_id', user.gymId);
          
        const duesSum = memberDues?.reduce((acc, curr) => acc + Number(curr.total_due), 0) || 0;

        // 4. Fetch expiring soon (next 7 days)
        const endOfWeek = new Date();
        endOfWeek.setDate(endOfWeek.getDate() + 7);
        const { count: expiringCount } = await supabase
          .from('members')
          .select('*', { count: 'exact', head: true })
          .eq('gym_id', user.gymId)
          .eq('status', 'active')
          .lte('plan_end_date', endOfWeek.toISOString().split('T')[0])
          .gte('plan_end_date', new Date().toISOString().split('T')[0]);

        setStats({
          activeMembers: activeCount || 0,
          monthlyRevenue: revenueSum,
          duesOutstanding: duesSum,
          expiringSoon: expiringCount || 0,
        });

        // Today's snapshot
        const todayStart = new Date();
        todayStart.setHours(0, 0, 0, 0);
        const todayISO = todayStart.toISOString();

        // Revenue today
        const { data: todayInvoices } = await supabase
          .from('invoices')
          .select('amount_paid')
          .eq('gym_id', user.gymId)
          .gte('issued_at', todayISO);
        const todayRevenue = todayInvoices?.reduce((a, c) => a + Number(c.amount_paid || 0), 0) || 0;

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
        setLoading(false);
      }
    };

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
  }, [user?.gymId, supabase]);

  if (loading) {
    return (
      <div className="flex h-[50vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-purple-600" />
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-fade-in relative min-h-screen">
      <GridPattern className="absolute inset-0 opacity-20 -z-10" />

      {stats.activeMembers === 0 && !demoSeeded && (
        <div className="mb-6 rounded-xl border border-purple-500/30 bg-purple-950/20 p-4 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="text-2xl">🎯</div>
            <div>
              <p className="font-semibold text-purple-200 text-sm">See GymERP in action</p>
              <p className="text-xs text-zinc-400 mt-0.5">Load sample data — 5 members, plans, invoices & attendance — to explore all features</p>
            </div>
          </div>
          <div className="flex gap-2 shrink-0">
            <Button
              onClick={handleSeedDemo}
              disabled={seeding}
              size="sm"
              className="bg-purple-600 hover:bg-purple-500 text-white"
            >
              {seeding ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : <Sparkles className="h-3 w-3 mr-1" />}
              {seeding ? 'Loading...' : 'Load Demo Data'}
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setDemoSeeded(true)}
              className="text-zinc-500 hover:text-zinc-300"
            >
              Dismiss
            </Button>
          </div>
        </div>
      )}

      {/* Welcome header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <GradientText className="text-3xl font-bold tracking-tight">Welcome Back, {user?.name}!</GradientText>
          <p className="text-zinc-500 text-sm mt-1">Here is a quick summary of what is happening at {gym?.name} today.</p>
        </div>
        <div className="flex gap-2">
          <Button 
            className="bg-purple-600 hover:bg-purple-700 text-white font-medium text-sm gap-2"
            onClick={() => setQuickAddOpen(true)}
          >
            ⚡ Quick Add
          </Button>
          <Link href="/dashboard/invoices" passHref legacyBehavior>
            <Button variant="outline" className="border-zinc-800 hover:bg-zinc-800 text-zinc-300 gap-2">
              <PlusCircle className="h-4 w-4" /> New Invoice
            </Button>
          </Link>
        </div>
      </div>

      {/* Today's Snapshot */}
      <div className="grid grid-cols-3 gap-3 mb-2">
        <div className="rounded-xl bg-zinc-900/60 border border-zinc-800 p-3 flex items-center gap-3">
          <div className="h-8 w-8 rounded-lg bg-green-500/10 flex items-center justify-center">
            <IndianRupee className="h-4 w-4 text-green-400" />
          </div>
          <div>
            <p className="text-xs text-zinc-500">Today's Revenue</p>
            <p className="text-sm font-bold text-zinc-100">₹<NumberTicker value={todayStats.revenue} /></p>
          </div>
        </div>
        <div className="rounded-xl bg-zinc-900/60 border border-zinc-800 p-3 flex items-center gap-3">
          <div className="h-8 w-8 rounded-lg bg-blue-500/10 flex items-center justify-center">
            <CalendarCheck className="h-4 w-4 text-blue-400" />
          </div>
          <div>
            <p className="text-xs text-zinc-500">Check-ins Today</p>
            <p className="text-sm font-bold text-zinc-100"><NumberTicker value={todayStats.checkins} /></p>
          </div>
        </div>
        <div className="rounded-xl bg-zinc-900/60 border border-zinc-800 p-3 flex items-center gap-3">
          <div className="h-8 w-8 rounded-lg bg-purple-500/10 flex items-center justify-center">
            <UserPlus className="h-4 w-4 text-purple-400" />
          </div>
          <div>
            <p className="text-xs text-zinc-500">New Today</p>
            <p className="text-sm font-bold text-zinc-100"><NumberTicker value={todayStats.newMembers} /></p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 animate-stagger">
        <SpotlightCard>
          <Card className="border-zinc-800 bg-zinc-900/40">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-xs font-semibold uppercase tracking-wider text-zinc-500">Active Members</CardTitle>
              <Users className="h-4 w-4 text-purple-400" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                <NumberTicker value={stats.activeMembers} />
              </div>
              <p className="text-xs text-zinc-500 mt-1">Currently active profiles</p>
            </CardContent>
          </Card>
        </SpotlightCard>

        <SpotlightCard>
          <Card className="border-zinc-800 bg-zinc-900/40">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-xs font-semibold uppercase tracking-wider text-zinc-500">Monthly Revenue</CardTitle>
              <IndianRupee className="h-4 w-4 text-purple-400" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                <NumberTicker value={stats.monthlyRevenue} prefix="₹" />
              </div>
              <p className="text-xs text-zinc-500 mt-1">Invoices issued this month</p>
            </CardContent>
          </Card>
        </SpotlightCard>

        <SpotlightCard>
          <Card className="border-zinc-800 bg-zinc-900/40">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-xs font-semibold uppercase tracking-wider text-zinc-500">Dues Outstanding</CardTitle>
              <CalendarDays className="h-4 w-4 text-purple-400" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                <NumberTicker value={stats.duesOutstanding} prefix="₹" />
              </div>
              <p className="text-xs text-zinc-500 mt-1">Pending payments to collect</p>
            </CardContent>
          </Card>
        </SpotlightCard>

        <SpotlightCard>
          <Link href="/dashboard/members?filter=expiring" className="block">
            <Card className="border-zinc-800 bg-zinc-900/40">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-xs font-semibold uppercase tracking-wider text-zinc-500">Expiring Soon</CardTitle>
                <Clock className="h-4 w-4 text-purple-400" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  <NumberTicker value={stats.expiringSoon} />
                </div>
                <p className="text-xs text-zinc-500 mt-1">Plans ending in next 7 days</p>
                <p className="text-xs text-zinc-500 mt-1">Click to view →</p>
              </CardContent>
            </Card>
          </Link>
        </SpotlightCard>
      </div>

      {/* Grid: Live Ticker & Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Live Attendance Ticker */}
        <Card className="border-zinc-800 bg-zinc-900/40 lg:col-span-1 flex flex-col">
          <CardHeader>
            <div className="flex items-center gap-2">
              <Activity className="h-4 w-4 text-purple-400" />
              <CardTitle className="text-lg font-bold">Live Check-ins</CardTitle>
            </div>
            <CardDescription className="text-zinc-500 text-xs">Real-time attendance tracking ticker</CardDescription>
          </CardHeader>
          <CardContent className="flex-1 overflow-y-auto max-h-[350px] space-y-4">
            {ticker.length === 0 ? (
              <div className="text-center text-zinc-600 text-sm py-12">No attendance logged yet today.</div>
            ) : (
              <AnimatedList>
                {ticker.map((entry) => (
                <div key={entry.id} className="flex items-center justify-between border-b border-zinc-800/40 pb-3 last:border-0 last:pb-0">
                  <div className="flex items-center gap-3">
                    <div className="h-9 w-9 rounded-full bg-purple-900/30 flex items-center justify-center text-purple-300 font-bold border border-purple-800/40">
                      {entry.member_name.slice(0,2).toUpperCase()}
                    </div>
                    <div>
                      <div className="text-sm font-semibold text-zinc-200">{entry.member_name}</div>
                      <div className="text-[10px] text-zinc-500 mt-0.5 uppercase flex items-center gap-1.5">
                        <GlowingBadge variant="active" pulse={false}>{entry.method}</GlowingBadge>
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="text-xs font-semibold text-zinc-400">{formatDateTime(entry.check_in_time).split(',')[1]}</span>
                  </div>
                </div>
              ))}
              </AnimatedList>
            )}
          </CardContent>
        </Card>

        {/* Charts */}
        <Card className="border-zinc-800 bg-zinc-900/40 lg:col-span-2">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-purple-400" />
                <CardTitle className="text-lg font-bold">Attendance Velocity</CardTitle>
              </div>
            </div>
            <CardDescription className="text-zinc-500 text-xs">Member check-in frequencies for the last 7 active days</CardDescription>
          </CardHeader>
          <CardContent className="h-[280px] relative">
            <BorderBeam />
            {chartData.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-zinc-500 pb-8">
                <CalendarDays className="h-10 w-10 mb-3 opacity-30" />
                <p className="text-sm font-medium">No check-ins yet this week</p>
                <p className="text-xs mt-1">Members will appear here once they check in</p>
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
                  <XAxis dataKey="name" stroke="#71717a" fontSize={11} tickLine={false} />
                  <YAxis stroke="#71717a" fontSize={11} tickLine={false} />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#18181b', borderColor: '#27272a', borderRadius: '8px' }}
                    labelStyle={{ color: '#a1a1aa', fontWeight: 'bold' }}
                  />
                  <Bar dataKey="count" fill="#9333ea" radius={[4, 4, 0, 0]} maxBarSize={45} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Quick Action Bento Grid */}
      <div className="space-y-4">
        <h3 className="text-lg font-bold text-zinc-200">Management Shortcuts</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 animate-stagger">
          <Link href="/dashboard/members" passHref legacyBehavior>
            <GlowCard className="group flex items-start gap-4" glowColor="purple">
              <div className="bg-purple-600/10 p-2.5 rounded-lg text-purple-400 group-hover:scale-105 transition-transform">
                <Users className="h-5 w-5" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-zinc-100">Member List</h4>
                <p className="text-xs text-zinc-500 mt-1 leading-relaxed">Search profiles, view logs, edit statuses.</p>
              </div>
            </GlowCard>
          </Link>

          <Link href="/dashboard/whatsapp" passHref legacyBehavior>
            <GlowCard className="group flex items-start gap-4" glowColor="purple">
              <div className="bg-purple-600/10 p-2.5 rounded-lg text-purple-400 group-hover:scale-105 transition-transform">
                <MessageCircle className="h-5 w-5" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-zinc-100">WhatsApp</h4>
                <p className="text-xs text-zinc-500 mt-1 leading-relaxed">Submit templates, trigger broadcasts.</p>
              </div>
            </GlowCard>
          </Link>

          <Link href="/dashboard/followups" passHref legacyBehavior>
            <GlowCard className="group flex items-start gap-4" glowColor="purple">
              <div className="bg-purple-600/10 p-2.5 rounded-lg text-purple-400 group-hover:scale-105 transition-transform">
                <Clock className="h-5 w-5" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-zinc-100">CRM Follow-ups</h4>
                <p className="text-xs text-zinc-500 mt-1 leading-relaxed">Clear outstanding due alerts, view tasks.</p>
              </div>
            </GlowCard>
          </Link>

          <Link href="/dashboard/settings" passHref legacyBehavior>
            <GlowCard className="group flex items-start gap-4" glowColor="purple">
              <div className="bg-purple-600/10 p-2.5 rounded-lg text-purple-400 group-hover:scale-105 transition-transform">
                <FileText className="h-5 w-5" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-zinc-100">Settings</h4>
                <p className="text-xs text-zinc-500 mt-1 leading-relaxed">Setup working hours, modify RLS permissions.</p>
              </div>
            </GlowCard>
          </Link>
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
