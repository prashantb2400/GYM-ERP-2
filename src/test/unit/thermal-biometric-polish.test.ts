import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  kioskPrinter,
  formatTwoColumns,
  getDividerLine,
  getLineWidth,
  type CheckInSlipPayload,
  type WorkoutSlipPayload,
} from '@/lib/kiosk/printer-driver';
import {
  matchTemplates,
  identifyMemberFromRoster,
} from '@/lib/fingerprint/matcher';
import {
  synthesizeMinutiaeFromSeed,
  evaluateFingerprintQuality,
  MANTRA_ERROR_DICTIONARY,
  SECUGEN_ERROR_DICTIONARY,
  MantraMfs100Driver,
  SecuGenDriver,
} from '@/lib/fingerprint/drivers';
import type { FingerprintTemplate, RosterMemberFingerprint } from '@/lib/fingerprint/types';

describe('Thermal Printer Driver & ESC/POS Generation', () => {
  it('formats column lines correctly for 80mm (48 cols) and 58mm (32 cols)', () => {
    expect(getLineWidth(80)).toBe(48);
    expect(getLineWidth(58)).toBe(32);

    const div80 = getDividerLine(80);
    expect(div80.trim().length).toBe(48);
    expect(div80.endsWith('\n')).toBe(true);

    const div58 = getDividerLine(58);
    expect(div58.trim().length).toBe(32);
    expect(div58.endsWith('\n')).toBe(true);

    const line80 = formatTwoColumns('Member:', 'Rahul Sharma', 80);
    expect(line80.trim().length).toBe(48);
    expect(line80.startsWith('Member:')).toBe(true);
    expect(line80.trim().endsWith('Rahul Sharma')).toBe(true);

    const line58 = formatTwoColumns('Member:', 'Rahul Sharma', 58);
    expect(line58.trim().length).toBe(32);
    expect(line58.startsWith('Member:')).toBe(true);
    expect(line58.trim().endsWith('Rahul Sharma')).toBe(true);
  });

  it('generates 80mm check-in slip with native QR code and workout details', () => {
    const payload: CheckInSlipPayload = {
      gymName: 'Titan Iron Gym',
      branchName: 'Indiranagar Main',
      gymPhone: '+91 98765 43210',
      memberName: 'Arjun Das',
      memberCode: 'MEM-0092',
      date: '13-Oct-2026',
      checkInTime: '06:30 AM',
      lockerNumber: 'L-42',
      daysRemaining: 45,
      qrPassData: 'PASS:MEM-0092:TIMESTAMP',
      workout: {
        dayName: 'Chest & Triceps Hypertrophy',
        exercises: [
          { name: 'Barbell Bench Press', sets: 4, reps: '8-10', targetWeightKg: 85 },
          { name: 'Incline Dumbbell Press', sets: 3, reps: '10-12', targetWeightKg: 30 },
        ],
      },
      quote: 'Train hard or remain the same.',
      paperWidth: 80,
    };

    const bytes = kioskPrinter.generateEscPosCheckInSlip(payload);
    expect(bytes).toBeInstanceOf(Uint8Array);
    expect(bytes.length).toBeGreaterThan(100);

    // Initial ESC @ reset command: [0x1b, 0x40]
    expect(bytes[0]).toBe(0x1b);
    expect(bytes[1]).toBe(0x40);

    // Final cut command: [0x1d, 0x56, 0x42, 0x00]
    const len = bytes.length;
    expect(bytes[len - 4]).toBe(0x1d);
    expect(bytes[len - 3]).toBe(0x56);
    expect(bytes[len - 2]).toBe(0x42);
    expect(bytes[len - 1]).toBe(0x00);

    // Convert bytes to string to verify text content
    const decoded = new TextDecoder().decode(bytes);
    expect(decoded).toContain('Titan Iron Gym');
    expect(decoded).toContain('Indiranagar Main');
    expect(decoded).toContain('Arjun Das');
    expect(decoded).toContain('MEM-0092');
    expect(decoded).toContain('L-42');
    expect(decoded).toContain('Barbell Bench Press');
  });

  it('generates 58mm compact check-in slip without overflow', () => {
    const payload: CheckInSlipPayload = {
      gymName: 'Powerhouse Fitness',
      memberName: 'Kavita Sen',
      memberCode: 'MEM-0145',
      date: '13-Oct-2026',
      checkInTime: '07:15 AM',
      daysRemaining: 12,
      paperWidth: 58,
    };

    const bytes = kioskPrinter.generateEscPosCheckInSlip(payload);
    expect(bytes).toBeInstanceOf(Uint8Array);

    const decoded = new TextDecoder().decode(bytes);
    expect(decoded).toContain('Powerhouse Fitness');
    expect(decoded).toContain('Kavita Sen');
    expect(decoded).toContain('MEM-0145');
    expect(decoded).toContain('12 days left');
  });

  it('generates workout floor pocket slip with plate math and checkboxes', () => {
    const payload: WorkoutSlipPayload = {
      gymName: 'Titan Iron Gym',
      memberName: 'Dev Patel',
      memberCode: 'MEM-0881',
      date: '13-Oct-2026',
      routineName: 'PPL Leg Hypertrophy',
      dayName: 'Leg Day Annihilation',
      exercises: [
        { name: 'Barbell Back Squat', sets: 5, reps: '5', targetWeightKg: 140 },
        { name: 'Romanian Deadlift', sets: 4, reps: '8', targetWeightKg: 100 },
      ],
      plateCalc: {
        barbellWeightKg: 20,
        targetWeightKg: 140,
        platesPerSide: '2x25kg, 1x10kg',
      },
      paperWidth: 80,
    };

    const bytes = kioskPrinter.generateEscPosWorkoutSlip(payload);
    expect(bytes).toBeInstanceOf(Uint8Array);

    const decoded = new TextDecoder().decode(bytes);
    expect(decoded).toContain('WORKOUT FLOOR CARD');
    expect(decoded).toContain('Dev Patel');
    expect(decoded).toContain('Leg Day Annihilation');
    expect(decoded).toContain('Barbell Back Squat');
    expect(decoded).toContain('[ ] [ ] [ ] [ ] [ ]'); // 5 sets checkboxes
    expect(decoded).toContain('PLATE MATH: 140 KG BARBELL');
    expect(decoded).toContain('2x25kg, 1x10kg');
  });

  it('generates ESC/POS Model 2 QR code command bytes', () => {
    const parts: number[] = [];
    kioskPrinter.addEscPosQrCode(parts, 'https://gymerp.app/pass/123', 4);

    // Verify GS ( k command structure: 0x1d, 0x28, 0x6b
    expect(parts[0]).toBe(0x1d);
    expect(parts[1]).toBe(0x28);
    expect(parts[2]).toBe(0x6b);

    // Verify Model 2 selection
    expect(parts.slice(0, 9)).toEqual([0x1d, 0x28, 0x6b, 0x04, 0x00, 0x31, 0x41, 0x32, 0x00]);

    // Verify Print QR command at the end: [0x1d, 0x28, 0x6b, 0x03, 0x00, 0x31, 0x51, 0x30]
    const tail = parts.slice(-8);
    expect(tail).toEqual([0x1d, 0x28, 0x6b, 0x03, 0x00, 0x31, 0x51, 0x30]);
  });
});

