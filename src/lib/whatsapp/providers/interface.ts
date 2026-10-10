/**
 * WhatsApp Provider Interface
 *
 * Abstraction layer that allows switching between different WhatsApp
 * messaging backends (Meta Cloud API or local Baileys bridge) per gym.
 */

import type { WAResponse, TemplateParam, BroadcastResult, ConnectionStatus, TemplateStatus } from '../types';

// ----- Shared result types -----

export interface SendResult {
  success: boolean;
  messageId?: string;
  error?: string;
  /** True when the message was enqueued instead of sent immediately */
  queued?: boolean;
}

export type WhatsAppMode = 'cloud_api' | 'local_bridge' | 'disabled';

// ----- Provider interface -----

export interface IWhatsAppProvider {
  /** Human-readable identifier for this provider (e.g. "Meta Cloud API", "Baileys Bridge") */
  readonly providerName: string;

  /** Current mode */
  readonly mode: WhatsAppMode;

  /**
   * Send a plain-text message.
   * @param to - Recipient phone number (10-digit or with country code)
   * @param body - Message text
   * @param gymId - Gym context for logging
   * @param memberId - Member context for logging
   */
  sendText(to: string, body: string, gymId?: string, memberId?: string): Promise<WAResponse>;

  /**
   * Send a pre-approved template message (Cloud API only, Baileys falls back to text).
   */
  sendTemplate(
    to: string,
    templateName: string,
    params: TemplateParam[],
    gymId?: string,
    memberId?: string
  ): Promise<WAResponse>;

  /**
   * Send a document (PDF, etc.).
   */
  sendDocument(
    to: string,
    pdfBuffer: Buffer,
    filename: string,
    caption: string,
    gymId?: string,
    memberId?: string
  ): Promise<WAResponse>;

  /**
   * Broadcast a template to multiple recipients.
   */
  broadcastTemplate(
    phones: string[],
    templateName: string,
    paramsPerPhone: TemplateParam[][],
    gymId?: string
  ): Promise<BroadcastResult[]>;

  /**
   * Check connection health.
   */
  checkConnection(): Promise<ConnectionStatus>;

  /**
   * Get a template's approval status (Cloud API only).
   * Baileys provider returns a stub since templates are not applicable.
   */
  getTemplateStatus(templateName: string): Promise<TemplateStatus>;

  /**
   * Convenience alias: send a text message.
   */
  sendTextMessage(to: string, body: string, gymId?: string, memberId?: string): Promise<WAResponse>;

  /**
   * Convenience alias: send a template with key-value params.
   */
  sendTemplateMessage(
    to: string,
    templateName: string,
    paramsObj?: Record<string, any>,
    gymId?: string,
    memberId?: string
  ): Promise<WAResponse>;

  /**
   * Optional: Request 8-digit pairing code to link phone without QR scanning.
   */
  requestPairingCode?(phone: string): Promise<{ success: boolean; pairingCode?: string; error?: string }>;

  /**
   * Optional: Send native audio voice note with PTT waveform.
   */
  sendVoiceNote?(to: string, audioBuffer: Buffer, gymId?: string, memberId?: string): Promise<WAResponse>;
}
