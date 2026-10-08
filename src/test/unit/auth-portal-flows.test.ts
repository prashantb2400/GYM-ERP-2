import { describe, it, expect } from 'vitest';

describe('Auth & Portal Flow Logic', () => {
  // 1. Destination redirect safety
  function validateSafeRedirect(rawNext: string | null | undefined, defaultPath = '/dashboard'): string {
    if (!rawNext) return defaultPath;
    const isSafe = rawNext.startsWith('/') && !rawNext.startsWith('//') && !rawNext.startsWith('/\\');
    return isSafe ? rawNext : defaultPath;
  }

  describe('Safe Next Destination Redirects', () => {
    it('allows valid relative dashboard paths', () => {
      expect(validateSafeRedirect('/dashboard')).toBe('/dashboard');
      expect(validateSafeRedirect('/dashboard/members')).toBe('/dashboard/members');
      expect(validateSafeRedirect('/trainer/dashboard')).toBe('/trainer/dashboard');
      expect(validateSafeRedirect('/member/dashboard')).toBe('/member/dashboard');
    });

    it('blocks open redirect protocol-relative URLs', () => {
      expect(validateSafeRedirect('//evil.com')).toBe('/dashboard');
      expect(validateSafeRedirect('//google.com/malicious')).toBe('/dashboard');
      expect(validateSafeRedirect('/\\evil.com')).toBe('/dashboard');
    });

    it('blocks absolute external URLs', () => {
      expect(validateSafeRedirect('https://evil.com')).toBe('/dashboard');
      expect(validateSafeRedirect('http://phishing.site')).toBe('/dashboard');
      expect(validateSafeRedirect('javascript:alert(1)')).toBe('/dashboard');
    });

    it('falls back to custom default path when specified', () => {
      expect(validateSafeRedirect(null, '/member/dashboard')).toBe('/member/dashboard');
      expect(validateSafeRedirect('//malicious', '/member/dashboard')).toBe('/member/dashboard');
    });
  });

  // 2. Member phone formatting and normalization
  function normalizeMemberPhone(phone: string): { valid: boolean; cleanPhone: string; e164: string } {
    const cleanPhone = phone.replace(/\D/g, '').slice(-10);
    const valid = cleanPhone.length === 10;
    return {
      valid,
      cleanPhone,
      e164: valid ? `+91${cleanPhone}` : '',
    };
  }

  describe('Phone Number Normalization for OTP Authentication', () => {
    it('cleans 10-digit mobile numbers with spaces or hyphens', () => {
      const res = normalizeMemberPhone('98765-43210');
      expect(res.valid).toBe(true);
      expect(res.cleanPhone).toBe('9876543210');
      expect(res.e164).toBe('+919876543210');
    });

    it('strips leading +91 or country code cleanly', () => {
      const res = normalizeMemberPhone('+91 98765 43210');
      expect(res.valid).toBe(true);
      expect(res.cleanPhone).toBe('9876543210');
      expect(res.e164).toBe('+919876543210');
    });

    it('rejects incomplete phone numbers', () => {
      const res = normalizeMemberPhone('12345');
      expect(res.valid).toBe(false);
      expect(res.e164).toBe('');
    });
  });

  // 3. Password strength evaluation
  function evaluatePasswordStrength(password: string): { score: number; label: string } {
    if (!password) return { score: 0, label: '' };
    let score = 0;
    if (password.length >= 6) score += 1;
    if (password.length >= 8) score += 1;
    if (/[A-Z]/.test(password) && /[a-z]/.test(password)) score += 1;
    if (/[0-9]/.test(password)) score += 1;
    if (/[^A-Za-z0-9]/.test(password)) score += 1;

    if (score <= 1) return { score: 1, label: 'Weak' };
    if (score <= 3) return { score: 2, label: 'Fair' };
    if (score === 4) return { score: 3, label: 'Good' };
    return { score: 4, label: 'Strong' };
  }

  describe('Password Strength Verification', () => {
    it('rates short passwords as weak', () => {
      expect(evaluatePasswordStrength('abc').score).toBe(1);
      expect(evaluatePasswordStrength('12345').score).toBe(1);
    });

    it('rates standard 6-char alphanumeric as fair', () => {
      expect(evaluatePasswordStrength('pass12').label).toBe('Fair');
    });

    it('rates 8+ char mixed-case and numbers as good or strong', () => {
      expect(evaluatePasswordStrength('StrongPass1').label).toBe('Good');
      expect(evaluatePasswordStrength('Very$trongPass123!').label).toBe('Strong');
    });
  });

  // 4. Member registration validation
  function validateSelfRegistration(body: any) {
    if (!body || typeof body !== 'object') {
      return { valid: false, error: 'Request body required' };
    }
    if (!body.gymId || typeof body.gymId !== 'string') {
      return { valid: false, error: 'Gym ID is required' };
    }
    if (!body.name || typeof body.name !== 'string' || !body.name.trim()) {
      return { valid: false, error: 'Full name is required' };
    }
    const cleanPhone = typeof body.phone === 'string' ? body.phone.replace(/\D/g, '').slice(-10) : '';
    if (cleanPhone.length !== 10) {
      return { valid: false, error: 'Valid 10-digit mobile number required' };
    }
    return {
      valid: true,
      data: {
        gymId: body.gymId,
        name: body.name.trim(),
        phone: cleanPhone,
        dob: body.dob || null,
        gender: body.gender || null,
      },
    };
  }

  describe('Member Self-Registration Validation', () => {
    it('requires gymId, name, and valid 10-digit phone', () => {
      expect(validateSelfRegistration({}).valid).toBe(false);
      expect(validateSelfRegistration({ gymId: 'gym-123' }).valid).toBe(false);
      expect(validateSelfRegistration({ gymId: 'gym-123', name: 'John Doe' }).valid).toBe(false);
      expect(validateSelfRegistration({ gymId: 'gym-123', name: 'John Doe', phone: '123' }).valid).toBe(false);
    });

    it('accepts complete registration payload', () => {
      const res = validateSelfRegistration({
        gymId: 'gym-123',
        name: ' John Doe ',
        phone: '+91 98765 43210',
        dob: '1995-05-15',
        gender: 'male',
      });
      expect(res.valid).toBe(true);
      expect(res.data?.name).toBe('John Doe');
      expect(res.data?.phone).toBe('9876543210');
      expect(res.data?.dob).toBe('1995-05-15');
      expect(res.data?.gender).toBe('male');
    });
  });

  // 5. Staff login identifier resolution
  function resolveStaffIdentifier(input: string): { type: 'email' | 'login_id'; value: string } {
    const trimmed = input.trim();
    if (trimmed.includes('@')) {
      return { type: 'email', value: trimmed.toLowerCase() };
    }
    return { type: 'login_id', value: trimmed };
  }

  describe('Staff Identifier Resolution', () => {
    it('identifies direct email addresses', () => {
      expect(resolveStaffIdentifier('staff@gym.com').type).toBe('email');
      expect(resolveStaffIdentifier('TRAINER@GYM.COM').value).toBe('trainer@gym.com');
    });

    it('identifies staff login IDs', () => {
      expect(resolveStaffIdentifier('front_desk_1').type).toBe('login_id');
      expect(resolveStaffIdentifier('front_desk_1').value).toBe('front_desk_1');
    });
  });
});
