import { describe, it, expect, vi } from 'vitest';
import {
  parseKioskVoiceIntent,
  formatTodayWorkoutVoice,
  formatPlateLoadingVoice,
  formatHelpVoice,
} from '@/lib/kiosk/voice-intent';
import { voiceAgent } from '@/lib/kiosk/voice-agent';
import { KioskSpeechRecognizer } from '@/lib/kiosk/speech-listener';
import { calculateBarbellPlates } from '@/lib/workout/plate-calculator';

describe('Kiosk Voice Intent Parser', () => {
  it('correctly parses workout query intents from varied natural phrasing', () => {
    const workoutPhrases = [
      'what is my workout',
      "what's my workout today",
      'today workout',
      "today's split",
      'what should I train today',
      'what exercises should I do',
      'show my workout',
      'my routine',
      'what am I training',
    ];

    workoutPhrases.forEach((phrase) => {
      const intent = parseKioskVoiceIntent(phrase);
      expect(intent.type, `Failed on: "${phrase}"`).toBe('workout');
    });
  });

  it('correctly parses barbell plate calculation intents with metric weights', () => {
    const platePhrases = [
      { text: 'calculate plates for 80 kg', weight: 80, unit: 'kg' },
      { text: 'how many plates for 90', weight: 90, unit: 'kg' },
      { text: 'plates for 100 kg', weight: 100, unit: 'kg' },
      { text: 'load barbell 72.5 kg', weight: 72.5, unit: 'kg' },
      { text: 'math for 60 kg', weight: 60, unit: 'kg' },
      { text: 'plates for 140', weight: 140, unit: 'kg' },
    ];

    platePhrases.forEach(({ text, weight, unit }) => {
      const intent = parseKioskVoiceIntent(text);
      expect(intent.type).toBe('plates');
      if (intent.type === 'plates') {
        expect(intent.targetWeight).toBe(weight);
        expect(intent.unit).toBe(unit);
      }
    });
  });

  it('correctly parses barbell plate calculation intents with imperial pound weights', () => {
    const imperialPhrases = [
      { text: 'plates for 225 lbs', weight: 225, unit: 'lb' },
      { text: 'load 135 pounds on barbell', weight: 135, unit: 'lb' },
      { text: 'calculate plates for 315 lb', weight: 315, unit: 'lb' },
    ];

    imperialPhrases.forEach(({ text, weight, unit }) => {
      const intent = parseKioskVoiceIntent(text);
      expect(intent.type).toBe('plates');
      if (intent.type === 'plates') {
        expect(intent.targetWeight).toBe(weight);
        expect(intent.unit).toBe(unit);
      }
    });
  });

  it('correctly parses PR and One Rep Max intents with specific exercise detection', () => {
    expect(parseKioskVoiceIntent('what is my PR').type).toBe('pr');
    expect(parseKioskVoiceIntent('my personal record').type).toBe('pr');

    const benchIntent = parseKioskVoiceIntent('what is my max bench');
    expect(benchIntent.type).toBe('pr');
    if (benchIntent.type === 'pr') {
      expect(benchIntent.exercise).toBe('Bench Press');
    }

    const squatIntent = parseKioskVoiceIntent('what is my max squat');
    expect(squatIntent.type).toBe('pr');
    if (squatIntent.type === 'pr') {
      expect(squatIntent.exercise).toBe('Squat');
    }
  });

  it('correctly parses attendance check-in voice commands', () => {
    expect(parseKioskVoiceIntent('mark my attendance').type).toBe('checkin');
    expect(parseKioskVoiceIntent('check me in').type).toBe('checkin');
  });

  it('correctly parses kiosk help queries and falls back on unrecognised input', () => {
    expect(parseKioskVoiceIntent('help').type).toBe('help');
    expect(parseKioskVoiceIntent('what can you do').type).toBe('help');
    expect(parseKioskVoiceIntent('hello').type).toBe('help');

    expect(parseKioskVoiceIntent('').type).toBe('unknown');
    expect(parseKioskVoiceIntent('   ').type).toBe('unknown');
    expect(parseKioskVoiceIntent('random ambient chatter in lobby').type).toBe('unknown');
  });
});

