'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Dumbbell,
  Volume2,
  X,
  Plus,
  Minus,
  Sparkles,
  Info,
} from 'lucide-react';
import {
  calculateBarbellPlates,
  PlateCalculationResult,
  STANDARD_BAR_WEIGHTS,
  WeightUnit,
} from '@/lib/workout/plate-calculator';
import { voiceAgent } from '@/lib/kiosk/voice-agent';
import { kioskAudio } from '@/components/kiosk/KioskAudio';
import { Button } from '@/components/ui/button';
import { DoubleBezelCard } from '@/components/ui/card';
import { cn } from '@/lib/utils';

const PLATE_COLORS: Record<number, { bg: string; border: string; text: string; height: string }> = {
  25: { bg: 'bg-red-600', border: 'border-red-400', text: 'text-white', height: 'h-24' },
  20: { bg: 'bg-blue-600', border: 'border-blue-400', text: 'text-white', height: 'h-22' },
  15: { bg: 'bg-yellow-500', border: 'border-yellow-300', text: 'text-black font-extrabold', height: 'h-20' },
  10: { bg: 'bg-emerald-600', border: 'border-emerald-400', text: 'text-white', height: 'h-18' },
  5: { bg: 'bg-zinc-200', border: 'border-zinc-400', text: 'text-black font-extrabold', height: 'h-14' },
  2.5: { bg: 'bg-zinc-800', border: 'border-zinc-600', text: 'text-zinc-200', height: 'h-12' },
  1.25: { bg: 'bg-zinc-400', border: 'border-zinc-300', text: 'text-black font-extrabold', height: 'h-10' },
  45: { bg: 'bg-blue-600', border: 'border-blue-400', text: 'text-white', height: 'h-24' },
  35: { bg: 'bg-yellow-500', border: 'border-yellow-300', text: 'text-black font-extrabold', height: 'h-20' },
};

interface KioskPlateCalculatorProps {
  isOpen: boolean;
  initialWeight?: number;
  initialUnit?: WeightUnit;
  onClose: () => void;
}

