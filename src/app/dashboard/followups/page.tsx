'use client';

import React, { useEffect, useState } from 'react';
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
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';

export default function FollowupsPage() {
  const supabase = createClient();
  const { user } = useAuth();
  const { can } = usePermission();

  const [loading, setLoading] = useState(true);
  const [followups, setFollowups] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('open');
  const [typeFilter, setTypeFilter] = useState('all');

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

      // Client side search by member name
      let filtered = data || [];
      if (search.trim()) {
        const term = search.toLowerCase().trim();
        filtered = filtered.filter(f => f.member_name.toLowerCase().includes(term));
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
    // Load members for the dropdown selector
    supabase
      .from('members')
      .select('id, name, member_code')
      .eq('gym_id', user.gymId)
      .eq('status', 'active')
      .then(({ data }) => {
        if (data) setMembers(data);
      });
  }, [user?.gymId]);

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
      
      const member = members.find(m => m.id === selectedMemberId);
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

  const getStatusBadgeColor = (status: string) => {
    switch (status) {
      case 'completed': return 'bg-green-500/10 text-green-400 border border-green-500/20';
      case 'missed': return 'bg-red-500/10 text-red-400 border border-red-500/20';
      default: return 'bg-amber-500/10 text-amber-400 border border-amber-500/20';
    }
  };

  const getTypeBadgeColor = (type: string) => {
    switch (type) {
      case 'renewal': return 'bg-purple-950/60 text-purple-300 border border-purple-800/30';
      case 'due': return 'bg-amber-950/60 text-amber-300 border border-amber-800/30';
      case 'inactive': return 'bg-zinc-800 text-zinc-400 border border-zinc-700';
      case 'new_lead': return 'bg-blue-950/60 text-blue-300 border border-blue-800/30';
      default: return 'bg-zinc-800 text-zinc-300';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-zinc-800 pb-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-zinc-100">CRM Follow-ups</h2>
          <p className="text-zinc-500 text-xs mt-1">Manage outbound calls, plan renewals alerts, and lead retention callbacks.</p>
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
              placeholder="Search by member name..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10 border-zinc-800 bg-zinc-950 text-zinc-100 placeholder:text-zinc-700"
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
                <TableHead className="text-zinc-400 font-semibold text-xs">Member Name</TableHead>
                <TableHead className="text-zinc-400 font-semibold text-xs">Call Category</TableHead>
                <TableHead className="text-zinc-400 font-semibold text-xs">Scheduled Date</TableHead>
                <TableHead className="text-zinc-400 font-semibold text-xs">Notes / Details</TableHead>
                <TableHead className="text-zinc-400 font-semibold text-xs">Status</TableHead>
                <TableHead className="text-zinc-400 font-semibold text-xs text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {followups.map((f) => (
                <TableRow key={f.id} className="border-zinc-800/40 hover:bg-zinc-800/10">
                  <TableCell className="font-semibold text-zinc-200 text-xs">{f.member_name}</TableCell>
                  <TableCell>
                    <GlowingBadge className={`${getTypeBadgeColor(f.type)} text-[9px] font-bold rounded-md px-2 py-0.5 capitalize`}>
                      {f.type.replace('_', ' ')}
                    </GlowingBadge>
                  </TableCell>
                  <TableCell className="text-zinc-400 text-xs">{formatDate(f.scheduled_date)}</TableCell>
                  <TableCell className="text-zinc-500 text-xs max-w-[200px] truncate" title={f.notes}>
                    {f.status === 'completed' && f.outcome ? (
                      <span className="text-zinc-500 line-through">Outcome: {f.outcome}</span>
                    ) : (
                      f.notes || '-'
                    )}
                  </TableCell>
                  <TableCell>
                    <GlowingBadge className={`${getStatusBadgeColor(f.status)} text-[9px] font-semibold rounded px-1.5 py-0.5 capitalize`}>
                      {f.status}
                    </GlowingBadge>
                  </TableCell>
                  <TableCell className="text-right">
                    {can('followups.manage') && f.status === 'open' ? (
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleOpenCompleteModal(f)}
                        className="h-8 w-8 text-zinc-400 hover:text-green-400"
                        title="Mark Call Completed"
                      >
                        <CheckCircle className="h-4.5 w-4.5" />
                      </Button>
                    ) : (
                      <span className="text-[10px] text-zinc-500 block py-1.5">Action logged</span>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </Card>

      {/* Add Follow-up Modal Dialog */}
      <Dialog open={openAddModal} onOpenChange={setOpenAddModal}>
        <DialogContent className="bg-zinc-900 border-zinc-800 text-white max-w-md">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold">Schedule Follow-up Call</DialogTitle>
            <DialogDescription className="text-zinc-500 text-xs">Create a manual alert to call a member for dues, renewals, or greetings.</DialogDescription>
          </DialogHeader>

          <form onSubmit={handleAddFollowup} className="space-y-4 pt-4">
            <div className="grid gap-2">
              <Label htmlFor="memberSelect" className="text-zinc-300 text-xs font-bold">Select Active Member *</Label>
              <Select value={selectedMemberId} onValueChange={setSelectedMemberId}>
                <SelectTrigger id="memberSelect" className="border-zinc-800 bg-zinc-950 text-zinc-100">
                  <SelectValue placeholder="Choose a member" />
                </SelectTrigger>
                <SelectContent className="bg-zinc-900 border-zinc-800 text-zinc-100 max-h-[200px]">
                  {members.map(m => (
                    <SelectItem key={m.id} value={m.id}>{m.name} ({m.member_code})</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="fType" className="text-zinc-300 text-xs font-bold">Call Reason *</Label>
                <Select value={followupType} onValueChange={(v: any) => setFollowupType(v)}>
                  <SelectTrigger id="fType" className="border-zinc-800 bg-zinc-950 text-zinc-100 capitalize">
                    <SelectValue placeholder="Select reason" />
                  </SelectTrigger>
                  <SelectContent className="bg-zinc-900 border-zinc-800 text-zinc-100">
                    <SelectItem value="renewal">Plan Renewal</SelectItem>
                    <SelectItem value="due">Payment Due</SelectItem>
                    <SelectItem value="inactive">Inactive Alert</SelectItem>
                    <SelectItem value="new_lead">New Lead</SelectItem>
                    <SelectItem value="general">General Followup</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="schedDate" className="text-zinc-300 text-xs font-bold">Schedule Date *</Label>
                <Input
                  id="schedDate"
                  type="date"
                  value={scheduledDate}
                  onChange={(e) => setScheduledDate(e.target.value)}
                  className="border-zinc-800 bg-zinc-950 text-zinc-100"
                />
              </div>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="fNotes" className="text-zinc-300 text-xs">Call Notes / Context</Label>
              <Textarea
                id="fNotes"
                rows={3}
                placeholder="e.g. ROHAN MEHTA expiring next week, call to offer quarterly discounts"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="border-zinc-800 bg-zinc-950 text-zinc-100 text-xs"
              />
            </div>

            <DialogFooter className="border-t border-zinc-800/60 pt-4 mt-6">
              <Button type="button" variant="ghost" onClick={() => setOpenAddModal(false)} className="text-zinc-400 hover:bg-zinc-800 text-xs">
                Cancel
              </Button>
              <Button type="submit" disabled={adding} className="bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold gap-2">
                {adding ? <Loader2 className="h-4 w-4 animate-spin text-white" /> : <Save className="h-4 w-4" />}
                Schedule Task
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
              <Label htmlFor="outcome" className="text-zinc-300 text-xs font-bold">Call Outcome Note *</Label>
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
    </div>
  );
}
