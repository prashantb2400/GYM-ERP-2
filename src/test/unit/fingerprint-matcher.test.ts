import { describe, it, expect } from 'vitest';
import { matchTemplates, identifyMemberFromRoster } from '@/lib/fingerprint/matcher';
import { synthesizeMinutiaeFromSeed } from '@/lib/fingerprint/drivers';
import type { FingerprintTemplate, RosterMemberFingerprint } from '@/lib/fingerprint/types';

describe('Biometric Minutiae Fingerprint Matcher', () => {
  it('returns high match score (>90%) for identical templates', () => {
    const minutiae = synthesizeMinutiaeFromSeed('john_doe_thumb', 85);
    const templateA: FingerprintTemplate = {
      version: '1.0',
      format: 'GYMERP_MINUTIAE',
      width: 280,
      height: 360,
      minutiae,
      quality: 85,
      finger: 'right_thumb',
      createdAt: new Date().toISOString(),
    };

    const templateB: FingerprintTemplate = JSON.parse(JSON.stringify(templateA));

    const result = matchTemplates(templateA, templateB);
    expect(result.isMatch).toBe(true);
    expect(result.score).toBeGreaterThanOrEqual(90);
    expect(result.matchedPairs).toBe(minutiae.length);
  });

  it('correctly matches when finger is shifted and slightly rotated', () => {
    const baseMinutiae = synthesizeMinutiaeFromSeed('member_42_thumb', 80);
    const templateA: FingerprintTemplate = {
      version: '1.0',
      format: 'GYMERP_MINUTIAE',
      width: 280,
      height: 360,
      minutiae: baseMinutiae,
      quality: 80,
      finger: 'right_thumb',
      createdAt: new Date().toISOString(),
    };

    // Apply translation (dx=8, dy=12) and rotation (~0.12 radians = ~7 degrees)
    const dTheta = 0.12;
    const cosT = Math.cos(dTheta);
    const sinT = Math.sin(dTheta);
    const shiftedMinutiae = baseMinutiae.map((m) => {
      const rx = (m.x - 140) * cosT - (m.y - 180) * sinT + 140 + 8;
      const ry = (m.x - 140) * sinT + (m.y - 180) * cosT + 180 + 12;
      return {
        ...m,
        x: Math.round(rx),
        y: Math.round(ry),
        angle: (m.angle + dTheta) % (2 * Math.PI),
      };
    });

    const templateB: FingerprintTemplate = {
      version: '1.0',
      format: 'GYMERP_MINUTIAE',
      width: 280,
      height: 360,
      minutiae: shiftedMinutiae,
      quality: 80,
      finger: 'right_thumb',
      createdAt: new Date().toISOString(),
    };

    const result = matchTemplates(templateA, templateB);
    expect(result.isMatch).toBe(true);
    expect(result.score).toBeGreaterThanOrEqual(60);
  });

  it('rejects completely different fingers with low score', () => {
    const minutiaeA = synthesizeMinutiaeFromSeed('alice_index', 80);
    const minutiaeB = synthesizeMinutiaeFromSeed('bob_thumb', 80);

    const templateA: FingerprintTemplate = {
      version: '1.0',
      format: 'GYMERP_MINUTIAE',
      width: 280,
      height: 360,
      minutiae: minutiaeA,
      quality: 80,
      finger: 'right_index',
      createdAt: new Date().toISOString(),
    };

    const templateB: FingerprintTemplate = {
      version: '1.0',
      format: 'GYMERP_MINUTIAE',
      width: 280,
      height: 360,
      minutiae: minutiaeB,
      quality: 80,
      finger: 'right_thumb',
      createdAt: new Date().toISOString(),
    };

    const result = matchTemplates(templateA, templateB);
    expect(result.isMatch).toBe(false);
    expect(result.score).toBeLessThan(40);
  });

  it('rejects poor quality templates with insufficient minutiae (<6)', () => {
    const templatePoor: FingerprintTemplate = {
      version: '1.0',
      format: 'GYMERP_MINUTIAE',
      width: 280,
      height: 360,
      minutiae: [
        { x: 100, y: 100, angle: 1.0, type: 'ending' },
        { x: 120, y: 110, angle: 1.2, type: 'bifurcation' },
      ],
      quality: 20,
      finger: 'right_thumb',
      createdAt: new Date().toISOString(),
    };

    const templateGood: FingerprintTemplate = {
      version: '1.0',
      format: 'GYMERP_MINUTIAE',
      width: 280,
      height: 360,
      minutiae: synthesizeMinutiaeFromSeed('valid_finger', 85),
      quality: 85,
      finger: 'right_thumb',
      createdAt: new Date().toISOString(),
    };

    const result = matchTemplates(templatePoor, templateGood);
    expect(result.isMatch).toBe(false);
    expect(result.score).toBe(0);
  });

  it('identifies target member from a roster of candidate members', () => {
    const targetMinutiae = synthesizeMinutiaeFromSeed('target_member_print', 88);
    const probeTemplate: FingerprintTemplate = {
      version: '1.0',
      format: 'GYMERP_MINUTIAE',
      width: 280,
      height: 360,
      minutiae: targetMinutiae,
      quality: 88,
      finger: 'right_thumb',
      createdAt: new Date().toISOString(),
    };

    const roster: RosterMemberFingerprint[] = [
      {
        id: 'mem_1',
        name: 'Carlos Santana',
        member_code: 'GYM001',
        status: 'active',
        fingerprint_template: {
          version: '1.0',
          format: 'GYMERP_MINUTIAE',
          width: 280,
          height: 360,
          minutiae: synthesizeMinutiaeFromSeed('other_person_1', 82),
          quality: 82,
          finger: 'right_thumb',
          createdAt: new Date().toISOString(),
        },
      },
      {
        id: 'mem_2',
        name: 'Priya Sharma',
        member_code: 'GYM002',
        status: 'active',
        fingerprint_template: {
          version: '1.0',
          format: 'GYMERP_MINUTIAE',
          width: 280,
          height: 360,
          minutiae: targetMinutiae, // Matching template!
          quality: 88,
          finger: 'right_thumb',
          createdAt: new Date().toISOString(),
        },
      },
      {
        id: 'mem_3',
        name: 'David Miller',
        member_code: 'GYM003',
        status: 'active',
        fingerprint_template: {
          version: '1.0',
          format: 'GYMERP_MINUTIAE',
          width: 280,
          height: 360,
          minutiae: synthesizeMinutiaeFromSeed('other_person_3', 75),
          quality: 75,
          finger: 'right_thumb',
          createdAt: new Date().toISOString(),
        },
      },
    ];

    const identification = identifyMemberFromRoster(probeTemplate, roster);
    expect(identification.matched).toBe(true);
    expect(identification.member).toBeDefined();
    expect(identification.member?.id).toBe('mem_2');
    expect(identification.member?.name).toBe('Priya Sharma');
    expect(identification.matchResult?.score).toBeGreaterThanOrEqual(90);
  });
});