describe('Kiosk Spoken Prompt Formatters', () => {
  it('formats natural spoken workout routine split summary', () => {
    const voiceText = formatTodayWorkoutVoice(
      'Prashant',
      'Push Pull Legs',
      'Push Day (Chest & Triceps)',
      6,
      'Incline Barbell Bench Press'
    );

    expect(voiceText).toContain('Hey Prashant');
    expect(voiceText).toContain('Push Day (Chest & Triceps)');
    expect(voiceText).toContain('Push Pull Legs');
    expect(voiceText).toContain('6 exercises scheduled');
    expect(voiceText).toContain('starting with Incline Barbell Bench Press');
  });

  it('handles rest days gracefully in spoken workout prompt', () => {
    const restText = formatTodayWorkoutVoice('Vikram', 'Upper Lower', 'Rest Day', 0);
    expect(restText).toContain('Hey Vikram');
    expect(restText).toContain('rest and recovery');
    expect(restText).toContain('Stay hydrated and recharge');
  });

  it('formats barbell plate loading into natural spoken instructions', () => {
    const calc90 = calculateBarbellPlates(90, { barWeight: 20, unit: 'kg' });
    const spoken90 = formatPlateLoadingVoice(calc90);

    expect(spoken90).toContain('To load 90 kilograms on a 20 kilogram bar');
    expect(spoken90).toContain('load one 25 kilogram plate and one 10 kilogram plate on each side');
  });

  it('handles empty bar in spoken plate loading', () => {
    const calc20 = calculateBarbellPlates(20, { barWeight: 20, unit: 'kg' });
    const spoken20 = formatPlateLoadingVoice(calc20);

    expect(spoken20).toContain('empty 20 kilogram Olympic barbell');
    expect(spoken20).toContain('zero plates on each side');
  });

  it('handles weights lighter than bar weight in spoken plate loading', () => {
    const calc10 = calculateBarbellPlates(10, { barWeight: 20, unit: 'kg' });
    const spoken10 = formatPlateLoadingVoice(calc10);

    expect(spoken10).toContain('lighter than the 20 kg barbell');
    expect(spoken10).toContain('dumbbells');
  });

  it('formats help prompt properly', () => {
    const help = formatHelpVoice();
    expect(help).toContain('what is your workout today');
    expect(help).toContain('calculate barbell plates');
  });
});

describe('Kiosk Voice Agent & Speech Recognizer Resilience', () => {
  it('toggles voice mute state correctly', () => {
    expect(voiceAgent.isVoiceMuted()).toBe(false);
    voiceAgent.setMuted(true);
    expect(voiceAgent.isVoiceMuted()).toBe(true);
    voiceAgent.setMuted(false);
    expect(voiceAgent.isVoiceMuted()).toBe(false);
  });

  it('safely handles speakTodayWorkout and speakPlateLoading without throwing in headless environment', () => {
    const calc = calculateBarbellPlates(80, { barWeight: 20, unit: 'kg' });

    expect(() => {
      voiceAgent.speakTodayWorkout('Rahul', 'Push Pull Legs', 'Pull Day', 5, 'Deadlift');
      voiceAgent.speakPlateLoading(calc);
      voiceAgent.speakHelp();
    }).not.toThrow();
  });

  it('safely reports unsupported speech recognition in non-browser environment without errors', () => {
    const recognizer = new KioskSpeechRecognizer();
    expect(recognizer.isSupported()).toBe(false);
    expect(recognizer.isListening()).toBe(false);

    // Starting on unsupported environment returns false gracefully
    const started = recognizer.start(() => {});
    expect(started).toBe(false);

    // Stop and abort do not throw
    expect(() => {
      recognizer.stop();
      recognizer.abort();
    }).not.toThrow();
  });
});
