'use client';

import React, { useEffect, useState, useMemo } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { usePermission } from '@/hooks/usePermission';
import {
  Dumbbell,
  Plus,
  Trash2,
  Save,
  Loader2,
  Users,
  Eye,
  Trash,
  Search,
  Sparkles,
  Download,
  Calendar,
  Clock,
  Zap,
  Copy,
  ChevronDown,
  ArrowUp,
  ArrowDown,
  RotateCcw,
  Activity,
  ArrowLeft,
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
import { ExerciseDay, Exercise } from '@/types/database';

// -------------------------------------------------------------
// 1-Click Pre-Built Workout Split Templates
// -------------------------------------------------------------
interface WorkoutTemplate {
  id: string;
  name: string;
  description: string;
  splitBadge: string;
  days: ExerciseDay[];
}

const PRESET_WORKOUT_TEMPLATES: WorkoutTemplate[] = [
  {
    id: 'ppl-3day',
    name: 'Push - Pull - Legs (3-Day Split)',
    description: 'Gold standard compound split balancing chest, back, shoulders, arms, and leg development with maximum recovery.',
    splitBadge: '3 Days / Wk',
    days: [
      {
        day: 'Monday: Push (Chest, Delts & Triceps)',
        exercises: [
          { name: 'Barbell Flat Bench Press', sets: 4, reps: '8-10', rest_seconds: 90, notes: 'Touch chest, explosive upward push' },
          { name: 'Incline Dumbbell Press', sets: 3, reps: '10-12', rest_seconds: 75, notes: '30 degree bench angle, deep chest stretch' },
          { name: 'Dumbbell Lateral Raises', sets: 4, reps: '12-15', rest_seconds: 45, notes: 'Lead with elbows, strict controlled tempo' },
          { name: 'Cable Rope Tricep Pushdown', sets: 3, reps: '12-15', rest_seconds: 45, notes: 'Spread rope at the bottom lockout' },
          { name: 'Overhead Dumbbell Extension', sets: 3, reps: '10-12', rest_seconds: 60, notes: 'Deep stretch behind head for long head triceps' },
        ],
      },
      {
        day: 'Wednesday: Pull (Back, Rear Delts & Biceps)',
        exercises: [
          { name: 'Conventional Barbell Deadlift', sets: 4, reps: '5-6', rest_seconds: 120, notes: 'Neutral spine, tight lats, drive through floor' },
          { name: 'Lat Pulldown (Wide Grip)', sets: 4, reps: '8-10', rest_seconds: 75, notes: 'Pull elbows down to ribs, squeeze scapula' },
          { name: 'Seated Cable Row', sets: 3, reps: '10-12', rest_seconds: 60, notes: 'Maintain upright posture, full stretch' },
          { name: 'Standing Barbell Bicep Curl', sets: 3, reps: '10-12', rest_seconds: 60, notes: 'Elbows pinned to sides, zero body swing' },
          { name: 'Incline Dumbbell Hammer Curl', sets: 3, reps: '12-15', rest_seconds: 45, notes: 'Targets brachialis and forearm thickness' },
        ],
      },
      {
        day: 'Friday: Legs & Abs (Quads, Hamstrings & Calves)',
        exercises: [
          { name: 'Barbell Back Squat', sets: 4, reps: '8-10', rest_seconds: 120, notes: 'Hit depth below parallel, knees track toes' },
          { name: 'Romanian Deadlift (RDL)', sets: 3, reps: '10-12', rest_seconds: 90, notes: 'Hinge back at hips, intense hamstring stretch' },
          { name: 'Leg Press 45 Degree', sets: 3, reps: '12-15', rest_seconds: 75, notes: 'Full depth without lower back peeling up' },
          { name: 'Standing Calf Raise', sets: 4, reps: '15-20', rest_seconds: 45, notes: 'Pause 2 seconds at the peak contraction' },
          { name: 'Hanging Leg Raise', sets: 3, reps: '12-15', rest_seconds: 45, notes: 'Curl pelvis up towards chest, avoid swinging' },
        ],
      },
    ],
  },
  {
    id: 'bro-split-5day',
    name: '5-Day Muscle Hypertrophy (Bro Split)',
    description: 'High-volume single muscle group focus targeting maximum sarcoplasmic hypertrophy and muscle pump.',
    splitBadge: '5 Days / Wk',
    days: [
      {
        day: 'Monday: Chest Annihilation',
        exercises: [
          { name: 'Barbell Flat Bench Press', sets: 4, reps: '8-10', rest_seconds: 90, notes: 'Heavy working sets' },
          { name: 'Incline Dumbbell Bench Press', sets: 4, reps: '10-12', rest_seconds: 75, notes: 'Focus on upper clavicular head' },
          { name: 'Standing Cable Chest Flyes', sets: 3, reps: '12-15', rest_seconds: 60, notes: 'Continuous tension on chest' },
          { name: 'Parallel Bar Dips / Pushups', sets: 3, reps: 'To Failure', rest_seconds: 60, notes: 'Lean forward for lower pecs' },
        ],
      },
      {
        day: 'Tuesday: Back & Traps Width',
        exercises: [
          { name: 'Barbell Deadlift', sets: 4, reps: '6-8', rest_seconds: 120, notes: 'Total posterior chain power' },
          { name: 'Bent-Over Barbell Row', sets: 4, reps: '8-10', rest_seconds: 90, notes: 'Torso at 45 degrees, pull to navel' },
          { name: 'Lat Pulldown (Close Grip V-Bar)', sets: 3, reps: '10-12', rest_seconds: 60, notes: 'Lower lat focus' },
          { name: 'Dumbbell Shrugs', sets: 4, reps: '15', rest_seconds: 45, notes: 'Hold squeeze at top for 2 seconds' },
        ],
      },
      {
        day: 'Wednesday: 3D Shoulders & Abs',
        exercises: [
          { name: 'Seated Dumbbell Overhead Press', sets: 4, reps: '8-10', rest_seconds: 90, notes: 'Full overhead extension' },
          { name: 'Dumbbell Lateral Raise', sets: 4, reps: '12-15', rest_seconds: 45, notes: 'Side delt burn sets' },
          { name: 'Rear Delt Face Pulls with Rope', sets: 4, reps: '15-20', rest_seconds: 45, notes: 'Pull to eyes, external rotation' },
          { name: 'Cable Woodchoppers', sets: 3, reps: '15 / side', rest_seconds: 45, notes: 'Rotate through core' },
        ],
      },
      {
        day: 'Thursday: Wheels (Legs Quads & Hams)',
        exercises: [
          { name: 'Barbell Back Squat', sets: 4, reps: '8-10', rest_seconds: 120, notes: 'Heavy progressive overload' },
          { name: 'Leg Extension Machine', sets: 4, reps: '12-15', rest_seconds: 60, notes: 'Squeeze quad teardrop at lockout' },
          { name: 'Lying Hamstring Leg Curl', sets: 4, reps: '10-12', rest_seconds: 60, notes: 'Slow 3-second eccentric release' },
          { name: 'Standing Calf Raise', sets: 4, reps: '15-20', rest_seconds: 45, notes: 'Full ankle stretch and contraction' },
        ],
      },
      {
        day: 'Friday: Arms Superset (Biceps & Triceps)',
        exercises: [
          { name: 'Barbell EZ-Bar Bicep Curl', sets: 4, reps: '10-12', rest_seconds: 60, notes: 'Strict form' },
          { name: 'Close-Grip Bench Press', sets: 4, reps: '8-10', rest_seconds: 75, notes: 'Heavy tricep builder' },
          { name: 'Incline Dumbbell Hammer Curl', sets: 3, reps: '12-15', rest_seconds: 45, notes: 'Forearms and brachialis' },
          { name: 'Lying Skull Crushers', sets: 3, reps: '10-12', rest_seconds: 60, notes: 'Lower to hairline, press up' },
          { name: 'Cable Triceps Rope Pushdown', sets: 3, reps: '15', rest_seconds: 45, notes: 'Finisher pump' },
        ],
      },
    ],
  },
  {
    id: 'upper-lower-4day',
    name: 'Upper / Lower (4-Day Split)',
    description: 'Optimal training frequency hitting every muscle group twice per week for strength and athletic conditioning.',
    splitBadge: '4 Days / Wk',
    days: [
      {
        day: 'Monday: Upper Power',
        exercises: [
          { name: 'Barbell Bench Press', sets: 4, reps: '6-8', rest_seconds: 120, notes: 'Heavy strength sets' },
          { name: 'Bent-Over Barbell Row', sets: 4, reps: '6-8', rest_seconds: 120, notes: 'Explosive pull to chest' },
          { name: 'Overhead Military Press', sets: 3, reps: '8-10', rest_seconds: 90, notes: 'Strict standing press' },
          { name: 'Weighted Pull-ups / Lat Pulldown', sets: 3, reps: '8-10', rest_seconds: 90, notes: 'Full range of motion' },
        ],
      },
      {
        day: 'Tuesday: Lower Power',
        exercises: [
          { name: 'Barbell Back Squat', sets: 4, reps: '6-8', rest_seconds: 120, notes: 'Power squat form' },
          { name: 'Romanian Deadlift (RDL)', sets: 4, reps: '8-10', rest_seconds: 90, notes: 'Hips back, hamstring stretch' },
          { name: 'Bulgarian Split Squat', sets: 3, reps: '10 / leg', rest_seconds: 75, notes: 'Unilateral leg drive' },
          { name: 'Standing Calf Raise', sets: 4, reps: '12-15', rest_seconds: 60, notes: 'Heavy calf overload' },
        ],
      },
      {
        day: 'Thursday: Upper Hypertrophy',
        exercises: [
          { name: 'Incline Dumbbell Press', sets: 4, reps: '10-12', rest_seconds: 75, notes: 'Upper chest focus' },
          { name: 'Seated Cable Row', sets: 4, reps: '10-12', rest_seconds: 75, notes: 'Mid-back thickness' },
          { name: 'Dumbbell Lateral Raise', sets: 4, reps: '12-15', rest_seconds: 45, notes: 'Side delt pump' },
          { name: 'Incline Dumbbell Bicep Curl', sets: 3, reps: '12', rest_seconds: 60, notes: 'Full long head stretch' },
          { name: 'Overhead Cable Triceps Extension', sets: 3, reps: '12-15', rest_seconds: 60, notes: 'Constant cable tension' },
        ],
      },
      {
        day: 'Friday: Lower Hypertrophy',
        exercises: [
          { name: 'Leg Press 45 Degree', sets: 4, reps: '12-15', rest_seconds: 90, notes: 'High volume quad burner' },
          { name: 'Lying Hamstring Leg Curl', sets: 4, reps: '12', rest_seconds: 60, notes: 'Control the descent' },
          { name: 'Walking Dumbbell Lunges', sets: 3, reps: '12 steps / leg', rest_seconds: 60, notes: 'Keep torso upright' },
          { name: 'Hanging Knee Raises', sets: 3, reps: '15', rest_seconds: 45, notes: 'Core control' },
        ],
      },
    ],
  },
  {
    id: 'fullbody-3day',
    name: 'Full Body Conditioning (3-Day Circuit)',
    description: 'High-calorie burn total body workout perfect for fat loss, cardiovascular conditioning, and beginner trainees.',
    splitBadge: '3 Days / Wk',
    days: [
      {
        day: 'Monday: Full Body Circuit A',
        exercises: [
          { name: 'Dumbbell Goblet Squats', sets: 3, reps: '12-15', rest_seconds: 60, notes: 'Deep squat with elbows inside knees' },
          { name: 'Dumbbell Push Press', sets: 3, reps: '10-12', rest_seconds: 60, notes: 'Slight leg dip and drive overhead' },
          { name: 'Dumbbell Bent-Over Row', sets: 3, reps: '12', rest_seconds: 60, notes: 'Flat back, squeeze upper back' },
          { name: 'Forearm Plank Hold', sets: 3, reps: '45-60s', rest_seconds: 45, notes: 'Maintain tight abdominal brace' },
        ],
      },
      {
        day: 'Wednesday: Full Body Circuit B',
        exercises: [
          { name: 'Kettlebell / Dumbbell Deadlift', sets: 3, reps: '12', rest_seconds: 60, notes: 'Drive through heels, snap hips' },
          { name: 'Standard Push-ups', sets: 3, reps: '15-20', rest_seconds: 60, notes: 'Chest touches floor every rep' },
          { name: 'Lat Pulldown Machine', sets: 3, reps: '12-15', rest_seconds: 60, notes: 'Smooth controlled tempo' },
          { name: 'Mountain Climbers', sets: 3, reps: '30s fast', rest_seconds: 45, notes: 'High knee drive for conditioning' },
        ],
      },
      {
        day: 'Friday: Full Body Circuit C',
        exercises: [
          { name: 'Walking Dumbbell Lunges', sets: 3, reps: '10 / leg', rest_seconds: 60, notes: 'Knee gently touches turf' },
          { name: 'Flat Dumbbell Chest Press', sets: 3, reps: '12', rest_seconds: 60, notes: 'Clean press and squeeze' },
          { name: 'Seated Cable Row', sets: 3, reps: '12', rest_seconds: 60, notes: 'Scapular retraction' },
          { name: 'Russian Twists', sets: 3, reps: '20 / side', rest_seconds: 45, notes: 'Rotate shoulders side to side' },
        ],
      },
    ],
  },
];

// -------------------------------------------------------------
// Quick Muscle-Group Exercise Library Chips
// -------------------------------------------------------------
interface QuickExercise {
  name: string;
  sets: number;
  reps: string;
  rest: number;
  notes: string;
  category: 'Chest' | 'Back' | 'Legs' | 'Shoulders' | 'Arms' | 'Core';
}

const QUICK_EXERCISES: QuickExercise[] = [
  // Chest
  { name: 'Barbell Flat Bench Press', sets: 4, reps: '8-10', rest: 90, notes: 'Touch chest, drive up', category: 'Chest' },
  { name: 'Incline Dumbbell Press', sets: 3, reps: '10-12', rest: 75, notes: '30 deg incline, upper chest', category: 'Chest' },
  { name: 'Cable Chest Flyes', sets: 3, reps: '12-15', rest: 60, notes: 'Peak contraction squeeze', category: 'Chest' },
  { name: 'Parallel Dips / Pushups', sets: 3, reps: '12-15', rest: 60, notes: 'Lean forward for chest focus', category: 'Chest' },

  // Back
  { name: 'Conventional Deadlift', sets: 4, reps: '5-6', rest: 120, notes: 'Neutral spine, leg drive', category: 'Back' },
  { name: 'Lat Pulldown Wide Grip', sets: 4, reps: '8-10', rest: 75, notes: 'Pull elbows to ribs', category: 'Back' },
  { name: 'Bent-Over Barbell Row', sets: 4, reps: '8-10', rest: 90, notes: 'Torso 45 deg, pull to waist', category: 'Back' },
  { name: 'Seated Cable Row', sets: 3, reps: '10-12', rest: 60, notes: 'Full scapular squeeze', category: 'Back' },

  // Legs
  { name: 'Barbell Back Squat', sets: 4, reps: '8-10', rest: 120, notes: 'Below parallel depth', category: 'Legs' },
  { name: 'Romanian Deadlift (RDL)', sets: 3, reps: '10-12', rest: 90, notes: 'Hips back, hamstring stretch', category: 'Legs' },
  { name: 'Leg Press 45 Degree', sets: 3, reps: '12-15', rest: 75, notes: 'Full range of motion', category: 'Legs' },
  { name: 'Lying Hamstring Leg Curl', sets: 3, reps: '12', rest: 60, notes: 'Slow controlled negative', category: 'Legs' },
  { name: 'Standing Calf Raise', sets: 4, reps: '15-20', rest: 45, notes: '2s pause at top contraction', category: 'Legs' },

  // Shoulders
  { name: 'Overhead Barbell Military Press', sets: 4, reps: '8-10', rest: 90, notes: 'Lock out overhead', category: 'Shoulders' },
  { name: 'Dumbbell Lateral Raise', sets: 4, reps: '12-15', rest: 45, notes: 'Lead with elbows', category: 'Shoulders' },
  { name: 'Rear Delt Face Pulls', sets: 3, reps: '15-20', rest: 45, notes: 'External rotation at eyes', category: 'Shoulders' },
  { name: 'Dumbbell Front Raise', sets: 3, reps: '12-15', rest: 45, notes: 'Raise to chin level', category: 'Shoulders' },

  // Arms
  { name: 'Barbell Bicep Curl', sets: 3, reps: '10-12', rest: 60, notes: 'Elbows pinned to sides', category: 'Arms' },
  { name: 'Dumbbell Hammer Curl', sets: 3, reps: '12-15', rest: 45, notes: 'Forearms & brachialis', category: 'Arms' },
  { name: 'Cable Rope Tricep Pushdown', sets: 3, reps: '12-15', rest: 45, notes: 'Spread rope at lockout', category: 'Arms' },
  { name: 'Skull Crushers (EZ Bar)', sets: 3, reps: '10-12', rest: 60, notes: 'Lower to forehead', category: 'Arms' },

  // Core
  { name: 'Hanging Leg Raises', sets: 3, reps: '12-15', rest: 45, notes: 'Curl pelvis up', category: 'Core' },
  { name: 'Forearm Plank Hold', sets: 3, reps: '45-60s', rest: 45, notes: 'Tight glutes & abs', category: 'Core' },
  { name: 'Cable Woodchoppers', sets: 3, reps: '15 / side', rest: 45, notes: 'Rotational oblique power', category: 'Core' },
  { name: 'Ab Roller Wheel', sets: 3, reps: '12-15', rest: 45, notes: 'Controlled rollout', category: 'Core' },
];

export default function ExercisePlansPage() {
  const supabase = createClient();
  const { user } = useAuth();
  const { can } = usePermission();

  const [loading, setLoading] = useState(true);
  const [exercises, setExercises] = useState<any[]>([]);
  const [openModal, setOpenModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // Assignment Modal states
  const [openAssignModal, setOpenAssignModal] = useState(false);
  const [assigning, setAssigning] = useState(false);
  const [selectedWorkout, setSelectedWorkout] = useState<any>(null);
  const [members, setMembers] = useState<any[]>([]);
  const [selectedMemberIds, setSelectedMemberIds] = useState<string[]>([]);
  const [memberSearch, setMemberSearch] = useState('');

  // Builder Form states
  const [workoutId, setWorkoutId] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [isTemplate, setIsTemplate] = useState(true);
  const [days, setDays] = useState<ExerciseDay[]>([]);

  // Active workout day being composed
  const [activeDayIndex, setActiveDayIndex] = useState<number>(0);

  // Quick Exercise Drawer toggle & filters
  const [showQuickExDrawer, setShowQuickExDrawer] = useState(false);
  const [selectedMuscleFilter, setSelectedMuscleFilter] = useState<string>('All');
  const [quickExSearch, setQuickExSearch] = useState('');

  const fetchExercises = async () => {
    if (!user?.gymId) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('exercise_charts')
        .select('*')
        .eq('gym_id', user.gymId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setExercises(data || []);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'An unknown error occurred';
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchExercises();
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

  // Total exercises & sets count across all days
  const workoutSummary = useMemo(() => {
    let totalExCount = 0;
    let totalSets = 0;

    days.forEach((d) => {
      if (Array.isArray(d.exercises)) {
        totalExCount += d.exercises.length;
        d.exercises.forEach((ex) => {
          totalSets += Number(ex.sets) || 0;
        });
      }
    });

    return {
      totalDays: days.length,
      totalExercises: totalExCount,
      totalSets,
    };
  }, [days]);

  const handleOpenAddModal = () => {
    if (!can('exercise.manage')) {
      toast.error('You do not have permission to manage exercises');
      return;
    }
    setWorkoutId(null);
    setName('');
    setDescription('');
    setIsTemplate(true);
    setDays([
      {
        day: 'Monday: Push (Chest & Triceps)',
        exercises: [],
      },
      {
        day: 'Wednesday: Pull (Back & Biceps)',
        exercises: [],
      },
      {
        day: 'Friday: Legs & Core',
        exercises: [],
      },
    ]);
    setActiveDayIndex(0);
    setShowQuickExDrawer(false);
    setQuickExSearch('');
    setOpenModal(true);
  };

  const handleOpenEditModal = (workout: any) => {
    if (!can('exercise.manage')) {
      toast.error('You do not have permission to manage exercises');
      return;
    }
    setWorkoutId(workout.id);
    setName(workout.name);
    setDescription(workout.description || '');
    setIsTemplate(workout.is_template);
    setDays(workout.days || []);
    setActiveDayIndex(0);
    setShowQuickExDrawer(false);
    setQuickExSearch('');
    setOpenModal(true);
  };

  const handleApplyTemplate = (template: WorkoutTemplate) => {
    setName(template.name);
    setDescription(template.description);
    setDays(JSON.parse(JSON.stringify(template.days)));
    setActiveDayIndex(0);
    toast.success(`Loaded workout split: "${template.name}"`);
  };

  // Add quick chip exercise to the currently active day
  const handleAddQuickExercise = (ex: QuickExercise) => {
    if (days.length === 0) {
      toast.error('Please add a workout day first');
      return;
    }

    const targetIdx = activeDayIndex >= 0 && activeDayIndex < days.length ? activeDayIndex : 0;
    const targetDay = days[targetIdx];

    const newEx: Exercise = {
      name: ex.name,
      sets: ex.sets,
      reps: ex.reps,
      rest_seconds: ex.rest,
      notes: ex.notes,
    };

    const updatedDays = [...days];
    updatedDays[targetIdx] = {
      ...targetDay,
      exercises: [...(targetDay.exercises || []), newEx],
    };

    setDays(updatedDays);
    toast.success(`Added ${ex.name} to ${targetDay.day}`);
  };

  // Inline update an exercise
  const handleUpdateExercise = (
    dayIdx: number,
    exIdx: number,
    field: keyof Exercise,
    val: any
  ) => {
    const updated = [...days];
    const exList = [...updated[dayIdx].exercises];
    exList[exIdx] = {
      ...exList[exIdx],
      [field]:
        field === 'sets' || field === 'rest_seconds' ? parseInt(val) || 0 : val,
    };
    updated[dayIdx].exercises = exList;
    setDays(updated);
  };

  // Remove an exercise from active day
  const handleRemoveExercise = (dayIdx: number, exIdx: number) => {
    const updated = [...days];
    updated[dayIdx].exercises = updated[dayIdx].exercises.filter((_, i) => i !== exIdx);
    setDays(updated);
  };

  // Add an empty exercise row to active day
  const handleAddEmptyExercise = (dayIdx: number) => {
    const updated = [...days];
    if (!updated[dayIdx]) return;
    const exList = [...(updated[dayIdx].exercises || [])];
    exList.push({
      name: '',
      sets: 3,
      reps: '10-12',
      rest_seconds: 60,
      notes: '',
    });
    updated[dayIdx].exercises = exList;
    setDays(updated);
  };

  // Add a new workout day
  const handleAddDayCard = (presetName?: string) => {
    const defaultName = presetName || `Day ${days.length + 1}: Training Split`;
    const newDay: ExerciseDay = {
      day: defaultName,
      exercises: [],
    };
    setDays([...days, newDay]);
    setActiveDayIndex(days.length);
  };

  // Remove a workout day
  const handleRemoveDayCard = (dayIdx: number) => {
    if (days.length <= 1) {
      toast.error('At least one training day is required in the split');
      return;
    }
    const filtered = days.filter((_, i) => i !== dayIdx);
    setDays(filtered);
    if (activeDayIndex >= filtered.length) {
      setActiveDayIndex(Math.max(0, filtered.length - 1));
    }
  };

  // Move training day up or down
  const handleMoveDay = (idx: number, direction: 'up' | 'down') => {
    const targetIdx = direction === 'up' ? idx - 1 : idx + 1;
    if (targetIdx < 0 || targetIdx >= days.length) return;
    const updated = [...days];
    const temp = updated[idx];
    updated[idx] = updated[targetIdx];
    updated[targetIdx] = temp;
    setDays(updated);
    setActiveDayIndex(targetIdx);
  };

  // Duplicate a workout day
  const handleDuplicateDay = (dayIdx: number) => {
    const source = days[dayIdx];
    if (!source) return;
    const duplicate: ExerciseDay = {
      day: `${source.day} (Copy)`,
      exercises: JSON.parse(JSON.stringify(source.exercises || [])),
    };
    setDays([...days, duplicate]);
    setActiveDayIndex(days.length);
    toast.success(`Duplicated "${source.day}"`);
  };

  // Clear all exercises in a day
  const handleClearDay = (dayIdx: number) => {
    const updated = [...days];
    if (!updated[dayIdx]) return;
    updated[dayIdx] = {
      ...updated[dayIdx],
      exercises: [],
    };
    setDays(updated);
    toast.info('Cleared all exercises for this day');
  };

  // Update day title
  const handleUpdateDayName = (dayIdx: number, val: string) => {
    const updated = [...days];
    updated[dayIdx] = {
      ...updated[dayIdx],
      day: val,
    };
    setDays(updated);
  };

  const handleSaveWorkout = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!name.trim()) {
      toast.error('Workout routine name is required');
      return;
    }

    if (days.length === 0 || days.every((d) => !d.exercises || d.exercises.length === 0)) {
      toast.error('Please add at least one training day with exercises');
      return;
    }

    try {
      setSaving(true);

      const payload = {
        gym_id: user?.gymId,
        name: name.trim(),
        description: description.trim() || null,
        is_template: isTemplate,
        days,
        created_by: user?.id,
      };

      if (workoutId) {
        const { error } = await supabase
          .from('exercise_charts')
          .update(payload)
          .eq('id', workoutId)
          .eq('gym_id', user?.gymId);

        if (error) throw error;
        toast.success('Workout plan updated successfully');
      } else {
        const { error } = await supabase.from('exercise_charts').insert(payload);

        if (error) throw error;
        toast.success('Workout plan created successfully');
      }

      setOpenModal(false);
      fetchExercises();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'An unknown error occurred';
      toast.error(msg);
    } finally {
      setSaving(false);
    }
  };

  const handleOpenAssignModal = (workout: any) => {
    if (!can('exercise.manage')) {
      toast.error('You do not have permission to assign workout routines');
      return;
    }
    setSelectedWorkout(workout);
    setSelectedMemberIds([]);
    setMemberSearch('');
    setOpenAssignModal(true);
  };

  const handleAssignWorkout = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedWorkout || selectedMemberIds.length === 0) return;

    try {
      setAssigning(true);
      let success = 0;
      let fail = 0;

      for (const memberId of selectedMemberIds) {
        const { error } = await supabase
          .from('members')
          .update({ exercise_chart_id: selectedWorkout.id })
          .eq('id', memberId)
          .eq('gym_id', user?.gymId);

        if (error) {
          fail++;
        } else {
          success++;
        }
      }

      if (fail === 0) {
        toast.success(`Assigned "${selectedWorkout.name}" to ${success} member${success > 1 ? 's' : ''}`);
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

  const handleDeleteWorkout = async (id: string, planName: string) => {
    if (!confirm(`Are you sure you want to delete workout plan: ${planName}?`)) return;

    try {
      const { error } = await supabase
        .from('exercise_charts')
        .delete()
        .eq('id', id)
        .eq('gym_id', user?.gymId);

      if (error) throw error;
      toast.success('Workout plan deleted');
      setExercises((prev) => prev.filter((ex) => ex.id !== id));
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'An unknown error occurred';
      toast.error(msg);
    }
  };

  // Filtered exercises for listing
  const filteredWorkouts = useMemo(() => {
    if (!searchQuery.trim()) return exercises;
    const q = searchQuery.toLowerCase();
    return exercises.filter(
      (w) => w.name?.toLowerCase().includes(q) || w.description?.toLowerCase().includes(q)
    );
  }, [exercises, searchQuery]);

  // Filtered quick exercises
  const filteredQuickExercises = useMemo(() => {
    return QUICK_EXERCISES.filter((ex) => {
      const matchesMuscle = selectedMuscleFilter === 'All' || ex.category === selectedMuscleFilter;
      const matchesSearch =
        !quickExSearch.trim() || ex.name.toLowerCase().includes(quickExSearch.toLowerCase());
      return matchesMuscle && matchesSearch;
    });
  }, [selectedMuscleFilter, quickExSearch]);

  const safeActiveDayIndex = Math.min(Math.max(0, activeDayIndex), Math.max(0, days.length - 1));
  const activeDay = days[safeActiveDayIndex];
  const activeDayExCount = (activeDay?.exercises || []).length;
  const activeDaySets = (activeDay?.exercises || []).reduce(
    (s, ex) => s + (Number(ex.sets) || 0),
    0
  );

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/[0.08] pb-5">
        <div>
          <div className="flex items-center gap-2.5">
            <h2 className="text-2xl font-bold tracking-tight text-foreground apple-display">
              Workout & Split Studio
            </h2>
            <Badge variant="outline" className="apple-pill bg-primary/10 text-primary border-primary/20 text-[11px] font-mono">
              {exercises.length} Routines
            </Badge>
          </div>
          <p className="text-muted-foreground text-xs mt-1">
            Build periodized splits, volume targets, rest intervals, and assign customized workout plans to members.
          </p>
        </div>
        <div className="flex items-center gap-3">
          {can('exercise.manage') && (
            <Button
              onClick={handleOpenAddModal}
              size="pill"
              className="gap-2 font-medium cursor-pointer shadow-md shadow-primary/20 active:scale-[0.97] transition-all"
            >
              <Plus className="h-4 w-4" /> Create Workout Plan
            </Button>
          )}
        </div>
      </div>

      {/* Filter / Search Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 apple-glass-card p-3 rounded-2xl">
        <div className="relative w-full sm:w-80">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search workout plans by name or focus..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 bg-background/50 border-white/[0.08] text-xs h-9 text-foreground rounded-xl"
          />
        </div>
        <div className="flex items-center gap-2 text-xs text-muted-foreground font-mono">
          <Sparkles className="h-3.5 w-3.5 text-primary shrink-0" />
          <span>Tip: Load 1-click preset splits (PPL, Bro Split, Upper/Lower) in the builder</span>
        </div>
      </div>

      {/* Workout Plan Cards Grid */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-24 gap-3">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-muted-foreground text-xs font-mono">Loading workout splits...</p>
        </div>
      ) : filteredWorkouts.length === 0 ? (
        <div className="text-center py-20 text-muted-foreground border border-dashed border-white/[0.1] rounded-2xl apple-glass-card">
          <Dumbbell className="h-10 w-10 text-muted-foreground/60 mx-auto mb-3" />
          <h3 className="text-sm font-semibold text-foreground">No workout routines found</h3>
          <p className="text-xs text-muted-foreground mt-1 max-w-sm mx-auto">
            {searchQuery
              ? 'Try adjusting your search filter'
              : 'Create your first workout plan or select a preset split to get started.'}
          </p>
          {can('exercise.manage') && !searchQuery && (
            <Button
              onClick={handleOpenAddModal}
              size="pill-sm"
              className="mt-4 text-xs gap-1.5 cursor-pointer active:scale-[0.97]"
            >
              <Plus className="h-3.5 w-3.5" /> Create First Routine
            </Button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredWorkouts.map((workout) => {
            const planDays = Array.isArray(workout.days) ? workout.days : [];
            const totalExercises = planDays.reduce((acc: number, d: any) => {
              return acc + (Array.isArray(d.exercises) ? d.exercises.length : 0);
            }, 0);
            const totalSets = planDays.reduce((acc: number, d: any) => {
              return (
                acc +
                (Array.isArray(d.exercises)
                  ? d.exercises.reduce((s: number, ex: any) => s + (Number(ex.sets) || 0), 0)
                  : 0)
              );
            }, 0);

            return (
              <Card
                key={workout.id}
                className="apple-glass-card rounded-2xl flex flex-col justify-between overflow-hidden transition-[transform,border-color] duration-150 ease-out hover:border-white/[0.18]"
              >
                <CardHeader className="pb-3">
                  <div className="flex justify-between items-start gap-2">
                    <CardTitle className="text-sm font-semibold text-foreground leading-snug line-clamp-1 apple-headline">
                      {workout.name}
                    </CardTitle>
                    <Badge className="bg-primary/10 text-primary border-primary/20 text-[10px] font-mono shrink-0 rounded-full px-2">
                      {planDays.length} Days
                    </Badge>
                  </div>
                  <p className="text-muted-foreground text-xs mt-1.5 line-clamp-2 leading-relaxed">
                    {workout.description || 'Structured exercise periodization routine.'}
                  </p>

                  {/* Volume Pills */}
                  <div className="flex items-center gap-2 pt-2 text-[11px] font-mono">
                    <span className="flex items-center gap-1 text-primary font-medium bg-primary/10 px-2 py-0.5 rounded-full border border-primary/20">
                      <Activity className="h-3 w-3" /> {totalExercises} movements
                    </span>
                    <span className="flex items-center gap-1 text-emerald-400 font-medium bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
                      <Zap className="h-3 w-3" /> {totalSets} sets
                    </span>
                  </div>
                </CardHeader>

                <CardContent className="flex-1 border-t border-white/[0.06] pt-3 text-xs">
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-[10px] text-muted-foreground font-mono font-semibold uppercase tracking-wider">
                      Split Schedule ({planDays.length} Days)
                    </span>
                  </div>
                  <div className="space-y-1.5 max-h-[140px] overflow-y-auto pr-1 scrollbar-none">
                    {planDays.map((d: any, idx: number) => {
                      const exCount = Array.isArray(d.exercises) ? d.exercises.length : 0;
                      return (
                        <div
                          key={idx}
                          className="flex justify-between items-center bg-card/40 px-2.5 py-1.5 border border-white/[0.06] rounded-xl text-xs"
                        >
                          <div className="flex items-center gap-2 min-w-0">
                            <span className="font-semibold text-foreground truncate">{d.day}</span>
                          </div>
                          <span className="text-muted-foreground text-[10px] font-mono shrink-0">
                            {exCount} ex
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </CardContent>

                <CardFooter className="border-t border-white/[0.06] pt-3 flex gap-2 justify-between bg-card/20">
                  {can('exercise.manage') ? (
                    <>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleOpenAssignModal(workout)}
                        className="text-primary hover:text-primary hover:bg-primary/10 text-xs px-2.5 h-8 gap-1.5 font-medium rounded-xl active:scale-[0.97]"
                      >
                        <Users className="h-3.5 w-3.5" /> Link Member
                      </Button>
                      <div className="flex items-center gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          title="Download / Print PDF"
                          onClick={() => window.open(`/api/exercise/${workout.id}/pdf`, '_blank')}
                          className="h-8 w-8 text-muted-foreground hover:text-foreground hover:bg-card rounded-lg active:scale-[0.97]"
                        >
                          <Download className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          title="Edit Routine"
                          onClick={() => handleOpenEditModal(workout)}
                          className="h-8 w-8 text-muted-foreground hover:text-foreground hover:bg-card rounded-lg active:scale-[0.97]"
                        >
                          <Eye className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          title="Delete Routine"
                          onClick={() => handleDeleteWorkout(workout.id, workout.name)}
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
      {/* Modern, Clean, Effortless Workout Routine Studio (Full-Screen)*/}
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
                  <Dumbbell className="h-4 w-4" />
                </div>
                <div className="flex items-baseline gap-2 truncate">
                  <h1 className="text-xs sm:text-sm font-bold text-foreground truncate">
                    {workoutId ? 'Edit Workout Plan' : 'Workout Routine Studio'}
                  </h1>
                  <span className="text-[10px] font-mono text-muted-foreground hidden md:inline">
                    v2.5
                  </span>
                </div>
              </div>
            </div>

            {/* Center / Right: Volume Pill, Presets & Save */}
            <div className="flex items-center gap-2 shrink-0">
              {/* Solid Volume Pill - whitespace-nowrap prevents line wrapping */}
              <div className="flex items-center gap-2 px-2.5 sm:px-3.5 py-1 rounded-full bg-muted/60 border border-border/80 text-xs font-mono whitespace-nowrap">
                <span className="flex items-center gap-1 font-bold text-foreground">
                  <Calendar className="size-3.5 text-primary shrink-0" />
                  <span>{workoutSummary.totalDays}</span>
                  <span className="text-[10px] text-muted-foreground font-normal">days</span>
                </span>
                <span className="text-muted-foreground/40">•</span>
                <span className="flex items-center gap-1 font-bold text-foreground">
                  <Activity className="size-3.5 text-amber-500 shrink-0" />
                  <span>{workoutSummary.totalExercises}</span>
                  <span className="text-[10px] text-muted-foreground font-normal">moves</span>
                </span>
                <span className="text-muted-foreground/40">•</span>
                <span className="flex items-center gap-1 font-bold text-foreground">
                  <Zap className="size-3.5 text-emerald-500 shrink-0" />
                  <span>{workoutSummary.totalSets}</span>
                  <span className="text-[10px] text-muted-foreground font-normal">sets</span>
                </span>
              </div>

              {/* Presets Dropdown */}
              {!workoutId && (
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
                      Workout Split Blueprints
                    </DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    {PRESET_WORKOUT_TEMPLATES.map((tmpl) => (
                      <DropdownMenuItem
                        key={tmpl.id}
                        onClick={() => handleApplyTemplate(tmpl)}
                        className="flex flex-col items-start gap-1 p-2.5 rounded-xl cursor-pointer"
                      >
                        <div className="flex items-center justify-between w-full">
                          <span className="font-semibold text-xs text-foreground">{tmpl.name}</span>
                          <Badge variant="outline" className="text-[10px] font-mono py-0 px-1.5">
                            {tmpl.splitBadge}
                          </Badge>
                        </div>
                        <p className="text-[11px] text-muted-foreground line-clamp-1">{tmpl.description}</p>
                        <div className="text-[10px] text-muted-foreground/70 font-mono">
                          {tmpl.days.length} Days ({tmpl.days.map((d) => d.day.split(':')[0]).join(', ')})
                        </div>
                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuContent>
                </DropdownMenu>
              )}

              {/* Top Save Button */}
              <Button
                type="button"
                size="sm"
                onClick={() => handleSaveWorkout()}
                disabled={saving}
                className="h-8 px-3.5 sm:px-4 text-xs font-semibold rounded-full gap-1.5 shadow-sm active:scale-95"
              >
                {saving ? <Loader2 className="size-3.5 animate-spin" /> : <Save className="size-3.5" />}
                <span className="hidden xs:inline">{workoutId ? 'Update' : 'Save'}</span>
              </Button>
            </div>
          </header>

          {/* 2. Routine Metadata Strip (Compact 3-column bar) */}
          <div className="border-b border-border/60 bg-card/40 px-3 sm:px-6 py-2.5 shrink-0">
            <div className="max-w-6xl mx-auto grid grid-cols-1 sm:grid-cols-3 gap-2 sm:gap-4">
              <div className="space-y-1">
                <Label htmlFor="workoutName" className="text-[10px] font-mono font-semibold text-muted-foreground uppercase tracking-wider">
                  Routine Name *
                </Label>
                <Input
                  id="workoutName"
                  placeholder="e.g. 5-Day Hypertrophy PPL Split"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="h-8 text-xs bg-background/60 rounded-xl"
                />
              </div>

              <div className="space-y-1">
                <Label className="text-[10px] font-mono font-semibold text-muted-foreground uppercase tracking-wider">
                  Routine Type / Visibility
                </Label>
                <div className="flex items-center h-8 px-2.5 rounded-xl bg-background/60 border border-border/80 text-xs font-mono text-muted-foreground">
                  <span className="text-primary font-medium">Template Blueprint</span>
                </div>
              </div>

              <div className="space-y-1">
                <Label htmlFor="desc" className="text-[10px] font-mono font-semibold text-muted-foreground uppercase tracking-wider">
                  Coaching Directives & Form Cues
                </Label>
                <Input
                  id="desc"
                  placeholder="e.g. 2 RIR on compound lifts. 3s eccentric cadence."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="h-8 text-xs bg-background/60 rounded-xl"
                />
              </div>
            </div>
          </div>

          {/* 3. Horizontal Training Days Navigation Rail */}
          <div className="border-b border-border/60 bg-muted/20 px-3 sm:px-6 py-2 shrink-0">
            <div className="max-w-6xl mx-auto flex items-center justify-between gap-3">
              <div className="flex items-center gap-2 overflow-x-auto scrollbar-none py-0.5 flex-1">
                {days.map((d, idx) => {
                  const isSelected = safeActiveDayIndex === idx;
                  const exCount = (d.exercises || []).length;
                  const setsCount = (d.exercises || []).reduce(
                    (s, ex) => s + (Number(ex.sets) || 0),
                    0
                  );
                  return (
                    <div
                      key={idx}
                      onClick={() => setActiveDayIndex(idx)}
                      className={`group shrink-0 flex items-center gap-2 px-3 py-1.5 rounded-full text-xs cursor-pointer select-none transition-all duration-150 ${
                        isSelected
                          ? 'bg-primary text-primary-foreground font-semibold shadow-sm'
                          : 'bg-card/70 hover:bg-card border border-border text-foreground'
                      }`}
                    >
                      <span className="truncate max-w-[130px]">{d.day || `Day ${idx + 1}`}</span>
                      <span className={`text-[10px] font-mono px-1.5 py-0.2 rounded-full whitespace-nowrap ${
                        isSelected ? 'bg-black/20 text-white' : 'bg-muted text-muted-foreground'
                      }`}>
                        {exCount} ex • {setsCount} sets
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
                            onClick={() => handleMoveDay(idx, 'up')}
                            className="gap-2 cursor-pointer"
                          >
                            <ArrowUp className="size-3.5" /> Move Left
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            disabled={idx === days.length - 1}
                            onClick={() => handleMoveDay(idx, 'down')}
                            className="gap-2 cursor-pointer"
                          >
                            <ArrowDown className="size-3.5" /> Move Right
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => handleDuplicateDay(idx)}
                            className="gap-2 cursor-pointer"
                          >
                            <Copy className="size-3.5" /> Duplicate
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            disabled={days.length <= 1}
                            onClick={() => handleRemoveDayCard(idx)}
                            className="gap-2 cursor-pointer text-destructive focus:text-destructive"
                          >
                            <Trash2 className="size-3.5" /> Delete Day
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  );
                })}

                {/* Add Day Trigger */}
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="h-7 px-3 rounded-full text-xs font-medium border-dashed border-border hover:border-primary gap-1 shrink-0 cursor-pointer active:scale-95"
                    >
                      <Plus className="size-3.5" /> Add Day
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="start" className="w-56 p-1 text-xs rounded-xl z-50">
                    {[
                      'Monday: Push (Chest & Delts)',
                      'Tuesday: Pull (Back & Biceps)',
                      'Wednesday: Legs & Calves',
                      'Thursday: Upper Hypertrophy',
                      'Friday: Lower Hypertrophy',
                      'Saturday: Core & Conditioning',
                      'Sunday: Active Recovery',
                    ].map((dayPreset) => (
                      <DropdownMenuItem
                        key={dayPreset}
                        onClick={() => handleAddDayCard(dayPreset)}
                        className="cursor-pointer py-1.5"
                      >
                        + {dayPreset}
                      </DropdownMenuItem>
                    ))}
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      onClick={() => handleAddDayCard()}
                      className="cursor-pointer py-1.5 font-semibold text-primary"
                    >
                      + Custom Training Day
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>
          </div>

          {/* 4. Active Day Canvas (Scrollable Main Workspace) */}
          <div className="flex-1 overflow-y-auto bg-background/50">
            <div className="max-w-6xl mx-auto p-3 sm:p-6 space-y-4">
              {activeDay ? (
                <>
                  {/* Day Header & Fast Actions */}
                  <div className="p-3 sm:p-4 rounded-2xl border border-border/80 bg-card/60 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
                      <Input
                        value={activeDay.day}
                        onChange={(e) => handleUpdateDayName(safeActiveDayIndex, e.target.value)}
                        placeholder="Day Name (e.g. Monday: Push)"
                        className="h-8 text-sm font-semibold w-48 sm:w-64 bg-background/60 rounded-xl"
                      />
                      <div className="text-xs font-mono bg-muted/60 px-2.5 py-1 rounded-full text-foreground whitespace-nowrap">
                        <span className="font-bold">{activeDayExCount}</span> movements •{' '}
                        <span className="font-bold text-emerald-500">{activeDaySets}</span> working sets
                      </div>
                    </div>

                    <div className="flex items-center gap-2 flex-wrap">
                      <Button
                        type="button"
                        size="sm"
                        onClick={() => handleAddEmptyExercise(safeActiveDayIndex)}
                        className="h-8 px-3 text-xs rounded-xl gap-1.5 font-medium cursor-pointer active:scale-95"
                      >
                        <Plus className="size-3.5" /> Add Movement
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => setShowQuickExDrawer(!showQuickExDrawer)}
                        className={`h-8 px-3 text-xs rounded-xl font-medium gap-1.5 cursor-pointer active:scale-95 ${
                          showQuickExDrawer
                            ? 'bg-primary/15 text-primary border-primary/30'
                            : 'bg-card/70 hover:bg-card text-foreground border-border'
                        }`}
                      >
                        <Sparkles className="size-3.5 text-primary" />
                        <span>Movement Library</span>
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => handleClearDay(safeActiveDayIndex)}
                        className="h-8 px-2 text-xs text-muted-foreground hover:text-foreground rounded-xl active:scale-95"
                        title="Clear exercises for this day"
                      >
                        <RotateCcw className="size-3 mr-1" /> Clear
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => handleRemoveDayCard(safeActiveDayIndex)}
                        disabled={days.length <= 1}
                        className="h-8 px-2 text-xs text-muted-foreground hover:text-destructive rounded-xl active:scale-95"
                        title="Delete this day"
                      >
                        <Trash2 className="size-3.5 mr-1" /> Delete
                      </Button>
                    </div>
                  </div>

                  {/* Collapsible Movement Library Drawer */}
                  {showQuickExDrawer && (
                    <div className="p-3.5 sm:p-4 rounded-2xl border border-border/80 bg-card/80 space-y-3 shadow-md">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                        <div className="flex items-center gap-2">
                          <Sparkles className="size-4 text-primary" />
                          <span className="text-xs sm:text-sm font-semibold text-foreground">
                            1-Click Movement Library
                          </span>
                          <span className="text-[10px] text-muted-foreground font-mono hidden sm:inline">
                            (Appends into {activeDay.day})
                          </span>
                        </div>

                        {/* Muscle group filter pills */}
                        <div className="flex items-center gap-1 overflow-x-auto pb-0.5">
                          {['All', 'Chest', 'Back', 'Legs', 'Shoulders', 'Arms', 'Core'].map((grp) => (
                            <button
                              key={grp}
                              type="button"
                              onClick={() => setSelectedMuscleFilter(grp)}
                              className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-colors cursor-pointer active:scale-95 whitespace-nowrap ${
                                selectedMuscleFilter === grp
                                  ? 'bg-primary text-primary-foreground font-semibold shadow-xs'
                                  : 'bg-muted/60 text-muted-foreground hover:bg-muted hover:text-foreground'
                              }`}
                            >
                              {grp}
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Search Bar */}
                      <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground" />
                        <Input
                          placeholder="Search movements (e.g. bench press, squat, deadlift, curl, lateral raise)..."
                          value={quickExSearch}
                          onChange={(e) => setQuickExSearch(e.target.value)}
                          className="pl-9 h-8 text-xs bg-background/60 rounded-xl"
                        />
                      </div>

                      {/* Responsive Grid of Movement Chips */}
                      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2 max-h-48 overflow-y-auto pr-1">
                        {filteredQuickExercises.map((ex, idx) => (
                          <button
                            key={idx}
                            type="button"
                            onClick={() => handleAddQuickExercise(ex)}
                            className="flex items-center justify-between p-2 rounded-xl text-left bg-background/60 border border-border/70 hover:border-primary/50 hover:bg-primary/[0.06] transition-all cursor-pointer active:scale-95 group"
                          >
                            <div className="min-w-0 pr-1">
                              <div className="text-xs font-semibold text-foreground truncate group-hover:text-primary">
                                {ex.name}
                              </div>
                              <div className="text-[10px] text-muted-foreground font-mono truncate">
                                {ex.category} • {ex.sets}x{ex.reps}
                              </div>
                            </div>
                            <span className="text-[10px] text-primary font-mono shrink-0 font-semibold">
                              + Add
                            </span>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Movements Display: Desktop Table + Mobile Cards */}
                  {/* DESKTOP TABLE VIEW */}
                  <div className="hidden sm:block rounded-2xl overflow-hidden border border-border/80 bg-card/60">
                    <div className="flex items-center gap-3 px-4 py-2.5 border-b border-border/70 text-[10px] uppercase font-mono font-semibold text-muted-foreground tracking-wider bg-muted/30">
                      <div className="flex-1">Movement / Exercise</div>
                      <div className="w-20">Sets</div>
                      <div className="w-24">Reps</div>
                      <div className="w-24">Rest (sec)</div>
                      <div className="w-48">Form / Coaching Cue</div>
                      <div className="w-10 text-center">Action</div>
                    </div>

                    <div className="divide-y divide-border/40">
                      {(activeDay.exercises || []).length === 0 ? (
                        <div className="text-center py-10 px-4 space-y-2">
                          <Dumbbell className="size-6 mx-auto text-muted-foreground/50" />
                          <p className="text-xs font-semibold text-foreground">
                            No movements scheduled for {activeDay.day}
                          </p>
                          <p className="text-xs text-muted-foreground max-w-sm mx-auto">
                            Add a custom movement row below or open the Movement Library to append popular exercises with 1 click.
                          </p>
                          <div className="pt-2 flex items-center justify-center gap-2">
                            <Button
                              type="button"
                              size="sm"
                              onClick={() => handleAddEmptyExercise(safeActiveDayIndex)}
                              className="h-8 text-xs rounded-xl gap-1.5 cursor-pointer active:scale-95"
                            >
                              <Plus className="size-3.5" /> Add Movement Row
                            </Button>
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() => setShowQuickExDrawer(true)}
                              className="h-8 text-xs rounded-xl gap-1.5 cursor-pointer active:scale-95"
                            >
                              <Sparkles className="size-3.5 text-primary" /> Browse Library
                            </Button>
                          </div>
                        </div>
                      ) : (
                        activeDay.exercises.map((ex, exIdx) => (
                          <div
                            key={exIdx}
                            className="flex items-center gap-3 px-4 py-2 hover:bg-muted/30 transition-colors"
                          >
                            <div className="flex-1">
                              <Input
                                value={ex.name}
                                onChange={(e) =>
                                  handleUpdateExercise(
                                    safeActiveDayIndex,
                                    exIdx,
                                    'name',
                                    e.target.value
                                  )
                                }
                                placeholder="e.g. Barbell Flat Bench Press"
                                className="h-8 text-xs bg-background/60 rounded-xl"
                              />
                            </div>
                            <div className="w-20 relative">
                              <Input
                                type="number"
                                value={ex.sets || ''}
                                onChange={(e) =>
                                  handleUpdateExercise(
                                    safeActiveDayIndex,
                                    exIdx,
                                    'sets',
                                    e.target.value
                                  )
                                }
                                placeholder="3"
                                className="h-8 text-xs pr-7 font-mono bg-background/60 rounded-xl"
                              />
                              <span className="absolute right-2 top-2 text-[9px] text-muted-foreground font-mono pointer-events-none">
                                sets
                              </span>
                            </div>
                            <div className="w-24 relative">
                              <Input
                                value={ex.reps}
                                onChange={(e) =>
                                  handleUpdateExercise(
                                    safeActiveDayIndex,
                                    exIdx,
                                    'reps',
                                    e.target.value
                                  )
                                }
                                placeholder="10-12"
                                className="h-8 text-xs pr-8 font-mono bg-background/60 rounded-xl"
                              />
                              <span className="absolute right-2 top-2 text-[9px] text-muted-foreground font-mono pointer-events-none">
                                reps
                              </span>
                            </div>
                            <div className="w-24 relative">
                              <Input
                                type="number"
                                value={ex.rest_seconds || ''}
                                onChange={(e) =>
                                  handleUpdateExercise(
                                    safeActiveDayIndex,
                                    exIdx,
                                    'rest_seconds',
                                    e.target.value
                                  )
                                }
                                placeholder="60"
                                className="h-8 text-xs pr-7 font-mono bg-background/60 rounded-xl"
                              />
                              <span className="absolute right-2 top-2 text-[9px] text-muted-foreground font-mono pointer-events-none">
                                sec
                              </span>
                            </div>
                            <div className="w-48">
                              <Input
                                value={ex.notes || ''}
                                onChange={(e) =>
                                  handleUpdateExercise(
                                    safeActiveDayIndex,
                                    exIdx,
                                    'notes',
                                    e.target.value
                                  )
                                }
                                placeholder="e.g. Pause at bottom, chest stretch"
                                className="h-8 text-xs bg-background/60 rounded-xl"
                              />
                            </div>
                            <div className="w-10 text-center">
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                onClick={() => handleRemoveExercise(safeActiveDayIndex, exIdx)}
                                className="size-8 text-muted-foreground hover:text-destructive rounded-lg cursor-pointer active:scale-95"
                              >
                                <Trash2 className="size-3.5" />
                              </Button>
                            </div>
                          </div>
                        ))
                      )}
                    </div>

                    {/* Session volume subtotal row */}
                    {(activeDay.exercises || []).length > 0 && (
                      <div className="p-3 border-t border-border/70 bg-muted/20 flex items-center justify-between">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => handleAddEmptyExercise(safeActiveDayIndex)}
                          className="h-7 text-xs border-dashed border-border hover:border-primary bg-background/40 gap-1.5 rounded-xl cursor-pointer active:scale-95"
                        >
                          <Plus className="size-3" />
                          <span>Add Movement Row</span>
                        </Button>

                        <div className="text-[11px] font-mono text-muted-foreground">
                          Session Total:{' '}
                          <span className="text-foreground font-semibold">{activeDayExCount} movements</span> •{' '}
                          <span className="text-emerald-500 font-semibold">{activeDaySets} working sets</span>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* MOBILE CARDS VIEW (Clean, No-cramp cards on phones) */}
                  <div className="block sm:hidden space-y-2.5">
                    {(activeDay.exercises || []).length === 0 ? (
                      <div className="text-center py-8 px-4 rounded-2xl border border-border/80 bg-card/60 space-y-2">
                        <Dumbbell className="size-6 mx-auto text-muted-foreground/50" />
                        <p className="text-xs font-semibold text-foreground">
                          No movements scheduled for {activeDay.day}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          Add a custom movement row or pick from the Movement Library.
                        </p>
                        <div className="pt-2 flex flex-col gap-2">
                          <Button
                            type="button"
                            size="sm"
                            onClick={() => handleAddEmptyExercise(safeActiveDayIndex)}
                            className="h-8 text-xs rounded-xl gap-1.5 w-full cursor-pointer active:scale-95"
                          >
                            <Plus className="size-3.5" /> Add Movement Row
                          </Button>
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => setShowQuickExDrawer(true)}
                            className="h-8 text-xs rounded-xl gap-1.5 w-full cursor-pointer active:scale-95"
                          >
                            <Sparkles className="size-3.5 text-primary" /> Browse Movement Library
                          </Button>
                        </div>
                      </div>
                    ) : (
                      activeDay.exercises.map((ex, exIdx) => (
                        <div key={exIdx} className="p-3 rounded-2xl border border-border/80 bg-card/60 space-y-2.5 shadow-xs">
                          <div className="flex items-center justify-between gap-2">
                            <Input
                              value={ex.name}
                              onChange={(e) =>
                                handleUpdateExercise(
                                  safeActiveDayIndex,
                                  exIdx,
                                  'name',
                                  e.target.value
                                )
                              }
                              placeholder="Movement Name (e.g. Bench Press)"
                              className="h-8 text-xs font-semibold bg-background/60 rounded-xl"
                            />
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              onClick={() => handleRemoveExercise(safeActiveDayIndex, exIdx)}
                              className="size-8 text-muted-foreground hover:text-destructive shrink-0 rounded-lg cursor-pointer"
                            >
                              <Trash2 className="size-4" />
                            </Button>
                          </div>
                          <div className="grid grid-cols-3 gap-2">
                            <div className="relative">
                              <Input
                                type="number"
                                value={ex.sets || ''}
                                onChange={(e) =>
                                  handleUpdateExercise(
                                    safeActiveDayIndex,
                                    exIdx,
                                    'sets',
                                    e.target.value
                                  )
                                }
                                placeholder="Sets"
                                className="h-7.5 text-xs font-mono bg-background/60 rounded-lg text-center pr-6"
                              />
                              <span className="absolute right-1.5 top-1.5 text-[9px] text-muted-foreground font-mono">sets</span>
                            </div>
                            <div className="relative">
                              <Input
                                value={ex.reps}
                                onChange={(e) =>
                                  handleUpdateExercise(
                                    safeActiveDayIndex,
                                    exIdx,
                                    'reps',
                                    e.target.value
                                  )
                                }
                                placeholder="Reps"
                                className="h-7.5 text-xs font-mono bg-background/60 rounded-lg text-center pr-7"
                              />
                              <span className="absolute right-1.5 top-1.5 text-[9px] text-muted-foreground font-mono">reps</span>
                            </div>
                            <div className="relative">
                              <Input
                                type="number"
                                value={ex.rest_seconds || ''}
                                onChange={(e) =>
                                  handleUpdateExercise(
                                    safeActiveDayIndex,
                                    exIdx,
                                    'rest_seconds',
                                    e.target.value
                                  )
                                }
                                placeholder="Rest"
                                className="h-7.5 text-xs font-mono bg-background/60 rounded-lg text-center pr-6"
                              />
                              <span className="absolute right-1.5 top-1.5 text-[9px] text-muted-foreground font-mono">sec</span>
                            </div>
                          </div>
                          <Input
                            value={ex.notes || ''}
                            onChange={(e) =>
                              handleUpdateExercise(
                                safeActiveDayIndex,
                                exIdx,
                                'notes',
                                e.target.value
                              )
                            }
                            placeholder="Form cue (e.g. 2s pause at bottom)"
                            className="h-7.5 text-xs bg-background/60 rounded-lg"
                          />
                        </div>
                      ))
                    )}
                  </div>
                </>
              ) : (
                <div className="flex flex-col items-center justify-center py-16 text-center text-muted-foreground">
                  <Dumbbell className="size-8 mb-2 opacity-40" />
                  <p className="text-sm font-semibold text-foreground">No day selected</p>
                  <p className="text-xs mt-1">Select a training day tab above or click "+ Add Day" to begin.</p>
                </div>
              )}
            </div>
          </div>

          {/* 5. Sticky Bottom Action Bar */}
          <footer className="px-4 sm:px-6 py-3 border-t border-border/80 bg-card/90 backdrop-blur-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 shrink-0">
            <div className="flex items-center gap-3 text-xs text-muted-foreground flex-wrap font-mono">
              <span>
                Total Days: <strong className="text-foreground">{workoutSummary.totalDays}</strong>
              </span>
              <span>•</span>
              <span>
                Total Movements: <strong className="text-foreground">{workoutSummary.totalExercises}</strong>
              </span>
              <span>•</span>
              <span>
                Weekly Volume: <strong className="text-emerald-500">{workoutSummary.totalSets}</strong> working sets
              </span>
            </div>

            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setOpenModal(false)}
                className="text-xs rounded-full cursor-pointer active:scale-95"
              >
                Cancel
              </Button>
              <Button
                type="button"
                size="sm"
                onClick={() => handleSaveWorkout()}
                disabled={saving}
                className="text-xs font-semibold rounded-full gap-1.5 cursor-pointer shadow-sm active:scale-95"
              >
                {saving ? <Loader2 className="size-3.5 animate-spin" /> : <Save className="size-3.5" />}
                {workoutId ? 'Update Workout Plan' : 'Save Workout Plan'}
              </Button>
            </div>
          </footer>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* Assign Workout Modal Dialog                                   */}
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
              <Users className="h-4 w-4 text-primary" /> Assign Workout Plan to Members
            </DialogTitle>
            <DialogDescription className="text-muted-foreground text-xs">
              Assigning <span className="text-primary font-semibold">{selectedWorkout?.name}</span> to active gym members.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleAssignWorkout} className="space-y-4 pt-2">
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
