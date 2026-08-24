'use client';

import React, { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { usePermission } from '@/hooks/usePermission';
import {
  Apple,
  Plus,
  PlusCircle,
  Trash2,
  Save,
  Loader2,
  Users,
  Eye,
  Trash,
  Search,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Meal, MealItem } from '@/types/database';

export default function DietChartsPage() {
  const supabase = createClient();
  const { user } = useAuth();
  const { can } = usePermission();

  const [loading, setLoading] = useState(true);
  const [diets, setDiets] = useState<any[]>([]);
  const [openModal, setOpenModal] = useState(false);
  const [saving, setSaving] = useState(false);

  // Assignment Modal states
  const [openAssignModal, setOpenAssignModal] = useState(false);
  const [assigning, setAssigning] = useState(false);
  const [selectedDiet, setSelectedDiet] = useState<any>(null);
  const [members, setMembers] = useState<any[]>([]);
  const [selectedMemberIds, setSelectedMemberIds] = useState<string[]>([]);
  const [memberSearch, setMemberSearch] = useState('');

  // Form states (Diet details)
  const [dietId, setDietId] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [targetCalories, setTargetCalories] = useState('');
  const [isTemplate, setIsTemplate] = useState(true);
  
  // Meals array
  const [meals, setMeals] = useState<Meal[]>([]);

  // Current meal items builders
  const [currentMealName, setCurrentMealName] = useState('');
  const [currentMealTime, setCurrentMealTime] = useState('');
  const [currentItems, setCurrentItems] = useState<MealItem[]>([]);
  
  const [itemName, setItemName] = useState('');
  const [itemQty, setItemQty] = useState('');
  const [itemCals, setItemCals] = useState('');
  const [itemPro, setItemPro] = useState('');

  const fetchDiets = async () => {
    if (!user?.gymId) return;

    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('diet_charts')
        .select('*')
        .eq('gym_id', user.gymId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setDiets(data || []);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'An unknown error occurred';
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDiets();
  }, [user?.gymId]);

  useEffect(() => {
    if (!user?.gymId) return;
    // Load members for assignment dropdown
    supabase
      .from('members')
      .select('id, name, member_code')
      .eq('gym_id', user.gymId)
      .eq('status', 'active')
      .then((res: any) => { const data = res.data;
        if (data) setMembers(data);
      });
  }, [user?.gymId]);

  const handleOpenAddModal = () => {
    if (!can('diet.manage')) {
      toast.error('You do not have permission to manage diets');
      return;
    }
    setDietId(null);
    setName('');
    setDescription('');
    setTargetCalories('');
    setIsTemplate(true);
    setMeals([]);
    resetMealBuilder();
    setOpenModal(true);
  };

  const handleOpenEditModal = (diet: any) => {
    if (!can('diet.manage')) {
      toast.error('You do not have permission to manage diets');
      return;
    }
    setDietId(diet.id);
    setName(diet.name);
    setDescription(diet.description || '');
    setTargetCalories(diet.target_calories ? String(diet.target_calories) : '');
    setIsTemplate(diet.is_template);
    setMeals(diet.meals || []);
    resetMealBuilder();
    setOpenModal(true);
  };

  const handleOpenAssignModal = (diet: any) => {
    if (!can('diet.manage')) {
      toast.error('You do not have permission to assign diets');
      return;
    }
    setSelectedDiet(diet);
    setSelectedMemberIds([]);
    setMemberSearch('');
    setOpenAssignModal(true);
  };

  const resetMealBuilder = () => {
    setCurrentMealName('');
    setCurrentMealTime('');
    setCurrentItems([]);
    resetItemBuilder();
  };

  const resetItemBuilder = () => {
    setItemName('');
    setItemQty('');
    setItemCals('');
    setItemPro('');
  };

  const handleAddItemToMeal = () => {
    if (itemName.trim()) {
      const newItem: MealItem = {
        name: itemName.trim(),
        qty: itemQty.trim() || '1 serve',
        calories: parseInt(itemCals) || 0,
        protein: parseInt(itemPro) || 0,
      };
      setCurrentItems([...currentItems, newItem]);
      resetItemBuilder();
    }
  };

  const handleRemoveItemFromMeal = (index: number) => {
    setCurrentItems(currentItems.filter((_, i) => i !== index));
  };

  const handleAddMeal = () => {
    if (currentMealName.trim() && currentItems.length > 0) {
      const newMeal: Meal = {
        meal_name: currentMealName.trim(),
        time: currentMealTime.trim() || '08:00 AM',
        items: currentItems,
      };
      setMeals([...meals, newMeal]);
      resetMealBuilder();
    } else {
      toast.error('Please specify meal name and add at least one food item');
    }
  };

  const handleRemoveMeal = (idx: number) => {
    setMeals(meals.filter((_, i) => i !== idx));
  };

  const handleSaveDiet = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || meals.length === 0) {
      toast.error('Name and at least one meal are required');
      return;
    }

    try {
      setSaving(true);

      const payload = {
        gym_id: user?.gymId,
        name: name.trim(),
        description: description.trim() || null,
        target_calories: targetCalories ? parseInt(targetCalories) : null,
        is_template: isTemplate,
        meals,
        created_by: user?.id,
      };

      if (dietId) {
        const { error } = await supabase
          .from('diet_charts')
          .update(payload)
          .eq('id', dietId)
          .eq('gym_id', user?.gymId);

        if (error) throw error;
        toast.success('Diet plan updated');
      } else {
        const { error } = await supabase
          .from('diet_charts')
          .insert(payload);

        if (error) throw error;
        toast.success('Diet plan template created');
      }

      setOpenModal(false);
      fetchDiets();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'An unknown error occurred';
      toast.error(msg);
    } finally {
      setSaving(false);
    }
  };

  const handleAssignDiet = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedDiet || selectedMemberIds.length === 0) return;

    try {
      setAssigning(true);
      let success = 0;
      let fail = 0;

      for (const memberId of selectedMemberIds) {
        const { error } = await supabase
          .from('members')
          .update({ diet_chart_id: selectedDiet.id })
          .eq('id', memberId)
          .eq('gym_id', user?.gymId);

        if (error) {
          fail++;
        } else {
          success++;
          await supabase.from('whatsapp_logs').insert({
            gym_id: user?.gymId,
            member_id: memberId,
            recipient_phone: '919876543210',
            recipient_name: 'Member',
            message_type: 'document',
            document_type: 'diet_chart',
            status: 'delivered',
          });
        }
      }

      if (fail === 0) {
        toast.success(`✅ Assigned "${selectedDiet.name}" to ${success} member${success > 1 ? 's' : ''}`);
      } else {
        toast.warning(`Assigned to ${success}, failed for ${fail}`);
      }

      setOpenAssignModal(false);
      setSelectedMemberIds([]);
      setMemberSearch('');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'An unknown error occurred';
      toast.error(msg);
    } finally {
      setAssigning(false);
    }
  };

  const handleDeleteDiet = async (id: string, dietName: string) => {
    if (!confirm(`Are you sure you want to delete diet plan: ${dietName}?`)) return;

    try {
      const { error } = await supabase
        .from('diet_charts')
        .delete()
        .eq('id', id)
        .eq('gym_id', user?.gymId);

      if (error) throw error;
      toast.success('Diet plan deleted');
      setDiets(prev => prev.filter(d => d.id !== id));
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
          <h2 className="text-2xl font-bold tracking-tight text-zinc-100">Nutrition & Diets</h2>
          <p className="text-zinc-500 text-xs mt-1">Configure calorie schedules, generate meal templates, and link plans to member profiles.</p>
        </div>
        {can('diet.manage') && (
          <Button onClick={handleOpenAddModal} className="bg-purple-600 hover:bg-purple-700 text-white gap-2 font-medium">
            <Plus className="h-4 w-4" /> Create Diet Plan
          </Button>
        )}
      </div>

      {/* Grid: Plan Cards */}
      {loading ? (
        <div className="flex justify-center items-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-purple-600" />
        </div>
      ) : diets.length === 0 ? (
        <div className="text-center py-20 text-zinc-500 border border-dashed border-zinc-800 rounded-xl">
          No diet charts created yet. Click "Create Diet Plan" to begin.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {diets.map((diet) => (
            <Card key={diet.id} className="border-zinc-800 bg-zinc-900/30 flex flex-col justify-between overflow-hidden">
              <CardHeader className="pb-3">
                <div className="flex justify-between items-start gap-4">
                  <div>
                    <CardTitle className="text-sm font-bold text-zinc-100">{diet.name}</CardTitle>
                    {diet.target_calories && (
                      <Badge className="bg-purple-950/40 text-purple-400 border border-purple-800/20 text-[9px] mt-1.5 font-bold">
                        Target: {diet.target_calories} Kcal
                      </Badge>
                    )}
                  </div>
                </div>
                <p className="text-zinc-500 text-xs mt-1.5 leading-relaxed truncate">{diet.description || 'No description provided.'}</p>
              </CardHeader>

              <CardContent className="flex-1 border-t border-zinc-800/40 pt-3 text-xs">
                <span className="text-[10px] text-zinc-500 font-semibold uppercase tracking-wider">Meals ({diet.meals?.length || 0})</span>
                <div className="space-y-2 mt-2 max-h-[140px] overflow-y-auto">
                  {diet.meals?.map((m: any, idx: number) => (
                    <div key={idx} className="flex justify-between items-center bg-zinc-950/30 p-2 border border-zinc-800 rounded">
                      <span className="font-semibold text-zinc-200">{m.meal_name}</span>
                      <span className="text-zinc-500 text-[10px]">{m.time}</span>
                    </div>
                  ))}
                </div>
              </CardContent>

              <CardFooter className="border-t border-zinc-800/40 pt-3 flex gap-2 justify-between bg-zinc-900/10">
                {can('diet.manage') ? (
                  <>
                    <Button
                      variant="ghost"
                      onClick={() => handleOpenAssignModal(diet)}
                      className="text-purple-400 hover:text-purple-300 hover:bg-purple-950/10 text-xs px-2.5 h-8 gap-1.5 font-medium"
                    >
                      <Users className="h-4 w-4" /> Link Member
                    </Button>
                    <div className="flex gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleOpenEditModal(diet)}
                        className="h-8 w-8 text-zinc-400 hover:text-white"
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDeleteDiet(diet.id, diet.name)}
                        className="h-8 w-8 text-zinc-400 hover:text-red-400"
                      >
                        <Trash className="h-4 w-4" />
                      </Button>
                    </div>
                  </>
                ) : (
                  <span className="text-[10px] text-zinc-600 italic">Read-only permissions</span>
                )}
              </CardFooter>
            </Card>
          ))}
        </div>
      )}

      {/* Add/Edit Diet Builder Modal */}
      <Dialog open={openModal} onOpenChange={setOpenModal}>
        <DialogContent className="bg-zinc-900 border-zinc-800 text-white max-w-2xl">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold">{dietId ? 'Modify Diet Schedule' : 'Create Calorie Plan'}</DialogTitle>
            <DialogDescription className="text-zinc-500 text-xs">Build customized meals and nutritional values.</DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSaveDiet} className="space-y-4 pt-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="dietName" className="text-zinc-300 text-xs font-semibold">Diet Plan Name *</Label>
                <Input
                  id="dietName"
                  placeholder="e.g. Muscle Gain Deficit"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="border-zinc-800 bg-zinc-950 text-zinc-100 text-xs"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="cals" className="text-zinc-300 text-xs font-semibold">Daily Calorie Target (Kcal)</Label>
                <Input
                  id="cals"
                  type="number"
                  placeholder="2200"
                  value={targetCalories}
                  onChange={(e) => setTargetCalories(e.target.value)}
                  className="border-zinc-800 bg-zinc-950 text-zinc-100 text-xs"
                />
              </div>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="desc" className="text-zinc-300 text-xs">Plan Description</Label>
              <Input
                id="desc"
                placeholder="High protein diet mapped for bodybuilders"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="border-zinc-800 bg-zinc-950 text-zinc-100 text-xs"
              />
            </div>

            {/* Meal Builder Grid Submodule */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 border-t border-zinc-800/80 pt-4">
              {/* Left: Meal scheduler form */}
              <div className="space-y-3.5 border border-zinc-800 p-3 rounded-lg bg-zinc-950/20">
                <span className="text-[10px] font-extrabold uppercase text-purple-400 tracking-wider">Meal Composer</span>
                
                <div className="grid grid-cols-2 gap-2">
                  <div className="grid gap-1">
                    <Label htmlFor="mName" className="text-[10px] text-zinc-400">Meal Title</Label>
                    <Input
                      id="mName"
                      placeholder="Breakfast"
                      value={currentMealName}
                      onChange={(e) => setCurrentMealName(e.target.value)}
                      className="border-zinc-800 bg-zinc-950 text-[11px] h-8"
                    />
                  </div>
                  <div className="grid gap-1">
                    <Label htmlFor="mTime" className="text-[10px] text-zinc-400">Time</Label>
                    <Input
                      id="mTime"
                      placeholder="08:00 AM"
                      value={currentMealTime}
                      onChange={(e) => setCurrentMealTime(e.target.value)}
                      className="border-zinc-800 bg-zinc-950 text-[11px] h-8"
                    />
                  </div>
                </div>

                {/* Items composer inside meal */}
                <div className="border border-zinc-800/50 p-2.5 rounded bg-zinc-950/40 space-y-2">
                  <span className="text-[9px] text-zinc-500 font-bold block border-b border-zinc-800 pb-1">Food Items</span>
                  <div className="grid grid-cols-2 gap-2">
                    <Input placeholder="Oats" value={itemName} onChange={(e) => setItemName(e.target.value)} className="text-[10px] h-7 border-zinc-800" />
                    <Input placeholder="50g / 1 bowl" value={itemQty} onChange={(e) => setItemQty(e.target.value)} className="text-[10px] h-7 border-zinc-800" />
                    <Input placeholder="Cals (150)" type="number" value={itemCals} onChange={(e) => setItemCals(e.target.value)} className="text-[10px] h-7 border-zinc-800" />
                    <Input placeholder="Protein (8g)" type="number" value={itemPro} onChange={(e) => setItemPro(e.target.value)} className="text-[10px] h-7 border-zinc-800" />
                  </div>
                  <Button type="button" onClick={handleAddItemToMeal} size="sm" variant="secondary" className="w-full text-[10px] h-7 bg-zinc-900 hover:bg-zinc-800 text-zinc-400">
                    <PlusCircle className="h-3.5 w-3.5 mr-1" /> Add Food Item
                  </Button>

                  {/* Added items list in active meal */}
                  <div className="space-y-1 max-h-[80px] overflow-y-auto mt-2.5">
                    {currentItems.map((item, idx) => (
                      <div key={idx} className="flex justify-between items-center bg-zinc-900/40 p-1.5 rounded text-[10px] text-zinc-400">
                        <span>{item.name} ({item.qty}) • {item.calories} Kcal</span>
                        <button type="button" onClick={() => handleRemoveItemFromMeal(idx)} className="text-red-500 font-bold hover:text-red-400 px-1">
                          &times;
                        </button>
                      </div>
                    ))}
                  </div>
                </div>

                <Button type="button" onClick={handleAddMeal} className="w-full bg-purple-600 hover:bg-purple-700 text-white text-xs h-8 font-bold">
                  Add Meal to Diet Chart
                </Button>
              </div>

              {/* Right: Added meals preview summary */}
              <div className="space-y-2 max-h-[300px] overflow-y-auto border border-zinc-800 p-3 rounded bg-zinc-950/20">
                <span className="text-[10px] font-extrabold uppercase text-zinc-500 tracking-wider">Plan Summary ({meals.length} Meals)</span>
                {meals.length === 0 ? (
                  <div className="text-center text-zinc-600 text-xs py-16">No meals added to the plan.</div>
                ) : (
                  <div className="space-y-2">
                    {meals.map((meal, idx) => (
                      <div key={idx} className="border border-zinc-800 bg-zinc-900/30 p-2.5 rounded relative">
                        <div className="flex justify-between">
                          <span className="text-xs font-bold text-zinc-200">{meal.meal_name}</span>
                          <span className="text-[10px] text-purple-400 font-semibold">{meal.time}</span>
                        </div>
                        <div className="space-y-1 mt-1 text-[10px] text-zinc-400">
                          {meal.items.map((it, i) => (
                            <div key={i}>• {it.name} ({it.qty})</div>
                          ))}
                        </div>
                        <button
                          type="button"
                          onClick={() => handleRemoveMeal(idx)}
                          className="absolute top-2 right-2 text-zinc-600 hover:text-red-400 text-xs h-5 w-5 rounded flex items-center justify-center border border-transparent hover:border-zinc-800"
                        >
                          &times;
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <DialogFooter className="border-t border-zinc-800/60 pt-4 mt-6">
              <Button type="button" variant="ghost" onClick={() => setOpenModal(false)} className="text-zinc-400 hover:bg-zinc-800 text-xs">
                Cancel
              </Button>
              <Button type="submit" disabled={saving} className="bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold gap-2">
                {saving ? <Loader2 className="h-4 w-4 animate-spin text-white" /> : <Save className="h-4 w-4" />}
                {dietId ? 'Save Changes' : 'Create Diet Chart'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Assign Diet Modal Dialog */}
      <Dialog open={openAssignModal} onOpenChange={(open) => {
        setOpenAssignModal(open);
        if (!open) {
          setSelectedMemberIds([]);
          setMemberSearch('');
        }
      }}>
        <DialogContent className="bg-zinc-900 border-zinc-800 text-white max-w-md">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold">Assign Diet Plan to Member</DialogTitle>
            <DialogDescription className="text-zinc-500 text-xs">
              Selecting active member to link with: {selectedDiet?.name}
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleAssignDiet} className="space-y-4 pt-4">
            <div className="space-y-2">
              <Label className="text-zinc-300 text-sm">Select Members ({selectedMemberIds.length} selected)</Label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-500" />
                <Input
                  placeholder="Search members..."
                  value={memberSearch}
                  onChange={e => setMemberSearch(e.target.value)}
                  className="pl-9 bg-zinc-950 border-zinc-700 text-zinc-100 text-sm h-9"
                />
              </div>
              <div className="border border-zinc-800 rounded-lg max-h-48 overflow-y-auto bg-zinc-950">
                {members
                  .filter(m =>
                    !memberSearch.trim() ||
                    m.name?.toLowerCase().includes(memberSearch.toLowerCase()) ||
                    m.member_code?.includes(memberSearch)
                  )
                  .map(m => (
                    <label
                      key={m.id}
                      className="flex items-center gap-3 px-3 py-2.5 hover:bg-zinc-800/60 cursor-pointer border-b border-zinc-800/50 last:border-0"
                    >
                      <input
                        type="checkbox"
                        checked={selectedMemberIds.includes(m.id)}
                        onChange={e => {
                          if (e.target.checked) {
                            setSelectedMemberIds(prev => [...prev, m.id]);
                          } else {
                            setSelectedMemberIds(prev => prev.filter(id => id !== m.id));
                          }
                        }}
                        className="rounded border-zinc-600 accent-purple-500"
                      />
                      <div className="flex-1 min-w-0">
                        <div className="text-sm text-zinc-200 truncate">{m.name}</div>
                        <div className="text-xs text-zinc-500">{m.member_code}</div>
                      </div>
                    </label>
                  ))
                }
                {members.filter(m =>
                  !memberSearch.trim() ||
                  m.name?.toLowerCase().includes(memberSearch.toLowerCase()) ||
                  m.member_code?.includes(memberSearch)
                ).length === 0 && (
                  <div className="text-center py-4 text-zinc-500 text-sm">No members found</div>
                )}
              </div>
              {selectedMemberIds.length > 0 && (
                <p className="text-xs text-purple-400">{selectedMemberIds.length} member{selectedMemberIds.length > 1 ? 's' : ''} selected</p>
              )}
            </div>

            <DialogFooter className="border-t border-zinc-800/60 pt-4 mt-6">
              <Button type="button" variant="ghost" onClick={() => setOpenAssignModal(false)} className="text-zinc-400 hover:bg-zinc-800 text-xs">
                Cancel
              </Button>
              <Button type="submit" disabled={assigning || selectedMemberIds.length === 0} className="bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold gap-2">
                {assigning ? (
                  <><Loader2 className="h-4 w-4 animate-spin text-white" />Assigning...</>
                ) : (
                  `Assign to ${selectedMemberIds.length} Member${selectedMemberIds.length !== 1 ? 's' : ''}`
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
