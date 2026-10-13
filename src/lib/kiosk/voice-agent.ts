/**
 * Kiosk Voice Agent for Android Tablet Speaker Output.
 * Utilizes the Web Speech API (SpeechSynthesis) with natural en-IN / hi-IN accents
 * and real-time acoustic speech envelope broadcasting for visual fluid synchronization.
 */

import {
  formatTodayWorkoutVoice,
  formatPlateLoadingVoice,
  formatHelpVoice,
  parseKioskVoiceIntent,
  type KioskVoiceIntent,
} from '@/lib/kiosk/voice-intent';
import type { PlateCalculationResult } from '@/lib/workout/plate-calculator';

export interface VoiceSpeechEvent {
  isSpeaking: boolean;
  phrase: string;
  currentWord: string;
  charIndex: number;
  audioLevel: number; // 0.0 to 1.0 amplitude
}

type VoiceListener = (event: VoiceSpeechEvent) => void;

class KioskVoiceAgent {
  private isMuted: boolean = false;
  private selectedVoice: SpeechSynthesisVoice | null = null;
  private isInitialized: boolean = false;
  private language: 'en-IN' | 'hi-IN' = 'en-IN';
  private listeners: Set<VoiceListener> = new Set();
  private currentEvent: VoiceSpeechEvent = {
    isSpeaking: false,
    phrase: '',
    currentWord: '',
    charIndex: 0,
    audioLevel: 0,
  };
  private animFrameId: number | null = null;
  private targetAudioLevel: number = 0;
  private speechStartTime: number = 0;

