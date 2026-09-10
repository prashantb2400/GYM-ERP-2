'use client';

import React, { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useBranch } from '@/hooks/useBranch';
import { usePermission } from '@/hooks/usePermission';
import { Branch } from '@/types/database';
import {
  Building2,
  Plus,
  Edit2,
  Phone,
  MapPin,
  Users,
  CheckCircle2,
  XCircle,
  Loader2,
  Save,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';

export default function BranchesPage() {
  const supabase = createClient();
  const { user } = useAuth();
  const { can } = usePermission();
  const { branches, refreshBranches, isOwner } = useBranch();

  const [loading, setLoading] = useState(true);
  const [branchStats, setBranchStats] = useState<Record<string, { members: number; staff: number }>>({});
  
  // Modal states
  const [openModal, setOpenModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editingBranchId, setEditingBranchId] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [street, setStreet] = useState('');
  const [city, setCity] = useState('');
  const [state, setState] = useState('');
  const [pin, setPin] = useState('');
  const [isActive, setIsActive] = useState(true);

  const fetchStats = async () => {
    if (!user?.gymId) return;
    try {
      setLoading(true);

      // Fetch member counts per branch
      const { data: memberCounts } = await supabase
        .from('members')
        .select('branch_id')
        .eq('gym_id', user.gymId)
        .eq('status', 'active');

      // Fetch staff counts per branch
      const { data: staffCounts } = await supabase
        .from('users')
        .select('branch_id')
        .eq('gym_id', user.gymId)
        .eq('is_active', true);

      const stats: Record<string, { members: number; staff: number }> = {};

      branches.forEach((b) => {
        stats[b.id] = { members: 0, staff: 0 };
      });

      memberCounts?.forEach((m) => {
        if (m.branch_id && stats[m.branch_id]) {
          stats[m.branch_id].members += 1;
        }
      });

      staffCounts?.forEach((s) => {
        if (s.branch_id && stats[s.branch_id]) {
          stats[s.branch_id].staff += 1;
        }
      });

      setBranchStats(stats);
    } catch (err) {
      console.error('Failed to load branch statistics:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
  }, [branches, user?.gymId]);

  const handleOpenAddModal = () => {
    if (!isOwner) {
      toast.error('Only gym owners can add new branches');
      return;
    }
    setEditingBranchId(null);
    setName('');
    setPhone('');
    setStreet('');
    setCity('');
    setState('');
    setPin('');
    setIsActive(true);
    setOpenModal(true);
  };

  const handleOpenEditModal = (branch: Branch) => {
    if (!isOwner) {
      toast.error('Only gym owners can edit branches');
      return;
    }
    setEditingBranchId(branch.id);
    setName(branch.name);
    setPhone(branch.phone || '');
    const addr = (branch.address as any) || {};
    setStreet(addr.street || '');
    setCity(addr.city || '');
    setState(addr.state || '');
    setPin(addr.pin || '');
    setIsActive(branch.is_active);
    setOpenModal(true);
  };

  const handleSaveBranch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      toast.error('Branch Name is required');
      return;
    }

    try {
      setSaving(true);
      const address = {
        street: street.trim(),
        city: city.trim(),
        state: state.trim(),
        pin: pin.trim(),
      };

      if (editingBranchId) {
        // Update existing branch via API
        const res = await fetch('/api/branches', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            id: editingBranchId,
            name: name.trim(),
            phone: phone.trim() || null,
            address,
            is_active: isActive,
          }),
        });

        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Failed to update branch');
        toast.success('Branch updated successfully!');
      } else {
        // Create new branch via API
        const res = await fetch('/api/branches', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: name.trim(),
            phone: phone.trim() || null,
            address,
          }),
        });

        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Failed to create branch');
        toast.success('Branch created successfully!');
      }

      setOpenModal(false);
      await refreshBranches();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'An error occurred';
      toast.error(msg);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border pb-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
            <Building2 className="h-6 w-6 text-primary" /> Branch Network
          </h2>
          <p className="text-muted-foreground text-xs mt-1">
            Manage your physical gym locations, assign staff, and enforce location-level data isolation.
          </p>
        </div>
        {isOwner && (
          <Button onClick={handleOpenAddModal} className="bg-primary text-primary-foreground gap-2 font-medium">
            <Plus className="h-4 w-4" /> Add New Branch
          </Button>
        )}
      </div>

      {/* Grid of branches */}
      {loading ? (
        <div className="flex justify-center items-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : branches.length === 0 ? (
        <div className="text-center py-20 text-muted-foreground border border-dashed border-border rounded-xl">
          No branches configured yet. Click "Add New Branch" to create one.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {branches.map((branch) => {
            const stats = branchStats[branch.id] || { members: 0, staff: 0 };
            const addr = (branch.address as any) || {};
            const addressString = [addr.street, addr.city, addr.state, addr.pin].filter(Boolean).join(', ');

            return (
              <Card
                key={branch.id}
                className={`border-border bg-card/40 flex flex-col justify-between overflow-hidden transition-all ${
                  !branch.is_active ? 'opacity-60' : ''
                }`}
              >
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <CardTitle className="text-lg font-bold text-card-foreground flex items-center gap-2">
                        {branch.name}
                      </CardTitle>
                      <span className="text-[10px] text-muted-foreground font-mono block mt-0.5">
                        ID: {branch.id.slice(0, 8)}...
                      </span>
                    </div>
                    <Badge
                      variant="outline"
                      className={`text-[9px] font-bold uppercase ${
                        branch.is_active
                          ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                          : 'bg-zinc-500/10 text-zinc-400 border-zinc-500/20'
                      }`}
                    >
                      {branch.is_active ? 'Active' : 'Inactive'}
                    </Badge>
                  </div>
                </CardHeader>

                <CardContent className="space-y-3 pt-2 text-xs text-muted-foreground">
                  {branch.phone && (
                    <div className="flex items-center gap-2 text-foreground/90">
                      <Phone className="h-3.5 w-3.5 text-primary shrink-0" />
                      <span>{branch.phone}</span>
                    </div>
                  )}

                  {addressString && (
                    <div className="flex items-start gap-2 text-foreground/80">
                      <MapPin className="h-3.5 w-3.5 text-primary shrink-0 mt-0.5" />
                      <span className="line-clamp-2">{addressString}</span>
                    </div>
                  )}

                  <div className="grid grid-cols-2 gap-2 pt-2 border-t border-border/40">
                    <div className="bg-secondary/40 p-2.5 rounded-lg text-center">
                      <span className="text-[10px] text-muted-foreground uppercase font-semibold block">Members</span>
                      <span className="text-base font-bold text-foreground">{stats.members}</span>
                    </div>
                    <div className="bg-secondary/40 p-2.5 rounded-lg text-center">
                      <span className="text-[10px] text-muted-foreground uppercase font-semibold block">Staff</span>
                      <span className="text-base font-bold text-foreground">{stats.staff}</span>
                    </div>
                  </div>
                </CardContent>

                <CardFooter className="border-t border-border/40 pt-3 flex justify-end gap-2 bg-secondary/10">
                  {isOwner && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleOpenEditModal(branch)}
                      className="text-primary hover:text-primary/80 text-xs h-8 gap-1.5 font-medium"
                    >
                      <Edit2 className="h-3.5 w-3.5" /> Edit Branch
                    </Button>
                  )}
                </CardFooter>
              </Card>
            );
          })}
        </div>
      )}

      {/* Add / Edit Branch Modal */}
      <Dialog open={openModal} onOpenChange={setOpenModal}>
        <DialogContent className="bg-card border-border text-foreground max-w-md">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold">
              {editingBranchId ? 'Edit Branch Profile' : 'Add New Branch'}
            </DialogTitle>
            <DialogDescription className="text-muted-foreground text-xs">
              {editingBranchId
                ? 'Update location details and status for this gym branch.'
                : 'Create a new branch location for your gym chain.'}
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSaveBranch} className="space-y-4 pt-2">
            <div className="grid gap-2">
              <Label htmlFor="branchName" className="text-xs">Branch Name *</Label>
              <Input
                id="branchName"
                placeholder="e.g. Bandra West Club"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="text-xs bg-background"
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="branchPhone" className="text-xs">Contact Phone</Label>
              <Input
                id="branchPhone"
                placeholder="98765 43210"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="text-xs bg-background"
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="branchStreet" className="text-xs">Street Address</Label>
              <Input
                id="branchStreet"
                placeholder="e.g. 101 Fitness Lane, Off Linking Road"
                value={street}
                onChange={(e) => setStreet(e.target.value)}
                className="text-xs bg-background"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="branchCity" className="text-xs">City</Label>
                <Input
                  id="branchCity"
                  placeholder="e.g. Mumbai"
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  className="text-xs bg-background"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="branchState" className="text-xs">State</Label>
                <Input
                  id="branchState"
                  placeholder="e.g. Maharashtra"
                  value={state}
                  onChange={(e) => setState(e.target.value)}
                  className="text-xs bg-background"
                />
              </div>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="branchPin" className="text-xs">PIN Code</Label>
              <Input
                id="branchPin"
                placeholder="e.g. 400050"
                maxLength={6}
                value={pin}
                onChange={(e) => setPin(e.target.value.replace(/\D/g, ''))}
                className="text-xs bg-background"
              />
            </div>

            {editingBranchId && (
              <div className="flex items-center justify-between border-t border-border/60 pt-3">
                <div>
                  <Label htmlFor="branchActive" className="text-xs font-medium">Active Status</Label>
                  <p className="text-[10px] text-muted-foreground">Inactive branches won't accept new check-ins.</p>
                </div>
                <Switch
                  id="branchActive"
                  checked={isActive}
                  onCheckedChange={setIsActive}
                />
              </div>
            )}

            <DialogFooter className="border-t border-border/60 pt-4 mt-6">
              <Button type="button" variant="ghost" onClick={() => setOpenModal(false)} className="text-xs">
                Cancel
              </Button>
              <Button type="submit" disabled={saving} className="bg-primary text-primary-foreground text-xs font-bold gap-2">
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                {editingBranchId ? 'Save Changes' : 'Create Branch'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
