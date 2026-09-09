'use client';

import React, { useState } from 'react';
import { GradientText } from '@/components/magicui/gradient-text';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Save, Plus, Shield, Mail, Trash2 } from 'lucide-react';
import { toast } from 'sonner';

export default function SettingsPage() {
  const [platformSettings, setPlatformSettings] = useState({
    platformName: 'GymERP',
    supportEmail: 'support@gymerp.com',
    defaultTrialDays: 14,
    autoDowngrade: true,
    gracePeriod: 3,
  });

  const [brandingSettings, setBrandingSettings] = useState({
    logoUrl: 'https://gymerp.com/logo.png',
    primaryColor: '#3b82f6',
    footerText: '© 2026 GymERP Inc. All rights reserved.',
  });

  const [paymentSettings, setPaymentSettings] = useState({
    razorpayKeyId: 'rzp_test_XXXXXXXXXXXX',
    razorpayKeySecret: '************************',
    gstRate: 18,
    invoicePrefix: 'PLAT',
  });

  const [admins, setAdmins] = useState([
    { id: '1', name: 'Super Admin', email: 'admin@gymerp.com', role: 'owner', active: true, created_at: '2025-01-10T00:00:00Z' },
    { id: '2', name: 'John Doe', email: 'john@gymerp.com', role: 'admin', active: true, created_at: '2026-02-15T00:00:00Z' },
  ]);

  const [newAdminModal, setNewAdminModal] = useState(false);
  const [newAdminEmail, setNewAdminEmail] = useState('');

  const handleSaveSettings = (section: string) => {
    // Mock save
    toast.success(`${section} settings saved successfully`);
  };

  const handleAddAdmin = () => {
    if (!newAdminEmail) return toast.error('Email is required');
    setAdmins([...admins, {
      id: Date.now().toString(),
      name: 'Pending Invite',
      email: newAdminEmail,
      role: 'admin',
      active: true,
      created_at: new Date().toISOString()
    }]);
    setNewAdminModal(false);
    setNewAdminEmail('');
    toast.success('Admin invitation sent');
  };

  const toggleAdminActive = (id: string, currentStatus: boolean) => {
    setAdmins(admins.map(a => a.id === id ? { ...a, active: !currentStatus } : a));
    toast.success(`Admin ${currentStatus ? 'deactivated' : 'activated'}`);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-zinc-800 pb-4">
        <div>
          <GradientText className="text-2xl font-bold tracking-tight">Platform Settings</GradientText>
          <p className="text-zinc-500 text-xs mt-1">Configure global platform behavior, branding, payments, and admin access.</p>
        </div>
      </div>

      <Tabs defaultValue="platform" className="w-full">
        <TabsList className="bg-zinc-900 border border-zinc-800 w-full justify-start h-auto p-1 overflow-x-auto">
          <TabsTrigger value="platform" className="data-[state=active]:bg-zinc-800 data-[state=active]:text-white">Platform</TabsTrigger>
          <TabsTrigger value="branding" className="data-[state=active]:bg-zinc-800 data-[state=active]:text-white">Branding</TabsTrigger>
          <TabsTrigger value="payments" className="data-[state=active]:bg-zinc-800 data-[state=active]:text-white">Payments</TabsTrigger>
          <TabsTrigger value="admins" className="data-[state=active]:bg-zinc-800 data-[state=active]:text-white">Super Admins</TabsTrigger>
        </TabsList>

        <div className="mt-6">
          {/* Platform Settings */}
          <TabsContent value="platform">
            <Card className="border-zinc-800 bg-zinc-900/40">
              <CardHeader>
                <CardTitle className="text-lg">Global Preferences</CardTitle>
                <CardDescription className="text-zinc-500 text-xs">Core application settings.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label className="text-zinc-300">Platform Name</Label>
                    <Input value={platformSettings.platformName} onChange={e => setPlatformSettings({...platformSettings, platformName: e.target.value})} className="bg-zinc-950 border-zinc-800 text-zinc-100" />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-zinc-300">Support Email</Label>
                    <Input value={platformSettings.supportEmail} onChange={e => setPlatformSettings({...platformSettings, supportEmail: e.target.value})} className="bg-zinc-950 border-zinc-800 text-zinc-100" />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-zinc-300">Default Trial Days</Label>
                    <Input type="number" value={platformSettings.defaultTrialDays} onChange={e => setPlatformSettings({...platformSettings, defaultTrialDays: Number(e.target.value)})} className="bg-zinc-950 border-zinc-800 text-zinc-100" />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-zinc-300">Grace Period Days</Label>
                    <Input type="number" value={platformSettings.gracePeriod} onChange={e => setPlatformSettings({...platformSettings, gracePeriod: Number(e.target.value)})} className="bg-zinc-950 border-zinc-800 text-zinc-100" />
                  </div>
                </div>
                <div className="flex items-center justify-between border border-zinc-800 p-4 rounded-lg bg-zinc-950/50">
                  <div className="space-y-0.5">
                    <Label className="text-zinc-300">Auto-downgrade on Expiry</Label>
                    <p className="text-xs text-zinc-500">Automatically switch gyms to Free plan when subscription expires after grace period.</p>
                  </div>
                  <Switch checked={platformSettings.autoDowngrade} onCheckedChange={c => setPlatformSettings({...platformSettings, autoDowngrade: c})} />
                </div>
                <Button onClick={() => handleSaveSettings('Platform')}>
                  <Save className="w-4 h-4 mr-2" /> Save Changes
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Branding Settings */}
          <TabsContent value="branding">
            <Card className="border-zinc-800 bg-zinc-900/40">
              <CardHeader>
                <CardTitle className="text-lg">Appearance & Branding</CardTitle>
                <CardDescription className="text-zinc-500 text-xs">Customize the look and feel of the super admin panel and communications.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label className="text-zinc-300">Platform Logo URL</Label>
                    <Input value={brandingSettings.logoUrl} onChange={e => setBrandingSettings({...brandingSettings, logoUrl: e.target.value})} className="bg-zinc-950 border-zinc-800 text-zinc-100" />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-zinc-300">Primary Color (Hex)</Label>
                    <div className="flex gap-4">
                      <Input type="color" value={brandingSettings.primaryColor} onChange={e => setBrandingSettings({...brandingSettings, primaryColor: e.target.value})} className="w-16 h-10 p-1 bg-zinc-950 border-zinc-800 rounded cursor-pointer" />
                      <Input value={brandingSettings.primaryColor} onChange={e => setBrandingSettings({...brandingSettings, primaryColor: e.target.value})} className="bg-zinc-950 border-zinc-800 text-zinc-100 uppercase" />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-zinc-300">Footer Text</Label>
                    <Textarea value={brandingSettings.footerText} onChange={e => setBrandingSettings({...brandingSettings, footerText: e.target.value})} className="bg-zinc-950 border-zinc-800 text-zinc-100 min-h-[100px]" />
                  </div>
                </div>
                <Button onClick={() => handleSaveSettings('Branding')}>
                  <Save className="w-4 h-4 mr-2" /> Save Changes
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Payments Settings */}
          <TabsContent value="payments">
            <Card className="border-zinc-800 bg-zinc-900/40">
              <CardHeader>
                <CardTitle className="text-lg">Payment Gateway & Billing</CardTitle>
                <CardDescription className="text-zinc-500 text-xs">Configure Razorpay credentials and tax rules.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label className="text-zinc-300">Razorpay Key ID</Label>
                    <Input type="password" value={paymentSettings.razorpayKeyId} onChange={e => setPaymentSettings({...paymentSettings, razorpayKeyId: e.target.value})} className="bg-zinc-950 border-zinc-800 text-zinc-100" />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-zinc-300">Razorpay Key Secret</Label>
                    <Input type="password" value={paymentSettings.razorpayKeySecret} onChange={e => setPaymentSettings({...paymentSettings, razorpayKeySecret: e.target.value})} className="bg-zinc-950 border-zinc-800 text-zinc-100" />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-zinc-300">GST Rate (%)</Label>
                    <Input type="number" value={paymentSettings.gstRate} onChange={e => setPaymentSettings({...paymentSettings, gstRate: Number(e.target.value)})} className="bg-zinc-950 border-zinc-800 text-zinc-100" />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-zinc-300">Tax Invoice Prefix</Label>
                    <Input value={paymentSettings.invoicePrefix} onChange={e => setPaymentSettings({...paymentSettings, invoicePrefix: e.target.value})} className="bg-zinc-950 border-zinc-800 text-zinc-100 uppercase" />
                  </div>
                </div>
                <Button onClick={() => handleSaveSettings('Payments')}>
                  <Save className="w-4 h-4 mr-2" /> Save Changes
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Super Admins */}
          <TabsContent value="admins">
            <Card className="border-zinc-800 bg-zinc-900/40">
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle className="text-lg">Super Administrators</CardTitle>
                  <CardDescription className="text-zinc-500 text-xs">Manage platform access for staff.</CardDescription>
                </div>
                <Button onClick={() => setNewAdminModal(true)} variant="outline" size="sm" className="bg-zinc-900 border-zinc-700 text-zinc-300">
                  <Plus className="w-4 h-4 mr-2" /> Add Admin
                </Button>
              </CardHeader>
              <CardContent>
                <div className="border border-zinc-800 rounded-md overflow-hidden">
                  <Table>
                    <TableHeader className="bg-zinc-900/60">
                      <TableRow className="border-zinc-800">
                        <TableHead className="text-zinc-400">Name</TableHead>
                        <TableHead className="text-zinc-400">Email</TableHead>
                        <TableHead className="text-zinc-400">Role</TableHead>
                        <TableHead className="text-zinc-400 text-center">Status</TableHead>
                        <TableHead className="text-zinc-400">Added On</TableHead>
                        <TableHead className="text-zinc-400 text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {admins.map(admin => (
                        <TableRow key={admin.id} className="border-zinc-800 hover:bg-zinc-800/10">
                          <TableCell className="font-medium text-zinc-200">{admin.name}</TableCell>
                          <TableCell className="text-zinc-400">{admin.email}</TableCell>
                          <TableCell>
                            <span className={`text-xs px-2 py-1 rounded border ${admin.role === 'owner' ? 'bg-purple-500/10 text-purple-400 border-purple-500/20' : 'bg-blue-500/10 text-blue-400 border-blue-500/20'} capitalize`}>
                              {admin.role}
                            </span>
                          </TableCell>
                          <TableCell className="text-center">
                            <span className={`text-xs ${admin.active ? 'text-green-400' : 'text-zinc-500'}`}>
                              {admin.active ? 'Active' : 'Inactive'}
                            </span>
                          </TableCell>
                          <TableCell className="text-zinc-400 text-xs">{new Date(admin.created_at).toLocaleDateString()}</TableCell>
                          <TableCell className="text-right">
                            {admin.role !== 'owner' && (
                              <Switch checked={admin.active} onCheckedChange={() => toggleAdminActive(admin.id, admin.active)} />
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

        </div>
      </Tabs>

      <Dialog open={newAdminModal} onOpenChange={setNewAdminModal}>
        <DialogContent className="bg-zinc-900 border-zinc-800 text-white sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle>Invite Super Admin</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label className="text-zinc-300">Email Address</Label>
              <Input 
                type="email"
                value={newAdminEmail} 
                onChange={e => setNewAdminEmail(e.target.value)} 
                className="bg-zinc-950 border-zinc-800" 
                placeholder="staff@gymerp.com" 
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setNewAdminModal(false)} className="text-zinc-400">Cancel</Button>
            <Button onClick={handleAddAdmin}>Send Invite</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
