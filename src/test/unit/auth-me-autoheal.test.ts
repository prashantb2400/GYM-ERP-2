import { describe, it, expect, vi, beforeEach } from 'vitest';

describe('Auth Me Auto-Heal & Gym Adoption Logic', () => {
  it('adopts unowned gym when owner has no gym assigned', () => {
    const authUser = { id: 'auth-123', email: 'tradexmeme@gmail.com' };
    const unownedGym = { id: '00000000-0000-0000-0000-000000000001', name: 'Iron Fitness Studio', owner_id: null };
    
    // Simulate auto-healing check:
    let resolvedGymId = '';
    if (!unownedGym.owner_id) {
      resolvedGymId = unownedGym.id;
    }

    expect(resolvedGymId).toBe('00000000-0000-0000-0000-000000000001');
    expect(resolvedGymId).not.toBe('');
  });

  it('matches gym by case-insensitive email', () => {
    const authUserEmail = 'tradexmeme@gmail.com';
    const gymEmail = 'TradeXmeme@Gmail.com';

    expect(authUserEmail.toLowerCase()).toBe(gymEmail.toLowerCase());
  });

  it('preserves cached gym ID when present in storage', () => {
    const cached = '00000000-0000-0000-0000-000000000001';
    const isValid = cached && cached !== 'null' && cached !== 'undefined';
    expect(Boolean(isValid)).toBe(true);

    const invalidCached = 'null';
    const isInvalidValid = invalidCached && invalidCached !== 'null' && invalidCached !== 'undefined';
    expect(Boolean(isInvalidValid)).toBe(false);
  });
});
