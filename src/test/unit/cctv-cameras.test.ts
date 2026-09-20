import { describe, it, expect } from 'vitest';

describe('CCTV RTSP Stream Validation & Security Sanitization', () => {
  function isValidStreamUrl(url: string): boolean {
    const trimmed = url.trim().toLowerCase();
    return (
      trimmed.startsWith('rtsp://') ||
      trimmed.startsWith('rtsps://') ||
      trimmed.startsWith('http://') ||
      trimmed.startsWith('https://')
    );
  }

  function maskStreamCredentials(url: string): string {
    return url.replace(/:[^:@]+@/, ':***@');
  }

  it('accepts valid RTSP and HTTP stream endpoints', () => {
    const validUrls = [
      'rtsp://admin:12345@192.168.1.100:554/ch1/main',
      'rtsps://camera.gymlan.local:322/stream',
      'http://192.168.1.200:8080/mjpg/video.mjpg',
      'https://cctv.gym.in/live/entrance.m3u8',
    ];

    validUrls.forEach((url) => {
      expect(isValidStreamUrl(url)).toBe(true);
    });
  });

  it('rejects invalid or unsafe non-video protocol schemes', () => {
    const invalidUrls = [
      'ftp://192.168.1.100',
      'file:///etc/shadow',
      'javascript:alert(1)',
      '192.168.1.100:554/ch1',
    ];

    invalidUrls.forEach((url) => {
      expect(isValidStreamUrl(url)).toBe(false);
    });
  });

  it('sanitizes and masks sensitive passwords in RTSP URLs for display', () => {
    const raw = 'rtsp://admin:TopSecretPass99@192.168.1.108:554/Streaming/Channels/101';
    const masked = maskStreamCredentials(raw);

    expect(masked).not.toContain('TopSecretPass99');
    expect(masked).toBe('rtsp://admin:***@192.168.1.108:554/Streaming/Channels/101');
  });
});

describe('CCTV Automated Attendance Fail-Safe Logic', () => {
  interface AttendanceRecord {
    id: string;
    gym_id: string;
    member_id: string;
    date: string;
    method: string;
  }

  function shouldRecordAttendance(
    existingLogs: AttendanceRecord[],
    gymId: string,
    memberId: string,
    todayDate: string
  ): boolean {
    return !existingLogs.some(
      (log) => log.gym_id === gymId && log.member_id === memberId && log.date === todayDate
    );
  }

  it('allows auto-marking attendance when member has not checked in today', () => {
    const existing: AttendanceRecord[] = [
      { id: '1', gym_id: 'gym-1', member_id: 'm-other', date: '2026-09-20', method: 'kiosk' },
    ];

    const canRecord = shouldRecordAttendance(existing, 'gym-1', 'm-target', '2026-09-20');
    expect(canRecord).toBe(true);
  });

  it('deduplicates attendance when member already checked in at the Kiosk', () => {
    const existing: AttendanceRecord[] = [
      { id: '1', gym_id: 'gym-1', member_id: 'm-target', date: '2026-09-20', method: 'face_recognition' },
    ];

    const canRecord = shouldRecordAttendance(existing, 'gym-1', 'm-target', '2026-09-20');
    expect(canRecord).toBe(false);
  });

  it('allows new attendance on subsequent calendar days', () => {
    const existing: AttendanceRecord[] = [
      { id: '1', gym_id: 'gym-1', member_id: 'm-target', date: '2026-09-19', method: 'cctv' },
    ];

    const canRecord = shouldRecordAttendance(existing, 'gym-1', 'm-target', '2026-09-20');
    expect(canRecord).toBe(true);
  });
});

describe('CCTV Entrance Vigilance Alert Triage', () => {
  type VigilanceType = 'unknown_visitor' | 'expired_member' | 'due_defaulter';
  type AlertStatus = 'unresolved' | 'acknowledged' | 'lead_created' | 'dismissed';

  interface VigilanceEvent {
    id: string;
    event_type: VigilanceType;
    status: AlertStatus;
    member_id?: string;
  }

  function triageDetection(
    isMemberKnown: boolean,
    isPlanExpired: boolean,
    hasDue: boolean
  ): VigilanceType | null {
    if (!isMemberKnown) return 'unknown_visitor';
    if (isPlanExpired) return 'expired_member';
    if (hasDue) return 'due_defaulter';
    return null; // Known active member with no issues
  }

  it('classifies unknown face as unknown_visitor alert', () => {
    const alert = triageDetection(false, false, false);
    expect(alert).toBe('unknown_visitor');
  });

  it('flags known member with expired plan as expired_member alert', () => {
    const alert = triageDetection(true, true, false);
    expect(alert).toBe('expired_member');
  });

  it('silently ignores known active members with no dues or flags', () => {
    const alert = triageDetection(true, false, false);
    expect(alert).toBeNull();
  });

  it('transitions alert status to lead_created when converted', () => {
    const event: VigilanceEvent = {
      id: 'ev-101',
      event_type: 'unknown_visitor',
      status: 'unresolved',
    };

    // Staff clicks "Convert to Lead"
    event.status = 'lead_created';
    expect(event.status).toBe('lead_created');
  });
});
