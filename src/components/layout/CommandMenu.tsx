'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';
import { createClient } from '@/lib/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { usePermission } from '@/hooks/usePermission';
import {
  Search,
  Users,
  CreditCard,
  Receipt,
  CalendarCheck,
  PhoneCall,
  IndianRupee,
  MessageCircle,
  Apple,
  Dumbbell,
  FileCheck,
  Clock,
  Settings,
  Sparkles,
  Cctv,
  RefreshCw,
  Check,
  CheckCircle2,
  ArrowRight,
  ExternalLink,
  Wallet,
  Loader2,
  Flame,
} from 'lucide-react';
import { Dialog, DialogContent, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';

const MemberRenewalModal = dynamic(
  () => import('@/components/members/MemberRenewalModal').then((mod) => mod.MemberRenewalModal),
  { ssr: false }
);

interface CommandMenuProps {
  open: boolean;
  setOpen: (open: boolean) => void;
}

export function CommandMenu({ open, setOpen }: CommandMenuProps) {
  const router = useRouter();
  const supabase = createClient();
  const { user } = useAuth();
  const { can } = usePermission();

  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);

  // Results states
  const [members, setMembers] = useState<any[]>([]);
  const [invoices, setInvoices] = useState<any[]>([]);

  // Action states
  const [checkingInId, setCheckingInId] = useState<string | null>(null);
  const [checkedInIds, setCheckedInIds] = useState<Set<string>>(new Set());
  const [renewalMember, setRenewalMember] = useState<any | null>(null);

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === 'k' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen(!open);
      }
    };
    document.addEventListener('keydown', down);
    return () => document.removeEventListener('keydown', down);
  }, [open, setOpen]);

  useEffect(() => {
    if (!open) {
      setQuery('');
      setMembers([]);
      setInvoices([]);
      setRenewalMember(null);
      return;
    }

    const cleanQuery = query.trim();
    if (cleanQuery.length < 2) {
      setMembers([]);
      setInvoices([]);
      return;
    }

    // Skip member search if typing a direct command prefix like >
    if (cleanQuery.startsWith('>')) {
      setMembers([]);
      setInvoices([]);
      return;
    }

    const delayDebounce = setTimeout(async () => {
      if (!user?.gymId) return;

      try {
        setLoading(true);

        // Multi-field member lookup: name, phone, or member_code
        const { data: memberData } = await supabase
          .from('members')
          .select('id, name, member_code, phone, whatsapp_phone, status, plan_end_date, current_plan_id, total_due')
          .eq('gym_id', user.gymId)
          .or(`name.ilike.%${cleanQuery}%,phone.ilike.%${cleanQuery}%,member_code.ilike.%${cleanQuery}%`)
          .limit(6);

        setMembers(memberData || []);

        // Fetch invoices if user has permissions
        if (can('invoices.view')) {
          const { data: invoiceData } = await supabase
            .from('invoices')
            .select('id, invoice_number, member_name, total, status')
            .eq('gym_id', user.gymId)
            .or(`invoice_number.ilike.%${cleanQuery}%,member_name.ilike.%${cleanQuery}%`)
            .limit(4);

          setInvoices(invoiceData || []);
        }
      } catch (err) {
        console.error('Command search failure:', err);
      } finally {
        setLoading(false);
      }
    }, 200);

    return () => clearTimeout(delayDebounce);
  }, [query, open, user?.gymId, can, supabase]);

  const handleNavigate = (path: string) => {
    setOpen(false);
    router.push(path);
  };

  // Instant Check-In from Omnibar
  const handleInstantCheckIn = async (e: React.MouseEvent, member: any) => {
    e.stopPropagation();
    if (!can('attendance.mark')) {
      toast.error('You do not have permission to mark attendance');
      return;
    }

    try {
      setCheckingInId(member.id);
      const res = await fetch('/api/attendance/manual-checkin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          memberId: member.id,
          notes: 'Instant check-in via Cmd+K Omnibar',
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to mark attendance');
      }

      setCheckedInIds((prev) => new Set(prev).add(member.id));
      if (data.alreadyMarked) {
        toast.info(`${member.name} is already checked in today!`);
      } else {
        toast.success(`Check-in recorded for ${member.name}!`);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error recording check-in';
      toast.error(msg);
    } finally {
      setCheckingInId(null);
    }
  };

  // Instant WhatsApp dispatch from Omnibar
  const handleOpenWhatsApp = (e: React.MouseEvent, member: any) => {
    e.stopPropagation();
    const rawPhone = member.whatsapp_phone || member.phone;
    if (!rawPhone) {
      toast.warning('No phone number recorded for this member');
      return;
    }
    const cleanPhone = rawPhone.replace(/\D/g, '');
    const finalPhone = cleanPhone.length === 10 ? `91${cleanPhone}` : cleanPhone;
    const url = `https://wa.me/${finalPhone}?text=${encodeURIComponent(`Hello ${member.name}, reaching out from your gym!`)}`;
    window.open(url, '_blank');
  };

  // Open renewal modal directly from Omnibar
  const handleOpenRenewal = (e: React.MouseEvent, member: any) => {
    e.stopPropagation();
    setRenewalMember(member);
  };

  // Navigate to Dues for member
  const handleOpenDues = (e: React.MouseEvent, memberName: string) => {
    e.stopPropagation();
    handleNavigate(`/dashboard/due?search=${encodeURIComponent(memberName)}`);
  };

  const navItems = [
    { label: 'Add New Member', command: '> new member', href: '/dashboard/members/add', icon: Users, permission: 'members.add' as const },
    { label: 'Create Invoice', command: '> new invoice', href: '/dashboard/invoices', icon: Receipt, permission: 'invoices.create' as const },
    { label: 'Cash Drawer & Dues', command: '> cash drawer', href: '/dashboard/due', icon: Wallet, permission: 'due.view' as const },
    { label: 'Follow-ups CRM', command: '> followups', href: '/dashboard/followups', icon: PhoneCall, permission: 'followups.view' as const },
    { label: 'Attendance Cockpit', command: '> attendance', href: '/dashboard/attendance', icon: CalendarCheck, permission: 'attendance.view' as const },
    { label: 'Face AI Kiosk', command: '> face kiosk', href: '/dashboard/attendance/face-kiosk', icon: Sparkles, permission: undefined },
    { label: 'Biometric Fingerprint Kiosk', command: '> fingerprint kiosk', href: '/dashboard/attendance/kiosk', icon: CalendarCheck, permission: undefined },
    { label: 'Turnstile QR Kiosk', command: '> qr kiosk', href: '/dashboard/attendance/qr-kiosk', icon: CalendarCheck, permission: undefined },
    { label: 'Voice AI Kiosk Agent', command: '> agent kiosk', href: '/kiosk/agent', icon: Sparkles, permission: undefined },
    { label: 'WhatsApp Broadcasts', command: '> whatsapp', href: '/dashboard/whatsapp', icon: MessageCircle, permission: 'whatsapp.send' as const },
    { label: 'Diet Charts', command: '> diet', href: '/dashboard/diet', icon: Apple, permission: 'diet.view' as const },
    { label: 'Workout Studio', command: '> workout', href: '/dashboard/exercise', icon: Dumbbell, permission: 'exercise.view' as const },
    { label: 'Workouts Science Hub', command: '> workouts', href: '/dashboard/workouts', icon: Flame, permission: 'exercise.view' as const },
    { label: 'CCTV AI Vigilance', command: '> cctv', href: '/dashboard/cctv', icon: Cctv, permission: 'cctv.view' as const },
    { label: 'Gym Settings', command: '> settings', href: '/dashboard/settings', icon: Settings, permission: 'settings.manage' as const },
  ];

  // Filter navigation items if query starts with '>'
  const filteredNavItems = query.startsWith('>')
    ? navItems.filter((item) =>
        item.command.toLowerCase().includes(query.toLowerCase()) ||
        item.label.toLowerCase().includes(query.replace('>', '').trim().toLowerCase())
      )
    : navItems;

  return (
    <>
      <Dialog open={open && !renewalMember} onOpenChange={setOpen}>
        <DialogContent className="max-w-2xl bg-zinc-950 border-zinc-800 text-white p-0 gap-0 overflow-hidden shadow-2xl">
          <DialogTitle className="sr-only">Front-Desk Command Console</DialogTitle>
          <DialogDescription className="sr-only">
            Action-first console: search members, check in, renew plans, collect dues, and launch shortcuts.
          </DialogDescription>

          {/* Search Input Bar */}
          <div className="flex items-center border-b border-zinc-800 px-4 py-3 gap-3 bg-zinc-900/70">
            <Search className="h-5 w-5 text-purple-400 shrink-0" />
            <Input
              placeholder="Search member, phone, code, or type > for actions..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="flex-1 border-0 bg-transparent text-sm text-zinc-100 placeholder-zinc-500 focus-visible:ring-0 focus-visible:ring-offset-0 h-9 p-0"
              autoFocus
            />
            <div className="flex items-center gap-1.5">
              <kbd className="hidden sm:inline-flex h-5 select-none items-center gap-0.5 rounded border border-zinc-700 bg-zinc-800 px-1.5 font-mono text-[10px] font-medium text-zinc-400">
                ESC
              </kbd>
            </div>
          </div>

          {/* Action-First Content Area */}
          <div className="max-h-[420px] overflow-y-auto p-3.5 space-y-4">
            {loading && (
              <div className="flex items-center justify-center py-6 text-xs text-zinc-400 gap-2">
                <Sparkles className="h-4 w-4 animate-spin text-purple-400" />
                Searching member database...
              </div>
            )}

            {/* Member Search Results with Operational Action Pills */}
            {!loading && members.length > 0 && (
              <div className="space-y-1.5">
                <div className="flex items-center justify-between px-2">
                  <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">
                    Members ({members.length})
                  </span>
                  <span className="text-[10px] text-zinc-500">Quick Actions Available</span>
                </div>

                {members.map((m) => {
                  const isCheckedIn = checkedInIds.has(m.id);
                  const isCheckingIn = checkingInId === m.id;
                  const hasDue = Number(m.total_due) > 0;

                  return (
                    <div
                      key={m.id}
                      onClick={() => handleNavigate(`/dashboard/members/${m.id}`)}
                      className="w-full flex flex-col sm:flex-row sm:items-center justify-between p-2.5 rounded-xl hover:bg-zinc-900 border border-transparent hover:border-zinc-800 text-left text-xs transition-[background-color,border-color] gap-2.5 cursor-pointer group"
                    >
                      {/* Left: Member Identity */}
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="h-8 w-8 rounded-full bg-purple-950/60 text-purple-300 border border-purple-800/30 flex items-center justify-center font-bold shrink-0">
                          {m.name.slice(0, 2).toUpperCase()}
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-zinc-100 group-hover:text-purple-300 truncate">
                              {m.name}
                            </span>
                            <Badge
                              className={
                                m.status === 'active'
                                  ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20 text-[9px] px-1.5 py-0 capitalize'
                                  : 'bg-rose-500/10 text-rose-400 border-rose-500/20 text-[9px] px-1.5 py-0 capitalize'
                              }
                            >
                              {m.status}
                            </Badge>
                          </div>
                          <div className="text-[11px] text-zinc-400 mt-0.5 truncate">
                            <span className="font-mono text-zinc-300">{m.member_code}</span>
                            {m.phone && <span> • {m.phone}</span>}
                          </div>
                        </div>
                      </div>

                      {/* Right: Operational Action Pills */}
                      <div className="flex items-center gap-1.5 shrink-0 self-end sm:self-center" onClick={(e) => e.stopPropagation()}>
                        {/* 1-Click Check-In Pill */}
                        {can('attendance.mark') && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={(e) => handleInstantCheckIn(e, m)}
                            disabled={isCheckingIn}
                            className={
                              isCheckedIn
                                ? 'h-7 text-[11px] px-2.5 border-emerald-600/40 bg-emerald-950/30 text-emerald-300 hover:bg-emerald-950/50'
                                : 'h-7 text-[11px] px-2.5 border-zinc-800 bg-zinc-900 text-zinc-200 hover:text-white hover:bg-zinc-800'
                            }
                          >
                            {isCheckingIn ? (
                              <Loader2 className="h-3 w-3 animate-spin text-purple-400" />
                            ) : isCheckedIn ? (
                              <>
                                <Check className="h-3 w-3 text-emerald-400 mr-1" />
                                Present
                              </>
                            ) : (
                              <>
                                <CalendarCheck className="h-3 w-3 text-purple-400 mr-1" />
                                Check-In
                              </>
                            )}
                          </Button>
                        )}

                        {/* 1-Click Renew Pill */}
                        {can('members.edit') && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={(e) => handleOpenRenewal(e, m)}
                            className="h-7 text-[11px] px-2.5 border-purple-600/30 bg-purple-950/20 text-purple-300 hover:bg-purple-950/40"
                          >
                            <RefreshCw className="h-3 w-3 mr-1 text-purple-400" />
                            Renew
                          </Button>
                        )}

                        {/* Dues Pill if outstanding balance exists */}
                        {hasDue && can('due.view') && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={(e) => handleOpenDues(e, m.name)}
                            className="h-7 text-[11px] px-2 border-amber-600/40 bg-amber-950/20 text-amber-300 hover:bg-amber-950/40 font-mono"
                          >
                            Due ₹{m.total_due}
                          </Button>
                        )}

                        {/* WhatsApp Web Shortcut */}
                        {(m.whatsapp_phone || m.phone) && (
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={(e) => handleOpenWhatsApp(e, m)}
                            className="h-7 w-7 p-0 text-zinc-400 hover:text-emerald-400 hover:bg-emerald-950/30"
                            title="Chat on WhatsApp"
                          >
                            <MessageCircle className="h-3.5 w-3.5" />
                          </Button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Invoices Matching Results */}
            {!loading && invoices.length > 0 && (
              <div className="space-y-1.5">
                <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest block px-2">
                  Invoices ({invoices.length})
                </span>
                {invoices.map((inv) => (
                  <button
                    key={inv.id}
                    onClick={() => handleNavigate(`/dashboard/invoices`)}
                    className="w-full flex items-center justify-between px-3 py-2 rounded-xl hover:bg-zinc-900 border border-transparent hover:border-zinc-800 active:scale-[0.99] text-left text-xs transition-[background-color,border-color] group"
                  >
                    <div className="flex items-center gap-3">
                      <div className="h-7 w-7 rounded bg-zinc-900 border border-zinc-800 text-zinc-400 flex items-center justify-center shrink-0">
                        <Receipt className="h-3.5 w-3.5 text-purple-400" />
                      </div>
                      <div>
                        <div className="font-semibold text-zinc-200 group-hover:text-white">{inv.invoice_number}</div>
                        <div className="text-[11px] text-zinc-400">{inv.member_name}</div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-mono text-zinc-200 font-bold">₹{inv.total}</div>
                      <Badge
                        className={`text-[8px] font-bold uppercase rounded px-1.5 py-0 border ${
                          inv.status === 'paid'
                            ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                            : 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                        }`}
                      >
                        {inv.status}
                      </Badge>
                    </div>
                  </button>
                ))}
              </div>
            )}

            {/* Navigation / Action Commands Area */}
            {(query.trim().length < 2 || query.startsWith('>')) && (
              <div className="space-y-2">
                <div className="flex items-center justify-between px-2">
                  <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">
                    Quick Operational Shortcuts
                  </span>
                  <span className="text-[10px] text-zinc-500">Type &gt; to filter commands</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                  {filteredNavItems.map((item) => {
                    if (item.permission && !can(item.permission)) return null;
                    const Icon = item.icon;
                    return (
                      <button
                        key={item.href}
                        onClick={() => handleNavigate(item.href)}
                        className="flex items-center justify-between px-3 py-2.5 rounded-xl hover:bg-zinc-900 border border-transparent hover:border-zinc-800 active:scale-[0.99] text-left text-xs text-zinc-300 hover:text-white transition-[background-color,border-color] group"
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <Icon className="h-4 w-4 text-purple-400 shrink-0 group-hover:text-purple-300" />
                          <span className="font-medium truncate">{item.label}</span>
                        </div>
                        <span className="text-[10px] font-mono text-zinc-600 group-hover:text-zinc-400 shrink-0">
                          {item.command}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Empty State */}
            {!loading && query.trim().length >= 2 && !query.startsWith('>') && members.length === 0 && invoices.length === 0 && (
              <div className="text-center py-8 text-xs text-zinc-500">
                No matching members or invoices found for "{query}". Try typing <kbd className="text-purple-400">&gt;</kbd> to view commands.
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* 1-Click Renewal Modal Launched from Omnibar */}
      {renewalMember && (
        <MemberRenewalModal
          open={!!renewalMember}
          onClose={() => setRenewalMember(null)}
          member={renewalMember}
          onSuccess={() => {
            setRenewalMember(null);
            setOpen(false);
          }}
        />
      )}
    </>
  );
}
