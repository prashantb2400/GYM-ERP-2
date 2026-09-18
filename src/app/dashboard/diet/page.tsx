'use client';

import React, { useEffect, useState, useMemo } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { usePermission } from '@/hooks/usePermission';
import {
  Apple,
  Plus,
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
  ArrowUp,
  ArrowDown,
  Target,
  Zap,
  Copy,
  RotateCcw,
  SlidersHorizontal,
  Info,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
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
  category: 'protein' | 'carbs' | 'fats' | 'greens';
}

const QUICK_FOODS: QuickFood[] = [
  { name: '4 Boiled Egg Whites', qty: '140g', calories: 70, protein: 15, icon: '🥚', category: 'protein' },
  { name: '4 Whole Boiled Eggs', qty: '200g', calories: 280, protein: 24, icon: '🥚', category: 'protein' },
  { name: 'Whey Protein (1 Scoop)', qty: '33g', calories: 125, protein: 25, icon: '🥛', category: 'protein' },
  { name: 'Grilled Chicken Breast', qty: '150g', calories: 240, protein: 46, icon: '🍗', category: 'protein' },
  { name: 'Fresh Paneer', qty: '100g', calories: 265, protein: 18, icon: '🧀', category: 'protein' },
  { name: 'Soya Chunks (Cooked)', qty: '50g dry / 150g', calories: 180, protein: 26, icon: '🌱', category: 'protein' },
  { name: 'Grilled Fish Fillet', qty: '150g', calories: 180, protein: 35, icon: '🐟', category: 'protein' },
  { name: 'Greek Yogurt / Thick Curd', qty: '150g', calories: 100, protein: 10, icon: '🥣', category: 'protein' },
  { name: 'Rolled Oats with Milk', qty: '50g', calories: 190, protein: 7, icon: '🥣', category: 'carbs' },
  { name: 'Steamed Brown Rice', qty: '1 bowl (150g)', calories: 170, protein: 4, icon: '🍚', category: 'carbs' },
  { name: 'Boiled Sweet Potato', qty: '150g', calories: 130, protein: 2, icon: '🥔', category: 'carbs' },
  { name: 'Whole Wheat Roti', qty: '1 pc (35g)', calories: 85, protein: 3, icon: '🫓', category: 'carbs' },
  { name: 'Raw Almonds', qty: '15 pcs (20g)', calories: 120, protein: 4, icon: '🥜', category: 'fats' },
  { name: 'Peanut Butter (Natural)', qty: '1 tbsp (16g)', calories: 95, protein: 4, icon: '🥜', category: 'fats' },
  { name: 'Boiled Sprouts / Chana', qty: '100g', calories: 160, protein: 9, icon: '🥗', category: 'greens' },
  { name: 'Banana', qty: '1 medium', calories: 105, protein: 1, icon: '🍌', category: 'greens' },
  { name: 'Fresh Apple', qty: '1 medium', calories: 65, protein: 0, icon: '🍎', category: 'greens' },
  { name: 'Mixed Green Salad', qty: '1 bowl (150g)', calories: 35, protein: 1, icon: '🥗', category: 'greens' },
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

  // Active meal being edited
  const [activeMealIndex, setActiveMealIndex] = useState<number>(0);

  // Quick Food Palette Drawer toggle & filter
  const [showQuickFoodDrawer, setShowQuickFoodDrawer] = useState(false);
  const [foodCategory, setFoodCategory] = useState<'all' | 'protein' | 'carbs' | 'fats' | 'greens'>('all');
  const [quickFoodSearch, setQuickFoodSearch] = useState('');

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

    meals.forEach((m) => {
      if (Array.isArray(m.items)) {
        m.items.forEach((it) => {
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
    setShowQuickFoodDrawer(false);
    setQuickFoodSearch('');
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
    setShowQuickFoodDrawer(false);
    setQuickFoodSearch('');
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

  // Add quick chip food item to the currently active meal
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

  // Add an empty food item row directly into the meal
  const handleAddEmptyItem = (mealIdx: number) => {
    const updated = [...meals];
    if (!updated[mealIdx]) return;
    const items = [...(updated[mealIdx].items || [])];
    items.push({
      name: '',
      qty: '1 serving (100g)',
      calories: 100,
      protein: 10,
    });
    updated[mealIdx].items = items;
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
    if (meals.length <= 1) {
      toast.error('At least one meal is required in the schedule');
      return;
    }
    const filtered = meals.filter((_, i) => i !== mealIdx);
    setMeals(filtered);
    if (activeMealIndex >= filtered.length) {
      setActiveMealIndex(Math.max(0, filtered.length - 1));
    }
  };

  // Move meal order up or down
  const handleMoveMeal = (idx: number, direction: 'up' | 'down') => {
    const targetIdx = direction === 'up' ? idx - 1 : idx + 1;
    if (targetIdx < 0 || targetIdx >= meals.length) return;
    const updated = [...meals];
    const temp = updated[idx];
    updated[idx] = updated[targetIdx];
    updated[targetIdx] = temp;
    setMeals(updated);
    setActiveMealIndex(targetIdx);
  };

  // Duplicate meal
  const handleDuplicateMeal = (mealIdx: number) => {
    const source = meals[mealIdx];
    if (!source) return;
    const duplicate: Meal = {
      meal_name: `${source.meal_name} (Copy)`,
      time: source.time,
      items: JSON.parse(JSON.stringify(source.items || [])),
    };
    setMeals([...meals, duplicate]);
    setActiveMealIndex(meals.length);
    toast.success(`Duplicated "${source.meal_name}"`);
  };

  // Clear all items in a meal
  const handleClearMeal = (mealIdx: number) => {
    const updated = [...meals];
    if (!updated[mealIdx]) return;
    updated[mealIdx] = {
      ...updated[mealIdx],
      items: [],
    };
    setMeals(updated);
    toast.info('Cleared all items in meal');
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

    if (meals.length === 0 || meals.every((m) => !m.items || m.items.length === 0)) {
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
        const { error } = await supabase.from('diet_charts').insert(payload);

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
      setDiets((prev) => prev.filter((d) => d.id !== id));
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'An unknown error occurred';
      toast.error(msg);
    }
  };

  // Filtered diets for listing
  const filteredDiets = useMemo(() => {
    if (!searchQuery.trim()) return diets;
    const q = searchQuery.toLowerCase();
    return diets.filter(
      (d) => d.name?.toLowerCase().includes(q) || d.description?.toLowerCase().includes(q)
    );
  }, [diets, searchQuery]);

  // Filtered quick foods for palette
  const filteredQuickFoods = useMemo(() => {
    return QUICK_FOODS.filter((f) => {
      const matchesCat = foodCategory === 'all' || f.category === foodCategory;
      const matchesSearch =
        !quickFoodSearch.trim() || f.name.toLowerCase().includes(quickFoodSearch.toLowerCase());
      return matchesCat && matchesSearch;
    });
  }, [foodCategory, quickFoodSearch]);

  const safeActiveMealIndex = Math.min(Math.max(0, activeMealIndex), Math.max(0, meals.length - 1));
  const activeMeal = meals[safeActiveMealIndex];

  const activeMealCals = (activeMeal?.items || []).reduce(
    (s, it) => s + (Number(it.calories) || 0),
    0
  );
  const activeMealPro = (activeMeal?.items || []).reduce(
    (s, it) => s + (Number(it.protein) || 0),
    0
  );

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/[0.08] pb-5">
        <div>
          <div className="flex items-center gap-2.5">
            <h2 className="text-2xl font-bold tracking-tight text-foreground apple-display">
              Nutrition & Diet Studio
            </h2>
            <Badge variant="outline" className="apple-pill bg-primary/10 text-primary border-primary/20 text-[11px] font-mono">
              {diets.length} Plans
            </Badge>
          </div>
          <p className="text-muted-foreground text-xs mt-1">
            Build caloric schedules, use 1-click fitness templates, track live macros, and assign personalized charts to members.
          </p>
        </div>
        <div className="flex items-center gap-3">
          {can('diet.manage') && (
            <Button
              onClick={handleOpenAddModal}
              size="pill"
              className="gap-2 font-medium cursor-pointer shadow-md shadow-primary/20 active:scale-[0.97] transition-all"
            >
              <Plus className="h-4 w-4" /> Create Diet Plan
            </Button>
          )}
        </div>
      </div>

      {/* Filter / Search Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 apple-glass-card p-3 rounded-2xl">
        <div className="relative w-full sm:w-80">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search diet plans by name or goal..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 bg-background/50 border-white/[0.08] text-xs h-9 text-foreground rounded-xl"
          />
        </div>
        <div className="flex items-center gap-2 text-xs text-muted-foreground font-mono">
          <Sparkles className="h-3.5 w-3.5 text-primary shrink-0" />
          <span>Tip: Use pre-built templates inside the builder for 1-click schedules</span>
        </div>
      </div>

      {/* Diet Plan Cards Grid */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-24 gap-3">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-muted-foreground text-xs font-mono">Loading nutrition architecture...</p>
        </div>
      ) : filteredDiets.length === 0 ? (
        <div className="text-center py-20 text-muted-foreground border border-dashed border-white/[0.1] rounded-2xl apple-glass-card">
          <Apple className="h-10 w-10 text-muted-foreground/60 mx-auto mb-3" />
          <h3 className="text-sm font-semibold text-foreground">No diet plans found</h3>
          <p className="text-xs text-muted-foreground mt-1 max-w-sm mx-auto">
            {searchQuery
              ? 'Try adjusting your search filter'
              : 'Create your first diet plan or select a 1-click template to get started.'}
          </p>
          {can('diet.manage') && !searchQuery && (
            <Button
              onClick={handleOpenAddModal}
              size="pill-sm"
              className="mt-4 text-xs gap-1.5 cursor-pointer active:scale-[0.97]"
            >
              <Plus className="h-3.5 w-3.5" /> Create First Plan
            </Button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredDiets.map((diet) => {
            const planMeals = Array.isArray(diet.meals) ? diet.meals : [];
            const planCals = planMeals.reduce((acc: number, m: any) => {
              return (
                acc +
                (Array.isArray(m.items)
                  ? m.items.reduce((s: number, it: any) => s + (Number(it.calories) || 0), 0)
                  : 0)
              );
            }, 0);
            const planPro = planMeals.reduce((acc: number, m: any) => {
              return (
                acc +
                (Array.isArray(m.items)
                  ? m.items.reduce((s: number, it: any) => s + (Number(it.protein) || 0), 0)
                  : 0)
              );
            }, 0);

            return (
              <Card
                key={diet.id}
                className="apple-glass-card rounded-2xl flex flex-col justify-between overflow-hidden transition-[transform,border-color] duration-150 ease-out hover:border-white/[0.18]"
              >
                <CardHeader className="pb-3">
                  <div className="flex justify-between items-start gap-2">
                    <CardTitle className="text-sm font-semibold text-foreground leading-snug line-clamp-1 apple-headline">
                      {diet.name}
                    </CardTitle>
                    {diet.target_calories ? (
                      <Badge className="bg-primary/10 text-primary border-primary/20 text-[10px] font-mono shrink-0 rounded-full px-2">
                        {diet.target_calories} kcal
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="border-white/[0.08] text-muted-foreground text-[10px] font-mono shrink-0 rounded-full px-2">
                        {planCals > 0 ? `${planCals} kcal` : 'Custom'}
                      </Badge>
                    )}
                  </div>
                  <p className="text-muted-foreground text-xs mt-1.5 line-clamp-2 leading-relaxed">
                    {diet.description || 'Nutritional meal schedule tailored for gym members.'}
                  </p>

                  {/* Macro Pills */}
                  <div className="flex items-center gap-2 pt-2 text-[11px] font-mono">
                    <span className="flex items-center gap-1 text-amber-400 font-medium bg-amber-500/10 px-2 py-0.5 rounded-full border border-amber-500/20">
                      <Flame className="h-3 w-3" /> {planCals} kcal
                    </span>
                    <span className="flex items-center gap-1 text-emerald-400 font-medium bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
                      <Zap className="h-3 w-3" /> {planPro}g Pro
                    </span>
                  </div>
                </CardHeader>

                <CardContent className="flex-1 border-t border-white/[0.06] pt-3 text-xs">
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-[10px] text-muted-foreground font-mono font-semibold uppercase tracking-wider">
                      Meals Schedule ({planMeals.length})
                    </span>
                  </div>
                  <div className="space-y-1.5 max-h-[140px] overflow-y-auto pr-1 scrollbar-none">
                    {planMeals.map((m: any, idx: number) => {
                      const itemCount = Array.isArray(m.items) ? m.items.length : 0;
                      return (
                        <div
                          key={idx}
                          className="flex justify-between items-center bg-card/40 px-2.5 py-1.5 border border-white/[0.06] rounded-xl text-xs"
                        >
                          <div className="flex items-center gap-2 min-w-0">
                            <span className="font-semibold text-foreground truncate">{m.meal_name}</span>
                            <span className="text-[10px] text-muted-foreground font-mono">
                              ({itemCount} items)
                            </span>
                          </div>
                          <span className="text-muted-foreground text-[10px] font-mono shrink-0">
                            {m.time || 'Schedule'}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </CardContent>

                <CardFooter className="border-t border-white/[0.06] pt-3 flex gap-2 justify-between bg-card/20">
                  {can('diet.manage') ? (
                    <>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleOpenAssignModal(diet)}
                        className="text-primary hover:text-primary hover:bg-primary/10 text-xs px-2.5 h-8 gap-1.5 font-medium rounded-xl active:scale-[0.97]"
                      >
                        <Users className="h-3.5 w-3.5" /> Link Member
                      </Button>
                      <div className="flex items-center gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          title="Download / Print PDF"
                          onClick={() => window.open(`/api/diet/${diet.id}/pdf`, '_blank')}
                          className="h-8 w-8 text-muted-foreground hover:text-foreground hover:bg-card rounded-lg active:scale-[0.97]"
                        >
                          <Download className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          title="Edit Plan"
                          onClick={() => handleOpenEditModal(diet)}
                          className="h-8 w-8 text-muted-foreground hover:text-foreground hover:bg-card rounded-lg active:scale-[0.97]"
                        >
                          <Eye className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          title="Delete Plan"
                          onClick={() => handleDeleteDiet(diet.id, diet.name)}
                          className="h-8 w-8 text-muted-foreground hover:text-destructive hover:bg-card rounded-lg active:scale-[0.97]"
                        >
                          <Trash className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </>
                  ) : (
                    <span className="text-[10px] text-muted-foreground italic font-mono">Read-only view</span>
                  )}
                </CardFooter>
              </Card>
            );
          })}
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* Redesigned Apple-Grade Diet Builder Studio Dialog              */}
      {/* ------------------------------------------------------------- */}
      <Dialog open={openModal} onOpenChange={setOpenModal}>
        <DialogContent className="max-w-6xl w-[96vw] h-[92vh] flex flex-col p-0 overflow-hidden apple-glass-card rounded-2xl border border-white/[0.1] shadow-2xl bg-zinc-950/95">
          {/* Studio Header Bar */}
          <DialogHeader className="p-3.5 sm:p-4 border-b border-white/[0.08] shrink-0 bg-muted/20">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="h-9 w-9 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary shrink-0 apple-specular-top">
                  <Apple className="h-4.5 w-4.5" />
                </div>
                <div>
                  <DialogTitle className="text-base font-semibold tracking-tight text-foreground flex items-center gap-2 apple-headline">
                    {dietId ? 'Edit Diet Plan' : 'Diet Plan Studio'}
                    <span className="text-[11px] font-normal text-muted-foreground font-mono">
                      v2.5 Architecture
                    </span>
                  </DialogTitle>
                  <DialogDescription className="text-muted-foreground text-xs mt-0.5">
                    Plan daily caloric budget, compose structured meals, and configure macro splits.
                  </DialogDescription>
                </div>
              </div>

              <div className="flex items-center gap-2.5 flex-wrap">
                {/* 1-Click Templates Dropdown */}
                {!dietId && (
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        type="button"
                        variant="outline"
                        size="pill-sm"
                        className="h-8 text-xs border-white/[0.1] bg-card/60 hover:bg-card text-foreground gap-1.5 cursor-pointer active:scale-[0.97]"
                      >
                        <Sparkles className="h-3.5 w-3.5 text-primary" />
                        <span>Preset Templates</span>
                        <ChevronDown className="h-3 w-3 opacity-60" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent
                      align="end"
                      className="w-80 apple-glass-card border-white/[0.1] text-foreground p-1.5 shadow-2xl z-50 rounded-2xl"
                    >
                      <DropdownMenuLabel className="text-[10px] font-mono font-semibold text-muted-foreground px-2 py-1 uppercase tracking-wider">
                        Nutritional Blueprints
                      </DropdownMenuLabel>
                      <DropdownMenuSeparator className="bg-white/[0.08]" />
                      {PRESET_DIET_TEMPLATES.map((tmpl) => (
                        <DropdownMenuItem
                          key={tmpl.id}
                          onClick={() => handleApplyTemplate(tmpl)}
                          className="flex flex-col items-start gap-1 p-2.5 rounded-xl cursor-pointer hover:bg-white/[0.06] focus:bg-white/[0.06] transition-colors"
                        >
                          <div className="flex items-center justify-between w-full">
                            <span className="font-semibold text-xs text-foreground">{tmpl.name}</span>
                            <Badge
                              variant="outline"
                              className="text-[10px] font-mono border-white/[0.1] text-muted-foreground py-0 px-1.5"
                            >
                              {tmpl.targetCalories} kcal
                            </Badge>
                          </div>
                          <p className="text-[11px] text-muted-foreground line-clamp-1">{tmpl.description}</p>
                          <div className="text-[10px] text-muted-foreground/70 font-mono">
                            {tmpl.meals.length} Meals ({tmpl.meals.map((m) => m.meal_name).join(', ')})
                          </div>
                        </DropdownMenuItem>
                      ))}
                    </DropdownMenuContent>
                  </DropdownMenu>
                )}

                {/* Macro Target Capsule */}
                <div className="flex items-center gap-2 bg-card/60 border border-white/[0.08] px-3 py-1 rounded-full text-xs font-mono shadow-xs">
                  <span className="text-muted-foreground text-[11px]">Total:</span>
                  <span className="font-bold text-foreground tabular-nums">
                    {nutritionSummary.totalCalories}
                  </span>
                  <span className="text-muted-foreground text-[10px]">kcal</span>
                  <span className="text-muted-foreground/40">•</span>
                  <span className="font-bold text-foreground tabular-nums">
                    {nutritionSummary.totalProtein}g
                  </span>
                  <span className="text-muted-foreground text-[10px]">pro</span>
                  {nutritionSummary.target > 0 && (
                    <>
                      <span className="text-muted-foreground/40">•</span>
                      <span
                        className={`text-[10px] px-1.5 py-0.2 rounded-full font-semibold ${
                          nutritionSummary.diff === 0
                            ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                            : nutritionSummary.diff > 0
                            ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                            : 'bg-indigo-500/10 text-indigo-400 border border-indigo-500/20'
                        }`}
                      >
                        {nutritionSummary.diff === 0
                          ? 'Target Met'
                          : nutritionSummary.diff > 0
                          ? `+${nutritionSummary.diff} kcal`
                          : `${nutritionSummary.diff} kcal`}
                      </span>
                    </>
                  )}
                </div>
              </div>
            </div>
          </DialogHeader>

          {/* Master-Detail Studio Workspace */}
          <form
            onSubmit={handleSaveDiet}
            className="flex-1 flex flex-col md:flex-row overflow-hidden"
          >
            {/* ----------------------------------------------------------- */}
            {/* LEFT COLUMN: Plan Metadata & Daily Meal Timeline Rail       */}
            {/* ----------------------------------------------------------- */}
            <div className="w-full md:w-80 lg:w-88 border-r border-white/[0.08] bg-zinc-950/60 backdrop-blur-md flex flex-col shrink-0 overflow-y-auto p-4 space-y-4">
              {/* Plan Metadata Box */}
              <div className="apple-glass-card p-3.5 rounded-2xl space-y-3 bg-card/40 border border-white/[0.06]">
                <div className="space-y-1">
                  <Label
                    htmlFor="dietName"
                    className="text-[10px] font-mono font-semibold text-muted-foreground uppercase tracking-wider"
                  >
                    Plan Name *
                  </Label>
                  <Input
                    id="dietName"
                    placeholder="e.g. 1,800 Kcal Lean Fat Loss"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="bg-background/60 border-white/[0.08] text-xs h-8 text-foreground placeholder:text-muted-foreground/60 rounded-xl focus-visible:border-primary"
                  />
                </div>

                <div className="grid grid-cols-2 gap-2.5">
                  <div className="space-y-1">
                    <Label
                      htmlFor="targetCals"
                      className="text-[10px] font-mono font-semibold text-muted-foreground uppercase tracking-wider"
                    >
                      Target Daily Kcal
                    </Label>
                    <div className="relative">
                      <Input
                        id="targetCals"
                        type="number"
                        placeholder="1800"
                        value={targetCalories}
                        onChange={(e) => setTargetCalories(e.target.value)}
                        className="bg-background/60 border-white/[0.08] text-xs h-8 pr-10 text-foreground font-mono rounded-xl focus-visible:border-primary"
                      />
                      <span className="absolute right-2.5 top-2 text-[10px] text-muted-foreground font-mono pointer-events-none">
                        kcal
                      </span>
                    </div>
                  </div>

                  <div className="space-y-1">
                    <Label className="text-[10px] font-mono font-semibold text-muted-foreground uppercase tracking-wider">
                      Visibility
                    </Label>
                    <div className="flex items-center h-8 px-2.5 rounded-xl bg-background/60 border border-white/[0.08] text-xs font-mono text-muted-foreground truncate">
                      <span className="text-primary font-medium">Template</span>
                    </div>
                  </div>
                </div>

                <div className="space-y-1">
                  <Label
                    htmlFor="desc"
                    className="text-[10px] font-mono font-semibold text-muted-foreground uppercase tracking-wider"
                  >
                    Coaching Directives & Notes
                  </Label>
                  <Input
                    id="desc"
                    placeholder="e.g. 3.5L water daily. Pre-workout coffee 30m prior."
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    className="bg-background/60 border-white/[0.08] text-xs h-8 text-foreground placeholder:text-muted-foreground/60 rounded-xl focus-visible:border-primary"
                  />
                </div>
              </div>

              {/* Meals Timeline / Schedule */}
              <div className="space-y-2 flex-1 flex flex-col">
                <div className="flex items-center justify-between gap-2 pb-1 border-b border-white/[0.08]">
                  <div className="flex items-center gap-1.5">
                    <Utensils className="h-3.5 w-3.5 text-primary" />
                    <span className="text-xs font-semibold text-foreground tracking-tight apple-subhead">
                      Daily Schedule
                    </span>
                    <Badge
                      variant="outline"
                      className="text-[10px] font-mono py-0 px-1.5 border-white/[0.1] text-muted-foreground"
                    >
                      {meals.length}
                    </Badge>
                  </div>

                  {/* Add Meal Dropdown */}
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="h-6.5 text-[11px] px-2 rounded-full border-white/[0.1] bg-card/60 hover:bg-card text-foreground font-medium gap-1 cursor-pointer active:scale-[0.97]"
                      >
                        <Plus className="h-3 w-3" /> Add Meal
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent
                      align="end"
                      className="apple-glass-card border-white/[0.1] text-foreground p-1 text-xs z-50 rounded-xl"
                    >
                      {[
                        'Breakfast',
                        'Mid-Morning Snack',
                        'Lunch',
                        'Evening Snack',
                        'Pre-Workout',
                        'Post-Workout',
                        'Dinner',
                      ].map((mPreset) => (
                        <DropdownMenuItem
                          key={mPreset}
                          onClick={() => handleAddMealCard(mPreset)}
                          className="cursor-pointer hover:bg-white/[0.06] text-xs rounded-lg py-1.5"
                        >
                          + {mPreset}
                        </DropdownMenuItem>
                      ))}
                      <DropdownMenuSeparator className="bg-white/[0.08]" />
                      <DropdownMenuItem
                        onClick={() => handleAddMealCard()}
                        className="cursor-pointer text-primary hover:bg-primary/10 font-semibold text-xs rounded-lg py-1.5"
                      >
                        + Custom Meal
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>

                {/* Vertical Meal Card Stream */}
                <div className="space-y-2 overflow-y-auto pr-1 flex-1">
                  {meals.map((m, idx) => {
                    const isSelected = safeActiveMealIndex === idx;
                    const mCals = (m.items || []).reduce(
                      (s, it) => s + (Number(it.calories) || 0),
                      0
                    );
                    const mPro = (m.items || []).reduce(
                      (s, it) => s + (Number(it.protein) || 0),
                      0
                    );

                    return (
                      <div
                        key={idx}
                        onClick={() => setActiveMealIndex(idx)}
                        className={`group relative p-3 rounded-2xl transition-[background-color,border-color,transform] duration-150 ease-out border cursor-pointer select-none ${
                          isSelected
                            ? 'apple-glass-card border-primary/40 bg-primary/[0.07] shadow-sm'
                            : 'bg-card/40 border-white/[0.06] hover:border-white/[0.14] hover:bg-card/70'
                        }`}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-2 min-w-0">
                            <div
                              className={`w-2 h-2 rounded-full shrink-0 transition-colors ${
                                isSelected ? 'bg-primary shadow-[0_0_8px_rgba(99,102,241,0.8)]' : 'bg-muted-foreground/30'
                              }`}
                            />
                            <span className="font-semibold text-xs text-foreground truncate">
                              {m.meal_name || `Meal ${idx + 1}`}
                            </span>
                          </div>

                          <div className="flex items-center gap-1 opacity-80 group-hover:opacity-100">
                            <span className="text-[10px] text-muted-foreground font-mono flex items-center gap-1">
                              <Clock className="h-2.5 w-2.5" />
                              {m.time || 'Schedule'}
                            </span>
                          </div>
                        </div>

                        <div className="flex items-center justify-between mt-2 pt-1.5 border-t border-white/[0.04] text-[10px] font-mono">
                          <span className="text-muted-foreground">
                            {m.items?.length || 0} item{(m.items?.length || 0) !== 1 ? 's' : ''}
                          </span>
                          <span className="text-foreground font-semibold">
                            {mCals} kcal • {mPro}g pro
                          </span>
                        </div>

                        {/* Reorder and Delete controls on hover */}
                        <div className="absolute right-2 top-2 hidden group-hover:flex items-center gap-0.5 bg-background/80 backdrop-blur-md rounded-lg p-0.5 border border-white/[0.08]">
                          <button
                            type="button"
                            disabled={idx === 0}
                            onClick={(e) => {
                              e.stopPropagation();
                              handleMoveMeal(idx, 'up');
                            }}
                            className="p-1 text-muted-foreground hover:text-foreground disabled:opacity-30 cursor-pointer"
                            title="Move Up"
                          >
                            <ArrowUp className="h-3 w-3" />
                          </button>
                          <button
                            type="button"
                            disabled={idx === meals.length - 1}
                            onClick={(e) => {
                              e.stopPropagation();
                              handleMoveMeal(idx, 'down');
                            }}
                            className="p-1 text-muted-foreground hover:text-foreground disabled:opacity-30 cursor-pointer"
                            title="Move Down"
                          >
                            <ArrowDown className="h-3 w-3" />
                          </button>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDuplicateMeal(idx);
                            }}
                            className="p-1 text-muted-foreground hover:text-foreground cursor-pointer"
                            title="Duplicate Meal"
                          >
                            <Copy className="h-3 w-3" />
                          </button>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleRemoveMealCard(idx);
                            }}
                            className="p-1 text-muted-foreground hover:text-destructive cursor-pointer"
                            title="Delete Meal"
                          >
                            <Trash2 className="h-3 w-3" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* ----------------------------------------------------------- */}
            {/* RIGHT COLUMN: Active Meal Focus Studio & Food Items Table   */}
            {/* ----------------------------------------------------------- */}
            <div className="flex-1 flex flex-col overflow-hidden bg-zinc-900/10">
              {activeMeal ? (
                <>
                  {/* Active Meal Header Strip */}
                  <div className="p-3.5 sm:p-4 border-b border-white/[0.08] bg-card/20 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shrink-0">
                    <div className="flex items-center gap-3 flex-wrap">
                      <Input
                        value={activeMeal.meal_name}
                        onChange={(e) =>
                          handleUpdateMealMeta(safeActiveMealIndex, 'meal_name', e.target.value)
                        }
                        placeholder="Meal Name (e.g. Breakfast)"
                        className="h-8 text-sm font-semibold bg-background/50 border-white/[0.08] text-foreground w-48 rounded-xl focus-visible:border-primary"
                      />

                      <div className="flex items-center gap-1.5 bg-background/50 border border-white/[0.08] rounded-xl px-2.5 h-8">
                        <Clock className="h-3 w-3 text-muted-foreground" />
                        <input
                          value={activeMeal.time}
                          onChange={(e) =>
                            handleUpdateMealMeta(safeActiveMealIndex, 'time', e.target.value)
                          }
                          placeholder="08:00 AM"
                          className="text-xs bg-transparent border-none text-foreground focus:outline-none w-20 font-mono"
                        />
                      </div>

                      <div className="text-xs font-mono bg-muted/40 border border-white/[0.08] px-3 py-1 rounded-full text-foreground shadow-xs">
                        <span className="font-bold">{activeMealCals}</span>{' '}
                        <span className="text-muted-foreground text-[10px]">kcal</span> •{' '}
                        <span className="font-bold">{activeMealPro}g</span>{' '}
                        <span className="text-muted-foreground text-[10px]">pro</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => setShowQuickFoodDrawer(!showQuickFoodDrawer)}
                        className={`h-7.5 px-2.5 text-xs rounded-xl font-medium gap-1.5 cursor-pointer active:scale-[0.97] ${
                          showQuickFoodDrawer
                            ? 'bg-primary/10 text-primary border border-primary/20'
                            : 'text-muted-foreground hover:text-foreground hover:bg-card/60 border border-white/[0.06]'
                        }`}
                      >
                        <Sparkles className="h-3.5 w-3.5" />
                        <span>Food Library</span>
                      </Button>

                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => handleClearMeal(safeActiveMealIndex)}
                        className="h-7.5 px-2 text-xs text-muted-foreground hover:text-foreground rounded-xl active:scale-[0.97]"
                        title="Clear all foods"
                      >
                        <RotateCcw className="h-3 w-3 mr-1" /> Clear
                      </Button>

                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => handleRemoveMealCard(safeActiveMealIndex)}
                        className="h-7.5 px-2 text-xs text-muted-foreground hover:text-destructive rounded-xl active:scale-[0.97]"
                        title="Delete this meal"
                      >
                        <Trash2 className="h-3.5 w-3.5 mr-1" /> Delete
                      </Button>
                    </div>
                  </div>

                  {/* Food Items Table / Cards */}
                  <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4">
                    {/* Collapsible Quick Food Palette Drawer */}
                    {showQuickFoodDrawer && (
                      <div className="apple-glass-card p-3.5 rounded-2xl border border-white/[0.08] bg-card/60 space-y-3">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                          <div className="flex items-center gap-2">
                            <Sparkles className="h-3.5 w-3.5 text-primary" />
                            <span className="text-xs font-semibold text-foreground">
                              Quick-Add Food Items
                            </span>
                            <span className="text-[10px] text-muted-foreground font-mono">
                              (Click to append into {activeMeal.meal_name})
                            </span>
                          </div>

                          {/* Category Filter Pills */}
                          <div className="flex items-center gap-1 overflow-x-auto">
                            {[
                              { key: 'all', label: 'All' },
                              { key: 'protein', label: '🍗 Protein' },
                              { key: 'carbs', label: '🍚 Carbs' },
                              { key: 'fats', label: '🥜 Fats' },
                              { key: 'greens', label: '🥗 Greens/Fruits' },
                            ].map((cat) => (
                              <button
                                key={cat.key}
                                type="button"
                                onClick={() => setFoodCategory(cat.key as any)}
                                className={`px-2 py-0.5 rounded-lg text-[10px] font-medium transition-colors cursor-pointer active:scale-95 ${
                                  foodCategory === cat.key
                                    ? 'bg-primary text-primary-foreground font-semibold shadow-xs'
                                    : 'bg-card/50 text-muted-foreground hover:bg-card hover:text-foreground border border-white/[0.06]'
                                }`}
                              >
                                {cat.label}
                              </button>
                            ))}
                          </div>
                        </div>

                        {/* Search in quick food library */}
                        <div className="relative">
                          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                          <Input
                            placeholder="Filter foods by name (e.g. egg, chicken, oats, paneer)..."
                            value={quickFoodSearch}
                            onChange={(e) => setQuickFoodSearch(e.target.value)}
                            className="pl-8 h-7.5 text-xs bg-background/50 border-white/[0.08] text-foreground rounded-xl"
                          />
                        </div>

                        {/* Food Chip Grid */}
                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2 max-h-40 overflow-y-auto pr-1">
                          {filteredQuickFoods.map((food, idx) => (
                            <button
                              key={idx}
                              type="button"
                              onClick={() => handleAddQuickFood(food)}
                              className="flex items-center justify-between p-2 rounded-xl text-left bg-card/40 border border-white/[0.06] hover:border-primary/40 hover:bg-primary/[0.05] transition-all cursor-pointer active:scale-95 group"
                            >
                              <div className="flex items-center gap-2 min-w-0">
                                <span className="text-sm shrink-0">{food.icon}</span>
                                <div className="min-w-0">
                                  <div className="text-[11px] font-semibold text-foreground truncate group-hover:text-primary">
                                    {food.name}
                                  </div>
                                  <div className="text-[9px] text-muted-foreground font-mono truncate">
                                    {food.qty}
                                  </div>
                                </div>
                              </div>
                              <div className="text-right font-mono shrink-0 pl-1">
                                <div className="text-[10px] font-bold text-foreground">
                                  {food.calories} <span className="text-[8px] font-normal text-muted-foreground">kcal</span>
                                </div>
                                <div className="text-[9px] text-emerald-400 font-semibold">
                                  {food.protein}g <span className="text-[8px] font-normal text-muted-foreground">P</span>
                                </div>
                              </div>
                            </button>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Clean Items Table */}
                    <div className="apple-glass-card rounded-2xl overflow-hidden border border-white/[0.08] bg-card/30">
                      {/* Table Column Headers */}
                      <div className="flex items-center gap-3 px-3.5 py-2 border-b border-white/[0.06] text-[10px] uppercase font-mono font-semibold text-muted-foreground tracking-wider bg-card/20">
                        <div className="flex-1">Food Item & Brand</div>
                        <div className="w-36">Serving / Portion</div>
                        <div className="w-24">Calories</div>
                        <div className="w-20">Protein</div>
                        <div className="w-9 text-center">Action</div>
                      </div>

                      {/* Items List Rows */}
                      <div className="divide-y divide-white/[0.04]">
                        {(activeMeal.items || []).length === 0 ? (
                          <div className="text-center py-10 px-4 space-y-2">
                            <Utensils className="h-6 w-6 mx-auto text-muted-foreground/50" />
                            <p className="text-xs font-semibold text-foreground">
                              No food items in {activeMeal.meal_name}
                            </p>
                            <p className="text-[11px] text-muted-foreground max-w-sm mx-auto">
                              Add a custom food row below or open the Food Library to pick popular fitness foods with 1 click.
                            </p>
                            <div className="pt-2 flex items-center justify-center gap-2">
                              <Button
                                type="button"
                                size="sm"
                                onClick={() => handleAddEmptyItem(safeActiveMealIndex)}
                                className="h-7.5 text-xs rounded-xl gap-1.5 cursor-pointer active:scale-[0.97]"
                              >
                                <Plus className="h-3.5 w-3.5" /> Add Food Row
                              </Button>
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={() => setShowQuickFoodDrawer(true)}
                                className="h-7.5 text-xs rounded-xl gap-1.5 border-white/[0.1] bg-card/50 hover:bg-card cursor-pointer active:scale-[0.97]"
                              >
                                <Sparkles className="h-3.5 w-3.5 text-primary" /> Browse Library
                              </Button>
                            </div>
                          </div>
                        ) : (
                          activeMeal.items.map((item, itemIdx) => (
                            <div
                              key={itemIdx}
                              className="flex items-center gap-3 px-3.5 py-2 hover:bg-card/40 transition-colors"
                            >
                              <div className="flex-1">
                                <Input
                                  value={item.name}
                                  onChange={(e) =>
                                    handleUpdateItem(safeActiveMealIndex, itemIdx, 'name', e.target.value)
                                  }
                                  placeholder="e.g. Grilled Chicken Breast / Boiled Eggs"
                                  className="h-8 text-xs bg-background/50 border-white/[0.08] text-foreground rounded-xl placeholder:text-muted-foreground/60 focus-visible:border-primary"
                                />
                              </div>

                              <div className="w-36">
                                <Input
                                  value={item.qty}
                                  onChange={(e) =>
                                    handleUpdateItem(safeActiveMealIndex, itemIdx, 'qty', e.target.value)
                                  }
                                  placeholder="e.g. 150g or 4 whites"
                                  className="h-8 text-xs bg-background/50 border-white/[0.08] text-foreground rounded-xl placeholder:text-muted-foreground/60 focus-visible:border-primary"
                                />
                              </div>

                              <div className="w-24 relative">
                                <Input
                                  type="number"
                                  value={item.calories || ''}
                                  onChange={(e) =>
                                    handleUpdateItem(
                                      safeActiveMealIndex,
                                      itemIdx,
                                      'calories',
                                      e.target.value
                                    )
                                  }
                                  placeholder="0"
                                  className="h-8 text-xs bg-background/50 border-white/[0.08] text-foreground font-mono font-medium rounded-xl pr-9 focus-visible:border-primary"
                                />
                                <span className="absolute right-2 top-2 text-[9px] text-muted-foreground font-mono pointer-events-none">
                                  kcal
                                </span>
                              </div>

                              <div className="w-20 relative">
                                <Input
                                  type="number"
                                  value={item.protein || ''}
                                  onChange={(e) =>
                                    handleUpdateItem(
                                      safeActiveMealIndex,
                                      itemIdx,
                                      'protein',
                                      e.target.value
                                    )
                                  }
                                  placeholder="0"
                                  className="h-8 text-xs bg-background/50 border-white/[0.08] text-foreground font-mono font-medium rounded-xl pr-5 focus-visible:border-primary"
                                />
                                <span className="absolute right-2 top-2 text-[9px] text-muted-foreground font-mono pointer-events-none">
                                  g
                                </span>
                              </div>

                              <div className="w-9 flex justify-center">
                                <button
                                  type="button"
                                  onClick={() => handleRemoveItem(safeActiveMealIndex, itemIdx)}
                                  className="h-8 w-8 flex items-center justify-center rounded-xl text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors cursor-pointer active:scale-95"
                                  title="Remove item"
                                >
                                  <Trash2 className="h-3.5 w-3.5" />
                                </button>
                              </div>
                            </div>
                          ))
                        )}
                      </div>

                      {/* Add Food Row Strip */}
                      {(activeMeal.items || []).length > 0 && (
                        <div className="p-3 border-t border-white/[0.06] bg-card/10 flex items-center justify-between">
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => handleAddEmptyItem(safeActiveMealIndex)}
                            className="h-7 text-xs border-dashed border-white/[0.12] bg-card/30 hover:bg-card/70 text-foreground gap-1.5 rounded-xl cursor-pointer active:scale-[0.97]"
                          >
                            <Plus className="h-3 w-3" />
                            <span>Add Food Item</span>
                          </Button>

                          <div className="text-[11px] font-mono text-muted-foreground">
                            Meal Macro Total:{' '}
                            <span className="text-foreground font-semibold">{activeMealCals} kcal</span> •{' '}
                            <span className="text-emerald-400 font-semibold">{activeMealPro}g protein</span>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </>
              ) : (
                <div className="flex-1 flex flex-col items-center justify-center p-6 text-center text-muted-foreground">
                  <Utensils className="h-8 w-8 mb-2 opacity-40" />
                  <p className="text-sm font-semibold text-foreground">No meal selected</p>
                  <p className="text-xs mt-1">Select a meal from the left timeline or add a new meal.</p>
                </div>
              )}
            </div>
          </form>

          {/* Sticky Studio Footer */}
          <DialogFooter className="p-3.5 sm:p-4 border-t border-white/[0.08] shrink-0 bg-muted/20 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3 text-xs text-muted-foreground flex-wrap font-mono">
              <span>
                Total Calories: <strong className="text-foreground">{nutritionSummary.totalCalories}</strong> kcal
              </span>
              <span>•</span>
              <span>
                Total Protein: <strong className="text-foreground">{nutritionSummary.totalProtein}</strong>g
              </span>
              {nutritionSummary.target > 0 && (
                <>
                  <span>•</span>
                  <span>
                    Target: <strong className="text-foreground">{nutritionSummary.target}</strong> kcal (
                    <span
                      className={
                        nutritionSummary.diff === 0
                          ? 'text-emerald-400'
                          : nutritionSummary.diff > 0
                          ? 'text-amber-400'
                          : 'text-indigo-400'
                      }
                    >
                      {nutritionSummary.diff > 0
                        ? `+${nutritionSummary.diff} surplus`
                        : nutritionSummary.diff < 0
                        ? `${Math.abs(nutritionSummary.diff)} deficit`
                        : 'Exact Match'}
                    </span>
                    )
                  </span>
                </>
              )}
            </div>

            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="ghost"
                size="pill-sm"
                onClick={() => setOpenModal(false)}
                className="text-xs cursor-pointer active:scale-[0.97]"
              >
                Cancel
              </Button>
              <Button
                type="button"
                size="pill-sm"
                onClick={handleSaveDiet}
                disabled={saving}
                className="text-xs font-semibold gap-1.5 cursor-pointer shadow-md shadow-primary/20 active:scale-[0.97]"
              >
                {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
                {dietId ? 'Update Diet Plan' : 'Save Diet Plan'}
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ------------------------------------------------------------- */}
      {/* Assign Diet Modal Dialog                                      */}
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
        <DialogContent className="apple-glass-card border-white/[0.1] text-foreground max-w-md rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-base font-semibold flex items-center gap-2 apple-headline">
              <Users className="h-4 w-4 text-primary" /> Assign Diet Plan to Members
            </DialogTitle>
            <DialogDescription className="text-muted-foreground text-xs">
              Assigning <span className="text-primary font-semibold">{selectedDiet?.name}</span> to active gym members.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleAssignDiet} className="space-y-4 pt-2">
            <div className="space-y-2">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                <Input
                  placeholder="Filter members by name or code..."
                  value={memberSearch}
                  onChange={(e) => setMemberSearch(e.target.value)}
                  className="pl-9 bg-background/50 border-white/[0.08] text-foreground text-xs h-9 rounded-xl"
                />
              </div>

              <div className="border border-white/[0.08] rounded-2xl max-h-56 overflow-y-auto bg-card/30 divide-y divide-white/[0.04]">
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
                      className="flex items-center gap-3 px-3.5 py-2.5 hover:bg-card/50 cursor-pointer transition-colors"
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
                        className="rounded border-white/[0.2] accent-primary h-4 w-4"
                      />
                      <div className="flex-1 min-w-0">
                        <div className="text-xs font-semibold text-foreground truncate">{m.name}</div>
                        <div className="text-[10px] text-muted-foreground font-mono">{m.member_code}</div>
                      </div>
                    </label>
                  ))}
                {members.length === 0 && (
                  <div className="text-center py-6 text-muted-foreground text-xs font-mono">
                    No active members found
                  </div>
                )}
              </div>

              {selectedMemberIds.length > 0 && (
                <p className="text-xs text-primary font-medium font-mono">
                  {selectedMemberIds.length} member{selectedMemberIds.length > 1 ? 's' : ''} selected
                </p>
              )}
            </div>

            <DialogFooter className="border-t border-white/[0.08] pt-3">
              <Button
                type="button"
                variant="ghost"
                size="pill-sm"
                onClick={() => setOpenAssignModal(false)}
                className="text-muted-foreground text-xs cursor-pointer active:scale-[0.97]"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                size="pill-sm"
                disabled={assigning || selectedMemberIds.length === 0}
                className="text-xs font-semibold gap-2 cursor-pointer active:scale-[0.97]"
              >
                {assigning ? (
                  <>
                    <Loader2 className="h-3.5 w-3.5 animate-spin" /> Assigning...
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