describe('Biometric Matching Sensitivity & Callus Adaptation', () => {
  it('supports callus_adapted mode for heavy lifters with abraded ridges', () => {
    // Generate synthetic minutiae for a lifter
    const baseMinutiae = synthesizeMinutiaeFromSeed('powerlifter_thumb', 75);

    // Simulate heavy barbell knurling wear: only retain 8 minutiae points with slight shifts
    const wornMinutiae = baseMinutiae.slice(0, 8).map((m) => ({
      ...m,
      x: m.x + 2,
      y: m.y - 1,
      angle: (m.angle + 0.05) % (2 * Math.PI),
    }));

    const probeTemplate: FingerprintTemplate = {
      version: '1.0',
      format: 'GYMERP_MINUTIAE',
      width: 280,
      height: 360,
      minutiae: wornMinutiae,
      quality: 68,
      finger: 'left_thumb',
      createdAt: new Date().toISOString(),
    };

    const candidateTemplate: FingerprintTemplate = {
      version: '1.0',
      format: 'GYMERP_MINUTIAE',
      width: 280,
      height: 360,
      minutiae: baseMinutiae,
      quality: 75,
      finger: 'left_thumb',
      createdAt: new Date().toISOString(),
    };

    // Under strict mode (requires 12 pairs and score >= 65), worn template fails
    const strictResult = matchTemplates(probeTemplate, candidateTemplate, { sensitivity: 'strict' });
    expect(strictResult.isMatch).toBe(false);

    // Under normal mode (requires 10 pairs), worn template with 8 pairs fails
    const normalResult = matchTemplates(probeTemplate, candidateTemplate, { sensitivity: 'normal' });
    expect(normalResult.isMatch).toBe(false);

    // Under callus_adapted mode (requires 7 pairs and score >= 45), worn template succeeds
    const callusResult = matchTemplates(probeTemplate, candidateTemplate, { sensitivity: 'callus_adapted' });
    expect(callusResult.isMatch).toBe(true);
    expect(callusResult.matchedPairs).toBeGreaterThanOrEqual(7);
  });

  it('identifies member correctly from roster in callus_adapted mode', () => {
    const lifterMinutiae = synthesizeMinutiaeFromSeed('lifter_vikram_thumb', 78);
    const regularMinutiae = synthesizeMinutiaeFromSeed('regular_member_thumb', 80);

    const roster: RosterMemberFingerprint[] = [
      {
        id: 'mem_reg_1',
        name: 'Suresh Kumar',
        member_code: 'MEM-001',
        status: 'active',
        fingerprint_template: {
          version: '1.0',
          format: 'GYMERP_MINUTIAE',
          width: 280,
          height: 360,
          minutiae: regularMinutiae,
          quality: 80,
          finger: 'left_thumb',
          createdAt: new Date().toISOString(),
        },
      },
      {
        id: 'mem_lifter_2',
        name: 'Vikram Singh (Powerlifter)',
        member_code: 'MEM-002',
        status: 'active',
        fingerprint_template: {
          version: '1.0',
          format: 'GYMERP_MINUTIAE',
          width: 280,
          height: 360,
          minutiae: lifterMinutiae,
          quality: 78,
          finger: 'left_thumb',
          createdAt: new Date().toISOString(),
        },
      },
    ];

    // Probe with abraded 8-minutiae scan
    const abradedProbe: FingerprintTemplate = {
      version: '1.0',
      format: 'GYMERP_MINUTIAE',
      width: 280,
      height: 360,
      minutiae: lifterMinutiae.slice(0, 8),
      quality: 65,
      finger: 'left_thumb',
      createdAt: new Date().toISOString(),
    };

    const match = identifyMemberFromRoster(abradedProbe, roster, { sensitivity: 'callus_adapted' });
    expect(match.matched).toBe(true);
    expect(match.member?.id).toBe('mem_lifter_2');
    expect(match.member?.name).toContain('Vikram Singh');
  });

  it('evaluates fingerprint quality gates accurately', () => {
    // High quality template
    const highQ = evaluateFingerprintQuality(85, 40);
    expect(highQ.acceptable).toBe(true);
    expect(highQ.issues.length).toBe(0);

    // Low minutiae count
    const lowMin = evaluateFingerprintQuality(80, 10);
    expect(lowMin.acceptable).toBe(false);
    expect(lowMin.issues.some((i) => i.includes('Low minutiae count'))).toBe(true);

    // Poor optical clarity
    const poorClarity = evaluateFingerprintQuality(40, 30);
    expect(poorClarity.acceptable).toBe(false);
    expect(poorClarity.issues.some((i) => i.includes('optical clarity'))).toBe(true);
  });
});

