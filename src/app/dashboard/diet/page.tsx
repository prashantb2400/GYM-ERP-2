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
  ArrowLeft,
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
      {/* Modern, Clean, Effortless Diet Plan Studio (Full-Screen)      */}
      {/* ------------------------------------------------------------- */}
      {openModal && (
        <div className="fixed inset-0 z-50 bg-background flex flex-col overflow-hidden animate-in fade-in duration-150">
          {/* 1. Top Control Bar (Never wraps, ultra-clean) */}
          <header className="h-14 px-3 sm:px-6 border-b border-border/70 bg-card/80 backdrop-blur-xl flex items-center justify-between gap-2 shrink-0">
            {/* Left: Back / Exit + Title */}
            <div className="flex items-center gap-2 sm:gap-3 min-w-0">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setOpenModal(false)}
                className="h-8 px-2 sm:px-3 text-xs gap-1.5 rounded-full text-muted-foreground hover:text-foreground active:scale-95 shrink-0"
              >
                <ArrowLeft className="h-4 w-4" />
                <span className="hidden sm:inline">Exit Studio</span>
              </Button>
              <div className="h-4 w-px bg-border/80 hidden sm:block" />
              <div className="flex items-center gap-2 min-w-0">
                <div className="size-7 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center text-primary shrink-0">
                  <Apple className="h-4 w-4" />
                </div>
                <div className="flex items-baseline gap-2 truncate">
                  <h1 className="text-xs sm:text-sm font-bold text-foreground truncate">
                    {dietId ? 'Edit Diet Plan' : 'Diet Plan Studio'}
                  </h1>
                  <span className="text-[10px] font-mono text-muted-foreground hidden md:inline">
                    v2.5
                  </span>
                </div>
              </div>
            </div>

            {/* Center / Right: Macro Pill, Presets & Save */}
            <div className="flex items-center gap-2 shrink-0">
              {/* Solid Macro Pill - whitespace-nowrap prevents line wrapping */}
              <div className="flex items-center gap-2 px-2.5 sm:px-3.5 py-1 rounded-full bg-muted/60 border border-border/80 text-xs font-mono whitespace-nowrap">
                <span className="flex items-center gap-1 font-bold text-foreground">
                  <Flame className="size-3.5 text-amber-500 shrink-0" />
                  <span>{nutritionSummary.totalCalories}</span>
                  <span className="text-[10px] text-muted-foreground font-normal">kcal</span>
                </span>
                <span className="text-muted-foreground/40">•</span>
                <span className="flex items-center gap-1 font-bold text-foreground">
                  <Zap className="size-3.5 text-emerald-500 shrink-0" />
                  <span>{nutritionSummary.totalProtein}g</span>
                  <span className="text-[10px] text-muted-foreground font-normal">pro</span>
                </span>
                {nutritionSummary.target > 0 && (
                  <>
                    <span className="text-muted-foreground/40 hidden lg:inline">•</span>
                    <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold hidden lg:inline-flex ${
                      nutritionSummary.diff === 0
                        ? 'bg-emerald-500/15 text-emerald-400'
                        : nutritionSummary.diff > 0
                        ? 'bg-amber-500/15 text-amber-400'
                        : 'bg-indigo-500/15 text-indigo-400'
                    }`}>
                      {nutritionSummary.diff === 0
                        ? 'Target Met'
                        : nutritionSummary.diff > 0
                        ? `+${nutritionSummary.diff} kcal`
                        : `${nutritionSummary.diff} kcal`}
                    </span>
                  </>
                )}
              </div>

              {/* Presets Dropdown */}
              {!dietId && (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="h-8 px-2.5 sm:px-3 text-xs rounded-full gap-1.5 cursor-pointer active:scale-95"
                    >
                      <Sparkles className="size-3.5 text-primary" />
                      <span className="hidden sm:inline">Presets</span>
                      <ChevronDown className="size-3 opacity-60" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-80 p-1.5 shadow-2xl rounded-2xl z-50">
                    <DropdownMenuLabel className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground px-2 py-1">
                      Nutritional Blueprints
                    </DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    {PRESET_DIET_TEMPLATES.map((tmpl) => (
                      <DropdownMenuItem
                        key={tmpl.id}
                        onClick={() => handleApplyTemplate(tmpl)}
                        className="flex flex-col items-start gap-1 p-2.5 rounded-xl cursor-pointer"
                      >
                        <div className="flex items-center justify-between w-full">
                          <span className="font-semibold text-xs text-foreground">{tmpl.name}</span>
                          <Badge variant="outline" className="text-[10px] font-mono py-0 px-1.5">
                            {tmpl.targetCalories} kcal
                          </Badge>
                        </div>
                        <p className="text-[11px] text-muted-foreground line-clamp-1">{tmpl.description}</p>
                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuContent>
                </DropdownMenu>
              )}

              {/* Top Save Button */}
              <Button
                type="button"
                size="sm"
                onClick={handleSaveDiet}
                disabled={saving}
                className="h-8 px-3.5 sm:px-4 text-xs font-semibold rounded-full gap-1.5 shadow-sm active:scale-95"
              >
                {saving ? <Loader2 className="size-3.5 animate-spin" /> : <Save className="size-3.5" />}
                <span className="hidden xs:inline">{dietId ? 'Update' : 'Save'}</span>
              </Button>
            </div>
          </header>

          {/* 2. Plan Metadata Strip (Compact 3-column bar) */}
          <div className="border-b border-border/60 bg-card/40 px-3 sm:px-6 py-2.5 shrink-0">
            <div className="max-w-6xl mx-auto grid grid-cols-1 sm:grid-cols-3 gap-2 sm:gap-4">
              <div className="space-y-1">
                <Label htmlFor="dietName" className="text-[10px] font-mono font-semibold text-muted-foreground uppercase tracking-wider">
                  Plan Name *
                </Label>
                <Input
                  id="dietName"
                  placeholder="e.g. 1,800 Kcal Lean Fat Loss"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="h-8 text-xs bg-background/60 rounded-xl"
                />
              </div>

              <div className="space-y-1">
                <Label htmlFor="targetCals" className="text-[10px] font-mono font-semibold text-muted-foreground uppercase tracking-wider">
                  Daily Target Calories
                </Label>
                <div className="relative">
                  <Input
                    id="targetCals"
                    type="number"
                    placeholder="2000"
                    value={targetCalories}
                    onChange={(e) => setTargetCalories(e.target.value)}
                    className="h-8 text-xs pr-12 font-mono bg-background/60 rounded-xl"
                  />
                  <span className="absolute right-2.5 top-2 text-[10px] text-muted-foreground font-mono pointer-events-none">
                    kcal
                  </span>
                </div>
              </div>

              <div className="space-y-1">
                <Label htmlFor="desc" className="text-[10px] font-mono font-semibold text-muted-foreground uppercase tracking-wider">
                  Coaching Notes & Directives
                </Label>
                <Input
                  id="desc"
                  placeholder="e.g. 3.5L water daily. Pre-workout coffee 30m prior."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="h-8 text-xs bg-background/60 rounded-xl"
                />
              </div>
            </div>
          </div>

          {/* 3. Horizontal Meal Navigation Rail */}
          <div className="border-b border-border/60 bg-muted/20 px-3 sm:px-6 py-2 shrink-0">
            <div className="max-w-6xl mx-auto flex items-center justify-between gap-3">
              <div className="flex items-center gap-2 overflow-x-auto scrollbar-none py-0.5 flex-1">
                {meals.map((m, idx) => {
                  const isSelected = safeActiveMealIndex === idx;
                  const mCals = (m.items || []).reduce((s, it) => s + (Number(it.calories) || 0), 0);
                  return (
                    <div
                      key={idx}
                      onClick={() => setActiveMealIndex(idx)}
                      className={`group shrink-0 flex items-center gap-2 px-3 py-1.5 rounded-full text-xs cursor-pointer select-none transition-all duration-150 ${
                        isSelected
                          ? 'bg-primary text-primary-foreground font-semibold shadow-sm'
                          : 'bg-card/70 hover:bg-card border border-border text-foreground'
                      }`}
                    >
                      <span className="truncate max-w-[120px]">{m.meal_name || `Meal ${idx + 1}`}</span>
                      <span className={`text-[10px] font-mono px-1.5 py-0.2 rounded-full whitespace-nowrap ${
                        isSelected ? 'bg-black/20 text-white' : 'bg-muted text-muted-foreground'
                      }`}>
                        {m.time ? `${m.time} • ` : ''}{mCals} kcal
                      </span>

                      {/* Dropdown Menu for Move/Duplicate/Delete */}
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                          <button
                            type="button"
                            className={`size-4 rounded-full flex items-center justify-center opacity-60 hover:opacity-100 ${
                              isSelected ? 'hover:bg-white/20' : 'hover:bg-muted'
                            }`}
                          >
                            <ChevronDown className="size-3" />
                          </button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="start" className="w-40 p-1 text-xs rounded-xl z-50">
                          <DropdownMenuItem
                            disabled={idx === 0}
                            onClick={() => handleMoveMeal(idx, 'up')}
                            className="gap-2 cursor-pointer"
                          >
                            <ArrowUp className="size-3.5" /> Move Left
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            disabled={idx === meals.length - 1}
                            onClick={() => handleMoveMeal(idx, 'down')}
                            className="gap-2 cursor-pointer"
                          >
                            <ArrowDown className="size-3.5" /> Move Right
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => handleDuplicateMeal(idx)}
                            className="gap-2 cursor-pointer"
                          >
                            <Copy className="size-3.5" /> Duplicate
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            disabled={meals.length <= 1}
                            onClick={() => handleRemoveMealCard(idx)}
                            className="gap-2 cursor-pointer text-destructive focus:text-destructive"
                          >
                            <Trash2 className="size-3.5" /> Delete Meal
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  );
                })}

                {/* Add Meal Trigger */}
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="h-7 px-3 rounded-full text-xs font-medium border-dashed border-border hover:border-primary gap-1 shrink-0 cursor-pointer active:scale-95"
                    >
                      <Plus className="size-3.5" /> Add Meal
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="start" className="w-44 p-1 text-xs rounded-xl z-50">
                    {['Breakfast', 'Mid-Morning Snack', 'Lunch', 'Evening Snack', 'Pre-Workout', 'Post-Workout', 'Dinner'].map((preset) => (
                      <DropdownMenuItem
                        key={preset}
                        onClick={() => handleAddMealCard(preset)}
                        className="cursor-pointer py-1.5"
                      >
                        + {preset}
                      </DropdownMenuItem>
                    ))}
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      onClick={() => handleAddMealCard()}
                      className="cursor-pointer py-1.5 font-semibold text-primary"
                    >
                      + Custom Meal
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>
          </div>

          {/* 4. Active Meal Canvas (Scrollable Main Workspace) */}
          <div className="flex-1 overflow-y-auto bg-background/50">
            <div className="max-w-6xl mx-auto p-3 sm:p-6 space-y-4">
              {activeMeal ? (
                <>
                  {/* Meal Header & Fast Actions */}
                  <div className="p-3 sm:p-4 rounded-2xl border border-border/80 bg-card/60 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
                      <Input
                        value={activeMeal.meal_name}
                        onChange={(e) => handleUpdateMealMeta(safeActiveMealIndex, 'meal_name', e.target.value)}
                        placeholder="Meal Name (e.g. Breakfast)"
                        className="h-8 text-sm font-semibold w-40 sm:w-48 bg-background/60 rounded-xl"
                      />
                      <div className="flex items-center gap-1.5 bg-background/60 border border-border rounded-xl px-2.5 h-8">
                        <Clock className="size-3 text-muted-foreground" />
                        <input
                          value={activeMeal.time}
                          onChange={(e) => handleUpdateMealMeta(safeActiveMealIndex, 'time', e.target.value)}
                          placeholder="08:00 AM"
                          className="text-xs bg-transparent border-none text-foreground focus:outline-none w-20 font-mono"
                        />
                      </div>
                      <div className="text-xs font-mono bg-muted/60 px-2.5 py-1 rounded-full text-foreground whitespace-nowrap">
                        <span className="font-bold">{activeMealCals}</span> kcal • <span className="font-bold">{activeMealPro}g</span> pro
                      </div>
                    </div>

                    <div className="flex items-center gap-2 flex-wrap">
                      <Button
                        type="button"
                        size="sm"
                        onClick={() => handleAddEmptyItem(safeActiveMealIndex)}
                        className="h-8 px-3 text-xs rounded-xl gap-1.5 font-medium cursor-pointer active:scale-95"
                      >
                        <Plus className="size-3.5" /> Add Food
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => setShowQuickFoodDrawer(!showQuickFoodDrawer)}
                        className={`h-8 px-3 text-xs rounded-xl font-medium gap-1.5 cursor-pointer active:scale-95 ${
                          showQuickFoodDrawer
                            ? 'bg-primary/15 text-primary border-primary/30'
                            : 'bg-card/70 hover:bg-card text-foreground border-border'
                        }`}
                      >
                        <Sparkles className="size-3.5 text-primary" />
                        <span>Food Library</span>
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => handleClearMeal(safeActiveMealIndex)}
                        className="h-8 px-2 text-xs text-muted-foreground hover:text-foreground rounded-xl active:scale-95"
                        title="Clear meal items"
                      >
                        <RotateCcw className="size-3 mr-1" /> Clear
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => handleRemoveMealCard(safeActiveMealIndex)}
                        disabled={meals.length <= 1}
                        className="h-8 px-2 text-xs text-muted-foreground hover:text-destructive rounded-xl active:scale-95"
                        title="Delete meal"
                      >
                        <Trash2 className="size-3.5 mr-1" /> Delete
                      </Button>
                    </div>
                  </div>

                  {/* Collapsible Food Library Drawer */}
                  {showQuickFoodDrawer && (
                    <div className="p-3.5 sm:p-4 rounded-2xl border border-border/80 bg-card/80 space-y-3 shadow-md">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                        <div className="flex items-center gap-2">
                          <Sparkles className="size-4 text-primary" />
                          <span className="text-xs sm:text-sm font-semibold text-foreground">
                            1-Click Fitness Food Library
                          </span>
                          <span className="text-[10px] text-muted-foreground font-mono hidden sm:inline">
                            (Appends to {activeMeal.meal_name})
                          </span>
                        </div>

                        {/* Category filter pills */}
                        <div className="flex items-center gap-1 overflow-x-auto pb-0.5">
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
                              className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-colors cursor-pointer active:scale-95 whitespace-nowrap ${
                                foodCategory === cat.key
                                  ? 'bg-primary text-primary-foreground font-semibold shadow-xs'
                                  : 'bg-muted/60 text-muted-foreground hover:bg-muted hover:text-foreground'
                              }`}
                            >
                              {cat.label}
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Search Bar */}
                      <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground" />
                        <Input
                          placeholder="Search foods (e.g. egg whites, chicken breast, oats, whey, paneer)..."
                          value={quickFoodSearch}
                          onChange={(e) => setQuickFoodSearch(e.target.value)}
                          className="pl-9 h-8 text-xs bg-background/60 rounded-xl"
                        />
                      </div>

                      {/* Responsive Grid of Food Chips */}
                      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2 max-h-48 overflow-y-auto pr-1">
                        {filteredQuickFoods.map((food, idx) => (
                          <button
                            key={idx}
                            type="button"
                            onClick={() => handleAddQuickFood(food)}
                            className="flex items-center justify-between p-2 rounded-xl text-left bg-background/60 border border-border/70 hover:border-primary/50 hover:bg-primary/[0.06] transition-all cursor-pointer active:scale-95 group"
                          >
                            <div className="flex items-center gap-2 min-w-0">
                              <span className="text-base shrink-0">{food.icon}</span>
                              <div className="min-w-0">
                                <div className="text-xs font-semibold text-foreground truncate group-hover:text-primary">
                                  {food.name}
                                </div>
                                <div className="text-[10px] text-muted-foreground font-mono truncate">
                                  {food.qty}
                                </div>
                              </div>
                            </div>
                            <div className="text-right font-mono shrink-0 pl-1">
                              <div className="text-[11px] font-bold text-foreground">
                                {food.calories} <span className="text-[9px] font-normal text-muted-foreground">kcal</span>
                              </div>
                              <div className="text-[10px] text-emerald-500 font-semibold">
                                {food.protein}g <span className="text-[9px] font-normal text-muted-foreground">pro</span>
                              </div>
                            </div>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Food Items Display: Desktop Table + Mobile Cards */}
                  {/* DESKTOP TABLE VIEW */}
                  <div className="hidden sm:block rounded-2xl overflow-hidden border border-border/80 bg-card/60">
                    <div className="flex items-center gap-3 px-4 py-2.5 border-b border-border/70 text-[10px] uppercase font-mono font-semibold text-muted-foreground tracking-wider bg-muted/30">
                      <div className="flex-1">Food Item & Brand</div>
                      <div className="w-40">Serving / Portion</div>
                      <div className="w-28">Calories</div>
                      <div className="w-24">Protein</div>
                      <div className="w-10 text-center">Action</div>
                    </div>

                    <div className="divide-y divide-border/40">
                      {(activeMeal.items || []).length === 0 ? (
                        <div className="text-center py-10 px-4 space-y-2">
                          <Utensils className="size-6 mx-auto text-muted-foreground/50" />
                          <p className="text-xs font-semibold text-foreground">
                            No food items in {activeMeal.meal_name}
                          </p>
                          <p className="text-xs text-muted-foreground max-w-sm mx-auto">
                            Add a custom food row below or open the Food Library to pick popular fitness foods with 1 click.
                          </p>
                          <div className="pt-2 flex items-center justify-center gap-2">
                            <Button
                              type="button"
                              size="sm"
                              onClick={() => handleAddEmptyItem(safeActiveMealIndex)}
                              className="h-8 text-xs rounded-xl gap-1.5 cursor-pointer active:scale-95"
                            >
                              <Plus className="size-3.5" /> Add Food Row
                            </Button>
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() => setShowQuickFoodDrawer(true)}
                              className="h-8 text-xs rounded-xl gap-1.5 cursor-pointer active:scale-95"
                            >
                              <Sparkles className="size-3.5 text-primary" /> Browse Library
                            </Button>
                          </div>
                        </div>
                      ) : (
                        activeMeal.items.map((item, itemIdx) => (
                          <div
                            key={itemIdx}
                            className="flex items-center gap-3 px-4 py-2 hover:bg-muted/30 transition-colors"
                          >
                            <div className="flex-1">
                              <Input
                                value={item.name}
                                onChange={(e) => handleUpdateItem(safeActiveMealIndex, itemIdx, 'name', e.target.value)}
                                placeholder="e.g. Boiled Egg Whites / Rolled Oats"
                                className="h-8 text-xs bg-background/60 rounded-xl"
                              />
                            </div>
                            <div className="w-40">
                              <Input
                                value={item.qty}
                                onChange={(e) => handleUpdateItem(safeActiveMealIndex, itemIdx, 'qty', e.target.value)}
                                placeholder="e.g. 4 whites (140g)"
                                className="h-8 text-xs bg-background/60 rounded-xl"
                              />
                            </div>
                            <div className="w-28 relative">
                              <Input
                                type="number"
                                value={item.calories || ''}
                                onChange={(e) => handleUpdateItem(safeActiveMealIndex, itemIdx, 'calories', e.target.value)}
                                placeholder="0"
                                className="h-8 text-xs pr-10 font-mono bg-background/60 rounded-xl"
                              />
                              <span className="absolute right-2.5 top-2 text-[10px] text-muted-foreground font-mono pointer-events-none">
                                kcal
                              </span>
                            </div>
                            <div className="w-24 relative">
                              <Input
                                type="number"
                                value={item.protein || ''}
                                onChange={(e) => handleUpdateItem(safeActiveMealIndex, itemIdx, 'protein', e.target.value)}
                                placeholder="0"
                                className="h-8 text-xs pr-7 font-mono bg-background/60 rounded-xl"
                              />
                              <span className="absolute right-2.5 top-2 text-[10px] text-muted-foreground font-mono pointer-events-none">
                                g
                              </span>
                            </div>
                            <div className="w-10 text-center">
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                onClick={() => handleRemoveItem(safeActiveMealIndex, itemIdx)}
                                className="size-8 text-muted-foreground hover:text-destructive rounded-lg cursor-pointer active:scale-95"
                              >
                                <Trash2 className="size-3.5" />
                              </Button>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>

                  {/* MOBILE CARDS VIEW (Clean, No-cramp cards on phones) */}
                  <div className="block sm:hidden space-y-2.5">
                    {(activeMeal.items || []).length === 0 ? (
                      <div className="text-center py-8 px-4 rounded-2xl border border-border/80 bg-card/60 space-y-2">
                        <Utensils className="size-6 mx-auto text-muted-foreground/50" />
                        <p className="text-xs font-semibold text-foreground">
                          No food items in {activeMeal.meal_name}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          Add a custom food row or pick from the Food Library.
                        </p>
                        <div className="pt-2 flex flex-col gap-2">
                          <Button
                            type="button"
                            size="sm"
                            onClick={() => handleAddEmptyItem(safeActiveMealIndex)}
                            className="h-8 text-xs rounded-xl gap-1.5 w-full cursor-pointer active:scale-95"
                          >
                            <Plus className="size-3.5" /> Add Food Row
                          </Button>
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => setShowQuickFoodDrawer(true)}
                            className="h-8 text-xs rounded-xl gap-1.5 w-full cursor-pointer active:scale-95"
                          >
                            <Sparkles className="size-3.5 text-primary" /> Browse Food Library
                          </Button>
                        </div>
                      </div>
                    ) : (
                      activeMeal.items.map((item, itemIdx) => (
                        <div key={itemIdx} className="p-3 rounded-2xl border border-border/80 bg-card/60 space-y-2.5 shadow-xs">
                          <div className="flex items-center justify-between gap-2">
                            <Input
                              value={item.name}
                              onChange={(e) => handleUpdateItem(safeActiveMealIndex, itemIdx, 'name', e.target.value)}
                              placeholder="Food Item & Brand (e.g. Boiled Eggs)"
                              className="h-8 text-xs font-semibold bg-background/60 rounded-xl"
                            />
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              onClick={() => handleRemoveItem(safeActiveMealIndex, itemIdx)}
                              className="size-8 text-muted-foreground hover:text-destructive shrink-0 rounded-lg cursor-pointer"
                            >
                              <Trash2 className="size-4" />
                            </Button>
                          </div>
                          <div className="grid grid-cols-3 gap-2">
                            <Input
                              value={item.qty}
                              onChange={(e) => handleUpdateItem(safeActiveMealIndex, itemIdx, 'qty', e.target.value)}
                              placeholder="Portion (150g)"
                              className="h-7.5 text-xs bg-background/60 rounded-lg text-center"
                            />
                            <div className="relative">
                              <Input
                                type="number"
                                value={item.calories || ''}
                                onChange={(e) => handleUpdateItem(safeActiveMealIndex, itemIdx, 'calories', e.target.value)}
                                placeholder="Kcal"
                                className="h-7.5 text-xs font-mono bg-background/60 rounded-lg text-center pr-6"
                              />
                              <span className="absolute right-1.5 top-1.5 text-[9px] text-muted-foreground font-mono">kcal</span>
                            </div>
                            <div className="relative">
                              <Input
                                type="number"
                                value={item.protein || ''}
                                onChange={(e) => handleUpdateItem(safeActiveMealIndex, itemIdx, 'protein', e.target.value)}
                                placeholder="Protein"
                                className="h-7.5 text-xs font-mono bg-background/60 rounded-lg text-center pr-4"
                              />
                              <span className="absolute right-1.5 top-1.5 text-[9px] text-muted-foreground font-mono">g</span>
                            </div>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </>
              ) : (
                <div className="flex flex-col items-center justify-center py-16 text-center text-muted-foreground">
                  <Utensils className="size-8 mb-2 opacity-40" />
                  <p className="text-sm font-semibold text-foreground">No meal selected</p>
                  <p className="text-xs mt-1">Select a meal tab above or click "+ Add Meal" to begin.</p>
                </div>
              )}
            </div>
          </div>

          {/* 5. Sticky Bottom Action Bar */}
          <footer className="px-4 sm:px-6 py-3 border-t border-border/80 bg-card/90 backdrop-blur-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 shrink-0">
            <div className="flex items-center gap-3 text-xs text-muted-foreground flex-wrap font-mono">
              <span>
                Total: <strong className="text-foreground">{nutritionSummary.totalCalories}</strong> kcal
              </span>
              <span>•</span>
              <span>
                Protein: <strong className="text-foreground">{nutritionSummary.totalProtein}</strong>g
              </span>
              <span>•</span>
              <span>{meals.length} Meals</span>
              {nutritionSummary.target > 0 && (
                <>
                  <span>•</span>
                  <span>
                    Target: <strong className="text-foreground">{nutritionSummary.target}</strong> kcal (
                    <span
                      className={
                        nutritionSummary.diff === 0
                          ? 'text-emerald-400 font-semibold'
                          : nutritionSummary.diff > 0
                          ? 'text-amber-400 font-semibold'
                          : 'text-indigo-400 font-semibold'
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

            <div className="flex items-center gap-2 self-end sm:self-auto">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setOpenModal(false)}
                className="h-8 text-xs rounded-full cursor-pointer active:scale-95"
              >
                Cancel
              </Button>
              <Button
                type="button"
                size="sm"
                onClick={handleSaveDiet}
                disabled={saving}
                className="h-8 px-4 text-xs font-semibold rounded-full gap-1.5 shadow-sm active:scale-95"
              >
                {saving ? <Loader2 className="size-3.5 animate-spin" /> : <Save className="size-3.5" />}
                <span>{dietId ? 'Update Diet Plan' : 'Save Diet Plan'}</span>
              </Button>
            </div>
          </footer>
        </div>
      )}

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
