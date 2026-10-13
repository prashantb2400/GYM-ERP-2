'use client';

import React, { useEffect, useState, useMemo, useRef } from 'react';
import { createClient } from '@/lib/supabase/client';
import {
  Dumbbell,
  Play,
  CheckCircle2,
  RotateCcw,
  Clock,
  Trophy,
  Calculator,
  Flame,
  ChevronDown,
  ChevronUp,
  Plus,
  Trash2,
  Loader2,
  Sparkles,
  Check,
  BarChart3,
  Calendar,
  Zap,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { estimateOneRepMax, OneRmFormula } from '@/lib/workout/one-rep-max';
import {
  calculateBarbellPlates,
  PlateCalculationResult,
} from '@/lib/workout/plate-calculator';
import { STARTER_ROUTINES, StarterRoutine } from '@/lib/workout/exercise-types';

interface LiveSetState {
  setNumber: number;
  weight: number;
  reps: number;
  rpe?: number;
  completed: boolean;
  volume: number;
  estimatedOneRm?: number;
}

interface LiveExerciseState {
  exerciseId: string;
  name: string;
  targetSets: number;
  targetReps: string;
  restSeconds: number;
  notes?: string;
  sets: LiveSetState[];
}

interface NormalizedDay {
  name: string;
  exercises: {
    exerciseId: string;
    name: string;
    sets: number;
    reps: string | number;
    restSeconds: number;
    notes?: string;
  }[];
}

function normalizeRoutineDays(routine: any): NormalizedDay[] {
  if (!routine || !Array.isArray(routine.days)) return [];
  return routine.days.map((d: any) => ({
    name: d.dayName || d.name || d.day || 'Workout Day',
    exercises: (d.exercises || []).map((ex: any) => ({
      exerciseId: ex.exerciseId || ex.exercise_id || ex.id || '',
      name: ex.exerciseName || ex.name || 'Exercise',
      sets: typeof ex.sets === 'number' ? ex.sets : parseInt(ex.sets, 10) || 3,
      reps: ex.reps || '10',
      restSeconds: ex.restSeconds || ex.rest_seconds || 90,
      notes: ex.notes || '',
    })),
  }));
}

export default function MemberExercisePage() {
  const supabase = createClient();

  const [loading, setLoading] = useState(true);
  const [member, setMember] = useState<any>(null);
  const [activeTab, setActiveTab] = useState<'workout' | 'plates' | 'onerm' | 'history'>('workout');

  // Routines & Program selection
  const [allRoutines, setAllRoutines] = useState<any[]>(STARTER_ROUTINES);
  const [selectedRoutine, setSelectedRoutine] = useState<any>(STARTER_ROUTINES[0]);
  const [selectedDayIndex, setSelectedDayIndex] = useState(0);

  const normalizedDays: NormalizedDay[] = useMemo(() => {
    return normalizeRoutineDays(selectedRoutine);
  }, [selectedRoutine]);

  // Live Workout Logging State
  const [isLoggingActive, setIsLoggingActive] = useState(false);
  const [sessionDuration, setSessionDuration] = useState(0);
  const [sessionExercises, setSessionExercises] = useState<LiveExerciseState[]>([]);
  const [sessionNotes, setSessionNotes] = useState('');
  const [savingLog, setSavingLog] = useState(false);
  const [completedSessionSummary, setCompletedSessionSummary] = useState<any>(null);

  // Rest Timer State
  const [restSecondsLeft, setRestSecondsLeft] = useState<number | null>(null);
  const [restInitialSeconds, setRestInitialSeconds] = useState(60);

  // Barbell Plate Calculator State
  const [plateTargetWeight, setPlateTargetWeight] = useState(60);
  const [plateBarWeight, setPlateBarWeight] = useState(20);

  // 1RM Calculator State
  const [oneRmWeight, setOneRmWeight] = useState(80);
  const [oneRmReps, setOneRmReps] = useState(5);
  const [oneRmRpe, setOneRmRpe] = useState<number>(9);
  const [oneRmFormula, setOneRmFormula] = useState<OneRmFormula>('epley');

  // History State
  const [historyLogs, setHistoryLogs] = useState<any[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [expandedLogId, setExpandedLogId] = useState<string | null>(null);

  // Timer intervals
  const sessionTimerRef = useRef<NodeJS.Timeout | null>(null);
  const restTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Play subtle audio tone using Web Audio API
  const playChime = () => {
    try {
      const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(587.33, ctx.currentTime); // D5
      osc.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + 0.15); // A5
      gain.gain.setValueAtTime(0.12, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.35);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.35);
    } catch {
      // AudioContext not allowed or unsupported
    }
  };

  // Workout duration timer
  useEffect(() => {
    if (isLoggingActive) {
      sessionTimerRef.current = setInterval(() => {
        setSessionDuration((prev) => prev + 1);
      }, 1000);
    } else {
      if (sessionTimerRef.current) clearInterval(sessionTimerRef.current);
    }
    return () => {
      if (sessionTimerRef.current) clearInterval(sessionTimerRef.current);
    };
  }, [isLoggingActive]);

  // Rest countdown timer
  useEffect(() => {
    if (restSecondsLeft !== null && restSecondsLeft > 0) {
      restTimerRef.current = setInterval(() => {
        setRestSecondsLeft((prev) => {
          if (prev === null || prev <= 1) {
            playChime();
            toast.success('Rest time completed! Ready for your next set.');
            return null;
          }
          return prev - 1;
        });
      }, 1000);
    } else if (restSecondsLeft === 0) {
      setRestSecondsLeft(null);
    }
    return () => {
      if (restTimerRef.current) clearInterval(restTimerRef.current);
    };
  }, [restSecondsLeft]);

  // Fetch Member profile and routines
  useEffect(() => {
    const fetchMemberData = async () => {
      try {
        setLoading(true);
        const { data: { user: authUser } } = await supabase.auth.getUser();
        if (!authUser) return;

        // Fetch corresponding member record
        const cleanPhone = authUser.phone ? authUser.phone.replace(/\D/g, '').slice(-10) : null;
        const filterParts = [`auth_id.eq.${authUser.id}`];
        if (authUser.email) filterParts.push(`email.eq.${authUser.email}`);
        if (cleanPhone) filterParts.push(`phone.eq.${cleanPhone}`);

        const { data: memberRec } = await supabase
          .from('members')
          .select('*')
          .or(filterParts.join(','))
          .limit(1)
          .maybeSingle();

        const currentMember = memberRec || {
          id: authUser.id,
          name: authUser.user_metadata?.full_name || 'Member Athlete',
          gym_id: authUser.user_metadata?.gym_id || null,
          member_code: 'MEM001',
        };
        setMember(currentMember);

        // Fetch assigned & available routines
        const res = await fetch(`/api/workouts/routines?member_id=${currentMember.id}`);
        if (res.ok) {
          const resData = await res.json();
          const loadedStarters = resData.starterRoutines || STARTER_ROUTINES;
          const assigned = resData.assignedRoutine?.workout_routines;

          if (assigned) {
            const combined = [assigned, ...loadedStarters];
            setAllRoutines(combined);
            setSelectedRoutine(assigned);
          } else {
            setAllRoutines(loadedStarters);
            setSelectedRoutine(loadedStarters[0]);
          }
        }
      } catch (err) {
        console.error('Failed to load member exercise data:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchMemberData();
  }, []);

  // Fetch workout history when history tab opens
  const fetchWorkoutHistory = async (memberId: string) => {
    try {
      setLoadingHistory(true);
      const res = await fetch(`/api/workouts/log?member_id=${memberId}`);
      if (res.ok) {
        const data = await res.json();
        setHistoryLogs(data.logs || []);
      }
    } catch (err) {
      console.error('Failed to load workout history:', err);
    } finally {
      setLoadingHistory(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'history' && member?.id) {
      fetchWorkoutHistory(member.id);
    }
  }, [activeTab, member?.id]);

  // Current day data
  const currentDay = useMemo(() => {
    if (!normalizedDays || normalizedDays.length === 0) {
      return null;
    }
    return normalizedDays[selectedDayIndex] || normalizedDays[0];
  }, [normalizedDays, selectedDayIndex]);

  // Initialize live logging session from current day
  const startLiveWorkout = () => {
    if (!currentDay) return;

    const initializedExercises: LiveExerciseState[] = currentDay.exercises.map((ex, idx) => {
      const setsCount = typeof ex.sets === 'number' ? ex.sets : 3;
      const parsedReps = typeof ex.reps === 'number' ? ex.reps : parseInt(String(ex.reps), 10) || 10;
      const initialSets: LiveSetState[] = Array.from({ length: setsCount }, (_, sIdx) => ({
        setNumber: sIdx + 1,
        weight: 0,
        reps: parsedReps,
        rpe: 8,
        completed: false,
        volume: 0,
      }));

      return {
        exerciseId: ex.exerciseId || `ex-${idx}`,
        name: ex.name,
        targetSets: setsCount,
        targetReps: String(ex.reps || '8-12'),
        restSeconds: ex.restSeconds || 90,
        notes: ex.notes,
        sets: initialSets,
      };
    });

    setSessionExercises(initializedExercises);
    setSessionDuration(0);
    setSessionNotes('');
    setCompletedSessionSummary(null);
    setIsLoggingActive(true);
    toast.success(`Workout session started: ${currentDay.name}`);
  };

  // Toggle set completion and update volume & estimated 1RM
  const toggleSetComplete = (exIdx: number, setIdx: number) => {
    setSessionExercises((prev) => {
      const copy = [...prev];
      const exercise = { ...copy[exIdx] };
      const setsCopy = [...exercise.sets];
      const targetSet = { ...setsCopy[setIdx] };

      targetSet.completed = !targetSet.completed;

      if (targetSet.completed) {
        const w = Number(targetSet.weight) || 0;
        const r = Number(targetSet.reps) || 0;
        targetSet.volume = w * r;

        if (w > 0 && r > 0) {
          const calc = estimateOneRepMax(w, r, 'epley', targetSet.rpe);
          targetSet.estimatedOneRm = calc.estimatedOneRm;
        }

        // Trigger rest timer
        const restSec = exercise.restSeconds || 90;
        setRestInitialSeconds(restSec);
        setRestSecondsLeft(restSec);
        playChime();
      }

      setsCopy[setIdx] = targetSet;
      exercise.sets = setsCopy;
      copy[exIdx] = exercise;
      return copy;
    });
  };

  // Update set weight, reps, or rpe
  const updateSetField = (exIdx: number, setIdx: number, field: 'weight' | 'reps' | 'rpe', val: number) => {
    setSessionExercises((prev) => {
      const copy = [...prev];
      const exercise = { ...copy[exIdx] };
      const setsCopy = [...exercise.sets];
      const targetSet = { ...setsCopy[setIdx], [field]: val };

      if (targetSet.completed) {
        const w = Number(targetSet.weight) || 0;
        const r = Number(targetSet.reps) || 0;
        targetSet.volume = w * r;
        if (w > 0 && r > 0) {
          const calc = estimateOneRepMax(w, r, 'epley', targetSet.rpe);
          targetSet.estimatedOneRm = calc.estimatedOneRm;
        }
      }

      setsCopy[setIdx] = targetSet;
      exercise.sets = setsCopy;
      copy[exIdx] = exercise;
      return copy;
    });
  };

  // Add extra set to exercise
  const addSetToExercise = (exIdx: number) => {
    setSessionExercises((prev) => {
      const copy = [...prev];
      const exercise = { ...copy[exIdx] };
      const lastSet = exercise.sets[exercise.sets.length - 1];
      const newSet: LiveSetState = {
        setNumber: exercise.sets.length + 1,
        weight: lastSet ? lastSet.weight : 0,
        reps: lastSet ? lastSet.reps : 10,
        rpe: lastSet ? lastSet.rpe : 8,
        completed: false,
        volume: 0,
      };
      exercise.sets = [...exercise.sets, newSet];
      copy[exIdx] = exercise;
      return copy;
    });
  };

  // Remove set from exercise
  const removeSetFromExercise = (exIdx: number, setIdx: number) => {
    setSessionExercises((prev) => {
      const copy = [...prev];
      const exercise = { ...copy[exIdx] };
      if (exercise.sets.length <= 1) return prev;
      exercise.sets = exercise.sets
        .filter((_, idx) => idx !== setIdx)
        .map((s, idx) => ({ ...s, setNumber: idx + 1 }));
      copy[exIdx] = exercise;
      return copy;
    });
  };

  // Live session statistics
  const sessionStats = useMemo(() => {
    let totalVol = 0;
    let completedSetsCount = 0;
    let totalSetsCount = 0;

    sessionExercises.forEach((ex) => {
      ex.sets.forEach((s) => {
        totalSetsCount++;
        if (s.completed) {
          completedSetsCount++;
          totalVol += (Number(s.weight) || 0) * (Number(s.reps) || 0);
        }
      });
    });

    return { totalVol, completedSetsCount, totalSetsCount };
  }, [sessionExercises]);

  // Finish and save workout log to database
  const finishAndSaveWorkout = async () => {
    if (!member?.id) {
      toast.error('Member profile not loaded');
      return;
    }

    if (sessionStats.completedSetsCount === 0) {
      toast.error('Complete at least one set before saving your session.');
      return;
    }

    try {
      setSavingLog(true);

      const payloadSets: any[] = [];
      sessionExercises.forEach((ex) => {
        ex.sets
          .filter((s) => s.completed)
          .forEach((s) => {
            payloadSets.push({
              exerciseId: ex.exerciseId,
              exerciseName: ex.name,
              setNumber: s.setNumber,
              weight: Number(s.weight) || 0,
              reps: Number(s.reps) || 0,
              rpe: s.rpe,
            });
          });
      });

      const durationMins = Math.max(1, Math.round(sessionDuration / 60));

      const res = await fetch('/api/workouts/log', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          member_id: member.id,
          session_name: currentDay?.name || selectedRoutine.name,
          routine_id: (selectedRoutine as any).id || null,
          duration_minutes: durationMins,
          sets: payloadSets,
          notes: sessionNotes,
        }),
      });

      const resJson = await res.json();

      if (!res.ok || !resJson.success) {
        throw new Error(resJson.error || 'Failed to record workout session');
      }

      setCompletedSessionSummary({
        sessionName: currentDay?.name || selectedRoutine.name,
        durationMinutes: durationMins,
        totalVolumeKg: resJson.log?.total_volume_kg || sessionStats.totalVol,
        setsCount: payloadSets.length,
        estimatedOneRms: resJson.estimatedOneRms || {},
      });

      setIsLoggingActive(false);
      setSessionExercises([]);
      setRestSecondsLeft(null);
      playChime();
      toast.success('Workout logged successfully! Great job!');

      // Refresh history in background
      fetchWorkoutHistory(member.id);
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || 'Error recording workout');
    } finally {
      setSavingLog(false);
    }
  };

  // Barbell Plate Calculation
  const plateResult: PlateCalculationResult = useMemo(() => {
    return calculateBarbellPlates(plateTargetWeight, {
      barWeight: plateBarWeight,
      unit: 'kg',
    });
  }, [plateTargetWeight, plateBarWeight]);

  // 1RM Calculation
  const oneRmResult = useMemo(() => {
    if (oneRmWeight <= 0 || oneRmReps <= 0) return null;
    try {
      return estimateOneRepMax(oneRmWeight, oneRmReps, oneRmFormula, oneRmRpe);
    } catch {
      return null;
    }
  }, [oneRmWeight, oneRmReps, oneRmFormula, oneRmRpe]);

  // Format seconds to mm:ss
  const formatTimer = (totalSec: number) => {
    const mins = Math.floor(totalSec / 60);
    const secs = totalSec % 60;
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  };

  if (loading) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <Loader2 className="h-7 w-7 animate-spin text-purple-500" />
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-4xl mx-auto pb-12">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 bg-zinc-900/60 p-4 rounded-2xl border border-zinc-800/80">
        <div>
          <div className="flex items-center gap-2">
            <Badge className="bg-purple-950/80 text-purple-300 border border-purple-800/30 text-[10px] font-mono">
              openGym Fitness OS
            </Badge>
            {isLoggingActive && (
              <Badge className="bg-emerald-950/80 text-emerald-400 border border-emerald-800/30 text-[10px] animate-pulse">
                Workout in Progress
              </Badge>
            )}
          </div>
          <h1 className="text-xl sm:text-2xl font-black text-zinc-100 tracking-tight mt-1">
            Workout Companion
          </h1>
          <p className="text-zinc-400 text-xs mt-0.5">
            Interactive training logger, Olympic barbell plate math, and 1RM power estimator.
          </p>
        </div>

        {/* Global Workout Duration Counter */}
        {isLoggingActive && (
          <div className="flex items-center gap-2 bg-zinc-950/80 px-3 py-2 rounded-xl border border-zinc-800 font-mono">
            <Clock className="w-4 h-4 text-purple-400 animate-spin" />
            <span className="text-sm font-extrabold text-zinc-100">{formatTimer(sessionDuration)}</span>
          </div>
        )}
      </div>

      {/* Navigation Tabs */}
      <div className="flex rounded-xl bg-zinc-900/40 p-1 border border-zinc-800/80 overflow-x-auto text-xs font-semibold gap-1">
        <button
          onClick={() => setActiveTab('workout')}
          className={`flex-1 min-w-[110px] py-2 px-3 rounded-lg flex items-center justify-center gap-1.5 transition-colors ${
            activeTab === 'workout'
              ? 'bg-purple-600 text-white shadow-sm'
              : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/40'
          }`}
        >
          <Dumbbell className="w-3.5 h-3.5" />
          <span>Training Plan</span>
        </button>

        <button
          onClick={() => setActiveTab('plates')}
          className={`flex-1 min-w-[110px] py-2 px-3 rounded-lg flex items-center justify-center gap-1.5 transition-colors ${
            activeTab === 'plates'
              ? 'bg-purple-600 text-white shadow-sm'
              : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/40'
          }`}
        >
          <Calculator className="w-3.5 h-3.5" />
          <span>Barbell Plates</span>
        </button>

        <button
          onClick={() => setActiveTab('onerm')}
          className={`flex-1 min-w-[110px] py-2 px-3 rounded-lg flex items-center justify-center gap-1.5 transition-colors ${
            activeTab === 'onerm'
              ? 'bg-purple-600 text-white shadow-sm'
              : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/40'
          }`}
        >
          <Trophy className="w-3.5 h-3.5" />
          <span>1RM Estimator</span>
        </button>

        <button
          onClick={() => setActiveTab('history')}
          className={`flex-1 min-w-[110px] py-2 px-3 rounded-lg flex items-center justify-center gap-1.5 transition-colors ${
            activeTab === 'history'
              ? 'bg-purple-600 text-white shadow-sm'
              : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/40'
          }`}
        >
          <BarChart3 className="w-3.5 h-3.5" />
          <span>Session Logs</span>
        </button>
      </div>

      {/* Floating Rest Timer Notification */}
      {restSecondsLeft !== null && (
        <div className="fixed bottom-20 sm:bottom-6 right-4 sm:right-6 z-50 bg-zinc-950/95 border border-purple-500/40 shadow-2xl shadow-purple-950/50 p-3.5 rounded-2xl flex items-center gap-3 backdrop-blur animate-in slide-in-from-bottom-4">
          <div className="relative flex items-center justify-center w-10 h-10 rounded-xl bg-purple-950/60 border border-purple-800/40 text-purple-300 font-mono font-black text-sm">
            {restSecondsLeft}s
          </div>
          <div>
            <div className="text-[11px] font-bold text-zinc-200">Rest Timer Active</div>
            <div className="text-[9px] text-zinc-400">Catch your breath before the next set</div>
          </div>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => setRestSecondsLeft(null)}
            className="text-xs h-7 px-2 text-zinc-400 hover:text-white"
          >
            Skip
          </Button>
        </div>
      )}

      {/* TAB 1: WORKOUT PLAN & LIVE LOGGER */}
      {activeTab === 'workout' && (
        <div className="space-y-6">
          {/* Post-Workout Completion Summary Alert */}
          {completedSessionSummary && (
            <Card className="border-emerald-900/60 bg-emerald-950/20">
              <CardContent className="pt-5 pb-5 space-y-3">
                <div className="flex items-center gap-2.5 text-emerald-400">
                  <CheckCircle2 className="w-5 h-5" />
                  <h3 className="font-extrabold text-sm text-zinc-100">
                    Session Logged: {completedSessionSummary.sessionName}
                  </h3>
                </div>
                <div className="grid grid-cols-3 gap-2 text-center pt-2">
                  <div className="bg-zinc-900/80 p-2.5 rounded-xl border border-zinc-800">
                    <span className="text-[10px] text-zinc-500 uppercase font-mono block">Duration</span>
                    <span className="text-sm font-extrabold text-zinc-100">
                      {completedSessionSummary.durationMinutes} min
                    </span>
                  </div>
                  <div className="bg-zinc-900/80 p-2.5 rounded-xl border border-zinc-800">
                    <span className="text-[10px] text-zinc-500 uppercase font-mono block">Volume</span>
                    <span className="text-sm font-extrabold text-purple-400">
                      {completedSessionSummary.totalVolumeKg} kg
                    </span>
                  </div>
                  <div className="bg-zinc-900/80 p-2.5 rounded-xl border border-zinc-800">
                    <span className="text-[10px] text-zinc-500 uppercase font-mono block">Sets Done</span>
                    <span className="text-sm font-extrabold text-emerald-400">
                      {completedSessionSummary.setsCount}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Program & Day Selector (when not actively logging) */}
          {!isLoggingActive ? (
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                {/* Routine Dropdown */}
                <div className="flex items-center gap-2 w-full sm:w-auto">
                  <span className="text-xs text-zinc-400 font-semibold whitespace-nowrap">Program:</span>
                  <select
                    value={selectedRoutine.name}
                    onChange={(e) => {
                      const found = allRoutines.find((r) => r.name === e.target.value);
                      if (found) {
                        setSelectedRoutine(found);
                        setSelectedDayIndex(0);
                      }
                    }}
                    className="w-full sm:w-64 bg-zinc-900 border border-zinc-800 text-zinc-200 text-xs rounded-xl px-3 py-2 font-medium focus:outline-none focus:border-purple-500"
                  >
                    {allRoutines.map((r, i) => (
                      <option key={i} value={r.name}>
                        {r.name}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Start Workout Action */}
                <Button
                  onClick={startLiveWorkout}
                  className="w-full sm:w-auto bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs h-9 px-4 rounded-xl flex items-center justify-center gap-2 shadow-lg shadow-purple-900/30"
                >
                  <Play className="w-3.5 h-3.5 fill-current" />
                  <span>Start Today&apos;s Workout</span>
                </Button>
              </div>

              {/* Day Tabs */}
              {normalizedDays && normalizedDays.length > 1 && (
                <div className="flex gap-2 overflow-x-auto pb-1">
                  {normalizedDays.map((d, idx) => (
                    <button
                      key={idx}
                      onClick={() => setSelectedDayIndex(idx)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors ${
                        selectedDayIndex === idx
                          ? 'bg-zinc-800 text-purple-400 border border-purple-500/40'
                          : 'bg-zinc-900/40 text-zinc-400 hover:text-zinc-200 border border-zinc-800/40'
                      }`}
                    >
                      {d.name}
                    </button>
                  ))}
                </div>
              )}

              {/* Day Routine Preview Cards */}
              {currentDay && (
                <div className="space-y-3">
                  <div className="flex justify-between items-center px-1">
                    <h2 className="text-sm font-extrabold text-zinc-200 uppercase tracking-wide">
                      {currentDay.name} ({currentDay.exercises.length} Exercises)
                    </h2>
                    <span className="text-xs text-zinc-500 font-mono">
                      Target Rest: 60-120s
                    </span>
                  </div>

                  <div className="grid gap-3">
                    {currentDay.exercises.map((ex, idx) => (
                      <Card key={idx} className="border-zinc-900 bg-zinc-900/40 hover:border-zinc-800 transition-colors">
                        <CardContent className="p-4 flex flex-col sm:flex-row justify-between sm:items-center gap-3">
                          <div className="space-y-1">
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-bold text-purple-400 font-mono">#{idx + 1}</span>
                              <h3 className="text-sm font-extrabold text-zinc-100">{ex.name}</h3>
                            </div>
                            {ex.notes && (
                              <p className="text-[11px] text-zinc-500 italic">{ex.notes}</p>
                            )}
                          </div>

                          <div className="flex items-center gap-2 text-right">
                            <Badge className="bg-zinc-800/80 text-zinc-300 text-[10px] font-mono border border-zinc-700/50">
                              {ex.sets} Sets &times; {ex.reps} Reps
                            </Badge>
                            <Badge className="bg-purple-950/40 text-purple-400 text-[10px] font-mono border border-purple-900/30">
                              {ex.restSeconds || 90}s rest
                            </Badge>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : (
            /* LIVE INTERACTIVE LOGGING COCKPIT */
            <div className="space-y-6">
              {/* Sticky Progress Bar */}
              <div className="bg-zinc-900/90 border border-purple-900/50 p-3.5 rounded-2xl flex flex-col sm:flex-row justify-between sm:items-center gap-3 sticky top-16 z-30 backdrop-blur">
                <div>
                  <div className="text-xs font-bold text-zinc-100 flex items-center gap-2">
                    <Flame className="w-4 h-4 text-orange-400" />
                    <span>{currentDay?.name}</span>
                  </div>
                  <div className="text-[10px] text-zinc-400 font-mono mt-0.5">
                    Completed Sets: {sessionStats.completedSetsCount} / {sessionStats.totalSetsCount} • Volume:{' '}
                    <strong className="text-purple-400">{sessionStats.totalVol} kg</strong>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      if (confirm('Discard workout in progress?')) {
                        setIsLoggingActive(false);
                        setSessionExercises([]);
                      }
                    }}
                    className="text-xs h-8 text-zinc-400 hover:text-red-400"
                  >
                    Cancel
                  </Button>
                  <Button
                    size="sm"
                    onClick={finishAndSaveWorkout}
                    disabled={savingLog}
                    className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs h-8 px-4 flex items-center gap-1.5"
                  >
                    {savingLog ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                    <span>Finish Workout</span>
                  </Button>
                </div>
              </div>

              {/* Interactive Exercises List */}
              <div className="space-y-5">
                {sessionExercises.map((ex, exIdx) => (
                  <Card key={ex.exerciseId} className="border-zinc-850 bg-zinc-900/40 overflow-hidden">
                    <CardHeader className="py-3 px-4 bg-zinc-900/70 border-b border-zinc-800/80 flex flex-row justify-between items-center">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-purple-400 font-mono">#{exIdx + 1}</span>
                          <CardTitle className="text-sm font-extrabold text-zinc-100">{ex.name}</CardTitle>
                        </div>
                        <CardDescription className="text-[10px] text-zinc-400">
                          Target: {ex.targetSets} sets &times; {ex.targetReps} reps • Rest: {ex.restSeconds}s
                        </CardDescription>
                      </div>

                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => addSetToExercise(exIdx)}
                        className="text-xs h-7 px-2 text-purple-400 hover:text-purple-300 hover:bg-purple-950/40 flex items-center gap-1"
                      >
                        <Plus className="w-3 h-3" />
                        <span>Add Set</span>
                      </Button>
                    </CardHeader>

                    <CardContent className="p-4 space-y-2.5">
                      {/* Sets Table Header */}
                      <div className="grid grid-cols-12 gap-2 text-[10px] font-mono text-zinc-500 uppercase px-1">
                        <div className="col-span-2">Set</div>
                        <div className="col-span-3">Weight (kg)</div>
                        <div className="col-span-3">Reps</div>
                        <div className="col-span-2">RPE</div>
                        <div className="col-span-2 text-right">Done</div>
                      </div>

                      {/* Sets Rows */}
                      {ex.sets.map((set, setIdx) => (
                        <div
                          key={setIdx}
                          className={`grid grid-cols-12 gap-2 items-center p-2 rounded-xl border transition-all ${
                            set.completed
                              ? 'bg-purple-950/20 border-purple-900/40 text-purple-100'
                              : 'bg-zinc-950/50 border-zinc-800/60 text-zinc-200'
                          }`}
                        >
                          <div className="col-span-2 flex items-center gap-1 font-mono text-xs font-bold">
                            <span>#{set.setNumber}</span>
                            {ex.sets.length > 1 && !set.completed && (
                              <button
                                onClick={() => removeSetFromExercise(exIdx, setIdx)}
                                className="text-zinc-600 hover:text-red-400 p-0.5"
                                title="Remove set"
                              >
                                <Trash2 className="w-3 h-3" />
                              </button>
                            )}
                          </div>

                          <div className="col-span-3">
                            <Input
                              type="number"
                              min={0}
                              step={0.5}
                              value={set.weight === 0 ? '' : set.weight}
                              onChange={(e) =>
                                updateSetField(exIdx, setIdx, 'weight', parseFloat(e.target.value) || 0)
                              }
                              placeholder="0"
                              className="h-8 text-xs font-mono bg-zinc-900 border-zinc-800 text-center"
                            />
                          </div>

                          <div className="col-span-3">
                            <Input
                              type="number"
                              min={1}
                              value={set.reps === 0 ? '' : set.reps}
                              onChange={(e) =>
                                updateSetField(exIdx, setIdx, 'reps', parseInt(e.target.value, 10) || 0)
                              }
                              placeholder="10"
                              className="h-8 text-xs font-mono bg-zinc-900 border-zinc-800 text-center"
                            />
                          </div>

                          <div className="col-span-2">
                            <select
                              value={set.rpe || 8}
                              onChange={(e) =>
                                updateSetField(exIdx, setIdx, 'rpe', parseInt(e.target.value, 10) || 8)
                              }
                              className="w-full h-8 bg-zinc-900 border border-zinc-800 text-zinc-200 text-[10px] rounded-md font-mono text-center focus:outline-none"
                            >
                              {[6, 7, 8, 9, 10].map((rpeVal) => (
                                <option key={rpeVal} value={rpeVal}>
                                  @{rpeVal}
                                </option>
                              ))}
                            </select>
                          </div>

                          <div className="col-span-2 flex justify-end">
                            <Button
                              size="sm"
                              onClick={() => toggleSetComplete(exIdx, setIdx)}
                              className={`h-8 w-8 p-0 rounded-lg ${
                                set.completed
                                  ? 'bg-purple-600 hover:bg-purple-500 text-white'
                                  : 'bg-zinc-800 hover:bg-zinc-700 text-zinc-400'
                              }`}
                            >
                              <Check className="w-4 h-4" />
                            </Button>
                          </div>

                          {/* Set Metrics pill when completed */}
                          {set.completed && set.volume > 0 && (
                            <div className="col-span-12 text-[10px] text-purple-300 font-mono flex items-center justify-between pt-1 border-t border-purple-900/30">
                              <span>Volume: {set.volume} kg</span>
                              {set.estimatedOneRm && <span>Est 1RM: {set.estimatedOneRm} kg</span>}
                            </div>
                          )}
                        </div>
                      ))}
                    </CardContent>
                  </Card>
                ))}

                {/* Session Coach Notes Input */}
                <div className="space-y-1.5">
                  <label className="text-xs text-zinc-400 font-semibold">Workout Notes (optional)</label>
                  <textarea
                    rows={2}
                    value={sessionNotes}
                    onChange={(e) => setSessionNotes(e.target.value)}
                    placeholder="E.g., Bench felt explosive, hit new PR on top set, form felt solid."
                    className="w-full bg-zinc-900/60 border border-zinc-800 rounded-xl p-3 text-xs text-zinc-200 placeholder-zinc-600 focus:outline-none focus:border-purple-500"
                  />
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* TAB 2: OLYMPIC BARBELL PLATE CALCULATOR */}
      {activeTab === 'plates' && (
        <div className="space-y-5">
          <Card className="border-zinc-800 bg-zinc-900/40">
            <CardHeader className="pb-3">
              <div className="flex items-center gap-2">
                <Calculator className="w-5 h-5 text-purple-400" />
                <CardTitle className="text-base font-extrabold text-zinc-100">
                  Olympic Barbell Plate Math
                </CardTitle>
              </div>
              <CardDescription className="text-xs text-zinc-400">
                Solves exact plate loading per sleeve using standard metric gym disks (25, 20, 15, 10, 5, 2.5, 1.25 kg).
              </CardDescription>
            </CardHeader>

            <CardContent className="space-y-5">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Target Weight */}
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-zinc-300">Target Total Weight (kg)</label>
                  <Input
                    type="number"
                    min={plateBarWeight}
                    step={2.5}
                    value={plateTargetWeight}
                    onChange={(e) => setPlateTargetWeight(parseFloat(e.target.value) || 0)}
                    className="font-mono text-base font-bold bg-zinc-900 border-zinc-800"
                  />
                  {/* Quick increment buttons */}
                  <div className="flex gap-1.5 pt-1">
                    {[2.5, 5, 10, 20].map((inc) => (
                      <button
                        key={inc}
                        onClick={() => setPlateTargetWeight((w) => w + inc)}
                        className="text-[10px] font-mono px-2 py-1 rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-300"
                      >
                        +{inc}kg
                      </button>
                    ))}
                    <button
                      onClick={() => setPlateTargetWeight(plateBarWeight)}
                      className="text-[10px] font-mono px-2 py-1 rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-300"
                    >
                      Bar Only
                    </button>
                  </div>
                </div>

                {/* Bar Type */}
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-zinc-300">Barbell Type</label>
                  <select
                    value={plateBarWeight}
                    onChange={(e) => setPlateBarWeight(parseFloat(e.target.value) || 20)}
                    className="w-full h-10 bg-zinc-900 border border-zinc-800 text-zinc-200 text-xs rounded-md px-3 font-medium focus:outline-none"
                  >
                    <option value={20}>Olympic Standard Bar (20 kg)</option>
                    <option value={15}>Women / Technique Bar (15 kg)</option>
                    <option value={10}>EZ-Curl Bar (10 kg)</option>
                    <option value={7}>Smith Machine Counterbalance (7 kg)</option>
                  </select>
                </div>
              </div>

              {/* Plate Loading Calculation Result */}
              <div className="bg-zinc-950/80 p-4 rounded-xl border border-zinc-800/80 space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-xs font-bold text-zinc-400 uppercase tracking-wider">
                    Plates Per Side (Sleeve)
                  </span>
                  <Badge className="bg-purple-950/80 text-purple-300 font-mono text-[10px] border border-purple-800/40">
                    {plateResult.weightPerSide} kg per side
                  </Badge>
                </div>

                {/* Visual Barbell Plate Stack */}
                <div className="flex items-center gap-1.5 overflow-x-auto py-2">
                  <div className="w-4 h-16 bg-zinc-700 rounded-l-md border-r-2 border-zinc-950" title="Barbell Collar" />
                  {plateResult.platesPerSide.length === 0 ? (
                    <div className="text-xs text-zinc-500 italic py-4">No plates needed (bar weight matches target).</div>
                  ) : (
                    plateResult.platesPerSide.flatMap((p) =>
                      Array.from({ length: p.count }, (_, i) => {
                        const colorMap: Record<number, string> = {
                          25: 'bg-red-600 border-red-400 text-white',
                          20: 'bg-blue-600 border-blue-400 text-white',
                          15: 'bg-yellow-500 border-yellow-300 text-zinc-950',
                          10: 'bg-emerald-600 border-emerald-400 text-white',
                          5: 'bg-zinc-100 border-zinc-300 text-zinc-950',
                          2.5: 'bg-zinc-800 border-zinc-600 text-zinc-200',
                          1.25: 'bg-zinc-400 border-zinc-300 text-zinc-950',
                        };
                        const heightMap: Record<number, string> = {
                          25: 'h-24 w-8',
                          20: 'h-20 w-8',
                          15: 'h-18 w-7',
                          10: 'h-16 w-6',
                          5: 'h-14 w-5',
                          2.5: 'h-12 w-4',
                          1.25: 'h-10 w-4',
                        };

                        return (
                          <div
                            key={`${p.plate}-${i}`}
                            className={`rounded-md flex items-center justify-center font-black font-mono text-[10px] border shadow-sm ${
                              colorMap[p.plate] || 'bg-zinc-800 text-white'
                            } ${heightMap[p.plate] || 'h-16 w-6'}`}
                            title={`${p.plate} kg`}
                          >
                            <span className="rotate-90 whitespace-nowrap">{p.plate}</span>
                          </div>
                        );
                      })
                    )
                  )}
                </div>

                {/* Text summary of plates */}
                <div className="text-xs text-zinc-300 font-mono">
                  Loading order:{' '}
                  <span className="font-bold text-purple-400">
                    {plateResult.displayString || 'Empty bar'}
                  </span>
                </div>

                {plateResult.remainder > 0 && (
                  <div className="text-[11px] text-amber-400 font-mono">
                    Note: Unloaded remainder of {plateResult.remainder} kg (smallest plate is 1.25 kg).
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* TAB 3: 1RM ESTIMATOR */}
      {activeTab === 'onerm' && (
        <div className="space-y-5">
          <Card className="border-zinc-800 bg-zinc-900/40">
            <CardHeader className="pb-3">
              <div className="flex items-center gap-2">
                <Trophy className="w-5 h-5 text-purple-400" />
                <CardTitle className="text-base font-extrabold text-zinc-100">
                  1-Rep Maximum (1RM) Estimator
                </CardTitle>
              </div>
              <CardDescription className="text-xs text-zinc-400">
                Exercise science calculation calibrated with RPE (Rate of Perceived Exertion).
              </CardDescription>
            </CardHeader>

            <CardContent className="space-y-5">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-zinc-300">Lift Weight (kg)</label>
                  <Input
                    type="number"
                    min={1}
                    value={oneRmWeight}
                    onChange={(e) => setOneRmWeight(parseFloat(e.target.value) || 0)}
                    className="font-mono text-base font-bold bg-zinc-900 border-zinc-800"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-zinc-300">Completed Reps</label>
                  <Input
                    type="number"
                    min={1}
                    max={15}
                    value={oneRmReps}
                    onChange={(e) => setOneRmReps(parseInt(e.target.value, 10) || 0)}
                    className="font-mono text-base font-bold bg-zinc-900 border-zinc-800"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-zinc-300">RPE (Exertion)</label>
                  <select
                    value={oneRmRpe}
                    onChange={(e) => setOneRmRpe(parseInt(e.target.value, 10) || 10)}
                    className="w-full h-10 bg-zinc-900 border border-zinc-800 text-zinc-200 text-xs rounded-md px-3 font-mono focus:outline-none"
                  >
                    <option value={10}>10 - Maximum (0 Reps in Reserve)</option>
                    <option value={9}>9 - Heavy (1 Rep in Reserve)</option>
                    <option value={8}>8 - Moderate (2 Reps in Reserve)</option>
                    <option value={7}>7 - Light (3 Reps in Reserve)</option>
                  </select>
                </div>
              </div>

              {/* 1RM Result Dashboard */}
              {oneRmResult && (
                <div className="space-y-4">
                  <div className="bg-gradient-to-r from-purple-950/40 to-zinc-900 border border-purple-800/40 p-5 rounded-2xl flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                    <div>
                      <span className="text-[10px] text-purple-300 font-mono uppercase tracking-wider">
                        Estimated Single Rep Maximum
                      </span>
                      <div className="text-3xl font-black text-zinc-100 font-mono mt-0.5">
                        {oneRmResult.estimatedOneRm} <span className="text-lg text-purple-400">kg</span>
                      </div>
                    </div>

                    <div className="flex gap-2">
                      {(['epley', 'brzycki', 'lander', 'lombardi'] as OneRmFormula[]).map((f) => (
                        <button
                          key={f}
                          onClick={() => setOneRmFormula(f)}
                          className={`text-[10px] font-mono uppercase px-2.5 py-1 rounded-lg border transition-colors ${
                            oneRmFormula === f
                              ? 'bg-purple-600 text-white border-purple-500'
                              : 'bg-zinc-900 text-zinc-400 border-zinc-800 hover:text-zinc-200'
                          }`}
                        >
                          {f}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Percentage Splits Table */}
                  <div className="space-y-2">
                    <span className="text-xs font-bold text-zinc-400 uppercase tracking-wider block">
                      Training Percentage Zones
                    </span>
                    <div className="grid grid-cols-2 sm:grid-cols-6 gap-2 text-center font-mono">
                      <div className="bg-zinc-900/60 p-2.5 rounded-xl border border-zinc-800">
                        <span className="text-[10px] text-zinc-500 block">95% (~2 reps)</span>
                        <span className="text-xs font-bold text-zinc-100">{oneRmResult.percentages.ninetyFive}kg</span>
                      </div>
                      <div className="bg-zinc-900/60 p-2.5 rounded-xl border border-zinc-800">
                        <span className="text-[10px] text-zinc-500 block">90% (~3-4 reps)</span>
                        <span className="text-xs font-bold text-zinc-100">{oneRmResult.percentages.ninety}kg</span>
                      </div>
                      <div className="bg-zinc-900/60 p-2.5 rounded-xl border border-zinc-800">
                        <span className="text-[10px] text-zinc-500 block">85% (~5-6 reps)</span>
                        <span className="text-xs font-bold text-zinc-100">{oneRmResult.percentages.eightyFive}kg</span>
                      </div>
                      <div className="bg-zinc-900/60 p-2.5 rounded-xl border border-zinc-800">
                        <span className="text-[10px] text-zinc-500 block">80% (~7-8 reps)</span>
                        <span className="text-xs font-bold text-zinc-100">{oneRmResult.percentages.eighty}kg</span>
                      </div>
                      <div className="bg-zinc-900/60 p-2.5 rounded-xl border border-zinc-800">
                        <span className="text-[10px] text-zinc-500 block">75% (~9-10 reps)</span>
                        <span className="text-xs font-bold text-zinc-100">{oneRmResult.percentages.seventyFive}kg</span>
                      </div>
                      <div className="bg-zinc-900/60 p-2.5 rounded-xl border border-zinc-800">
                        <span className="text-[10px] text-zinc-500 block">70% (~11-12 reps)</span>
                        <span className="text-xs font-bold text-zinc-100">{oneRmResult.percentages.seventy}kg</span>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* TAB 4: WORKOUT HISTORY & VOLUME LOGS */}
      {activeTab === 'history' && (
        <div className="space-y-4">
          <div className="flex justify-between items-center px-1">
            <h2 className="text-sm font-extrabold text-zinc-200 uppercase tracking-wide">
              Recent Workout Sessions
            </h2>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => member?.id && fetchWorkoutHistory(member.id)}
              disabled={loadingHistory}
              className="text-xs h-7 px-2 text-zinc-400 hover:text-white"
            >
              <RotateCcw className={`w-3 h-3 mr-1 ${loadingHistory ? 'animate-spin' : ''}`} />
              <span>Refresh</span>
            </Button>
          </div>

          {loadingHistory ? (
            <div className="flex h-32 items-center justify-center">
              <Loader2 className="h-6 w-6 animate-spin text-purple-500" />
            </div>
          ) : historyLogs.length === 0 ? (
            <Card className="border-zinc-900 bg-zinc-900/20 text-center py-8">
              <CardContent className="space-y-2">
                <Dumbbell className="w-8 h-8 text-zinc-600 mx-auto" />
                <p className="text-xs text-zinc-400 font-semibold">No workout sessions logged yet.</p>
                <p className="text-[11px] text-zinc-500">
                  Start your first training session from the Training Plan tab to track your volume!
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {historyLogs.map((log) => {
                const isExpanded = expandedLogId === log.id;
                return (
                  <Card key={log.id} className="border-zinc-900 bg-zinc-900/40 overflow-hidden">
                    <CardHeader
                      onClick={() => setExpandedLogId(isExpanded ? null : log.id)}
                      className="p-4 cursor-pointer hover:bg-zinc-900/60 transition-colors flex flex-row justify-between items-center"
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <CardTitle className="text-sm font-extrabold text-zinc-100">
                            {log.session_name}
                          </CardTitle>
                          <Badge className="bg-purple-950/60 text-purple-300 text-[10px] font-mono border border-purple-800/30">
                            {log.total_volume_kg} kg volume
                          </Badge>
                        </div>
                        <div className="flex items-center gap-2 text-[10px] text-zinc-500 font-mono">
                          <span className="flex items-center gap-1">
                            <Calendar className="w-3 h-3" />
                            {log.date}
                          </span>
                          <span>•</span>
                          <span className="flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {log.duration_minutes} min
                          </span>
                        </div>
                      </div>

                      <div className="text-zinc-500">
                        {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                      </div>
                    </CardHeader>

                    {isExpanded && log.sets && (
                      <CardContent className="pt-0 px-4 pb-4 border-t border-zinc-800/60 bg-zinc-950/40 space-y-3">
                        {log.notes && (
                          <div className="text-xs text-zinc-400 italic pt-2">
                            Notes: &ldquo;{log.notes}&rdquo;
                          </div>
                        )}

                        <div className="space-y-1.5 pt-2">
                          <span className="text-[10px] font-mono text-zinc-500 uppercase block">Completed Sets:</span>
                          <div className="grid gap-1">
                            {log.sets.map((s: any, idx: number) => (
                              <div
                                key={idx}
                                className="flex justify-between items-center text-xs py-1 px-2 rounded bg-zinc-900/50 font-mono"
                              >
                                <span className="font-semibold text-zinc-300">{s.exerciseName}</span>
                                <span className="text-purple-400 text-[11px]">
                                  Set #{s.setNumber}: {s.weight}kg &times; {s.reps} reps {s.rpe ? `@${s.rpe}` : ''}
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>
                      </CardContent>
                    )}
                  </Card>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
