/**
 * Kiosk Voice Agent for Android Tablet Speaker Output.
 * Utilizes the Web Speech API (SpeechSynthesis) with natural en-IN / hi-IN accents.
 */

class KioskVoiceAgent {
  private isMuted: boolean = false;
  private selectedVoice: SpeechSynthesisVoice | null = null;
  private isInitialized: boolean = false;
  private language: 'en-IN' | 'hi-IN' = 'en-IN';

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
    }
  }

  public isVoiceMuted(): boolean {
    return this.isMuted;
  }

  /**
   * Speak a phrase through the tablet speaker.
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

      utterance.onend = () => {
        onEnd?.();
      };
      utterance.onerror = () => {
        onEnd?.();
      };

      window.speechSynthesis.speak(utterance);
    } catch (err) {
      console.warn('Speech synthesis playback failed:', err);
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
    const text = `Hello and welcome to ${gymName}! It looks like you're new here. Would you like to register or get a free day pass?`;
    this.speak(text);
  }

  public speakScanDocumentPrompt() {
    const text = `Please hold your Aadhaar card or ID card in front of the camera to automatically fill your details.`;
    this.speak(text);
  }

  public speakAutoFillConfirmation(name: string) {
    const text = `I've extracted your details for ${name}. Please verify your phone number on the screen.`;
    this.speak(text);
  }

  public speakRegistrationSuccess(name: string) {
    const text = `Welcome to the family, ${name}! Your membership invoice, personalized diet plan, and workout chart are printing right now. Have an amazing session!`;
    this.speak(text);
  }
}

export const voiceAgent = new KioskVoiceAgent();
