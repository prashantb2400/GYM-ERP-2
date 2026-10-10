import makeWASocket, {
  DisconnectReason,
  fetchLatestBaileysVersion,
  Browsers,
  AnyMessageContent,
} from '@whiskeysockets/baileys';
import { Boom } from '@hapi/boom';
import pino from 'pino';
import { useSqliteAuthState } from './auth-store.js';
import { EventEmitter } from 'events';
import { matchAutoReply } from './auto-responder.js';

const logger = pino({ level: 'silent' });

export const baileysEvents = new EventEmitter();

let sock: ReturnType<typeof makeWASocket> | null = null;
let connectionState: 'connecting' | 'connected' | 'disconnected' = 'disconnected';
let currentQr: string | undefined = undefined;
let currentPairingCode: string | undefined = undefined;

export async function initConnection() {
  if (sock) {
    try {
      (sock.ev as any).removeAllListeners();
      sock.end(undefined);
    } catch {}
    sock = null;
  }

  const { state, saveCreds } = useSqliteAuthState('./data/auth.db');
  const { version } = await fetchLatestBaileysVersion();

  connectionState = 'connecting';
  currentQr = undefined;
  currentPairingCode = undefined;
  baileysEvents.emit('state_change', connectionState);

  sock = makeWASocket({
    version,
    logger,
    printQRInTerminal: false,
    auth: state,
    browser: Browsers.macOS('Desktop'),
    syncFullHistory: false,
  });

  sock.ev.on('creds.update', saveCreds);

  sock.ev.on('connection.update', (update: any) => {
    const { connection, lastDisconnect, qr } = update;

    if (qr) {
      currentQr = qr;
      baileysEvents.emit('qr', qr);
    }

    if (connection === 'close') {
      currentQr = undefined;
      currentPairingCode = undefined;
      connectionState = 'disconnected';
      baileysEvents.emit('state_change', connectionState);

      const shouldReconnect =
        (lastDisconnect?.error as Boom)?.output?.statusCode !== DisconnectReason.loggedOut;
      if (shouldReconnect) {
        setTimeout(initConnection, 5000);
      }
    } else if (connection === 'open') {
      currentQr = undefined;
      currentPairingCode = undefined;
      connectionState = 'connected';
      baileysEvents.emit('state_change', connectionState);
    }
  });

  sock.ev.on('messages.upsert', async (m: any) => {
    if (m.type === 'notify') {
      for (const msg of m.messages) {
        if (!msg.key.fromMe && msg.key.remoteJid) {
          const body = msg.message?.conversation || msg.message?.extendedTextMessage?.text || '';
          const remoteJid = msg.key.remoteJid;

          baileysEvents.emit('message', {
            from: remoteJid,
            body,
            timestamp: msg.messageTimestamp,
            type: Object.keys(msg.message || {})[0] || 'unknown',
          });

          // Keyword Auto-Responder (Inspired by Zerodha Whatomate)
          if (body && !remoteJid.endsWith('@g.us')) {
            const autoReply = matchAutoReply(body);
            if (autoReply && sock && connectionState === 'connected') {
              // Simulate natural reading & typing delay
              setTimeout(async () => {
                try {
                  if (sock && connectionState === 'connected') {
                    await sock.sendPresenceUpdate('composing', remoteJid);
                    await new Promise(r => setTimeout(r, 1200));
                    await sock.sendPresenceUpdate('paused', remoteJid);
                    await sock.sendMessage(remoteJid, { text: autoReply });
                  }
                } catch (err) {
                  logger.warn({ err }, 'Failed to dispatch auto-reply');
                }
              }, 1500);
            }
          }
        }
      }
    }
  });
}

/**
 * Requests an 8-digit phone pairing code for passwordless linking without camera QR scanning.
 * Inspired by Evolution API's pairing code workflow.
 */
export async function requestPairingCode(phone: string): Promise<string> {
  if (!sock) {
    throw new Error('WhatsApp socket is not initialized');
  }
  if (connectionState === 'connected') {
    throw new Error('WhatsApp is already connected');
  }

  let cleaned = phone.replace(/\D/g, '');
  if (cleaned.length === 10) {
    cleaned = '91' + cleaned;
  }

  const code = await sock.requestPairingCode(cleaned);
  currentPairingCode = code;
  baileysEvents.emit('pairing_code', code);
  return code;
}

export function formatJid(phone: string): string {
  let cleaned = phone.replace(/\D/g, '');
  if (cleaned.length === 10) {
    cleaned = '91' + cleaned;
  }
  if (!cleaned.endsWith('@s.whatsapp.net') && !cleaned.endsWith('@g.us')) {
    cleaned += '@s.whatsapp.net';
  }
  return cleaned;
}

/**
 * Sends a text message with anti-ban human typing simulation.
 */
export async function sendText(
  to: string,
  body: string,
  options: { simulateTyping?: boolean } = { simulateTyping: true }
): Promise<string> {
  if (!sock || connectionState !== 'connected') {
    throw new Error('Not connected to WhatsApp');
  }
  const jid = formatJid(to);

  // Anti-Ban Simulation: Send typing presence with randomized delay
  if (options.simulateTyping) {
    try {
      await sock.sendPresenceUpdate('composing', jid);
      const jitterMs = Math.floor(Math.random() * 800) + 700; // 700ms - 1500ms
      await new Promise(r => setTimeout(r, jitterMs));
      await sock.sendPresenceUpdate('paused', jid);
    } catch {}
  }

  const result = await sock.sendMessage(jid, { text: body });
  return result?.key.id || '';
}

/**
 * Sends media (image, video, document, or native PTT audio voice notes).
 */
export async function sendMedia(
  to: string,
  buffer: Buffer,
  mimeType: string,
  caption?: string
): Promise<string> {
  if (!sock || connectionState !== 'connected') {
    throw new Error('Not connected to WhatsApp');
  }
  const jid = formatJid(to);
  let content: AnyMessageContent;

  if (mimeType.startsWith('image/')) {
    content = { image: buffer, caption };
  } else if (mimeType.startsWith('video/')) {
    content = { video: buffer, caption };
  } else if (mimeType.startsWith('audio/')) {
    // Native Push-To-Talk (PTT) green voice note waveform
    content = { audio: buffer, mimetype: mimeType, ptt: true };
  } else {
    content = { document: buffer, mimetype: mimeType, caption, fileName: 'document' };
  }

  const result = await sock.sendMessage(jid, content);
  return result?.key.id || '';
}

export function getStatus() {
  return {
    state: connectionState,
    phone: sock?.user?.id?.split(':')[0],
    qr: currentQr,
    pairingCode: currentPairingCode,
  };
}

export async function closeConnection() {
  if (sock) {
    try {
      (sock.ev as any).removeAllListeners();
      sock.end(undefined);
    } catch {}
    sock = null;
  }
}
