'use client';

import React, { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import {
  Building2,
  User,
  CreditCard,
  BarChart,
  FileText,
  ArrowLeft,
  Loader2,
  RefreshCw,
  PowerOff,
  CalendarPlus
} from 'lucide-react';
import { SpotlightCard } from '@/components/magicui/spotlight-card';
import { GlowingBadge } from '@/components/magicui/glowing-badge';
import { NumberTicker } from '@/components/magicui/number-ticker';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { formatDate } from '@/lib/utils/format';
import Link from 'next/link';
import { toast } from 'sonner';

export default function GymDetailClient({ id }: { id: string }) {
  const supabase = createClient();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<any>(null);

  const fetchGymDetail = async () => {
    try {
      setLoading(true);
      // Fetch gym details
      const { data: gymData, error: gymError } = await supabase
        .from('gyms')
        .select('*')
        .eq('id', id)
        .single();
      
      if (gymError) throw gymError;

      // Fetch owner details
      const { data: ownerData } = await supabase
        .from('users')
        .select('*')
        .eq('gym_id', id)
        .eq('role', 'owner')
        .single();

      // Fetch subscription details
      const { data: subData } = await supabase
        .from('platform_subscriptions')
        .select('*, platform_plans(*)')
        .eq('gym_id', id)
        .single();

      // In a real app we'd fetch invoices from a separate table. Mucking here for layout purposes.
      const mockInvoices = [
        { id: 'inv_1', date: '2023-10-01', amount: 4999, status: 'paid' },
        { id: 'inv_2', date: '2023-09-01', amount: 4999, status: 'paid' },
      ];

      setData({
        gym: gymData,
        owner: ownerData || {},
        subscription: subData || { platform_plans: {} },
        invoices: mockInvoices,
        usage: {
          members: 120,
          membersLimit: subData?.platform_plans?.max_members || 500,
          staff: 3,
          staffLimit: subData?.platform_plans?.max_staff || 10,
        }
      });
    } catch (error: any) {
      toast.error('Failed to load gym details');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchGymDetail();
  }, [id]);

  if (loading) {
    return (
      <div className="flex justify-center items-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-amber-600" />
      </div>
    );
  }

  if (!data) return <div className="text-zinc-500">Gym not found</div>;

  const { gym, owner, subscription, invoices, usage } = data;
  const plan = subscription?.platform_plans || {};

  return (
    <div className="space-y-6 pb-10">
      {/* Header */}
      <div className="flex items-center gap-4 border-b border-zinc-800 pb-4">
        <Link href="/superadmin/gyms" passHref legacyBehavior>
          <Button variant="ghost" size="icon" className="text-zinc-400 hover:text-white">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-zinc-100">{gym?.name}</h2>
          <p className="text-zinc-500 text-xs mt-1">Detailed overview and platform management.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {/* 1. Gym Profile Card */}
        <SpotlightCard className="p-5 border-zinc-800 bg-zinc-900/40">
          <div className="flex items-center gap-2 mb-4 text-zinc-300">
            <Building2 className="h-5 w-5 text-amber-500" />
            <h3 className="font-semibold text-sm">Gym Profile</h3>
          </div>
          <div className="space-y-3 text-xs">
            <div className="flex justify-between border-b border-zinc-800 pb-2">
              <span className="text-zinc-500">Name</span>
              <span className="font-medium text-zinc-200">{gym?.name}</span>
            </div>
            <div className="flex justify-between border-b border-zinc-800 pb-2">
              <span className="text-zinc-500">Email</span>
              <span className="font-medium text-zinc-200">{gym?.email || '-'}</span>
            </div>
            <div className="flex justify-between border-b border-zinc-800 pb-2">
              <span className="text-zinc-500">Phone</span>
              <span className="font-medium text-zinc-200">{gym?.phone || '-'}</span>
            </div>
            <div className="flex justify-between border-b border-zinc-800 pb-2">
              <span className="text-zinc-500">GSTIN</span>
              <span className="font-medium text-zinc-200">{gym?.gstin || '-'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-zinc-500">Address</span>
              <span className="font-medium text-zinc-200 text-right max-w-[150px] truncate">{gym?.address || '-'}</span>
            </div>
          </div>
        </SpotlightCard>

        {/* 2. Owner Info Card */}
        <SpotlightCard className="p-5 border-zinc-800 bg-zinc-900/40">
          <div className="flex items-center gap-2 mb-4 text-zinc-300">
            <User className="h-5 w-5 text-blue-500" />
            <h3 className="font-semibold text-sm">Owner Details</h3>
          </div>
          <div className="space-y-3 text-xs">
            <div className="flex justify-between border-b border-zinc-800 pb-2">
              <span className="text-zinc-500">Name</span>
              <span className="font-medium text-zinc-200">{owner?.name || '-'}</span>
            </div>
            <div className="flex justify-between border-b border-zinc-800 pb-2">
              <span className="text-zinc-500">Email</span>
              <span className="font-medium text-zinc-200">{owner?.email || '-'}</span>
            </div>
            <div className="flex justify-between border-b border-zinc-800 pb-2">
              <span className="text-zinc-500">Phone</span>
              <span className="font-medium text-zinc-200">{owner?.phone || '-'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-zinc-500">Last Login</span>
              <span className="font-medium text-zinc-200">{owner?.last_sign_in_at ? formatDate(owner.last_sign_in_at) : '-'}</span>
            </div>
          </div>
        </SpotlightCard>

        {/* 3. Subscription Card */}
        <SpotlightCard className="p-5 border-zinc-800 bg-zinc-900/40">
          <div className="flex items-center gap-2 mb-4 text-zinc-300">
            <CreditCard className="h-5 w-5 text-green-500" />
            <h3 className="font-semibold text-sm">Subscription</h3>
          </div>
          <div className="space-y-3 text-xs">
            <div className="flex justify-between border-b border-zinc-800 pb-2 items-center">
              <span className="text-zinc-500">Status</span>
              <GlowingBadge variant={subscription?.status as any} pulse={subscription?.status === 'active'}>
                {subscription?.status || 'Unknown'}
              </GlowingBadge>
            </div>
            <div className="flex justify-between border-b border-zinc-800 pb-2">
              <span className="text-zinc-500">Current Plan</span>
              <span className="font-medium text-zinc-200">{plan?.name || '-'}</span>
            </div>
            <div className="flex justify-between border-b border-zinc-800 pb-2">
              <span className="text-zinc-500">Billing Cycle</span>
              <span className="font-medium text-zinc-200 uppercase">{subscription?.billing_cycle || '-'}</span>
            </div>
            <div className="flex justify-between border-b border-zinc-800 pb-2">
              <span className="text-zinc-500">Period Ends</span>
              <span className="font-medium text-zinc-200">{subscription?.current_period_end ? formatDate(subscription.current_period_end) : '-'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-zinc-500">Razorpay ID</span>
              <span className="font-medium text-zinc-200">{subscription?.razorpay_subscription_id || '-'}</span>
            </div>
          </div>
        </SpotlightCard>

        {/* 4. Usage Stats Card */}
        <SpotlightCard className="p-5 border-zinc-800 bg-zinc-900/40 md:col-span-2 lg:col-span-3">
          <div className="flex items-center gap-2 mb-4 text-zinc-300">
            <BarChart className="h-5 w-5 text-purple-500" />
            <h3 className="font-semibold text-sm">Usage vs Limits</h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="space-y-2">
              <div className="flex justify-between text-xs">
                <span className="text-zinc-400">Members</span>
                <span className="text-zinc-200 font-medium">{usage.members} / {usage.membersLimit}</span>
              </div>
              <Progress value={(usage.members / usage.membersLimit) * 100} className="h-2 bg-zinc-800 [&>div]:bg-purple-500" />
            </div>
            <div className="space-y-2">
              <div className="flex justify-between text-xs">
                <span className="text-zinc-400">Staff Members</span>
                <span className="text-zinc-200 font-medium">{usage.staff} / {usage.staffLimit}</span>
              </div>
              <Progress value={(usage.staff / usage.staffLimit) * 100} className="h-2 bg-zinc-800 [&>div]:bg-blue-500" />
            </div>
          </div>
        </SpotlightCard>
      </div>

      {/* 5. Actions Card */}
      <SpotlightCard className="p-5 border-zinc-800 bg-zinc-900/40">
        <h3 className="font-semibold text-sm mb-4 text-zinc-100">Administrative Actions</h3>
        <div className="flex flex-wrap gap-4">
          <Button variant="outline" className="border-zinc-700 bg-zinc-800 hover:bg-zinc-700 hover:text-white text-zinc-300 text-xs h-9">
            <CreditCard className="mr-2 h-4 w-4" /> Change Plan
          </Button>
          <Button variant="outline" className="border-zinc-700 bg-zinc-800 hover:bg-zinc-700 hover:text-white text-zinc-300 text-xs h-9">
            <CalendarPlus className="mr-2 h-4 w-4" /> Extend Trial
          </Button>
          <Button variant="destructive" className="bg-red-500/10 text-red-500 hover:bg-red-500/20 border border-red-500/20 text-xs h-9">
            <PowerOff className="mr-2 h-4 w-4" /> Suspend Gym
          </Button>
        </div>
      </SpotlightCard>

      {/* 6. Invoices Table */}
      <SpotlightCard className="border-zinc-800 bg-zinc-900/40 overflow-hidden">
        <div className="p-4 border-b border-zinc-800 flex items-center gap-2 text-zinc-300">
          <FileText className="h-5 w-5 text-emerald-500" />
          <h3 className="font-semibold text-sm">Recent Platform Invoices</h3>
        </div>
        <Table>
          <TableHeader className="bg-zinc-900/60">
            <TableRow className="border-zinc-800">
              <TableHead className="text-zinc-400 text-xs">Invoice ID</TableHead>
              <TableHead className="text-zinc-400 text-xs">Date</TableHead>
              <TableHead className="text-zinc-400 text-xs">Amount</TableHead>
              <TableHead className="text-zinc-400 text-xs">Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {invoices.map((inv: any) => (
              <TableRow key={inv.id} className="border-zinc-800/40">
                <TableCell className="font-medium text-zinc-300 text-xs">{inv.id}</TableCell>
                <TableCell className="text-zinc-400 text-xs">{formatDate(inv.date)}</TableCell>
                <TableCell className="text-zinc-300 text-xs">₹{(inv.amount / 100).toFixed(2)}</TableCell>
                <TableCell>
                  <span className={`px-2 py-0.5 rounded text-[10px] font-semibold border ${
                    inv.status === 'paid' ? 'bg-green-500/10 text-green-400 border-green-500/20' : 'bg-red-500/10 text-red-400 border-red-500/20'
                  }`}>
                    {inv.status}
                  </span>
                </TableCell>
              </TableRow>
            ))}
            {invoices.length === 0 && (
              <TableRow>
                <TableCell colSpan={4} className="text-center py-6 text-zinc-500 text-xs">No invoices found.</TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </SpotlightCard>
    </div>
  );
}
