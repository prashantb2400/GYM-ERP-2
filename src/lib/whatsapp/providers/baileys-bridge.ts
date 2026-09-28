/**
 * Baileys Bridge Provider
 *
 * Implements IWhatsAppProvider by calling the local Baileys sidecar service
 * via HTTP. The sidecar runs on the gym's desktop machine and connects to
 * WhatsApp Web directly (no Meta Cloud API fees).
 *
 * When the bridge is unreachable, messages are queued in the database and
 * retried when the bridge comes back online.
 */

import { supabaseAdmin } from '@/lib/supabase/admin';
import type {
  WAResponse,
  TemplateParam,
  BroadcastResult,
  TemplateStatus,
  ConnectionStatus,
} from '../types';
import { WA_TEMPLATES } from '../templates';
import type { IWhatsAppProvider, WhatsAppMode } from './interface';

interface BridgeConfig {
  /** Full URL of the Baileys bridge (e.g. https://gym-slug-bridge.gymerp.com or http://localhost:48291) */
  bridgeUrl: string;
  /** Bearer token for authenticating with the bridge */
  bridgeToken: string;
}

export class BaileysBridgeProvider implements IWhatsAppProvider {
  readonly providerName = 'Baileys Local Bridge';
  readonly mode: WhatsAppMode = 'local_bridge';

  private bridgeUrl: string;
  private bridgeToken: string;

  constructor(config: BridgeConfig) {
    this.bridgeUrl = config.bridgeUrl.replace(/\/$/, ''); // strip trailing slash
    this.bridgeToken = config.bridgeToken;
  }

  // ---- Helpers ----

  private formatPhone(phone: string): string {
    const cleaned = phone.replace(/\D/g, '');
    if (!cleaned.startsWith('91') && cleaned.length === 10) {
      return `91${cleaned}`;
    }
    return cleaned;
  }

  private async bridgeFetch(path: string, options: RequestInit = {}): Promise<Response> {
    const url = `${this.bridgeUrl}${path}`;
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000); // 10s timeout

