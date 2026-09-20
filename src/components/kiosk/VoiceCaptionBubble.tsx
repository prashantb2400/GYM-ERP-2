'use client';

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { SoundWave } from '@/components/magicui/sound-wave';
import { cn } from '@/lib/utils';

interface VoiceCaptionBubbleProps {
  phrase: string;
  currentWord?: string;
  charIndex?: number;
  isSpeaking: boolean;
  audioLevel?: number;
  className?: string;
}

export function VoiceCaptionBubble({
  phrase,
  currentWord = '',
  charIndex = 0,
  isSpeaking,
  audioLevel = 0,
  className,
}: VoiceCaptionBubbleProps) {
  if (!phrase || !isSpeaking) return null;

  // Split phrase into words for active karaoke highlighting
  const words = phrase.split(/\s+/);
  const normalizedCurrent = currentWord.toLowerCase().replace(/[^a-z0-9]/g, '');

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: 14, scale: 0.96 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 8, scale: 0.96 }}
        transition={{ type: 'spring', stiffness: 380, damping: 28 }}
        className={cn(
          'relative z-30 flex items-center gap-3 px-4 py-2.5 rounded-2xl bg-zinc-950/85 backdrop-blur-2xl border border-white/15 shadow-[0_16px_40px_-10px_rgba(0,0,0,0.7),inset_0_1px_0_0_rgba(255,255,255,0.15)] max-w-xl mx-auto',
          className
        )}
      >
        {/* Acoustic Equalizer Indicator */}
        <div className="shrink-0 flex items-center justify-center p-1 rounded-lg bg-indigo-500/10 border border-indigo-500/20">
          <SoundWave active={isSpeaking} audioLevel={audioLevel} barCount={4} barColor="bg-cyan-400" />
        </div>

        {/* Real-time Karaoke Word Transcription */}
        <div className="text-xs sm:text-sm font-medium leading-relaxed tracking-tight text-zinc-400 flex flex-wrap gap-x-1.5 gap-y-0.5">
          {words.map((word, idx) => {
            const clean = word.toLowerCase().replace(/[^a-z0-9]/g, '');
            const isHighlighted = clean === normalizedCurrent && isSpeaking;

            return (
              <span
                key={`${word}-${idx}`}
                className={cn(
                  'transition-colors duration-150',
                  isHighlighted
                    ? 'text-cyan-300 font-bold drop-shadow-[0_0_8px_rgba(6,182,212,0.6)]'
                    : 'text-zinc-200'
                )}
              >
                {word}
              </span>
            );
          })}
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
