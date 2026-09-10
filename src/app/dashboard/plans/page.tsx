'use client';

import React, { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import type { Plan } from '@/types/database';
import { usePermission } from '@/hooks/usePermission';
import {
  CreditCard,
  Plus,
  Edit,
  Trash2,
  CheckCircle2,
  XCircle,
  Loader2,
  Check,
  Zap,
  Save,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { formatCurrency } from '@/lib/utils/format';
import { toast } from 'sonner';
import { SpotlightCard, GlowingBadge, GradientText, BorderBeam } from '@/components/magicui';

export default function PlansCRUDPage() {
  const supabase = createClient();
  const { user } = useAuth();
  const { can } = usePermission();

  const [loading, setLoading] = useState(true);
  const [plans, setPlans] = useState<Plan[]>([]);
  const [openModal, setOpenModal] = useState(false);
  const [saving, setSaving] = useState(false);

  // Modal form states
  const [planId, setPlanId] = useState<string | null>(null); // null = Add, non-null = Edit
  const [name, setName] = useState('');
  const [duration, setDuration] = useState('');
  const [price, setPrice] = useState('');
  const [features, setFeatures] = useState<string[]>(['Gym Access']);
  const [featureInput, setFeatureInput] = useState('');
  const [isPopular, setIsPopular] = useState(false);

  const fetchPlans = async () => {
    if (!user?.gymId) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const res = await fetch(`/api/plans?gymId=${user.gymId}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to fetch plans');
      setPlans(data.plans || []);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Unknown error';
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPlans();
  }, [user?.gymId]);

  const handleOpenAddModal = () => {
    setPlanId(null);
    setName('');
    setDuration('');
    setPrice('');
    setFeatures(['Gym Access']);
    setFeatureInput('');
    setIsPopular(false);
    setOpenModal(true);
  };

  const handleOpenEditModal = (plan: Plan) => {
    setPlanId(plan.id);
    setName(plan.name);
    setDuration(String(plan.duration_days));
    setPrice(String(plan.price));
    setFeatures(plan.features || []);
    setFeatureInput('');
    setIsPopular(plan.is_popular || false);
    setOpenModal(true);
  };

  const handleAddFeature = () => {
    if (featureInput.trim() && !features.includes(featureInput.trim())) {
      setFeatures([...features, featureInput.trim()]);
      setFeatureInput('');
    }
  };

  const handleRemoveFeature = (feat: string) => {
    setFeatures(features.filter(f => f !== feat));
  };

  const handleSavePlan = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!can('plans.manage')) {
      toast.error('You do not have permission to manage plans');
      return;
    }
    if (!name.trim() || !duration.trim() || !price.trim()) {
      toast.error('Please fill in all fields');
      return;
    }

    try {
      setSaving(true);
      
      const planPayload = {
        name: name.trim(),
        duration_days: parseInt(duration),
        price: parseFloat(price),
        features,
        is_popular: isPopular,
        is_active: true,
      };

      if (planId) {
        // Edit existing plan via API
        const res = await fetch('/api/plans', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id: planId, ...planPayload }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Failed to update plan');
        toast.success('Membership plan updated');
      } else {
        // Add new plan via API
        const res = await fetch('/api/plans', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ...planPayload, display_order: plans.length + 1 }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Failed to create plan');
        toast.success('Membership plan created');
      }

      setOpenModal(false);
      fetchPlans();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Unknown error';
      toast.error(msg);
    } finally {
      setSaving(false);
    }
  };

  const handleToggleActive = async (id: string, currentVal: boolean) => {
    if (!can('plans.manage')) {
      toast.error('You do not have permission to toggle plans');
      return;
    }

    try {
      const res = await fetch('/api/plans', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, is_active: !currentVal }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to update plan status');

      toast.success(currentVal ? 'Plan deactivated' : 'Plan activated');
      setPlans(prev => prev.map(p => p.id === id ? { ...p, is_active: !currentVal } : p));
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Unknown error';
      toast.error(msg);
    }
  };

  const handleDeletePlan = async (id: string, name: string) => {
    if (!can('plans.manage')) {
      toast.error('You do not have permission to delete plans');
      return;
    }
    if (!confirm(`Are you sure you want to delete plan: ${name}?`)) return;

    try {
      const res = await fetch(`/api/plans?id=${id}`, { method: 'DELETE' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to delete plan');

      toast.success('Plan deleted');
      setPlans(prev => prev.filter(p => p.id !== id));
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'An unknown error occurred';
      toast.error(msg);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-zinc-800 pb-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-zinc-100"><GradientText>Membership Plans</GradientText></h2>
          <p className="text-zinc-500 text-xs mt-1">Configure pricing tiers, validity periods, and highlight options for members.</p>
        </div>
        {can('plans.manage') && (
          <Button onClick={handleOpenAddModal} className="bg-purple-600 hover:bg-purple-700 text-white gap-2 font-medium">
            <Plus className="h-4 w-4" /> Create New Plan
          </Button>
        )}
      </div>

      {/* Grid: Plan Cards */}
      {loading ? (
        <div className="flex justify-center items-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-purple-600" />
        </div>
      ) : plans.length === 0 ? (
        <div className="text-center py-16">
          <div className="text-5xl mb-4">📋</div>
          <h3 className="text-lg font-semibold text-zinc-200 mb-2">No plans yet</h3>
          <p className="text-zinc-400 text-sm mb-8">Create your first membership plan or start with common Indian gym plans</p>
          
          {/* Quick create cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 max-w-2xl mx-auto mb-8">
            {[
              { name: 'Monthly', days: 30, price: 1000 },
              { name: 'Quarterly', days: 90, price: 2500 },
              { name: 'Annual', days: 365, price: 8000 },
            ].map(template => (
              <button
                key={template.name}
                onClick={async () => {
                  try {
                    const res = await fetch('/api/plans', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({
                        name: template.name,
                        duration_days: template.days,
                        price: template.price,
                        features: ['Full gym access', 'Locker', 'WiFi'],
                        highlights: [],
                        is_active: true,
                        is_popular: template.name === 'Quarterly',
                      }),
                    });
                    const data = await res.json();
                    if (!res.ok) throw new Error(data.error || 'Failed to create plan');
                    toast.success(`${template.name} plan created!`);
                    fetchPlans(); // refresh
                  } catch (err: unknown) {
                    const msg = err instanceof Error ? err.message : 'Failed to create plan';
                    toast.error(msg);
                  }
                }}
                className="rounded-xl border border-zinc-700 hover:border-purple-500/50 bg-zinc-900 hover:bg-purple-950/20 p-4 text-left transition-all group"
              >
                <div className="font-semibold text-zinc-200 group-hover:text-purple-300">{template.name}</div>
                <div className="text-xs text-zinc-500 mt-1">{template.days} days</div>
                <div className="text-lg font-bold text-purple-400 mt-2">₹{template.price.toLocaleString('en-IN')}</div>
                <div className="text-xs text-zinc-500 mt-2 opacity-0 group-hover:opacity-100 transition-opacity">Click to create</div>
              </button>
            ))}
          </div>
          
          <Button onClick={handleOpenAddModal} variant="outline" className="border-zinc-700 text-zinc-300 hover:bg-zinc-800">
            Or create a custom plan
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {plans.map((plan) => (
            <Card
              key={plan.id}
              className={`border-zinc-800 relative bg-zinc-900/30 flex flex-col justify-between overflow-hidden transition-all ${
                plan.is_popular ? 'border-purple-500/80 shadow-lg shadow-purple-500/5' : ''
              } ${!plan.is_active ? 'opacity-60' : ''}`}
            >
              {plan.is_popular && (
                <div className="absolute top-0 right-6 -translate-y-1/2 bg-purple-500 text-white px-2.5 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider">
                  Popular Choice
                </div>
              )}
              
              <CardHeader className="pb-4">
                <div className="flex justify-between items-start gap-4">
                  <div>
                    <CardTitle className="text-lg font-bold text-zinc-100">{plan.name}</CardTitle>
                    <CardDescription className="text-xs text-zinc-500 mt-0.5">{plan.duration_days} days validity</CardDescription>
                  </div>
                  <GlowingBadge variant={plan.is_active ? 'active' : 'expired'} className={`text-[9px] ${
                    plan.is_active ? 'bg-green-500/10 text-green-400 border border-green-500/20' : 'bg-zinc-800'
                  }`}>
                    {plan.is_active ? 'Active' : 'Inactive'}
                  </GlowingBadge>
                </div>
                <div className="mt-4 flex items-baseline">
                  <span className="text-3xl font-extrabold tracking-tight text-zinc-50">{formatCurrency(plan.price)}</span>
                  <span className="text-xs text-zinc-500 ml-1">/ plan price</span>
                </div>
              </CardHeader>

              <CardContent className="flex-1 border-t border-zinc-800/40 pt-4">
                <ul className="space-y-2.5 text-xs text-zinc-400">
                  {plan.features?.map((feat: string, idx: number) => (
                    <li key={idx} className="flex items-center gap-2">
                      <Check className="h-3.5 w-3.5 text-purple-400 shrink-0" />
                      <span>{feat}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>

              <CardFooter className="border-t border-zinc-800/40 pt-4 flex gap-2 justify-between bg-zinc-900/10">
                {can('plans.manage') && (
                  <>
                    <div className="flex items-center gap-1.5 text-xs text-zinc-500">
                      <Switch
                        id={`active-${plan.id}`}
                        checked={plan.is_active}
                        onCheckedChange={() => handleToggleActive(plan.id, plan.is_active)}
                        className="scale-75 text-purple-600"
                      />
                      <Label htmlFor={`active-${plan.id}`} className="cursor-pointer text-[10px]">
                        Active
                      </Label>
                    </div>

                    <div className="flex gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleOpenEditModal(plan)}
                        className="h-8 w-8 text-zinc-400 hover:text-white"
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDeletePlan(plan.id, plan.name)}
                        className="h-8 w-8 text-zinc-400 hover:text-red-400"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </>
                )}
              </CardFooter>
            </Card>
          ))}
        </div>
      )}

      {/* Add/Edit Plan Dialog Modal */}
      <Dialog open={openModal} onOpenChange={setOpenModal}>
        <DialogContent className="bg-zinc-900 border-zinc-800 text-white max-w-md">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold">{planId ? 'Edit Membership Plan' : 'Create New Plan'}</DialogTitle>
            <DialogDescription className="text-zinc-500 text-xs">Configure details to publish the gym pricing tier.</DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSavePlan} className="space-y-4 pt-4">
            <div className="grid gap-2">
              <Label htmlFor="planName" className="text-zinc-300 text-xs">Plan Name *</Label>
              <Input
                id="planName"
                placeholder="e.g. 3 Month Pro Package"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="border-zinc-800 bg-zinc-950 text-zinc-100 placeholder:text-zinc-700"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="planDuration" className="text-zinc-300 text-xs">Duration (Days) *</Label>
                <Input
                  id="planDuration"
                  type="number"
                  placeholder="90"
                  required
                  value={duration}
                  onChange={(e) => setDuration(e.target.value)}
                  className="border-zinc-800 bg-zinc-950 text-zinc-100 placeholder:text-zinc-700"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="planPrice" className="text-zinc-300 text-xs">Price (₹) *</Label>
                <Input
                  id="planPrice"
                  type="number"
                  placeholder="2499"
                  required
                  value={price}
                  onChange={(e) => setPrice(e.target.value)}
                  className="border-zinc-800 bg-zinc-950 text-zinc-100 placeholder:text-zinc-700 font-bold"
                />
              </div>
            </div>

            <div className="flex items-center space-x-2 py-2">
              <Switch
                id="popular"
                checked={isPopular}
                onCheckedChange={setIsPopular}
                className="text-purple-600"
              />
              <Label htmlFor="popular" className="text-zinc-300 text-xs font-semibold cursor-pointer">
                Mark as "Popular Choice" badge
              </Label>
            </div>

            {/* Features Array builder */}
            <div className="space-y-2 border-t border-zinc-800/60 pt-4">
              <Label className="text-zinc-300 text-xs font-semibold">Included Plan Features</Label>
              <div className="flex gap-2">
                <Input
                  placeholder="e.g. Free Diet Schedule"
                  value={featureInput}
                  onChange={(e) => setFeatureInput(e.target.value)}
                  className="border-zinc-800 bg-zinc-950 text-zinc-100 placeholder:text-zinc-700 flex-1 text-xs"
                />
                <Button type="button" onClick={handleAddFeature} className="bg-zinc-800 hover:bg-zinc-700 text-white text-xs px-3">
                  Add
                </Button>
              </div>
              
              <div className="flex flex-wrap gap-1.5 mt-2">
                {features.map(f => (
                  <Badge
                    key={f}
                    onClick={() => handleRemoveFeature(f)}
                    className="bg-purple-950/40 text-purple-300 border border-purple-800/30 text-[10px] cursor-pointer hover:bg-red-950/40 hover:text-red-400 hover:border-red-800/20"
                  >
                    {f} &times;
                  </Badge>
                ))}
              </div>
            </div>

            <DialogFooter className="border-t border-zinc-800/60 pt-4 mt-6">
              <Button type="button" variant="ghost" onClick={() => setOpenModal(false)} className="text-zinc-400 hover:bg-zinc-800 text-xs">
                Cancel
              </Button>
              <Button type="submit" disabled={saving} className="bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold gap-2">
                {saving ? <Loader2 className="h-4 w-4 animate-spin text-white" /> : <Save className="h-4 w-4" />}
                {planId ? 'Save Changes' : 'Create Plan'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
