import { describe, it, expect } from 'vitest';

describe('QR Attendance Payload Validation', () => {
  const QR_PROTOCOL = 'gymerp://checkin/';
  const QR_REGEX = /^gymerp:\/\/checkin\/([a-f0-9-]{36})$/i;

  it('correctly matches and extracts a valid UUID from a checkin URI', () => {
    const validUuid = '123e4567-e89b-12d3-a456-426614174000';
    const payload = `${QR_PROTOCOL}${validUuid}`;
    const match = payload.match(QR_REGEX);

    expect(match).not.toBeNull();
    expect(match![1]).toBe(validUuid);
  });

  it('rejects payloads from other apps or invalid schemas', () => {
    const foreignUrls = [
      'https://example.com/checkin/123',
      'otherapp://checkin/123e4567-e89b-12d3-a456-426614174000',
      'gymerp://other-action/123e4567-e89b-12d3-a456-426614174000',
      'plain-text-string',
      '',
    ];

    foreignUrls.forEach((url) => {
      const match = url.match(QR_REGEX);
      expect(match).toBeNull();
    });
  });

  it('rejects malformed UUIDs in checkin URI', () => {
    const invalidUuids = [
      `${QR_PROTOCOL}not-a-uuid`,
      `${QR_PROTOCOL}123`,
      `${QR_PROTOCOL}123e4567-e89b-12d3-a456-invaliduuid!`,
    ];

    invalidUuids.forEach((payload) => {
      const match = payload.match(QR_REGEX);
      expect(match).toBeNull();
    });
  });
});
