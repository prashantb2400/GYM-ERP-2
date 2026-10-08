import { describe, it, expect } from 'vitest';
import { GET, OPTIONS } from '@/app/api/local/status/route';

describe('/api/local/status Diagnostics Route', () => {
  it('returns ok status with network and system diagnostics', async () => {
    const res = await GET();
    expect(res.status).toBe(200);

    const data = await res.json();
    expect(data.status).toBe('ok');
    expect(data.offlineAppliance).toBe(true);
    expect(data.host).toBeDefined();
    expect(typeof data.host.platform).toBe('string');
    expect(typeof data.host.uptimeSeconds).toBe('number');
    expect(data.network).toBeDefined();
    expect(data.network.mDnsUrl).toBe('http://gymerp.local:3000');
    expect(Array.isArray(data.network.interfaces)).toBe(true);

    // Verify CORS headers for local tablet WebView requests
    expect(res.headers.get('Access-Control-Allow-Origin')).toBe('*');
  });

  it('handles OPTIONS preflight with 204', async () => {
    const res = await OPTIONS();
    expect(res.status).toBe(204);
    expect(res.headers.get('Access-Control-Allow-Origin')).toBe('*');
  });
});