    try {
      const response = await fetch(url, {
        ...options,
        signal: controller.signal,
        headers: {
          Authorization: `Bearer ${this.bridgeToken}`,
          'Content-Type': 'application/json',
          ...options.headers,
        },
      });
      return response;
    } finally {
      clearTimeout(timeout);
    }
  }

  private async logMessage(data: {
    gym_id?: string;
    member_id?: string;
    recipient_phone: string;
    message_type: 'text' | 'template' | 'document';
    template_name?: string;
    status: 'sent' | 'failed' | 'queued';
    wa_message_id?: string;
    error_message?: string;
  }) {
    try {
      await supabaseAdmin.from('whatsapp_logs').insert({
        ...data,
        gym_id: data.gym_id || null,
      });
    } catch (e) {
      console.error('Failed to log WhatsApp message:', e);
    }
  }

  /**
   * Queue a message in the database for later delivery when the bridge
   * is unreachable. The desktop app polls this queue when it reconnects.
   */
  private async queueForLater(data: {
    gym_id?: string;
    member_id?: string;
    to: string;
    type: 'text' | 'template' | 'document';
    body?: string;
    template_name?: string;
    template_params?: TemplateParam[];
  }): Promise<void> {
    try {
      await supabaseAdmin.from('whatsapp_queue').insert({
        gym_id: data.gym_id || null,
        member_id: data.member_id || null,
        recipient_phone: data.to,
        message_type: data.type,
        message_body: data.body || null,
        template_name: data.template_name || null,
        template_params: data.template_params ? JSON.stringify(data.template_params) : null,
        status: 'pending',
        created_at: new Date().toISOString(),
      });
    } catch (e) {
      console.error('Failed to queue WhatsApp message:', e);
    }
  }

  // ---- IWhatsAppProvider methods ----

  async sendText(to: string, body: string, gymId?: string, memberId?: string): Promise<WAResponse> {
    const phone = this.formatPhone(to);

    try {
      const response = await this.bridgeFetch('/send', {
        method: 'POST',
        body: JSON.stringify({ to: phone, type: 'text', body }),
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        const errorMsg = result.error || 'Bridge send failed';
        await this.logMessage({
          gym_id: gymId,
          member_id: memberId,
          recipient_phone: phone,
          message_type: 'text',
          status: 'failed',
          error_message: errorMsg,
        });
        throw new Error(errorMsg);
      }

      await this.logMessage({
        gym_id: gymId,
        member_id: memberId,
        recipient_phone: phone,
        message_type: 'text',
        status: 'sent',
        wa_message_id: result.messageId,
      });

      // Return a WAResponse-compatible object
      return {
        messaging_product: 'whatsapp',
        contacts: [{ input: phone, wa_id: phone }],
        messages: [{ id: result.messageId || `bridge_${Date.now()}` }],
      };
    } catch (error: any) {
      // If bridge is unreachable (network error), queue for later
      if (error.name === 'AbortError' || error.cause?.code === 'ECONNREFUSED') {
        await this.queueForLater({
          gym_id: gymId,
          member_id: memberId,
          to: phone,
          type: 'text',
          body,
        });

        await this.logMessage({
          gym_id: gymId,
          member_id: memberId,
          recipient_phone: phone,
          message_type: 'text',
          status: 'queued',
          error_message: 'Bridge offline - message queued',
        });

        return {
          messaging_product: 'whatsapp',
          contacts: [{ input: phone, wa_id: phone }],
          messages: [{ id: `queued_${Date.now()}` }],
        };
      }

      throw error;
    }
  }

  async sendTemplate(
    to: string,
    templateName: string,
    params: TemplateParam[],
    gymId?: string,
    memberId?: string
  ): Promise<WAResponse> {
    // Baileys does not support official template messages.
    // Instead, we resolve the template body and send as plain text.
    const templateDef = Object.values(WA_TEMPLATES).find((t) => t.name === templateName);

    let body: string;
    if (templateDef) {
      // Replace {{1}}, {{2}}, etc. with actual parameter values
      body = templateDef.body;
      params.forEach((param, index) => {
        body = body.replace(`{{${index + 1}}}`, param.text || '');
      });
    } else {
      // Fallback: just send the template name and params as text
      const paramTexts = params.map((p) => p.text || '').join(', ');
      body = `[${templateName}] ${paramTexts}`;
    }

    return this.sendText(to, body, gymId, memberId);
  }

  async sendDocument(
    to: string,
    pdfBuffer: Buffer,
    filename: string,
    caption: string,
    gymId?: string,
    memberId?: string
  ): Promise<WAResponse> {
    const phone = this.formatPhone(to);

    try {
      const base64 = pdfBuffer.toString('base64');
      const response = await this.bridgeFetch('/send', {
        method: 'POST',
        body: JSON.stringify({
          to: phone,
          type: 'media',
          media: {
            base64,
            mimeType: 'application/pdf',
            filename,
            caption,
          },
        }),
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        const errorMsg = result.error || 'Bridge document send failed';
        await this.logMessage({
          gym_id: gymId,
          member_id: memberId,
          recipient_phone: phone,
          message_type: 'document',
          status: 'failed',
          error_message: errorMsg,
        });
        throw new Error(errorMsg);
      }

      await this.logMessage({
        gym_id: gymId,
        member_id: memberId,
        recipient_phone: phone,
        message_type: 'document',
        status: 'sent',
        wa_message_id: result.messageId,
      });

      return {
        messaging_product: 'whatsapp',
        contacts: [{ input: phone, wa_id: phone }],
        messages: [{ id: result.messageId || `bridge_doc_${Date.now()}` }],
      };
    } catch (error: any) {
      if (error.name === 'AbortError' || error.cause?.code === 'ECONNREFUSED') {
        // Documents are too large to queue effectively, log the failure
        await this.logMessage({
          gym_id: gymId,
          member_id: memberId,
          recipient_phone: phone,
          message_type: 'document',
          status: 'failed',
          error_message: 'Bridge offline - document cannot be queued',
        });

        throw new Error('WhatsApp bridge is offline. Document messages require an active connection.');
      }

      throw error;
    }
  }

  async broadcastTemplate(
    phones: string[],
    templateName: string,
    paramsPerPhone: TemplateParam[][],
    gymId?: string
  ): Promise<BroadcastResult[]> {
    const results: BroadcastResult[] = [];

    for (let i = 0; i < phones.length; i++) {
      const phone = phones[i];
      const params = paramsPerPhone[i];

      try {
        const response = await this.sendTemplate(phone, templateName, params, gymId);
        results.push({
          phone,
          success: true,
          messageId: response.messages?.[0]?.id,
        });
      } catch (error: any) {
        results.push({
          phone,
          success: false,
          error: error.message,
        });
      }

      // Respect rate limits: 3s between messages in broadcast mode
      if (i < phones.length - 1) {
        await new Promise((resolve) => setTimeout(resolve, 3000));
      }
    }

    return results;
  }

  async checkConnection(): Promise<ConnectionStatus> {
    try {
      const response = await this.bridgeFetch('/status');
      const data = await response.json();

      if (!response.ok) {
        return { connected: false };
      }

      return {
        connected: data.connected ?? false,
        displayPhoneNumber: data.phone,
      };
    } catch (e) {
      return { connected: false };
    }
  }

  async getTemplateStatus(templateName: string): Promise<TemplateStatus> {
    // Baileys does not use Meta-approved templates.
    // Return a stub indicating the template will be sent as plain text.
    const templateDef = Object.values(WA_TEMPLATES).find((t) => t.name === templateName);

    return {
      name: templateName,
      status: templateDef ? 'APPROVED' : 'PENDING',
      category: templateDef?.category || 'UTILITY',
    };
  }

  async sendTextMessage(to: string, body: string, gymId?: string, memberId?: string): Promise<WAResponse> {
    return this.sendText(to, body, gymId, memberId);
  }

  async sendTemplateMessage(
    to: string,
    templateName: string,
    paramsObj?: Record<string, any>,
    gymId?: string,
    memberId?: string
  ): Promise<WAResponse> {
    const params: TemplateParam[] = paramsObj
      ? Object.values(paramsObj).map((val) => ({
          type: 'text' as const,
          text: String(val),
        }))
      : [];
    return this.sendTemplate(to, templateName, params, gymId, memberId);
  }
}
