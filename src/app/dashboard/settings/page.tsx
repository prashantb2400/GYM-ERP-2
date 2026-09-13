'use client';

import React, { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { usePermission } from '@/hooks/usePermission';
import { RequirePermission } from '@/components/auth/RequirePermission';
import {
  Settings,
  Building,
  Clock,
  CheckCircle,
  Loader2,
  Save,
  BellRing,
  HelpCircle,
  Eye,
  Camera,
  MessageSquare,
  Fingerprint,
  Trash2,
  Building2,
  FileSpreadsheet,
  Download,
  UploadCloud,
} from 'lucide-react';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { MemberImportModal } from '@/components/members/MemberImportModal';
import { downloadMemberImportTemplate } from '@/lib/members/template-generator';
import { fetchWithAuth } from '@/lib/utils/api-client';

export default function SettingsPage() {
  const supabase = createClient();
  const { user } = useAuth();
  const { can } = usePermission();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [gym, setGym] = useState<any>(null);
  const [plans, setPlans] = useState<any[]>([]);
  const [importModalOpen, setImportModalOpen] = useState(false);

  // Form states
  const [gymName, setGymName] = useState('');
  const [businessName, setBusinessName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [gstin, setGstin] = useState('');
  const [pan, setPan] = useState('');
  const [tagline, setTagline] = useState('');
  
  // Address States
  const [street, setStreet] = useState('');
  const [city, setCity] = useState('');
  const [stateVal, setStateVal] = useState('');
  const [pin, setPin] = useState('');

  // Working Hours States
  const [openTime, setOpenTime] = useState('06:00');
  const [closeTime, setCloseTime] = useState('22:00');

  // Integrations settings
  const [cctvEnabled, setCctvEnabled] = useState(false);
  const [whatsappEnabled, setWhatsappEnabled] = useState(true);
  const [biometricEnabled, setBiometricEnabled] = useState(false);

  // Deletion States
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState('');
  const [deleting, setDeleting] = useState(false);

  const handleDeleteAccount = async () => {
    if (deleteConfirmText !== 'DELETE MY GYM') {
      toast.error('Type "DELETE MY GYM" to confirm');
      return;
    }
    setDeleting(true);
    try {
      const res = await fetch('/api/gym/delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ confirmation: deleteConfirmText }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      toast.success('Account deleted. Goodbye.');
      window.location.href = '/';
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Deletion failed';
      toast.error(msg);
    } finally {
      setDeleting(false);
    }
  };

  const applyGymData = (data: any) => {
    setGym(data);
    setGymName(data.name || '');
    setBusinessName(data.business_name || '');
    setPhone(data.phone || '');
    setEmail(data.email || '');
    setGstin(data.gstin || '');
    setPan(data.pan || '');
    setTagline(data.tagline || '');

    // Address
    setStreet(data.address?.street || '');
    setCity(data.address?.city || '');
    setStateVal(data.address?.state || '');
    setPin(data.address?.pin || '');

    // Working hours
    setOpenTime(data.working_hours?.open || '06:00');
    setCloseTime(data.working_hours?.close || '22:00');

    // Integrations
    setCctvEnabled(data.settings?.cctv_enabled || false);
    setWhatsappEnabled(data.settings?.whatsapp_enabled ?? true);
    setBiometricEnabled(data.settings?.biometric_enabled || false);
  };

  const fetchGymSettings = async () => {
    if (!user?.gymId) {
      setLoading(false);
      return;
    }

    if (user.role !== 'owner' && !can('settings.view')) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);

      // 1. Primary: Server-side API endpoint (immune to client-side RLS recursion & policy drift)
      const res = await fetchWithAuth('/api/settings');
      if (res.ok) {
        const json = await res.json();
        if (json.gym) {
          applyGymData(json.gym);
        }
        if (json.plans) {
          setPlans(json.plans);
        }
        return;
      }

      // 2. Fallback: Direct Supabase client query with maybeSingle (no PGRST116 throw)
      const [{ data, error }, { data: plansData }] = await Promise.all([
        supabase
          .from('gyms')
          .select('*')
          .eq('id', user.gymId)
          .maybeSingle(),
        supabase
          .from('plans')
          .select('id, name')
          .eq('gym_id', user.gymId)
          .eq('is_active', true),
      ]);

      if (error) {
        console.warn('Direct Supabase settings fetch warning:', error);
      } else if (data) {
        applyGymData(data);
      }

      if (plansData) {
        setPlans(plansData);
      }
    } catch (err: unknown) {
      const msg =
        err instanceof Error
          ? err.message
          : typeof err === 'object' && err && 'message' in err
            ? String((err as any).message)
            : 'Unable to load gym settings';
      console.error('Settings fetch error:', err);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchGymSettings();
  }, [user?.gymId]);

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!can('settings.manage')) {
      toast.error('You do not have permission to manage settings');
      return;
    }

    try {
      setSaving(true);

      const addressPayload = { street, city, state: stateVal, pin };
      const hoursPayload = { open: openTime, close: closeTime };
      const settingsPayload = {
        ...(gym?.settings || {}),
        cctv_enabled: cctvEnabled,
        whatsapp_enabled: whatsappEnabled,
        biometric_enabled: biometricEnabled,
      };

      const payload = {
        name: gymName.trim(),
        business_name: businessName.trim() || null,
        phone: phone.trim() || null,
        email: email.trim() || null,
        gstin: gstin.trim() || null,
        pan: pan.trim() || null,
        tagline: tagline.trim() || null,
        address: addressPayload,
        working_hours: hoursPayload,
        settings: settingsPayload,
      };

      // 1. Primary: Update via server-side /api/settings endpoint
      const res = await fetchWithAuth('/api/settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        const json = await res.json();
        if (json.gym) {
          applyGymData(json.gym);
        }
        toast.success('Gym settings updated successfully!');
        return;
      }

      // 2. Fallback: Direct Supabase client update
      const { error } = await supabase
        .from('gyms')
        .update(payload)
        .eq('id', user?.gymId);

      if (error) throw error;
      toast.success('Gym settings updated successfully!');
      fetchGymSettings();
    } catch (err: unknown) {
      const msg =
        err instanceof Error
          ? err.message
          : typeof err === 'object' && err && 'message' in err
            ? String((err as any).message)
            : 'Unable to update gym settings';
      console.error('Settings update error:', err);
      toast.error(msg);
    } finally {
      setSaving(false);
    }
  };

  const getCctvStatus = () => {
    const lastPing = gym?.settings?.last_cctv_ping;
    if (!lastPing) return { status: 'Offline', color: 'text-zinc-500 bg-zinc-500/10 border-zinc-500/20' };

    const diff = Date.now() - new Date(lastPing).getTime();
    const minutes = diff / 1000 / 60;

    if (minutes <= 5) {
      return { 
        status: 'Online', 
        color: 'text-green-450 bg-green-500/10 border-green-500/20 animate-pulse',
        time: new Date(lastPing).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })
      };
    }

    return { 
      status: 'Offline', 
      color: 'text-red-400 bg-red-500/10 border-red-500/20',
      time: new Date(lastPing).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' }) + ' ' + new Date(lastPing).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })
    };
  };

  if (loading) {
    return (
      <div className="flex h-[50vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-purple-600" />
      </div>
    );
  }

  return (
    <RequirePermission
      permission="settings.view"
      fallbackTitle="Settings Restricted"
      fallbackDescription="Only the gym owner and authorized administrators have permission to manage gym settings and integration secrets."
    >
      <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-zinc-800 pb-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-zinc-100">Gym & Organization Settings</h2>
          <p className="text-zinc-500 text-xs mt-1">Configure brand details, legal & tax registration, default operating hours, and CCTV integrations.</p>
        </div>
        <Link href="/dashboard/branches">
          <Button variant="outline" className="border-zinc-800 text-zinc-300 hover:text-zinc-100 text-xs gap-2">
            <Building2 className="h-4 w-4 text-purple-400" /> Manage Physical Branches
          </Button>
        </Link>
      </div>

      <form onSubmit={handleSaveSettings} className="space-y-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Left Column: Brand & Tax info */}
          <div className="lg:col-span-2 space-y-6">
            <Card className="border-zinc-800 bg-zinc-900/30">
              <CardHeader className="pb-3 border-b border-zinc-800/40">
                <div className="flex items-center gap-2">
                  <Building className="h-4.5 w-4.5 text-purple-400" />
                  <CardTitle className="text-sm font-bold">Brand Details</CardTitle>
                </div>
              </CardHeader>
              <CardContent className="space-y-4 pt-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="grid gap-1.5">
                    <Label htmlFor="gName" className="text-zinc-400 text-xs">Gym Display Name *</Label>
                    <Input id="gName" required value={gymName} onChange={(e) => setGymName(e.target.value)} className="border-zinc-800 bg-zinc-950 text-xs text-zinc-100" />
                  </div>
                  <div className="grid gap-1.5">
                    <Label htmlFor="bName" className="text-zinc-400 text-xs">Business Legal Name</Label>
                    <Input id="bName" value={businessName} onChange={(e) => setBusinessName(e.target.value)} className="border-zinc-800 bg-zinc-950 text-xs text-zinc-100" />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="grid gap-1.5">
                    <Label htmlFor="phone" className="text-zinc-400 text-xs">Primary Contact Phone</Label>
                    <Input id="phone" value={phone} onChange={(e) => setPhone(e.target.value)} className="border-zinc-800 bg-zinc-950 text-xs text-zinc-100" />
                  </div>
                  <div className="grid gap-1.5">
                    <Label htmlFor="email" className="text-zinc-400 text-xs">Corporate Email</Label>
                    <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="border-zinc-800 bg-zinc-950 text-xs text-zinc-100" />
                  </div>
                </div>

                <div className="grid gap-1.5">
                  <Label htmlFor="tag" className="text-zinc-400 text-xs">Brand Tagline</Label>
                  <Input id="tag" placeholder="e.g. Unshackle the beast inside you" value={tagline} onChange={(e) => setTagline(e.target.value)} className="border-zinc-800 bg-zinc-950 text-xs text-zinc-100" />
                </div>
              </CardContent>
            </Card>

            {/* Address Card */}
            <Card className="border-zinc-800 bg-zinc-900/30">
              <CardHeader className="pb-3 border-b border-zinc-800/40">
                <CardTitle className="text-sm font-bold">Physical Address</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4 pt-4">
                <div className="grid gap-1.5">
                  <Label htmlFor="street" className="text-zinc-400 text-xs">Street / Locality</Label>
                  <Input id="street" value={street} onChange={(e) => setStreet(e.target.value)} className="border-zinc-800 bg-zinc-950 text-xs text-zinc-100" />
                </div>
                <div className="grid grid-cols-3 gap-4">
                  <div className="grid gap-1.5">
                    <Label htmlFor="city" className="text-zinc-400 text-xs">City</Label>
                    <Input id="city" value={city} onChange={(e) => setCity(e.target.value)} className="border-zinc-800 bg-zinc-950 text-xs text-zinc-100" />
                  </div>
                  <div className="grid gap-1.5">
                    <Label htmlFor="state" className="text-zinc-400 text-xs">State</Label>
                    <Input id="state" value={stateVal} onChange={(e) => setStateVal(e.target.value)} className="border-zinc-800 bg-zinc-950 text-xs text-zinc-100" />
                  </div>
                  <div className="grid gap-1.5">
                    <Label htmlFor="pin" className="text-zinc-400 text-xs">PIN Code</Label>
                    <Input id="pin" value={pin} onChange={(e) => setPin(e.target.value)} className="border-zinc-800 bg-zinc-950 text-xs text-zinc-100" />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Tax Settings Card */}
            <Card className="border-zinc-800 bg-zinc-900/30">
              <CardHeader className="pb-3 border-b border-zinc-800/40">
                <CardTitle className="text-sm font-bold">Government Invoicing & Taxes</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4 pt-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="grid gap-1.5">
                    <Label htmlFor="gstin" className="text-zinc-400 text-xs">GSTIN (Indian GST Number)</Label>
                    <Input id="gstin" placeholder="07AAAAA1111A1Z1" value={gstin} onChange={(e) => setGstin(e.target.value)} className="border-zinc-800 bg-zinc-950 text-xs text-zinc-100 font-mono uppercase" />
                  </div>
                  <div className="grid gap-1.5">
                    <Label htmlFor="pan" className="text-zinc-400 text-xs">PAN Card Number</Label>
                    <Input id="pan" placeholder="ABCDE1234F" value={pan} onChange={(e) => setPan(e.target.value)} className="border-zinc-800 bg-zinc-950 text-xs text-zinc-100 font-mono uppercase" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Right Column: Operating Hours & Integrations toggles */}
          <div className="lg:col-span-1 space-y-6">
            <Card className="border-zinc-800 bg-zinc-900/30">
              <CardHeader className="pb-3 border-b border-zinc-800/40">
                <div className="flex items-center gap-2">
                  <Clock className="h-4.5 w-4.5 text-purple-400" />
                  <CardTitle className="text-sm font-bold">Operating Hours</CardTitle>
                </div>
              </CardHeader>
              <CardContent className="space-y-4 pt-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="grid gap-1.5">
                    <Label htmlFor="open" className="text-zinc-400 text-xs">Opening Time</Label>
                    <Input id="open" type="time" value={openTime} onChange={(e) => setOpenTime(e.target.value)} className="border-zinc-800 bg-zinc-950 text-xs text-zinc-100" />
                  </div>
                  <div className="grid gap-1.5">
                    <Label htmlFor="close" className="text-zinc-400 text-xs">Closing Time</Label>
                    <Input id="close" type="time" value={closeTime} onChange={(e) => setCloseTime(e.target.value)} className="border-zinc-800 bg-zinc-950 text-xs text-zinc-100" />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Integrations toggles */}
            <Card className="border-zinc-800 bg-zinc-900/30">
              <CardHeader className="pb-3 border-b border-zinc-800/40">
                <CardTitle className="text-sm font-bold">Hardware Integrations</CardTitle>
              </CardHeader>
              <CardContent className="space-y-5 pt-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-1.5">
                      <Camera className="h-3.5 w-3.5 text-zinc-400" />
                      <Label htmlFor="cctv" className="text-zinc-200 text-xs font-semibold cursor-pointer">CCTV Attendance</Label>
                    </div>
                    <span className="text-[10px] text-zinc-500 block">Opencv face check-in feed</span>
                    {cctvEnabled && (
                      <div className="flex items-center gap-1.5 mt-1.5">
                        <span className={`text-[8px] font-bold uppercase rounded border px-1.5 py-0.2 ${getCctvStatus().color}`}>
                          Edge: {getCctvStatus().status}
                        </span>
                        {getCctvStatus().time && (
                          <span className="text-[9px] text-zinc-600 font-medium">Ping: {getCctvStatus().time}</span>
                        )}
                      </div>
                    )}
                  </div>
                  <Switch id="cctv" checked={cctvEnabled} onCheckedChange={setCctvEnabled} className="text-purple-600 scale-90" />
                </div>

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-1.5">
                      <MessageSquare className="h-3.5 w-3.5 text-zinc-400" />
                      <Label htmlFor="wa" className="text-zinc-200 text-xs font-semibold cursor-pointer">WhatsApp Dispatch</Label>
                    </div>
                    <span className="text-[10px] text-zinc-500 block">Automatic Meta invoice alerts</span>
                  </div>
                  <Switch id="wa" checked={whatsappEnabled} onCheckedChange={setWhatsappEnabled} className="text-purple-600 scale-90" />
                </div>

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-1.5">
                      <Fingerprint className="h-3.5 w-3.5 text-zinc-400" />
                      <Label htmlFor="bio" className="text-zinc-200 text-xs font-semibold cursor-pointer">Biometrics Reader</Label>
                    </div>
                    <span className="text-[10px] text-zinc-500 block">Fingerprint LAN readers</span>
                  </div>
                  <Switch id="bio" checked={biometricEnabled} onCheckedChange={setBiometricEnabled} className="text-purple-600 scale-90" />
                </div>
              </CardContent>
            </Card>

            {can('settings.manage') && (
              <Button type="submit" disabled={saving} className="w-full bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs h-9 gap-2 shadow-md">
                {saving ? <Loader2 className="h-4 w-4 animate-spin text-white" /> : <Save className="h-4 w-4" />}
                Save Configurations
              </Button>
            )}
          </div>
        </div>
      </form>

      {/* Data Migration & Bulk Member Import Card */}
      <Card className="border-zinc-800 bg-zinc-900/30">
        <CardHeader className="pb-3 border-b border-zinc-800/40">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <div className="h-8 w-8 rounded-lg bg-purple-950/60 border border-purple-800/60 flex items-center justify-center text-purple-400">
                <FileSpreadsheet className="h-4.5 w-4.5" />
              </div>
              <div>
                <CardTitle className="text-sm font-bold text-zinc-100">Data Migration & Member Import</CardTitle>
                <CardDescription className="text-xs text-zinc-400 mt-0.5">
                  Import historical member records in bulk from an Excel spreadsheet (.xlsx, .xls) or CSV file.
                </CardDescription>
              </div>
            </div>
            <Button
              variant="outline"
              size="sm"
              type="button"
              onClick={() => downloadMemberImportTemplate(plans.map(p => p.name))}
              className="border-zinc-800 text-zinc-300 hover:text-white text-xs gap-1.5 self-start sm:self-auto"
            >
              <Download className="h-3.5 w-3.5 text-purple-400" />
              Download Excel Template
            </Button>
          </div>
        </CardHeader>
        <CardContent className="pt-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <p className="text-xs text-zinc-300 font-medium">
              Easily bring your existing member data from any old software or manual register into GymERP.
            </p>
            <p className="text-[11px] text-zinc-500">
              Includes automated column matching, phone number duplicate checking, membership plan assignment, and sequential member code generation.
            </p>
          </div>
          <Button
            type="button"
            onClick={() => setImportModalOpen(true)}
            className="bg-purple-600 hover:bg-purple-700 text-white font-semibold text-xs h-9 px-4 gap-2 shrink-0 shadow-sm"
          >
            <UploadCloud className="h-4 w-4" />
            Import Members from Excel
          </Button>
        </CardContent>
      </Card>

      {/* Danger Zone */}
      <div className="rounded-xl border border-red-900/40 bg-red-950/10 p-6 mt-10">
        <h3 className="text-sm font-semibold text-red-400 mb-1">Danger Zone</h3>
        <p className="text-xs text-zinc-500 mb-4">
          Permanently delete your gym account and all associated data. This action cannot be undone.
          All member data, invoices, and attendance records will be permanently destroyed.
        </p>
        <Button
          variant="outline"
          size="sm"
          type="button"
          onClick={() => setDeleteOpen(true)}
          className="border-red-800 text-red-400 hover:bg-red-950/30 hover:border-red-700"
        >
          <Trash2 className="h-4 w-4 mr-2" />
          Delete Gym Account
        </Button>
      </div>

      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent className="bg-zinc-900 border-zinc-800 text-white">
          <DialogHeader>
            <DialogTitle className="text-red-400">⚠️ Delete Gym Account</DialogTitle>
            <DialogDescription className="text-zinc-400">
              This will permanently delete your gym, all members, invoices, and attendance records.
              This cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <Label className="text-zinc-300 text-sm">Type <span className="font-mono text-red-400 bg-red-950/30 px-1 rounded">DELETE MY GYM</span> to confirm:</Label>
            <Input
              value={deleteConfirmText}
              onChange={e => setDeleteConfirmText(e.target.value)}
              placeholder="DELETE MY GYM"
              className="bg-zinc-950 border-zinc-700 text-zinc-100 font-mono"
            />
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setDeleteOpen(false)} className="text-zinc-400">Cancel</Button>
            <Button
              onClick={handleDeleteAccount}
              disabled={deleting || deleteConfirmText !== 'DELETE MY GYM'}
              className="bg-red-700 hover:bg-red-600 text-white"
            >
              {deleting ? <><Loader2 className="h-4 w-4 animate-spin mr-2" />Deleting...</> : 'Permanently Delete'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Bulk Member Import Modal */}
      <MemberImportModal
        isOpen={importModalOpen}
        onClose={() => setImportModalOpen(false)}
        existingPlans={plans}
      />
    </div>
    </RequirePermission>
  );
}
