'use client';

import React, { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { usePermission } from '@/hooks/usePermission';
import {
  UserCog,
  Plus,
  ShieldAlert,
  Loader2,
  Check,
  Save,
  UserCheck,
  UserX,
  ShieldCheck,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { getInitials } from '@/lib/utils/format';
import { toast } from 'sonner';
import { Permission, DEFAULT_PERMISSIONS } from '@/types/auth';

const AVAILABLE_PERMISSIONS: { value: Permission; label: string; group: string }[] = [
  { value: 'members.view', label: 'View Members', group: 'Members' },
  { value: 'members.add', label: 'Add Members', group: 'Members' },
  { value: 'members.edit', label: 'Edit Members', group: 'Members' },
  { value: 'members.delete', label: 'Delete Members', group: 'Members' },
  
  { value: 'plans.view', label: 'View Plans', group: 'Plans' },
  { value: 'plans.manage', label: 'Manage Plans', group: 'Plans' },
  
  { value: 'invoices.view', label: 'View Invoices', group: 'Invoices' },
  { value: 'invoices.create', label: 'Create Invoices', group: 'Invoices' },
  { value: 'invoices.delete', label: 'Delete Invoices', group: 'Invoices' },
  
  { value: 'attendance.view', label: 'View Attendance', group: 'Attendance' },
  { value: 'attendance.mark', label: 'Mark Attendance', group: 'Attendance' },
  
  { value: 'followups.view', label: 'View Follow-ups', group: 'CRM' },
  { value: 'followups.manage', label: 'Manage Follow-ups', group: 'CRM' },
  { value: 'due.view', label: 'View Dues List', group: 'CRM' },
  { value: 'due.collect', label: 'Record Due Collections', group: 'CRM' },
  
  { value: 'diet.view', label: 'View Diets', group: 'Fitness' },
  { value: 'diet.manage', label: 'Manage Diets', group: 'Fitness' },
  { value: 'exercise.view', label: 'View Workouts', group: 'Fitness' },
  { value: 'exercise.manage', label: 'Manage Workouts', group: 'Fitness' },
  
  { value: 'kyc.view', label: 'View KYC Docs', group: 'KYC' },
  { value: 'kyc.verify', label: 'Verify KYC Docs', group: 'KYC' },
  
  { value: 'whatsapp.send', label: 'Send WhatsApp Quick', group: 'WhatsApp' },
  { value: 'whatsapp.broadcast', label: 'Send Broadcasts', group: 'WhatsApp' },
  
  { value: 'staff.view', label: 'View Staff List', group: 'Admin' },
  { value: 'staff.manage', label: 'Manage Staff Accounts', group: 'Admin' },
  { value: 'settings.view', label: 'View Branch Settings', group: 'Admin' },
  { value: 'settings.manage', label: 'Edit Settings & Hardware', group: 'Admin' },
];

export default function StaffCRUDPage() {
  const supabase = createClient();
  const { user } = useAuth();
  const { can } = usePermission();

  const [loading, setLoading] = useState(true);
  const [staffList, setStaffList] = useState<any[]>([]);
  
  // Add Staff Modal states
  const [openAddModal, setOpenAddModal] = useState(false);
  const [adding, setAdding] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [loginId, setLoginId] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<'receptionist' | 'trainer' | ''>('');
  const [commissionRate, setCommissionRate] = useState('10');

  // Edit Permissions Modal states
  const [openPermsModal, setOpenPermsModal] = useState(false);
  const [savingPerms, setSavingPerms] = useState(false);
  const [selectedStaffId, setSelectedStaffId] = useState<string | null>(null);
  const [selectedStaffName, setSelectedStaffName] = useState('');
  const [selectedPermissions, setSelectedPermissions] = useState<Permission[]>([]);

  const fetchStaff = async () => {
    if (!user?.gymId) return;

    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('gym_id', user.gymId)
        .order('role', { ascending: true });

      if (error) throw error;
      setStaffList(data || []);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'An unknown error occurred';
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStaff();
  }, [user?.gymId]);

  const handleOpenAddModal = () => {
    if (!can('staff.manage')) {
      toast.error('You do not have permission to manage staff');
      return;
    }
    setName('');
    setEmail('');
    setPhone('');
    setLoginId('');
    setPassword('');
    setRole('');
    setOpenAddModal(true);
  };

  const handleOpenPermsModal = (staff: any) => {
    if (!can('staff.manage')) {
      toast.error('You do not have permission to manage staff');
      return;
    }
    setSelectedStaffId(staff.id);
    setSelectedStaffName(staff.name);
    
    // Set initially selected permissions
    setSelectedPermissions(staff.permissions || []);
    setOpenPermsModal(true);
  };

  const handleAddStaff = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !email.trim() || !loginId.trim() || !password.trim() || !role) {
      toast.error('Please fill in all fields');
      return;
    }

    try {
      setAdding(true);

      // 1. Check if loginId is already taken
      const { data: existingUser } = await supabase
        .from('users')
        .select('id')
        .eq('login_id', loginId.trim())
        .limit(1);

      if (existingUser && existingUser.length > 0) {
        throw new Error('This Login ID is already taken. Please choose a different one.');
      }

      // 2. Create auth user in Supabase (Next.js route handles auth signup securely via API key,
      // but for client testing, we call the signUp flow or API call).
      // We'll call a dedicated Next.js API route that handles creating auth user bypass
      const res = await fetch('/api/staff/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          gymId: user?.gymId,
          name: name.trim(),
          email: email.trim(),
          phone: phone.trim(),
          loginId: loginId.trim(),
          password: password,
          role,
          permissions: DEFAULT_PERMISSIONS[role] || [],
          commissionRatePct: role === 'trainer' ? Number(commissionRate) : 0,
          createdBy: user?.id,
        }),
      });

      const result = await res.json();
      if (!res.ok) throw new Error(result.error || 'Failed to create staff user');

      toast.success('Staff account created successfully!');
      setOpenAddModal(false);
      fetchStaff();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'An unknown error occurred';
      toast.error(msg);
    } finally {
      setAdding(false);
    }
  };

  const handleTogglePermission = (perm: Permission) => {
    setSelectedPermissions(prev =>
      prev.includes(perm) ? prev.filter(p => p !== perm) : [...prev, perm]
    );
  };

  const handleSelectAllGroup = (group: string) => {
    const groupPerms = AVAILABLE_PERMISSIONS.filter(p => p.group === group).map(p => p.value);
    const hasAll = groupPerms.every(p => selectedPermissions.includes(p));

    if (hasAll) {
      // Remove all group permissions
      setSelectedPermissions(prev => prev.filter(p => !groupPerms.includes(p)));
    } else {
      // Add missing group permissions
      setSelectedPermissions(prev => [...new Set([...prev, ...groupPerms])]);
    }
  };

  const handleSavePermissions = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedStaffId) return;

    try {
      setSavingPerms(true);

      const { error } = await supabase
        .from('users')
        .update({ permissions: selectedPermissions })
        .eq('id', selectedStaffId)
        .eq('gym_id', user?.gymId);

      if (error) throw error;

      toast.success('Staff permissions updated successfully!');
      setOpenPermsModal(false);
      fetchStaff();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'An unknown error occurred';
      toast.error(msg);
    } finally {
      setSavingPerms(false);
    }
  };

  const handleToggleStaffStatus = async (id: string, name: string, currentVal: boolean) => {
    if (!can('staff.manage')) {
      toast.error('You do not have permission to manage staff');
      return;
    }
    if (!confirm(`Are you sure you want to ${currentVal ? 'deactivate' : 'activate'} staff user: ${name}?`)) return;

    try {
      const { error } = await supabase
        .from('users')
        .update({ is_active: !currentVal })
        .eq('id', id)
        .eq('gym_id', user?.gymId);

      if (error) throw error;
      toast.success(currentVal ? 'Staff deactivated' : 'Staff activated');
      
      setStaffList(prev => prev.map(s => s.id === id ? { ...s, is_active: !currentVal } : s));
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'An unknown error occurred';
      toast.error(msg);
    }
  };

  const getRoleBadgeColor = (role: string) => {
    if (role === 'owner') return 'bg-purple-500/10 text-purple-400 border-purple-500/20';
    if (role === 'receptionist') return 'bg-blue-500/10 text-blue-400 border-blue-500/20';
    return 'bg-amber-500/10 text-amber-400 border-amber-500/20';
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-zinc-800 pb-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-zinc-100">Staff Accounts</h2>
          <p className="text-zinc-500 text-xs mt-1">Manage team profiles (receptionists & trainers) and assign granular page access checks.</p>
        </div>
        {can('staff.manage') && (
          <Button onClick={handleOpenAddModal} className="bg-purple-600 hover:bg-purple-700 text-white gap-2 font-medium">
            <Plus className="h-4 w-4" /> Add Team Member
          </Button>
        )}
      </div>

      {/* Grid: Staff Cards */}
      {loading ? (
        <div className="flex justify-center items-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-purple-600" />
        </div>
      ) : staffList.length === 0 ? (
        <div className="text-center py-20 text-zinc-500 border border-dashed border-zinc-800 rounded-xl">
          No staff accounts onboarded.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {staffList.map((staff) => (
            <Card
              key={staff.id}
              className={`border-zinc-800 bg-zinc-900/30 flex flex-col justify-between overflow-hidden transition-all ${
                !staff.is_active ? 'opacity-65' : ''
              }`}
            >
              <CardHeader className="pb-3">
                <div className="flex items-center gap-3">
                  <Avatar className="h-10 w-10 border border-zinc-800 bg-zinc-800">
                    {staff.photo_url ? (
                      <AvatarImage src={staff.photo_url} alt={staff.name} />
                    ) : null}
                    <AvatarFallback className="text-xs font-bold bg-purple-950/60 text-purple-300">
                      {getInitials(staff.name)}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-zinc-200 text-sm">{staff.name}</span>
                      <Badge className={`text-[8px] font-bold rounded px-1.5 py-0.2 uppercase ${getRoleBadgeColor(staff.role)}`}>
                        {staff.role}
                      </Badge>
                      {staff.role === 'trainer' && staff.commission_rate_pct ? (
                        <Badge className="bg-amber-950/40 text-amber-400 border border-amber-800/20 text-[8px] font-bold">
                          {staff.commission_rate_pct}% Comm.
                        </Badge>
                      ) : null}
                    </div>
                    <span className="text-[10px] text-zinc-500 block mt-0.5">ID: {staff.login_id || 'Google Auth'}</span>
                  </div>
                </div>
              </CardHeader>

              <CardContent className="space-y-4 pt-2 border-t border-zinc-800/40">
                <div className="text-xs text-zinc-400 space-y-1">
                  <div>Email: <span className="text-zinc-300">{staff.email || '-'}</span></div>
                  <div>Phone: <span className="text-zinc-300">{staff.phone || '-'}</span></div>
                </div>

                {staff.role !== 'owner' && (
                  <div className="space-y-1.5">
                    <span className="text-[10px] text-zinc-500 font-semibold uppercase tracking-wider">Access Permissions ({staff.permissions?.length || 0})</span>
                    <div className="flex flex-wrap gap-1">
                      {staff.permissions?.slice(0, 4).map((p: string) => (
                        <Badge key={p} className="bg-zinc-800 text-zinc-400 text-[9px] border-zinc-700 capitalize">
                          {p.replace('.', ' ')}
                        </Badge>
                      ))}
                      {staff.permissions?.length > 4 && (
                        <Badge className="bg-purple-950/40 text-purple-400 text-[9px] border-purple-800/20 font-bold">
                          +{staff.permissions.length - 4} more
                        </Badge>
                      )}
                      {(!staff.permissions || staff.permissions.length === 0) && (
                        <span className="text-xs text-zinc-600">No permissions assigned.</span>
                      )}
                    </div>
                  </div>
                )}
              </CardContent>

              <CardFooter className="border-t border-zinc-800/40 pt-3 flex justify-between bg-zinc-900/10 gap-2">
                {can('staff.manage') && staff.role !== 'owner' ? (
                  <>
                    <Button
                      variant="ghost"
                      onClick={() => handleOpenPermsModal(staff)}
                      className="text-purple-400 hover:text-purple-300 hover:bg-purple-950/10 text-xs px-2.5 h-8 gap-1.5 font-medium"
                    >
                      <ShieldCheck className="h-4 w-4" /> Edit Access
                    </Button>

                    <Button
                      variant="ghost"
                      onClick={() => handleToggleStaffStatus(staff.id, staff.name, staff.is_active)}
                      className={`text-xs px-2.5 h-8 gap-1.5 font-medium ${
                        staff.is_active 
                          ? 'text-red-400 hover:text-red-300 hover:bg-red-950/10' 
                          : 'text-green-400 hover:text-green-300 hover:bg-green-950/10'
                      }`}
                    >
                      {staff.is_active ? (
                        <><UserX className="h-4 w-4" /> Deactivate</>
                      ) : (
                        <><UserCheck className="h-4 w-4" /> Activate</>
                      )}
                    </Button>
                  </>
                ) : (
                  <span className="text-[10px] text-zinc-600 block py-1.5">No administrative operations available.</span>
                )}
              </CardFooter>
            </Card>
          ))}
        </div>
      )}

      {/* Add Staff Account Modal */}
      <Dialog open={openAddModal} onOpenChange={setOpenAddModal}>
        <DialogContent className="bg-zinc-900 border-zinc-800 text-white max-w-md">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold">Add Staff Account</DialogTitle>
            <DialogDescription className="text-zinc-500 text-xs">Create custom login credentials for trainers or front desk receptionists.</DialogDescription>
          </DialogHeader>

          <form onSubmit={handleAddStaff} className="space-y-4 pt-4">
            <div className="grid gap-2">
              <Label htmlFor="staffName" className="text-zinc-300 text-xs">Full Name *</Label>
              <Input
                id="staffName"
                placeholder="Raj Kumar"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="border-zinc-800 bg-zinc-950 text-zinc-100 placeholder:text-zinc-700 text-xs"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="staffEmail" className="text-zinc-300 text-xs">Email Address *</Label>
                <Input
                  id="staffEmail"
                  type="email"
                  placeholder="staff@ironfitness.com"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="border-zinc-800 bg-zinc-950 text-zinc-100 placeholder:text-zinc-700 text-xs"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="staffPhone" className="text-zinc-300 text-xs">Mobile Number</Label>
                <Input
                  id="staffPhone"
                  maxLength={10}
                  placeholder="98765 43210"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value.replace(/\D/g, ''))}
                  className="border-zinc-800 bg-zinc-950 text-zinc-100 placeholder:text-zinc-700 text-xs"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 border-t border-zinc-800/60 pt-4">
              <div className="grid gap-2">
                <Label htmlFor="staffLogin" className="text-zinc-300 text-xs">Login ID (Unique) *</Label>
                <Input
                  id="staffLogin"
                  placeholder="e.g. front_desk_1"
                  required
                  value={loginId}
                  onChange={(e) => setLoginId(e.target.value.replace(/\s+/g, ''))}
                  className="border-zinc-800 bg-zinc-950 text-zinc-100 placeholder:text-zinc-700 text-xs"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="staffRole" className="text-zinc-300 text-xs">System Role *</Label>
                <Select value={role} onValueChange={(v: any) => setRole(v)}>
                  <SelectTrigger id="staffRole" className="border-zinc-800 bg-zinc-950 text-zinc-100 text-xs">
                    <SelectValue placeholder="Select role" />
                  </SelectTrigger>
                  <SelectContent className="bg-zinc-900 border-zinc-800 text-zinc-100 text-xs">
                    <SelectItem value="receptionist">Front Desk</SelectItem>
                    <SelectItem value="trainer">Trainer</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {role === 'trainer' && (
              <div className="grid gap-2 border border-amber-900/30 bg-amber-950/10 p-3 rounded-lg animate-in fade-in">
                <Label htmlFor="staffCommission" className="text-amber-300 text-xs font-semibold">Trainer Commission Rate (%)</Label>
                <Input
                  id="staffCommission"
                  type="number"
                  min="0"
                  max="100"
                  step="0.5"
                  placeholder="e.g. 10"
                  value={commissionRate}
                  onChange={(e) => setCommissionRate(e.target.value)}
                  className="border-zinc-800 bg-zinc-950 text-zinc-100 text-xs"
                />
                <span className="text-[10px] text-zinc-500">Percentage commission applied on client packages/sessions.</span>
              </div>
            )}

            <div className="grid gap-2">
              <Label htmlFor="staffPass" className="text-zinc-300 text-xs">Workspace Password *</Label>
              <Input
                id="staffPass"
                type="password"
                placeholder="Must be at least 6 characters"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="border-zinc-800 bg-zinc-950 text-zinc-100 text-xs"
              />
            </div>

            <DialogFooter className="border-t border-zinc-800/60 pt-4 mt-6">
              <Button type="button" variant="ghost" onClick={() => setOpenAddModal(false)} className="text-zinc-400 hover:bg-zinc-800 text-xs">
                Cancel
              </Button>
              <Button type="submit" disabled={adding} className="bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold gap-2">
                {adding ? <Loader2 className="h-4 w-4 animate-spin text-white" /> : <Check className="h-4 w-4" />}
                Add Staff Member
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Edit Permissions Modal */}
      <Dialog open={openPermsModal} onOpenChange={setOpenPermsModal}>
        <DialogContent className="bg-zinc-900 border-zinc-800 text-white max-w-2xl">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold">Customize Access: {selectedStaffName}</DialogTitle>
            <DialogDescription className="text-zinc-500 text-xs">Toggle checkboxes below to customize granular access rights.</DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSavePermissions} className="space-y-4 pt-4">
            {/* Group permissions logically */}
            <div className="grid grid-cols-2 gap-6 max-h-[350px] overflow-y-auto pr-2">
              {['Members', 'Invoices', 'CRM', 'Fitness', 'WhatsApp', 'Admin', 'Plans', 'KYC'].map(grp => (
                <div key={grp} className="space-y-2.5 border border-zinc-800/80 p-3 rounded-lg bg-zinc-950/20">
                  <div className="flex justify-between items-center border-b border-zinc-800/60 pb-1.5 mb-2">
                    <span className="text-xs font-extrabold text-purple-400 uppercase tracking-wider">{grp} Modules</span>
                    <button
                      type="button"
                      onClick={() => handleSelectAllGroup(grp)}
                      className="text-[9px] text-zinc-500 hover:text-zinc-300 font-semibold"
                    >
                      Toggle All
                    </button>
                  </div>

                  <div className="space-y-2">
                    {AVAILABLE_PERMISSIONS.filter(p => p.group === grp).map(p => (
                      <div key={p.value} className="flex items-center space-x-2.5">
                        <Checkbox
                          id={`perm-${p.value}`}
                          checked={selectedPermissions.includes(p.value)}
                          onCheckedChange={() => handleTogglePermission(p.value)}
                          className="border-zinc-700 text-purple-600 focus:ring-purple-600 scale-90"
                        />
                        <Label htmlFor={`perm-${p.value}`} className="text-zinc-300 text-xs cursor-pointer select-none">
                          {p.label}
                        </Label>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>

            <DialogFooter className="border-t border-zinc-800/60 pt-4 mt-6">
              <Button type="button" variant="ghost" onClick={() => setOpenPermsModal(false)} className="text-zinc-400 hover:bg-zinc-800 text-xs">
                Cancel
              </Button>
              <Button type="submit" disabled={savingPerms} className="bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold gap-2">
                {savingPerms ? <Loader2 className="h-4 w-4 animate-spin text-white" /> : <Save className="h-4 w-4" />}
                Save Custom Access
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
