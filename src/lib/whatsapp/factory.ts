/**
 * WhatsApp Provider Factory
 *
 * Returns the correct WhatsApp provider based on the gym's configuration.
 * Each gym can independently choose between:
 *   - 'cloud_api': Official Meta WhatsApp Cloud API (paid, compliant)
 *   - 'local_bridge': Baileys sidecar via Cloudflare Tunnel (free)
 *   - 'disabled': WhatsApp messaging turned off
 *
 * The factory caches provider instances per gym to avoid re-creating
 * connections on every API call.
 */

import { supabaseAdmin } from '@/lib/supabase/admin';
import type { IWhatsAppProvider, WhatsAppMode } from './providers/interface';
import { MetaCloudProvider } from './providers/meta-cloud';
import { BaileysBridgeProvider } from './providers/baileys-bridge';

// Singleton Meta Cloud provider (shared config via env vars)
let metaCloudInstance: MetaCloudProvider | null = null;

// Per-gym bridge provider cache (keyed by gym_id)
const bridgeProviderCache = new Map<string, BaileysBridgeProvider>();

/**
 * Disabled provider stub that throws on all send operations.
 * Used when a gym has explicitly turned off WhatsApp.
 */
class DisabledProvider implements IWhatsAppProvider {
  readonly providerName = 'Disabled';
  readonly mode: WhatsAppMode = 'disabled';

  private fail(): never {
    throw new Error('WhatsApp messaging is disabled for this gym. Enable it in Settings > Integrations.');
  }

  async sendText(): Promise<any> { this.fail(); }
  async sendTemplate(): Promise<any> { this.fail(); }
  async sendDocument(): Promise<any> { this.fail(); }
  async broadcastTemplate(): Promise<any> { this.fail(); }
  async checkConnection() { return { connected: false }; }
  async getTemplateStatus(name: string) {
    return { name, status: 'DISABLED' as const, category: 'UTILITY' };
  }
  async sendTextMessage(): Promise<any> { this.fail(); }
  async sendTemplateMessage(): Promise<any> { this.fail(); }
}

const disabledInstance = new DisabledProvider();

/**
 * Get the WhatsApp provider for a specific gym.
 *
 * @param gymId - The gym's UUID. If not provided, falls back to the
 *   default Meta Cloud provider (for backward compatibility).
 *
 * @returns The appropriate IWhatsAppProvider implementation
 */
export async function getWhatsAppProvider(gymId?: string): Promise<IWhatsAppProvider> {
  // If no gym context, return default Meta Cloud provider (backward compat)
  if (!gymId) {
    return getMetaCloudProvider();
  }

  // Look up the gym's WhatsApp configuration
  const { data: gym } = await supabaseAdmin
    .from('gyms')
    .select('whatsapp_mode, bridge_url, bridge_token')
    .eq('id', gymId)
    .single();

  const mode: WhatsAppMode = gym?.whatsapp_mode || 'cloud_api';

  switch (mode) {
    case 'local_bridge': {
      if (!gym?.bridge_url || !gym?.bridge_token) {
        console.warn(`Gym ${gymId} is set to local_bridge but missing bridge_url/bridge_token. Falling back to cloud_api.`);
        return getMetaCloudProvider();
      }

      // Check cache first
      const cached = bridgeProviderCache.get(gymId);
      if (cached) {
        return cached;
      }

      const provider = new BaileysBridgeProvider({
        bridgeUrl: gym.bridge_url,
        bridgeToken: gym.bridge_token,
      });
      bridgeProviderCache.set(gymId, provider);
      return provider;
    }

    case 'disabled':
      return disabledInstance;

    case 'cloud_api':
    default:
      return getMetaCloudProvider();
  }
}

/**
 * Get the singleton Meta Cloud provider.
 */
function getMetaCloudProvider(): MetaCloudProvider {
  if (!metaCloudInstance) {
    metaCloudInstance = new MetaCloudProvider();
  }
  return metaCloudInstance;
}

/**
 * Clear the cached bridge provider for a gym.
 * Call this when gym WhatsApp settings change.
 */
export function clearProviderCache(gymId: string): void {
  bridgeProviderCache.delete(gymId);
}

/**
 * Clear all cached providers.
 */
export function clearAllProviderCaches(): void {
  bridgeProviderCache.clear();
  metaCloudInstance = null;
}

/**
 * Get the Meta Cloud provider directly (for webhook handling).
 * Webhooks always come from Meta, so they always use the Cloud provider.
 */
export function getMetaCloudProviderDirect(): MetaCloudProvider {
  return getMetaCloudProvider();
}
