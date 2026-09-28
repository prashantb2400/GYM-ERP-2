/**
 * Meta Cloud API Provider
 *
 * Implements IWhatsAppProvider using the official Meta WhatsApp Cloud API
 * (graph.facebook.com). This is the paid, fully-compliant provider that
 * supports green-tick verification and template messages.
 *
 * This is a direct extraction of the original WhatsAppClient class,
 * now conforming to the provider interface for hot-swappable backends.
 */

import { supabaseAdmin } from '@/lib/supabase/admin';
import type {
  WAResponse,
  TemplateParam,
  BroadcastResult,
  WAWebhookBody,
  TemplateStatus,
  ConnectionStatus,
  WAError,
} from '../types';
import type { IWhatsAppProvider, WhatsAppMode } from './interface';

export class MetaCloudProvider implements IWhatsAppProvider {
  readonly providerName = 'Meta Cloud API';
  readonly mode: WhatsAppMode = 'cloud_api';

  private phoneNumberId: string;
  private accessToken: string;
  private baseUrl = 'https://graph.facebook.com/v18.0';

  constructor() {
    this.phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID || '';
    this.accessToken = process.env.WHATSAPP_TOKEN || '';

    if (!this.phoneNumberId || !this.accessToken) {
      console.warn('WhatsApp Cloud API environment variables are not fully configured.');
    }
  }

  // ---- Shared helpers ----

  private formatPhone(phone: string): string {
    const cleaned = phone.replace(/\D/g, '');
    if (!cleaned.startsWith('91') && cleaned.length === 10) {
      return `91${cleaned}`;
    }
    return cleaned;
  }

  private async sleep(ms: number) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  private async fetchWithRetry(url: string, options: RequestInit, retries = 3): Promise<Response> {
    let lastError: any;
    let attempt = 0;

    while (attempt < retries) {
      try {
        const response = await fetch(url, options);
        if (response.status === 429) {
          attempt++;
          const delay = Math.pow(2, attempt - 1) * 1000; // 1s, 2s, 4s
          await this.sleep(delay);
          continue;
        }
        return response;
      } catch (error) {
        lastError = error;
        attempt++;
        const delay = Math.pow(2, attempt - 1) * 1000;
        await this.sleep(delay);
      }
    }
    throw lastError || new Error('Max retries reached');
  }

