'use client';

import React, { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Dumbbell, Loader2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

export default function MemberExercisePage() {
  const supabase = createClient();
  const [loading, setLoading] = useState(true);
  const [routine, setRoutine] = useState<any>(null);

  useEffect(() => {
    const fetchRoutine = async () => {
      try {
        setLoading(true);
        const { data: { user: authUser } } = await supabase.auth.getUser();
        if (!authUser) return;

        const { data } = await supabase
          .from('members')
          .select('*, exercise_charts(*)')
          .or(`auth_id.eq.${authUser.id},email.eq.${authUser.email}`)
          .single();

        if (data?.exercise_charts) {
          setRoutine(data.exercise_charts);
        } else {
          // Mock workout template fallback
          setRoutine({
            name: 'PPL Hypertrophy Routine',
            description: '5-Day muscle conditioning schedule.',
            days: [
              {
                day: 'Monday (Push A)',
                exercises: [
                  { name: 'Incline Dumbbell Press', sets: 4, reps: '8-12', rest_seconds: 90, notes: 'Focus on slow negatives' },
                  { name: 'Flat Bench Barbell Press', sets: 3, reps: '6-8', rest_seconds: 120, notes: 'Explosive lift' },
                  { name: 'Overhead Dumbbell Extension', sets: 3, reps: '12', rest_seconds: 60 }
                ]
              },
              {
                day: 'Tuesday (Pull A)',
                exercises: [
                  { name: 'Barbell Deadlifts', sets: 3, reps: '5', rest_seconds: 180, notes: 'Keep spine neutral' },
                  { name: 'Lat Pulldowns', sets: 4, reps: '10-12', rest_seconds: 90 },
                  { name: 'Incline Dumbbell Bicep Curls', sets: 3, reps: '12', rest_seconds: 60 }
                ]
              },
              {
                day: 'Wednesday (Legs A)',
                exercises: [
                  { name: 'Barbell Back Squats', sets: 4, reps: '6-8', rest_seconds: 150 },
                  { name: 'Leg Press machine', sets: 3, reps: '12', rest_seconds: 90 },
                  { name: 'Standing Calf Raises', sets: 4, reps: '15', rest_seconds: 60 }
                ]
              }
            ]
          });
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchRoutine();
  }, []);

  if (loading) {
    return (
      <div className="flex h-[50vh] items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-purple-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <span className="text-[10px] text-purple-400 font-extrabold uppercase tracking-widest">Training Schedules</span>
        <h2 className="text-xl font-black text-zinc-100">{routine?.name || 'Workout Program'}</h2>
        <p className="text-zinc-500 text-xs mt-1">{routine?.description || 'Your custom exercise splits assigned by branch trainers.'}</p>
      </div>

      {/* Routine Days Loop */}
      <div className="space-y-4">
        {routine?.days?.map((d: any, idx: number) => (
          <Card key={idx} className="border-zinc-900 bg-zinc-900/30 overflow-hidden">
            <CardHeader className="pb-3 border-b border-zinc-900/40 bg-zinc-900/10 flex flex-row justify-between items-center py-3.5">
              <CardTitle className="text-xs font-extrabold text-zinc-200 uppercase tracking-wide">{d.day}</CardTitle>
              <Badge className="bg-purple-950/60 text-purple-400 border border-purple-800/10 text-[9px]">
                {d.exercises?.length || 0} Exercises
              </Badge>
            </CardHeader>
            <CardContent className="pt-3 text-xs space-y-4">
              {d.exercises?.map((ex: any, i: number) => (
                <div key={i} className="space-y-1 py-1 border-b border-zinc-800 last:border-b-0 last:pb-0">
                  <div className="flex justify-between items-start">
                    <span className="font-semibold text-zinc-400 block">{ex.name}</span>
                    <span className="text-[10px] text-purple-400 font-bold font-mono">
                      {ex.sets} sets &times; {ex.reps}
                    </span>
                  </div>
                  <div className="flex justify-between text-[9px] text-zinc-500">
                    <span>Rest: {ex.rest_seconds || 60}s</span>
                    {ex.notes && <span className="italic truncate max-w-[200px]">Note: {ex.notes}</span>}
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
