'use client';

import React, { useEffect, useState, useMemo } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { formatCurrency, calculateGST, formatDate } from '@/lib/utils/format';
import { toast } from 'sonner';
import {
  RefreshCw,
  Calendar,
  CreditCard,
  MessageCircle,
  Receipt,
  Sparkles,
  Loader2,
  CheckCircle2,
  AlertCircle,
  IndianRupee,
} from 'lucide-react';

export interface RenewalMemberInfo {
  id: string;
  name: string;
  member_code?: string;
  phone?: string;
  whatsapp_phone?: string | null;
  status?: string;
  plan_end_date?: string | null;
  current_plan_id?: string | null;
  photo_url?: string | null;
}

interface MemberRenewalModalProps {
  open: boolean;
  onClose: () => void;
  member: RenewalMemberInfo | null;
  onSuccess?: (result: any) => void;
}

interface PlanOption {
  id: string;
  name: string;
  duration_days: number;
  price: number;
}

export function MemberRenewalModal({
  open,
  onClose,
  member,
  onSuccess,
}: MemberRenewalModalProps) {
  const supabase = createClient();
  const { user } = useAuth();

  const [loadingPlans, setLoadingPlans] = useState(false);
  const [plans, setPlans] = useState<PlanOption[]>([]);
  const [selectedPlanId, setSelectedPlanId] = useState<string>('');

  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');

  const [discountPercent, setDiscountPercent] = useState<string>('0');
  const [discountAmount, setDiscountAmount] = useState<string>('0');
  const [amountPaid, setAmountPaid] = useState<string>('');
  const [paymentMode, setPaymentMode] = useState<string>('cash');
  const [transactionId, setTransactionId] = useState<string>('');
  const [sendWhatsApp, setSendWhatsApp] = useState<boolean>(true);
  const [submitting, setSubmitting] = useState<boolean>(false);

  // Load plans on modal open
  useEffect(() => {
    if (!open || !user?.gymId) return;

    async function loadPlans() {
      try {
        setLoadingPlans(true);
        const { data, error } = await supabase
          .from('plans')
          .select('id, name, duration_days, price')
          .eq('gym_id', user!.gymId)
          .eq('is_active', true)
          .order('price', { ascending: true });

        if (error) throw error;
        setPlans(data || []);

        // Pick initial plan: member's current plan if active, else first available
        if (data && data.length > 0) {
          const matched = member?.current_plan_id
            ? data.find((p) => p.id === member.current_plan_id)
            : null;
          setSelectedPlanId(matched ? matched.id : data[0].id);
        }
      } catch (err: unknown) {
        console.error('Failed to load plans:', err);
        toast.error('Unable to fetch gym plans');
      } finally {
        setLoadingPlans(false);
      }
    }

    loadPlans();
  }, [open, user?.gymId, member?.current_plan_id, supabase]);

  // Compute smart initial start date
  useEffect(() => {
    if (!open || !member) return;

    const todayStr = new Date().toISOString().split('T')[0];
    let initialStart = todayStr;

    if (member.plan_end_date && member.plan_end_date >= todayStr) {
      // Plan is currently active: smart renewal starts the next day
      const nextDay = new Date(member.plan_end_date);
      nextDay.setDate(nextDay.getDate() + 1);
      initialStart = nextDay.toISOString().split('T')[0];
    }

    setStartDate(initialStart);
    setDiscountPercent('0');
    setDiscountAmount('0');
    setTransactionId('');
    setPaymentMode('upi');
  }, [open, member]);

  // Selected plan reference
  const selectedPlan = useMemo(() => {
    return plans.find((p) => p.id === selectedPlanId) || null;
  }, [plans, selectedPlanId]);

  // Recompute end date when start date or plan changes
  useEffect(() => {
    if (!startDate || !selectedPlan) {
      setEndDate('');
      return;
    }

    const s = new Date(startDate);
    s.setDate(s.getDate() + selectedPlan.duration_days);
    setEndDate(s.toISOString().split('T')[0]);
  }, [startDate, selectedPlan]);

  // Financial calculations
  const basePrice = selectedPlan ? Number(selectedPlan.price) || 0 : 0;
  const numDiscount = Number(discountAmount) || 0;
  const gstBreakdown = useMemo(() => {
    return calculateGST(basePrice, numDiscount);
  }, [basePrice, numDiscount]);

  const totalPayable = gstBreakdown.total;

  // Initialize amountPaid to full payable amount when total changes
  useEffect(() => {
    setAmountPaid(String(totalPayable));
  }, [totalPayable]);

  const numAmountPaid = Number(amountPaid) || 0;
  const balanceDue = Math.max(0, totalPayable - numAmountPaid);

  const handleDiscountPercentChange = (val: string) => {
    setDiscountPercent(val);
    const p = Math.max(0, Math.min(100, Number(val) || 0));
    const calculatedDiscount = Math.round(((basePrice * p) / 100) * 100) / 100;
    setDiscountAmount(String(calculatedDiscount));
  };

  const handleDiscountAmountChange = (val: string) => {
    setDiscountAmount(val);
    const amt = Math.max(0, Math.min(basePrice, Number(val) || 0));
    const calculatedPercent = basePrice > 0 ? Math.round((amt / basePrice) * 100) : 0;
    setDiscountPercent(String(calculatedPercent));
  };

  const handleApplyPreset = (preset: 'full' | 'half' | 'zero') => {
    if (preset === 'full') {
      setAmountPaid(String(totalPayable));
    } else if (preset === 'half') {
      setAmountPaid(String(Math.round(totalPayable / 2)));
    } else if (preset === 'zero') {
      setAmountPaid('0');
    }
  };

  const handleRenewSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!member || !selectedPlanId || !startDate || !endDate) {
      toast.error('Please complete all required fields');
      return;
    }

    if (numAmountPaid < 0 || numAmountPaid > totalPayable) {
      toast.error('Payment amount cannot be negative or exceed total');
      return;
    }

    try {
      setSubmitting(true);

      const res = await fetch('/api/members/renew', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          memberId: member.id,
          planId: selectedPlanId,
          startDate,
          endDate,
          discountPercent: Number(discountPercent) || 0,
          discountAmount: numDiscount,
          amountPaid: numAmountPaid,
          paymentMode,
          transactionId: transactionId.trim() || null,
          sendWhatsApp,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Failed to renew membership');
      }

      toast.success(`🎉 Membership renewed for ${member.name}! Invoice #${data.invoice?.invoice_number || ''}`);
      onSuccess?.(data);
      onClose();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'An error occurred during renewal';
      toast.error(msg);
    } finally {
      setSubmitting(false);
    }
  };

  if (!member) return null;

  const todayStr = new Date().toISOString().split('T')[0];
  const isCurrentlyActive = member.status === 'active' && member.plan_end_date && member.plan_end_date >= todayStr;

  return (
    <Dialog open={open} onOpenChange={(val) => !val && onClose()}>
      <DialogContent className="max-w-xl bg-zinc-950 border-zinc-800 text-zinc-100 p-0 overflow-hidden shadow-2xl">
        {/* Header Ribbon */}
        <div className="bg-gradient-to-r from-purple-950/60 via-zinc-900 to-zinc-900 border-b border-zinc-800/80 p-5">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3.5">
              <Avatar className="h-12 w-12 border border-purple-500/30 shrink-0">
                {member.photo_url ? (
                  <AvatarImage src={member.photo_url} alt={member.name} />
                ) : null}
                <AvatarFallback className="bg-purple-900 text-purple-200 font-bold text-sm">
                  {member.name.slice(0, 2).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div>
                <DialogTitle className="text-lg font-bold text-white flex items-center gap-2">
                  <span>Renew Membership</span>
                  <Badge variant="outline" className="text-[10px] font-mono border-purple-500/30 text-purple-300">
                    {member.member_code || 'MEMBER'}
                  </Badge>
                </DialogTitle>
                <DialogDescription className="text-xs text-zinc-400 mt-0.5">
                  Extending membership plan, issuing tax invoice, and updating billing ledgers.
                </DialogDescription>
              </div>
            </div>

            <div className="text-right">
              <Badge
                className={
                  isCurrentlyActive
                    ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20 text-xs capitalize'
                    : 'bg-rose-500/10 text-rose-400 border-rose-500/20 text-xs capitalize'
                }
              >
                {isCurrentlyActive ? 'Plan Active' : 'Plan Expired'}
              </Badge>
              <p className="text-[11px] text-zinc-400 mt-1">
                {member.plan_end_date ? `Ends: ${formatDate(member.plan_end_date)}` : 'No active end date'}
              </p>
            </div>
          </div>
        </div>

        {/* Modal Body Form */}
        <form onSubmit={handleRenewSubmit} className="p-5 space-y-5">
          {/* Plan Selection */}
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold text-zinc-300 flex items-center justify-between">
              <span>Select Membership Package *</span>
              {selectedPlan && (
                <span className="text-[11px] text-purple-400 font-normal">
                  Duration: {selectedPlan.duration_days} days
                </span>
              )}
            </Label>
            {loadingPlans ? (
              <div className="flex items-center gap-2 text-xs text-zinc-400 py-2">
                <Loader2 className="h-4 w-4 animate-spin text-purple-500" />
                Loading packages...
              </div>
            ) : (
              <Select value={selectedPlanId} onValueChange={setSelectedPlanId}>
                <SelectTrigger className="border-zinc-800 bg-zinc-900 text-zinc-100 text-sm h-10">
                  <SelectValue placeholder="Choose a plan" />
                </SelectTrigger>
                <SelectContent className="bg-zinc-900 border-zinc-800 text-zinc-100">
                  {plans.map((p) => (
                    <SelectItem key={p.id} value={p.id} className="text-xs">
                      <div className="flex items-center justify-between w-full gap-4">
                        <span className="font-medium">{p.name} ({p.duration_days} Days)</span>
                        <span className="font-mono font-bold text-purple-400">{formatCurrency(p.price)}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>

          {/* Start and End Dates */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 bg-zinc-900/60 p-3.5 rounded-xl border border-zinc-800/80">
            <div className="space-y-1.5">
              <Label className="text-[11px] font-semibold text-zinc-300 flex items-center gap-1.5">
                <Calendar className="h-3.5 w-3.5 text-purple-400" />
                <span>Renewal Start Date *</span>
              </Label>
              <Input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="border-zinc-800 bg-zinc-950 text-xs text-zinc-100 h-9"
                required
              />
              {isCurrentlyActive && (
                <p className="text-[10px] text-emerald-400 flex items-center gap-1">
                  <CheckCircle2 className="h-3 w-3 shrink-0" />
                  Auto-aligned to next day after current expiry
                </p>
              )}
            </div>

            <div className="space-y-1.5">
              <Label className="text-[11px] font-semibold text-zinc-300 flex items-center gap-1.5">
                <Calendar className="h-3.5 w-3.5 text-emerald-400" />
                <span>New Plan Expiry Date</span>
              </Label>
              <Input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="border-zinc-800 bg-zinc-950 text-xs text-zinc-100 h-9"
                required
              />
              <p className="text-[10px] text-zinc-400">
                Calculated based on {selectedPlan?.duration_days || 0} days duration
              </p>
            </div>
          </div>

          {/* Pricing & GST Breakdown Card */}
          <div className="bg-zinc-900/40 rounded-xl border border-zinc-800/80 p-3.5 space-y-3">
            <div className="grid grid-cols-2 gap-3">
              {/* Discount Percent */}
              <div className="space-y-1">
                <Label className="text-[11px] text-zinc-400">Discount (%)</Label>
                <Input
                  type="number"
                  min="0"
                  max="100"
                  value={discountPercent}
                  onChange={(e) => handleDiscountPercentChange(e.target.value)}
                  className="border-zinc-800 bg-zinc-950 text-xs text-zinc-100 h-8 font-mono"
                  placeholder="0"
                />
              </div>

              {/* Discount Amount */}
              <div className="space-y-1">
                <Label className="text-[11px] text-zinc-400">Discount (₹)</Label>
                <Input
                  type="number"
                  min="0"
                  max={basePrice}
                  value={discountAmount}
                  onChange={(e) => handleDiscountAmountChange(e.target.value)}
                  className="border-zinc-800 bg-zinc-950 text-xs text-zinc-100 h-8 font-mono"
                  placeholder="0"
                />
              </div>
            </div>

            {/* Calculations Summary Row */}
            <div className="border-t border-zinc-800/80 pt-2.5 space-y-1.5 text-xs">
              <div className="flex justify-between text-zinc-400">
                <span>Base Package Rate:</span>
                <span className="font-mono text-zinc-300">{formatCurrency(basePrice)}</span>
              </div>
              {numDiscount > 0 && (
                <div className="flex justify-between text-amber-400">
                  <span>Concession / Discount:</span>
                  <span className="font-mono">- {formatCurrency(numDiscount)}</span>
                </div>
              )}
              <div className="flex justify-between text-zinc-400">
                <span>GST (9% CGST + 9% SGST):</span>
                <span className="font-mono text-zinc-300">
                  {formatCurrency(gstBreakdown.cgst + gstBreakdown.sgst)}
                </span>
              </div>
              <div className="flex justify-between text-sm font-bold text-white border-t border-zinc-800 pt-1.5">
                <span>Total Payable:</span>
                <span className="font-mono text-purple-300">{formatCurrency(totalPayable)}</span>
              </div>
            </div>
          </div>

          {/* Payment Collection Section */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label className="text-xs font-semibold text-zinc-300 flex items-center gap-1.5">
                <CreditCard className="h-3.5 w-3.5 text-purple-400" />
                <span>Amount Paid Now *</span>
              </Label>
              <div className="flex items-center gap-1">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => handleApplyPreset('full')}
                  className="h-6 text-[10px] px-2 border-zinc-800 bg-zinc-900 text-zinc-300 hover:text-white"
                >
                  Full Paid
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => handleApplyPreset('half')}
                  className="h-6 text-[10px] px-2 border-zinc-800 bg-zinc-900 text-zinc-300 hover:text-white"
                >
                  50%
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => handleApplyPreset('zero')}
                  className="h-6 text-[10px] px-2 border-zinc-800 bg-zinc-900 text-zinc-300 hover:text-white"
                >
                  Later
                </Button>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="relative">
                <Input
                  type="number"
                  min="0"
                  max={totalPayable}
                  value={amountPaid}
                  onChange={(e) => setAmountPaid(e.target.value)}
                  className="border-zinc-800 bg-zinc-900 text-sm text-zinc-100 font-mono font-bold h-10"
                  placeholder="0"
                  required
                />
              </div>

              <div>
                <Select value={paymentMode} onValueChange={setPaymentMode}>
                  <SelectTrigger className="border-zinc-800 bg-zinc-900 text-zinc-100 text-xs h-10">
                    <SelectValue placeholder="Payment Mode" />
                  </SelectTrigger>
                  <SelectContent className="bg-zinc-900 border-zinc-800 text-zinc-100 text-xs">
                    <SelectItem value="upi">UPI (GPay / PhonePe / Paytm)</SelectItem>
                    <SelectItem value="cash">Cash Counter</SelectItem>
                    <SelectItem value="card">Debit / Credit Card (POS)</SelectItem>
                    <SelectItem value="bank_transfer">Direct Bank Transfer (NEFT/IMPS)</SelectItem>
                    <SelectItem value="cheque">Bank Cheque</SelectItem>
                    <SelectItem value="other">Other Mode</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Remaining Due Banner */}
            {balanceDue > 0 ? (
              <div className="flex items-center justify-between p-2.5 rounded-lg bg-amber-500/10 border border-amber-500/20 text-xs text-amber-300">
                <span className="flex items-center gap-1.5">
                  <AlertCircle className="h-4 w-4 shrink-0 text-amber-400" />
                  <span>Remaining balance due:</span>
                </span>
                <span className="font-mono font-bold">{formatCurrency(balanceDue)}</span>
              </div>
            ) : (
              <div className="flex items-center gap-1.5 p-2 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-xs text-emerald-300">
                <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-400" />
                <span>Plan fully paid. No outstanding balance.</span>
              </div>
            )}

            {/* Optional Transaction Reference */}
            {paymentMode !== 'cash' && (
              <div className="space-y-1">
                <Label className="text-[11px] text-zinc-400">Transaction ID / UTR / Reference (Optional)</Label>
                <Input
                  type="text"
                  value={transactionId}
                  onChange={(e) => setTransactionId(e.target.value)}
                  placeholder="e.g. UPI-202609280012"
                  className="border-zinc-800 bg-zinc-900 text-xs text-zinc-100 h-8 font-mono"
                />
              </div>
            )}
          </div>

          {/* WhatsApp toggle option */}
          <div className="flex items-center justify-between border-t border-zinc-800/80 pt-3">
            <label className="flex items-center gap-2 cursor-pointer text-xs text-zinc-300 select-none">
              <input
                type="checkbox"
                checked={sendWhatsApp}
                onChange={(e) => setSendWhatsApp(e.target.checked)}
                className="h-4 w-4 rounded border-zinc-700 bg-zinc-900 text-purple-600 focus:ring-0"
              />
              <span className="flex items-center gap-1.5">
                <MessageCircle className="h-3.5 w-3.5 text-emerald-400" />
                <span>Send WhatsApp renewal receipt to {member.whatsapp_phone || member.phone || 'member'}</span>
              </span>
            </label>
          </div>

          {/* Footer Actions */}
          <DialogFooter className="border-t border-zinc-800 pt-3 flex items-center justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onClose}
              disabled={submitting}
              className="border-zinc-800 text-zinc-400 hover:text-white"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              size="sm"
              disabled={submitting || !selectedPlanId}
              className="bg-purple-600 hover:bg-purple-700 text-white font-medium gap-2 px-4 shadow-lg shadow-purple-900/30"
            >
              {submitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Processing Renewal...
                </>
              ) : (
                <>
                  <RefreshCw className="h-4 w-4" />
                  Confirm Renewal ({formatCurrency(numAmountPaid)})
                </>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