export function KioskPlateCalculator({
  isOpen,
  initialWeight = 80,
  initialUnit = 'kg',
  onClose,
}: KioskPlateCalculatorProps) {
  const [targetWeight, setTargetWeight] = useState<number>(initialWeight);
  const [unit, setUnit] = useState<WeightUnit>(initialUnit);
  const [barType, setBarType] = useState<keyof typeof STANDARD_BAR_WEIGHTS>('olympic_men');

  const barWeight = STANDARD_BAR_WEIGHTS[barType][unit];
  const result: PlateCalculationResult = calculateBarbellPlates(targetWeight, {
    barWeight,
    unit,
  });

  const handleAdjustWeight = (delta: number) => {
    kioskAudio.playTap();
    setTargetWeight((prev) => Math.max(barWeight, Math.round((prev + delta) * 10) / 10));
  };

  const handleSetQuickWeight = (val: number) => {
    kioskAudio.playTap();
    setTargetWeight(val);
  };

  const handleSpeakPlates = () => {
    kioskAudio.playTap();
    voiceAgent.speakPlateLoading(result);
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 15 }}
          transition={{ type: 'spring', stiffness: 350, damping: 30 }}
          className="w-full max-w-lg"
        >
          <DoubleBezelCard
            className="border-indigo-500/40 shadow-2xl"
            innerClassName="p-6 space-y-5 text-center relative"
          >
            {/* Close button */}
            <button
              type="button"
              onClick={() => {
                kioskAudio.playTap();
                onClose();
              }}
              className="absolute top-4 right-4 p-2 rounded-full bg-zinc-800/80 hover:bg-zinc-700 text-zinc-400 hover:text-white transition-colors"
            >
              <X className="size-4" />
            </button>

            {/* Header */}
            <div className="space-y-1">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/30 text-indigo-400 text-xs font-mono">
                <Dumbbell className="size-3.5" />
                <span>Barbell Plate Calculator</span>
              </div>
              <h3 className="text-xl font-bold tracking-tight text-white">
                Load Sleeve Config
              </h3>
            </div>

            {/* Target Weight Controls */}
            <div className="space-y-3">
              <div className="flex items-center justify-center gap-4">
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => handleAdjustWeight(-5)}
                  className="rounded-full size-12 bg-zinc-900 border-zinc-700 text-white hover:bg-zinc-800"
                >
                  <Minus className="size-5" />
                </Button>

                <div className="p-3 px-6 rounded-2xl bg-zinc-950 border border-border/80 min-w-[140px]">
                  <span className="text-4xl font-extrabold font-mono tracking-tight text-white">
                    {targetWeight}
                  </span>
                  <span className="text-xs font-mono text-zinc-400 ml-1.5 uppercase">
                    {unit}
                  </span>
                </div>

                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => handleAdjustWeight(5)}
                  className="rounded-full size-12 bg-zinc-900 border-zinc-700 text-white hover:bg-zinc-800"
                >
                  <Plus className="size-5" />
                </Button>
              </div>

              {/* Quick Steppers & Targets */}
              <div className="flex flex-wrap items-center justify-center gap-1.5 pt-1">
                {[-2.5, 2.5].map((delta) => (
                  <button
                    key={delta}
                    type="button"
                    onClick={() => handleAdjustWeight(delta)}
                    className="px-2.5 py-1 text-xs font-mono rounded-lg bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 text-zinc-300"
                  >
                    {delta > 0 ? `+${delta}` : delta} {unit}
                  </button>
                ))}
                {(unit === 'kg' ? [60, 80, 100, 120, 140] : [135, 185, 225, 275, 315]).map((val) => (
                  <button
                    key={val}
                    type="button"
                    onClick={() => handleSetQuickWeight(val)}
                    className={cn(
                      'px-2.5 py-1 text-xs font-mono rounded-lg border transition-colors',
                      targetWeight === val
                        ? 'bg-indigo-600 border-indigo-400 text-white font-bold'
                        : 'bg-zinc-900 hover:bg-zinc-800 border-zinc-800 text-zinc-400'
                    )}
                  >
                    {val}
                  </button>
                ))}
              </div>
            </div>

            {/* Visual Barbell Sleeve Representation */}
            <div className="p-4 rounded-xl bg-zinc-950/80 border border-border/70 space-y-3">
              <div className="flex items-center justify-between text-xs font-mono text-zinc-400 px-1">
                <span>Plates Per Side: <strong className="text-white">{result.weightPerSide} {unit}</strong></span>
                <span>Bar: <strong className="text-white">{barWeight} {unit}</strong></span>
              </div>

              {/* Sleeve Graphic */}
              <div className="relative h-28 flex items-center justify-center bg-zinc-900/60 rounded-lg p-2 overflow-x-auto">
                {/* Barbell Collar / Bar line */}
                <div className="absolute h-3 w-full bg-zinc-700 rounded-full" />
                <div className="absolute left-6 h-12 w-4 bg-zinc-500 rounded z-10 border border-zinc-400" />

                {/* Plates stack */}
                <div className="relative z-20 flex items-center gap-1 pl-12">
                  {result.platesPerSide.length === 0 ? (
                    <span className="text-xs font-mono text-zinc-500 py-4">
                      Empty Bar ({barWeight} {unit})
                    </span>
                  ) : (
                    result.platesPerSide.flatMap((item, idx) =>
                      Array.from({ length: item.count }).map((_, cIdx) => {
                        const style = PLATE_COLORS[item.plate] || {
                          bg: 'bg-zinc-600',
                          border: 'border-zinc-400',
                          text: 'text-white',
                          height: 'h-16',
                        };
                        return (
                          <div
                            key={`${idx}-${cIdx}`}
                            className={cn(
                              'w-7 flex flex-col items-center justify-center rounded border shadow-md transition-all',
                              style.bg,
                              style.border,
                              style.height
                            )}
                          >
                            <span className={cn('text-[9px] font-mono leading-none rotate-90 whitespace-nowrap', style.text)}>
                              {item.plate}
                            </span>
                          </div>
                        );
                      })
                    )
                  )}
                </div>
              </div>

              {/* Textual Sleeve Instruction */}
              <p className="text-xs font-mono text-emerald-400 font-medium">
                {result.displayString}
              </p>
              {result.remainder > 0 && (
                <p className="text-[11px] font-mono text-amber-400 flex items-center justify-center gap-1">
                  <Info className="size-3.5" />
                  Remainder: {result.remainder} {unit}
                </p>
              )}
            </div>

            {/* Action Buttons */}
            <div className="flex items-center gap-2 pt-1">
              <Button
                variant="outline"
                onClick={handleSpeakPlates}
                className="flex-1 bg-zinc-900 border-indigo-500/40 text-indigo-300 hover:text-white hover:bg-zinc-800"
              >
                <Volume2 className="size-4 mr-2 text-indigo-400" />
                <span>Speak Loading</span>
              </Button>

              <Button
                onClick={() => {
                  kioskAudio.playTap();
                  onClose();
                }}
                className="flex-1 bg-indigo-600 hover:bg-indigo-500 text-white font-medium"
              >
                Done
              </Button>
            </div>
          </DoubleBezelCard>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
