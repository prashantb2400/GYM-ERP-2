export interface WAResponse {
  messaging_product: string;
  contacts: { input: string; wa_id: string }[];
  messages: { id: string }[];
}

export interface TemplateParam {
  type: 'text' | 'currency' | 'date_time' | 'document' | 'image' | 'video';
  text?: string;
  currency?: { fallback_value: string; code: string; amount_1000: number };
  date_time?: { fallback_value: string };
  document?: { link?: string; id?: string; filename?: string };
  image?: { link?: string; id?: string };
  video?: { link?: string; id?: string };
}

export interface BroadcastResult {
  phone: string;
  success: boolean;
  messageId?: string;
  error?: string;
}

export interface WAWebhookBody {
  object: string;
  entry: {
    id: string;
    changes: {
      value: {
        messaging_product: string;
        metadata: {
          display_phone_number: string;
          phone_number_id: string;
        };
        contacts?: {
          profile: { name: string };
          wa_id: string;
        }[];
        errors?: {
          code: number;
          title: string;
          message: string;
          error_data: { details: string };
        }[];
        messages?: {
          from: string;
          id: string;
          timestamp: string;
          text?: { body: string };
          type: string;
        }[];
        statuses?: {
          id: string;
          status: 'sent' | 'delivered' | 'read' | 'failed';
          timestamp: string;
          recipient_id: string;
          errors?: {
            code: number;
            title: string;
            message: string;
            error_data: { details: string };
          }[];
        }[];
      };
      field: string;
    }[];
  }[];
}

export interface TemplateStatus {
  name: string;
  status: 'APPROVED' | 'REJECTED' | 'PENDING' | 'PAUSED' | 'DISABLED';
  category: string;
}

export interface ConnectionStatus {
  connected: boolean;
  phoneNumberId?: string;
  wabaId?: string;
  displayPhoneNumber?: string;
  qualityRating?: string;
}

export interface WAError extends Error {
  code?: number;
  type?: string;
  fbtrace_id?: string;
}
