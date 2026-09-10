import { describe, it, expect } from 'vitest';

describe('Gym Onboarding Validation', () => {
  function validateOnboardingInput(body: any) {
    if (!body || typeof body !== 'object') {
      return { valid: false, error: 'Invalid request body' };
    }
    if (!body.gymName || !body.gymName.trim()) {
      return { valid: false, error: 'Gym Name is required' };
    }
    return {
      valid: true,
      data: {
        gymName: body.gymName.trim(),
        phone: body.phone?.trim() || null,
        email: body.email?.trim() || null,
        tagline: body.tagline?.trim() || null,
        city: body.city?.trim() || '',
        state: body.state?.trim() || '',
      },
    };
  }

  it('rejects empty or whitespace-only gym name', () => {
    expect(validateOnboardingInput({ gymName: '' }).valid).toBe(false);
    expect(validateOnboardingInput({ gymName: '   ' }).valid).toBe(false);
    expect(validateOnboardingInput({}).valid).toBe(false);
  });

  it('accepts valid gym onboarding payload and trims whitespace', () => {
    const res = validateOnboardingInput({
      gymName: '  Iron Power Gym  ',
      phone: ' 9876543210 ',
      email: ' contact@irongym.in ',
      tagline: ' Lift Heavy ',
      city: ' Mumbai ',
      state: ' Maharashtra ',
    });

    expect(res.valid).toBe(true);
    expect(res.data?.gymName).toBe('Iron Power Gym');
    expect(res.data?.phone).toBe('9876543210');
    expect(res.data?.email).toBe('contact@irongym.in');
    expect(res.data?.tagline).toBe('Lift Heavy');
    expect(res.data?.city).toBe('Mumbai');
    expect(res.data?.state).toBe('Maharashtra');
  });

  it('defaults missing optional fields cleanly', () => {
    const res = validateOnboardingInput({
      gymName: 'FitLife Gym',
    });

    expect(res.valid).toBe(true);
    expect(res.data?.gymName).toBe('FitLife Gym');
    expect(res.data?.phone).toBeNull();
    expect(res.data?.email).toBeNull();
    expect(res.data?.tagline).toBeNull();
    expect(res.data?.city).toBe('');
    expect(res.data?.state).toBe('');
  });
});
