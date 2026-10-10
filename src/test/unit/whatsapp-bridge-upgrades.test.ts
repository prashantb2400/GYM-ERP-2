import { describe, it, expect, vi, beforeEach } from 'vitest';
import { matchAutoReply } from '../../../whatsapp-bridge/src/auto-responder';
import { BaileysBridgeProvider } from '@/lib/whatsapp/providers/baileys-bridge';

describe('WhatsApp Bridge 2.0 Upgrades', () => {
  describe('Keyword Auto-Responder (Inspired by Zerodha Whatomate)', () => {
    it('matches greeting keywords and returns interactive menu', () => {
      const reply = matchAutoReply('Hello');
      expect(reply).not.toBeNull();
      expect(reply).toContain('Welcome to Gym Assistant');
      expect(reply).toContain('PLANS');
      expect(reply).toContain('HOURS');
    });

    it('matches plan inquiries and returns membership packages', () => {
      const reply1 = matchAutoReply('What are your gym plans?');
      expect(reply1).not.toBeNull();
      expect(reply1).toContain('Membership Plans & Pricing');
      expect(reply1).toContain('Monthly Silver');
      expect(reply1).toContain('Annual Elite');

      const reply2 = matchAutoReply('1');
      expect(reply2).toBe(reply1);
    });

    it('matches operating hour inquiries and returns gym timings', () => {
      const reply = matchAutoReply('What are your timings?');
      expect(reply).not.toBeNull();
      expect(reply).toContain('Gym Operating Hours');
      expect(reply).toContain('5:30 AM - 10:30 PM');
    });

    it('matches trial pass requests and returns free guest pass link', () => {
      const reply = matchAutoReply('Can I get a trial pass?');
      expect(reply).not.toBeNull();
      expect(reply).toContain('1-Day Complimentary Guest Pass');
      expect(reply).toContain('https://gymerp.live/bio/main-branch');
    });

    it('matches location inquiries and returns map directions', () => {
      const reply = matchAutoReply('Where is your gym location?');
      expect(reply).not.toBeNull();
      expect(reply).toContain('Gym Location & Directions');
      expect(reply).toContain('valet parking');
    });

    it('returns null for unrelated casual conversation', () => {
      const reply = matchAutoReply('I will be 10 minutes late today');
      expect(reply).toBeNull();
    });
  });

  describe('Baileys Bridge Provider Pairing Code & Voice Notes', () => {
    let provider: BaileysBridgeProvider;

    beforeEach(() => {
      provider = new BaileysBridgeProvider({
        bridgeUrl: 'http://localhost:48291',
        bridgeToken: 'test-token',
      });
      vi.restoreAllMocks();
    });

    it('requests phone pairing code from bridge', async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          success: true,
          pairingCode: 'K8DF-45ZX',
        }),
      });
      global.fetch = mockFetch;

      const result = await provider.requestPairingCode('+91 98765 43210');
      expect(result.success).toBe(true);
      expect(result.pairingCode).toBe('K8DF-45ZX');
      expect(mockFetch).toHaveBeenCalledWith(
        'http://localhost:48291/qr/pair',
        expect.objectContaining({
          method: 'POST',
        })
      );
    });

    it('sends PTT voice note with audio mime type', async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          success: true,
          messageId: 'wa_ptt_12345',
        }),
      });
      global.fetch = mockFetch;

      const audioBuffer = Buffer.from('fake-audio-bytes');
      const response = await provider.sendVoiceNote('+919876543210', audioBuffer);

      expect(response.messaging_product).toBe('whatsapp');
      expect(response.messages[0].id).toBe('wa_ptt_12345');
      expect(mockFetch).toHaveBeenCalledWith(
        'http://localhost:48291/send',
        expect.objectContaining({
          method: 'POST',
          body: expect.stringContaining('audio/ogg; codecs=opus'),
        })
      );
    });
  });
});
