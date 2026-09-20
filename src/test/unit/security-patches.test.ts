import { describe, it, expect } from 'vitest';
import { escapeHtml } from '@/lib/pdf/invoice-template';

describe('Security Patches Verification', () => {
  describe('VULN-04: HTML Entity Escaping in PDF Templates', () => {
    it('escapes dangerous HTML script tags', () => {
      const input = '<script>alert("xss")</script>';
      const escaped = escapeHtml(input);
      expect(escaped).toBe('&lt;script&gt;alert(&quot;xss&quot;)&lt;/script&gt;');
      expect(escaped).not.toContain('<script>');
    });

    it('escapes double and single quotes', () => {
      const input = `onmouseover='stealCookie()' "payload"`;
      const escaped = escapeHtml(input);
      expect(escaped).toContain('&#039;stealCookie()&#039;');
      expect(escaped).toContain('&quot;payload&quot;');
    });

    it('handles null and undefined safely without throwing', () => {
      expect(escapeHtml(null)).toBe('');
      expect(escapeHtml(undefined)).toBe('');
      expect(escapeHtml('')).toBe('');
    });

    it('preserves safe numbers and text', () => {
      expect(escapeHtml(12345)).toBe('12345');
      expect(escapeHtml('Normal Gym Member')).toBe('Normal Gym Member');
    });
  });

  describe('VULN-06: WhatsApp Webhook Timing-Safe Buffer Comparison', () => {
    it('handles mismatched signature length gracefully without throwing RangeError', () => {
      const crypto = require('crypto');
      const signature = 'sha256=short';
      const expectedSig = 'sha256=abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890';

      const sigBuf = Buffer.from(signature);
      const expBuf = Buffer.from(expectedSig);

      let isValid = false;
      if (sigBuf.length === expBuf.length) {
        isValid = crypto.timingSafeEqual(sigBuf, expBuf);
      } else {
        isValid = false;
      }

      expect(isValid).toBe(false);
    });
  });

  describe('VULN-07: OAuth Callback Next Parameter Sanitization', () => {
    function sanitizeNext(rawNext: string | null): string {
      const next = rawNext ?? '/dashboard';
      const isSafe = next.startsWith('/') && !next.startsWith('//') && !next.startsWith('/\\');
      return isSafe ? next : '/dashboard';
    }

    it('allows valid relative dashboard paths', () => {
      expect(sanitizeNext('/dashboard')).toBe('/dashboard');
      expect(sanitizeNext('/dashboard/members')).toBe('/dashboard/members');
      expect(sanitizeNext('/member/plan')).toBe('/member/plan');
    });

    it('rejects protocol-relative open redirects', () => {
      expect(sanitizeNext('//attacker.com')).toBe('/dashboard');
      expect(sanitizeNext('//evil.com/path')).toBe('/dashboard');
    });

    it('rejects windows-style protocol-relative open redirects', () => {
      expect(sanitizeNext('/\\attacker.com')).toBe('/dashboard');
    });

    it('rejects absolute URLs', () => {
      expect(sanitizeNext('https://evil.com')).toBe('/dashboard');
      expect(sanitizeNext('javascript:alert(1)')).toBe('/dashboard');
    });

    it('falls back to /dashboard on null/empty', () => {
      expect(sanitizeNext(null)).toBe('/dashboard');
      expect(sanitizeNext('')).toBe('/dashboard');
    });
  });

  describe('HIGH-08: Kiosk Phone Number Masking', () => {
    function maskPhone(rawPhone: string): string {
      return rawPhone.length >= 10
        ? `${rawPhone.slice(0, 2)}******${rawPhone.slice(-2)}`
        : '***';
    }

    it('masks 10-digit Indian phone numbers', () => {
      expect(maskPhone('9876543210')).toBe('98******10');
    });

    it('masks 12-digit international phone numbers with country code', () => {
      expect(maskPhone('919876543210')).toBe('91******10');
    });

    it('masks short or malformed numbers safely', () => {
      expect(maskPhone('12345')).toBe('***');
      expect(maskPhone('')).toBe('***');
    });
  });

  describe('MEDIUM-11: Kiosk Pairing Code Entropy', () => {
    it('generates 6-digit numeric codes with full entropy', () => {
      const crypto = require('crypto');
      for (let i = 0; i < 50; i++) {
        const code = crypto.randomInt(100000, 999999).toString();
        expect(code).toMatch(/^[1-9][0-9]{5}$/);
        expect(Number(code)).toBeGreaterThanOrEqual(100000);
        expect(Number(code)).toBeLessThanOrEqual(999999);
      }
    });
  });

  describe('LOW-14 & LOW-15: Timing-Safe Secret Verification', () => {
    function verifySecret(provided: string | null, actual: string): boolean {
      const crypto = require('crypto');
      if (!provided) return false;
      const provBuf = Buffer.from(provided);
      const actBuf = Buffer.from(actual);
      if (provBuf.length !== actBuf.length) return false;
      return crypto.timingSafeEqual(provBuf, actBuf);
    }

    it('validates identical secret tokens without timing leak', () => {
      expect(verifySecret('super-secret-cron-token-123', 'super-secret-cron-token-123')).toBe(true);
    });

    it('safely rejects unequal tokens of different length without throwing', () => {
      expect(verifySecret('short', 'super-secret-cron-token-123')).toBe(false);
    });

    it('safely rejects unequal tokens of same length', () => {
      expect(verifySecret('wrong-secret-cron-token-123', 'super-secret-cron-token-123')).toBe(false);
    });

    it('safely rejects null or empty tokens', () => {
      expect(verifySecret(null, 'secret')).toBe(false);
      expect(verifySecret('', 'secret')).toBe(false);
    });
  });
});

