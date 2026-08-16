'use client';

import React, { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import {
  Plus,
  Edit,
  Trash2,
  Check,
  Save,
  Loader2,
  CheckCircle2,
  Zap,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { formatCurrency } from '@/lib/utils/format';
import { toast } from 'sonner';
import { SpotlightCard } from '@/components/magicui/spotlight-card';
import { GlowingBadge } from '@/components/magicui/glowing-badge';
import { GradientText } from '@/components/magicui/gradient-text';
import { BorderBeam } from '@/components/magicui/border-beam';

export default function PlatformPlansPage() {
  const supabase = createClient();

  const [loading, setLoading] = useState(true);
  const [plans, setPlans] = useState<any[]>([]);
  const [openModal, setOpenModal] = useState(false);
  const [saving, setSaving] = useState(false);

  // Modal form states
  const [planId, setPlanId] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [description, setDescription] = useState('');
  const [monthlyPrice, setMonthlyPrice] = useState('');
  const [annualPrice, setAnnualPrice] = useState('');
  const [isActive, setIsActive] = useState(true);
  const [isFeatured, setIsFeatured] = useState(false);
  
  // Features
  const [whatsappEnabled, setWhatsappEnabled] = useState(false);
  const [cctvEnabled, setCctvEnabled] = useState(false);
  
  // Limits
  const [maxMembers, setMaxMembers] = useState('100');
  const [maxStaff, setMaxStaff] = useState('5');
  const [maxWhatsapp, setMaxWhatsapp] = useState('1000');

  const fetchPlans = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('platform_plans')
        .select(`
          *,
          platform_subscriptions(count)
        `)
        .order('monthly_price', { ascending: true });

      if (error) throw error;
      setPlans(data || []);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'An unknown error occurred';
      toast.error('Failed to load platform plans');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPlans();
  }, []);

  const handleOpenAddModal = () => {
    setPlanId(null);
    setName('');
    setSlug('');
    setDescription('');
    setMonthlyPrice('');
    setAnnualPrice('');
    setIsActive(true);
    setIsFeatured(false);
    setWhatsappEnabled(false);
    setCctvEnabled(false);
    setMaxMembers('100');
    setMaxStaff('5');
    setMaxWhatsapp('1000');
    setOpenModal(true);
  };

  const handleOpenEditModal = (plan: any) => {
    setPlanId(plan.id);
    setName(plan.name);
    setSlug(plan.slug);
    setDescription(plan.description || '');
    setMonthlyPrice(plan.monthly_price ? String(plan.monthly_price / 100) : '');
    setAnnualPrice(plan.annual_price ? String(plan.annual_price / 100) : '');
    setIsActive(plan.is_active);
    setIsFeatured(plan.is_featured);
    setWhatsappEnabled(plan.whatsapp_enabled);
    setCctvEnabled(plan.cctv_enabled);
    setMaxMembers(String(plan.max_members || ''));
    setMaxStaff(String(plan.max_staff || ''));
    setMaxWhatsapp(String(plan.max_whatsapp_messages_per_day || ''));
    setOpenModal(true);
  };

  const handleSavePlan = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!name || !slug || !monthlyPrice) {
      toast.error('Please fill required fields (Name, Slug, Monthly Price)');
      return;
    }

    try {
      setSaving(true);
      
      const payload = {
        name,
        slug,
        description,
        monthly_price: Math.round(parseFloat(monthlyPrice) * 100),
        annual_price: annualPrice ? Math.round(parseFloat(annualPrice) * 100) : null,
        is_active: isActive,
        is_featured: isFeatured,
        whatsapp_enabled: whatsappEnabled,
        cctv_enabled: cctvEnabled,
        max_members: parseInt(maxMembers) || null,
        max_staff: parseInt(maxStaff) || null,
        max_whatsapp_messages_per_day: parseInt(maxWhatsapp) || null,
      };

      if (planId) {
        const { error } = await supabase.from('platform_plans').update(payload).eq('id', planId);
        if (error) throw error;
        toast.success('Platform plan updated');
      } else {
        const { error } = await supabase.from('platform_plans').insert(payload);
        if (error) throw error;
        toast.success('Platform plan created');
      }

      setOpenModal(false);
      fetchPlans();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'An unknown error occurred';
      toast.error(msg);
    } finally {
      setSaving(false);
    }
  };

  const handleDeletePlan = async (id: string, planName: string, subCount: number) => {
    if (subCount > 0) {
      toast.error(`Cannot delete ${planName}. It has ${subCount} active subscriptions.`);
      return;
    }
    
    if (!confirm(`Are you sure you want to delete ${planName}?`)) return;

    try {
      const { error } = await supabase.from('platform_plans').delete().eq('id', id);
      if (error) throw error;
      toast.success('Plan deleted');
      setPlans(prev => prev.filter(p => p.id !== id));
    } catch (err: unknown) {
      toast.error('Failed to delete plan');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-zinc-800 pb-4">
        <div>
          <GradientText className="text-2xl font-bold tracking-tight from-amber-400 to-amber-600">Platform Plans</GradientText>
          <p className="text-zinc-500 text-xs mt-1">Manage global subscription plans for Gyms.</p>
        </div>
        <Button onClick={handleOpenAddModal} className="bg-amber-600 hover:bg-amber-700 text-white gap-2 font-medium">
          <Plus className="h-4 w-4" /> Add Plan
        </Button>
      </div>

      {loading ? (
        <div className="flex justify-center items-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-amber-600" />
        </div>
      ) : plans.length === 0 ? (
        <div className="text-center py-20 text-zinc-500 border border-dashed border-zinc-800 rounded-xl bg-zinc-900/10">
          No platform plans found.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {plans.map((plan) => (
            <SpotlightCard
              key={plan.id}
              className={`border-zinc-800 relative flex flex-col justify-between overflow-hidden transition-all ${
                plan.is_featured ? 'border-amber-500/80 shadow-lg shadow-amber-500/5' : 'bg-zinc-900/30'
              } ${!plan.is_active ? 'opacity-60' : ''}`}
            >
              {plan.is_featured && <BorderBeam />}
              {plan.is_featured && (
                <div className="absolute top-0 right-6 -translate-y-1/2 bg-amber-500 text-black px-2.5 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider flex items-center gap-1 z-10">
                  <Zap className="h-3 w-3" /> Featured
                </div>
              )}
              
              <CardHeader className="pb-4">
                <div className="flex justify-between items-start gap-4">
                  <div>
                    <CardTitle className="text-lg font-bold text-zinc-100">{plan.name}</CardTitle>
                    <CardDescription className="text-xs text-zinc-500 mt-0.5">{plan.slug}</CardDescription>
                  </div>
                  <GlowingBadge variant={plan.is_active ? 'active' : 'expired'} className={`text-[9px] ${
                    plan.is_active ? 'bg-green-500/10 text-green-400 border border-green-500/20' : 'bg-zinc-800'
                  }`}>
                    {plan.is_active ? 'Active' : 'Inactive'}
                  </GlowingBadge>
                </div>
                <div className="mt-4 flex items-baseline gap-2">
                  <span className="text-3xl font-extrabold tracking-tight text-zinc-50">₹{(plan.monthly_price / 100).toFixed(0)}</span>
                  <span className="text-xs text-zinc-500">/ mo</span>
                </div>
                {plan.annual_price && (
                  <div className="text-xs text-zinc-500 mt-1">
                    ₹{(plan.annual_price / 100).toFixed(0)} / yr
                  </div>
                )}
                <p className="text-xs text-zinc-400 mt-4 line-clamp-2">{plan.description}</p>
              </CardHeader>

              <CardContent className="flex-1 border-t border-zinc-800/40 pt-4">
                <div className="space-y-4">
                  <div>
                    <h4 className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider mb-2">Features</h4>
                    <ul className="space-y-2 text-xs text-zinc-300">
                      <li className="flex items-center gap-2">
                        {plan.whatsapp_enabled ? <Check className="h-3.5 w-3.5 text-amber-400" /> : <div className="h-3.5 w-3.5" />}
                        <span className={plan.whatsapp_enabled ? '' : 'text-zinc-600 line-through'}>WhatsApp Integration</span>
                      </li>
                      <li className="flex items-center gap-2">
                        {plan.cctv_enabled ? <Check className="h-3.5 w-3.5 text-amber-400" /> : <div className="h-3.5 w-3.5" />}
                        <span className={plan.cctv_enabled ? '' : 'text-zinc-600 line-through'}>CCTV Integration</span>
                      </li>
                    </ul>
                  </div>
                  <div>
                    <h4 className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider mb-2">Limits</h4>
                    <ul className="space-y-2 text-xs text-zinc-300">
                      <li className="flex justify-between">
                        <span className="text-zinc-400">Members</span>
                        <span className="font-semibold">{plan.max_members ? plan.max_members.toLocaleString() : 'Unlimited'}</span>
                      </li>
                      <li className="flex justify-between">
                        <span className="text-zinc-400">Staff</span>
                        <span className="font-semibold">{plan.max_staff ? plan.max_staff.toLocaleString() : 'Unlimited'}</span>
                      </li>
                    </ul>
                  </div>
                </div>
              </CardContent>

              <CardFooter className="border-t border-zinc-800/40 pt-4 flex gap-2 justify-between bg-zinc-900/10 z-10">
                <div className="text-xs text-zinc-400">
                  <span className="font-bold text-amber-400">{plan.platform_subscriptions?.[0]?.count || 0}</span> subscribers
                </div>
                <div className="flex gap-1">
                  <Button variant="ghost" size="icon" onClick={() => handleOpenEditModal(plan)} className="h-8 w-8 text-zinc-400 hover:text-white">
                    <Edit className="h-4 w-4" />
                  </Button>
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    onClick={() => handleDeletePlan(plan.id, plan.name, plan.platform_subscriptions?.[0]?.count || 0)} 
                    className="h-8 w-8 text-zinc-400 hover:text-red-400"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </CardFooter>
            </SpotlightCard>
          ))}
        </div>
      )}

      {/* Add/Edit Modal */}
      <Dialog open={openModal} onOpenChange={setOpenModal}>
        <DialogContent className="bg-zinc-900 border-zinc-800 text-white max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold">{planId ? 'Edit Plan' : 'Create Plan'}</DialogTitle>
            <DialogDescription className="text-zinc-500 text-xs">Configure platform plan details.</DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSavePlan} className="space-y-6 pt-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-zinc-300 text-xs">Plan Name *</Label>
                <Input required value={name} onChange={e => setName(e.target.value)} className="border-zinc-800 bg-zinc-950" />
              </div>
              <div className="space-y-2">
                <Label className="text-zinc-300 text-xs">Slug *</Label>
                <Input required value={slug} onChange={e => setSlug(e.target.value)} className="border-zinc-800 bg-zinc-950" />
              </div>
            </div>
            
            <div className="space-y-2">
              <Label className="text-zinc-300 text-xs">Description</Label>
              <Textarea value={description} onChange={e => setDescription(e.target.value)} className="border-zinc-800 bg-zinc-950 resize-none h-20" />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-zinc-300 text-xs">Monthly Price (₹) *</Label>
                <Input type="number" required value={monthlyPrice} onChange={e => setMonthlyPrice(e.target.value)} className="border-zinc-800 bg-zinc-950" />
              </div>
              <div className="space-y-2">
                <Label className="text-zinc-300 text-xs">Annual Price (₹)</Label>
                <Input type="number" value={annualPrice} onChange={e => setAnnualPrice(e.target.value)} className="border-zinc-800 bg-zinc-950" />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-6 p-4 border border-zinc-800 rounded-lg bg-zinc-950/50">
              <div className="space-y-4">
                <h4 className="text-xs font-semibold text-zinc-400">Features</h4>
                <div className="flex items-center space-x-2">
                  <Switch checked={whatsappEnabled} onCheckedChange={setWhatsappEnabled} className="data-[state=checked]:bg-amber-600" />
                  <Label className="text-xs">WhatsApp Integration</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Switch checked={cctvEnabled} onCheckedChange={setCctvEnabled} className="data-[state=checked]:bg-amber-600" />
                  <Label className="text-xs">CCTV Integration</Label>
                </div>
              </div>
              <div className="space-y-4">
                <h4 className="text-xs font-semibold text-zinc-400">Display & Status</h4>
                <div className="flex items-center space-x-2">
                  <Switch checked={isActive} onCheckedChange={setIsActive} className="data-[state=checked]:bg-amber-600" />
                  <Label className="text-xs">Active (Available for purchase)</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Switch checked={isFeatured} onCheckedChange={setIsFeatured} className="data-[state=checked]:bg-amber-600" />
                  <Label className="text-xs">Featured (Highlighted styling)</Label>
                </div>
              </div>
            </div>

            <div className="space-y-4 p-4 border border-zinc-800 rounded-lg bg-zinc-950/50">
              <h4 className="text-xs font-semibold text-zinc-400">Plan Limits</h4>
              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label className="text-zinc-300 text-xs">Max Members</Label>
                  <Input type="number" value={maxMembers} onChange={e => setMaxMembers(e.target.value)} placeholder="e.g. 100" className="border-zinc-800 bg-zinc-950 text-xs" />
                </div>
                <div className="space-y-2">
                  <Label className="text-zinc-300 text-xs">Max Staff</Label>
                  <Input type="number" value={maxStaff} onChange={e => setMaxStaff(e.target.value)} placeholder="e.g. 5" className="border-zinc-800 bg-zinc-950 text-xs" />
                </div>
                <div className="space-y-2">
                  <Label className="text-zinc-300 text-xs">Max WA/Day</Label>
                  <Input type="number" value={maxWhatsapp} onChange={e => setMaxWhatsapp(e.target.value)} placeholder="e.g. 1000" className="border-zinc-800 bg-zinc-950 text-xs" />
                </div>
              </div>
            </div>

            <DialogFooter className="border-t border-zinc-800/60 pt-4">
              <Button type="button" variant="ghost" onClick={() => setOpenModal(false)} className="text-zinc-400 text-xs">Cancel</Button>
              <Button type="submit" disabled={saving} className="bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold gap-2">
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                {planId ? 'Save Changes' : 'Create Plan'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
