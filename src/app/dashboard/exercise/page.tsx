'use client';

import React, { useEffect, useState, useMemo } from 'react';
import dynamic from 'next/dynamic';
import { createClient } from '@/lib/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { usePermission } from '@/hooks/usePermission';
import {
  Dumbbell,
  Plus,
  Loader2,
  Users,
  Eye,
  Trash,
  Search,
  Sparkles,
  Download,
  Activity,
  Zap,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';

// Dynamically import the heavy full-screen studio editor
const WorkoutRoutineStudio = dynamic(
  () => import('@/components/exercise/WorkoutRoutineStudio').then((mod) => mod.WorkoutRoutineStudio),
  {
    ssr: false,
    loading: () => (
      <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm flex items-center justify-center">
        <div className="flex items-center gap-2 text-sm text-muted-foreground font-mono">
          <Loader2 className="size-4 animate-spin text-primary" /> Loading Studio...
        </div>
      </div>
    ),
  }
);

export default function ExercisePlansPage() {
  const supabase = createClient();
  const { user } = useAuth();
  const { can } = usePermission();

  const [loading, setLoading] = useState(true);
  const [exercises, setExercises] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState('');

  // Studio modal states
  const [openModal, setOpenModal] = useState(false);
  const [selectedWorkoutForEdit, setSelectedWorkoutForEdit] = useState<any | null>(null);

  // Assignment Modal states
  const [openAssignModal, setOpenAssignModal] = useState(false);
  const [assigning, setAssigning] = useState(false);
  const [selectedWorkout, setSelectedWorkout] = useState<any>(null);
  const [members, setMembers] = useState<any[]>([]);
  const [selectedMemberIds, setSelectedMemberIds] = useState<string[]>([]);
  const [memberSearch, setMemberSearch] = useState('');

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

  const handleOpenAddModal = () => {
    if (!can('exercise.manage')) {
      toast.error('You do not have permission to manage exercises');
      return;
    }
    setSelectedWorkoutForEdit(null);
    setOpenModal(true);
  };

  const handleOpenEditModal = (workout: any) => {
    if (!can('exercise.manage')) {
      toast.error('You do not have permission to manage exercises');
      return;
    }
    setSelectedWorkoutForEdit(workout);
    setOpenModal(true);
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

      {/* Workout Routine Studio (Dynamically Imported) */}
      <WorkoutRoutineStudio
        open={openModal}
        onClose={() => setOpenModal(false)}
        workout={selectedWorkoutForEdit}
        gymId={user?.gymId}
        userId={user?.id}
        onSuccess={fetchExercises}
      />

      {/* Assign Workout Modal Dialog */}
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
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                <Input
                  placeholder="Search members by name or code..."
                  value={memberSearch}
                  onChange={(e) => setMemberSearch(e.target.value)}
                  className="pl-8 bg-background/50 border-white/[0.08] text-xs h-8 rounded-xl"
                />
              </div>

              {/* Members selection list */}
              <div className="max-h-56 overflow-y-auto space-y-1 pr-1 border border-white/[0.06] rounded-xl p-1.5 bg-background/30 scrollbar-none">
                {members
                  .filter((m) => {
                    if (!memberSearch.trim()) return true;
                    const q = memberSearch.toLowerCase();
                    return m.name?.toLowerCase().includes(q) || m.member_code?.toLowerCase().includes(q);
                  })
                  .map((m) => (
                    <label
                      key={m.id}
                      className="flex items-center justify-between p-2 rounded-lg hover:bg-card/60 cursor-pointer text-xs transition-colors"
                    >
                      <div className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={selectedMemberIds.includes(m.id)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedMemberIds([...selectedMemberIds, m.id]);
                            } else {
                              setSelectedMemberIds(selectedMemberIds.filter((id) => id !== m.id));
                            }
                          }}
                          className="rounded border-zinc-700 text-primary focus:ring-primary size-3.5 cursor-pointer"
                        />
                        <span className="font-medium text-foreground">{m.name}</span>
                      </div>
                      <span className="text-[10px] text-muted-foreground font-mono">
                        {m.member_code}
                      </span>
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
