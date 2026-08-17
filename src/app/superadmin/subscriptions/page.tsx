'use client';

import React, { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import {
  CreditCard,
  Search,
  Eye,
  Edit2,
  XCircle,
  Loader2,
  CalendarPlus,
  RefreshCw,
  PowerOff
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { SpotlightCard } from '@/components/magicui/spotlight-card';
import { GlowingBadge } from '@/components/magicui/glowing-badge';
import { GradientText } from '@/components/magicui/gradient-text';
import { NumberTicker } from '@/components/magicui/number-ticker';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { formatDate } from '@/lib/utils/format';
import Link from 'next/link';
import { toast } from 'sonner';

export default function SuperAdminSubscriptionsPage() {
  const supabase = createClient();
  const [loading, setLoading] = useState(true);
  const [subscriptions, setSubscriptions] = useState<any[]>([]);
  const [mrr, setMrr] = useState(0);
  
  // Filters
  const [statusFilter, setStatusFilter] = useState('all');
  const [planFilter, setPlanFilter] = useState('all');
  
  // Modal states
  const [openStatusModal, setOpenStatusModal] = useState(false);
  const [selectedSub, setSelectedSub] = useState<any>(null);
  const [newStatus, setNewStatus] = useState('');
  const [statusReason, setStatusReason] = useState('');
  const [savingStatus, setSavingStatus] = useState(false);

  const fetchSubscriptions = async () => {
    try {
      setLoading(true);
      
      const query = supabase
        .from('platform_subscriptions')
        .select(`
          *,
          gyms(name),
          platform_plans(name, slug, monthly_price)
        `)
        .order('created_at', { ascending: false });

      const { data, error } = await query;
      if (error) throw error;
      
      let processedData = data || [];
      
      if (statusFilter !== 'all') {
        processedData = processedData.filter(s => s.status === statusFilter);
      }
      
      if (planFilter !== 'all') {
        processedData = processedData.filter(s => s.platform_plans?.slug === planFilter);
      }

      setSubscriptions(processedData);

      // Calculate MRR (Monthly Recurring Revenue)
      // We take active and trialing subscriptions' plan monthly price
      const totalMrr = (data || []).reduce((acc: number, sub: any) => {
        if (sub.status === 'active' || sub.status === 'trialing') {
          return acc + (sub.platform_plans?.monthly_price || 0);
        }
        return acc;
      }, 0);
      
      setMrr(Math.round(totalMrr / 100)); // Convert from paise to rupees

    } catch (err: unknown) {
      toast.error('Failed to load subscriptions');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSubscriptions();
  }, [statusFilter, planFilter]);

  const handleOpenStatusModal = (sub: any) => {
    setSelectedSub(sub);
    setNewStatus(sub.status);
    setStatusReason('');
    setOpenStatusModal(true);
  };

  const handleSaveStatus = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSub || !newStatus) return;

    try {
      setSavingStatus(true);
      const { error } = await supabase
        .from('platform_subscriptions')
        .update({ status: newStatus })
        .eq('id', selectedSub.id);

      if (error) throw error;
      
      toast.success('Subscription status updated');
      setOpenStatusModal(false);
      fetchSubscriptions();
    } catch (err: unknown) {
      toast.error('Failed to update status');
    } finally {
      setSavingStatus(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch(status) {
      case 'active': return 'bg-green-500/10 text-green-400 border-green-500/20';
      case 'trialing': return 'bg-blue-500/10 text-blue-400 border-blue-500/20';
      case 'past_due': return 'bg-amber-500/10 text-amber-400 border-amber-500/20';
      case 'canceled': return 'bg-red-500/10 text-red-400 border-red-500/20';
      case 'suspended': return 'bg-red-500/10 text-red-400 border-red-500/20';
      default: return 'bg-zinc-500/10 text-zinc-400 border-zinc-500/20';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <GradientText className="text-2xl font-bold tracking-tight from-amber-400 to-amber-600">Platform Subscriptions</GradientText>
          <p className="text-zinc-500 text-xs mt-1">Manage billing, status, and MRR for all gyms.</p>
        </div>
      </div>

      {/* MRR Stats */}
      <SpotlightCard className="p-6 border-zinc-800 bg-zinc-900/40 w-full sm:w-1/3">
        <div className="flex items-center gap-2 text-green-400 mb-2">
          <CreditCard className="h-5 w-5" />
          <span className="text-xs font-bold uppercase tracking-wider">Total MRR</span>
        </div>
        <div className="text-3xl font-extrabold text-zinc-100 flex items-baseline">
          <span className="text-xl mr-1">₹</span>
          <NumberTicker value={mrr} />
        </div>
      </SpotlightCard>

      {/* Filters */}
      <Card className="border-zinc-800 bg-zinc-900/40 p-4">
        <div className="flex flex-wrap gap-4 items-center">
          <div className="w-[180px]">
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="border-zinc-800 bg-zinc-950 text-zinc-100 text-xs">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent className="bg-zinc-900 border-zinc-800 text-zinc-100 text-xs">
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="trialing">Trialing</SelectItem>
                <SelectItem value="past_due">Past Due</SelectItem>
                <SelectItem value="canceled">Canceled</SelectItem>
                <SelectItem value="suspended">Suspended</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="w-[180px]">
            <Select value={planFilter} onValueChange={setPlanFilter}>
              <SelectTrigger className="border-zinc-800 bg-zinc-950 text-zinc-100 text-xs">
                <SelectValue placeholder="Plan" />
              </SelectTrigger>
              <SelectContent className="bg-zinc-900 border-zinc-800 text-zinc-100 text-xs">
                <SelectItem value="all">All Plans</SelectItem>
                <SelectItem value="free">Free</SelectItem>
                <SelectItem value="pro">Pro</SelectItem>
                <SelectItem value="enterprise">Enterprise</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </Card>

      {/* Subscriptions Table */}
      <Card className="border-zinc-800 bg-zinc-900/40 overflow-hidden">
        {loading ? (
          <div className="flex justify-center items-center py-20">
            <Loader2 className="h-8 w-8 animate-spin text-amber-600" />
          </div>
        ) : subscriptions.length === 0 ? (
          <div className="text-center py-20 text-zinc-500">No subscriptions found matching the criteria.</div>
        ) : (
          <Table>
            <TableHeader className="bg-zinc-900/60 border-zinc-800">
              <TableRow className="border-zinc-800">
                <TableHead className="text-zinc-400 font-semibold text-xs">Gym Name</TableHead>
                <TableHead className="text-zinc-400 font-semibold text-xs">Plan</TableHead>
                <TableHead className="text-zinc-400 font-semibold text-xs">Status</TableHead>
                <TableHead className="text-zinc-400 font-semibold text-xs">Billing Cycle</TableHead>
                <TableHead className="text-zinc-400 font-semibold text-xs">Period</TableHead>
                <TableHead className="text-zinc-400 font-semibold text-xs">Razorpay ID</TableHead>
                <TableHead className="text-zinc-400 font-semibold text-xs text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {subscriptions.map((sub) => (
                <TableRow key={sub.id} className="border-zinc-800/40 hover:bg-zinc-800/10">
                  <TableCell className="font-semibold text-zinc-300 text-xs">
                    {sub.gyms?.name || 'Unknown Gym'}
                  </TableCell>
                  <TableCell>
                    <span className="text-zinc-300 text-xs font-medium">{sub.platform_plans?.name || 'Custom'}</span>
                  </TableCell>
                  <TableCell>
                    <GlowingBadge variant={sub.status as any} pulse={sub.status === 'active'} className={getStatusColor(sub.status)}>
                      {sub.status.replace('_', ' ')}
                    </GlowingBadge>
                  </TableCell>
                  <TableCell className="text-zinc-400 text-xs capitalize">
                    {sub.billing_cycle || '-'}
                  </TableCell>
                  <TableCell className="text-zinc-400 text-xs">
                    <div className="flex flex-col gap-0.5">
                      <span>{sub.current_period_start ? formatDate(sub.current_period_start) : '-'}</span>
                      <span className="text-[9px] text-zinc-500">to {sub.current_period_end ? formatDate(sub.current_period_end) : '-'}</span>
                    </div>
                  </TableCell>
                  <TableCell className="text-zinc-500 text-xs font-mono">
                    {sub.razorpay_subscription_id || '-'}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-1.5">
                      <Link href={`/superadmin/gyms/${sub.gym_id}`} passHref legacyBehavior>
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-zinc-400 hover:text-white" title="View Gym">
                          <Eye className="h-4 w-4" />
                        </Button>
                      </Link>
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-zinc-400 hover:text-amber-400" title="Change Status" onClick={() => handleOpenStatusModal(sub)}>
                        <Edit2 className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-zinc-400 hover:text-blue-400" title="Extend Trial">
                        <CalendarPlus className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-zinc-400 hover:text-red-400" title="Cancel Subscription">
                        <XCircle className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </Card>

      {/* Change Status Modal */}
      <Dialog open={openStatusModal} onOpenChange={setOpenStatusModal}>
        <DialogContent className="bg-zinc-900 border-zinc-800 text-white max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold">Change Subscription Status</DialogTitle>
            <DialogDescription className="text-zinc-500 text-xs">
              Update status for {selectedSub?.gyms?.name}
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSaveStatus} className="space-y-4 pt-4">
            <div className="space-y-2">
              <Label className="text-zinc-300 text-xs">New Status</Label>
              <Select value={newStatus} onValueChange={setNewStatus}>
                <SelectTrigger className="border-zinc-800 bg-zinc-950 text-zinc-100">
                  <SelectValue placeholder="Select Status" />
                </SelectTrigger>
                <SelectContent className="bg-zinc-900 border-zinc-800 text-zinc-100">
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="trialing">Trialing</SelectItem>
                  <SelectItem value="past_due">Past Due</SelectItem>
                  <SelectItem value="canceled">Canceled</SelectItem>
                  <SelectItem value="suspended">Suspended</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <Label className="text-zinc-300 text-xs">Reason / Notes (Optional)</Label>
              <Textarea 
                value={statusReason} 
                onChange={e => setStatusReason(e.target.value)} 
                className="border-zinc-800 bg-zinc-950 resize-none h-20 text-xs" 
                placeholder="Why is this status changing?"
              />
            </div>

            <DialogFooter className="border-t border-zinc-800/60 pt-4 mt-6">
              <Button type="button" variant="ghost" onClick={() => setOpenStatusModal(false)} className="text-zinc-400 text-xs">Cancel</Button>
              <Button type="submit" disabled={savingStatus} className="bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold gap-2">
                {savingStatus && <Loader2 className="h-4 w-4 animate-spin" />}
                Update Status
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
