'use client';

import React, { useEffect, useState, useMemo } from 'react';
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
  Clock,
  Flame,
  Utensils,
  Sparkles,
  Download,
  Check,
  ChevronDown,
  ChevronUp,
  Target,
  Zap,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { Meal, MealItem } from '@/types/database';

// -------------------------------------------------------------
// 1-Click Pre-Built Diet Templates
// -------------------------------------------------------------
interface DietTemplate {
  id: string;
  name: string;
  description: string;
  targetCalories: number;
  badge: string;
  meals: Meal[];
}

const PRESET_DIET_TEMPLATES: DietTemplate[] = [
  {
    id: 'fat-loss-1800',
    name: 'Fat Loss 1,800 Kcal (High Protein)',
    description: 'Caloric deficit tailored for rapid fat oxidation while preserving lean muscle mass.',
    targetCalories: 1800,
    badge: 'Fat Loss',
    meals: [
      {
        meal_name: 'Breakfast',
        time: '08:00 AM',
        items: [
          { name: 'Boiled Egg Whites', qty: '4 whites (140g)', calories: 70, protein: 15 },
          { name: 'Rolled Oats with Water/Skim Milk', qty: '50g', calories: 190, protein: 7 },
          { name: 'Fresh Apple', qty: '1 medium (120g)', calories: 65, protein: 0 },
        ],
      },
      {
        meal_name: 'Mid-Morning Snack',
        time: '11:00 AM',
        items: [
          { name: 'Whey Protein Isolate', qty: '1 scoop (33g)', calories: 125, protein: 25 },
          { name: 'Raw California Almonds', qty: '15 pcs (20g)', calories: 115, protein: 4 },
        ],
      },
      {
        meal_name: 'Lunch',
        time: '01:30 PM',
        items: [
          { name: 'Grilled Chicken Breast / Tofu', qty: '150g', calories: 240, protein: 46 },
          { name: 'Steamed Brown Rice', qty: '1 bowl (150g)', calories: 170, protein: 4 },
          { name: 'Mixed Green Salad Bowl', qty: '1 bowl (150g)', calories: 35, protein: 1 },
        ],
      },
      {
        meal_name: 'Evening Snack',
        time: '05:30 PM',
        items: [
          { name: 'Boiled Black Chana / Sprouts', qty: '100g', calories: 160, protein: 9 },
          { name: 'Green Tea (No Sugar)', qty: '1 cup (200ml)', calories: 2, protein: 0 },
        ],
      },
      {
        meal_name: 'Dinner',
        time: '08:30 PM',
        items: [
          { name: 'Paneer Bhurji / Sautéed Tofu', qty: '100g', calories: 260, protein: 18 },
          { name: 'Whole Wheat Roti', qty: '1 pc (35g)', calories: 85, protein: 3 },
          { name: 'Steamed Broccoli & Green Beans', qty: '150g', calories: 60, protein: 4 },
        ],
      },
    ],
  },
  {
    id: 'muscle-bulk-2800',
    name: 'Clean Muscle Bulk 2,800 Kcal',
    description: 'Hypertrophic caloric surplus optimized for maximum muscle protein synthesis with zero dirty fat gains.',
    targetCalories: 2800,
    badge: 'Bulking',
    meals: [
      {
        meal_name: 'Breakfast',
        time: '08:00 AM',
        items: [
          { name: 'Whole Boiled Eggs', qty: '4 whole (200g)', calories: 280, protein: 24 },
          { name: 'Oats with Honey & Banana', qty: '80g oats + 1 banana', calories: 380, protein: 11 },
          { name: 'Whole Wheat Toast with Peanut Butter', qty: '2 slices + 1 tbsp', calories: 260, protein: 10 },
        ],
      },
      {
        meal_name: 'Mid-Morning Snack',
        time: '11:00 AM',
        items: [
          { name: 'Whey Protein with Full Milk', qty: '1 scoop + 250ml milk', calories: 260, protein: 33 },
          { name: 'Handful Walnuts & Raisins', qty: '30g', calories: 160, protein: 3 },
        ],
      },
      {
        meal_name: 'Lunch',
        time: '01:30 PM',
        items: [
          { name: 'Grilled Chicken Breast', qty: '200g', calories: 320, protein: 60 },
          { name: 'White / Brown Basmati Rice', qty: '2 bowls (250g)', calories: 320, protein: 6 },
          { name: 'Yellow Dal Tadka', qty: '1 bowl (150g)', calories: 150, protein: 9 },
          { name: 'Cucumber & Tomato Salad', qty: '1 bowl', calories: 40, protein: 1 },
        ],
      },
      {
        meal_name: 'Pre-Workout Energy',
        time: '05:00 PM',
        items: [
          { name: 'Boiled Sweet Potato', qty: '200g', calories: 180, protein: 3 },
          { name: 'Strong Black Coffee', qty: '1 cup', calories: 5, protein: 0 },
        ],
      },
      {
        meal_name: 'Post-Workout Recovery',
        time: '07:30 PM',
        items: [
          { name: 'Whey Protein Isolate', qty: '1 scoop (33g)', calories: 125, protein: 25 },
          { name: 'Crispy Rice Cakes with Jam', qty: '2 cakes', calories: 90, protein: 2 },
        ],
      },
      {
        meal_name: 'Dinner',
        time: '09:00 PM',
        items: [
          { name: 'Paneer Curry / Fish Fillet', qty: '150g', calories: 320, protein: 25 },
          { name: 'Whole Wheat Rotis', qty: '2 pcs (70g)', calories: 170, protein: 6 },
          { name: 'Stir-fried Green Vegetables', qty: '100g', calories: 80, protein: 2 },
        ],
      },
    ],
  },
  {
    id: 'vegetarian-2200',
    name: 'Vegetarian Muscle Builder 2,200 Kcal',
    description: '100% vegetarian high-protein schedule maximizing bioavailable plant & dairy proteins.',
    targetCalories: 2200,
    badge: 'Vegetarian',
    meals: [
      {
        meal_name: 'Breakfast',
        time: '08:00 AM',
        items: [
          { name: 'Besan Paneer Chilla (Low Oil)', qty: '2 chillas (150g)', calories: 320, protein: 18 },
          { name: 'Greek Yogurt / Thick Curd', qty: '150g', calories: 100, protein: 10 },
        ],
      },
      {
        meal_name: 'Mid-Morning Snack',
        time: '11:00 AM',
        items: [
          { name: 'Whey Protein Isolate', qty: '1 scoop (33g)', calories: 125, protein: 25 },
          { name: 'Roasted Salted Chana', qty: '50g', calories: 180, protein: 10 },
        ],
      },
      {
        meal_name: 'Lunch',
        time: '01:30 PM',
        items: [
          { name: 'Soya Chunks Curry', qty: '50g dry soya (150g cooked)', calories: 190, protein: 26 },
          { name: 'Steamed Brown Rice', qty: '1.5 bowls (200g)', calories: 230, protein: 5 },
          { name: 'Moong Dal', qty: '1 bowl (150g)', calories: 140, protein: 8 },
          { name: 'Garden Salad', qty: '1 bowl', calories: 40, protein: 1 },
        ],
      },
      {
        meal_name: 'Evening Snack',
        time: '05:30 PM',
        items: [
          { name: 'Sautéed Low-Fat Paneer Cubes', qty: '100g', calories: 260, protein: 18 },
          { name: 'Roasted Makhana (Foxnuts)', qty: '30g', calories: 110, protein: 3 },
        ],
      },
      {
        meal_name: 'Dinner',
        time: '08:30 PM',
        items: [
          { name: 'Grilled Tofu / Paneer Tikka', qty: '120g', calories: 240, protein: 20 },
          { name: 'Whole Wheat Rotis', qty: '2 pcs (70g)', calories: 170, protein: 6 },
          { name: 'Steamed Mixed Veggies', qty: '1 bowl', calories: 65, protein: 2 },
        ],
      },
    ],
  },
  {
    id: 'lean-maintain-2400',
    name: 'Lean Maintenance 2,400 Kcal',
    description: 'Balanced macronutrient distribution designed to sustain optimal workout performance and lean body composition.',
    targetCalories: 2400,
    badge: 'Maintenance',
    meals: [
      {
        meal_name: 'Breakfast',
        time: '08:00 AM',
        items: [
          { name: '3 Whole Eggs Scrambled + 1 White', qty: '4 eggs', calories: 230, protein: 22 },
          { name: 'Multigrain Toast with Butter', qty: '2 slices', calories: 180, protein: 6 },
          { name: 'Fresh Orange / Papaya Bowl', qty: '1 cup', calories: 65, protein: 1 },
        ],
      },
      {
        meal_name: 'Mid-Morning Snack',
        time: '11:00 AM',
        items: [
          { name: 'Greek Yogurt with Blueberries', qty: '150g', calories: 130, protein: 12 },
          { name: 'Almonds & Cashews', qty: '20g', calories: 120, protein: 4 },
        ],
      },
      {
        meal_name: 'Lunch',
        time: '01:30 PM',
        items: [
          { name: 'Grilled Chicken Breast / Fish', qty: '180g', calories: 280, protein: 48 },
          { name: 'Steamed White/Brown Rice', qty: '1.5 bowls (200g)', calories: 230, protein: 5 },
          { name: 'Lentil Dal', qty: '1 bowl', calories: 140, protein: 8 },
          { name: 'Green Salad with Lemon', qty: '1 bowl', calories: 35, protein: 1 },
        ],
      },
      {
        meal_name: 'Evening Snack',
        time: '05:30 PM',
        items: [
          { name: 'Whey Protein Shake with Water', qty: '1 scoop', calories: 125, protein: 25 },
          { name: 'Peanut Butter on Banana Slices', qty: '1 banana + 1 tbsp PB', calories: 190, protein: 5 },
        ],
      },
      {
        meal_name: 'Dinner',
        time: '08:30 PM',
        items: [
          { name: 'Paneer / Grilled Salmon / Soya', qty: '140g', calories: 280, protein: 24 },
          { name: 'Whole Wheat Rotis', qty: '2 pcs', calories: 170, protein: 6 },
          { name: 'Sautéed Zucchini & Bell Peppers', qty: '150g', calories: 60, protein: 2 },
        ],
      },
    ],
  },
];

