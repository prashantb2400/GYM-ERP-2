'use client';

import React, { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { SpotlightCard } from '@/components/magicui/spotlight-card';
import { NumberTicker } from '@/components/magicui/number-ticker';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { GradientText } from '@/components/magicui/gradient-text';
import { GridPattern } from '@/components/magicui/grid-pattern';
import { GlowCard } from '@/components/magicui/glow-card';
import { GlowingBadge } from '@/components/magicui/glowing-badge';
import { Loader2, Building2, Repeat, TrendingUp, Receipt, Activity, Users } from 'lucide-react';
import {
  AreaChart, Area, PieChart, Pie, Cell, BarChart, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, Legend, ResponsiveContainer
} from 'recharts';

export default function SuperAdminDashboard() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<any>({
    gymCount: 0,
    activeSubsCount: 0,
    trialSubsCount: 0,
    mrr: 0,
    revenueThisMonth: 0,
    churnRate: 0,
    statusData: [],
    revenueData: [],
    planData: [],
    recentGyms: [],
    recentSubs: [],
    recentAnnouncements: []
  });

  useEffect(() => {
    async function fetchData() {
      const supabase = createClient();
      
      try {
        // 1. Gyms
        const { count: gymCount } = await supabase.from('gyms').select('*', { count: 'exact', head: true });
        
        // 2. Subscriptions
        const { data: subs } = await supabase.from('platform_subscriptions').select(`
          status,
          billing_cycle,
          plan_id,
          canceled_at,
          platform_plans (
            name,
            monthly_price,
            annual_price
          )
        `);

        let activeSubs = 0;
        let trialSubs = 0;
        let mrrAmount = 0;
        let canceledLast30 = 0;
        let activeStartOfPeriod = 0; // Simplified churn calc

        const statusCounts: Record<string, number> = {};
        const planCounts: Record<string, number> = {};

        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

        subs?.forEach(sub => {
          // Status counts
          statusCounts[sub.status] = (statusCounts[sub.status] || 0) + 1;
          
          if (sub.status === 'active') activeSubs++;
          if (sub.status === 'trialing') trialSubs++;
          
          // MRR calculation
          if (sub.status === 'active' && sub.platform_plans) {
            const plan: any = sub.platform_plans;
            if (sub.billing_cycle === 'monthly') {
              mrrAmount += plan.monthly_price;
            } else if (sub.billing_cycle === 'annual') {
              mrrAmount += Math.floor(plan.annual_price / 12);
            }
          }

          // Churn calc (rough estimate)
          if (sub.canceled_at && new Date(sub.canceled_at) >= thirtyDaysAgo) {
            canceledLast30++;
          }
          if (sub.status === 'active' || (sub.canceled_at && new Date(sub.canceled_at) >= thirtyDaysAgo)) {
            activeStartOfPeriod++;
          }

          // Plan distribution
          if (sub.platform_plans) {
            const planName = (sub.platform_plans as any).name;
            planCounts[planName] = (planCounts[planName] || 0) + 1;
          }
        });

        const churnRate = activeStartOfPeriod > 0 ? (canceledLast30 / activeStartOfPeriod) * 100 : 0;

        const statusData = Object.entries(statusCounts).map(([name, value]) => ({ name, value }));
        const planData = Object.entries(planCounts).map(([name, value]) => ({ name, value }));

        // 3. Invoices (Revenue this month)
        const startOfMonth = new Date();
        startOfMonth.setDate(1);
        startOfMonth.setHours(0, 0, 0, 0);

        const { data: invoices } = await supabase
          .from('platform_invoices')
          .select('amount, status, created_at')
          .eq('status', 'paid');
        
        let revenueThisMonth = 0;
        const revenueByMonth: Record<string, number> = {};

        invoices?.forEach(inv => {
          const invDate = new Date(inv.created_at);
          if (invDate >= startOfMonth) {
            revenueThisMonth += inv.amount;
          }
          
          const monthStr = invDate.toLocaleString('default', { month: 'short' });
          revenueByMonth[monthStr] = (revenueByMonth[monthStr] || 0) + inv.amount;
        });

        // Get last 6 months for chart
        const months = [];
        for (let i = 5; i >= 0; i--) {
          const d = new Date();
          d.setMonth(d.getMonth() - i);
          months.push(d.toLocaleString('default', { month: 'short' }));
        }

        const revenueData = months.map(m => ({
          name: m,
          revenue: (revenueByMonth[m] || 0) / 100 // convert to rupees
        }));

        // 4. Recent activity
        const { data: recentGyms } = await supabase.from('gyms').select('name, created_at').order('created_at', { ascending: false }).limit(5);
        const { data: recentSubs } = await supabase.from('platform_subscriptions').select('status, updated_at, gyms(name)').order('updated_at', { ascending: false }).limit(5);
        const { data: recentAnnouncements } = await supabase.from('platform_announcements').select('title, created_at').order('created_at', { ascending: false }).limit(3);

        setData({
          gymCount: gymCount || 0,
          activeSubsCount: activeSubs,
          trialSubsCount: trialSubs,
          mrr: mrrAmount / 100, // paise to rupees
          revenueThisMonth: revenueThisMonth / 100,
          churnRate: churnRate,
          statusData,
          revenueData,
          planData,
          recentGyms: recentGyms || [],
          recentSubs: recentSubs || [],
          recentAnnouncements: recentAnnouncements || []
        });

      } catch (err) {
        console.error("Error fetching dashboard data:", err);
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, []);

  if (loading) {
    return (
      <div className="flex h-[80vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-amber-500" />
      </div>
    );
  }

  const PIE_COLORS = ['#f59e0b', '#10b981', '#ef4444', '#6366f1', '#8b5cf6'];

  return (
    <div className="space-y-8 relative">
      <GridPattern className="absolute inset-0 opacity-10 pointer-events-none -z-10" />
      
      <div className="flex flex-col gap-2">
        <GradientText
          colors="from-amber-400 via-yellow-300 to-orange-400"
          className="text-3xl font-bold tracking-tight inline-block"
        >
          Super Admin Dashboard
        </GradientText>
        <p className="text-zinc-400">Platform overview and key performance metrics.</p>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <SpotlightCard className="bg-zinc-900/50 border-zinc-800" spotlightColor="rgba(245,158,11,0.15)">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-zinc-400">Total Gyms</CardTitle>
            <Building2 className="h-4 w-4 text-amber-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-zinc-100">
              <NumberTicker value={data.gymCount} />
            </div>
          </CardContent>
        </SpotlightCard>

        <SpotlightCard className="bg-zinc-900/50 border-zinc-800" spotlightColor="rgba(245,158,11,0.15)">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-zinc-400">Active Subscriptions</CardTitle>
            <Repeat className="h-4 w-4 text-amber-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-zinc-100">
              <NumberTicker value={data.activeSubsCount} />
            </div>
          </CardContent>
        </SpotlightCard>

        <SpotlightCard className="bg-zinc-900/50 border-zinc-800" spotlightColor="rgba(245,158,11,0.15)">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-zinc-400">MRR</CardTitle>
            <TrendingUp className="h-4 w-4 text-amber-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-zinc-100 flex items-center">
              ₹ <NumberTicker value={data.mrr} decimalPlaces={0} />
            </div>
          </CardContent>
        </SpotlightCard>

        <SpotlightCard className="bg-zinc-900/50 border-zinc-800" spotlightColor="rgba(245,158,11,0.15)">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-zinc-400">Revenue This Month</CardTitle>
            <Receipt className="h-4 w-4 text-amber-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-zinc-100 flex items-center">
              ₹ <NumberTicker value={data.revenueThisMonth} decimalPlaces={0} />
            </div>
          </CardContent>
        </SpotlightCard>

        <SpotlightCard className="bg-zinc-900/50 border-zinc-800" spotlightColor="rgba(245,158,11,0.15)">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-zinc-400">Active Trials</CardTitle>
            <Activity className="h-4 w-4 text-amber-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-zinc-100">
              <NumberTicker value={data.trialSubsCount} />
            </div>
          </CardContent>
        </SpotlightCard>

        <SpotlightCard className="bg-zinc-900/50 border-zinc-800" spotlightColor="rgba(245,158,11,0.15)">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-zinc-400">Churn Rate</CardTitle>
            <Users className="h-4 w-4 text-amber-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-zinc-100 flex items-center">
              <NumberTicker value={data.churnRate} decimalPlaces={1} /> %
            </div>
          </CardContent>
        </SpotlightCard>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <GlowCard className="bg-zinc-900/50 border-zinc-800" glowColor="#fbbf24">
          <CardHeader>
            <CardTitle className="text-zinc-100 text-lg">Revenue Trend (Last 6 Months)</CardTitle>
          </CardHeader>
          <CardContent className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={data.revenueData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.8}/>
                    <stop offset="95%" stopColor="#f59e0b" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <XAxis dataKey="name" stroke="#52525b" />
                <YAxis stroke="#52525b" tickFormatter={(value) => `₹${value}`} />
                <CartesianGrid strokeDasharray="3 3" stroke="#27272a" vertical={false} />
                <RechartsTooltip 
                  contentStyle={{ backgroundColor: '#18181b', borderColor: '#27272a', color: '#f4f4f5' }}
                  itemStyle={{ color: '#f59e0b' }}
                />
                <Area type="monotone" dataKey="revenue" stroke="#f59e0b" fillOpacity={1} fill="url(#colorRevenue)" />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </GlowCard>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <GlowCard className="bg-zinc-900/50 border-zinc-800" glowColor="#10b981">
            <CardHeader>
              <CardTitle className="text-zinc-100 text-lg">Subscription Status</CardTitle>
            </CardHeader>
            <CardContent className="h-56">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={data.statusData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={80}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {data.statusData.map((entry: any, index: number) => (
                      <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                    ))}
                  </Pie>
                  <RechartsTooltip contentStyle={{ backgroundColor: '#18181b', borderColor: '#27272a', color: '#f4f4f5' }} />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </GlowCard>

          <GlowCard className="bg-zinc-900/50 border-zinc-800" glowColor="#6366f1">
            <CardHeader>
              <CardTitle className="text-zinc-100 text-lg">Plan Distribution</CardTitle>
            </CardHeader>
            <CardContent className="h-56">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data.planData}>
                  <XAxis dataKey="name" stroke="#52525b" fontSize={12} />
                  <RechartsTooltip contentStyle={{ backgroundColor: '#18181b', borderColor: '#27272a', color: '#f4f4f5' }} cursor={{fill: '#27272a'}} />
                  <Bar dataKey="value" fill="#6366f1" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </GlowCard>
        </div>
      </div>

      {/* Recent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="bg-zinc-900/50 border-zinc-800">
          <CardHeader>
            <CardTitle className="text-zinc-100 text-lg">Recent Gym Signups</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {data.recentGyms.length > 0 ? data.recentGyms.map((gym: any, i: number) => (
                <div key={i} className="flex justify-between items-center pb-2 border-b border-zinc-800 last:border-0 last:pb-0">
                  <span className="text-zinc-300 text-sm font-medium">{gym.name}</span>
                  <span className="text-xs text-zinc-500">{new Date(gym.created_at).toLocaleDateString()}</span>
                </div>
              )) : (
                <p className="text-sm text-zinc-500">No signups yet</p>
              )}
            </div>
          </CardContent>
        </Card>

        <Card className="bg-zinc-900/50 border-zinc-800">
          <CardHeader>
            <CardTitle className="text-zinc-100 text-lg">Recent Subscriptions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {data.recentSubs.length > 0 ? data.recentSubs.map((sub: any, i: number) => (
                <div key={i} className="flex justify-between items-center pb-2 border-b border-zinc-800 last:border-0 last:pb-0">
                  <span className="text-zinc-300 text-sm font-medium">{sub.gyms?.name || 'Unknown Gym'}</span>
                  <GlowingBadge variant={sub.status === 'active' ? 'active' : sub.status === 'trialing' ? 'pending' : 'expired'} className="scale-75 origin-right">
                    {sub.status}
                  </GlowingBadge>
                </div>
              )) : (
                <p className="text-sm text-zinc-500">No recent subscriptions</p>
              )}
            </div>
          </CardContent>
        </Card>

        <Card className="bg-zinc-900/50 border-zinc-800">
          <CardHeader>
            <CardTitle className="text-zinc-100 text-lg">Recent Announcements</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {data.recentAnnouncements.length > 0 ? data.recentAnnouncements.map((ann: any, i: number) => (
                <div key={i} className="flex justify-between items-center pb-2 border-b border-zinc-800 last:border-0 last:pb-0">
                  <span className="text-zinc-300 text-sm truncate pr-4">{ann.title}</span>
                  <span className="text-xs text-zinc-500 shrink-0">{new Date(ann.created_at).toLocaleDateString()}</span>
                </div>
              )) : (
                <p className="text-sm text-zinc-500">No recent announcements</p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
