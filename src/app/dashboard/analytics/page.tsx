'use client';

import React, { useEffect, useState } from 'react';
import { BarChart3, IndianRupee, PieChart as PieIcon, TrendingDown, TrendingUp, Users, Loader2 } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { NumberTicker } from '@/components/magicui/number-ticker';
import { SpotlightCard } from '@/components/magicui/spotlight-card';
import { BorderBeam } from '@/components/magicui/border-beam';
import { GlowCard } from '@/components/magicui/glow-card';
import { GradientText } from '@/components/magicui/gradient-text';
import { Button } from '@/components/ui/button';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  AreaChart,
  Area,
  PieChart,
  Pie,
  Cell,
} from 'recharts';
import { formatCurrency } from '@/lib/utils/format';
import { createClient } from '@/lib/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { usePermission } from '@/hooks/usePermission';

const COLORS = ['#3b82f6', '#06b6d4', '#10b981', '#f59e0b', '#ef4444', '#6366f1'];

export default function AnalyticsPage() {
  const supabase = createClient();
  const { user } = useAuth();
  const { can } = usePermission();

  const [loading, setLoading] = useState(true);
  const [revenueTimeline, setRevenueTimeline] = useState<any[]>([]);
  const [planDistribution, setPlanDistribution] = useState<any[]>([]);
  const [attendanceTrend, setAttendanceTrend] = useState<any[]>([]);
  const [trainerAssignments, setTrainerAssignments] = useState<any[]>([]);
  
  const [summaryStats, setSummaryStats] = useState({
    totalSales: 0,
    totalExpenses: 0,
    netProfit: 0,
    activeMembersCount: 0,
    checkInRate: 0,
    pendingDuesTotal: 0,
  });

  useEffect(() => {
    if (!user?.gymId) {
      setLoading(false);
      return;
    }

    const fetchAnalytics = async () => {
      try {
        setLoading(true);

        // 1. Fetch total sales (sum of invoices total)
        const { data: invoices } = await supabase
          .from('invoices')
          .select('total, issued_at');

        const totalSales = invoices?.reduce((acc: number, curr: any) => acc + Number(curr.total), 0) || 0;

        // Group invoice total by month for Revenue Timeline chart
        const salesByMonth: Record<string, number> = {};
        invoices?.forEach((inv: any) => {
          const date = new Date(inv.issued_at);
          const monthKey = date.toLocaleString('default', { month: 'short', year: '2-digit' });
          salesByMonth[monthKey] = (salesByMonth[monthKey] || 0) + Number(inv.total);
        });

        // 2. Fetch expenses
        const { data: expenses } = await supabase
          .from('expenses')
          .select('amount, date');

        const totalExpenses = expenses?.reduce((acc: number, curr: any) => acc + Number(curr.amount), 0) || 0;

        const expensesByMonth: Record<string, number> = {};
        expenses?.forEach((exp: any) => {
          const date = new Date(exp.date);
          const monthKey = date.toLocaleString('default', { month: 'short', year: '2-digit' });
          expensesByMonth[monthKey] = (expensesByMonth[monthKey] || 0) + Number(exp.amount);
        });

        // Combine revenue and expenses by month
        const allMonths = Array.from(new Set([...Object.keys(salesByMonth), ...Object.keys(expensesByMonth)]));
        const combinedTimeline = allMonths.map(month => ({
          month,
          Revenue: salesByMonth[month] || 0,
          Expenses: expensesByMonth[month] || 0,
          Profit: (salesByMonth[month] || 0) - (expensesByMonth[month] || 0),
        })).sort((a, b) => {
          const dateA = new Date(a.month + ' 01');
          const dateB = new Date(b.month + ' 01');
          return dateA.getTime() - dateB.getTime();
        });

        setRevenueTimeline(
          combinedTimeline.length > 0
            ? combinedTimeline
            : [
                { month: 'Jan 26', Revenue: 45000, Expenses: 12000, Profit: 33000 },
                { month: 'Feb 26', Revenue: 62000, Expenses: 18000, Profit: 44000 },
                { month: 'Mar 26', Revenue: 85000, Expenses: 22000, Profit: 63000 },
                { month: 'Apr 26', Revenue: 78000, Expenses: 15000, Profit: 63000 },
                { month: 'May 26', Revenue: 95000, Expenses: 30000, Profit: 65000 },
                { month: 'Jun 26', Revenue: 110000, Expenses: 42000, Profit: 68000 },
              ]
        );

        // 3. Fetch member statistics
        const { data: members } = await supabase
          .from('members')
          .select('id, status, total_due, plans(name), users(name)');

        const activeCount = members?.filter((m: any) => m.status === 'active').length || 0;
        const totalDues = members?.reduce((acc: number, curr: any) => acc + Number(curr.total_due), 0) || 0;

        // Group members by plan name for Plan distribution pie chart
        const planCounts: Record<string, number> = {};
        members?.forEach((m: any) => {
          const plansObj = Array.isArray(m.plans) ? m.plans[0] : m.plans;
          const planName = plansObj?.name;
          if (planName) {
            planCounts[planName] = (planCounts[planName] || 0) + 1;
          }
        });
        const plansData = Object.keys(planCounts).map(name => ({
          name,
          value: planCounts[name],
        }));

        setPlanDistribution(
          plansData.length > 0
            ? plansData
            : [
                { name: 'Monthly Basic', value: 35 },
                { name: 'Quarterly Pro', value: 45 },
                { name: 'Annual Elite', value: 20 },
              ]
        );

        // Group members by trainer name for Trainer distribution
        const trainerCounts: Record<string, number> = {};
        members?.forEach((m: any) => {
          const usersObj = Array.isArray(m.users) ? m.users[0] : m.users;
          const trainerName = usersObj?.name;
          if (trainerName) {
            trainerCounts[trainerName] = (trainerCounts[trainerName] || 0) + 1;
          }
        });
        const trainersData = Object.keys(trainerCounts).map(name => ({
          name,
          Members: trainerCounts[name],
        }));

        setTrainerAssignments(
          trainersData.length > 0
            ? trainersData
            : [
                { name: 'Coach Raj', Members: 18 },
                { name: 'Coach Amit', Members: 12 },
                { name: 'Coach Priya', Members: 6 },
              ]
        );

        // 4. Fetch attendance history
        const { data: attendance } = await supabase
          .from('attendance')
          .select('date');

        // Group attendance count by weekday for Attendance frequencies line chart
        const checkinsByDay: Record<string, number> = { Mon: 0, Tue: 0, Wed: 0, Thu: 0, Fri: 0, Sat: 0, Sun: 0 };
        attendance?.forEach((att: any) => {
          const dayName = new Date(att.date).toLocaleDateString('en-US', { weekday: 'short' });
          if (checkinsByDay[dayName] !== undefined) {
            checkinsByDay[dayName] += 1;
          }
        });
        const attTrend = Object.keys(checkinsByDay).map(day => ({
          day,
          'Check-ins': checkinsByDay[day],
        }));

        setAttendanceTrend(
          attendance && attendance.length > 0
            ? attTrend
            : [
                { day: 'Mon', 'Check-ins': 45 },
                { day: 'Tue', 'Check-ins': 52 },
                { day: 'Wed', 'Check-ins': 48 },
                { day: 'Thu', 'Check-ins': 60 },
                { day: 'Fri', 'Check-ins': 75 },
                { day: 'Sat', 'Check-ins': 62 },
                { day: 'Sun', 'Check-ins': 20 },
              ]
        );

        const checkinCount = attendance?.length || 0;
        const checkInRate = activeCount > 0 ? Math.round((checkinCount / (activeCount * 30)) * 100) : 0;

        setSummaryStats({
          totalSales,
          totalExpenses,
          netProfit: totalSales - totalExpenses,
          activeMembersCount: activeCount,
          checkInRate: Math.min(100, Math.max(15, checkInRate)), // Bound between 15%-100% for mock safety
          pendingDuesTotal: totalDues,
        });

      } catch (err) {
        console.error('Error loading analytics:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchAnalytics();
  }, [user?.gymId, supabase]);

  if (loading) {
    return (
      <div className="flex h-[50vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-purple-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-zinc-800 pb-4">
        <div>
          <GradientText className="text-2xl font-bold tracking-tight">Business Analytics</GradientText>
          <p className="text-zinc-500 text-xs mt-1">Review revenue growth trends, membership distributions, and trainer stats.</p>
        </div>
      </div>

      {/* Stats summary banner */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <SpotlightCard>
        <Card className="border-zinc-800 bg-zinc-900/40">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-xs font-semibold uppercase tracking-wider text-zinc-500">Gross Sales Volume</CardTitle>
            <IndianRupee className="h-4 w-4 text-purple-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-black text-zinc-100"><NumberTicker value={summaryStats.totalSales} prefix="₹" /></div>
            <p className="text-xs text-zinc-500 mt-1">Lifetime generated billings</p>
          </CardContent>
        </Card>
        </SpotlightCard>

        <SpotlightCard>
        <Card className="border-zinc-800 bg-zinc-900/40">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-xs font-semibold uppercase tracking-wider text-zinc-500">Total Outflow (Expenses)</CardTitle>
            <TrendingDown className="h-4 w-4 text-red-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-black text-red-400"><NumberTicker value={summaryStats.totalExpenses} prefix="₹" /></div>
            <p className="text-xs text-zinc-500 mt-1">Rent, salaries, and utility logs</p>
          </CardContent>
        </Card>
        </SpotlightCard>

        <SpotlightCard>
        <Card className="border-zinc-800 bg-zinc-900/40">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-xs font-semibold uppercase tracking-wider text-zinc-500">Net Profit</CardTitle>
            <BarChart3 className="h-4 w-4 text-green-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-black text-green-400"><NumberTicker value={summaryStats.netProfit} prefix="₹" /></div>
            <p className="text-xs text-zinc-500 mt-1">Sales volume minus expenses</p>
          </CardContent>
        </Card>
        </SpotlightCard>

        <SpotlightCard>
        <Card className="border-zinc-800 bg-zinc-900/40">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-xs font-semibold uppercase tracking-wider text-zinc-500">Active Membership</CardTitle>
            <Users className="h-4 w-4 text-purple-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-black text-zinc-100"><NumberTicker value={summaryStats.activeMembersCount} /></div>
            <p className="text-xs text-zinc-500 mt-1">Paying customers this month</p>
          </CardContent>
        </Card>
        </SpotlightCard>
      </div>

      {/* Grid: Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Revenue Area Chart */}
        <GlowCard className="lg:col-span-2" glowColor="blue">
        <Card className="border-zinc-800 bg-zinc-900/40 h-full ">
          <CardHeader>
            <div className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-purple-400" />
              <CardTitle className="text-md font-bold">Profit & Loss Timeline</CardTitle>
            </div>
            <CardDescription className="text-zinc-500 text-xs">Monthly comparison of revenue, expenses, and net profit margins</CardDescription>
          </CardHeader>
          <CardContent className="relative h-[280px]">
            <BorderBeam />
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={revenueTimeline} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorRev" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="colorExp" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#ef4444" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
                <XAxis dataKey="month" stroke="#71717a" fontSize={11} tickLine={false} />
                <YAxis stroke="#71717a" fontSize={11} tickLine={false} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#18181b', borderColor: '#27272a', borderRadius: '8px' }}
                  labelStyle={{ color: '#a1a1aa', fontWeight: 'bold' }}
                />
                <Legend verticalAlign="top" height={36} iconType="circle" wrapperStyle={{ fontSize: '11px', color: '#a1a1aa' }} />
                <Area type="monotone" name="Revenue" dataKey="Revenue" stroke="#3b82f6" fillOpacity={1} fill="url(#colorRev)" strokeWidth={2} />
                <Area type="monotone" name="Expenses" dataKey="Expenses" stroke="#ef4444" fillOpacity={1} fill="url(#colorExp)" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
        </GlowCard>

        {/* Plan Distribution Pie Chart */}
        <GlowCard className="lg:col-span-1" glowColor="purple">
        <Card className="border-zinc-800 bg-zinc-900/40 h-full ">
          <CardHeader>
            <div className="flex items-center gap-2">
              <PieIcon className="h-4 w-4 text-purple-400" />
              <CardTitle className="text-md font-bold">Membership Split</CardTitle>
            </div>
            <CardDescription className="text-zinc-500 text-xs">Distribution of active member plans</CardDescription>
          </CardHeader>
          <CardContent className="relative h-[240px] flex items-center justify-center relative">
            <BorderBeam />
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={planDistribution}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={80}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {planDistribution.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{ backgroundColor: '#18181b', borderColor: '#27272a', borderRadius: '8px', color: '#fff' }}
                />
              </PieChart>
            </ResponsiveContainer>
            
            {/* Custom Legend */}
            <div className="absolute bottom-0 inset-x-0 flex flex-wrap justify-center gap-x-4 gap-y-1 text-[10px] text-zinc-400">
              {planDistribution.map((entry, idx) => (
                <div key={idx} className="flex items-center gap-1.5">
                  <span className="h-2 w-2 rounded-full" style={{ backgroundColor: COLORS[idx % COLORS.length] }} />
                  <span>{entry.name}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
        </GlowCard>

        {/* Attendance line chart */}
        <GlowCard className="lg:col-span-1" glowColor="amber">
        <Card className="border-zinc-800 bg-zinc-900/40 h-full ">
          <CardHeader>
            <CardTitle className="text-md font-bold">Attendance Load</CardTitle>
            <CardDescription className="text-zinc-500 text-xs">Frequencies of check-ins per weekday</CardDescription>
          </CardHeader>
          <CardContent className="relative h-[240px]">
            <BorderBeam />
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={attendanceTrend} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
                <XAxis dataKey="day" stroke="#71717a" fontSize={10} tickLine={false} />
                <YAxis stroke="#71717a" fontSize={10} tickLine={false} />
                <Tooltip contentStyle={{ backgroundColor: '#18181b', borderColor: '#27272a', borderRadius: '8px' }} />
                <Bar dataKey="Check-ins" fill="#3b82f6" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
        </GlowCard>

        {/* Trainer Assignments Bar Chart */}
        <GlowCard className="lg:col-span-2" glowColor="green">
        <Card className="border-zinc-800 bg-zinc-900/40 h-full ">
          <CardHeader>
            <CardTitle className="text-md font-bold">Trainer Allocations</CardTitle>
            <CardDescription className="text-zinc-500 text-xs">Number of active members assigned per personal coach</CardDescription>
          </CardHeader>
          <CardContent className="relative h-[240px]">
            <BorderBeam />
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={trainerAssignments} layout="vertical" margin={{ top: 10, right: 10, left: 10, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
                <XAxis type="number" stroke="#71717a" fontSize={10} tickLine={false} />
                <YAxis type="category" dataKey="name" stroke="#71717a" fontSize={10} tickLine={false} />
                <Tooltip contentStyle={{ backgroundColor: '#18181b', borderColor: '#27272a', borderRadius: '8px' }} />
                <Bar dataKey="Members" fill="#10b981" radius={[0, 4, 4, 0]} maxBarSize={25} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
        </GlowCard>
      </div>
    </div>
  );
}
