'use client';

import React, { useEffect, useState, useMemo } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { usePermission } from '@/hooks/usePermission';
import {
  Dumbbell,
  Plus,
  PlusCircle,
  Trash2,
  Save,
  Loader2,
  Users,
  Eye,
  Trash,
  Search,
  Sparkles,
  Download,
  Flame,
  Activity,
  Calendar,
  Clock,
  Zap,
  Copy,
  ChevronDown,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
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

  // Selected muscle group filter in quick chips
  const [selectedMuscleFilter, setSelectedMuscleFilter] = useState<string>('All');

  // Manual custom exercise adder inputs
  const [manualExName, setManualExName] = useState('');
  const [manualExSets, setManualExSets] = useState('');
  const [manualExReps, setManualExReps] = useState('');
  const [manualExRest, setManualExRest] = useState('');
  const [manualExNotes, setManualExNotes] = useState('');

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

  // Total exercises count across all days
  const workoutSummary = useMemo(() => {
    let totalExCount = 0;
    days.forEach(d => {
      if (Array.isArray(d.exercises)) {
        totalExCount += d.exercises.length;
      }
    });

    return {
      totalDays: days.length,
      totalExercises: totalExCount,
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
    resetManualInputs();
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
    resetManualInputs();
    setOpenModal(true);
  };

  const handleApplyTemplate = (template: WorkoutTemplate) => {
    setName(template.name);
    setDescription(template.description);
    setDays(JSON.parse(JSON.stringify(template.days)));
    setActiveDayIndex(0);
    toast.success(`Loaded workout split: "${template.name}"`);
  };

  const resetManualInputs = () => {
    setManualExName('');
    setManualExSets('');
    setManualExReps('');
    setManualExRest('');
    setManualExNotes('');
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

  // Add custom typed exercise
  const handleAddManualExercise = () => {
    if (!manualExName.trim()) {
      toast.error('Please enter exercise name');
      return;
    }

    if (days.length === 0) {
      toast.error('Please add a workout day first');
      return;
    }

    const targetIdx = activeDayIndex >= 0 && activeDayIndex < days.length ? activeDayIndex : 0;
    const targetDay = days[targetIdx];

    const newEx: Exercise = {
      name: manualExName.trim(),
      sets: parseInt(manualExSets) || 3,
      reps: manualExReps.trim() || '10-12',
      rest_seconds: parseInt(manualExRest) || 60,
      notes: manualExNotes.trim() || undefined,
    };

    const updatedDays = [...days];
    updatedDays[targetIdx] = {
      ...targetDay,
      exercises: [...(targetDay.exercises || []), newEx],
    };

    setDays(updatedDays);
    resetManualInputs();
    toast.success(`Added "${newEx.name}" to ${targetDay.day}`);
  };

  // Inline update an exercise property
  const handleUpdateExercise = (dayIdx: number, exIdx: number, field: keyof Exercise, val: any) => {
    const updated = [...days];
    const exercisesList = [...updated[dayIdx].exercises];
    exercisesList[exIdx] = {
      ...exercisesList[exIdx],
      [field]: field === 'sets' || field === 'rest_seconds' ? parseInt(val) || 0 : val,
    };
    updated[dayIdx].exercises = exercisesList;
    setDays(updated);
  };

  // Remove exercise
  const handleRemoveExercise = (dayIdx: number, exIdx: number) => {
    const updated = [...days];
    updated[dayIdx].exercises = updated[dayIdx].exercises.filter((_, i) => i !== exIdx);
    setDays(updated);
  };

  // Add an empty exercise row directly into the day
  const handleAddEmptyExercise = (dayIdx: number) => {
    const updated = [...days];
    if (!updated[dayIdx]) return;
    const exercisesList = [...(updated[dayIdx].exercises || [])];
    exercisesList.push({
      name: '',
      sets: 3,
      reps: '10-12',
      rest_seconds: 60,
      notes: '',
    });
    updated[dayIdx].exercises = exercisesList;
    setDays(updated);
  };

  // Add a new workout day
  const handleAddDayCard = (presetLabel?: string) => {
    const defaultLabel = presetLabel || `Day ${days.length + 1}: Training`;
    const newDay: ExerciseDay = {
      day: defaultLabel,
      exercises: [],
    };
    setDays([...days, newDay]);
    setActiveDayIndex(days.length);
  };

  // Remove a workout day
  const handleRemoveDayCard = (dayIdx: number) => {
    setDays(days.filter((_, i) => i !== dayIdx));
    if (activeDayIndex >= dayIdx && activeDayIndex > 0) {
      setActiveDayIndex(activeDayIndex - 1);
    }
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
      toast.error('Workout plan name is required');
      return;
    }

    if (days.length === 0 || days.every(d => !d.exercises || d.exercises.length === 0)) {
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
        const { error } = await supabase
          .from('exercise_charts')
          .insert(payload);

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
      toast.error('You do not have permission to assign workouts');
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

  const handleDeleteWorkout = async (id: string, workoutName: string) => {
    if (!confirm(`Are you sure you want to delete workout plan: ${workoutName}?`)) return;

    try {
      const { error } = await supabase
        .from('exercise_charts')
        .delete()
        .eq('id', id)
        .eq('gym_id', user?.gymId);

      if (error) throw error;
      toast.success('Workout plan deleted');
      setExercises(prev => prev.filter(w => w.id !== id));
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'An unknown error occurred';
      toast.error(msg);
    }
  };

  // Filtered exercises for listing
  const filteredWorkouts = useMemo(() => {
    if (!searchQuery.trim()) return exercises;
    const q = searchQuery.toLowerCase();
    return exercises.filter(w =>
      w.name?.toLowerCase().includes(q) ||
      w.description?.toLowerCase().includes(q)
    );
  }, [exercises, searchQuery]);

  // Filtered quick chips
  const filteredQuickChips = useMemo(() => {
    if (selectedMuscleFilter === 'All') return QUICK_EXERCISES;
    return QUICK_EXERCISES.filter(ex => ex.category === selectedMuscleFilter);
  }, [selectedMuscleFilter]);

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-zinc-800 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-2xl font-bold tracking-tight text-zinc-100">Workouts & Training Plans</h2>
            <Badge className="bg-purple-950/60 text-purple-400 border-purple-800/40 text-xs">
              {exercises.length} Active Routines
            </Badge>
          </div>
          <p className="text-zinc-500 text-xs mt-1">
            Design training schedules, use 1-click split templates, log sets/reps/rest, and link routines to member profiles.
          </p>
        </div>
        <div className="flex items-center gap-3">
          {can('exercise.manage') && (
            <Button
              onClick={handleOpenAddModal}
              className="bg-purple-600 hover:bg-purple-700 text-white gap-2 font-medium shadow-md shadow-purple-900/20"
            >
              <Plus className="h-4 w-4" /> Create Workout Plan
            </Button>
          )}
        </div>
      </div>

      {/* Filter / Search Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-zinc-900/40 border border-zinc-800 p-3 rounded-xl">
        <div className="relative w-full sm:w-80">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-500" />
          <Input
            placeholder="Search workout plans by title or goal..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 bg-zinc-950 border-zinc-800 text-xs h-9 text-zinc-200"
          />
        </div>
        <div className="flex items-center gap-2 text-xs text-zinc-400">
          <Sparkles className="h-3.5 w-3.5 text-purple-400" />
          <span>Tip: Use pre-built workout splits inside the builder for instant weekly routines</span>
        </div>
      </div>

      {/* Workout Plan Cards Grid */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-24 gap-3">
          <Loader2 className="h-8 w-8 animate-spin text-purple-500" />
          <p className="text-zinc-500 text-xs">Loading workout plans...</p>
        </div>
      ) : filteredWorkouts.length === 0 ? (
        <div className="text-center py-20 text-zinc-500 border border-dashed border-zinc-800 rounded-xl bg-zinc-900/20">
          <Dumbbell className="h-10 w-10 text-zinc-600 mx-auto mb-3" />
          <h3 className="text-sm font-semibold text-zinc-300">No workout plans found</h3>
          <p className="text-xs text-zinc-500 mt-1 max-w-sm mx-auto">
            {searchQuery ? 'Try adjusting your search query' : 'Create your first workout plan or select a 1-click split template to begin.'}
          </p>
          {can('exercise.manage') && !searchQuery && (
            <Button onClick={handleOpenAddModal} className="mt-4 bg-purple-600 hover:bg-purple-700 text-white text-xs gap-1.5">
              <Plus className="h-3.5 w-3.5" /> Create First Workout
            </Button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredWorkouts.map((workout) => {
            const planDays = Array.isArray(workout.days) ? workout.days : [];
            const totalExercisesInPlan = planDays.reduce((acc: number, d: any) => {
              return acc + (Array.isArray(d.exercises) ? d.exercises.length : 0);
            }, 0);

            return (
              <Card
                key={workout.id}
                className="border-zinc-800 bg-zinc-900/40 hover:border-zinc-700 transition-colors flex flex-col justify-between overflow-hidden shadow-sm"
              >
                <CardHeader className="pb-3">
                  <div className="flex justify-between items-start gap-2">
                    <CardTitle className="text-sm font-bold text-zinc-100 leading-snug line-clamp-1">
                      {workout.name}
                    </CardTitle>
                    <Badge className="bg-purple-950/60 text-purple-300 border border-purple-800/30 text-[10px] font-bold shrink-0">
                      {planDays.length} Days / Wk
                    </Badge>
                  </div>
                  <p className="text-zinc-500 text-xs mt-1.5 line-clamp-2 leading-relaxed">
                    {workout.description || 'Customized resistance and conditioning training schedule.'}
                  </p>

                  {/* Volume Pills */}
                  <div className="flex items-center gap-2 pt-2 text-[11px]">
                    <span className="flex items-center gap-1 text-cyan-400 font-medium bg-cyan-950/30 px-2 py-0.5 rounded border border-cyan-900/30">
                      <Calendar className="h-3 w-3" /> {planDays.length} Training Days
                    </span>
                    <span className="flex items-center gap-1 text-emerald-400 font-medium bg-emerald-950/30 px-2 py-0.5 rounded border border-emerald-900/30">
                      <Activity className="h-3 w-3" /> {totalExercisesInPlan} Exercises Total
                    </span>
                  </div>
                </CardHeader>

                <CardContent className="flex-1 border-t border-zinc-800/40 pt-3 text-xs">
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-[10px] text-zinc-500 font-semibold uppercase tracking-wider">
                      Routine Days
                    </span>
                  </div>
                  <div className="space-y-1.5 max-h-[140px] overflow-y-auto pr-1">
                    {planDays.map((d: any, idx: number) => {
                      const count = Array.isArray(d.exercises) ? d.exercises.length : 0;
                      return (
                        <div
                          key={idx}
                          className="flex justify-between items-center bg-zinc-950/40 px-2.5 py-1.5 border border-zinc-800/60 rounded text-xs"
                        >
                          <span className="font-semibold text-zinc-200 truncate pr-2">{d.day}</span>
                          <span className="text-purple-400 text-[10px] font-mono shrink-0 font-medium">
                            {count} ex
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </CardContent>

                <CardFooter className="border-t border-zinc-800/40 pt-3 flex gap-2 justify-between bg-zinc-900/20">
                  {can('exercise.manage') ? (
                    <>
                      <Button
                        variant="ghost"
                        onClick={() => handleOpenAssignModal(workout)}
                        className="text-purple-400 hover:text-purple-300 hover:bg-purple-950/20 text-xs px-2.5 h-8 gap-1.5 font-medium"
                      >
                        <Users className="h-3.5 w-3.5" /> Link Member
                      </Button>
                      <div className="flex items-center gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          title="Download / Print PDF"
                          onClick={() => window.open(`/api/exercise/${workout.id}/pdf`, '_blank')}
                          className="h-8 w-8 text-zinc-400 hover:text-purple-400 hover:bg-zinc-800"
                        >
                          <Download className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          title="Edit Workout Plan"
                          onClick={() => handleOpenEditModal(workout)}
                          className="h-8 w-8 text-zinc-400 hover:text-white hover:bg-zinc-800"
                        >
                          <Eye className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          title="Delete Plan"
                          onClick={() => handleDeleteWorkout(workout.id, workout.name)}
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
      {/* Modern, Clean & Uncluttered Workout Plan Builder Studio Modal */}
      {/* ------------------------------------------------------------- */}
      <Dialog open={openModal} onOpenChange={setOpenModal}>
        <DialogContent className="bg-zinc-950 border-zinc-800 text-white max-w-5xl max-h-[92vh] flex flex-col p-0 overflow-hidden shadow-2xl">
          {/* Modal Header */}
          <DialogHeader className="p-4 sm:p-5 border-b border-zinc-800 shrink-0 bg-zinc-900/50">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="h-9 w-9 rounded-xl bg-purple-950/60 border border-purple-800/40 flex items-center justify-center text-purple-400 shrink-0">
                  <Dumbbell className="h-5 w-5" />
                </div>
                <div>
                  <DialogTitle className="text-base sm:text-lg font-bold text-zinc-100 flex items-center gap-2">
                    {workoutId ? 'Edit Workout Plan' : 'Workout Plan Builder Studio'}
                  </DialogTitle>
                  <DialogDescription className="text-zinc-400 text-xs mt-0.5">
                    Compose split routines, fine-tune volume & sets, and pick 1-click popular fitness movements.
                  </DialogDescription>
                </div>
              </div>

              <div className="flex items-center gap-2.5 flex-wrap">
                {/* 1-Click Templates Dropdown */}
                {!workoutId && (
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="h-8 text-xs border-purple-800/60 bg-purple-950/30 text-purple-200 hover:bg-purple-900/40 hover:text-white gap-1.5 cursor-pointer"
                      >
                        <Sparkles className="h-3.5 w-3.5 text-purple-400" />
                        <span>Load Preset Split</span>
                        <ChevronDown className="h-3 w-3 opacity-60" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-80 bg-zinc-950 border-zinc-800 text-zinc-200 p-1.5 shadow-2xl z-50">
                      <DropdownMenuLabel className="text-[11px] font-semibold text-zinc-400 px-2 py-1">
                        1-Click Workout Split Templates
                      </DropdownMenuLabel>
                      <DropdownMenuSeparator className="bg-zinc-800" />
                      {PRESET_WORKOUT_TEMPLATES.map((tmpl) => (
                        <DropdownMenuItem
                          key={tmpl.id}
                          onClick={() => handleApplyTemplate(tmpl)}
                          className="flex flex-col items-start gap-1 p-2 rounded-lg cursor-pointer hover:bg-purple-950/40 focus:bg-purple-950/40"
                        >
                          <div className="flex items-center justify-between w-full">
                            <span className="font-semibold text-xs text-zinc-100">{tmpl.name}</span>
                            <Badge variant="outline" className="text-[10px] border-purple-800/60 text-purple-300 py-0 px-1.5">
                              {tmpl.splitBadge}
                            </Badge>
                          </div>
                          <p className="text-[10px] text-zinc-400 line-clamp-1">{tmpl.description}</p>
                          <div className="text-[10px] text-zinc-500 font-mono">
                            {tmpl.days.length} Training Days ({tmpl.days.map((d) => d.day.split(':')[0]).join(', ')})
                          </div>
                        </DropdownMenuItem>
                      ))}
                    </DropdownMenuContent>
                  </DropdownMenu>
                )}

                {/* Volume Summary Badge */}
                <div className="flex items-center gap-2 bg-zinc-900/90 border border-zinc-800 px-3 py-1 rounded-xl text-xs">
                  <span className="text-zinc-400 text-[11px]">Volume:</span>
                  <span className="font-mono font-bold text-purple-400">{workoutSummary.totalDays}</span>
                  <span className="text-zinc-500 text-[10px]">Days</span>
                  <span className="text-zinc-600">•</span>
                  <span className="font-mono font-bold text-cyan-400">{workoutSummary.totalExercises}</span>
                  <span className="text-zinc-500 text-[10px]">Exercises</span>
                </div>
              </div>
            </div>
          </DialogHeader>

          {/* Modal Body - Scrollable */}
          <form onSubmit={handleSaveWorkout} className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4">
            {/* Plan Metadata Bar - Compact & Clean */}
            <div className="bg-zinc-900/40 border border-zinc-800/70 rounded-xl p-3 sm:p-4 space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
                <div className="sm:col-span-8 space-y-1">
                  <Label htmlFor="workoutName" className="text-[11px] font-medium text-zinc-400 uppercase tracking-wider">
                    Routine Name *
                  </Label>
                  <Input
                    id="workoutName"
                    placeholder="e.g. 5-Day Hypertrophy PPL or Strength Circuit"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="bg-zinc-900 border-zinc-800 text-xs h-8 text-zinc-100 placeholder:text-zinc-600 focus:border-purple-500"
                  />
                </div>

                <div className="sm:col-span-4 space-y-1">
                  <Label htmlFor="workoutIsTemplate" className="text-[11px] font-medium text-zinc-400 uppercase tracking-wider">
                    Visibility / Type
                  </Label>
                  <div className="flex items-center h-8 px-3 rounded-md bg-zinc-900 border border-zinc-800 text-xs text-zinc-300">
                    <span className="text-[11px] text-purple-300 font-medium">
                      {isTemplate ? '⚡ Template Blueprint' : 'Custom Member Plan'}
                    </span>
                  </div>
                </div>
              </div>

              <div className="space-y-1">
                <Label htmlFor="desc" className="text-[11px] font-medium text-zinc-400 uppercase tracking-wider">
                  Coaching Notes / Instructions (Optional)
                </Label>
                <Input
                  id="desc"
                  placeholder="e.g. Focus on explosive concentric reps and 3-second negative eccentric tempo."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="bg-zinc-900 border-zinc-800 text-xs h-8 text-zinc-100 placeholder:text-zinc-600 focus:border-purple-500"
                />
              </div>
            </div>

            {/* Workout Days Navigation & Schedule */}
            <div className="space-y-3">
              <div className="flex items-center justify-between gap-2 border-b border-zinc-800/80 pb-2.5">
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-purple-400" />
                  <span className="text-xs font-bold text-zinc-200 uppercase tracking-wider">
                    Training Routine Schedule ({days.length} {days.length === 1 ? 'Day' : 'Days'})
                  </span>
                </div>

                {/* Quick Add Day Menu */}
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      type="button"
                      size="sm"
                      className="h-7 text-xs px-2.5 bg-purple-600 hover:bg-purple-500 text-white font-medium gap-1 shadow-sm cursor-pointer"
                    >
                      <Plus className="h-3.5 w-3.5" />
                      <span>Add Day</span>
                      <ChevronDown className="h-3 w-3 opacity-70" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="bg-zinc-950 border-zinc-800 text-zinc-200 p-1 text-xs z-50">
                    {['Monday: Push', 'Tuesday: Pull', 'Wednesday: Legs', 'Thursday: Upper Body', 'Friday: Lower Body', 'Saturday: Core & Cardio', 'Sunday: Active Recovery'].map((dayPreset) => (
                      <DropdownMenuItem
                        key={dayPreset}
                        onClick={() => handleAddDayCard(dayPreset)}
                        className="cursor-pointer hover:bg-zinc-900 focus:bg-zinc-900 text-xs"
                      >
                        + {dayPreset}
                      </DropdownMenuItem>
                    ))}
                    <DropdownMenuSeparator className="bg-zinc-800" />
                    <DropdownMenuItem
                      onClick={() => handleAddDayCard()}
                      className="cursor-pointer text-purple-300 hover:bg-purple-950/40 focus:bg-purple-950/40 font-semibold text-xs"
                    >
                      + Custom Training Day
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>

              {/* Horizontal Day Pill Tabs */}
              {days.length > 0 && (
                <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-thin scrollbar-thumb-zinc-800">
                  {days.map((d, idx) => {
                    const isActive = (activeDayIndex >= days.length ? 0 : activeDayIndex) === idx;
                    const exCount = (d.exercises || []).length;

                    return (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => setActiveDayIndex(idx)}
                        className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs whitespace-nowrap transition-all border shrink-0 cursor-pointer ${
                          isActive
                            ? 'bg-purple-600 border-purple-500 text-white font-semibold shadow-md shadow-purple-950/40'
                            : 'bg-zinc-900/60 border-zinc-800/80 text-zinc-400 hover:bg-zinc-800/60 hover:text-zinc-200'
                        }`}
                      >
                        <span className="font-mono text-[10px] opacity-75">#{idx + 1}</span>
                        <span>{d.day || `Day ${idx + 1}`}</span>
                        <span
                          className={`text-[10px] px-1.5 py-0.5 rounded font-mono ${
                            isActive ? 'bg-purple-700/80 text-purple-100' : 'bg-zinc-800 text-zinc-400'
                          }`}
                        >
                          {exCount} ex
                        </span>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Active Day Focus Stage */}
            {(() => {
              const safeIdx = Math.min(Math.max(0, activeDayIndex), days.length - 1);
              const activeDay = days[safeIdx];
              if (!activeDay) {
                return (
                  <div className="text-center py-10 border border-dashed border-zinc-800 rounded-xl bg-zinc-950/40 p-6 space-y-2">
                    <Dumbbell className="h-8 w-8 mx-auto text-purple-400 opacity-60" />
                    <p className="text-sm font-semibold text-zinc-300">No Training Days in this Split</p>
                    <p className="text-xs text-zinc-500">Add a training day or load a 1-click preset template above.</p>
                    <Button
                      type="button"
                      size="sm"
                      onClick={() => handleAddDayCard('Day 1: Full Body')}
                      className="bg-purple-600 hover:bg-purple-500 text-white text-xs mt-2"
                    >
                      <Plus className="h-3.5 w-3.5 mr-1" /> Add Day 1
                    </Button>
                  </div>
                );
              }

              const exCount = (activeDay.exercises || []).length;

              return (
                <div className="border border-zinc-800 bg-zinc-900/30 rounded-xl overflow-hidden shadow-lg space-y-0">
                  {/* Active Day Header */}
                  <div className="p-3 sm:p-3.5 bg-zinc-950/80 border-b border-zinc-800 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                    <div className="flex items-center gap-2.5 flex-wrap flex-1">
                      <span className="bg-purple-600/20 text-purple-300 border border-purple-500/30 text-[10px] font-bold px-2 py-0.5 rounded uppercase tracking-wider font-mono">
                        Day #{safeIdx + 1}
                      </span>
                      <Input
                        value={activeDay.day}
                        onChange={(e) => handleUpdateDayName(safeIdx, e.target.value)}
                        placeholder="Day Name (e.g. Monday: Push)"
                        className="h-8 text-xs font-semibold bg-zinc-900 border-zinc-700 text-zinc-100 focus:border-purple-500 max-w-xs"
                      />
                    </div>

                    <div className="flex items-center gap-2 justify-between sm:justify-end">
                      <div className="text-xs font-mono bg-zinc-900/90 border border-zinc-800 px-2.5 py-1 rounded-lg text-purple-300">
                        <span className="font-bold">{exCount}</span> {exCount === 1 ? 'Exercise' : 'Exercises'}
                      </div>

                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDuplicateDay(safeIdx)}
                        className="h-7 px-2 text-xs text-zinc-400 hover:text-purple-300 hover:bg-zinc-800 cursor-pointer"
                        title="Duplicate Day"
                      >
                        <Copy className="h-3.5 w-3.5 mr-1" /> Duplicate
                      </Button>

                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => handleRemoveDayCard(safeIdx)}
                        className="h-7 px-2 text-xs text-zinc-400 hover:text-red-400 hover:bg-red-950/20 cursor-pointer"
                        title="Delete Day"
                      >
                        <Trash2 className="h-3.5 w-3.5 mr-1" /> Delete
                      </Button>
                    </div>
                  </div>

                  {/* Exercises Table */}
                  <div className="p-3 sm:p-4 space-y-3">
                    {(activeDay.exercises || []).length === 0 ? (
                      <div className="text-center py-6 border border-dashed border-zinc-800/80 rounded-xl bg-zinc-950/30 p-4">
                        <p className="text-xs text-zinc-400 font-medium">No exercises planned for this day yet.</p>
                        <p className="text-[11px] text-zinc-500 mt-0.5">
                          Click movements from the library below or click &quot;Add Exercise&quot; to type manually.
                        </p>
                      </div>
                    ) : (
                      <div className="overflow-x-auto">
                        <div className="min-w-[650px] space-y-1.5">
                          {/* Table Header */}
                          <div className="grid grid-cols-12 gap-2 text-[10px] uppercase font-bold text-zinc-500 px-2.5 py-1 tracking-wider border-b border-zinc-800/60">
                            <div className="col-span-4">Movement / Exercise</div>
                            <div className="col-span-2">Sets</div>
                            <div className="col-span-2">Reps</div>
                            <div className="col-span-1">Rest (s)</div>
                            <div className="col-span-2">Form Coaching Notes</div>
                            <div className="col-span-1 text-center">Action</div>
                          </div>

                          {/* Table Rows */}
                          {activeDay.exercises.map((ex, exIdx) => (
                            <div
                              key={exIdx}
                              className="grid grid-cols-12 gap-2 items-center bg-zinc-950/60 px-2.5 py-1.5 rounded-lg border border-zinc-800/60 hover:border-zinc-700/80 transition-colors"
                            >
                              <div className="col-span-4">
                                <Input
                                  value={ex.name}
                                  onChange={(e) =>
                                    handleUpdateExercise(safeIdx, exIdx, 'name', e.target.value)
                                  }
                                  placeholder="e.g. Barbell Flat Bench Press"
                                  className="h-8 text-xs bg-zinc-900 border-zinc-800/80 text-zinc-100 placeholder:text-zinc-600 focus:border-purple-500"
                                />
                              </div>
                              <div className="col-span-2">
                                <Input
                                  type="number"
                                  value={ex.sets || ''}
                                  onChange={(e) =>
                                    handleUpdateExercise(safeIdx, exIdx, 'sets', e.target.value)
                                  }
                                  placeholder="3"
                                  className="h-8 text-xs bg-zinc-900 border-zinc-800/80 text-purple-400 font-mono font-bold focus:border-purple-500"
                                />
                              </div>
                              <div className="col-span-2">
                                <Input
                                  value={ex.reps}
                                  onChange={(e) =>
                                    handleUpdateExercise(safeIdx, exIdx, 'reps', e.target.value)
                                  }
                                  placeholder="10-12"
                                  className="h-8 text-xs bg-zinc-900 border-zinc-800/80 text-zinc-200 font-mono focus:border-purple-500"
                                />
                              </div>
                              <div className="col-span-1">
                                <Input
                                  type="number"
                                  value={ex.rest_seconds || ''}
                                  onChange={(e) =>
                                    handleUpdateExercise(safeIdx, exIdx, 'rest_seconds', e.target.value)
                                  }
                                  placeholder="60"
                                  className="h-8 text-xs bg-zinc-900 border-zinc-800/80 text-zinc-400 font-mono focus:border-purple-500"
                                />
                              </div>
                              <div className="col-span-2">
                                <Input
                                  value={ex.notes || ''}
                                  onChange={(e) =>
                                    handleUpdateExercise(safeIdx, exIdx, 'notes', e.target.value)
                                  }
                                  placeholder="e.g. Full stretch"
                                  className="h-8 text-xs bg-zinc-900 border-zinc-800/80 text-zinc-300 placeholder:text-zinc-600 focus:border-purple-500"
                                />
                              </div>
                              <div className="col-span-1 flex justify-center">
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => handleRemoveExercise(safeIdx, exIdx)}
                                  className="h-7 w-7 text-zinc-500 hover:text-red-400 hover:bg-zinc-800 rounded-lg cursor-pointer"
                                  title="Remove Exercise"
                                >
                                  <Trash2 className="h-3.5 w-3.5" />
                                </Button>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Inline Add Exercise Button */}
                    <div className="pt-1 flex items-center justify-between">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => handleAddEmptyExercise(safeIdx)}
                        className="h-7 text-xs border-dashed border-zinc-700 bg-zinc-900/50 hover:bg-zinc-800 text-zinc-300 hover:text-white gap-1.5 cursor-pointer"
                      >
                        <Plus className="h-3.5 w-3.5 text-purple-400" />
                        <span>Add Exercise</span>
                      </Button>

                      <div className="text-[11px] text-zinc-500 font-mono">
                        Session Total: <span className="text-purple-400 font-semibold">{exCount} {exCount === 1 ? 'movement' : 'movements'}</span>
                      </div>
                    </div>

                    {/* Compact 1-Click Popular Movement Library */}
                    <div className="pt-3 border-t border-zinc-800/70 space-y-2">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                        <div className="flex items-center gap-1.5">
                          <Sparkles className="h-3.5 w-3.5 text-purple-400" />
                          <span className="text-xs font-semibold text-zinc-300">Quick-Add Exercise Movements</span>
                          <span className="text-[10px] text-zinc-500">(1-click to append)</span>
                        </div>

                        {/* Muscle Group Filter Pills */}
                        <div className="flex items-center gap-1 overflow-x-auto">
                          {['All', 'Chest', 'Back', 'Legs', 'Shoulders', 'Arms', 'Core'].map((grp) => (
                            <button
                              key={grp}
                              type="button"
                              onClick={() => setSelectedMuscleFilter(grp)}
                              className={`px-2 py-0.5 rounded-full text-[10px] font-medium transition-colors cursor-pointer ${
                                selectedMuscleFilter === grp
                                  ? 'bg-purple-600 text-white font-semibold'
                                  : 'bg-zinc-900 text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200 border border-zinc-800'
                              }`}
                            >
                              {grp}
                            </button>
                          ))}
                        </div>
                      </div>

                      <div className="flex flex-wrap gap-1.5 max-h-28 overflow-y-auto pr-1">
                        {filteredQuickChips.map((ex, idx) => (
                          <button
                            key={idx}
                            type="button"
                            onClick={() => handleAddQuickExercise(ex)}
                            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs bg-zinc-950 border border-zinc-800/80 hover:border-purple-500/60 hover:bg-purple-950/30 text-zinc-300 hover:text-white transition-all cursor-pointer active:scale-95"
                          >
                            <span>{ex.name}</span>
                            <span className="text-[10px] text-purple-400 font-mono font-semibold">
                              ({ex.sets}x{ex.reps})
                            </span>
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })()}
          </form>

          {/* Sticky Modal Footer */}
          <DialogFooter className="p-3.5 sm:p-4 border-t border-zinc-800 shrink-0 bg-zinc-950 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3 text-xs text-zinc-400 flex-wrap">
              <span>
                Total Routine Days: <strong className="text-purple-400 font-mono">{workoutSummary.totalDays}</strong>
              </span>
              <span>•</span>
              <span>
                Total Exercises: <strong className="text-cyan-400 font-mono">{workoutSummary.totalExercises}</strong>
              </span>
            </div>

            <div className="flex items-center gap-2 justify-end">
              <Button
                type="button"
                variant="ghost"
                onClick={() => setOpenModal(false)}
                className="text-zinc-400 hover:bg-zinc-900 text-xs cursor-pointer"
              >
                Cancel
              </Button>
              <Button
                type="button"
                onClick={handleSaveWorkout}
                disabled={saving}
                className="bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold gap-2 px-4 shadow-lg shadow-purple-900/30 cursor-pointer"
              >
                {saving ? <Loader2 className="h-4 w-4 animate-spin text-white" /> : <Save className="h-4 w-4" />}
                {workoutId ? 'Update Workout Plan' : 'Save Workout Plan'}
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ------------------------------------------------------------- */}
      {/* Assign Workout Modal Dialog */}
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
              <Users className="h-4 w-4 text-purple-400" /> Assign Workout Plan to Members
            </DialogTitle>
            <DialogDescription className="text-zinc-400 text-xs">
              Assigning <span className="text-purple-400 font-semibold">{selectedWorkout?.name}</span> to active gym members.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleAssignWorkout} className="space-y-4 pt-2">
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
