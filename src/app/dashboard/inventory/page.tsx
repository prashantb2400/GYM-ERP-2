'use client';

import React, { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { usePermission } from '@/hooks/usePermission';
import { useBranch } from '@/hooks/useBranch';
import {
  Package,
  PlusCircle,
  Search,
  Filter,
  Trash2,
  TrendingUp,
  Loader2,
  AlertTriangle,
  RotateCw,
  Minus,
  Plus,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { formatCurrency } from '@/lib/utils/format';
import { toast } from 'sonner';

const INVENTORY_CATEGORIES = ['Supplements', 'Merchandise', 'Drinks', 'Accessories'];

export default function InventoryManagementPage() {
  const supabase = createClient();
  const { user } = useAuth();
  const { can } = usePermission();
  const { selectedBranchId, isOwner, branches } = useBranch();

  const [loading, setLoading] = useState(true);
  const [inventoryList, setInventoryList] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  
  // Pagination
  const [page, setPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const pageSize = 8;

  // Stock Adjustment Dialog States
  const [openAdjustModal, setOpenAdjustModal] = useState(false);
  const [adjusting, setAdjusting] = useState(false);
  const [selectedItem, setSelectedItem] = useState<any>(null);
  const [adjustQty, setAdjustQty] = useState('');
  const [adjustType, setAdjustType] = useState<'purchase' | 'sale' | 'adjustment'>('adjustment');

  // Add Item Dialog States
  const [openAddModal, setOpenAddModal] = useState(false);
  const [adding, setAdding] = useState(false);
  const [name, setName] = useState('');
  const [sku, setSku] = useState('');
  const [category, setCategory] = useState('Supplements');
  const [stockQuantity, setStockQuantity] = useState('');
  const [reorderLevel, setReorderLevel] = useState('5');
  const [purchasePrice, setPurchasePrice] = useState('');
  const [sellingPrice, setSellingPrice] = useState('');

  // Total Summary
  const [itemsToReorder, setItemsToReorder] = useState(0);

  // Debounce search input
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(search);
      setPage(1);
    }, 300);
    return () => clearTimeout(handler);
  }, [search]);

  const fetchInventory = async () => {
    if (!user?.gymId) return;

    try {
      setLoading(true);
      const from = (page - 1) * pageSize;
      const to = from + pageSize - 1;

      // 1. Fetch inventory items
      let query = supabase
        .from('inventory')
        .select('*', { count: 'exact' })
        .eq('gym_id', user.gymId)
        .order('name', { ascending: true });

      const effectiveBranchId = !isOwner ? user?.branchId : selectedBranchId;
      if (effectiveBranchId) {
        query = query.eq('branch_id', effectiveBranchId);
      }

      if (categoryFilter !== 'all') {
        query = query.eq('category', categoryFilter);
      }

      if (debouncedSearch.trim()) {
        query = query.ilike('name', `%${debouncedSearch.trim()}%`);
      }

      query = query.range(from, to);

      const { data, error, count } = await query;
      if (error) throw error;
      setInventoryList(data || []);
      setTotalCount(count || 0);

      // 2. Compute items under reorder level
      let reorderQuery = supabase
        .from('inventory')
        .select('id, stock_quantity, reorder_level')
        .eq('gym_id', user.gymId);

      if (effectiveBranchId) {
        reorderQuery = reorderQuery.eq('branch_id', effectiveBranchId);
      }

      const { data: reorderCountData } = await reorderQuery;
      const reorderCount = reorderCountData?.filter(i => Number(i.stock_quantity) <= Number(i.reorder_level)).length || 0;
      setItemsToReorder(reorderCount);

    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'An unknown error occurred';
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInventory();
  }, [user?.gymId, selectedBranchId, user?.branchId, categoryFilter, debouncedSearch, page]);

  const handleAddItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !stockQuantity || !purchasePrice || !sellingPrice) {
      toast.error('Please fill in all required fields');
      return;
    }

    try {
      setAdding(true);
      const branchToAssign = (!isOwner ? user?.branchId : selectedBranchId) || branches[0]?.id || null;
      const { error } = await supabase
        .from('inventory')
        .insert({
          gym_id: user?.gymId,
          branch_id: branchToAssign,
          name,
          sku: sku || null,
          category,
          stock_quantity: Number(stockQuantity),
          reorder_level: Number(reorderLevel),
          purchase_price: Number(purchasePrice),
          selling_price: Number(sellingPrice),
        });

      if (error) throw error;

      toast.success('Inventory item registered successfully');
      setOpenAddModal(false);
      
      // Clear form
      setName('');
      setSku('');
      setCategory('Supplements');
      setStockQuantity('');
      setReorderLevel('5');
      setPurchasePrice('');
      setSellingPrice('');

      fetchInventory();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'An unknown error occurred';
      toast.error(msg);
    } finally {
      setAdding(false);
    }
  };

  const handleOpenAdjust = (item: any) => {
    setSelectedItem(item);
    setAdjustQty('');
    setAdjustType('adjustment');
    setOpenPrintModal(true); // set dialog trigger state
    setOpenAdjustModal(true);
  };

  const handleAdjustStock = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!adjustQty || Number(adjustQty) <= 0 || !selectedItem) {
      toast.error('Please enter a valid amount');
      return;
    }

    try {
      setAdjusting(true);
      
      // Calculate quantity adjustments
      const changeAmount = Number(adjustQty);
      let updatedStock = selectedItem.stock_quantity;

      if (adjustType === 'purchase') {
        updatedStock += changeAmount;
      } else {
        updatedStock -= changeAmount;
      }

      if (updatedStock < 0) {
        toast.error('Insufficient inventory stock levels for transaction request');
        return;
      }

      // 1. Log inventory transaction in DB
      const { error: txError } = await supabase
        .from('inventory_transactions')
        .insert({
          inventory_id: selectedItem.id,
          transaction_type: adjustType,
          quantity: adjustType === 'purchase' ? changeAmount : -changeAmount,
          unit_price: adjustType === 'purchase' ? selectedItem.purchase_price : selectedItem.selling_price,
          created_by: user?.id,
        });

      if (txError) throw txError;

      // 2. Update stock quantity in inventory table
      const { error: stockErr } = await supabase
        .from('inventory')
        .update({ stock_quantity: updatedStock })
        .eq('id', selectedItem.id);

      if (stockErr) throw stockErr;

      toast.success('Stock adjusted successfully');
      setOpenAdjustModal(false);
      fetchInventory();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'An unknown error occurred';
      toast.error(msg);
    } finally {
      setAdjusting(false);
    }
  };

  const handleDeleteItem = async (id: string, itemName: string) => {
    if (!confirm(`Are you sure you want to permanently delete inventory product: "${itemName}"?`)) return;

    try {
      setLoading(true);
      const { error } = await supabase.from('inventory').delete().eq('id', id);
      if (error) throw error;

      toast.success('Product deleted from inventory');
      fetchInventory();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'An unknown error occurred';
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  const [openPrintModal, setOpenPrintModal] = useState(false); // standard binding logic

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-zinc-800 pb-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-zinc-100">Inventory Management</h2>
          <p className="text-zinc-500 text-xs mt-1">Track shakes, merchandise, retail supplement sales, and manage restock triggers.</p>
        </div>
        {can('inventory.manage') && (
          <Button onClick={() => setOpenAddModal(true)} className="bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs gap-2 h-9 px-4">
            <PlusCircle className="h-4 w-4" /> Add Product
          </Button>
        )}
      </div>

      {/* KPI Panel */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="border-zinc-800 bg-zinc-900/40">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-xs font-semibold uppercase tracking-wider text-zinc-500">Alert Triggers</CardTitle>
            <AlertTriangle className={`h-4 w-4 ${itemsToReorder > 0 ? 'text-amber-400 animate-pulse' : 'text-zinc-500'}`} />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-black text-zinc-100">{itemsToReorder}</div>
            <p className="text-[10px] text-zinc-500 mt-1">Products currently at or below reorder levels</p>
          </CardContent>
        </Card>
      </div>

      {/* Table Card */}
      <Card className="border-zinc-800 bg-zinc-900/40 overflow-hidden">
        <div className="p-4 border-b border-zinc-800 bg-zinc-900/20 flex flex-col md:flex-row gap-4 items-stretch md:items-center justify-between">
          <div className="flex-1 relative max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-500" />
            <Input
              placeholder="Search products by title..."
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
                {INVENTORY_CATEGORIES.map((c) => (
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
        ) : inventoryList.length === 0 ? (
          <div className="text-center py-12 text-zinc-500 text-xs">No matching inventory items logged.</div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader className="bg-zinc-950/20 border-zinc-800">
                <TableRow className="border-zinc-800">
                  <TableHead className="text-zinc-400 font-semibold text-xs">Product Name</TableHead>
                  <TableHead className="text-zinc-400 font-semibold text-xs">Category</TableHead>
                  <TableHead className="text-zinc-400 font-semibold text-xs text-center">Stock Level</TableHead>
                  <TableHead className="text-zinc-400 font-semibold text-xs">Purchase Price</TableHead>
                  <TableHead className="text-zinc-400 font-semibold text-xs">Retail Price</TableHead>
                  {can('inventory.manage') && <TableHead className="text-zinc-400 font-semibold text-xs text-right">Actions</TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {inventoryList.map((item) => {
                  const needsReorder = Number(item.stock_quantity) <= Number(item.reorder_level);
                  return (
                    <TableRow key={item.id} className="border-zinc-800/40 hover:bg-zinc-850/10">
                      <TableCell className="font-semibold text-zinc-200 text-xs">
                        <div>
                          <div className="text-zinc-100">{item.name}</div>
                          {item.sku && <div className="text-[9px] text-zinc-500 font-mono mt-0.5">{item.sku}</div>}
                        </div>
                      </TableCell>
                      <TableCell className="text-zinc-300 text-xs font-mono">{item.category}</TableCell>
                      <TableCell className="text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          <span className="font-bold text-xs">{item.stock_quantity}</span>
                          {needsReorder && (
                            <Badge className="bg-amber-500/10 text-amber-500 border-amber-500/20 text-[9px] font-bold py-0 px-1 rounded-sm uppercase">
                              Low
                            </Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-zinc-400 text-xs">{formatCurrency(item.purchase_price)}</TableCell>
                      <TableCell className="text-zinc-100 font-bold text-xs">{formatCurrency(item.selling_price)}</TableCell>
                      {can('inventory.manage') && (
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleOpenAdjust(item)}
                              className="h-8 w-8 text-zinc-400 hover:text-purple-400"
                              title="Restock or Log Sale"
                            >
                              <RotateCw className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleDeleteItem(item.id, item.name)}
                              className="h-8 w-8 text-zinc-400 hover:text-red-400"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      )}
                    </TableRow>
                  );
                })}
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
              <span className="text-zinc-300 font-bold">{totalCount}</span> products
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

      {/* Add Product Dialog Modal */}
      <Dialog open={openAddModal} onOpenChange={setOpenAddModal}>
        <DialogContent className="bg-zinc-900 border-zinc-800 text-white max-w-md">
          <DialogHeader>
            <DialogTitle className="text-md font-bold">Register Inventory Item</DialogTitle>
            <DialogDescription className="text-zinc-500 text-xs">Log supplements or merchandise details for counter checkouts.</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleAddItem} className="space-y-4 pt-2">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5 col-span-2">
                <Label htmlFor="item-name" className="text-xs text-zinc-300">Product Title</Label>
                <Input
                  id="item-name"
                  placeholder="e.g. Gold Standard Whey 2kg"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="border-zinc-800 bg-zinc-950 text-xs h-9 focus:ring-purple-600 focus:border-purple-600"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="item-sku" className="text-xs text-zinc-300">SKU / Barcode</Label>
                <Input
                  id="item-sku"
                  placeholder="e.g. SKU-WHEY-109"
                  value={sku}
                  onChange={(e) => setSku(e.target.value)}
                  className="border-zinc-800 bg-zinc-950 text-xs h-9 focus:ring-purple-600 focus:border-purple-600"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="item-category" className="text-xs text-zinc-300">Category</Label>
                <Select value={category} onValueChange={setCategory}>
                  <SelectTrigger className="border-zinc-800 bg-zinc-950 text-xs h-9 text-zinc-300">
                    <SelectValue placeholder="Select" />
                  </SelectTrigger>
                  <SelectContent className="bg-zinc-950 border-zinc-800 text-white text-xs">
                    {INVENTORY_CATEGORIES.map((c) => (
                      <SelectItem key={c} value={c}>{c}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="item-qty" className="text-xs text-zinc-300">Initial Stock</Label>
                <Input
                  id="item-qty"
                  type="number"
                  placeholder="e.g. 20"
                  value={stockQuantity}
                  onChange={(e) => setStockQuantity(e.target.value)}
                  className="border-zinc-800 bg-zinc-950 text-xs h-9 focus:ring-purple-600 focus:border-purple-600"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="item-reorder" className="text-xs text-zinc-300">Reorder Level Alert</Label>
                <Input
                  id="item-reorder"
                  type="number"
                  placeholder="e.g. 5"
                  value={reorderLevel}
                  onChange={(e) => setReorderLevel(e.target.value)}
                  className="border-zinc-800 bg-zinc-950 text-xs h-9 focus:ring-purple-600 focus:border-purple-600"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="item-cost" className="text-xs text-zinc-300">Cost Price (INR)</Label>
                <Input
                  id="item-cost"
                  type="number"
                  placeholder="e.g. 4500"
                  value={purchasePrice}
                  onChange={(e) => setPurchasePrice(e.target.value)}
                  className="border-zinc-800 bg-zinc-950 text-xs h-9 focus:ring-purple-600 focus:border-purple-600"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="item-retail" className="text-xs text-zinc-300">Retail Price (INR)</Label>
                <Input
                  id="item-retail"
                  type="number"
                  placeholder="e.g. 5999"
                  value={sellingPrice}
                  onChange={(e) => setSellingPrice(e.target.value)}
                  className="border-zinc-800 bg-zinc-950 text-xs h-9 focus:ring-purple-600 focus:border-purple-600"
                />
              </div>
            </div>

            <DialogFooter className="pt-4 border-t border-zinc-800/40">
              <Button type="button" variant="ghost" onClick={() => setOpenAddModal(false)} className="text-zinc-400 hover:bg-zinc-800 text-xs h-9">
                Cancel
              </Button>
              <Button type="submit" disabled={adding} className="bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs h-9 px-4">
                {adding ? <Loader2 className="h-4 w-4 animate-spin text-white" /> : 'Register Item'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Adjust Stock Dialog Modal */}
      <Dialog open={openAdjustModal} onOpenChange={setOpenAdjustModal}>
        <DialogContent className="bg-zinc-900 border-zinc-800 text-white max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-md font-bold">Adjust Quantity Levels</DialogTitle>
            <DialogDescription className="text-zinc-500 text-xs">Record incoming purchases or sales stock deductions.</DialogDescription>
          </DialogHeader>
          {selectedItem && (
            <form onSubmit={handleAdjustStock} className="space-y-4 pt-2">
              <div className="bg-zinc-950/40 border border-zinc-800 rounded p-2.5 text-xs">
                <div className="flex justify-between font-semibold">
                  <span className="text-zinc-400">Current Stock:</span>
                  <span className="text-zinc-200">{selectedItem.stock_quantity} units</span>
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="adjust-type" className="text-xs text-zinc-300">Transaction Type</Label>
                <Select value={adjustType} onValueChange={(v: any) => setAdjustType(v)}>
                  <SelectTrigger className="border-zinc-800 bg-zinc-950 text-xs h-9 text-zinc-300">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-zinc-950 border-zinc-800 text-white text-xs">
                    <SelectItem value="purchase">Restock (Restocking Items)</SelectItem>
                    <SelectItem value="sale">Deduct (Deduct for Sales)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="adjust-qty" className="text-xs text-zinc-300">Quantity Amount</Label>
                <Input
                  id="adjust-qty"
                  type="number"
                  placeholder="e.g. 5"
                  value={adjustQty}
                  onChange={(e) => setAdjustQty(e.target.value)}
                  className="border-zinc-800 bg-zinc-950 text-xs h-9 focus:ring-purple-600 focus:border-purple-600"
                />
              </div>

              <DialogFooter className="pt-4 border-t border-zinc-800/40">
                <Button type="button" variant="ghost" onClick={() => setOpenAdjustModal(false)} className="text-zinc-400 hover:bg-zinc-800 text-xs h-9">
                  Cancel
                </Button>
                <Button type="submit" disabled={adjusting} className="bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs h-9 px-4">
                  {adjusting ? <Loader2 className="h-4 w-4 animate-spin text-white" /> : 'Confirm Log'}
                </Button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
