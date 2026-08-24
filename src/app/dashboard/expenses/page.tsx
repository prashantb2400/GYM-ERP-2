'use client';

import React, { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import type { Expense } from '@/types/database';
import { usePermission } from '@/hooks/usePermission';
import {
  Wallet,
  PlusCircle,
  Search,
  Filter,
  Trash2,
  TrendingDown,
  Loader2,
  Calendar,
  Layers,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { formatCurrency, formatDate } from '@/lib/utils/format';
import { toast } from 'sonner';

const EXPENSE_CATEGORIES = ['Rent', 'Salaries', 'Electricity', 'Equipment', 'Marketing', 'Other'];

export default function ExpenseTrackerPage() {
  const supabase = createClient();
  const { user } = useAuth();
  const { can } = usePermission();

  const [loading, setLoading] = useState(true);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  
  // Pagination
  const [page, setPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const pageSize = 8;

  // New Expense Dialog states
  const [openAddModal, setOpenAddModal] = useState(false);
  const [adding, setAdding] = useState(false);
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState('Rent');
  const [amount, setAmount] = useState('');
  const [paymentMode, setPaymentMode] = useState('upi');
  const [notes, setNotes] = useState('');

  // Total Summary
  const [totalExpensesThisMonth, setTotalExpensesThisMonth] = useState(0);

  // Debounce search input
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(search);
      setPage(1);
    }, 300);
    return () => clearTimeout(handler);
  }, [search]);

  const fetchExpenses = async () => {
    if (!user?.gymId) return;

    try {
      setLoading(true);
      const from = (page - 1) * pageSize;
      const to = from + pageSize - 1;

      // 1. Fetch expenses list
      let query = supabase
        .from('expenses')
        .select('*', { count: 'exact' })
        .eq('gym_id', user.gymId)
        .order('date', { ascending: false });

      if (categoryFilter !== 'all') {
        query = query.eq('category', categoryFilter);
      }

      if (debouncedSearch.trim()) {
        query = query.ilike('title', `%${debouncedSearch.trim()}%`);
      }

      query = query.range(from, to);

      const { data, error, count } = await query;
      if (error) throw error;
      setExpenses(data || []);
      setTotalCount(count || 0);

      // 2. Fetch total sum of current month's expenses
      const startOfMonth = new Date();
      startOfMonth.setDate(1);
      startOfMonth.setHours(0, 0, 0, 0);

      const { data: currentMonthData } = await supabase
        .from('expenses')
        .select('amount')
        .eq('gym_id', user.gymId)
        .gte('date', startOfMonth.toISOString().split('T')[0]);

      const sum = currentMonthData?.reduce((acc: any, curr: any) => acc + Number(curr.amount), 0) || 0;
      setTotalExpensesThisMonth(sum);

    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'An unknown error occurred';
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchExpenses();
  }, [user?.gymId, categoryFilter, debouncedSearch, page]);

  const handleAddExpense = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !amount || Number(amount) <= 0) {
      toast.error('Please enter a valid title and amount');
      return;
    }

    try {
      setAdding(true);
      const { error } = await supabase
        .from('expenses')
        .insert({
          gym_id: user?.gymId,
          branch_id: user?.branchId,
          title,
          category,
          amount: Number(amount),
          payment_mode: paymentMode,
          notes,
          created_by: user?.id,
        });

      if (error) throw error;

      toast.success('Expense item logged successfully');
      setOpenAddModal(false);
      
      // Clear form
      setTitle('');
      setCategory('Rent');
      setAmount('');
      setPaymentMode('upi');
      setNotes('');

      fetchExpenses();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Unknown error';
      toast.error(msg);
    } finally {
      setAdding(false);
    }
  };

  const handleDeleteExpense = async (id: string, itemTitle: string) => {
    if (!confirm(`Are you sure you want to delete expense record: "${itemTitle}"?`)) return;

    try {
      setLoading(true);
      const { error } = await supabase.from('expenses').delete().eq('id', id);
      if (error) throw error;

      toast.success('Expense record deleted');
      fetchExpenses();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'An unknown error occurred';
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-zinc-800 pb-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-zinc-100">Expenses Tracker</h2>
          <p className="text-zinc-500 text-xs mt-1">Manage utility rent payments, staff salaries, purchase logs, and track cash outflows.</p>
        </div>
        {can('expenses.manage') && (
          <Button onClick={() => setOpenAddModal(true)} className="bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs gap-2 h-9 px-4">
            <PlusCircle className="h-4 w-4" /> Log Expense
          </Button>
        )}
      </div>

      {/* Summary KPI Panel */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="border-zinc-800 bg-zinc-900/40">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-xs font-semibold uppercase tracking-wider text-zinc-500">Expenses (Current Month)</CardTitle>
            <TrendingDown className="h-4 w-4 text-red-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-black text-zinc-100">{formatCurrency(totalExpensesThisMonth)}</div>
            <p className="text-[10px] text-zinc-500 mt-1">Accumulated business outflow this month</p>
          </CardContent>
        </Card>
      </div>

      {/* Filter and Table Card */}
      <Card className="border-zinc-800 bg-zinc-900/40 overflow-hidden">
        <div className="p-4 border-b border-zinc-800 bg-zinc-900/20 flex flex-col md:flex-row gap-4 items-stretch md:items-center justify-between">
          <div className="flex-1 relative max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-500" />
            <Input
              placeholder="Search expenses by title..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 bg-zinc-950/40 border-zinc-800 text-xs h-9"
            />
          </div>

          <div className="flex flex-col sm:flex-row gap-3">
            <div className="flex items-center gap-2 bg-zinc-950/20 border border-zinc-800 px-3 py-1.5 rounded-lg">
              <Filter className="h-3.5 w-3.5 text-zinc-500" />
              <span className="text-xs text-zinc-400 font-medium">Category:</span>
              <select
                value={categoryFilter}
                onChange={(e) => { setCategoryFilter(e.target.value); setPage(1); }}
                className="bg-transparent border-0 text-xs text-zinc-200 focus:outline-none"
              >
                <option value="all">All Categories</option>
                {EXPENSE_CATEGORIES.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center items-center py-12">
            <Loader2 className="h-6 w-6 animate-spin text-purple-600" />
          </div>
        ) : expenses.length === 0 ? (
          <div className="text-center py-12 text-zinc-500 text-xs">No matching expense items logged.</div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader className="bg-zinc-950/20 border-zinc-800">
                <TableRow className="border-zinc-800">
                  <TableHead className="text-zinc-400 font-semibold text-xs">Expense Name</TableHead>
                  <TableHead className="text-zinc-400 font-semibold text-xs">Category</TableHead>
                  <TableHead className="text-zinc-400 font-semibold text-xs">Date</TableHead>
                  <TableHead className="text-zinc-400 font-semibold text-xs">Payment Mode</TableHead>
                  <TableHead className="text-zinc-400 font-semibold text-xs">Amount</TableHead>
                  {can('expenses.manage') && <TableHead className="text-zinc-400 font-semibold text-xs text-right">Actions</TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {expenses.map((exp) => (
                  <TableRow key={exp.id} className="border-zinc-800/40 hover:bg-zinc-850/10">
                    <TableCell className="font-semibold text-zinc-200 text-xs">{exp.title}</TableCell>
                    <TableCell className="text-zinc-300 text-xs font-mono">{exp.category}</TableCell>
                    <TableCell className="text-zinc-400 text-xs">{formatDate(exp.date)}</TableCell>
                    <TableCell className="text-zinc-400 text-xs uppercase">{exp.payment_mode || '-'}</TableCell>
                    <TableCell className="text-zinc-100 font-bold text-xs">{formatCurrency(exp.amount)}</TableCell>
                    {can('expenses.manage') && (
                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDeleteExpense(exp.id, exp.title)}
                          className="h-8 w-8 text-zinc-400 hover:text-red-400"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    )}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}

        {/* Pagination */}
        {!loading && totalCount > pageSize && (
          <div className="flex items-center justify-between px-6 py-4 border-t border-zinc-800 bg-zinc-950/20">
            <span className="text-xs text-zinc-500 font-medium">
              Showing <span className="text-zinc-300 font-bold">{Math.min(totalCount, (page - 1) * pageSize + 1)}</span> to{' '}
              <span className="text-zinc-300 font-bold">{Math.min(totalCount, page * pageSize)}</span> of{' '}
              <span className="text-zinc-300 font-bold">{totalCount}</span> records
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

      {/* Log Expense Dialog Modal */}
      <Dialog open={openAddModal} onOpenChange={setOpenAddModal}>
        <DialogContent className="bg-zinc-900 border-zinc-800 text-white max-w-md">
          <DialogHeader>
            <DialogTitle className="text-md font-bold">Log Business Expense</DialogTitle>
            <DialogDescription className="text-zinc-500 text-xs">Enter detail logs to update cash P&L accounts.</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleAddExpense} className="space-y-4 pt-2">
            <div className="space-y-1.5">
              <Label htmlFor="expense-title" className="text-xs text-zinc-300">Expense Title / Description</Label>
              <Input
                id="expense-title"
                placeholder="e.g. Reception Desk Rent (June)"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="border-zinc-800 bg-zinc-950 text-xs h-9 focus:ring-purple-600 focus:border-purple-600"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="expense-category" className="text-xs text-zinc-300">Category</Label>
                <Select value={category} onValueChange={setCategory}>
                  <SelectTrigger className="border-zinc-800 bg-zinc-950 text-xs h-9 text-zinc-300">
                    <SelectValue placeholder="Category" />
                  </SelectTrigger>
                  <SelectContent className="bg-zinc-950 border-zinc-800 text-white text-xs">
                    {EXPENSE_CATEGORIES.map((c) => (
                      <SelectItem key={c} value={c}>{c}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="expense-amount" className="text-xs text-zinc-300">Amount (INR)</Label>
                <Input
                  id="expense-amount"
                  type="number"
                  placeholder="e.g. 15000"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className="border-zinc-800 bg-zinc-950 text-xs h-9 focus:ring-purple-600 focus:border-purple-600"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="expense-mode" className="text-xs text-zinc-300">Payment Mode</Label>
              <Select value={paymentMode} onValueChange={setPaymentMode}>
                <SelectTrigger className="border-zinc-800 bg-zinc-950 text-xs h-9 text-zinc-300">
                  <SelectValue placeholder="Mode" />
                </SelectTrigger>
                <SelectContent className="bg-zinc-950 border-zinc-800 text-white text-xs">
                  <SelectItem value="upi">UPI / Scanner</SelectItem>
                  <SelectItem value="cash">Cash Outflow</SelectItem>
                  <SelectItem value="card">Business Card</SelectItem>
                  <SelectItem value="bank_transfer">Net Banking Transfer</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="expense-notes" className="text-xs text-zinc-300">Transaction Notes</Label>
              <Input
                id="expense-notes"
                placeholder="Include invoice ref or split allocations details..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="border-zinc-800 bg-zinc-950 text-xs h-9 focus:ring-purple-600 focus:border-purple-600"
              />
            </div>

            <DialogFooter className="pt-4 border-t border-zinc-800/40">
              <Button type="button" variant="ghost" onClick={() => setOpenAddModal(false)} className="text-zinc-400 hover:bg-zinc-800 text-xs h-9">
                Cancel
              </Button>
              <Button type="submit" disabled={adding} className="bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs h-9 px-4">
                {adding ? <Loader2 className="h-4 w-4 animate-spin text-white" /> : 'Log Outflow'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
