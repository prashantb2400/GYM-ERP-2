'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';
import { createClient } from '@/lib/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { usePermission } from '@/hooks/usePermission';
import {
  PhoneCall,
  Search,
  CheckCircle,
  XCircle,
  Plus,
  Loader2,
  Calendar,
  User,
  Clock,
  Save,
  Phone,
  MessageCircle,
  RefreshCw,
  IndianRupee,
  UserCheck,
  ChevronDown,
  ExternalLink,
  CalendarDays,
  Sparkles,
  ArrowRight,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { formatDate } from '@/lib/utils/format';
import { toast } from 'sonner';
import { GradientText, GlowCard, GlowingBadge, AnimatedList } from '@/components/magicui';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';

const MemberRenewalModal = dynamic(
  () => import('@/components/members/MemberRenewalModal').then((mod) => mod.MemberRenewalModal),
  { ssr: false }
);

interface EnrichedFollowup {
  id: string;
  gym_id: string;
  member_id: string;
  member_name: string;
  type: 'inactive' | 'renewal' | 'due' | 'general' | 'new_lead';
  scheduled_date: string;
  notes: string | null;
  status: 'open' | 'completed' | 'missed' | 'cancelled';
  completed_at: string | null;
  completed_by: string | null;
  outcome: string | null;
  member?: {
    id: string;
    name: string;
    member_code?: string;
    phone?: string;
    whatsapp_phone?: string | null;
    status?: string;
    plan_end_date?: string | null;
    current_plan_id?: string | null;
    photo_url?: string | null;
  } | null;
}

export default function FollowupsPage() {
  const router = useRouter();
  const supabase = createClient();
  const { user } = useAuth();
  const { can } = usePermission();

  const [loading, setLoading] = useState(true);
  const [followups, setFollowups] = useState<EnrichedFollowup[]>([]);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('open');
  const [typeFilter, setTypeFilter] = useState('all');
  const [gymName, setGymName] = useState('Fitness Club');

  // Add Followup Modal states
  const [openAddModal, setOpenAddModal] = useState(false);
  const [adding, setAdding] = useState(false);
  const [members, setMembers] = useState<any[]>([]);
  const [selectedMemberId, setSelectedMemberId] = useState('');
  const [followupType, setFollowupType] = useState<'inactive' | 'renewal' | 'due' | 'general' | 'new_lead' | ''>('');
  const [scheduledDate, setScheduledDate] = useState(new Date().toISOString().split('T')[0]);
  const [notes, setNotes] = useState('');

  // Complete Followup Modal states
  const [openCompleteModal, setOpenCompleteModal] = useState(false);
  const [completing, setCompleting] = useState(false);
  const [selectedFollowup, setSelectedFollowup] = useState<any>(null);
  const [outcome, setOutcome] = useState('');

  // 1-Click Renewal Modal state
  const [renewalMember, setRenewalMember] = useState<any | null>(null);

  // Load gym profile name
  useEffect(() => {
    if (!user?.gymId) return;
    supabase
      .from('gyms')
      .select('name')
      .eq('id', user.gymId)
      .single()
      .then(({ data }) => {
        if (data?.name) setGymName(data.name);
      });
  }, [user?.gymId, supabase]);

  const fetchFollowups = async () => {
    if (!user?.gymId) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      let query = supabase
        .from('followups')
        .select('*')
        .eq('gym_id', user.gymId)
        .order('scheduled_date', { ascending: true });

      if (statusFilter !== 'all') {
        query = query.eq('status', statusFilter);
      }

      if (typeFilter !== 'all') {
        query = query.eq('type', typeFilter);
      }

      const { data, error } = await query;
      if (error) throw error;

      // Extract unique member IDs to fetch contact and membership details
      const rawFollowups = data || [];
      const memberIds = Array.from(new Set(rawFollowups.map((f: any) => f.member_id).filter(Boolean)));
      const memberMap = new Map();

      if (memberIds.length > 0) {
        const { data: memberRows } = await supabase
          .from('members')
          .select('id, name, member_code, phone, whatsapp_phone, status, plan_end_date, current_plan_id, photo_url')
          .in('id', memberIds);

        if (memberRows) {
          memberRows.forEach((m: any) => memberMap.set(m.id, m));
        }
      }

      const enriched: EnrichedFollowup[] = rawFollowups.map((f: any) => ({
        ...f,
        member: memberMap.get(f.member_id) || null,
      }));

      // Client side search by member name or phone
      let filtered = enriched;
      if (search.trim()) {
        const term = search.toLowerCase().trim();
        filtered = filtered.filter(
          (f) =>
            f.member_name.toLowerCase().includes(term) ||
            f.member?.phone?.includes(term) ||
            f.member?.member_code?.toLowerCase().includes(term)
        );
      }

      setFollowups(filtered);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'An unknown error occurred';
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFollowups();
  }, [user?.gymId, statusFilter, typeFilter, search]);

  useEffect(() => {
    if (!user?.gymId) return;
    supabase
      .from('members')
      .select('id, name, member_code')
      .eq('gym_id', user.gymId)
      .eq('status', 'active')
      .then(({ data }) => {
        if (data) setMembers(data);
      });
  }, [user?.gymId, supabase]);

  const handleOpenAddModal = () => {
    if (!can('followups.manage')) {
      toast.error('You do not have permission to manage followups');
      return;
    }
    setSelectedMemberId('');
    setFollowupType('');
    setScheduledDate(new Date().toISOString().split('T')[0]);
    setNotes('');
    setOpenAddModal(true);
  };

  const handleAddFollowup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedMemberId || !followupType || !scheduledDate) {
      toast.error('Please fill in all required fields');
      return;
    }

    try {
      setAdding(true);

      const member = members.find((m) => m.id === selectedMemberId);
      if (!member) throw new Error('Selected member not found');

      const { error } = await supabase.from('followups').insert({
        gym_id: user?.gymId,
        member_id: selectedMemberId,
        member_name: member.name,
        type: followupType,
        scheduled_date: scheduledDate,
        notes: notes.trim() || null,
        status: 'open',
        created_by: user?.id,
      });

      if (error) throw error;

      toast.success('Follow-up task scheduled successfully!');
      setOpenAddModal(false);
      fetchFollowups();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'An unknown error occurred';
      toast.error(msg);
    } finally {
      setAdding(false);
    }
  };

  const handleOpenCompleteModal = (followup: any) => {
    if (!can('followups.manage')) {
      toast.error('You do not have permission to manage followups');
      return;
    }
    setSelectedFollowup(followup);
    setOutcome('');
    setOpenCompleteModal(true);
  };

  const handleCompleteFollowup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFollowup || !outcome.trim()) {
      toast.error('Outcome note is required');
      return;
    }

    try {
      setCompleting(true);

      const { error } = await supabase
        .from('followups')
        .update({
          status: 'completed',
          completed_at: new Date().toISOString(),
          completed_by: user?.id,
          outcome: outcome.trim(),
        })
        .eq('id', selectedFollowup.id);

      if (error) throw error;

      toast.success('Follow-up task completed!');
      setOpenCompleteModal(false);
      fetchFollowups();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'An unknown error occurred';
      toast.error(msg);
    } finally {
      setCompleting(false);
    }
  };

  // Quick Snooze Handler (+1d, +3d, +7d)
  const handleQuickSnooze = async (followupId: string, daysToAdd: number) => {
    try {
      const target = followups.find((f) => f.id === followupId);
      const baseDate = target?.scheduled_date ? new Date(target.scheduled_date) : new Date();
      baseDate.setDate(baseDate.getDate() + daysToAdd);
      const newScheduledDate = baseDate.toISOString().split('T')[0];

      const { error } = await supabase
        .from('followups')
        .update({ scheduled_date: newScheduledDate })
        .eq('id', followupId);

      if (error) throw error;

      toast.success(`Task postponed to ${formatDate(newScheduledDate)}`);
      fetchFollowups();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to postpone follow-up';
      toast.error(msg);
    }
  };

  // Build Contextual WhatsApp URL
  const buildWhatsAppUrl = (f: EnrichedFollowup) => {
    const rawPhone = f.member?.whatsapp_phone || f.member?.phone;
    if (!rawPhone) return null;
    const cleanPhone = rawPhone.replace(/\D/g, '');
    const finalPhone = cleanPhone.length === 10 ? `91${cleanPhone}` : cleanPhone;

    let text = '';
    if (f.type === 'renewal') {
      const expiry = f.member?.plan_end_date ? formatDate(f.member.plan_end_date) : 'soon';
      text = `Hello ${f.member_name}! This is from ${gymName}. Your gym membership plan is expiring on ${expiry}. Would you like us to renew it for you today?`;
    } else if (f.type === 'due') {
      text = `Hello ${f.member_name}! This is a gentle reminder from ${gymName} regarding your outstanding fee. You can clear it via UPI or at the front desk.`;
    } else if (f.type === 'inactive') {
      text = `Hello ${f.member_name}! We missed seeing you at ${gymName} this week! Hope all is well. Reach out anytime if you need a workout tune-up.`;
    } else if (f.type === 'new_lead') {
      text = `Hello ${f.member_name}! Thank you for your interest in ${gymName}. Would you like to schedule your trial workout today?`;
    } else {
      text = `Hello ${f.member_name}! Greetings from ${gymName}. Reaching out to see how your fitness journey is going!`;
    }

    return `https://wa.me/${finalPhone}?text=${encodeURIComponent(text)}`;
  };

  const getStatusBadgeColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20';
      case 'missed':
        return 'bg-rose-500/10 text-rose-400 border border-rose-500/20';
      default:
        return 'bg-amber-500/10 text-amber-400 border border-amber-500/20';
    }
  };

  const getTypeBadgeColor = (type: string) => {
    switch (type) {
      case 'renewal':
        return 'bg-purple-950/60 text-purple-300 border border-purple-800/30';
      case 'due':
        return 'bg-amber-950/60 text-amber-300 border border-amber-800/30';
      case 'inactive':
        return 'bg-zinc-800 text-zinc-400 border border-zinc-700';
      case 'new_lead':
        return 'bg-blue-950/60 text-blue-300 border border-blue-800/30';
      default:
        return 'bg-zinc-800 text-zinc-300';
    }
  };

  const todayStr = new Date().toISOString().split('T')[0];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-zinc-800 pb-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-zinc-100">CRM Operations & Follow-ups</h2>
          <p className="text-zinc-500 text-xs mt-1">
            Actionable callbacks, 1-click renewals, WhatsApp greetings, and task postponement.
          </p>
        </div>
        {can('followups.manage') && (
          <Button onClick={handleOpenAddModal} className="bg-purple-600 hover:bg-purple-700 text-white gap-2 font-medium">
            <Plus className="h-4 w-4" /> Schedule Call
          </Button>
        )}
      </div>

      {/* Filter Bar */}
      <Card className="border-zinc-800 bg-zinc-900/40 p-4">
        <div className="flex flex-col md:flex-row gap-4 items-stretch md:items-center">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-500" />
            <Input
              placeholder="Search by member name, phone, or code..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10 border-zinc-800 bg-zinc-950 text-zinc-100 placeholder:text-zinc-600"
            />
          </div>

          <div className="flex gap-4 items-center">
            <div className="w-[140px]">
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="border-zinc-800 bg-zinc-950 text-zinc-100 text-xs">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent className="bg-zinc-900 border-zinc-800 text-zinc-100 text-xs">
                  <SelectItem value="all">All Tasks</SelectItem>
                  <SelectItem value="open">Open Alerts</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                  <SelectItem value="missed">Missed</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="w-[150px]">
              <Select value={typeFilter} onValueChange={setTypeFilter}>
                <SelectTrigger className="border-zinc-800 bg-zinc-950 text-zinc-100 text-xs">
                  <SelectValue placeholder="Type" />
                </SelectTrigger>
                <SelectContent className="bg-zinc-900 border-zinc-800 text-zinc-100 text-xs">
                  <SelectItem value="all">All Types</SelectItem>
                  <SelectItem value="renewal">Plan Renewals</SelectItem>
                  <SelectItem value="due">Payment Dues</SelectItem>
                  <SelectItem value="inactive">Inactive Alerts</SelectItem>
                  <SelectItem value="new_lead">New Leads</SelectItem>
                  <SelectItem value="general">General Calls</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>
      </Card>

      {/* Followups List Table */}
      <Card className="border-zinc-800 bg-zinc-900/40 overflow-hidden">
        {loading ? (
          <div className="flex justify-center items-center py-20">
            <Loader2 className="h-8 w-8 animate-spin text-purple-600" />
          </div>
        ) : followups.length === 0 ? (
          <div className="text-center py-20 text-zinc-500">No scheduled follow-up alerts found.</div>
        ) : (
          <Table>
            <TableHeader className="bg-zinc-900/60 border-zinc-800">
              <TableRow className="border-zinc-800">
                <TableHead className="text-zinc-400 font-semibold text-xs">Member & Contact</TableHead>
                <TableHead className="text-zinc-400 font-semibold text-xs">Call Category</TableHead>
                <TableHead className="text-zinc-400 font-semibold text-xs">Scheduled Date</TableHead>
                <TableHead className="text-zinc-400 font-semibold text-xs">Notes / Details</TableHead>
                <TableHead className="text-zinc-400 font-semibold text-xs">Direct Actions</TableHead>
                <TableHead className="text-zinc-400 font-semibold text-xs text-right">Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {followups.map((f) => {
                const phone = f.member?.whatsapp_phone || f.member?.phone;
                const isOverdue = f.status === 'open' && f.scheduled_date < todayStr;
                const isDueToday = f.status === 'open' && f.scheduled_date === todayStr;
                const waUrl = buildWhatsAppUrl(f);

                return (
                  <TableRow key={f.id} className="border-zinc-800/40 hover:bg-zinc-800/10">
                    {/* Member & Contact Cell */}
                    <TableCell className="text-xs">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-zinc-100">{f.member_name}</span>
                          {f.member?.member_code && (
                            <span className="font-mono text-[10px] text-zinc-400 bg-zinc-900 px-1 rounded border border-zinc-800">
                              {f.member.member_code}
                            </span>
                          )}
                        </div>

                        {/* Inline Contact Actions */}
                        {phone ? (
                          <div className="flex items-center gap-2 text-[11px] text-zinc-400">
                            <span>{phone}</span>
                            <div className="flex items-center gap-1">
                              <a
                                href={`tel:${phone}`}
                                title={`Call ${f.member_name}`}
                                className="h-5 w-5 rounded bg-zinc-800 hover:bg-purple-950/60 text-zinc-300 hover:text-purple-300 flex items-center justify-center transition-colors"
                              >
                                <Phone className="h-3 w-3" />
                              </a>
                              {waUrl && (
                                <a
                                  href={waUrl}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  title={`Send WhatsApp message to ${f.member_name}`}
                                  className="h-5 w-5 rounded bg-zinc-800 hover:bg-emerald-950/60 text-zinc-300 hover:text-emerald-300 flex items-center justify-center transition-colors"
                                >
                                  <MessageCircle className="h-3 w-3" />
                                </a>
                              )}
                            </div>
                          </div>
                        ) : (
                          <span className="text-[10px] text-zinc-500">No phone on record</span>
                        )}
                      </div>
                    </TableCell>

                    {/* Category Badge */}
                    <TableCell>
                      <GlowingBadge className={`${getTypeBadgeColor(f.type)} text-[9px] font-bold rounded-md px-2 py-0.5 capitalize`}>
                        {f.type.replace('_', ' ')}
                      </GlowingBadge>
                    </TableCell>

                    {/* Scheduled Date */}
                    <TableCell className="text-xs">
                      <div className="space-y-0.5">
                        <span className={isOverdue ? 'text-rose-400 font-bold' : isDueToday ? 'text-amber-400 font-bold' : 'text-zinc-400'}>
                          {formatDate(f.scheduled_date)}
                        </span>
                        {isOverdue && (
                          <p className="text-[10px] text-rose-400 font-medium">Overdue</p>
                        )}
                        {isDueToday && (
                          <p className="text-[10px] text-amber-400 font-medium">Due Today</p>
                        )}
                      </div>
                    </TableCell>

                    {/* Notes & Outcome */}
                    <TableCell className="text-zinc-400 text-xs max-w-[200px] truncate" title={f.notes || ''}>
                      {f.status === 'completed' && f.outcome ? (
                        <span className="text-zinc-500 line-through">Outcome: {f.outcome}</span>
                      ) : (
                        f.notes || '-'
                      )}
                    </TableCell>

                    {/* Fast Operational Actions */}
                    <TableCell>
                      <div className="flex items-center gap-1.5 flex-wrap">
                        {/* Contextual Action Button */}
                        {f.type === 'renewal' && can('members.edit') && f.status === 'open' && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() =>
                              setRenewalMember(
                                f.member || {
                                  id: f.member_id,
                                  name: f.member_name,
                                  plan_end_date: null,
                                }
                              )
                            }
                            className="h-7 text-[11px] px-2.5 border-purple-600/40 bg-purple-950/20 text-purple-300 hover:bg-purple-950/40"
                          >
                            <RefreshCw className="h-3 w-3 mr-1 text-purple-400" />
                            Renew Now
                          </Button>
                        )}

                        {f.type === 'due' && can('due.view') && f.status === 'open' && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => router.push(`/dashboard/due?search=${encodeURIComponent(f.member_name)}`)}
                            className="h-7 text-[11px] px-2.5 border-amber-600/40 bg-amber-950/20 text-amber-300 hover:bg-amber-950/40 font-mono"
                          >
                            <IndianRupee className="h-3 w-3 mr-1" />
                            Collect
                          </Button>
                        )}

                        {f.type === 'new_lead' && can('members.add') && f.status === 'open' && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() =>
                              router.push(
                                `/dashboard/members/add?name=${encodeURIComponent(f.member_name)}${
                                  phone ? `&phone=${encodeURIComponent(phone)}` : ''
                                }`
                              )
                            }
                            className="h-7 text-[11px] px-2.5 border-blue-600/40 bg-blue-950/20 text-blue-300 hover:bg-blue-950/40"
                          >
                            <UserCheck className="h-3 w-3 mr-1" />
                            Convert Lead
                          </Button>
                        )}

                        {f.type === 'inactive' && waUrl && f.status === 'open' && (
                          <a
                            href={waUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center h-7 text-[11px] px-2.5 rounded-md border border-zinc-700 bg-zinc-900 text-zinc-200 hover:bg-zinc-800"
                          >
                            <MessageCircle className="h-3 w-3 mr-1 text-emerald-400" />
                            Send Nudge
                          </a>
                        )}

                        {/* Quick-Snooze Dropdown Menu */}
                        {f.status === 'open' && can('followups.manage') && (
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-7 text-[10px] px-2 text-zinc-400 hover:text-white"
                                title="Postpone follow-up"
                              >
                                <Clock className="h-3 w-3 mr-1" />
                                Snooze
                                <ChevronDown className="h-2.5 w-2.5 ml-0.5 opacity-60" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="bg-zinc-900 border-zinc-800 text-zinc-200 text-xs">
                              <DropdownMenuItem onClick={() => handleQuickSnooze(f.id, 1)} className="cursor-pointer">
                                +1 Day (Tomorrow)
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => handleQuickSnooze(f.id, 3)} className="cursor-pointer">
                                +3 Days
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => handleQuickSnooze(f.id, 7)} className="cursor-pointer">
                                +7 Days (1 Week)
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        )}

                        {/* Mark Completed Icon Button */}
                        {can('followups.manage') && f.status === 'open' && (
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleOpenCompleteModal(f)}
                            className="h-7 w-7 text-zinc-400 hover:text-emerald-400"
                            title="Mark Call Completed"
                          >
                            <CheckCircle className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </TableCell>

                    {/* Status Badge */}
                    <TableCell className="text-right">
                      <GlowingBadge className={`${getStatusBadgeColor(f.status)} text-[9px] font-semibold rounded px-1.5 py-0.5 capitalize`}>
                        {f.status}
                      </GlowingBadge>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
      </Card>

      {/* Add Follow-up Modal Dialog */}
      <Dialog open={openAddModal} onOpenChange={setOpenAddModal}>
        <DialogContent className="bg-zinc-900 border-zinc-800 text-white max-w-md">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold">Schedule Follow-up Call</DialogTitle>
            <DialogDescription className="text-zinc-500 text-xs">
              Create a manual alert to call a member for dues, renewals, or greetings.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleAddFollowup} className="space-y-4 pt-4">
            <div className="grid gap-2">
              <Label htmlFor="memberSelect" className="text-zinc-300 text-xs font-bold">
                Select Active Member *
              </Label>
              <Select value={selectedMemberId} onValueChange={setSelectedMemberId}>
                <SelectTrigger id="memberSelect" className="border-zinc-800 bg-zinc-950 text-zinc-100">
                  <SelectValue placeholder="Choose a member" />
                </SelectTrigger>
                <SelectContent className="bg-zinc-900 border-zinc-800 text-zinc-100 max-h-[200px]">
                  {members.map((m) => (
                    <SelectItem key={m.id} value={m.id}>
                      {m.name} ({m.member_code})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="typeSelect" className="text-zinc-300 text-xs font-bold">
                Category *
              </Label>
              <Select value={followupType} onValueChange={(val: any) => setFollowupType(val)}>
                <SelectTrigger id="typeSelect" className="border-zinc-800 bg-zinc-950 text-zinc-100">
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent className="bg-zinc-900 border-zinc-800 text-zinc-100">
                  <SelectItem value="renewal">Plan Renewal</SelectItem>
                  <SelectItem value="due">Payment Due</SelectItem>
                  <SelectItem value="inactive">Inactive Check-in</SelectItem>
                  <SelectItem value="new_lead">New Lead Trial</SelectItem>
                  <SelectItem value="general">General Check-in</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="scheduledDate" className="text-zinc-300 text-xs font-bold">
                Scheduled Call Date *
              </Label>
              <Input
                id="scheduledDate"
                type="date"
                required
                value={scheduledDate}
                onChange={(e) => setScheduledDate(e.target.value)}
                className="border-zinc-800 bg-zinc-950 text-zinc-100"
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="notes" className="text-zinc-300 text-xs font-bold">
                Notes
              </Label>
              <Textarea
                id="notes"
                placeholder="Specific discussion points or reminder details..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="border-zinc-800 bg-zinc-950 text-zinc-100 placeholder:text-zinc-700 text-xs resize-none"
                rows={3}
              />
            </div>

            <DialogFooter className="border-t border-zinc-800/60 pt-4 mt-6">
              <Button type="button" variant="ghost" onClick={() => setOpenAddModal(false)} className="text-zinc-400 hover:bg-zinc-800 text-xs">
                Cancel
              </Button>
              <Button type="submit" disabled={adding} className="bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold gap-2">
                {adding ? <Loader2 className="h-4 w-4 animate-spin text-white" /> : <Save className="h-4 w-4" />}
                Save Follow-up
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Complete Follow-up Modal Dialog */}
      <Dialog open={openCompleteModal} onOpenChange={setOpenCompleteModal}>
        <DialogContent className="bg-zinc-900 border-zinc-800 text-white max-w-md">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold">Record Call Outcome</DialogTitle>
            <DialogDescription className="text-zinc-500 text-xs">
              Logging outcome for followup with: {selectedFollowup?.member_name}
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleCompleteFollowup} className="space-y-4 pt-4">
            <div className="grid gap-2">
              <Label htmlFor="outcome" className="text-zinc-300 text-xs font-bold">
                Call Outcome Note *
              </Label>
              <Input
                id="outcome"
                placeholder="e.g. Spoke to member, agreed to renew on Saturday via GPay"
                required
                value={outcome}
                onChange={(e) => setOutcome(e.target.value)}
                className="border-zinc-800 bg-zinc-950 text-zinc-100 placeholder:text-zinc-700 text-xs"
              />
            </div>

            <DialogFooter className="border-t border-zinc-800/60 pt-4 mt-6">
              <Button type="button" variant="ghost" onClick={() => setOpenCompleteModal(false)} className="text-zinc-400 hover:bg-zinc-800 text-xs">
                Cancel
              </Button>
              <Button type="submit" disabled={completing} className="bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold gap-2">
                {completing ? <Loader2 className="h-4 w-4 animate-spin text-white" /> : <CheckCircle className="h-4 w-4" />}
                Log Call Outcome
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* 1-Click Membership Renewal Modal */}
      {renewalMember && (
        <MemberRenewalModal
          open={!!renewalMember}
          onClose={() => setRenewalMember(null)}
          member={renewalMember}
          onSuccess={() => {
            fetchFollowups();
          }}
        />
      )}
    </div>
  );
}
