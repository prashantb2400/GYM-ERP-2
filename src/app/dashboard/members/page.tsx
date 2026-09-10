'use client';

import React, { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useBranch } from '@/hooks/useBranch';
import type { Member } from '@/types/database';
import { usePermission } from '@/hooks/usePermission';
import {
  Users,
  Search,
  UserPlus,
  Filter,
  Eye,
  Edit2,
  Trash2,
  CheckCircle2,
  XCircle,
  Video,
  Fingerprint,
  Loader2,
  Download,
  MessageCircle,
} from 'lucide-react';
import { Checkbox } from '@/components/ui/checkbox';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { GlowingBadge } from '@/components/magicui/glowing-badge';
import { BorderBeam } from '@/components/magicui/border-beam';
import { ShimmerCard } from '@/components/magicui/shimmer-card';
import { GradientText } from '@/components/magicui/gradient-text';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { getInitials, formatDate, formatPhone } from '@/lib/utils/format';
import Link from 'next/link';
import { toast } from 'sonner';
import { QuickAddMember } from '@/components/shared/QuickAddMember';
import { useSearchParams } from 'next/navigation';

export default function MembersListPage() {
  const supabase = createClient();
  const { user } = useAuth();
  const { can } = usePermission();
  const { selectedBranchId, isOwner } = useBranch();

  const [loading, setLoading] = useState(true);
  const [members, setMembers] = useState<(Member & { plans?: { name: string } | null })[]>([]);
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [biometricFilter, setBiometricFilter] = useState('all');
  const [quickAddOpen, setQuickAddOpen] = useState(false);
  const searchParams = useSearchParams();
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkSending, setBulkSending] = useState(false);

  useEffect(() => {
    const filterParam = searchParams.get('filter');
    if (filterParam === 'expiring') {
      setStatusFilter('expiring');
    }
  }, [searchParams]);
  
  // Pagination states
  const [page, setPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const pageSize = 8;

  // Debounce search input
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(search);
      setPage(1); // Reset to first page on search change
    }, 300);

    return () => clearTimeout(handler);
  }, [search]);

  const fetchMembers = async () => {
    if (!user?.gymId) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const from = (page - 1) * pageSize;
      const to = from + pageSize - 1;

      let query = supabase
        .from('members')
        .select('*, plans(name)', { count: 'exact' })
        .eq('gym_id', user.gymId)
        .order('created_at', { ascending: false });

      // Branch isolation: staff sees their branch, owner sees selected branch or all
      const effectiveBranchId = !isOwner ? user?.branchId : selectedBranchId;
      if (effectiveBranchId) {
        query = query.eq('branch_id', effectiveBranchId);
      }

      if (user.role === 'trainer' && user.staffRecordId) {
        query = query.eq('trainer_id', user.staffRecordId);
      }

      if (statusFilter === 'expiring') {
        const sevenDaysLater = new Date();
        sevenDaysLater.setDate(sevenDaysLater.getDate() + 7);
        const today = new Date().toISOString().split('T')[0];
        const sevenDaysStr = sevenDaysLater.toISOString().split('T')[0];
        query = query
          .gte('plan_end_date', today)
          .lte('plan_end_date', sevenDaysStr)
          .eq('status', 'active');
      } else if (statusFilter !== 'all') {
        query = query.eq('status', statusFilter);
      }

      if (biometricFilter === 'face') {
        query = query.eq('face_enrolled', true);
      } else if (biometricFilter === 'finger') {
        query = query.eq('biometric_enrolled', true);
      } else if (biometricFilter === 'none') {
        query = query.eq('face_enrolled', false).eq('biometric_enrolled', false);
      }

      if (debouncedSearch.trim()) {
        query = query.or(`name.ilike.%${debouncedSearch.trim()}%,phone.ilike.%${debouncedSearch.trim()}%,member_code.ilike.%${debouncedSearch.trim()}%`);
      }

      // Add pagination constraints
      query = query.range(from, to);

      const { data, error, count } = await query;
      if (error) throw error;
      
      setMembers(data || []);
      setTotalCount(count || 0);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Unknown error';
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    setSelectedIds(new Set());
    fetchMembers();
  }, [user?.gymId, selectedBranchId, user?.branchId, statusFilter, biometricFilter, debouncedSearch, page]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchMembers();
  };

  const getStatusBadgeColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-500/10 text-green-400 border-green-500/20';
      case 'expired': return 'bg-red-500/10 text-red-400 border-red-500/20';
      case 'pending': return 'bg-amber-500/10 text-amber-400 border-amber-500/20';
      case 'frozen': return 'bg-blue-500/10 text-blue-400 border-blue-500/20';
      default: return 'bg-zinc-500/10 text-zinc-400 border-zinc-500/20';
    }
  };

  const handleDeleteMember = async (id: string, name: string) => {
    if (!confirm(`Are you sure you want to permanently delete member: ${name}?`)) return;

    try {
      setLoading(true);
      const { error } = await supabase.from('members').delete().eq('id', id);
      if (error) throw error;
      
      toast.success('Member profile deleted');
      setMembers(prev => prev.filter(m => m.id !== id));
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'An unknown error occurred';
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleExportCSV = async () => {
    if (!user?.gymId) return;
    
    try {
      toast.info('Preparing export...');
      
      let query = supabase
        .from('members')
        .select('member_code, name, phone, email, status, plan_end_date, admission_date, total_due, plans(name)')
        .eq('gym_id', user.gymId);

      if (user.role === 'trainer' && user.staffRecordId) {
        query = query.eq('trainer_id', user.staffRecordId);
      }

      const { data, error } = await query.order('name', { ascending: true });
      
      if (error) throw error;
      if (!data || data.length === 0) {
        toast.warning('No members to export');
        return;
      }
      
      const headers = ['Member Code', 'Name', 'Phone', 'Email', 'Status', 'Plan', 'Plan End Date', 'Admission Date', 'Dues (₹)'];
      const rows = data.map(m => [
        m.member_code || '',
        m.name || '',
        m.phone || '',
        m.email || '',
        m.status || '',
        (m.plans as any)?.name || '',
        m.plan_end_date || '',
        m.admission_date || '',
        m.total_due || 0,
      ]);
      
      const csvContent = [
        headers.join(','),
        ...rows.map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','))
      ].join('\\n');
      
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `members_${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      
      toast.success(`Exported ${data.length} members`);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'An unknown error occurred';
      toast.error('Export failed: ' + msg);
    }
  };

  const handleBulkWhatsApp = async () => {
    if (!user?.gymId || selectedIds.size === 0) return;

    const selectedMembers = members.filter(m => selectedIds.has(m.id));
    const confirm = window.confirm(
      `Send WhatsApp message to ${selectedMembers.length} selected members?`
    );
    if (!confirm) return;

    setBulkSending(true);
    let sent = 0;
    let failed = 0;

    for (const member of selectedMembers) {
      try {
        const phone = member.whatsapp_phone || member.phone;
        if (!phone) { failed++; continue; }

        await fetch('/api/whatsapp/send', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            gymId: user.gymId,
            phone,
            templateName: 'renewal_reminder',
            variables: {
              member_name: member.name,
              plan_end_date: member.plan_end_date || 'soon',
            },
          }),
        });
        sent++;
        await new Promise(r => setTimeout(r, 150));
      } catch { failed++; }
    }

    setBulkSending(false);
    setSelectedIds(new Set());
    if (failed === 0) toast.success(`✅ Sent WhatsApp to ${sent} members`);
    else toast.warning(`Sent ${sent}, failed ${failed} (no phone number)`);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <GradientText className="text-2xl font-bold tracking-tight">Gym Members</GradientText>
          <p className="text-zinc-500 text-xs mt-1">Manage active plans, profiles, biometric enrollments, and check-ins.</p>
        </div>
        {can('members.add') && (
          <div className="flex gap-2 items-center">
            <Button variant="outline" size="sm" onClick={handleExportCSV} className="border-zinc-700 text-zinc-300 hover:bg-zinc-800 h-9">
              <Download className="h-4 w-4 mr-2" />
              Export CSV
            </Button>
            <Button 
              variant="outline" 
              className="border-purple-600/50 text-purple-400 hover:bg-purple-600/10 gap-2 font-medium"
              onClick={() => setQuickAddOpen(true)}
            >
              ⚡ Quick Add
            </Button>
            <Link href="/dashboard/members/add" passHref legacyBehavior>
              <Button className="bg-purple-600 hover:bg-purple-700 text-white gap-2 font-medium">
                <UserPlus className="h-4 w-4" /> Add New Member
              </Button>
            </Link>
          </div>
        )}
      </div>

      <QuickAddMember 
        open={quickAddOpen} 
        onClose={() => setQuickAddOpen(false)} 
        onSuccess={fetchMembers} 
      />

      {/* Filter Bar */}
      <Card className="border-zinc-800 bg-zinc-900/40 p-4 relative">
        <BorderBeam />
        <form onSubmit={handleSearchSubmit} className="flex flex-col md:flex-row gap-4 items-stretch md:items-center">
          {/* Search bar */}
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-500" />
            <Input
              placeholder="Search by code, name, or phone number..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10 border-zinc-800 bg-zinc-950 text-zinc-100 placeholder:text-zinc-700 focus:border-purple-600"
            />
          </div>

          <div className="flex flex-wrap gap-4 items-center">
            {/* Status select */}
            <div className="w-[140px]">
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="border-zinc-800 bg-zinc-950 text-zinc-100 text-xs">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent className="bg-zinc-900 border-zinc-800 text-zinc-100 text-xs">
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="expiring">Expiring in 7 days</SelectItem>
                  <SelectItem value="expired">Expired</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="frozen">Frozen</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Biometric filter */}
            <div className="w-[160px]">
              <Select value={biometricFilter} onValueChange={setBiometricFilter}>
                <SelectTrigger className="border-zinc-800 bg-zinc-950 text-zinc-100 text-xs">
                  <SelectValue placeholder="Biometrics" />
                </SelectTrigger>
                <SelectContent className="bg-zinc-900 border-zinc-800 text-zinc-100 text-xs">
                  <SelectItem value="all">All Enrolled</SelectItem>
                  <SelectItem value="face">Face Enrolled</SelectItem>
                  <SelectItem value="finger">Finger Enrolled</SelectItem>
                  <SelectItem value="none">Not Enrolled</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <Button type="submit" variant="secondary" className="bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs px-4 h-9">
              Apply Filters
            </Button>
          </div>
        </form>
      </Card>

      {/* Bulk Action Bar */}
      {selectedIds.size > 0 && (
        <div className="flex items-center gap-3 rounded-xl bg-purple-950/30 border border-purple-700/40 px-4 py-3 animate-in slide-in-from-top-2">
          <span className="text-sm text-purple-300 font-medium">
            {selectedIds.size} member{selectedIds.size > 1 ? 's' : ''} selected
          </span>
          <div className="flex-1" />
          <Button
            size="sm"
            variant="outline"
            onClick={() => setSelectedIds(new Set())}
            className="border-zinc-700 text-zinc-400 h-8"
          >
            Clear
          </Button>
          <Button
            size="sm"
            onClick={handleBulkWhatsApp}
            disabled={bulkSending}
            className="bg-green-700 hover:bg-green-600 text-white h-8"
          >
            {bulkSending
              ? <><Loader2 className="h-3 w-3 mr-1 animate-spin" />Sending...</>
              : <><MessageCircle className="h-3 w-3 mr-1" />Send WhatsApp ({selectedIds.size})</>}
          </Button>
        </div>
      )}

      {/* Members Table */}
      <Card className="border-zinc-800 bg-zinc-900/40 overflow-hidden">
        {loading ? (
          <div className="p-6 space-y-4">
            <ShimmerCard className="h-12 w-full rounded-md" />
            <ShimmerCard className="h-12 w-full rounded-md" />
            <ShimmerCard className="h-12 w-full rounded-md" />
            <ShimmerCard className="h-12 w-full rounded-md" />
            <ShimmerCard className="h-12 w-full rounded-md" />
          </div>
        ) : members.length === 0 ? (
          <div className="text-center py-20 text-zinc-500">No members found matching the active criteria.</div>
        ) : (
          <Table>
            <TableHeader className="bg-zinc-900/60 border-zinc-800">
              <TableRow className="border-zinc-800">
                <TableHead className="w-10">
                  <Checkbox
                    checked={members.length > 0 && selectedIds.size === members.length}
                    onCheckedChange={(checked) => {
                      if (checked) setSelectedIds(new Set(members.map(m => m.id)));
                      else setSelectedIds(new Set());
                    }}
                    className="border-zinc-600"
                  />
                </TableHead>
                <TableHead className="text-zinc-400 font-semibold text-xs">Member Code</TableHead>
                <TableHead className="text-zinc-400 font-semibold text-xs">Name</TableHead>
                <TableHead className="text-zinc-400 font-semibold text-xs">Contact</TableHead>
                <TableHead className="text-zinc-400 font-semibold text-xs">Status</TableHead>
                <TableHead className="text-zinc-400 font-semibold text-xs">Plan Active</TableHead>
                <TableHead className="text-zinc-400 font-semibold text-xs">End Date</TableHead>
                <TableHead className="text-zinc-400 font-semibold text-xs text-center">HW Status</TableHead>
                <TableHead className="text-zinc-400 font-semibold text-xs text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {members.map((member) => (
                <TableRow key={member.id} className="border-zinc-800/40 hover:bg-zinc-800/10">
                  <TableCell>
                    <Checkbox
                      checked={selectedIds.has(member.id)}
                      onCheckedChange={(checked) => {
                        setSelectedIds(prev => {
                          const next = new Set(prev);
                          if (checked) next.add(member.id);
                          else next.delete(member.id);
                          return next;
                        });
                      }}
                      className="border-zinc-600"
                    />
                  </TableCell>
                  <TableCell className="font-semibold text-zinc-300 text-xs">{member.member_code}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <Avatar className="h-8 w-8 bg-zinc-800 border border-zinc-800">
                        {member.photo_url ? (
                          <AvatarImage src={member.photo_url} alt={member.name} />
                        ) : null}
                        <AvatarFallback className="text-[10px] font-bold bg-purple-900/60 text-purple-300">
                          {getInitials(member.name)}
                        </AvatarFallback>
                      </Avatar>
                      <span className="font-medium text-zinc-200 text-xs">{member.name}</span>
                    </div>
                  </TableCell>
                  <TableCell className="text-zinc-400 text-xs">{formatPhone(member.phone)}</TableCell>
                  <TableCell>
                    <GlowingBadge variant={member.status as any} pulse={member.status === 'active'}>
                      {member.status}
                    </GlowingBadge>
                  </TableCell>
                  <TableCell className="text-zinc-300 font-medium text-xs">
                    {member.plans?.name || 'No Plan'}
                  </TableCell>
                  <TableCell className="text-zinc-400 text-xs">
                    {member.plan_end_date ? formatDate(member.plan_end_date) : '-'}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center justify-center gap-2">
                      <span title={member.face_enrolled ? 'Face recognition enrolled' : 'Face recognition pending'}>
                        <Video
                          className={`h-4 w-4 ${
                            member.face_enrolled ? 'text-green-400' : 'text-zinc-600'
                          }`}
                        />
                      </span>
                      <span title={member.biometric_enrolled ? 'Biometric fingerprint enrolled' : 'Fingerprint pending'}>
                        <Fingerprint
                          className={`h-4 w-4 ${
                            member.biometric_enrolled ? 'text-green-400' : 'text-zinc-600'
                          }`}
                        />
                      </span>
                    </div>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-1.5">
                      <Link href={`/dashboard/members/${member.id}`} passHref legacyBehavior>
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-zinc-400 hover:text-white">
                          <Eye className="h-4 w-4" />
                        </Button>
                      </Link>
                      {can('members.edit') && (
                        <Link href={`/dashboard/members/edit/${member.id}`} passHref legacyBehavior>
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-zinc-400 hover:text-white">
                            <Edit2 className="h-4 w-4" />
                          </Button>
                        </Link>
                      )}
                      {can('members.delete') && (
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDeleteMember(member.id, member.name)}
                          className="h-8 w-8 text-zinc-400 hover:text-red-400"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}

        {/* Pagination Footer */}
        {totalCount > pageSize && (
          <div className="flex items-center justify-between px-6 py-4 border-t border-zinc-800 bg-zinc-950/20">
            <span className="text-xs text-zinc-500 font-medium">
              Showing <span className="text-zinc-300 font-bold">{Math.min(totalCount, (page - 1) * pageSize + 1)}</span> to{' '}
              <span className="text-zinc-300 font-bold">{Math.min(totalCount, page * pageSize)}</span> of{' '}
              <span className="text-zinc-300 font-bold">{totalCount}</span> members
            </span>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage(prev => Math.max(1, prev - 1))}
                disabled={page === 1}
                className="h-8 border-zinc-800 text-zinc-400 hover:text-white disabled:opacity-50 text-xs px-3"
              >
                Previous
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage(prev => Math.min(Math.ceil(totalCount / pageSize), prev + 1))}
                disabled={page >= Math.ceil(totalCount / pageSize)}
                className="h-8 border-zinc-800 text-zinc-400 hover:text-white disabled:opacity-50 text-xs px-3"
              >
                Next
              </Button>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
}
