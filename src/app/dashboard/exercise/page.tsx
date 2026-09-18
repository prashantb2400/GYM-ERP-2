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

  const handleSaveWorkout = async (e: React.FormEvent) => {
    e.preventDefault();
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
      {/* Redesigned Apple-Grade Workout Routine Studio Dialog           */}
      {/* ------------------------------------------------------------- */}
      <Dialog open={openModal} onOpenChange={setOpenModal}>
        <DialogContent className="max-w-6xl w-[96vw] h-[92vh] flex flex-col p-0 overflow-hidden apple-glass-card rounded-2xl border border-white/[0.1] shadow-2xl bg-zinc-950/95">
          {/* Studio Header Bar */}
          <DialogHeader className="p-3.5 sm:p-4 border-b border-white/[0.08] shrink-0 bg-muted/20">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="h-9 w-9 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary shrink-0 apple-specular-top">
                  <Dumbbell className="h-4.5 w-4.5" />
                </div>
                <div>
                  <DialogTitle className="text-base font-semibold tracking-tight text-foreground flex items-center gap-2 apple-headline">
                    {workoutId ? 'Edit Workout Plan' : 'Workout Routine Studio'}
                    <span className="text-[11px] font-normal text-muted-foreground font-mono">
                      v2.5 Architecture
                    </span>
                  </DialogTitle>
                  <DialogDescription className="text-muted-foreground text-xs mt-0.5">
                    Structure training days, configure sets & rep ranges, and balance weekly movement volume.
                  </DialogDescription>
                </div>
              </div>

              <div className="flex items-center gap-2.5 flex-wrap">
                {/* 1-Click Splits Dropdown */}
                {!workoutId && (
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        type="button"
                        variant="outline"
                        size="pill-sm"
                        className="h-8 text-xs border-white/[0.1] bg-card/60 hover:bg-card text-foreground gap-1.5 cursor-pointer active:scale-[0.97]"
                      >
                        <Sparkles className="h-3.5 w-3.5 text-primary" />
                        <span>Preset Splits</span>
                        <ChevronDown className="h-3 w-3 opacity-60" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent
                      align="end"
                      className="w-80 apple-glass-card border-white/[0.1] text-foreground p-1.5 shadow-2xl z-50 rounded-2xl"
                    >
                      <DropdownMenuLabel className="text-[10px] font-mono font-semibold text-muted-foreground px-2 py-1 uppercase tracking-wider">
                        Workout Split Blueprints
                      </DropdownMenuLabel>
                      <DropdownMenuSeparator className="bg-white/[0.08]" />
                      {PRESET_WORKOUT_TEMPLATES.map((tmpl) => (
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

                {/* Volume Target Capsule */}
                <div className="flex items-center gap-2 bg-card/60 border border-white/[0.08] px-3 py-1 rounded-full text-xs font-mono shadow-xs">
                  <span className="text-muted-foreground text-[11px]">Volume:</span>
                  <span className="font-bold text-foreground tabular-nums">
                    {workoutSummary.totalDays}
                  </span>
                  <span className="text-muted-foreground text-[10px]">days</span>
                  <span className="text-muted-foreground/40">•</span>
                  <span className="font-bold text-foreground tabular-nums">
                    {workoutSummary.totalExercises}
                  </span>
                  <span className="text-muted-foreground text-[10px]">movements</span>
                  <span className="text-muted-foreground/40">•</span>
                  <span className="font-bold text-emerald-400 tabular-nums">
                    {workoutSummary.totalSets}
                  </span>
                  <span className="text-muted-foreground text-[10px]">sets</span>
                </div>
              </div>
            </div>
          </DialogHeader>

          {/* Master-Detail Studio Workspace */}
          <form
            onSubmit={handleSaveWorkout}
            className="flex-1 flex flex-col md:flex-row overflow-hidden"
          >
            {/* ----------------------------------------------------------- */}
            {/* LEFT COLUMN: Routine Metadata & Training Days Schedule Rail */}
            {/* ----------------------------------------------------------- */}
            <div className="w-full md:w-80 lg:w-88 border-r border-white/[0.08] bg-zinc-950/60 backdrop-blur-md flex flex-col shrink-0 overflow-y-auto p-4 space-y-4">
              {/* Routine Metadata Box */}
              <div className="apple-glass-card p-3.5 rounded-2xl space-y-3 bg-card/40 border border-white/[0.06]">
                <div className="space-y-1">
                  <Label
                    htmlFor="workoutName"
                    className="text-[10px] font-mono font-semibold text-muted-foreground uppercase tracking-wider"
                  >
                    Routine Name *
                  </Label>
                  <Input
                    id="workoutName"
                    placeholder="e.g. 5-Day Hypertrophy PPL Split"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="bg-background/60 border-white/[0.08] text-xs h-8 text-foreground placeholder:text-muted-foreground/60 rounded-xl focus-visible:border-primary"
                  />
                </div>

                <div className="space-y-1">
                  <Label className="text-[10px] font-mono font-semibold text-muted-foreground uppercase tracking-wider">
                    Routine Type / Visibility
                  </Label>
                  <div className="flex items-center h-8 px-2.5 rounded-xl bg-background/60 border border-white/[0.08] text-xs font-mono text-muted-foreground">
                    <span className="text-primary font-medium">Template Blueprint</span>
                  </div>
                </div>

                <div className="space-y-1">
                  <Label
                    htmlFor="desc"
                    className="text-[10px] font-mono font-semibold text-muted-foreground uppercase tracking-wider"
                  >
                    Coaching Directives & Form Cues
                  </Label>
                  <Input
                    id="desc"
                    placeholder="e.g. 2 RIR on compound lifts. 3s eccentric cadence."
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    className="bg-background/60 border-white/[0.08] text-xs h-8 text-foreground placeholder:text-muted-foreground/60 rounded-xl focus-visible:border-primary"
                  />
                </div>
              </div>

              {/* Training Days Schedule */}
              <div className="space-y-2 flex-1 flex flex-col">
                <div className="flex items-center justify-between gap-2 pb-1 border-b border-white/[0.08]">
                  <div className="flex items-center gap-1.5">
                    <Calendar className="h-3.5 w-3.5 text-primary" />
                    <span className="text-xs font-semibold text-foreground tracking-tight apple-subhead">
                      Training Days
                    </span>
                    <Badge
                      variant="outline"
                      className="text-[10px] font-mono py-0 px-1.5 border-white/[0.1] text-muted-foreground"
                    >
                      {days.length}
                    </Badge>
                  </div>

                  {/* Add Day Dropdown */}
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="h-6.5 text-[11px] px-2 rounded-full border-white/[0.1] bg-card/60 hover:bg-card text-foreground font-medium gap-1 cursor-pointer active:scale-[0.97]"
                      >
                        <Plus className="h-3 w-3" /> Add Day
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent
                      align="end"
                      className="apple-glass-card border-white/[0.1] text-foreground p-1 text-xs z-50 rounded-xl"
                    >
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
                          className="cursor-pointer hover:bg-white/[0.06] text-xs rounded-lg py-1.5"
                        >
                          + {dayPreset}
                        </DropdownMenuItem>
                      ))}
                      <DropdownMenuSeparator className="bg-white/[0.08]" />
                      <DropdownMenuItem
                        onClick={() => handleAddDayCard()}
                        className="cursor-pointer text-primary hover:bg-primary/10 font-semibold text-xs rounded-lg py-1.5"
                      >
                        + Custom Training Day
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>

                {/* Vertical Training Day Stream */}
                <div className="space-y-2 overflow-y-auto pr-1 flex-1">
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
                              {d.day || `Day ${idx + 1}`}
                            </span>
                          </div>

                          <span className="text-[10px] text-muted-foreground font-mono">
                            Day #{idx + 1}
                          </span>
                        </div>

                        <div className="flex items-center justify-between mt-2 pt-1.5 border-t border-white/[0.04] text-[10px] font-mono">
                          <span className="text-muted-foreground">
                            {exCount} movement{exCount !== 1 ? 's' : ''}
                          </span>
                          <span className="text-foreground font-semibold">
                            {setsCount} sets
                          </span>
                        </div>

                        {/* Reorder and Delete controls on hover */}
                        <div className="absolute right-2 top-2 hidden group-hover:flex items-center gap-0.5 bg-background/80 backdrop-blur-md rounded-lg p-0.5 border border-white/[0.08]">
                          <button
                            type="button"
                            disabled={idx === 0}
                            onClick={(e) => {
                              e.stopPropagation();
                              handleMoveDay(idx, 'up');
                            }}
                            className="p-1 text-muted-foreground hover:text-foreground disabled:opacity-30 cursor-pointer"
                            title="Move Up"
                          >
                            <ArrowUp className="h-3 w-3" />
                          </button>
                          <button
                            type="button"
                            disabled={idx === days.length - 1}
                            onClick={(e) => {
                              e.stopPropagation();
                              handleMoveDay(idx, 'down');
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
                              handleDuplicateDay(idx);
                            }}
                            className="p-1 text-muted-foreground hover:text-foreground cursor-pointer"
                            title="Duplicate Day"
                          >
                            <Copy className="h-3 w-3" />
                          </button>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleRemoveDayCard(idx);
                            }}
                            className="p-1 text-muted-foreground hover:text-destructive cursor-pointer"
                            title="Delete Day"
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
            {/* RIGHT COLUMN: Active Workout Day Studio & Exercise Table    */}
            {/* ----------------------------------------------------------- */}
            <div className="flex-1 flex flex-col overflow-hidden bg-zinc-900/10">
              {activeDay ? (
                <>
                  {/* Active Day Header Strip */}
                  <div className="p-3.5 sm:p-4 border-b border-white/[0.08] bg-card/20 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shrink-0">
                    <div className="flex items-center gap-3 flex-wrap flex-1">
                      <Input
                        value={activeDay.day}
                        onChange={(e) => handleUpdateDayName(safeActiveDayIndex, e.target.value)}
                        placeholder="Day Name (e.g. Monday: Push)"
                        className="h-8 text-sm font-semibold bg-background/50 border-white/[0.08] text-foreground max-w-sm rounded-xl focus-visible:border-primary"
                      />

                      <div className="text-xs font-mono bg-muted/40 border border-white/[0.08] px-3 py-1 rounded-full text-foreground shadow-xs">
                        <span className="font-bold">{activeDayExCount}</span>{' '}
                        <span className="text-muted-foreground text-[10px]">movements</span> •{' '}
                        <span className="font-bold text-emerald-400">{activeDaySets}</span>{' '}
                        <span className="text-muted-foreground text-[10px]">sets</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => setShowQuickExDrawer(!showQuickExDrawer)}
                        className={`h-7.5 px-2.5 text-xs rounded-xl font-medium gap-1.5 cursor-pointer active:scale-[0.97] ${
                          showQuickExDrawer
                            ? 'bg-primary/10 text-primary border border-primary/20'
                            : 'text-muted-foreground hover:text-foreground hover:bg-card/60 border border-white/[0.06]'
                        }`}
                      >
                        <Sparkles className="h-3.5 w-3.5" />
                        <span>Movement Library</span>
                      </Button>

                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => handleClearDay(safeActiveDayIndex)}
                        className="h-7.5 px-2 text-xs text-muted-foreground hover:text-foreground rounded-xl active:scale-[0.97]"
                        title="Clear all exercises"
                      >
                        <RotateCcw className="h-3 w-3 mr-1" /> Clear
                      </Button>

                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => handleRemoveDayCard(safeActiveDayIndex)}
                        className="h-7.5 px-2 text-xs text-muted-foreground hover:text-destructive rounded-xl active:scale-[0.97]"
                        title="Delete this day"
                      >
                        <Trash2 className="h-3.5 w-3.5 mr-1" /> Delete
                      </Button>
                    </div>
                  </div>

                  {/* Exercises Table / Cards */}
                  <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4">
                    {/* Collapsible Movement Library Drawer */}
                    {showQuickExDrawer && (
                      <div className="apple-glass-card p-3.5 rounded-2xl border border-white/[0.08] bg-card/60 space-y-3">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                          <div className="flex items-center gap-2">
                            <Sparkles className="h-3.5 w-3.5 text-primary" />
                            <span className="text-xs font-semibold text-foreground">
                              Exercise Movement Library
                            </span>
                            <span className="text-[10px] text-muted-foreground font-mono">
                              (Click to append into {activeDay.day})
                            </span>
                          </div>

                          {/* Muscle Group Filter Pills */}
                          <div className="flex items-center gap-1 overflow-x-auto">
                            {['All', 'Chest', 'Back', 'Legs', 'Shoulders', 'Arms', 'Core'].map((grp) => (
                              <button
                                key={grp}
                                type="button"
                                onClick={() => setSelectedMuscleFilter(grp)}
                                className={`px-2 py-0.5 rounded-lg text-[10px] font-medium transition-colors cursor-pointer active:scale-95 ${
                                  selectedMuscleFilter === grp
                                    ? 'bg-primary text-primary-foreground font-semibold shadow-xs'
                                    : 'bg-card/50 text-muted-foreground hover:bg-card hover:text-foreground border border-white/[0.06]'
                                }`}
                              >
                                {grp}
                              </button>
                            ))}
                          </div>
                        </div>

                        {/* Search in movement library */}
                        <div className="relative">
                          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                          <Input
                            placeholder="Filter movements (e.g. bench, squat, deadlift, curl)..."
                            value={quickExSearch}
                            onChange={(e) => setQuickExSearch(e.target.value)}
                            className="pl-8 h-7.5 text-xs bg-background/50 border-white/[0.08] text-foreground rounded-xl"
                          />
                        </div>

                        {/* Movement Chip Grid */}
                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2 max-h-44 overflow-y-auto pr-1">
                          {filteredQuickExercises.map((ex, idx) => (
                            <button
                              key={idx}
                              type="button"
                              onClick={() => handleAddQuickExercise(ex)}
                              className="flex items-center justify-between p-2 rounded-xl text-left bg-card/40 border border-white/[0.06] hover:border-primary/40 hover:bg-primary/[0.05] transition-all cursor-pointer active:scale-95 group"
                            >
                              <div className="min-w-0 pr-1">
                                <div className="text-[11px] font-semibold text-foreground truncate group-hover:text-primary">
                                  {ex.name}
                                </div>
                                <div className="text-[9px] text-muted-foreground font-mono truncate">
                                  {ex.category} • {ex.sets} sets x {ex.reps}
                                </div>
                              </div>
                              <span className="text-[9px] text-primary font-mono shrink-0 font-semibold">
                                + Add
                              </span>
                            </button>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Clean Exercises Table */}
                    <div className="apple-glass-card rounded-2xl overflow-hidden border border-white/[0.08] bg-card/30">
                      {/* Table Column Headers */}
                      <div className="flex items-center gap-3 px-3.5 py-2 border-b border-white/[0.06] text-[10px] uppercase font-mono font-semibold text-muted-foreground tracking-wider bg-card/20">
                        <div className="flex-1">Movement / Exercise</div>
                        <div className="w-20">Sets</div>
                        <div className="w-24">Reps</div>
                        <div className="w-24">Rest (sec)</div>
                        <div className="w-48">Form / Coaching Cue</div>
                        <div className="w-9 text-center">Action</div>
                      </div>

                      {/* Items List Rows */}
                      <div className="divide-y divide-white/[0.04]">
                        {(activeDay.exercises || []).length === 0 ? (
                          <div className="text-center py-10 px-4 space-y-2">
                            <Dumbbell className="h-6 w-6 mx-auto text-muted-foreground/50" />
                            <p className="text-xs font-semibold text-foreground">
                              No movements scheduled for {activeDay.day}
                            </p>
                            <p className="text-[11px] text-muted-foreground max-w-sm mx-auto">
                              Add a custom exercise row below or browse the Movement Library to choose movements by muscle group.
                            </p>
                            <div className="pt-2 flex items-center justify-center gap-2">
                              <Button
                                type="button"
                                size="sm"
                                onClick={() => handleAddEmptyExercise(safeActiveDayIndex)}
                                className="h-7.5 text-xs rounded-xl gap-1.5 cursor-pointer active:scale-[0.97]"
                              >
                                <Plus className="h-3.5 w-3.5" /> Add Exercise Row
                              </Button>
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={() => setShowQuickExDrawer(true)}
                                className="h-7.5 text-xs rounded-xl gap-1.5 border-white/[0.1] bg-card/50 hover:bg-card cursor-pointer active:scale-[0.97]"
                              >
                                <Sparkles className="h-3.5 w-3.5 text-primary" /> Browse Library
                              </Button>
                            </div>
                          </div>
                        ) : (
                          activeDay.exercises.map((ex, exIdx) => (
                            <div
                              key={exIdx}
                              className="flex items-center gap-3 px-3.5 py-2 hover:bg-card/40 transition-colors"
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
                                  className="h-8 text-xs bg-background/50 border-white/[0.08] text-foreground rounded-xl placeholder:text-muted-foreground/60 focus-visible:border-primary"
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
                                  className="h-8 text-xs bg-background/50 border-white/[0.08] text-foreground font-mono font-medium rounded-xl pr-7 focus-visible:border-primary"
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
                                  className="h-8 text-xs bg-background/50 border-white/[0.08] text-foreground font-mono rounded-xl pr-8 focus-visible:border-primary"
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
                                  className="h-8 text-xs bg-background/50 border-white/[0.08] text-foreground font-mono rounded-xl pr-7 focus-visible:border-primary"
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
                                  className="h-8 text-xs bg-background/50 border-white/[0.08] text-foreground rounded-xl placeholder:text-muted-foreground/60 focus-visible:border-primary"
                                />
                              </div>

                              <div className="w-9 flex justify-center">
                                <button
                                  type="button"
                                  onClick={() => handleRemoveExercise(safeActiveDayIndex, exIdx)}
                                  className="h-8 w-8 flex items-center justify-center rounded-xl text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors cursor-pointer active:scale-95"
                                  title="Remove exercise"
                                >
                                  <Trash2 className="h-3.5 w-3.5" />
                                </button>
                              </div>
                            </div>
                          ))
                        )}
                      </div>

                      {/* Add Exercise Row Strip */}
                      {(activeDay.exercises || []).length > 0 && (
                        <div className="p-3 border-t border-white/[0.06] bg-card/10 flex items-center justify-between">
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => handleAddEmptyExercise(safeActiveDayIndex)}
                            className="h-7 text-xs border-dashed border-white/[0.12] bg-card/30 hover:bg-card/70 text-foreground gap-1.5 rounded-xl cursor-pointer active:scale-[0.97]"
                          >
                            <Plus className="h-3 w-3" />
                            <span>Add Exercise Row</span>
                          </Button>

                          <div className="text-[11px] font-mono text-muted-foreground">
                            Session Total:{' '}
                            <span className="text-foreground font-semibold">{activeDayExCount} movements</span> •{' '}
                            <span className="text-emerald-400 font-semibold">{activeDaySets} working sets</span>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </>
              ) : (
                <div className="flex-1 flex flex-col items-center justify-center p-6 text-center text-muted-foreground">
                  <Dumbbell className="h-8 w-8 mb-2 opacity-40" />
                  <p className="text-sm font-semibold text-foreground">No day selected</p>
                  <p className="text-xs mt-1">Select a day from the left split schedule or add a new day.</p>
                </div>
              )}
            </div>
          </form>

          {/* Sticky Studio Footer */}
          <DialogFooter className="p-3.5 sm:p-4 border-t border-white/[0.08] shrink-0 bg-muted/20 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3 text-xs text-muted-foreground flex-wrap font-mono">
              <span>
                Total Split Days: <strong className="text-foreground">{workoutSummary.totalDays}</strong>
              </span>
              <span>•</span>
              <span>
                Total Exercises: <strong className="text-foreground">{workoutSummary.totalExercises}</strong>
              </span>
              <span>•</span>
              <span>
                Weekly Volume: <strong className="text-emerald-400">{workoutSummary.totalSets}</strong> working sets
              </span>
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
                onClick={handleSaveWorkout}
                disabled={saving}
                className="text-xs font-semibold gap-1.5 cursor-pointer shadow-md shadow-primary/20 active:scale-[0.97]"
              >
                {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
                {workoutId ? 'Update Workout Plan' : 'Save Workout Plan'}
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>

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
