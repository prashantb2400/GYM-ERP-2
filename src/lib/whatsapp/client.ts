/**
 * WhatsApp Client - Backward Compatibility Layer
 *
 * This module preserves the existing `waClient` and `whatsappClient` exports
 * so that all existing imports continue to work without changes.
 *
 * Under the hood, the default exports use the Meta Cloud API provider.
 * For per-gym provider resolution (supporting both Cloud API and Baileys
 * bridge), use `getWhatsAppProvider(gymId)` from './factory' instead.
 *
 * Migration path:
 *   Old:  import { waClient } from '@/lib/whatsapp/client'
 *         await waClient.sendText(to, body, gymId)
 *
 *   New:  import { getWhatsAppProvider } from '@/lib/whatsapp/factory'
 *         const provider = await getWhatsAppProvider(gymId)
 *         await provider.sendText(to, body, gymId)
 */

import { MetaCloudProvider } from './providers/meta-cloud';

// Re-export the class for type compatibility
export { MetaCloudProvider as WhatsAppClient } from './providers/meta-cloud';

// Default singleton instances (backward compatible)
export const waClient = new MetaCloudProvider();
export const whatsappClient = waClient;
