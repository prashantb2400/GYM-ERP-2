/**
 * WhatsApp Multi-Provider Unit Tests
 *
 * Verifies provider interface compliance, phone formatting, template interpolation,
 * offline queuing, and gym-scoped factory resolution.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MetaCloudProvider } from '@/lib/whatsapp/providers/meta-cloud';
import { BaileysBridgeProvider } from '@/lib/whatsapp/providers/baileys-bridge';
import { getWhatsAppProvider, clearAllProviderCaches } from '@/lib/whatsapp/factory';

// Mock supabaseAdmin
vi.mock('@/lib/supabase/admin', () => ({
  supabaseAdmin: {
    from: vi.fn((table: string) => {
      if (table === 'gyms') {
        return {
          select: vi.fn(() => ({
            eq: vi.fn((_col: string, val: string) => ({
              single: vi.fn(async () => {
                if (val === 'gym-bridge-id') {
                  return {
                    data: {
                      whatsapp_mode: 'local_bridge',
                      bridge_url: 'http://localhost:48291',
                      bridge_token: 'secret-token-xyz',
                    },
                    error: null,
                  };
                }
                if (val === 'gym-disabled-id') {
                  return {
                    data: {
                      whatsapp_mode: 'disabled',
                      bridge_url: null,
                      bridge_token: null,
                    },
                    error: null,
                  };
                }
                return {
                  data: {
                    whatsapp_mode: 'cloud_api',
                    bridge_url: null,
                    bridge_token: null,
                  },
                  error: null,
                };
              }),
            })),
          })),
        };
      }
      return {
        insert: vi.fn(async () => ({ data: null, error: null })),
        update: vi.fn(() => ({ eq: vi.fn(async () => ({ data: null, error: null })) })),
      };
    }),
  },
}));

describe('MetaCloudProvider', () => {
  it('initializes with correct provider identity and mode', () => {
    const provider = new MetaCloudProvider();
    expect(provider.providerName).toBe('Meta Cloud API');
    expect(provider.mode).toBe('cloud_api');
  });

  it('exposes standard interface methods', () => {
    const provider = new MetaCloudProvider();
    expect(typeof provider.sendText).toBe('function');
    expect(typeof provider.sendTemplate).toBe('function');
    expect(typeof provider.sendDocument).toBe('function');
    expect(typeof provider.broadcastTemplate).toBe('function');
    expect(typeof provider.checkConnection).toBe('function');
    expect(typeof provider.getTemplateStatus).toBe('function');
  });
});

describe('BaileysBridgeProvider', () => {
  let bridgeProvider: BaileysBridgeProvider;

  beforeEach(() => {
    bridgeProvider = new BaileysBridgeProvider({
      bridgeUrl: 'http://localhost:48291/',
      bridgeToken: 'test-token-123',
    });
  });

  it('initializes with local bridge mode and identity', () => {
    expect(bridgeProvider.providerName).toBe('Baileys Local Bridge');
    expect(bridgeProvider.mode).toBe('local_bridge');
  });

  it('resolves known template placeholders into plain text', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(
      new Response(JSON.stringify({ success: true, messageId: 'wa_test_123' }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      })
    );

    const result = await bridgeProvider.sendTemplate(
      '9876543210',
      'gym_welcome',
      [
        { type: 'text', text: 'Alex' },
        { type: 'text', text: 'Iron Forge Gym' },
      ],
      'gym-1',
      'member-1'
    );

    expect(result.messages[0].id).toBe('wa_test_123');
    expect(fetchSpy).toHaveBeenCalledTimes(1);

    const callArgs = fetchSpy.mock.calls[0];
    const payload = JSON.parse(callArgs[1]?.body as string);
    expect(payload.to).toBe('919876543210');
    expect(payload.type).toBe('text');
    expect(payload.body).toContain('Welcome Alex to Iron Forge Gym!');

    fetchSpy.mockRestore();
  });

  it('queues message in database when bridge is unreachable', async () => {
    const abortError = new Error('The operation was aborted');
    abortError.name = 'AbortError';

    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockRejectedValueOnce(abortError);

    const result = await bridgeProvider.sendText(
      '9876543210',
      'Renewal reminder test',
      'gym-bridge-id',
      'member-2'
    );

    // Should return queued message ID instead of throwing
    expect(result.messages[0].id).toMatch(/^queued_/);
    expect(result.contacts[0].wa_id).toBe('919876543210');

    fetchSpy.mockRestore();
  });
});

describe('getWhatsAppProvider Factory', () => {
  beforeEach(() => {
    clearAllProviderCaches();
  });

  it('defaults to MetaCloudProvider when no gymId is specified', async () => {
    const provider = await getWhatsAppProvider();
    expect(provider.mode).toBe('cloud_api');
    expect(provider.providerName).toBe('Meta Cloud API');
  });

  it('resolves BaileysBridgeProvider for gyms configured with local_bridge', async () => {
    const provider = await getWhatsAppProvider('gym-bridge-id');
    expect(provider.mode).toBe('local_bridge');
    expect(provider.providerName).toBe('Baileys Local Bridge');
  });

  it('caches the bridge provider instance across calls for the same gym', async () => {
    const providerA = await getWhatsAppProvider('gym-bridge-id');
    const providerB = await getWhatsAppProvider('gym-bridge-id');
    expect(providerA).toBe(providerB);
  });

  it('resolves DisabledProvider for gyms configured with disabled mode', async () => {
    const provider = await getWhatsAppProvider('gym-disabled-id');
    expect(provider.mode).toBe('disabled');
    await expect(provider.sendText('919999999999', 'hello')).rejects.toThrow(
      'WhatsApp messaging is disabled for this gym'
    );
  });
});
