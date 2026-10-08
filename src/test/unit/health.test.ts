import { describe, it, expect } from 'vitest';
import { GET, OPTIONS } from '@/app/api/health/route';

describe('/api/health Route', () => {
  it('returns ok status with service and timestamp', async () => {
    const res = await GET();
    expect(res.status).toBe(200);

    const body = await res.json();
    expect(body.status).toBe('ok');
    expect(body.service).toBe('GymERP');
    expect(typeof body.timestamp).toBe('number');

    // CORS headers for mobile WebView verification
    expect(res.headers.get('Access-Control-Allow-Origin')).toBe('*');
  });

  it('handles OPTIONS preflight with 204 status', async () => {
    const res = await OPTIONS();
    expect(res.status).toBe(204);
    expect(res.headers.get('Access-Control-Allow-Origin')).toBe('*');
  });
});