describe('Hardware Driver Diagnostics & Error Dictionaries', () => {
  it('translates Mantra MFS100 RD Service error codes', () => {
    expect(MANTRA_ERROR_DICTIONARY['-1307']).toBe('Mantra device initialization failed');
    expect(MANTRA_ERROR_DICTIONARY['-1314']).toBe('Corrupted biometric template returned by sensor');
    expect(MANTRA_ERROR_DICTIONARY['0']).toBe('Success');
  });

  it('translates SecuGen Hamster Pro 20 error codes', () => {
    expect(SECUGEN_ERROR_DICTIONARY[51]).toBe('Touch timeout - finger not detected within capture window');
    expect(SECUGEN_ERROR_DICTIONARY[52]).toBe('SecuGen USB scanner disconnected or driver offline');
    expect(SECUGEN_ERROR_DICTIONARY[54]).toBe('Low quality minutiae image - wipe prism surface');
    expect(SECUGEN_ERROR_DICTIONARY[105]).toBe('Biometric capture quality below threshold');
    expect(SECUGEN_ERROR_DICTIONARY[0]).toBe('Success');
  });

  it('Mantra driver probe checks ports and handles connection failure gracefully', async () => {
    const driver = new MantraMfs100Driver();
    expect(driver.id).toBe('mantra');
    expect(driver.name).toBe('Mantra MFS100 / MFS110 (RD Service)');

    // In a test environment without real Mantra RD service running, isAvailable returns false
    const available = await driver.isAvailable();
    expect(available).toBe(false);

    // Capture returns informative error when driver is not available
    const capture = await driver.capture('left_thumb');
    expect(capture.success).toBe(false);
    expect(capture.error).toContain('Mantra RD Service');
  });

  it('SecuGen driver probe checks base URLs and handles connection failure gracefully', async () => {
    const driver = new SecuGenDriver();
    expect(driver.id).toBe('secugen');
    expect(driver.name).toBe('SecuGen Hamster Pro 20 (WebAPI)');

    // In a test environment without SecuGen WebAPI service, isAvailable returns false
    const available = await driver.isAvailable();
    expect(available).toBe(false);

    // Capture returns informative error when driver is not available
    const capture = await driver.capture('right_thumb');
    expect(capture.success).toBe(false);
    expect(capture.error).toContain('SecuGen WebAPI service not responding');
  });
});
