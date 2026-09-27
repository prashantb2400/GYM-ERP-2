'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { createClient } from '@/lib/supabase/client';
import {
  Dumbbell,
  Plus,
  Trash2,
  Save,
  Loader2,
  Sparkles,
  Calendar,
  Zap,
  Copy,
  ChevronDown,
  ArrowUp,
  ArrowDown,
  RotateCcw,
  Activity,
  ArrowLeft,
  Search,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
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
import {
  PRESET_WORKOUT_TEMPLATES,
  QUICK_EXERCISES,
  WorkoutTemplate,
  QuickExercise,
} from './workout-templates';

export interface WorkoutRoutineStudioProps {
  open: boolean;
  onClose: () => void;
  workout: any | null;
  gymId?: string;
  userId?: string;
  onSuccess: () => void;
}

export function WorkoutRoutineStudio({
  open,
  onClose,
  workout,
  gymId,
  userId,
  onSuccess,
}: WorkoutRoutineStudioProps) {
  const supabase = createClient();

  const [saving, setSaving] = useState(false);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [isTemplate, setIsTemplate] = useState(true);
  const [days, setDays] = useState<ExerciseDay[]>([]);
  const [activeDayIndex, setActiveDayIndex] = useState<number>(0);
  const [showQuickExDrawer, setShowQuickExDrawer] = useState(false);
  const [selectedMuscleFilter, setSelectedMuscleFilter] = useState<string>('All');
  const [quickExSearch, setQuickExSearch] = useState('');

  useEffect(() => {
    if (!open) return;
    if (workout) {
      setName(workout.name || '');
      setDescription(workout.description || '');
      setIsTemplate(workout.is_template ?? true);
      setDays(workout.days ? JSON.parse(JSON.stringify(workout.days)) : []);
    } else {
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
    }
    setActiveDayIndex(0);
    setShowQuickExDrawer(false);
    setSelectedMuscleFilter('All');
    setQuickExSearch('');
  }, [open, workout]);

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

  const handleApplyTemplate = (template: WorkoutTemplate) => {
    setName(template.name);
    setDescription(template.description);
    setDays(JSON.parse(JSON.stringify(template.days)));
    setActiveDayIndex(0);
    toast.success(`Loaded workout split: "${template.name}"`);
  };

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

  const handleRemoveExercise = (dayIdx: number, exIdx: number) => {
    const updated = [...days];
    updated[dayIdx].exercises = updated[dayIdx].exercises.filter((_, i) => i !== exIdx);
    setDays(updated);
  };

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

  const handleAddDayCard = (presetName?: string) => {
    const defaultName = presetName || `Day ${days.length + 1}: Training Split`;
    const newDay: ExerciseDay = {
      day: defaultName,
      exercises: [],
    };
    setDays([...days, newDay]);
    setActiveDayIndex(days.length);
  };

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

    if (!gymId) {
      toast.error('Gym session context missing');
      return;
    }

    try {
      setSaving(true);

      const payload = {
        gym_id: gymId,
        name: name.trim(),
        description: description.trim() || null,
        is_template: isTemplate,
        days,
        created_by: userId,
      };

      if (workout?.id) {
        const { error } = await supabase
          .from('exercise_charts')
          .update(payload)
          .eq('id', workout.id)
          .eq('gym_id', gymId);

        if (error) throw error;
        toast.success('Workout plan updated successfully');
      } else {
        const { error } = await supabase.from('exercise_charts').insert(payload);

        if (error) throw error;
        toast.success('Workout plan created successfully');
      }

      onSuccess();
      onClose();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'An unknown error occurred';
      toast.error(msg);
    } finally {
      setSaving(false);
    }
  };

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

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 bg-background flex flex-col overflow-hidden animate-in fade-in duration-150">
      {/* 1. Top Control Bar (Never wraps, ultra-clean) */}
      <header className="h-14 px-3 sm:px-6 border-b border-border/70 bg-card/80 backdrop-blur-xl flex items-center justify-between gap-2 shrink-0">
        {/* Left: Back / Exit + Title */}
        <div className="flex items-center gap-2 sm:gap-3 min-w-0">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={onClose}
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
                {workout?.id ? 'Edit Workout Plan' : 'Workout Routine Studio'}
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
          {!workout?.id && (
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
            <span className="hidden xs:inline">{workout?.id ? 'Update' : 'Save'}</span>
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

              {/* Movements Display: Desktop Table */}
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

              {/* MOBILE CARDS VIEW */}
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
            onClick={onClose}
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
            {workout?.id ? 'Update Workout Plan' : 'Save Workout Plan'}
          </Button>
        </div>
      </footer>
    </div>
  );
}
