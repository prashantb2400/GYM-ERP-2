'use client';

import React, { useState } from 'react';
import {
  Dumbbell,
  Calculator,
  TrendingUp,
  Sparkles,
  Calendar,
  Share2,
  CheckCircle2,
  Clock,
  Layers,
  ArrowRight,
} from 'lucide-react';
import { calculateBarbellPlates } from '@/lib/workout/plate-calculator';
import { estimateOneRepMax } from '@/lib/workout/one-rep-max';
import { STARTER_ROUTINES, type StarterRoutine } from '@/lib/workout/exercise-types';

export default function WorkoutsDashboardPage() {
  // Plate Calculator State
  const [targetWeight, setTargetWeight] = useState<number>(100);
  const [selectedBar, setSelectedBar] = useState<number>(20);
  const plateResult = calculateBarbellPlates(targetWeight, { barWeight: selectedBar, unit: 'kg' });

  // 1RM Estimator State
  const [liftWeight, setLiftWeight] = useState<number>(100);
  const [liftReps, setLiftReps] = useState<number>(6);
  const [liftRpe, setLiftRpe] = useState<number>(9);
  const oneRmResult = estimateOneRepMax(liftWeight, liftReps, 'epley', liftRpe);

  // Selected Starter Routine
  const [selectedRoutine, setSelectedRoutine] = useState<StarterRoutine>(STARTER_ROUTINES[0]);
  const [copiedDay, setCopiedDay] = useState<string | null>(null);

  const handleShareWhatsApp = (routineName: string, dayName: string, exercises: any[]) => {
    const text =
      `🏋️ *GymERP Workout Prescription*\n` +
      `Program: *${routineName}*\n` +
      `Session: *${dayName}*\n\n` +
      exercises.map((ex, i) => `${i + 1}. *${ex.exerciseName}*: ${ex.sets} sets x ${ex.reps} reps (Rest: ${ex.restSeconds}s)`).join('\n') +
      `\n\nLog your workout on the GymERP member portal!`;

    const encoded = encodeURIComponent(text);
    window.open(`https://wa.me/?text=${encoded}`, '_blank');
  };

  return (
    <div className="space-y-8 p-6 max-w-7xl mx-auto text-zinc-100">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-zinc-800 pb-6">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2.5 py-0.5 rounded-full text-xs font-medium bg-orange-500/10 text-orange-400 border border-orange-500/20">
              openGym Exercise Science Engine
            </span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2">
            <Dumbbell className="w-6 h-6 text-orange-500" />
            Workout & Personal Training Hub
          </h1>
          <p className="text-sm text-zinc-400 mt-1">
            Prescribe scientific routines, calculate Olympic barbell plate loadings, and estimate 1RM targets.
          </p>
        </div>
      </div>

      {/* Grid: Plate Math & 1RM Calculator */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Tool 1: Barbell Plate Math Calculator */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5 shadow-lg">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Calculator className="w-5 h-5 text-orange-400" />
              <h2 className="font-semibold text-white">Barbell Plate Calculator</h2>
            </div>
            <span className="text-xs text-zinc-400 bg-zinc-800 px-2.5 py-1 rounded-md">
              Olympic Spec
            </span>
          </div>

          <div className="space-y-4">
            <div>
              <label className="text-xs text-zinc-400 font-medium block mb-1">Target Total Weight (kg)</label>
              <div className="flex items-center gap-3">
                <input
                  type="number"
                  min="20"
                  max="400"
                  step="2.5"
                  value={targetWeight}
                  onChange={(e) => setTargetWeight(Number(e.target.value) || 20)}
                  className="bg-zinc-950 border border-zinc-750 text-white text-lg font-bold px-3 py-2 rounded-lg w-32 outline-none focus:border-orange-500"
                />
                <input
                  type="range"
                  min="20"
                  max="250"
                  step="2.5"
                  value={targetWeight}
                  onChange={(e) => setTargetWeight(Number(e.target.value) || 20)}
                  className="w-full accent-orange-500"
                />
              </div>
            </div>

            <div>
              <label className="text-xs text-zinc-400 font-medium block mb-1.5">Bar Type</label>
              <div className="grid grid-cols-3 gap-2 text-xs">
                {[
                  { name: 'Olympic Bar (20kg)', weight: 20 },
                  { name: "Women's Bar (15kg)", weight: 15 },
                  { name: 'EZ Curl (10kg)', weight: 10 },
                ].map((bar) => (
                  <button
                    key={bar.weight}
                    onClick={() => setSelectedBar(bar.weight)}
                    className={`py-2 px-2.5 rounded-lg border text-center transition-all ${
                      selectedBar === bar.weight
                        ? 'bg-orange-500/20 border-orange-500 text-orange-300 font-semibold'
                        : 'bg-zinc-950 border-zinc-800 text-zinc-400 hover:text-zinc-200'
                    }`}
                  >
                    {bar.name}
                  </button>
                ))}
              </div>
            </div>

            {/* Calculated Plate Rack Visualization */}
            <div className="mt-4 p-4 rounded-xl bg-zinc-950 border border-zinc-800">
              <div className="text-xs text-zinc-400 mb-1">Load per Side:</div>
              <div className="text-lg font-bold text-orange-400 mb-3">
                {plateResult.displayString}
              </div>

              {/* Graphical Plate representation */}
              <div className="flex items-center gap-2 py-2 overflow-x-auto">
                <div className="h-14 w-2 bg-zinc-700 rounded-sm" title="Collar" />
                {plateResult.platesPerSide.flatMap((p) =>
                  Array.from({ length: p.count }).map((_, idx) => (
                    <div
                      key={`${p.plate}-${idx}`}
                      className="bg-gradient-to-b from-zinc-700 to-zinc-900 border border-orange-500/40 rounded flex items-center justify-center font-bold text-xs shadow"
                      style={{
                        height: `${Math.max(36, Math.min(68, p.plate * 2.4))}px`,
                        width: '32px',
                      }}
                    >
                      {p.plate}
                    </div>
                  ))
                )}
                <div className="h-4 w-16 bg-zinc-600 rounded-r-full" title="Bar Sleeve" />
              </div>
            </div>
          </div>
        </div>

        {/* Tool 2: 1RM Estimator & Load Percentages */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5 shadow-lg">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-emerald-400" />
              <h2 className="font-semibold text-white">One-Rep Max (1RM) Estimator</h2>
            </div>
            <span className="text-xs text-zinc-400 bg-zinc-800 px-2.5 py-1 rounded-md">
              Epley + RPE
            </span>
          </div>

          <div className="space-y-4">
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="text-xs text-zinc-400 block mb-1">Weight (kg)</label>
                <input
                  type="number"
                  min="1"
                  value={liftWeight}
                  onChange={(e) => setLiftWeight(Number(e.target.value) || 1)}
                  className="w-full bg-zinc-950 border border-zinc-800 text-white font-bold px-3 py-2 rounded-lg outline-none focus:border-emerald-500"
                />
              </div>
              <div>
                <label className="text-xs text-zinc-400 block mb-1">Reps</label>
                <input
                  type="number"
                  min="1"
                  max="15"
                  value={liftReps}
                  onChange={(e) => setLiftReps(Number(e.target.value) || 1)}
                  className="w-full bg-zinc-950 border border-zinc-800 text-white font-bold px-3 py-2 rounded-lg outline-none focus:border-emerald-500"
                />
              </div>
              <div>
                <label className="text-xs text-zinc-400 block mb-1">RPE (Exertion)</label>
                <select
                  value={liftRpe}
                  onChange={(e) => setLiftRpe(Number(e.target.value))}
                  className="w-full bg-zinc-950 border border-zinc-800 text-white font-bold px-3 py-2 rounded-lg outline-none focus:border-emerald-500"
                >
                  <option value={10}>10 (0 RIR - Limit)</option>
                  <option value={9}>9 (1 Rep in Reserve)</option>
                  <option value={8}>8 (2 Reps in Reserve)</option>
                  <option value={7}>7 (3 Reps in Reserve)</option>
                </select>
              </div>
            </div>

            {/* Estimated 1RM Callout */}
            <div className="p-4 rounded-xl bg-zinc-950 border border-zinc-800 flex items-center justify-between">
              <div>
                <div className="text-xs text-zinc-400">Estimated 1RM:</div>
                <div className="text-2xl font-black text-emerald-400">
                  {oneRmResult.estimatedOneRm} kg
                </div>
              </div>
              <div className="text-right text-xs text-zinc-400">
                <div>Formula: {oneRmResult.formula.toUpperCase()}</div>
                <div>RIR Adjusted: {10 - (oneRmResult.rpe || 10)} reps</div>
              </div>
            </div>

            {/* Training Percentages Grid */}
            <div>
              <div className="text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-2">
                Prescribed Target Zones
              </div>
              <div className="grid grid-cols-3 gap-2 text-xs">
                <div className="p-2.5 rounded-lg bg-zinc-950 border border-zinc-800">
                  <span className="text-zinc-500 block">90% (~3-4 reps)</span>
                  <span className="font-bold text-white text-sm">{oneRmResult.percentages.ninety} kg</span>
                </div>
                <div className="p-2.5 rounded-lg bg-zinc-950 border border-zinc-800">
                  <span className="text-zinc-500 block">80% (~7-8 reps)</span>
                  <span className="font-bold text-white text-sm">{oneRmResult.percentages.eighty} kg</span>
                </div>
                <div className="p-2.5 rounded-lg bg-zinc-950 border border-zinc-800">
                  <span className="text-zinc-500 block">70% (~10-12 reps)</span>
                  <span className="font-bold text-white text-sm">{oneRmResult.percentages.seventy} kg</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Starter Routines Prescription Builder */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6 shadow-lg">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
          <div>
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-orange-400" />
              Scientific Starter Routines
            </h2>
            <p className="text-xs text-zinc-400 mt-0.5">
              Select verified strength templates from openGym catalogue to prescribe to personal training clients.
            </p>
          </div>

          <div className="flex gap-2">
            {STARTER_ROUTINES.map((routine) => (
              <button
                key={routine.id}
                onClick={() => setSelectedRoutine(routine)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all ${
                  selectedRoutine.id === routine.id
                    ? 'bg-orange-500 text-white border-orange-500'
                    : 'bg-zinc-950 border-zinc-800 text-zinc-400 hover:text-white'
                }`}
              >
                {routine.name}
              </button>
            ))}
          </div>
        </div>

        {/* Routine Details & Days */}
        <div className="space-y-6">
          <div className="p-3.5 rounded-lg bg-zinc-950 border border-zinc-800/80 text-xs text-zinc-300">
            {selectedRoutine.description}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {selectedRoutine.days.map((day, idx) => (
              <div key={idx} className="bg-zinc-950 border border-zinc-800 rounded-xl p-4 flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between mb-3 border-b border-zinc-800 pb-2">
                    <span className="font-bold text-sm text-white">{day.dayName}</span>
                    <button
                      onClick={() => handleShareWhatsApp(selectedRoutine.name, day.dayName, day.exercises)}
                      className="p-1.5 rounded-md hover:bg-zinc-800 text-emerald-400 transition"
                      title="Share Day via WhatsApp"
                    >
                      <Share2 className="w-4 h-4" />
                    </button>
                  </div>

                  <ul className="space-y-2.5 mb-4">
                    {day.exercises.map((ex, exIdx) => (
                      <li key={exIdx} className="text-xs flex items-start justify-between gap-2">
                        <div>
                          <div className="font-medium text-zinc-200">{ex.exerciseName}</div>
                          <div className="text-[11px] text-zinc-500">Rest: {ex.restSeconds}s</div>
                        </div>
                        <span className="px-2 py-0.5 rounded bg-zinc-900 border border-zinc-800 font-semibold text-orange-400 text-[11px]">
                          {ex.sets} x {ex.reps}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>

                <button
                  onClick={() => handleShareWhatsApp(selectedRoutine.name, day.dayName, day.exercises)}
                  className="w-full py-2 rounded-lg bg-zinc-900 hover:bg-zinc-850 border border-zinc-800 text-xs font-semibold text-zinc-300 hover:text-white flex items-center justify-center gap-1.5 transition"
                >
                  <Share2 className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Send to Client via WhatsApp</span>
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
