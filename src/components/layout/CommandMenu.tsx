'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
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
} from 'lucide-react';
import { Dialog, DialogContent, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';

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

  useEffect(() => {
    // Escape or close handling is built-in to Dialog
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
      return;
    }

    if (query.trim().length < 2) {
      setMembers([]);
      setInvoices([]);
      return;
    }

    const delayDebounce = setTimeout(async () => {
      if (!user?.gymId) return;

      try {
        setLoading(true);

        // Fetch members
        const { data: memberData } = await supabase
          .from('members')
          .select('id, name, member_code, phone, status')
          .eq('gym_id', user.gymId)
          .ilike('name', `%${query}%`)
          .limit(5);

        setMembers(memberData || []);

        // Fetch invoices if user has permissions
        if (can('invoices.view')) {
          const { data: invoiceData } = await supabase
            .from('invoices')
            .select('id, invoice_number, member_name, total, status')
            .eq('gym_id', user.gymId)
            .ilike('member_name', `%${query}%`)
            .limit(5);

          setInvoices(invoiceData || []);
        }
      } catch (err) {
        console.error('Command search failure:', err);
      } finally {
        setLoading(false);
      }
    }, 250); // 250ms debounce

    return () => clearTimeout(delayDebounce);
  }, [query, open, user?.gymId]);

  const handleNavigate = (path: string) => {
    setOpen(false);
    router.push(path);
  };

  const navItems = [
    { label: 'Add Member', href: '/dashboard/members/add', icon: Users, permission: 'members.add' as const },
    { label: 'New Invoice', href: '/dashboard/invoices', icon: Receipt, permission: 'invoices.create' as const },
    { label: 'Follow-ups CRM', href: '/dashboard/followups', icon: PhoneCall, permission: 'followups.view' as const },
    { label: 'Outstanding Dues', href: '/dashboard/due', icon: IndianRupee, permission: 'due.view' as const },
    { label: 'WhatsApp Campaigns', href: '/dashboard/whatsapp', icon: MessageCircle, permission: 'whatsapp.send' as const },
    { label: 'Diet Charts', href: '/dashboard/diet', icon: Apple, permission: 'diet.view' as const },
    { label: 'Workout Plans', href: '/dashboard/exercise', icon: Dumbbell, permission: 'exercise.view' as const },
    { label: 'KYC Checks', href: '/dashboard/kyc', icon: FileCheck, permission: 'kyc.view' as const },
    { label: 'CCTV & Vigilance', href: '/dashboard/cctv', icon: Cctv, permission: 'cctv.view' as const },
    { label: 'Settings', href: '/dashboard/settings', icon: Settings, permission: 'settings.manage' as const },
  ];

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="max-w-2xl bg-zinc-900 border-zinc-800 text-white p-0 gap-0 overflow-hidden shadow-2xl">
        <DialogTitle className="sr-only">Quick Command Menu</DialogTitle>
        <DialogDescription className="sr-only">Search members, invoices, and system shortcuts</DialogDescription>
        {/* Search Input Bar */}
        <div className="flex items-center border-b border-zinc-800 px-4 py-3 gap-3 bg-zinc-900/60">
          <Search className="h-5 w-5 text-zinc-400 shrink-0" />
          <Input
            placeholder="Type member name, phone, or invoice reference..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="flex-1 border-0 bg-transparent text-sm text-zinc-100 placeholder-zinc-400 focus-visible:ring-0 focus-visible:ring-offset-0 h-9 p-0"
            autoFocus
          />
          <kbd className="hidden sm:inline-flex h-5 select-none items-center gap-0.5 rounded border border-zinc-700 bg-zinc-800 px-1.5 font-mono text-[10px] font-medium text-zinc-400 opacity-100">
            ESC
          </kbd>
        </div>

        {/* Dynamic Search Results & Actions Area */}
        <div className="max-h-[360px] overflow-y-auto p-4 space-y-4">
          {loading && (
            <div className="flex items-center justify-center py-6 text-xs text-zinc-400 gap-2">
              <Sparkles className="h-4 w-4 animate-spin text-purple-500" />
              Searching data records...
            </div>
          )}

          {/* Members Matching Results */}
          {!loading && members.length > 0 && (
            <div className="space-y-1.5">
              <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest block px-2">Members</span>
              {members.map((m) => (
                <button
                  key={m.id}
                  onClick={() => handleNavigate(`/dashboard/members/${m.id}`)}
                  className="w-full flex items-center justify-between px-2.5 py-2 rounded-lg hover:bg-zinc-800/60 active:scale-[0.98] text-left text-xs transition-[background-color,transform] group"
                >
                  <div className="flex items-center gap-3">
                    <div className="h-7 w-7 rounded-full bg-purple-950/40 text-purple-400 border border-purple-800/10 flex items-center justify-center font-bold">
                      {m.name.slice(0, 2).toUpperCase()}
                    </div>
                    <div>
                      <div className="font-semibold text-zinc-200 group-hover:text-white">{m.name}</div>
                      <div className="text-xs text-zinc-400 mt-0.5">{m.member_code} • {m.phone}</div>
                    </div>
                  </div>
                  <span className={`text-[9px] font-bold px-1.5 py-0.2 rounded border uppercase ${
                    m.status === 'active' 
                      ? 'bg-green-500/10 text-green-400 border-green-500/20' 
                      : 'bg-red-500/10 text-red-400 border-red-500/20'
                  }`}>
                    {m.status}
                  </span>
                </button>
              ))}
            </div>
          )}

          {/* Invoices Matching Results */}
          {!loading && invoices.length > 0 && (
            <div className="space-y-1.5">
              <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest block px-2">Invoices</span>
              {invoices.map((inv) => (
                <button
                  key={inv.id}
                  onClick={() => handleNavigate(`/dashboard/invoices`)}
                  className="w-full flex items-center justify-between px-2.5 py-2 rounded-lg hover:bg-zinc-800/60 active:scale-[0.98] text-left text-xs transition-[background-color,transform] group"
                >
                  <div className="flex items-center gap-3">
                    <div className="h-7 w-7 rounded bg-zinc-800 text-zinc-400 flex items-center justify-center">
                      <Receipt className="h-4 w-4" />
                    </div>
                    <div>
                      <div className="font-semibold text-zinc-200 group-hover:text-white">{inv.invoice_number}</div>
                      <div className="text-xs text-zinc-400 mt-0.5">{inv.member_name}</div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-mono text-zinc-200 font-bold">₹{inv.total}</div>
                    <span className={`text-[8px] font-bold uppercase rounded-md px-1.5 py-0.2 border ${
                      inv.status === 'paid' 
                        ? 'bg-green-500/10 text-green-400 border-green-500/20' 
                        : 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                    }`}>
                      {inv.status}
                    </span>
                  </div>
                </button>
              ))}
            </div>
          )}

          {/* Navigation/Shortcuts Area */}
          {query.trim().length < 2 && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
              <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest block col-span-2 px-2">Navigation Shortcuts</span>
              {navItems.map((item) => {
                if (item.permission && !can(item.permission)) return null;
                const Icon = item.icon;
                return (
                  <button
                    key={item.href}
                    onClick={() => handleNavigate(item.href)}
                    className="flex items-center gap-2.5 px-3 py-2 rounded-lg hover:bg-zinc-800/40 active:scale-[0.98] text-left text-xs text-zinc-300 hover:text-white transition-[background-color,transform]"
                  >
                    <Icon className="h-4 w-4 text-purple-400 shrink-0" />
                    <span>{item.label}</span>
                  </button>
                );
              })}
            </div>
          )}

          {/* No results indicator */}
          {!loading && query.trim().length >= 2 && members.length === 0 && invoices.length === 0 && (
            <div className="text-center py-8 text-xs text-zinc-400">
              No matching members or invoices found for "{query}"
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
