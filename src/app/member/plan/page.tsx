'use client';

import React, { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { CreditCard, Loader2, Receipt, Download, ShieldCheck, Zap } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { formatCurrency, formatDate } from '@/lib/utils/format';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

export default function MemberPlanPage() {
  const supabase = createClient();
  const [loading, setLoading] = useState(true);
  const [paying, setPaying] = useState(false);
  const [member, setMember] = useState<any>(null);
  const [invoices, setInvoices] = useState<any[]>([]);

  useEffect(() => {
    const fetchPlanAndInvoices = async () => {
      try {
        setLoading(true);
        const { data: { user: authUser } } = await supabase.auth.getUser();
        if (!authUser) return;

        // Fetch corresponding member
        const { data: memData } = await supabase
          .from('members')
          .select('*, plans(*)')
          .or(`auth_id.eq.${authUser.id},email.eq.${authUser.email}`)
          .single();

        if (memData) {
          setMember(memData);

          // Fetch member invoices history
          const { data: invData } = await supabase
            .from('invoices')
            .select('*')
            .eq('member_id', memData.id)
            .order('issued_at', { ascending: false });

          setInvoices(invData || []);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchPlanAndInvoices();
  }, []);

  const loadRazorpayScript = () => {
    return new Promise((resolve) => {
      if ((window as any).Razorpay) {
        resolve(true);
        return;
      }
      const script = document.createElement('script');
      script.src = 'https://checkout.razorpay.com/v1/checkout.js';
      script.onload = () => resolve(true);
      script.onerror = () => resolve(false);
      document.body.appendChild(script);
    });
  };

  const handleRenewPlan = async () => {
    if (!member || !member.plans) return;

    try {
      setPaying(true);
      const scriptLoaded = await loadRazorpayScript();
      if (!scriptLoaded) {
        toast.error('Payment processor script failed to load. Are you offline?');
        return;
      }

      // Create Razorpay order on Next.js server
      const res = await fetch('/api/payments/razorpay/create-order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amount: member.plans.price,
          memberId: member.id,
          planId: member.plans.id,
          gymId: member.gym_id,
        }),
      });

      if (!res.ok) throw new Error('Order creation endpoint failed');
      const order = await res.json();

      // Open Razorpay Checkout modal
      const options = {
        key: order.keyId,
        amount: order.amount * 100,
        currency: 'INR',
        name: 'GymERP Renewal',
        description: `Plan Renewal: ${member.plans.name}`,
        order_id: order.orderId,
        handler: async function (response: any) {
          toast.success('Payment captured! Synchronizing validity...');
          
          // Reconcile via local client webhook handler
          const confirmRes = await fetch('/api/payments/razorpay/webhook', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              event: 'payment.captured',
              payload: {
                payment: {
                  entity: {
                    id: response.razorpay_payment_id,
                    order_id: response.razorpay_order_id,
                    signature: response.razorpay_signature,
                    notes: {
                      memberId: member.id,
                      planId: member.plans.id,
                      gymId: member.gym_id,
                    },
                    amount: order.amount,
                  }
                }
              }
            }),
          });

          if (confirmRes.ok) {
            toast.success('Membership extended successfully! Auto-refreshing dashboard...');
            window.location.reload();
          } else {
            toast.error('Failed to extend membership. Support notified.');
          }
        },
        prefill: {
          name: member.name,
          email: member.email || '',
          contact: member.phone,
        },
        theme: {
          color: '#3b82f6', // primary brand token (Blue-500) from DESIGN.md
        },
      };

      const rzp = new (window as any).Razorpay(options);
      rzp.open();
    } catch (err: unknown) {
      console.error(err);
      toast.error('Online checkout failed to launch');
    } finally {
      setPaying(false);
    }
  };

  const getStatusBadgeColor = (status: string) => {
    switch (status) {
      case 'paid': return 'bg-green-500/10 text-green-400 border border-green-500/20';
      case 'partial': return 'bg-amber-500/10 text-amber-400 border border-amber-500/20';
      default: return 'bg-red-500/10 text-red-400 border border-red-500/20';
    }
  };

  if (loading) {
    return (
      <div className="flex h-[50vh] items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-purple-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <span className="text-[10px] text-purple-400 font-extrabold uppercase tracking-widest">Pricing & Billing</span>
        <h2 className="text-xl font-black text-zinc-100">Membership package</h2>
      </div>

      {/* Package Detail Card */}
      {member?.plans ? (
        <div className="space-y-4">
          <Card className="border-zinc-900 bg-zinc-900/30">
            <CardHeader className="pb-3 border-b border-zinc-900/40">
              <div className="flex items-center gap-2">
                <CreditCard className="h-4.5 w-4.5 text-purple-400" />
                <CardTitle className="text-sm font-bold text-zinc-200">{member.plans.name}</CardTitle>
              </div>
              <CardDescription className="text-zinc-500 text-xs">
                Pricing tier validity: {member.plans.duration_days} days
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-4 text-xs space-y-3 text-zinc-400">
              <div className="flex justify-between">
                <span>Start Date:</span>
                <span className="text-zinc-200 font-semibold">{member.plan_start_date ? formatDate(member.plan_start_date) : '-'}</span>
              </div>
              <div className="flex justify-between">
                <span>Expiry Date:</span>
                <span className="text-zinc-200 font-semibold">{member.plan_end_date ? formatDate(member.plan_end_date) : '-'}</span>
              </div>
              <div className="flex justify-between">
                <span>Price Paid:</span>
                <span className="text-zinc-100 font-bold">{formatCurrency(member.plans.price || 0)}</span>
              </div>
              {member.total_due > 0 && (
                <div className="flex justify-between border-t border-zinc-900 pt-2 text-amber-400">
                  <span className="font-bold">Pending dues:</span>
                  <span className="font-black">{formatCurrency(member.total_due)}</span>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Action renewal button */}
          <Button
            onClick={handleRenewPlan}
            disabled={paying}
            className="w-full bg-purple-600 hover:bg-purple-700 text-white font-bold text-sm py-5 shadow-lg shadow-purple-600/10 flex items-center justify-center gap-2 group"
          >
            {paying ? (
              <Loader2 className="h-4.5 w-4.5 animate-spin text-white" />
            ) : (
              <>
                <Zap className="h-4.5 w-4.5 fill-current" /> Renew Membership Online
              </>
            )}
          </Button>
          
          <div className="flex items-center justify-center gap-1 text-[10px] text-zinc-500">
            <ShieldCheck className="h-3.5 w-3.5 text-green-500" />
            Payments secured and encrypted by Razorpay
          </div>
        </div>
      ) : (
        <div className="text-center py-8 text-zinc-500 border border-dashed border-zinc-800 rounded-xl">
          No package currently assigned.
        </div>
      )}

      {/* Invoices List section */}
      <div className="space-y-3">
        <h3 className="text-xs font-extrabold text-zinc-400 uppercase tracking-widest flex items-center gap-1.5">
          <Receipt className="h-4 w-4 text-purple-400" />
          Receipts History
        </h3>

        {invoices.length === 0 ? (
          <div className="text-center py-6 text-zinc-600 text-xs">No payment invoices logged.</div>
        ) : (
          <div className="space-y-3">
            {invoices.map((inv) => (
              <Card key={inv.id} className="border-zinc-900 bg-zinc-900/30 overflow-hidden p-3.5 flex justify-between items-center gap-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-zinc-200 text-xs">{inv.invoice_number}</span>
                    <Badge className={`${getStatusBadgeColor(inv.status)} text-[9px] uppercase px-1.5 py-0.2 rounded font-bold`}>
                      {inv.status}
                    </Badge>
                  </div>
                  <span className="text-[10px] text-zinc-500 block">
                    Issued: {formatDate(inv.issued_at)} • {formatCurrency(inv.total)}
                  </span>
                </div>

                <a
                  href={`/api/members/renew-pdf/${member.id}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="h-8 w-8 rounded-lg bg-zinc-950 border border-zinc-900 text-zinc-400 hover:text-white flex items-center justify-center transition-colors"
                  title="Download unified renewal PDF"
                >
                  <Download className="h-4 w-4" />
                </a>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
