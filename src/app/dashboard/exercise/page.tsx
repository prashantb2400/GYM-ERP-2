'use client';

import React, { useEffect, useState } from 'react';
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
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ExerciseDay, Exercise } from '@/types/database';

export default function ExercisePlansPage() {
  const supabase = createClient();
  const { user } = useAuth();
  const { can } = usePermission();

  const [loading, setLoading] = useState(true);
  const [exercises, setExercises] = useState<any[]>([]);
  const [openModal, setOpenModal] = useState(false);
  const [saving, setSaving] = useState(false);

  // Assignment Modal states
  const [openAssignModal, setOpenAssignModal] = useState(false);
  const [assigning, setAssigning] = useState(false);
  const [selectedWorkout, setSelectedWorkout] = useState<any>(null);
  const [members, setMembers] = useState<any[]>([]);
  const [selectedMemberIds, setSelectedMemberIds] = useState<string[]>([]);
  const [memberSearch, setMemberSearch] = useState('');

  // Form states (Workout details)
  const [workoutId, setWorkoutId] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [isTemplate, setIsTemplate] = useState(true);
  
  // Days array
  const [days, setDays] = useState<ExerciseDay[]>([]);

  // Current day builder states
  const [currentDayName, setCurrentDayName] = useState('');
  const [currentExercises, setCurrentExercises] = useState<Exercise[]>([]);
  
  const [exName, setExName] = useState('');
  const [exSets, setExSets] = useState('');
  const [exReps, setExReps] = useState('');
  const [exRest, setExRest] = useState('');
  const [exNotes, setExNotes] = useState('');

  const fetchExercises = async () => {
    if (!user?.gymId) return;

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
    if (!can('exercise.manage')) {
      toast.error('You do not have permission to manage exercises');
      return;
    }
    setWorkoutId(null);
    setName('');
    setDescription('');
    setIsTemplate(true);
    setDays([]);
    resetDayBuilder();
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
    resetDayBuilder();
    setOpenModal(true);
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

  const resetDayBuilder = () => {
    setCurrentDayName('');
    setCurrentExercises([]);
    resetExerciseBuilder();
  };

  const resetExerciseBuilder = () => {
    setExName('');
    setExSets('');
    setExReps('');
    setExRest('');
    setExNotes('');
  };

  const handleAddExerciseToDay = () => {
    if (exName.trim() && exSets && exReps) {
      const newEx: Exercise = {
        name: exName.trim(),
        sets: parseInt(exSets) || 3,
        reps: exReps.trim(),
        rest_seconds: parseInt(exRest) || 60,
        notes: exNotes.trim() || undefined,
      };
      setCurrentExercises([...currentExercises, newEx]);
      resetExerciseBuilder();
    } else {
      toast.error('Please specify exercise name, sets, and reps');
    }
  };

  const handleRemoveExerciseFromDay = (index: number) => {
    setCurrentExercises(currentExercises.filter((_, i) => i !== index));
  };

  const handleAddDay = () => {
    if (currentDayName.trim() && currentExercises.length > 0) {
      const newDay: ExerciseDay = {
        day: currentDayName.trim(),
        exercises: currentExercises,
      };
      setDays([...days, newDay]);
      resetDayBuilder();
    } else {
      toast.error('Please specify day name (e.g. Mon Push) and add at least one exercise');
    }
  };

  const handleRemoveDay = (idx: number) => {
    setDays(days.filter((_, i) => i !== idx));
  };

  const handleSaveWorkout = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || days.length === 0) {
      toast.error('Name and at least one day workout schedule are required');
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
        toast.success('Workout plan updated');
      } else {
        const { error } = await supabase
          .from('exercise_charts')
          .insert(payload);

        if (error) throw error;
        toast.success('Workout plan template created');
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
          await supabase.from('whatsapp_logs').insert({
            gym_id: user?.gymId,
            member_id: memberId,
            recipient_phone: '919876543210',
            recipient_name: 'Member',
            message_type: 'document',
            document_type: 'workout_chart',
            status: 'delivered',
          });
        }
      }

      if (fail === 0) {
        toast.success(`✅ Assigned "${selectedWorkout.name}" to ${success} member${success > 1 ? 's' : ''}`);
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

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-zinc-800 pb-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-zinc-100">Workouts & Routines</h2>
          <p className="text-zinc-500 text-xs mt-1">Design training schedules, log reps/sets/rest limits, and link routines to members.</p>
        </div>
        {can('exercise.manage') && (
          <Button onClick={handleOpenAddModal} className="bg-purple-600 hover:bg-purple-700 text-white gap-2 font-medium">
            <Plus className="h-4 w-4" /> Create Workout Plan
          </Button>
        )}
      </div>

      {/* Grid: Plan Cards */}
      {loading ? (
        <div className="flex justify-center items-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-purple-600" />
        </div>
      ) : exercises.length === 0 ? (
        <div className="text-center py-20 text-zinc-500 border border-dashed border-zinc-800 rounded-xl">
          No workout plans created yet. Click "Create Workout Plan" to begin.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {exercises.map((workout) => (
            <Card key={workout.id} className="border-zinc-800 bg-zinc-900/30 flex flex-col justify-between overflow-hidden">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-bold text-zinc-100">{workout.name}</CardTitle>
                <p className="text-zinc-500 text-xs mt-1.5 leading-relaxed truncate">{workout.description || 'No description provided.'}</p>
              </CardHeader>

              <CardContent className="flex-1 border-t border-zinc-800/40 pt-3 text-xs">
                <span className="text-[10px] text-zinc-500 font-semibold uppercase tracking-wider">Days ({workout.days?.length || 0})</span>
                <div className="space-y-2 mt-2 max-h-[140px] overflow-y-auto">
                  {workout.days?.map((d: any, idx: number) => (
                    <div key={idx} className="flex justify-between items-center bg-zinc-950/30 p-2 border border-zinc-800 rounded">
                      <span className="font-semibold text-zinc-200">{d.day}</span>
                      <span className="text-purple-400 text-[10px] font-bold">{d.exercises?.length || 0} exercises</span>
                    </div>
                  ))}
                </div>
              </CardContent>

              <CardFooter className="border-t border-zinc-800/40 pt-3 flex gap-2 justify-between bg-zinc-900/10">
                {can('exercise.manage') ? (
                  <>
                    <Button
                      variant="ghost"
                      onClick={() => handleOpenAssignModal(workout)}
                      className="text-purple-400 hover:text-purple-300 hover:bg-purple-950/10 text-xs px-2.5 h-8 gap-1.5 font-medium"
                    >
                      <Users className="h-4 w-4" /> Link Member
                    </Button>
                    <div className="flex gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleOpenEditModal(workout)}
                        className="h-8 w-8 text-zinc-400 hover:text-white"
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDeleteWorkout(workout.id, workout.name)}
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

      {/* Add/Edit Workout Builder Modal */}
      <Dialog open={openModal} onOpenChange={setOpenModal}>
        <DialogContent className="bg-zinc-900 border-zinc-800 text-white max-w-2xl">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold">{workoutId ? 'Modify Workout Chart' : 'Design Workout Chart'}</DialogTitle>
            <DialogDescription className="text-zinc-500 text-xs">Configure exercises schedules, sets, reps, and target rest times.</DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSaveWorkout} className="space-y-4 pt-4">
            <div className="grid gap-2">
              <Label htmlFor="workoutName" className="text-zinc-300 text-xs font-semibold">Workout Plan Name *</Label>
              <Input
                id="workoutName"
                placeholder="e.g. 5-Day Push Pull Legs (PPL)"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="border-zinc-800 bg-zinc-950 text-zinc-100 text-xs"
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="desc" className="text-zinc-300 text-xs">Plan Description</Label>
              <Input
                id="desc"
                placeholder="Advanced muscle hypertrophy schedule"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="border-zinc-800 bg-zinc-950 text-zinc-100 text-xs"
              />
            </div>

            {/* Routine Day Builder Grid Submodule */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 border-t border-zinc-800/80 pt-4">
              {/* Left: Day exercises composer */}
              <div className="space-y-3.5 border border-zinc-800 p-3 rounded-lg bg-zinc-950/20">
                <span className="text-[10px] font-extrabold uppercase text-purple-400 tracking-wider">Exercise Composer</span>
                
                <div className="grid gap-2">
                  <Label htmlFor="dName" className="text-[10px] text-zinc-400">Day Label *</Label>
                  <Input
                    id="dName"
                    placeholder="e.g. Monday (Push)"
                    value={currentDayName}
                    onChange={(e) => setCurrentDayName(e.target.value)}
                    className="border-zinc-800 bg-zinc-950 text-[11px] h-8"
                  />
                </div>

                <div className="border border-zinc-800/50 p-2.5 rounded bg-zinc-950/40 space-y-2">
                  <span className="text-[9px] text-zinc-500 font-bold block border-b border-zinc-800 pb-1">Exercises</span>
                  <div className="grid grid-cols-2 gap-2">
                    <Input placeholder="Incline DB Press" value={exName} onChange={(e) => setExName(e.target.value)} className="text-[10px] h-7 border-zinc-800" />
                    <Input placeholder="Sets (e.g. 4)" type="number" value={exSets} onChange={(e) => setExSets(e.target.value)} className="text-[10px] h-7 border-zinc-800" />
                    <Input placeholder="Reps (e.g. 8-12)" value={exReps} onChange={(e) => setExReps(e.target.value)} className="text-[10px] h-7 border-zinc-800" />
                    <Input placeholder="Rest (e.g. 90s)" type="number" value={exRest} onChange={(e) => setExRest(e.target.value)} className="text-[10px] h-7 border-zinc-800" />
                  </div>
                  <Input placeholder="Form notes: Focus on slow negatives" value={exNotes} onChange={(e) => setExNotes(e.target.value)} className="text-[9px] h-7 border-zinc-800" />
                  
                  <Button type="button" onClick={handleAddExerciseToDay} size="sm" variant="secondary" className="w-full text-[10px] h-7 bg-zinc-900 hover:bg-zinc-800 text-zinc-400">
                    <PlusCircle className="h-3.5 w-3.5 mr-1" /> Add Exercise
                  </Button>

                  {/* Added exercises preview in composer day */}
                  <div className="space-y-1 max-h-[80px] overflow-y-auto mt-2.5">
                    {currentExercises.map((ex, idx) => (
                      <div key={idx} className="flex justify-between items-center bg-zinc-900/40 p-1.5 rounded text-[10px] text-zinc-400">
                        <span className="truncate max-w-[170px]">{ex.name} ({ex.sets}x{ex.reps})</span>
                        <button type="button" onClick={() => handleRemoveExerciseFromDay(idx)} className="text-red-500 font-bold hover:text-red-400 px-1">
                          &times;
                        </button>
                      </div>
                    ))}
                  </div>
                </div>

                <Button type="button" onClick={handleAddDay} className="w-full bg-purple-600 hover:bg-purple-700 text-white text-xs h-8 font-bold">
                  Add Day to Workout Chart
                </Button>
              </div>

              {/* Right: Routine preview summary */}
              <div className="space-y-2 max-h-[300px] overflow-y-auto border border-zinc-800 p-3 rounded bg-zinc-950/20">
                <span className="text-[10px] font-extrabold uppercase text-zinc-500 tracking-wider">Plan Summary ({days.length} Days)</span>
                {days.length === 0 ? (
                  <div className="text-center text-zinc-600 text-xs py-16">No workouts added to the chart.</div>
                ) : (
                  <div className="space-y-2">
                    {days.map((day, idx) => (
                      <div key={idx} className="border border-zinc-800 bg-zinc-900/30 p-2.5 rounded relative">
                        <span className="text-xs font-bold text-zinc-200">{day.day}</span>
                        <div className="space-y-1 mt-1 text-[10px] text-zinc-400">
                          {day.exercises.map((ex, i) => (
                            <div key={i}>• {ex.name} ({ex.sets} sets &times; {ex.reps})</div>
                          ))}
                        </div>
                        <button
                          type="button"
                          onClick={() => handleRemoveDay(idx)}
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
                {workoutId ? 'Save Changes' : 'Create Workout Chart'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Assign Workout Modal Dialog */}
      <Dialog open={openAssignModal} onOpenChange={(open) => {
        setOpenAssignModal(open);
        if (!open) {
          setSelectedMemberIds([]);
          setMemberSearch('');
        }
      }}>
        <DialogContent className="bg-zinc-900 border-zinc-800 text-white max-w-md">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold">Assign Workout Plan</DialogTitle>
            <DialogDescription className="text-zinc-500 text-xs">
              Selecting active member to link with: {selectedWorkout?.name}
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleAssignWorkout} className="space-y-4 pt-4">
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
