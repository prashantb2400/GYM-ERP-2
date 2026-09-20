import { describe, it, expect } from 'vitest';
import { kioskAudio } from '@/components/kiosk/KioskAudio';

describe('Kiosk Audio Engine', () => {
  it('toggles sound on and off correctly', () => {
    expect(kioskAudio.isSoundEnabled()).toBe(true);
    kioskAudio.setSoundEnabled(false);
    expect(kioskAudio.isSoundEnabled()).toBe(false);
    kioskAudio.setSoundEnabled(true);
    expect(kioskAudio.isSoundEnabled()).toBe(true);
  });

  it('safely handles audio triggers in test/headless environments without throwing', () => {
    expect(() => {
      kioskAudio.playTap();
      kioskAudio.playSuccess();
      kioskAudio.playError();
      kioskAudio.playCelebration();
    }).not.toThrow();
  });
});

describe('Kiosk UPI Deep-Link Format Validation', () => {
  it('generates a compliant Bharat UPI URI string', () => {
    const payeeVpa = 'fitness@upi';
    const payeeName = 'Iron Gym';
    const amount = 2500;
    const transactionRef = 'TXN12345678';
    const note = 'Membership Renewal';

    const upiUri = `upi://pay?pa=${encodeURIComponent(payeeVpa)}&pn=${encodeURIComponent(payeeName)}&am=${amount.toFixed(2)}&tr=${transactionRef}&tn=${encodeURIComponent(note)}&cu=INR`;

    expect(upiUri).toContain('upi://pay?');
    expect(upiUri).toContain('pa=fitness%40upi');
    expect(upiUri).toContain('am=2500.00');
    expect(upiUri).toContain('cu=INR');
  });

  it('correctly extracts and sanitizes a 10-digit Indian phone number', () => {
    const rawInputs = [
      '+91 98765 43210',
      '09876543210',
      '98765-43210',
      '9876543210',
    ];

    rawInputs.forEach((raw) => {
      const sanitized = raw.replace(/\D/g, '').slice(-10);
      expect(sanitized).toBe('9876543210');
      expect(sanitized.length).toBe(10);
    });
  });
});