  constructor() {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      this.initVoices();
      window.speechSynthesis.onvoiceschanged = () => {
        this.initVoices();
      };
    }
  }

  private initVoices() {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;
    const voices = window.speechSynthesis.getVoices();

    // Prefer Indian English voice or Hindi voice
    const targetLang = this.language;
    const match =
      voices.find((v) => v.lang === targetLang) ||
      voices.find((v) => v.lang.startsWith('en-IN')) ||
      voices.find((v) => v.lang.startsWith('en-GB')) ||
      voices.find((v) => v.lang.startsWith('en'));

    if (match) {
      this.selectedVoice = match;
      this.isInitialized = true;
    }
  }

  public setLanguage(lang: 'en-IN' | 'hi-IN') {
    this.language = lang;
    this.initVoices();
  }

  public setMuted(muted: boolean) {
    this.isMuted = muted;
    if (muted && typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      this.stopAcousticEnvelope();
    }
  }

  public isVoiceMuted(): boolean {
    return this.isMuted;
  }

  public subscribe(listener: VoiceListener): () => void {
    this.listeners.add(listener);
    listener(this.currentEvent);
    return () => {
      this.listeners.delete(listener);
    };
  }

  public getCurrentEvent(): VoiceSpeechEvent {
    return this.currentEvent;
  }

  private emit(update: Partial<VoiceSpeechEvent>) {
    this.currentEvent = { ...this.currentEvent, ...update };
    for (const listener of this.listeners) {
      try {
        listener(this.currentEvent);
      } catch (err) {
        console.warn('Voice listener error:', err);
      }
    }
  }

  private startAcousticEnvelope() {
    if (typeof window === 'undefined') return;
    this.speechStartTime = performance.now();

    const loop = (now: number) => {
      if (!this.currentEvent.isSpeaking && this.currentEvent.audioLevel <= 0.01) {
        this.emit({ audioLevel: 0 });
        this.animFrameId = null;
        return;
      }

      if (this.currentEvent.isSpeaking) {
        const elapsed = (now - this.speechStartTime) / 1000;
        // Natural human speech syllabic rate cadence (4 - 6 Hz modulation)
        const cadence = Math.sin(elapsed * 12) * 0.25 + Math.cos(elapsed * 18) * 0.15;
        const baseline = 0.45 + cadence;
        this.targetAudioLevel = Math.max(0.15, Math.min(0.95, baseline));
      } else {
        this.targetAudioLevel = 0;
      }

      // Smooth spring-like lerp to target amplitude
      const nextLevel = this.currentEvent.audioLevel + (this.targetAudioLevel - this.currentEvent.audioLevel) * 0.22;
      this.emit({ audioLevel: Math.max(0, Math.min(1, nextLevel)) });

      this.animFrameId = requestAnimationFrame(loop);
    };

    if (this.animFrameId) cancelAnimationFrame(this.animFrameId);
    this.animFrameId = requestAnimationFrame(loop);
  }

  private stopAcousticEnvelope() {
    this.emit({ isSpeaking: false, currentWord: '' });
  }

  /**
   * Speak a phrase through the tablet speaker and broadcast acoustic events.
   */
  public speak(text: string, onEnd?: () => void) {
    if (this.isMuted || typeof window === 'undefined' || !('speechSynthesis' in window)) {
      onEnd?.();
      return;
    }

    try {
      window.speechSynthesis.cancel(); // Stop any overlapping utterance

      const utterance = new SpeechSynthesisUtterance(text);
      if (this.selectedVoice) {
        utterance.voice = this.selectedVoice;
      }
      utterance.rate = 1.0;
      utterance.pitch = 1.05;
      utterance.volume = 1.0;

      utterance.onstart = () => {
        this.emit({
          isSpeaking: true,
          phrase: text,
          currentWord: text.split(/\s+/)[0] || '',
          charIndex: 0,
        });
        this.startAcousticEnvelope();
      };

      utterance.onboundary = (event: SpeechSynthesisEvent) => {
        if (event.name === 'word') {
          const remaining = text.slice(event.charIndex);
          const wordMatch = remaining.match(/^[^\s,.;:!?]+/);
          const word = wordMatch ? wordMatch[0] : '';
          this.targetAudioLevel = 0.95; // Syllable burst
          this.emit({
            currentWord: word,
            charIndex: event.charIndex,
          });
        }
      };

      const handleFinish = () => {
        this.stopAcousticEnvelope();
        onEnd?.();
      };

      utterance.onend = handleFinish;
      utterance.onerror = handleFinish;

      window.speechSynthesis.speak(utterance);
    } catch (err) {
      console.warn('Speech synthesis playback failed:', err);
      this.stopAcousticEnvelope();
      onEnd?.();
    }
  }

  // Pre-configured voice prompts
  public speakWelcomeMember(name: string, daysRemaining: number, lockerNumber?: string) {
    const lockerText = lockerNumber ? `Locker ${lockerNumber} is assigned.` : '';
    const text = `Welcome back, ${name}! Your attendance is marked. You have ${daysRemaining} days remaining in your plan. ${lockerText} Have a great workout!`;
    this.speak(text);
  }

  public speakGuestDetected(gymName: string) {
    const text = `Hello and welcome to ${gymName}! It looks like you are new here. Would you like to register or get a free day pass?`;
    this.speak(text);
  }

  public speakScanDocumentPrompt() {
    const text = `Please hold your Aadhaar card or ID card in front of the camera to automatically fill your details.`;
    this.speak(text);
  }

  public speakAutoFillConfirmation(name: string) {
    const text = `I have extracted your details for ${name}. Please verify your phone number on the screen.`;
    this.speak(text);
  }

  public speakRegistrationSuccess(name: string) {
    const text = `Welcome to the family, ${name}! Your membership invoice, personalized diet plan, and workout chart are printing right now. Have an amazing session!`;
    this.speak(text);
  }

  public speakTodayWorkout(
    name: string,
    routineName: string,
    dayName: string,
    exerciseCount: number,
    firstExercise?: string,
    onEnd?: () => void
  ) {
    const text = formatTodayWorkoutVoice(name, routineName, dayName, exerciseCount, firstExercise);
    this.speak(text, onEnd);
  }

  public speakPlateLoading(result: PlateCalculationResult, onEnd?: () => void) {
    const text = formatPlateLoadingVoice(result);
    this.speak(text, onEnd);
  }

  public speakHelp(onEnd?: () => void) {
    const text = formatHelpVoice();
    this.speak(text, onEnd);
  }
}

export const voiceAgent = new KioskVoiceAgent();

export {
  formatTodayWorkoutVoice,
  formatPlateLoadingVoice,
  formatHelpVoice,
  parseKioskVoiceIntent,
  type KioskVoiceIntent,
};
