'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { createClient } from '@/lib/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import QRCode from 'qrcode';
import { toast } from 'sonner';
import { formatCurrency, formatPhone } from '@/lib/utils/format';
import {
  QrCode,
  IndianRupee,
  CheckCircle2,
  Loader2,
  Copy,
  Check,
  MessageCircle,
  Banknote,
  Smartphone,
  ShieldCheck,
  ArrowRight,
} from 'lucide-react';
import { Card3D } from '@/components/magicui/card-3d';

export interface DueMemberInfo {
  id: string;
  name: string;
  phone?: string;
  member_code?: string | null;
  total_due: number;
  branch_id?: string | null;
}

interface QuickDueCollectModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  member: DueMemberInfo | null;
  onSuccess?: () => void;
}

export function QuickDueCollectModal({
  open,
  onOpenChange,
  member,
  onSuccess,
}: QuickDueCollectModalProps) {
  const supabase = createClient();
  const { user } = useAuth();

  const [loading, setLoading] = useState(false);
  const [settling, setSettling] = useState(false);
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  const [upiDetails, setUpiDetails] = useState<{
    vpa: string;
    payeeName: string;
    amount: number;
    upiUri: string;
  } | null>(null);
  const [copiedVpa, setCopiedVpa] = useState(false);
  const [sendingWa, setSendingWa] = useState(false);

  const generateUpiQr = useCallback(async () => {
    if (!member || !user?.gymId) return;

    try {
      setLoading(true);
      const res = await fetch('/api/kiosk/upi-qr', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          gymId: user.gymId,
          memberId: member.id,
          amount: member.total_due,
          purpose: `Due Clearance - ${member.member_code || member.name}`,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.upiUri) {
        throw new Error(data.error || 'Failed to generate UPI QR code');
      }

      setUpiDetails({
        vpa: data.payeeVpa,
        payeeName: data.payeeName,
        amount: data.amount,
        upiUri: data.upiUri,
      });

      const qrUrl = await QRCode.toDataURL(data.upiUri, {
        width: 260,
        margin: 1,
        color: {
          dark: '#000000',
          light: '#ffffff',
        },
      });

      setQrDataUrl(qrUrl);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error generating UPI code';
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  }, [member, user?.gymId]);

  useEffect(() => {
    if (open && member) {
      generateUpiQr();
    } else {
      setQrDataUrl(null);
      setUpiDetails(null);
    }
  }, [open, member, generateUpiQr]);

  const copyVpa = () => {
    if (!upiDetails?.vpa) return;
    navigator.clipboard.writeText(upiDetails.vpa);
    setCopiedVpa(true);
    toast.success('UPI ID copied to clipboard');
    setTimeout(() => setCopiedVpa(false), 2000);
  };

  const recordSettlement = async (method: 'cash' | 'upi') => {
    if (!member || !user?.gymId) return;

    try {
      setSettling(true);
      const now = new Date().toISOString();
      const today = now.split('T')[0];

      // 1. Record payment transaction
      await supabase.from('payment_transactions').insert({
        gym_id: user.gymId,
        member_id: member.id,
        amount: member.total_due,
        payment_method: method,
        payment_status: 'completed',
        transaction_reference: `DESK-${method.toUpperCase()}-${Date.now().toString().slice(-6)}`,
        notes: `Front-desk speed collection (${method.toUpperCase()})`,
      });

      // 2. Update member total_due to 0
      const { error: memberErr } = await supabase
        .from('members')
        .update({
          total_due: 0,
          updated_at: now,
        })
        .eq('id', member.id)
        .eq('gym_id', user.gymId);

      if (memberErr) throw memberErr;

      // 3. Mark any due_records as settled
      await supabase
        .from('due_records')
        .update({
          status: 'settled',
          paid_date: today,
          updated_at: now,
        })
        .eq('member_id', member.id)
        .eq('gym_id', user.gymId)
        .eq('status', 'pending');

      toast.success(`Cleared ${formatCurrency(member.total_due)} due for ${member.name}!`, {
        description: `Settlement recorded as ${method === 'cash' ? 'Cash in Drawer' : 'UPI Instant'}.`,
      });

      onSuccess?.();
      onOpenChange(false);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Settlement failed';
      toast.error(msg);
    } finally {
      setSettling(false);
    }
  };

  const sendWhatsAppReminder = async () => {
    if (!member?.phone || !user?.gymId) return;

    try {
      setSendingWa(true);
      const dueText = `Namaste ${member.name}, reminder from ${upiDetails?.payeeName || 'your gym'}: Pending membership balance is ${formatCurrency(member.total_due)}. Pay instantly via UPI: ${upiDetails?.upiUri || ''}`;
      const res = await fetch('/api/whatsapp/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to: member.phone,
          type: 'text',
          text: dueText,
          memberId: member.id,
        }),
      });

      if (res.ok) {
        toast.success(`Payment link sent via WhatsApp to ${formatPhone(member.phone)}`);
      } else {
        toast.info('WhatsApp reminder queued for member');
      }
    } catch {
      toast.error('Could not dispatch WhatsApp message');
    } finally {
      setSendingWa(false);
    }
  };

  if (!member) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md p-0 overflow-hidden bg-zinc-950/95 backdrop-blur-2xl border border-white/[0.1] text-zinc-100 shadow-2xl rounded-2xl">
        {/* Header */}
        <DialogHeader className="px-5 pt-5 pb-3 border-b border-white/[0.08] bg-white/[0.02]">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="h-8 w-8 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center justify-center">
                <IndianRupee className="h-4 w-4" />
              </div>
              <div>
                <DialogTitle className="text-base font-semibold tracking-tight text-white">
                  Quick Due Clearance
                </DialogTitle>
                <DialogDescription className="text-xs text-zinc-400">
                  Front-Desk Speed Settlement
                </DialogDescription>
              </div>
            </div>

            <Badge
              variant="outline"
              className="text-amber-400 bg-amber-500/10 border-amber-500/30 text-xs font-mono font-bold px-2 py-0.5"
            >
              {formatCurrency(member.total_due)} Due
            </Badge>
          </div>
        </DialogHeader>

        {/* Member Strip */}
        <div className="px-5 py-3 bg-white/[0.01] border-b border-white/[0.06] flex items-center justify-between text-xs">
          <div>
            <span className="font-semibold text-white">{member.name}</span>
            {member.member_code && (
              <span className="ml-2 font-mono text-[10px] bg-zinc-800 text-zinc-300 px-1.5 py-0.5 rounded border border-white/[0.08]">
                {member.member_code}
              </span>
            )}
          </div>
          <span className="text-zinc-400 font-mono">{formatPhone(member.phone || '')}</span>
        </div>

        {/* Dynamic UPI QR Code Stage */}
        <div className="p-5 flex flex-col items-center justify-center bg-radial from-zinc-900/60 to-zinc-950">
          <Card3D maxTilt={10} glare={true} scale={1.03} className="rounded-2xl shadow-xl">
            <div className="p-3 bg-white rounded-2xl border border-zinc-200 flex flex-col items-center justify-center">
              {loading ? (
                <div className="h-52 w-52 flex flex-col items-center justify-center gap-2">
                  <Loader2 className="h-6 w-6 animate-spin text-zinc-700" />
                  <span className="text-xs font-mono text-zinc-500">Generating Bharat UPI QR...</span>
                </div>
              ) : qrDataUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={qrDataUrl}
                  alt="NPCI Bharat UPI Payment QR"
                  className="h-52 w-52 object-contain rounded-lg"
                />
              ) : (
                <div className="h-52 w-52 flex items-center justify-center text-xs text-zinc-400">
                  Failed to load QR
                </div>
              )}

              <div className="mt-2 text-center">
                <span className="text-[11px] font-semibold text-zinc-800 tracking-tight block">
                  Scan with GPay • PhonePe • Paytm • BHIM
                </span>
                <span className="text-[10px] font-mono text-zinc-500 block">
                  Amount: {formatCurrency(member.total_due)}
                </span>
              </div>
            </div>
          </Card3D>

          {/* VPA Copy Pill */}
          {upiDetails?.vpa && (
            <button
              type="button"
              onClick={copyVpa}
              className="mt-3 inline-flex items-center gap-1.5 text-[11px] font-mono text-zinc-400 hover:text-white bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.08] px-2.5 py-1 rounded-full cursor-pointer transition-colors active:scale-[0.98]"
            >
              <span>VPA: {upiDetails.vpa}</span>
              {copiedVpa ? <Check className="h-3 w-3 text-emerald-400" /> : <Copy className="h-3 w-3" />}
            </button>
          )}
        </div>

        {/* Action Buttons: Rapid Settlement */}
        <div className="p-5 border-t border-white/[0.08] bg-white/[0.02] flex flex-col gap-2">
          <div className="grid grid-cols-2 gap-2.5">
            {/* Cash Received Button */}
            <Button
              type="button"
              disabled={settling}
              onClick={() => recordSettlement('cash')}
              className="h-10 bg-emerald-600 hover:bg-emerald-500 text-white font-medium text-xs rounded-xl active:scale-[0.98] transition-all cursor-pointer shadow-md"
            >
              {settling ? (
                <Loader2 className="h-4 w-4 animate-spin mr-1.5" />
              ) : (
                <Banknote className="h-4 w-4 mr-1.5" />
              )}
              <span>Cash Received</span>
            </Button>

            {/* UPI Settled Button */}
            <Button
              type="button"
              disabled={settling}
              onClick={() => recordSettlement('upi')}
              className="h-10 bg-indigo-600 hover:bg-indigo-500 text-white font-medium text-xs rounded-xl active:scale-[0.98] transition-all cursor-pointer shadow-md"
            >
              {settling ? (
                <Loader2 className="h-4 w-4 animate-spin mr-1.5" />
              ) : (
                <Smartphone className="h-4 w-4 mr-1.5" />
              )}
              <span>UPI Verified</span>
            </Button>
          </div>

          {/* WhatsApp Payment Link */}
          {member.phone && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={sendingWa}
              onClick={sendWhatsAppReminder}
              className="h-8 border-white/[0.08] bg-white/[0.03] hover:bg-white/[0.08] text-zinc-300 hover:text-white text-xs rounded-xl active:scale-[0.98] cursor-pointer"
            >
              <MessageCircle className="h-3.5 w-3.5 mr-1.5 text-emerald-400" />
              <span>Send QR Link via WhatsApp</span>
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