// -------------------------------------------------------------
// Quick Fitness Food Chips Library
// -------------------------------------------------------------
interface QuickFood {
  name: string;
  qty: string;
  calories: number;
  protein: number;
  icon: string;
}

const QUICK_FOODS: QuickFood[] = [
  { name: '4 Boiled Egg Whites', qty: '140g', calories: 70, protein: 15, icon: '🥚' },
  { name: '4 Whole Boiled Eggs', qty: '200g', calories: 280, protein: 24, icon: '🥚' },
  { name: 'Whey Protein (1 Scoop)', qty: '33g', calories: 125, protein: 25, icon: '🥛' },
  { name: 'Grilled Chicken Breast', qty: '150g', calories: 240, protein: 46, icon: '🍗' },
  { name: 'Fresh Paneer', qty: '100g', calories: 265, protein: 18, icon: '🧀' },
  { name: 'Soya Chunks (Cooked)', qty: '50g dry / 150g', calories: 180, protein: 26, icon: '🌱' },
  { name: 'Rolled Oats with Milk', qty: '50g', calories: 190, protein: 7, icon: '🥣' },
  { name: 'Steamed Brown Rice', qty: '1 bowl (150g)', calories: 170, protein: 4, icon: '🍚' },
  { name: 'Boiled Sweet Potato', qty: '150g', calories: 130, protein: 2, icon: '🥔' },
  { name: 'Greek Yogurt / Thick Curd', qty: '150g', calories: 100, protein: 10, icon: '🥣' },
  { name: 'Whole Wheat Roti', qty: '1 pc (35g)', calories: 85, protein: 3, icon: '🫓' },
  { name: 'Boiled Sprouts / Chana', qty: '100g', calories: 160, protein: 9, icon: '🥗' },
  { name: 'Banana', qty: '1 medium', calories: 105, protein: 1, icon: '🍌' },
  { name: 'Raw Almonds', qty: '15 pcs (20g)', calories: 120, protein: 4, icon: '🥜' },
  { name: 'Grilled Fish Fillet', qty: '150g', calories: 180, protein: 35, icon: '🐟' },
  { name: 'Mixed Green Salad', qty: '1 bowl (150g)', calories: 35, protein: 1, icon: '🥗' },
];