  private async logMessage(data: {
    gym_id?: string;
    member_id?: string;
    recipient_phone: string;
    recipient_name?: string;
    message_type: 'text' | 'template' | 'document';
    template_name?: string;
    document_type?: string;
    status: 'sent' | 'delivered' | 'read' | 'failed';
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

  // ---- IWhatsAppProvider methods ----

  async sendText(to: string, body: string, gymId?: string, memberId?: string): Promise<WAResponse> {
    const phone = this.formatPhone(to);
    const url = `${this.baseUrl}/${this.phoneNumberId}/messages`;

    const payload = {
      messaging_product: 'whatsapp',
      recipient_type: 'individual',
      to: phone,
      type: 'text',
      text: { preview_url: true, body },
    };

    const response = await this.fetchWithRetry(url, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${this.accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    const data = await response.json();

    if (!response.ok) {
      const waError = new Error(data.error?.message || 'Failed to send text') as WAError;
      waError.code = data.error?.code;
      waError.type = data.error?.type;

      await this.logMessage({
        gym_id: gymId,
        member_id: memberId,
        recipient_phone: phone,
        message_type: 'text',
        status: 'failed',
        error_message: waError.message,
      });
      throw waError;
    }

    await this.logMessage({
      gym_id: gymId,
      member_id: memberId,
      recipient_phone: phone,
      message_type: 'text',
      status: 'sent',
      wa_message_id: data.messages?.[0]?.id,
    });

    return data as WAResponse;
  }

  async sendTemplate(
    to: string,
    templateName: string,
    params: TemplateParam[],
    gymId?: string,
    memberId?: string
  ): Promise<WAResponse> {
    const phone = this.formatPhone(to);
    const url = `${this.baseUrl}/${this.phoneNumberId}/messages`;

    const payload = {
      messaging_product: 'whatsapp',
      to: phone,
      type: 'template',
      template: {
        name: templateName,
        language: { code: 'en' },
        components: [
          {
            type: 'body',
            parameters: params,
          },
        ],
      },
    };

    const response = await this.fetchWithRetry(url, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${this.accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    const data = await response.json();

    if (!response.ok) {
      const waError = new Error(data.error?.message || 'Failed to send template') as WAError;
      waError.code = data.error?.code;
      waError.type = data.error?.type;

      await this.logMessage({
        gym_id: gymId,
        member_id: memberId,
        recipient_phone: phone,
        message_type: 'template',
        template_name: templateName,
        status: 'failed',
        error_message: waError.message,
      });
      throw waError;
    }

    await this.logMessage({
      gym_id: gymId,
      member_id: memberId,
      recipient_phone: phone,
      message_type: 'template',
      template_name: templateName,
      status: 'sent',
      wa_message_id: data.messages?.[0]?.id,
    });

    return data as WAResponse;
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
    const mediaId = await this.uploadMedia(pdfBuffer, 'application/pdf');

    const url = `${this.baseUrl}/${this.phoneNumberId}/messages`;

    const payload = {
      messaging_product: 'whatsapp',
      to: phone,
      type: 'document',
      document: {
        id: mediaId,
        filename,
        caption,
      },
    };

    const response = await this.fetchWithRetry(url, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${this.accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    const data = await response.json();

    if (!response.ok) {
      const waError = new Error(data.error?.message || 'Failed to send document') as WAError;
      waError.code = data.error?.code;

      await this.logMessage({
        gym_id: gymId,
        member_id: memberId,
        recipient_phone: phone,
        message_type: 'document',
        status: 'failed',
        error_message: waError.message,
      });
      throw waError;
    }

    await this.logMessage({
      gym_id: gymId,
      member_id: memberId,
      recipient_phone: phone,
      message_type: 'document',
      status: 'sent',
      wa_message_id: data.messages?.[0]?.id,
    });

    return data as WAResponse;
  }

  private async uploadMedia(buffer: Buffer, mimeType: string): Promise<string> {
    const url = `${this.baseUrl}/${this.phoneNumberId}/media`;

    const formData = new FormData();
    const blob = new Blob([new Uint8Array(buffer)], { type: mimeType });
    formData.append('file', blob);
    formData.append('messaging_product', 'whatsapp');

    const response = await this.fetchWithRetry(url, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${this.accessToken}`,
      },
      body: formData,
    });

    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.error?.message || 'Failed to upload media');
    }

    return data.id;
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

      if (i < phones.length - 1) {
        await this.sleep(800); // 800ms delay between broadcast messages
      }
    }

    return results;
  }

  /** Handle incoming Meta webhook payloads (status updates) */
  async handleWebhook(body: WAWebhookBody): Promise<void> {
    const entries = body.entry || [];
    for (const entry of entries) {
      const changes = entry.changes || [];
      for (const change of changes) {
        const value = change.value;

        // Handle status updates
        if (value.statuses && value.statuses.length > 0) {
          for (const status of value.statuses) {
            await supabaseAdmin
              .from('whatsapp_logs')
              .update({ status: status.status })
              .eq('wa_message_id', status.id);
          }
        }
      }
    }
  }

  async getTemplateStatus(templateName: string): Promise<TemplateStatus> {
    const wabaId = process.env.WHATSAPP_WABA_ID;
    if (!wabaId) throw new Error('WABA ID not configured');

    const url = `${this.baseUrl}/${wabaId}/message_templates?name=${templateName}`;
    const response = await this.fetchWithRetry(url, {
      headers: { Authorization: `Bearer ${this.accessToken}` },
    });

    const data = await response.json();
    if (!response.ok) throw new Error(data.error?.message || 'Failed to get template status');

    if (data.data && data.data.length > 0) {
      const template = data.data[0];
      return {
        name: template.name,
        status: template.status,
        category: template.category,
      };
    }
    throw new Error('Template not found');
  }

  async checkConnection(): Promise<ConnectionStatus> {
    try {
      const url = `${this.baseUrl}/${this.phoneNumberId}`;
      const response = await this.fetchWithRetry(url, {
        headers: { Authorization: `Bearer ${this.accessToken}` },
      });

      const data = await response.json();
      if (!response.ok) {
        return { connected: false };
      }

      return {
        connected: true,
        phoneNumberId: data.id,
        displayPhoneNumber: data.display_phone_number,
        qualityRating: data.quality_rating,
      };
    } catch (e) {
      return { connected: false };
    }
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
          type: 'text',
          text: String(val),
        }))
      : [];
    return this.sendTemplate(to, templateName, params, gymId, memberId);
  }
}
