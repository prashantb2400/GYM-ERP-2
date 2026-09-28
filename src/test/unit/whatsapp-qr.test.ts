/**
 * WhatsApp QR Relay API Route Unit Tests
 *
 * Verifies role authentication, mode enforcement, configuration validation,
 * and reliable error handling when the local bridge is unreachable.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GET } from '@/app/api/whatsapp/qr/route';

// Mock supabase server client
const mockGetUser = vi.fn();
const mockUserSelect = vi.fn();

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(async () => ({
    auth: {
      getUser: mockGetUser,
    },
    from: vi.fn((table: string) => {
      if (table === 'users') {
        return {
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              single: mockUserSelect,
            })),
          })),
        };
      }
      return {};
    }),
  })),
}));

// Mock supabaseAdmin
const mockGymSelect = vi.fn();

vi.mock('@/lib/supabase/admin', () => ({
  supabaseAdmin: {
    from: vi.fn((table: string) => {
      if (table === 'gyms') {
        return {
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              single: mockGymSelect,
            })),
          })),
        };
      }
      return {};
    }),
  },
}));

describe('GET /api/whatsapp/qr', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns 401 when user is not authenticated', async () => {
    mockGetUser.mockResolvedValueOnce({ data: { user: null }, error: new Error('No session') });

    const req = new Request('http://localhost:3000/api/whatsapp/qr');
    const res = await GET(req);

    expect(res.status).toBe(401);
    const data = await res.json();
    expect(data.error).toBe('Unauthorized');
  });

  it('returns 403 when user is not an owner or receptionist', async () => {
    mockGetUser.mockResolvedValueOnce({ data: { user: { id: 'u1' } }, error: null });
    mockUserSelect.mockResolvedValueOnce({
      data: { gym_id: 'g1', role: 'member' },
      error: null,
    });

    const req = new Request('http://localhost:3000/api/whatsapp/qr');
    const res = await GET(req);

    expect(res.status).toBe(403);
  });

  it('returns 400 when gym is not configured for local_bridge mode', async () => {
    mockGetUser.mockResolvedValueOnce({ data: { user: { id: 'u1' } }, error: null });
    mockUserSelect.mockResolvedValueOnce({
      data: { gym_id: 'g1', role: 'owner' },
      error: null,
    });
    mockGymSelect.mockResolvedValueOnce({
      data: { whatsapp_mode: 'cloud_api', bridge_url: null, bridge_token: null },
      error: null,
    });

    const req = new Request('http://localhost:3000/api/whatsapp/qr');
    const res = await GET(req);

    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toContain('Switch to Free Baileys Bridge first');
  });

  it('proxies QR data URL successfully from local bridge', async () => {
    mockGetUser.mockResolvedValueOnce({ data: { user: { id: 'u1' } }, error: null });
    mockUserSelect.mockResolvedValueOnce({
      data: { gym_id: 'g1', role: 'owner' },
      error: null,
    });
    mockGymSelect.mockResolvedValueOnce({
      data: {
        whatsapp_mode: 'local_bridge',
        bridge_url: 'http://localhost:48291',
        bridge_token: 'valid-token',
      },
      error: null,
    });

    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(
      new Response(JSON.stringify({ status: 'waiting_qr', qr: 'data:image/png;base64,sample' }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      })
    );

    const req = new Request('http://localhost:3000/api/whatsapp/qr');
    const res = await GET(req);

    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.success).toBe(true);
    expect(data.status).toBe('waiting_qr');
    expect(data.qr).toBe('data:image/png;base64,sample');

    fetchSpy.mockRestore();
  });

  it('handles bridge network failure gracefully with 502', async () => {
    mockGetUser.mockResolvedValueOnce({ data: { user: { id: 'u1' } }, error: null });
    mockUserSelect.mockResolvedValueOnce({
      data: { gym_id: 'g1', role: 'owner' },
      error: null,
    });
    mockGymSelect.mockResolvedValueOnce({
      data: {
        whatsapp_mode: 'local_bridge',
        bridge_url: 'http://localhost:48291',
        bridge_token: 'valid-token',
      },
      error: null,
    });

    const abortError = new Error('Connection aborted');
    abortError.name = 'AbortError';
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockRejectedValueOnce(abortError);

    const req = new Request('http://localhost:3000/api/whatsapp/qr');
    const res = await GET(req);

    expect(res.status).toBe(502);
    const data = await res.json();
    expect(data.success).toBe(false);
    expect(data.status).toBe('bridge_unreachable');

    fetchSpy.mockRestore();
  });
});