export default function DietChartsPage() {
  const supabase = createClient();
  const { user } = useAuth();
  const { can } = usePermission();

  const [loading, setLoading] = useState(true);
  const [diets, setDiets] = useState<any[]>([]);
  const [openModal, setOpenModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // Assignment Modal states
  const [openAssignModal, setOpenAssignModal] = useState(false);
  const [assigning, setAssigning] = useState(false);
  const [selectedDiet, setSelectedDiet] = useState<any>(null);
  const [members, setMembers] = useState<any[]>([]);
  const [selectedMemberIds, setSelectedMemberIds] = useState<string[]>([]);
  const [memberSearch, setMemberSearch] = useState('');

  // Builder Form states
  const [dietId, setDietId] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [targetCalories, setTargetCalories] = useState('');
  const [isTemplate, setIsTemplate] = useState(true);
  const [meals, setMeals] = useState<Meal[]>([]);

  // Active meal being edited with food chips
  const [activeMealIndex, setActiveMealIndex] = useState<number>(0);

  // Manual food adder input row
  const [manualItemName, setManualItemName] = useState('');
  const [manualItemQty, setManualItemQty] = useState('');
  const [manualItemCals, setManualItemCals] = useState('');
  const [manualItemPro, setManualItemPro] = useState('');

  const fetchDiets = async () => {
    if (!user?.gymId) {
      setLoading(false);
      return;
    }

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
    supabase
      .from('members')
      .select('id, name, member_code')
      .eq('gym_id', user.gymId)
      .eq('status', 'active')
      .then(({ data }) => {
        if (data) setMembers(data);
      });
  }, [user?.gymId]);

  // Real-time calculated nutrition metrics
  const nutritionSummary = useMemo(() => {
    let totalCals = 0;
    let totalPro = 0;
    let totalItems = 0;

    meals.forEach(m => {
      if (Array.isArray(m.items)) {
        m.items.forEach(it => {
          totalCals += Number(it.calories) || 0;
          totalPro += Number(it.protein) || 0;
          totalItems += 1;
        });
      }
    });

    const target = parseInt(targetCalories) || 0;
    const diff = target > 0 ? totalCals - target : 0;

    return {
      totalCalories: totalCals,
      totalProtein: totalPro,
      totalMeals: meals.length,
      totalItems,
      target,
      diff,
    };
  }, [meals, targetCalories]);

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
    setMeals([
      {
        meal_name: 'Breakfast',
        time: '08:00 AM',
        items: [],
      },
      {
        meal_name: 'Lunch',
        time: '01:30 PM',
        items: [],
      },
      {
        meal_name: 'Dinner',
        time: '08:30 PM',
        items: [],
      },
    ]);
    setActiveMealIndex(0);
    resetManualInputs();
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
    setActiveMealIndex(0);
    resetManualInputs();
    setOpenModal(true);
  };

  const handleApplyTemplate = (template: DietTemplate) => {
    setName(template.name);
    setDescription(template.description);
    setTargetCalories(String(template.targetCalories));
    setMeals(JSON.parse(JSON.stringify(template.meals)));
    setActiveMealIndex(0);
    toast.success(`Loaded template: "${template.name}"`);
  };

  const resetManualInputs = () => {
    setManualItemName('');
    setManualItemQty('');
    setManualItemCals('');
    setManualItemPro('');
  };

  // Add a quick chip food directly to the currently active meal
  const handleAddQuickFood = (food: QuickFood) => {
    if (meals.length === 0) {
      toast.error('Please add a meal first');
      return;
    }

    const targetIdx = activeMealIndex >= 0 && activeMealIndex < meals.length ? activeMealIndex : 0;
    const targetMeal = meals[targetIdx];

    const newItem: MealItem = {
      name: food.name,
      qty: food.qty,
      calories: food.calories,
      protein: food.protein,
    };

    const updatedMeals = [...meals];
    updatedMeals[targetIdx] = {
      ...targetMeal,
      items: [...(targetMeal.items || []), newItem],
    };

    setMeals(updatedMeals);
    toast.success(`Added ${food.name} to ${targetMeal.meal_name}`);
  };

  // Add manually typed custom item
  const handleAddManualItem = () => {
    if (!manualItemName.trim()) {
      toast.error('Please enter food item name');
      return;
    }

    if (meals.length === 0) {
      toast.error('Please add a meal first');
      return;
    }

    const targetIdx = activeMealIndex >= 0 && activeMealIndex < meals.length ? activeMealIndex : 0;
    const targetMeal = meals[targetIdx];

    const newItem: MealItem = {
      name: manualItemName.trim(),
      qty: manualItemQty.trim() || '1 serving',
      calories: parseInt(manualItemCals) || 0,
      protein: parseInt(manualItemPro) || 0,
    };

    const updatedMeals = [...meals];
    updatedMeals[targetIdx] = {
      ...targetMeal,
      items: [...(targetMeal.items || []), newItem],
    };

    setMeals(updatedMeals);
    resetManualInputs();
    toast.success(`Added "${newItem.name}" to ${targetMeal.meal_name}`);
  };

  // Inline update food item
  const handleUpdateItem = (mealIdx: number, itemIdx: number, field: keyof MealItem, val: any) => {
    const updated = [...meals];
    const items = [...updated[mealIdx].items];
    items[itemIdx] = {
      ...items[itemIdx],
      [field]: field === 'calories' || field === 'protein' ? parseInt(val) || 0 : val,
    };
    updated[mealIdx].items = items;
    setMeals(updated);
  };

  // Remove food item
  const handleRemoveItem = (mealIdx: number, itemIdx: number) => {
    const updated = [...meals];
    updated[mealIdx].items = updated[mealIdx].items.filter((_, i) => i !== itemIdx);
    setMeals(updated);
  };

  // Add a new meal card
  const handleAddMealCard = (presetName?: string) => {
    const defaultName = presetName || `Meal ${meals.length + 1}`;
    const newMeal: Meal = {
      meal_name: defaultName,
      time: '12:00 PM',
      items: [],
    };
    setMeals([...meals, newMeal]);
    setActiveMealIndex(meals.length);
  };

  // Remove meal card
  const handleRemoveMealCard = (mealIdx: number) => {
    setMeals(meals.filter((_, i) => i !== mealIdx));
    if (activeMealIndex >= mealIdx && activeMealIndex > 0) {
      setActiveMealIndex(activeMealIndex - 1);
    }
  };

  // Update meal title or time
  const handleUpdateMealMeta = (mealIdx: number, field: 'meal_name' | 'time', val: string) => {
    const updated = [...meals];
    updated[mealIdx] = {
      ...updated[mealIdx],
      [field]: val,
    };
    setMeals(updated);
  };

  const handleSaveDiet = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      toast.error('Plan name is required');
      return;
    }

    if (meals.length === 0 || meals.every(m => !m.items || m.items.length === 0)) {
      toast.error('Please add at least one meal with food items');
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
        toast.success('Diet plan updated successfully');
      } else {
        const { error } = await supabase
          .from('diet_charts')
          .insert(payload);

        if (error) throw error;
        toast.success('Diet plan created successfully');
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
        }
      }

      if (fail === 0) {
        toast.success(`Assigned "${selectedDiet.name}" to ${success} member${success > 1 ? 's' : ''}`);
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

  // Filtered diets for listing
  const filteredDiets = useMemo(() => {
    if (!searchQuery.trim()) return diets;
    const q = searchQuery.toLowerCase();
    return diets.filter(d =>
      d.name?.toLowerCase().includes(q) ||
      d.description?.toLowerCase().includes(q)
    );
  }, [diets, searchQuery]);

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-zinc-800 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-2xl font-bold tracking-tight text-zinc-100">Nutrition & Diet Plans</h2>
            <Badge className="bg-purple-950/60 text-purple-400 border-purple-800/40 text-xs">
              {diets.length} Active Plans
            </Badge>
          </div>
          <p className="text-zinc-500 text-xs mt-1">
            Build caloric schedules, use 1-click fitness templates, track live macros, and assign personalized charts to members.
          </p>
        </div>
        <div className="flex items-center gap-3">
          {can('diet.manage') && (
            <Button
              onClick={handleOpenAddModal}
              className="bg-purple-600 hover:bg-purple-700 text-white gap-2 font-medium shadow-md shadow-purple-900/20"
            >
              <Plus className="h-4 w-4" /> Create Diet Plan
            </Button>
          )}
        </div>
      </div>

      {/* Filter / Search Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-zinc-900/40 border border-zinc-800 p-3 rounded-xl">
        <div className="relative w-full sm:w-80">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-500" />
          <Input
            placeholder="Search diet plans by name or goal..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 bg-zinc-950 border-zinc-800 text-xs h-9 text-zinc-200"
          />
        </div>
        <div className="flex items-center gap-2 text-xs text-zinc-400">
          <Sparkles className="h-3.5 w-3.5 text-purple-400" />
          <span>Tip: Use pre-built templates inside the builder for instant plans</span>
        </div>
      </div>

      {/* Diet Plan Cards Grid */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-24 gap-3">
          <Loader2 className="h-8 w-8 animate-spin text-purple-500" />
          <p className="text-zinc-500 text-xs">Loading nutrition plans...</p>
        </div>
      ) : filteredDiets.length === 0 ? (
        <div className="text-center py-20 text-zinc-500 border border-dashed border-zinc-800 rounded-xl bg-zinc-900/20">
          <Apple className="h-10 w-10 text-zinc-600 mx-auto mb-3" />
          <h3 className="text-sm font-semibold text-zinc-300">No diet plans found</h3>
          <p className="text-xs text-zinc-500 mt-1 max-w-sm mx-auto">
            {searchQuery ? 'Try adjusting your search filter' : 'Create your first diet plan or select a 1-click template to get started.'}
          </p>
          {can('diet.manage') && !searchQuery && (
            <Button onClick={handleOpenAddModal} className="mt-4 bg-purple-600 hover:bg-purple-700 text-white text-xs gap-1.5">
              <Plus className="h-3.5 w-3.5" /> Create First Plan
            </Button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredDiets.map((diet) => {
            const planMeals = Array.isArray(diet.meals) ? diet.meals : [];
            const planCals = planMeals.reduce((acc: number, m: any) => {
              return acc + (Array.isArray(m.items) ? m.items.reduce((s: number, it: any) => s + (Number(it.calories) || 0), 0) : 0);
            }, 0);
            const planPro = planMeals.reduce((acc: number, m: any) => {
              return acc + (Array.isArray(m.items) ? m.items.reduce((s: number, it: any) => s + (Number(it.protein) || 0), 0) : 0);
            }, 0);

            return (
              <Card
                key={diet.id}
                className="border-zinc-800 bg-zinc-900/40 hover:border-zinc-700 transition-colors flex flex-col justify-between overflow-hidden shadow-sm"
              >
                <CardHeader className="pb-3">
                  <div className="flex justify-between items-start gap-2">
                    <CardTitle className="text-sm font-bold text-zinc-100 leading-snug line-clamp-1">
                      {diet.name}
                    </CardTitle>
                    {diet.target_calories ? (
                      <Badge className="bg-purple-950/60 text-purple-300 border border-purple-800/30 text-[10px] font-bold shrink-0">
                        {diet.target_calories} Kcal
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="border-zinc-800 text-zinc-400 text-[10px] shrink-0">
                        {planCals > 0 ? `${planCals} Kcal` : 'Custom'}
                      </Badge>
                    )}
                  </div>
                  <p className="text-zinc-500 text-xs mt-1.5 line-clamp-2 leading-relaxed">
                    {diet.description || 'Nutritional meal schedule tailored for gym members.'}
                  </p>
                  
                  {/* Macro Pills */}
                  <div className="flex items-center gap-2 pt-2 text-[11px]">
                    <span className="flex items-center gap-1 text-amber-400 font-medium bg-amber-950/30 px-2 py-0.5 rounded border border-amber-900/30">
                      <Flame className="h-3 w-3" /> {planCals} Kcal
                    </span>
                    <span className="flex items-center gap-1 text-emerald-400 font-medium bg-emerald-950/30 px-2 py-0.5 rounded border border-emerald-900/30">
                      <Zap className="h-3 w-3" /> {planPro}g Protein
                    </span>
                  </div>
                </CardHeader>

                <CardContent className="flex-1 border-t border-zinc-800/40 pt-3 text-xs">
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-[10px] text-zinc-500 font-semibold uppercase tracking-wider">
                      Meals ({planMeals.length})
                    </span>
                  </div>
                  <div className="space-y-1.5 max-h-[140px] overflow-y-auto pr-1">
                    {planMeals.map((m: any, idx: number) => {
                      const itemCount = Array.isArray(m.items) ? m.items.length : 0;
                      return (
                        <div
                          key={idx}
                          className="flex justify-between items-center bg-zinc-950/40 px-2.5 py-1.5 border border-zinc-800/60 rounded text-xs"
                        >
                          <div className="flex items-center gap-2 min-w-0">
                            <span className="font-semibold text-zinc-200 truncate">{m.meal_name}</span>
                            <span className="text-[10px] text-zinc-500 font-mono">({itemCount} items)</span>
                          </div>
                          <span className="text-zinc-500 text-[10px] font-mono shrink-0">{m.time || 'Schedule'}</span>
                        </div>
                      );
                    })}
                  </div>
                </CardContent>

                <CardFooter className="border-t border-zinc-800/40 pt-3 flex gap-2 justify-between bg-zinc-900/20">
                  {can('diet.manage') ? (
                    <>
                      <Button
                        variant="ghost"
                        onClick={() => handleOpenAssignModal(diet)}
                        className="text-purple-400 hover:text-purple-300 hover:bg-purple-950/20 text-xs px-2.5 h-8 gap-1.5 font-medium"
                      >
                        <Users className="h-3.5 w-3.5" /> Link Member
                      </Button>
                      <div className="flex items-center gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          title="Download / Print PDF"
                          onClick={() => window.open(`/api/diet/${diet.id}/pdf`, '_blank')}
                          className="h-8 w-8 text-zinc-400 hover:text-purple-400 hover:bg-zinc-800"
                        >
                          <Download className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          title="Edit Plan"
                          onClick={() => handleOpenEditModal(diet)}
                          className="h-8 w-8 text-zinc-400 hover:text-white hover:bg-zinc-800"
                        >
                          <Eye className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          title="Delete Plan"
                          onClick={() => handleDeleteDiet(diet.id, diet.name)}
                          className="h-8 w-8 text-zinc-400 hover:text-red-400 hover:bg-zinc-800"
                        >
                          <Trash className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </>
                  ) : (
                    <span className="text-[10px] text-zinc-600 italic">Read-only permissions</span>
                  )}
                </CardFooter>
              </Card>
            );
          })}
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* Modern, Uncluttered Diet Plan Builder Modal */}
      {/* ------------------------------------------------------------- */}
      <Dialog open={openModal} onOpenChange={setOpenModal}>
        <DialogContent className="bg-zinc-950 border-zinc-800 text-white max-w-4xl max-h-[92vh] flex flex-col p-0 overflow-hidden shadow-2xl">
          {/* Modal Header */}
          <DialogHeader className="p-5 border-b border-zinc-800 shrink-0 bg-zinc-900/50">
            <div className="flex items-center justify-between">
              <div>
                <DialogTitle className="text-lg font-bold text-zinc-100 flex items-center gap-2">
                  <Apple className="h-5 w-5 text-purple-400" />
                  {dietId ? 'Modify Diet Schedule' : 'Create High-Performance Diet Plan'}
                </DialogTitle>
                <DialogDescription className="text-zinc-400 text-xs mt-0.5">
                  Compose meals, pick 1-click popular fitness foods, and track live macro targets.
                </DialogDescription>
              </div>

              {/* Real-time Macro Pill */}
              <div className="hidden sm:flex items-center gap-3 bg-zinc-900 border border-zinc-800 px-3 py-1.5 rounded-lg text-xs">
                <div className="text-right">
                  <div className="text-[10px] text-zinc-500 uppercase font-semibold">Total Nutrition</div>
                  <div className="text-zinc-200 font-bold">
                    <span className="text-amber-400">{nutritionSummary.totalCalories}</span> Kcal •{' '}
                    <span className="text-emerald-400">{nutritionSummary.totalProtein}g</span> Pro
                  </div>
                </div>
              </div>
            </div>
          </DialogHeader>

          {/* Modal Body - Scrollable */}
          <form onSubmit={handleSaveDiet} className="flex-1 overflow-y-auto p-5 space-y-6">
            {/* 1-Click Templates Bar */}
            {!dietId && (
              <div className="bg-purple-950/20 border border-purple-900/30 p-3.5 rounded-xl space-y-2">
                <div className="flex items-center gap-1.5 text-xs font-semibold text-purple-300">
                  <Sparkles className="h-3.5 w-3.5 text-purple-400" />
                  <span>1-Click Pre-Built Diet Templates (Click to Auto-Fill):</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-2">
                  {PRESET_DIET_TEMPLATES.map((tmpl) => (
                    <button
                      key={tmpl.id}
                      type="button"
                      onClick={() => handleApplyTemplate(tmpl)}
                      className="text-left p-2.5 rounded-lg border border-purple-900/40 bg-zinc-900/80 hover:bg-purple-900/20 hover:border-purple-500/50 transition-all group"
                    >
                      <div className="text-[11px] font-bold text-zinc-200 group-hover:text-purple-300 truncate">
                        {tmpl.name}
                      </div>
                      <div className="flex items-center justify-between text-[10px] text-zinc-500 mt-1">
                        <span>{tmpl.targetCalories} Kcal</span>
                        <span className="text-purple-400 font-semibold">{tmpl.meals.length} Meals</span>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Plan Metadata Inputs */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="sm:col-span-2 space-y-1.5">
                <Label htmlFor="dietName" className="text-xs font-semibold text-zinc-300">
                  Diet Plan Name *
                </Label>
                <Input
                  id="dietName"
                  placeholder="e.g. 1,800 Kcal Lean Fat Loss or Bulking Split"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="bg-zinc-900 border-zinc-800 text-xs h-9 text-zinc-100 placeholder:text-zinc-600 focus:border-purple-500"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="targetCals" className="text-xs font-semibold text-zinc-300">
                  Daily Calorie Target (Kcal)
                </Label>
                <Input
                  id="targetCals"
                  type="number"
                  placeholder="e.g. 2000"
                  value={targetCalories}
                  onChange={(e) => setTargetCalories(e.target.value)}
                  className="bg-zinc-900 border-zinc-800 text-xs h-9 text-zinc-100 placeholder:text-zinc-600 focus:border-purple-500"
                />
              </div>

              <div className="sm:col-span-3 space-y-1.5">
                <Label htmlFor="desc" className="text-xs text-zinc-400">
                  Plan Description / Coaching Notes
                </Label>
                <Input
                  id="desc"
                  placeholder="e.g. Drink 3.5L water daily. Have post-workout shake within 45 mins of training."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="bg-zinc-900 border-zinc-800 text-xs h-9 text-zinc-100 placeholder:text-zinc-600 focus:border-purple-500"
                />
              </div>
            </div>

            {/* Quick Fitness Food Chips Library */}
            <div className="bg-zinc-900/60 border border-zinc-800 p-3.5 rounded-xl space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-zinc-200">Quick Fitness Food Library</span>
                  <span className="text-[10px] text-zinc-500">
                    (Click to add directly into active meal: <span className="text-purple-400 font-semibold">{meals[activeMealIndex]?.meal_name || 'Meal'}</span>)
                  </span>
                </div>
              </div>
              <div className="flex flex-wrap gap-1.5 pt-1 max-h-[85px] overflow-y-auto">
                {QUICK_FOODS.map((food, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => handleAddQuickFood(food)}
                    className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-medium bg-zinc-950 border border-zinc-800 hover:border-purple-500/60 hover:bg-purple-950/20 text-zinc-300 transition-colors"
                  >
                    <span>{food.icon}</span>
                    <span>{food.name}</span>
                    <span className="text-[10px] text-zinc-500">({food.calories} kcal)</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Meals Composer List */}
            <div className="space-y-4">
              <div className="flex items-center justify-between border-b border-zinc-800 pb-2">
                <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-400 flex items-center gap-2">
                  <Utensils className="h-3.5 w-3.5 text-purple-400" />
                  Meals Schedule ({meals.length})
                </h3>

                <div className="flex items-center gap-2">
                  <span className="text-[10px] text-zinc-500 hidden sm:inline">Add preset:</span>
                  <div className="flex flex-wrap gap-1">
                    {['Breakfast', 'Lunch', 'Dinner', 'Snack'].map((preset) => (
                      <Button
                        key={preset}
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => handleAddMealCard(preset)}
                        className="h-7 text-[10px] px-2 border-zinc-800 bg-zinc-900 hover:bg-zinc-800 text-zinc-300"
                      >
                        + {preset}
                      </Button>
                    ))}
                    <Button
                      type="button"
                      size="sm"
                      onClick={() => handleAddMealCard()}
                      className="h-7 text-[10px] px-2.5 bg-purple-600 hover:bg-purple-700 text-white"
                    >
                      <Plus className="h-3 w-3 mr-1" /> Custom Meal
                    </Button>
                  </div>
                </div>
              </div>

              {meals.length === 0 ? (
                <div className="text-center py-10 border border-dashed border-zinc-800 rounded-xl text-zinc-500 text-xs">
                  No meals added yet. Click "+ Custom Meal" or choose one of the presets above.
                </div>
              ) : (
                <div className="space-y-4">
                  {meals.map((meal, mealIdx) => {
                    const isActive = activeMealIndex === mealIdx;
                    const mealCals = (meal.items || []).reduce((s, it) => s + (Number(it.calories) || 0), 0);
                    const mealPro = (meal.items || []).reduce((s, it) => s + (Number(it.protein) || 0), 0);

                    return (
                      <div
                        key={mealIdx}
                        onClick={() => setActiveMealIndex(mealIdx)}
                        className={`border rounded-xl transition-all ${
                          isActive
                            ? 'border-purple-500/70 bg-zinc-900/40 shadow-sm shadow-purple-950/20'
                            : 'border-zinc-800 bg-zinc-900/20 hover:border-zinc-700'
                        }`}
                      >
                        {/* Meal Card Header */}
                        <div className="p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-zinc-800/80 bg-zinc-950/40 rounded-t-xl">
                          <div className="flex items-center gap-3 flex-1">
                            <span
                              className={`text-[10px] font-bold px-2 py-0.5 rounded uppercase font-mono ${
                                isActive ? 'bg-purple-600 text-white' : 'bg-zinc-800 text-zinc-400'
                              }`}
                            >
                              Meal {mealIdx + 1}
                            </span>
                            <Input
                              value={meal.meal_name}
                              onChange={(e) => handleUpdateMealMeta(mealIdx, 'meal_name', e.target.value)}
                              placeholder="Meal Name"
                              className="h-7 text-xs font-bold bg-transparent border-none text-zinc-200 focus-visible:ring-0 focus-visible:bg-zinc-900 max-w-[200px]"
                            />
                            <div className="flex items-center gap-1 text-zinc-500 text-xs font-mono">
                              <Clock className="h-3 w-3 text-zinc-500" />
                              <Input
                                value={meal.time}
                                onChange={(e) => handleUpdateMealMeta(mealIdx, 'time', e.target.value)}
                                placeholder="08:00 AM"
                                className="h-7 text-[11px] bg-transparent border-none text-zinc-400 focus-visible:ring-0 focus-visible:bg-zinc-900 max-w-[90px]"
                              />
                            </div>
                          </div>

                          <div className="flex items-center justify-between sm:justify-end gap-3">
                            <div className="text-[11px] text-zinc-400 font-mono">
                              <span className="text-amber-400 font-semibold">{mealCals}</span> kcal •{' '}
                              <span className="text-emerald-400 font-semibold">{mealPro}g</span> pro
                            </div>
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleRemoveMealCard(mealIdx);
                              }}
                              className="h-7 w-7 text-zinc-500 hover:text-red-400 hover:bg-zinc-800"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        </div>

                        {/* Food Items in Meal */}
                        <div className="p-3.5 space-y-2">
                          {(meal.items || []).length === 0 ? (
                            <div className="text-center py-4 text-zinc-600 text-xs">
                              No foods in this meal. Click any quick chip above or type below.
                            </div>
                          ) : (
                            <div className="space-y-1.5">
                              <div className="grid grid-cols-12 gap-2 text-[10px] text-zinc-500 font-semibold px-2 uppercase">
                                <div className="col-span-5">Food Item</div>
                                <div className="col-span-3">Portion / Qty</div>
                                <div className="col-span-2">Calories</div>
                                <div className="col-span-1">Protein</div>
                                <div className="col-span-1 text-center">Del</div>
                              </div>

                              {meal.items.map((item, itemIdx) => (
                                <div
                                  key={itemIdx}
                                  className="grid grid-cols-12 gap-2 items-center bg-zinc-950/60 p-1.5 rounded-lg border border-zinc-800/60 text-xs"
                                >
                                  <div className="col-span-5">
                                    <Input
                                      value={item.name}
                                      onChange={(e) =>
                                        handleUpdateItem(mealIdx, itemIdx, 'name', e.target.value)
                                      }
                                      placeholder="Food name"
                                      className="h-7 text-xs bg-zinc-900 border-zinc-800 text-zinc-200"
                                    />
                                  </div>
                                  <div className="col-span-3">
                                    <Input
                                      value={item.qty}
                                      onChange={(e) =>
                                        handleUpdateItem(mealIdx, itemIdx, 'qty', e.target.value)
                                      }
                                      placeholder="150g"
                                      className="h-7 text-xs bg-zinc-900 border-zinc-800 text-zinc-200"
                                    />
                                  </div>
                                  <div className="col-span-2">
                                    <Input
                                      type="number"
                                      value={item.calories || ''}
                                      onChange={(e) =>
                                        handleUpdateItem(mealIdx, itemIdx, 'calories', e.target.value)
                                      }
                                      placeholder="Kcal"
                                      className="h-7 text-xs bg-zinc-900 border-zinc-800 text-amber-400 font-mono"
                                    />
                                  </div>
                                  <div className="col-span-1">
                                    <Input
                                      type="number"
                                      value={item.protein || ''}
                                      onChange={(e) =>
                                        handleUpdateItem(mealIdx, itemIdx, 'protein', e.target.value)
                                      }
                                      placeholder="Pro"
                                      className="h-7 text-xs bg-zinc-900 border-zinc-800 text-emerald-400 font-mono"
                                    />
                                  </div>
                                  <div className="col-span-1 flex justify-center">
                                    <button
                                      type="button"
                                      onClick={() => handleRemoveItem(mealIdx, itemIdx)}
                                      className="text-zinc-500 hover:text-red-400 p-1"
                                    >
                                      &times;
                                    </button>
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}

                          {/* Quick Custom Food Add Row */}
                          {isActive && (
                            <div className="pt-2 border-t border-zinc-800/40">
                              <div className="grid grid-cols-12 gap-2 items-center bg-zinc-900/40 p-2 rounded-lg border border-dashed border-zinc-800">
                                <div className="col-span-5">
                                  <Input
                                    value={manualItemName}
                                    onChange={(e) => setManualItemName(e.target.value)}
                                    placeholder="+ Custom item (e.g. Tofu Bhurji)"
                                    className="h-7 text-xs bg-zinc-950 border-zinc-800"
                                  />
                                </div>
                                <div className="col-span-3">
                                  <Input
                                    value={manualItemQty}
                                    onChange={(e) => setManualItemQty(e.target.value)}
                                    placeholder="Qty (e.g. 100g)"
                                    className="h-7 text-xs bg-zinc-950 border-zinc-800"
                                  />
                                </div>
                                <div className="col-span-2">
                                  <Input
                                    type="number"
                                    value={manualItemCals}
                                    onChange={(e) => setManualItemCals(e.target.value)}
                                    placeholder="Kcal"
                                    className="h-7 text-xs bg-zinc-950 border-zinc-800 font-mono"
                                  />
                                </div>
                                <div className="col-span-1">
                                  <Input
                                    type="number"
                                    value={manualItemPro}
                                    onChange={(e) => setManualItemPro(e.target.value)}
                                    placeholder="Pro"
                                    className="h-7 text-xs bg-zinc-950 border-zinc-800 font-mono"
                                  />
                                </div>
                                <div className="col-span-1 flex justify-center">
                                  <Button
                                    type="button"
                                    size="sm"
                                    onClick={handleAddManualItem}
                                    className="h-7 px-2 bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold"
                                  >
                                    Add
                                  </Button>
                                </div>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </form>

          {/* Sticky Modal Footer */}
          <DialogFooter className="p-4 border-t border-zinc-800 shrink-0 bg-zinc-950 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-4 text-xs text-zinc-400">
              <span>
                Total Calories: <strong className="text-amber-400">{nutritionSummary.totalCalories}</strong> kcal
              </span>
              <span>
                Total Protein: <strong className="text-emerald-400">{nutritionSummary.totalProtein}</strong>g
              </span>
              {nutritionSummary.target > 0 && (
                <Badge
                  variant="outline"
                  className={`text-[10px] ${
                    Math.abs(nutritionSummary.diff) <= 100
                      ? 'border-emerald-500/40 text-emerald-400 bg-emerald-950/20'
                      : nutritionSummary.diff > 100
                      ? 'border-amber-500/40 text-amber-400 bg-amber-950/20'
                      : 'border-blue-500/40 text-blue-400 bg-blue-950/20'
                  }`}
                >
                  {nutritionSummary.diff === 0
                    ? 'Target Match'
                    : nutritionSummary.diff > 0
                    ? `+${nutritionSummary.diff} kcal over target`
                    : `${nutritionSummary.diff} kcal under target`}
                </Badge>
              )}
            </div>

            <div className="flex items-center gap-2 justify-end">
              <Button
                type="button"
                variant="ghost"
                onClick={() => setOpenModal(false)}
                className="text-zinc-400 hover:bg-zinc-900 text-xs"
              >
                Cancel
              </Button>
              <Button
                type="button"
                onClick={handleSaveDiet}
                disabled={saving}
                className="bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold gap-2 px-4 shadow-lg shadow-purple-900/30"
              >
                {saving ? <Loader2 className="h-4 w-4 animate-spin text-white" /> : <Save className="h-4 w-4" />}
                {dietId ? 'Update Diet Plan' : 'Save Diet Plan'}
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ------------------------------------------------------------- */}
      {/* Assign Diet Modal Dialog */}
      {/* ------------------------------------------------------------- */}
      <Dialog
        open={openAssignModal}
        onOpenChange={(open) => {
          setOpenAssignModal(open);
          if (!open) {
            setSelectedMemberIds([]);
            setMemberSearch('');
          }
        }}
      >
        <DialogContent className="bg-zinc-950 border-zinc-800 text-white max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base font-bold flex items-center gap-2">
              <Users className="h-4 w-4 text-purple-400" /> Assign Diet Plan to Members
            </DialogTitle>
            <DialogDescription className="text-zinc-400 text-xs">
              Assigning <span className="text-purple-400 font-semibold">{selectedDiet?.name}</span> to active gym members.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleAssignDiet} className="space-y-4 pt-2">
            <div className="space-y-2">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-zinc-500" />
                <Input
                  placeholder="Filter members by name or code..."
                  value={memberSearch}
                  onChange={(e) => setMemberSearch(e.target.value)}
                  className="pl-9 bg-zinc-900 border-zinc-800 text-zinc-100 text-xs h-9"
                />
              </div>

              <div className="border border-zinc-800 rounded-lg max-h-56 overflow-y-auto bg-zinc-900/30 divide-y divide-zinc-800/40">
                {members
                  .filter(
                    (m) =>
                      !memberSearch.trim() ||
                      m.name?.toLowerCase().includes(memberSearch.toLowerCase()) ||
                      m.member_code?.toLowerCase().includes(memberSearch.toLowerCase())
                  )
                  .map((m) => (
                    <label
                      key={m.id}
                      className="flex items-center gap-3 px-3 py-2 hover:bg-zinc-800/50 cursor-pointer"
                    >
                      <input
                        type="checkbox"
                        checked={selectedMemberIds.includes(m.id)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedMemberIds((prev) => [...prev, m.id]);
                          } else {
                            setSelectedMemberIds((prev) => prev.filter((id) => id !== m.id));
                          }
                        }}
                        className="rounded border-zinc-700 accent-purple-600 h-4 w-4"
                      />
                      <div className="flex-1 min-w-0">
                        <div className="text-xs font-semibold text-zinc-200 truncate">{m.name}</div>
                        <div className="text-[10px] text-zinc-500 font-mono">{m.member_code}</div>
                      </div>
                    </label>
                  ))}
                {members.length === 0 && (
                  <div className="text-center py-6 text-zinc-500 text-xs">No active members found</div>
                )}
              </div>

              {selectedMemberIds.length > 0 && (
                <p className="text-xs text-purple-400 font-medium">
                  {selectedMemberIds.length} member{selectedMemberIds.length > 1 ? 's' : ''} selected
                </p>
              )}
            </div>

            <DialogFooter className="border-t border-zinc-800/60 pt-3">
              <Button
                type="button"
                variant="ghost"
                onClick={() => setOpenAssignModal(false)}
                className="text-zinc-400 hover:bg-zinc-900 text-xs"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={assigning || selectedMemberIds.length === 0}
                className="bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold gap-2"
              >
                {assigning ? (
                  <>
                    <Loader2 className="h-3.5 w-3.5 animate-spin text-white" /> Assigning...
                  </>
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
