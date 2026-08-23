'use client';

import React, { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { Separator } from '@/components/ui/separator';
import { toast } from 'sonner';
import { Zap, ChevronDown, ChevronUp, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { calculateGST, formatCurrency } from '@/lib/utils/format';
import Link from 'next/link';
import { usePlanLimits } from '@/hooks/usePlanLimits';
import { UpgradePrompt } from '@/components/shared/UpgradePrompt';

interface QuickAddMemberProps {
  open: boolean;
  onClose: () => void;
  onSuccess: (memberId?: string) => void;
  initialData?: { name?: string; phone?: string; };
}

export function QuickAddMember({ open, onClose, onSuccess, initialData }: QuickAddMemberProps) {
  const supabase = createClient();
  const { user } = useAuth();
  const gymId = user?.gymId;
  const { canAddMember, maxMembers, usage, planName } = usePlanLimits();

  const [loading, setLoading] = useState(false);
  const [plans, setPlans] = useState<any[]>([]);

  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [selectedPlanId, setSelectedPlanId] = useState('');

  const [amountPaidStr, setAmountPaidStr] = useState('');
  const [paymentMode, setPaymentMode] = useState<'cash' | 'upi' | 'card'>('cash');

  const [showOptional, setShowOptional] = useState(false);
  const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0]);
  const [whatsappPhone, setWhatsappPhone] = useState('');
  const [sendWelcomeWhatsapp, setSendWelcomeWhatsapp] = useState(true);

  const [successData, setSuccessData] = useState<{
    name: string;
    memberCode: string;
    invoiceNo: string;
    invoiceId: string;
    memberId: string;
    phone: string;
  } | null>(null);

  // Auto-calculated fields
  const [selectedPlan, setSelectedPlan] = useState<any>(null);
  const [baseAmount, setBaseAmount] = useState(0);
  const [cgst, setCgst] = useState(0);
  const [sgst, setSgst] = useState(0);
  const [totalAmount, setTotalAmount] = useState(0);

  useEffect(() => {
    if (!open || !gymId) return;
    const fetchPlans = async () => {
      const { data } = await supabase
        .from('plans')
        .select('*')
        .eq('gym_id', gymId)
        .eq('is_active', true);
      setPlans(data || []);
    };
    fetchPlans();
    
    // Reset state on open
    setName(initialData?.name || '');
    setPhone(initialData?.phone || '');
    setSelectedPlanId('');
    setAmountPaidStr('');
    setPaymentMode('cash');
    setShowOptional(false);
    setStartDate(new Date().toISOString().split('T')[0]);
    setWhatsappPhone(initialData?.phone || '');
    setSuccessData(null);
  }, [open, gymId, supabase, initialData]);

  useEffect(() => {
    if (!selectedPlanId) {
      setSelectedPlan(null);
      setBaseAmount(0);
      setCgst(0);
      setSgst(0);
      setTotalAmount(0);
      return;
    }

    const plan = plans.find(p => p.id === selectedPlanId);
    if (!plan) return;

    setSelectedPlan(plan);

    const price = Number(plan.price);
    const base = price / 1.18;
    const c = base * 0.09;
    const s = base * 0.09;

    setBaseAmount(base);
    setCgst(c);
    setSgst(s);
    setTotalAmount(price);
    
    if (amountPaidStr === '' || Number(amountPaidStr) === totalAmount) {
      setAmountPaidStr(price.toString());
    }
  }, [selectedPlanId, plans, amountPaidStr, totalAmount]);

  const handlePhoneChange = (val: string) => {
    const clean = val.replace(/\D/g, '');
    setPhone(clean);
    if (!whatsappPhone) {
      setWhatsappPhone(clean);
    }
  };

  const handleSubmit = async () => {
    if (!gymId) return;
    if (!name.trim()) {
      toast.error('Please enter name');
      return;
    }
    if (phone.length !== 10) {
      toast.error('Please enter a valid 10-digit phone number');
      return;
    }
    if (!selectedPlanId || !selectedPlan) {
      toast.error('Please select a plan');
      return;
    }

    try {
      setLoading(true);

      // Step 1: Generate member_code
      let memberCode = '';
      const { data: counter } = await supabase
        .from('counters')
        .select('member_count')
        .eq('gym_id', gymId)
        .single();
      
      if (counter) {
        memberCode = `MBR\${String((counter.member_count || 0) + 1).padStart(4, '0')}`;
      } else {
        // Fallback or create counter
        memberCode = `MBR0001`;
      }

      // Step 2: Insert member
      const end = new Date(startDate);
      end.setDate(end.getDate() + selectedPlan.duration_days);
      const endDate = end.toISOString().split('T')[0];

      const { data: member, error: memberError } = await supabase.from('members').insert({
        gym_id: gymId,
        member_code: memberCode,
        name: name.trim(),
        phone: phone.trim(),
        whatsapp_phone: whatsappPhone || phone.trim(),
        status: 'active',
        current_plan_id: selectedPlanId,
        plan_start_date: startDate,
        plan_end_date: endDate,
        admission_date: startDate,
        total_paid_lifetime: Number(amountPaidStr) || 0,
        total_due: Math.max(0, totalAmount - (Number(amountPaidStr) || 0)),
        created_by: user.id,
      }).select().single();

      if (memberError) throw memberError;

      // Step 3: Generate invoice number
      const { data: invCounter } = await supabase
        .from('counters')
        .select('invoice_count')
        .eq('gym_id', gymId)
        .single();
      
      const year = new Date().getFullYear();
      const invoiceNo = `INV-\${year}-\${String((invCounter?.invoice_count || 0) + 1).padStart(4, '0')}`;

      // Step 4: Insert invoice
      const amountPaid = Number(amountPaidStr) || 0;
      const amountDue = Math.max(0, totalAmount - amountPaid);

      const { data: invoice, error: invoiceError } = await supabase.from('invoices').insert({
        gym_id: gymId,
        member_id: member.id,
        member_name: member.name,
        invoice_number: invoiceNo,
        issued_at: new Date().toISOString(),
        plan_id: selectedPlanId,
        subtotal: baseAmount,
        discount_percent: 0,
        discount_amount: 0,
        cgst_amount: cgst,
        sgst_amount: sgst,
        total: totalAmount,
        amount_paid: amountPaid,
        amount_due: amountDue,
        payment_mode: paymentMode,
        status: amountPaid >= totalAmount ? 'paid' : (amountPaid > 0 ? 'partial' : 'pending'),
        line_items: [{ description: selectedPlan.name, qty: 1, rate: baseAmount, amount: baseAmount }],
        created_by: user.id,
      }).select().single();

      if (invoiceError) throw invoiceError;

      if (amountDue > 0) {
        await supabase.from('due_records').insert({
          gym_id: gymId,
          member_id: member.id,
          invoice_id: invoice.id,
          amount: amountDue,
          collected_amount: 0,
          status: 'pending',
          due_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        });
      }

      // Step 5: Update counters
      const newMemberCount = (counter?.member_count || 0) + 1;
      const newInvoiceCount = (invCounter?.invoice_count || 0) + 1;

      const { error: counterError } = await supabase.from('counters').upsert({
        gym_id: gymId,
        member_count: newMemberCount,
        invoice_count: newInvoiceCount,
      }, { onConflict: 'gym_id' });

      if (counterError) {
        console.error("Counter update failed", counterError);
      }

      // Step 6: Trigger WhatsApp Welcome if enabled
      const targetPhone = whatsappPhone || phone.trim();
      if (sendWelcomeWhatsapp && targetPhone) {
        try {
          await fetch('/api/whatsapp/send', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              to: targetPhone,
              type: 'template',
              templateName: 'gym_welcome',
              memberId: member.id,
              params: [
                { type: 'text', text: member.name },
                { type: 'text', text: member.member_code },
                { type: 'text', text: selectedPlan.name },
              ],
            }),
          });
        } catch (waErr) {
          console.warn('WhatsApp welcome dispatch failed:', waErr);
        }
      }

      // Step 7: Success
      toast.success(`✅ ${name} onboarded! Invoice ${invoiceNo} generated.`);
      setSuccessData({
        name: member.name,
        memberCode: member.member_code,
        invoiceNo,
        invoiceId: invoice.id,
        memberId: member.id,
        phone: targetPhone,
      });
      onSuccess(member.id);

    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'An unknown error occurred';
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Sheet open={open} onOpenChange={onClose}>
      <SheetContent className="bg-zinc-950/95 backdrop-blur-md border-l border-zinc-800 text-zinc-100 flex flex-col gap-0 p-0 sm:max-w-md">
        <SheetHeader className="p-6 border-b border-zinc-800 bg-zinc-900/50">
          <SheetTitle className="flex items-center gap-2 text-xl font-bold text-zinc-100">
            <Zap className="h-5 w-5 text-purple-400 fill-purple-400" /> Quick Add Member
          </SheetTitle>
          <SheetDescription className="text-zinc-400">
            Onboard in under 30 seconds
          </SheetDescription>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {!canAddMember ? (
            <div className="p-6">
              <UpgradePrompt feature={`Adding more than ${maxMembers} members`} currentPlan={planName} />
              <p className="text-center text-zinc-400 text-sm mt-4">
                You have {usage.currentMembers}/{maxMembers} members on the {planName} plan.
              </p>
            </div>
          ) : successData ? (
            <div className="bg-green-500/10 border border-green-500/20 rounded-xl p-6 text-center space-y-4 animate-in zoom-in duration-300">
              <div className="mx-auto w-12 h-12 bg-green-500/20 rounded-full flex items-center justify-center">
                <Zap className="h-6 w-6 text-green-400" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-zinc-100">{successData.name} Onboarded</h3>
                <p className="text-sm text-zinc-400 mt-1">Code: {successData.memberCode}</p>
                <p className="text-sm text-zinc-400">Invoice: {successData.invoiceNo}</p>
              </div>
              <div className="flex flex-col gap-2 pt-2">
                <Button asChild variant="outline" className="w-full border-green-500/30 text-green-400 hover:bg-green-500/10 hover:text-green-300">
                  <Link href={`/api/invoices/${successData.invoiceId}/pdf`} target="_blank">
                    📄 Print Invoice PDF
                  </Link>
                </Button>
                <Button
                  variant="default"
                  onClick={() => {
                    setName('');
                    setPhone('');
                    setSelectedPlanId('');
                    setAmountPaidStr('');
                    setSuccessData(null);
                  }}
                  className="w-full bg-purple-600 hover:bg-purple-700 text-white"
                >
                  ⚡ Onboard Another Member
                </Button>
                <Button
                  variant="ghost"
                  onClick={onClose}
                  className="w-full text-zinc-400 hover:text-zinc-100"
                >
                  Done
                </Button>
              </div>
            </div>
          ) : (
            <>
              <div className="space-y-4">
                <div className="grid gap-2">
                  <Label htmlFor="q-name" className="text-zinc-300 text-sm">Full Name</Label>
                  <Input
                    id="q-name"
                    placeholder="Rahul Sharma"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="border-zinc-800 bg-zinc-900/50 text-zinc-100 placeholder:text-zinc-600 focus:border-purple-600"
                  />
                </div>
                
                <div className="grid gap-2">
                  <Label htmlFor="q-phone" className="text-zinc-300 text-sm">Phone Number</Label>
                  <Input
                    id="q-phone"
                    maxLength={10}
                    placeholder="98765 43210"
                    type="tel"
                    value={phone}
                    onChange={(e) => handlePhoneChange(e.target.value)}
                    className="border-zinc-800 bg-zinc-900/50 text-zinc-100 placeholder:text-zinc-600 focus:border-purple-600"
                  />
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="q-plan" className="text-zinc-300 text-sm">Select Plan</Label>
                  <Select value={selectedPlanId} onValueChange={setSelectedPlanId}>
                    <SelectTrigger id="q-plan" className="border-zinc-800 bg-zinc-900/50 text-zinc-100">
                      <SelectValue placeholder="Choose a plan" />
                    </SelectTrigger>
                    <SelectContent className="bg-zinc-900 border-zinc-800 text-zinc-100">
                      {plans.map(p => (
                        <SelectItem key={p.id} value={p.id} className="focus:bg-zinc-800 focus:text-white">
                          {p.name} - ₹{p.price} ({p.duration_days} days)
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {selectedPlan && (
                <div className="bg-zinc-900/80 border border-zinc-800 rounded-lg p-4 font-mono text-sm space-y-2 animate-in slide-in-from-top-2">
                  <div className="text-zinc-400 mb-2 border-b border-zinc-800 pb-2">Auto Invoice</div>
                  <div className="flex justify-between text-zinc-300">
                    <span>Base Amount</span>
                    <span>{formatCurrency(baseAmount)}</span>
                  </div>
                  <div className="flex justify-between text-zinc-400">
                    <span>CGST 9%</span>
                    <span>{formatCurrency(cgst)}</span>
                  </div>
                  <div className="flex justify-between text-zinc-400">
                    <span>SGST 9%</span>
                    <span>{formatCurrency(sgst)}</span>
                  </div>
                  <Separator className="bg-zinc-800 my-2" />
                  <div className="flex justify-between font-bold text-zinc-100">
                    <span>Total</span>
                    <span>{formatCurrency(totalAmount)}</span>
                  </div>
                </div>
              )}

              <div className="space-y-4 pt-2">
                <div className="grid gap-2">
                  <Label htmlFor="q-paid" className="text-zinc-300 text-sm">Amount Paid (₹)</Label>
                  <Input
                    id="q-paid"
                    type="number"
                    min={0}
                    value={amountPaidStr}
                    onChange={(e) => setAmountPaidStr(e.target.value)}
                    className="border-zinc-800 bg-zinc-900/50 text-zinc-100 text-lg font-bold focus:border-purple-600"
                  />
                </div>
                
                <div className="grid gap-2">
                  <Label className="text-zinc-300 text-sm">Payment Mode</Label>
                  <div className="grid grid-cols-3 gap-2">
                    <Button
                      type="button"
                      variant={paymentMode === 'cash' ? 'default' : 'outline'}
                      onClick={() => setPaymentMode('cash')}
                      className={cn(
                        "h-10 border-zinc-800",
                        paymentMode === 'cash' ? "bg-purple-600 hover:bg-purple-700 text-white border-transparent" : "text-zinc-400 hover:text-zinc-100"
                      )}
                    >
                      Cash
                    </Button>
                    <Button
                      type="button"
                      variant={paymentMode === 'upi' ? 'default' : 'outline'}
                      onClick={() => setPaymentMode('upi')}
                      className={cn(
                        "h-10 border-zinc-800",
                        paymentMode === 'upi' ? "bg-purple-600 hover:bg-purple-700 text-white border-transparent" : "text-zinc-400 hover:text-zinc-100"
                      )}
                    >
                      UPI
                    </Button>
                    <Button
                      type="button"
                      variant={paymentMode === 'card' ? 'default' : 'outline'}
                      onClick={() => setPaymentMode('card')}
                      className={cn(
                        "h-10 border-zinc-800",
                        paymentMode === 'card' ? "bg-purple-600 hover:bg-purple-700 text-white border-transparent" : "text-zinc-400 hover:text-zinc-100"
                      )}
                    >
                      Card
                    </Button>
                  </div>
                </div>
              </div>

              <div className="pt-2">
                <button
                  type="button"
                  onClick={() => setShowOptional(!showOptional)}
                  className="flex items-center gap-2 text-sm text-zinc-400 hover:text-zinc-200 transition-colors w-full p-2 rounded-md hover:bg-zinc-900"
                >
                  {showOptional ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                  Optional Details
                </button>
                
                {showOptional && (
                  <div className="space-y-4 pt-4 px-2 animate-in slide-in-from-top-2">
                    <div className="grid gap-2">
                      <Label htmlFor="q-start" className="text-zinc-300 text-sm">Start Date</Label>
                      <Input
                        id="q-start"
                        type="date"
                        value={startDate}
                        onChange={(e) => setStartDate(e.target.value)}
                        className="border-zinc-800 bg-zinc-900/50 text-zinc-100"
                      />
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="q-wa" className="text-zinc-300 text-sm">WhatsApp Number</Label>
                      <Input
                        id="q-wa"
                        maxLength={10}
                        value={whatsappPhone}
                        onChange={(e) => setWhatsappPhone(e.target.value.replace(/\D/g, ''))}
                        className="border-zinc-800 bg-zinc-900/50 text-zinc-100"
                      />
                    </div>
                    <div className="flex items-center gap-2 pt-1">
                      <input
                        type="checkbox"
                        id="q-send-wa"
                        checked={sendWelcomeWhatsapp}
                        onChange={(e) => setSendWelcomeWhatsapp(e.target.checked)}
                        className="rounded border-zinc-700 bg-zinc-900 text-purple-600 focus:ring-purple-500 h-4 w-4"
                      />
                      <Label htmlFor="q-send-wa" className="text-xs text-zinc-300 cursor-pointer">
                        Send instant Welcome message on WhatsApp
                      </Label>
                    </div>
                  </div>
                )}
              </div>
            </>
          )}
        </div>

        {!canAddMember ? null : !successData && (
          <div className="p-6 border-t border-zinc-800 bg-zinc-900/50">
            <Button
              className="w-full bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white h-12 text-base font-semibold"
              onClick={handleSubmit}
              disabled={loading}
            >
              {loading ? <Loader2 className="h-5 w-5 animate-spin mr-2" /> : <Zap className="h-5 w-5 mr-2 fill-white" />}
              Onboard & Generate Invoice
            </Button>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}
