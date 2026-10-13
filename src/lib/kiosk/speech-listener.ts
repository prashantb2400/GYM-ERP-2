/**
 * Client-Side Web Speech Recognition Listener for Android Tablet Kiosks.
 * Provides continuous or push-to-talk voice capture with graceful fallback
 * when speech recognition is unavailable or unsupported in headless environments.
 */

export interface SpeechListenerOptions {
  lang?: string;
  continuous?: boolean;
  interimResults?: boolean;
}

export class KioskSpeechRecognizer {
  private recognition: any = null;
  private listening: boolean = false;
  private shouldRestart: boolean = false;
  private restartTimeout: any = null;
  private options: Required<SpeechListenerOptions>;
  private onTranscriptCb: ((text: string, isFinal: boolean) => void) | null = null;
  private onStateChangeCb: ((active: boolean) => void) | null = null;
  private onErrorCb: ((err: any) => void) | null = null;

  constructor(options: SpeechListenerOptions = {}) {
    this.options = {
      lang: options.lang || 'en-IN',
      continuous: options.continuous ?? true,
      interimResults: options.interimResults ?? true,
    };
  }

  /**
   * Check if SpeechRecognition or webkitSpeechRecognition is available in the current browser.
   */
  public isSupported(): boolean {
    if (typeof window === 'undefined') return false;
    return Boolean(
      (window as any).SpeechRecognition ||
      (window as any).webkitSpeechRecognition
    );
  }

  /**
   * Returns current active listening state.
   */
  public isListening(): boolean {
    return this.listening;
  }

  /**
   * Initialize and start speech recognition.
   */
  public start(
    onTranscript: (text: string, isFinal: boolean) => void,
    onStateChange?: (active: boolean) => void,
    onError?: (err: any) => void
  ): boolean {
    if (!this.isSupported()) {
      return false;
    }

    this.onTranscriptCb = onTranscript;
    this.onStateChangeCb = onStateChange || null;
    this.onErrorCb = onError || null;
    this.shouldRestart = this.options.continuous;

    try {
      if (this.recognition) {
        this.recognition.abort();
      }

      const SpeechRecognitionClass =
        (window as any).SpeechRecognition ||
        (window as any).webkitSpeechRecognition;

      const rec = new SpeechRecognitionClass();
      rec.continuous = this.options.continuous;
      rec.interimResults = this.options.interimResults;
      rec.lang = this.options.lang;

      rec.onstart = () => {
        this.listening = true;
        this.onStateChangeCb?.(true);
      };

      rec.onresult = (event: any) => {
        let finalTranscript = '';
        let interimTranscript = '';

        for (let i = event.resultIndex; i < event.results.length; ++i) {
          const item = event.results[i];
          const text = item[0]?.transcript || '';
          if (item.isFinal) {
            finalTranscript += text;
          } else {
            interimTranscript += text;
          }
        }

        if (finalTranscript.trim()) {
          this.onTranscriptCb?.(finalTranscript.trim(), true);
        } else if (interimTranscript.trim()) {
          this.onTranscriptCb?.(interimTranscript.trim(), false);
        }
      };

      rec.onerror = (err: any) => {
        // Silently tolerate no-speech timeouts
        if (err.error !== 'no-speech' && err.error !== 'aborted') {
          this.onErrorCb?.(err);
        }
      };

      rec.onend = () => {
        this.listening = false;
        this.onStateChangeCb?.(false);

        // Auto-restart if continuous mode is enabled and user hasn't explicitly stopped
        if (this.shouldRestart) {
          if (this.restartTimeout) clearTimeout(this.restartTimeout);
          this.restartTimeout = setTimeout(() => {
            if (this.shouldRestart && !this.listening) {
              try {
                rec.start();
              } catch {}
            }
          }, 350);
        }
      };

      this.recognition = rec;
      rec.start();
      return true;
    } catch (err) {
      this.listening = false;
      this.onStateChangeCb?.(false);
      this.onErrorCb?.(err);
      return false;
    }
  }

  /**
   * Stop speech recognition gracefully.
   */
  public stop() {
    this.shouldRestart = false;
    if (this.restartTimeout) {
      clearTimeout(this.restartTimeout);
      this.restartTimeout = null;
    }

    if (this.recognition) {
      try {
        this.recognition.stop();
      } catch {}
    }
    this.listening = false;
    this.onStateChangeCb?.(false);
  }

  /**
   * Immediately abort speech recognition.
   */
  public abort() {
    this.shouldRestart = false;
    if (this.restartTimeout) {
      clearTimeout(this.restartTimeout);
      this.restartTimeout = null;
    }

    if (this.recognition) {
      try {
        this.recognition.abort();
      } catch {}
    }
    this.listening = false;
    this.onStateChangeCb?.(false);
  }
}
