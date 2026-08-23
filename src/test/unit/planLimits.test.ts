import { describe, it, expect } from 'vitest';

describe('SaaS Platform Plan Quota & Gate Logic', () => {
  function evaluateMemberLimit(maxMembers: number, currentCount: number) {
    return {
      allowed: maxMembers === -1 || currentCount < maxMembers,
      current: currentCount,
      max: maxMembers,
    };
  }

  it('should allow unlimited members when maxMembers is -1 (Enterprise Plan)', () => {
    const resultLow = evaluateMemberLimit(-1, 50);
    expect(resultLow.allowed).toBe(true);

    const resultHigh = evaluateMemberLimit(-1, 5000);
    expect(resultHigh.allowed).toBe(true);
  });

  it('should enforce limit for Free plan (e.g. 50 members)', () => {
    const freeMax = 50;

    expect(evaluateMemberLimit(freeMax, 49).allowed).toBe(true);
    expect(evaluateMemberLimit(freeMax, 50).allowed).toBe(false);
    expect(evaluateMemberLimit(freeMax, 75).allowed).toBe(false);
  });

  it('should enforce limit for Pro plan (e.g. 250 members)', () => {
    const proMax = 250;

    expect(evaluateMemberLimit(proMax, 249).allowed).toBe(true);
    expect(evaluateMemberLimit(proMax, 250).allowed).toBe(false);
  });
});
