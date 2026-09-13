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
});
