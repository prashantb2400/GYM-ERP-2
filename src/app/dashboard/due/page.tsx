'use client';

import React, { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { usePermission } from '@/hooks/usePermission';
import {
  IndianRupee,
  Search,
  CheckCircle,
  AlertCircle,
  Loader2,
  Calendar,
  User,
  PlusCircle,
  Save,
  ArrowRight,
  MessageCircle,
  FileSpreadsheet,
} from 'lucide-react';
import { exportToExcel } from '@/lib/export/excel-export';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { formatCurrency, formatDate } from '@/lib/utils/format';
import { toast } from 'sonner';
import { GradientText, GlowingBadge, GlowCard, NumberTicker } from '@/components/magicui';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { PAYMENT_MODES } from '@/lib/utils/constants';

export default function DueCollectionPage() {
  const supabase = createClient();
  const { user } = useAuth();
  const { can } = usePermission();

  const [loading, setLoading] = useState(true);
  const [duesList, setDuesList] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  const [bulkSending, setBulkSending] = useState(false);
  
  // Dues collection modal states
  const [openCollectModal, setOpenCollectModal] = useState(false);
  const [collecting, setCollecting] = useState(false);
  const [selectedMember, setSelectedMember] = useState<any>(null);
  
  // Form states
  const [collectAmount, setCollectAmount] = useState('');
  const [paymentMode, setPaymentMode] = useState<'cash' | 'upi' | 'card' | 'bank_transfer' | 'online' | ''>('');
  const [transactionId, setTransactionId] = useState('');
  const [notes, setNotes] = useState('');

  const fetchDues = async () => {
    if (!user?.gymId) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      // Fetch members who have total_due > 0
      const query = supabase
        .from('members')
        .select('*, plans(name)')
        .eq('gym_id', user.gymId)
        .gt('total_due', 0)
        .order('total_due', { ascending: false });

      const { data, error } = await query;
      if (error) throw error;

      // Client-side search by name / member code
      let filtered = data || [];
      if (search.trim()) {
        const term = search.toLowerCase().trim();
        filtered = filtered.filter(m => 
          m.name.toLowerCase().includes(term) || 
          m.member_code.toLowerCase().includes(term)
        );
      }

      setDuesList(filtered);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'An unknown error occurred';
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDues();
  }, [user?.gymId, search]);

  const handleBulkReminder = async () => {
    if (!user?.gymId || duesList.length === 0) return;

    const confirm = window.confirm(
      `Send WhatsApp payment reminder to ${duesList.length} members with dues?\n\nThis will send the "due_payment_reminder" template to each member.`
    );
    if (!confirm) return;

    setBulkSending(true);
    let sent = 0;
    let failed = 0;

    try {
      // Send reminders one by one with a small delay to avoid rate limits
      for (const member of duesList) {
        try {
          const phone = member.whatsapp_phone || member.phone;
          if (!phone) { failed++; continue; }

          await fetch('/api/whatsapp/send', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              gymId: user.gymId,
              phone,
              templateName: 'due_payment_reminder',
              variables: {
                member_name: member.name,
                amount_due: `₹${Number(member.total_due).toLocaleString('en-IN')}`,
                gym_name: 'your gym', // Will be filled from gym context
              },
            }),
          });
          sent++;
          // Small delay between messages to respect rate limits
          await new Promise(r => setTimeout(r, 200));
        } catch {
          failed++;
        }
      }

      if (failed === 0) {
        toast.success(`✅ Sent reminders to ${sent} members`);
      } else {
        toast.warning(`Sent ${sent} reminders. ${failed} failed (no phone number).`);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'An unknown error occurred';
      toast.error('Bulk send failed: ' + msg);
    } finally {
      setBulkSending(false);
    }
  };

  const handleExportDues = () => {
    if (duesList.length === 0) {
      toast.warning('No dues to export');
      return;
    }

    try {
      const today = new Date().toISOString().split('T')[0];
      const totalOutstanding = duesList.reduce((sum, m) => sum + (Number(m.total_due) || 0), 0);

      const duesData = duesList.map(m => ({
        'Member Code': m.member_code || '',
        'Member Name': m.name || '',
        'Mobile Number': m.phone || '',
        'Email': m.email || '',
        'Plan': (m.plans as any)?.name || 'No Plan',
        'Plan Expiry': m.plan_end_date || '-',
        'Outstanding Due (₹)': Number(m.total_due) || 0,
        'Last Payment Date': m.last_payment_date ? new Date(m.last_payment_date).toLocaleDateString('en-IN') : '-',
      }));

      const summaryData = [
        { 'Metric': 'Members with Dues', 'Value': duesList.length },
        { 'Metric': 'Total Outstanding Amount', 'Value': `₹${totalOutstanding.toLocaleString('en-IN')}` },
        { 'Metric': 'Report Generated At', 'Value': new Date().toLocaleString('en-IN') },
      ];

      exportToExcel({
        filename: `outstanding_dues_${today}.xlsx`,
        sheets: [
          { sheetName: 'Dues Register', data: duesData },
          { sheetName: 'Dues Summary', data: summaryData },
        ],
      });

      toast.success(`Exported ${duesList.length} due records to Excel`);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'An unknown error occurred';
      console.error('Export dues error:', err);
      toast.error('Export failed: ' + msg);
    }
  };

  const handleSingleReminder = async (member: any) => {
    const phone = member.whatsapp_phone || member.phone;
    if (!phone) {
      toast.error('No phone number for this member');
      return;
    }
    try {
      await fetch('/api/whatsapp/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          gymId: user?.gymId,
          phone,
          templateName: 'due_payment_reminder',
          variables: {
            member_name: member.name,
            amount_due: `₹${Number(member.total_due).toLocaleString('en-IN')}`,
            gym_name: 'your gym',
          },
        }),
      });
      toast.success(`Reminder sent to ${member.name}`);
    } catch {
      toast.error('Failed to send reminder');
    }
  };

  const handleOpenCollectModal = (member: any) => {
    if (!can('due.collect')) {
      toast.error('You do not have permission to collect dues');
      return;
    }
    setSelectedMember(member);
    setCollectAmount(String(member.total_due));
    setPaymentMode('');
    setTransactionId('');
    setNotes('');
    setOpenCollectModal(true);
  };

  const handleRecordCollection = async (e: React.FormEvent) => {
    e.preventDefault();
    const amount = parseFloat(collectAmount);

    if (!selectedMember || isNaN(amount) || amount <= 0) {
      toast.error('Please enter a valid collection amount');
      return;
    }
    if (amount > selectedMember.total_due) {
      toast.error(`Cannot collect more than outstanding due: ₹${selectedMember.total_due}`);
      return;
    }
    if (!paymentMode) {
      toast.error('Please select a payment mode');
      return;
    }

    try {
      setCollecting(true);

      // 1. Record in due_records database
      // Find the pending due record for this member
      const { data: pendingDues } = await supabase
        .from('due_records')
        .select('*')
        .eq('member_id', selectedMember.id)
        .eq('status', 'pending')
        .limit(1);

      const dueRecord = pendingDues?.[0];

      if (dueRecord) {
        const newCollected = Number(dueRecord.collected_amount || 0) + amount;
        const newStatus = newCollected >= Number(dueRecord.amount) ? 'collected' : 'partial';

        await supabase
          .from('due_records')
          .update({
            collected_amount: newCollected,
            status: newStatus,
            payment_mode: paymentMode,
            collected_at: new Date().toISOString(),
            collected_by: user?.id,
            notes: notes.trim() || null,
          })
          .eq('id', dueRecord.id);
      } else {
        // Create manual due record collection fallback
        await supabase.from('due_records').insert({
          gym_id: user?.gymId,
          member_id: selectedMember.id,
          amount: selectedMember.total_due,
          collected_amount: amount,
          status: amount >= selectedMember.total_due ? 'collected' : 'partial',
          payment_mode: paymentMode,
          collected_at: new Date().toISOString(),
          collected_by: user?.id,
          notes: notes.trim() || null,
        });
      }

      // 2. Update members table total_due and total_paid_lifetime
      const { error: memberError } = await supabase
        .from('members')
        .update({
          total_due: Math.max(0, Number(selectedMember.total_due) - amount),
          total_paid_lifetime: Number(selectedMember.total_paid_lifetime || 0) + amount,
        })
        .eq('id', selectedMember.id);

      if (memberError) throw memberError;

      // 3. Update the associated Invoice dues
      // Fetch latest unpaid or partial invoice
      const { data: invoices } = await supabase
        .from('invoices')
        .select('*')
        .eq('member_id', selectedMember.id)
        .in('status', ['pending', 'partial'])
        .order('issued_at', { ascending: false })
        .limit(1);

      const activeInvoice = invoices?.[0];
      if (activeInvoice) {
        const newPaid = Number(activeInvoice.amount_paid || 0) + amount;
        const newDue = Math.max(0, Number(activeInvoice.amount_due) - amount);
        const newInvStatus = newDue === 0 ? 'paid' : 'partial';

        await supabase
          .from('invoices')
          .update({
            amount_paid: newPaid,
            amount_due: newDue,
            status: newInvStatus,
            transaction_id: transactionId.trim() || activeInvoice.transaction_id,
          })
          .eq('id', activeInvoice.id);
      }

      toast.success(`Dues collected successfully from ${selectedMember.name}!`);
      
      // Simulate WhatsApp trigger receipt
      await supabase.from('whatsapp_logs').insert({
        gym_id: user?.gymId,
        member_id: selectedMember.id,
        recipient_phone: selectedMember.phone,
        recipient_name: selectedMember.name,
        message_type: 'text',
        wa_message_id: 'wa_due_receipt_' + Date.now(),
        status: 'delivered',
      });

      setOpenCollectModal(false);
      fetchDues();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'An unknown error occurred';
      toast.error(msg);
    } finally {
      setCollecting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-zinc-800 pb-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-zinc-100">Outstanding Dues</h2>
          <p className="text-zinc-500 text-xs mt-1">Track pending member fees, send warnings, and record collections.</p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleExportDues}
            disabled={duesList.length === 0}
            className="border-zinc-700 text-zinc-300 hover:bg-zinc-800 gap-1.5"
          >
            <FileSpreadsheet className="h-4 w-4 text-emerald-400" />
            Export Excel
          </Button>
          <Button
            onClick={handleBulkReminder}
            disabled={bulkSending || duesList.length === 0}
            className="bg-green-700 hover:bg-green-600 text-white"
            size="sm"
          >
            {bulkSending ? (
              <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Sending...</>
            ) : (
              <><MessageCircle className="h-4 w-4 mr-2" />Send Reminder to All ({duesList.length})</>
            )}
          </Button>
        </div>
      </div>

      {/* Filter Bar */}
      <GlowCard className="border-zinc-800 bg-zinc-900/40 p-4">
        <div className="flex flex-col md:flex-row gap-4 items-stretch md:items-center">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-500" />
            <Input
              placeholder="Search member by code or name..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10 border-zinc-800 bg-zinc-950 text-zinc-100 placeholder:text-zinc-700"
            />
          </div>
        </div>
      </GlowCard>

      {/* Dues List Table */}
      <GlowCard className="border-zinc-800 bg-zinc-900/40 overflow-hidden">
        {loading ? (
          <div className="flex justify-center items-center py-20">
            <Loader2 className="h-8 w-8 animate-spin text-purple-600" />
          </div>
        ) : duesList.length === 0 ? (
          <div className="text-center py-20 text-zinc-500">No active members have outstanding dues. Good job! 👏</div>
        ) : (
          <Table>
            <TableHeader className="bg-zinc-900/60 border-zinc-800">
              <TableRow className="border-zinc-800">
                <TableHead className="text-zinc-400 font-semibold text-xs">Code</TableHead>
                <TableHead className="text-zinc-400 font-semibold text-xs">Member Name</TableHead>
                <TableHead className="text-zinc-400 font-semibold text-xs">Assigned Plan</TableHead>
                <TableHead className="text-zinc-400 font-semibold text-xs">Plan End Date</TableHead>
                <TableHead className="text-zinc-400 font-semibold text-xs">Outstanding Dues</TableHead>
                <TableHead className="text-zinc-400 font-semibold text-xs">Lifetime Paid</TableHead>
                <TableHead className="text-zinc-400 font-semibold text-xs text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {duesList.map((m) => (
                <TableRow key={m.id} className="border-zinc-800/40 hover:bg-zinc-800/10">
                  <TableCell className="font-semibold text-zinc-300 text-xs">{m.member_code}</TableCell>
                  <TableCell className="font-medium text-zinc-200 text-xs">{m.name}</TableCell>
                  <TableCell className="text-zinc-300 text-xs">{m.plans?.name || 'Expired / No Plan'}</TableCell>
                  <TableCell className="text-zinc-400 text-xs">{m.plan_end_date ? formatDate(m.plan_end_date) : '-'}</TableCell>
                  <TableCell className="font-bold text-amber-400 text-xs">{formatCurrency(m.total_due)}</TableCell>
                  <TableCell className="text-zinc-400 text-xs">{formatCurrency(m.total_paid_lifetime)}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-2">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-green-500 hover:text-green-400 hover:bg-green-950/30"
                        onClick={() => handleSingleReminder(m)}
                        title="Send WhatsApp reminder"
                      >
                        <MessageCircle className="h-4 w-4" />
                      </Button>
                      {can('due.collect') ? (
                        <Button
                          onClick={() => handleOpenCollectModal(m)}
                          className="bg-purple-600 hover:bg-purple-700 text-white text-xs h-8 font-medium gap-1 px-3 shadow"
                        >
                          <IndianRupee className="h-3.5 w-3.5" /> Collect Dues
                        </Button>
                      ) : (
                        <span className="text-[10px] text-zinc-600 italic">Read-only</span>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </GlowCard>

      {/* Collect Dues Dialog Modal */}
      <Dialog open={openCollectModal} onOpenChange={setOpenCollectModal}>
        <DialogContent className="bg-zinc-900 border-zinc-800 text-white max-w-md">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold">Record Due Collection</DialogTitle>
            <DialogDescription className="text-zinc-500 text-xs">
              Logging outstanding payments from {selectedMember?.name} ({selectedMember?.member_code}).
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleRecordCollection} className="space-y-4 pt-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="border border-zinc-800/60 p-3 rounded-lg bg-zinc-950/20">
                <span className="text-[10px] text-zinc-500 font-semibold uppercase">Total Outstanding</span>
                <div className="text-md font-bold text-amber-400 mt-1">₹{selectedMember?.total_due}</div>
              </div>
              <div className="border border-zinc-800/60 p-3 rounded-lg bg-zinc-950/20">
                <span className="text-[10px] text-zinc-500 font-semibold uppercase">Plan Duration</span>
                <div className="text-xs text-zinc-300 mt-1 font-semibold truncate">
                  {selectedMember?.plans?.name || 'No Active Plan'}
                </div>
              </div>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="collectVal" className="text-zinc-300 text-xs font-bold">Amount to Collect (₹) *</Label>
              <Input
                id="collectVal"
                type="number"
                min={0}
                required
                value={collectAmount}
                onChange={(e) => setCollectAmount(e.target.value)}
                className="border-zinc-800 bg-zinc-950 text-zinc-100 font-extrabold text-lg focus:border-purple-600"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="payMode" className="text-zinc-300 text-xs font-bold">Payment Mode *</Label>
                <Select value={paymentMode} onValueChange={(v: any) => setPaymentMode(v)}>
                  <SelectTrigger id="payMode" className="border-zinc-800 bg-zinc-950 text-zinc-100 capitalize text-xs">
                    <SelectValue placeholder="Select" />
                  </SelectTrigger>
                  <SelectContent className="bg-zinc-900 border-zinc-800 text-zinc-100 text-xs">
                    {PAYMENT_MODES.map(pm => (
                      <SelectItem key={pm} value={pm} className="capitalize">{pm.replace('_', ' ')}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="tx" className="text-zinc-300 text-xs">Reference ID</Label>
                <Input
                  id="tx"
                  placeholder="UPI transaction code"
                  value={transactionId}
                  onChange={(e) => setTransactionId(e.target.value)}
                  className="border-zinc-800 bg-zinc-950 text-zinc-100 text-xs"
                />
              </div>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="collNotes" className="text-zinc-300 text-xs">Receipt / Log Notes</Label>
              <Input
                id="collNotes"
                placeholder="e.g. Cleared remaining balance, thanks"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="border-zinc-800 bg-zinc-950 text-zinc-100 text-xs"
              />
            </div>

            <DialogFooter className="border-t border-zinc-800/60 pt-4 mt-6">
              <Button type="button" variant="ghost" onClick={() => setOpenCollectModal(false)} className="text-zinc-400 hover:bg-zinc-800 text-xs">
                Cancel
              </Button>
              <Button type="submit" disabled={collecting} className="bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold gap-2">
                {collecting ? <Loader2 className="h-4 w-4 animate-spin text-white" /> : <CheckCircle className="h-4 w-4" />}
                Record Payment
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
