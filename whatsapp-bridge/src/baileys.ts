import makeWASocket, { DisconnectReason, useMultiFileAuthState, fetchLatestBaileysVersion, Browsers, isJidGroup, AnyMessageContent } from '@whiskeysockets/baileys';
import { Boom } from '@hapi/boom';
import pino from 'pino';
import { useSqliteAuthState } from './auth-store.js';
import { EventEmitter } from 'events';

const logger = pino({ level: 'silent' });

export const baileysEvents = new EventEmitter();

let sock: ReturnType<typeof makeWASocket> | null = null;
let connectionState: 'connecting' | 'connected' | 'disconnected' = 'disconnected';
let currentQr: string | undefined = undefined;

export async function initConnection() {
  const { state, saveCreds } = useSqliteAuthState('./data/auth.db');
  const { version, isLatest } = await fetchLatestBaileysVersion();
  
  connectionState = 'connecting';
  currentQr = undefined;
  baileysEvents.emit('state_change', connectionState);

  sock = makeWASocket({
    version,
    logger,
    printQRInTerminal: false,
    auth: state,
    browser: Browsers.macOS('Desktop'),
    syncFullHistory: false
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
      connectionState = 'disconnected';
      baileysEvents.emit('state_change', connectionState);
      
      const shouldReconnect = (lastDisconnect?.error as Boom)?.output?.statusCode !== DisconnectReason.loggedOut;
      if (shouldReconnect) {
        setTimeout(initConnection, 5000);
      }
    } else if (connection === 'open') {
      currentQr = undefined;
      connectionState = 'connected';
      baileysEvents.emit('state_change', connectionState);
    }
  });

  sock.ev.on('messages.upsert', (m: any) => {
    if (m.type === 'notify') {
      for (const msg of m.messages) {
        if (!msg.key.fromMe && msg.key.remoteJid) {
          baileysEvents.emit('message', {
            from: msg.key.remoteJid,
            body: msg.message?.conversation || msg.message?.extendedTextMessage?.text || '',
            timestamp: msg.messageTimestamp,
            type: Object.keys(msg.message || {})[0] || 'unknown'
          });
        }
      }
    }
  });
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

export async function sendText(to: string, body: string): Promise<string> {
  if (!sock || connectionState !== 'connected') {
    throw new Error('Not connected to WhatsApp');
  }
  const jid = formatJid(to);
  const result = await sock.sendMessage(jid, { text: body });
  return result?.key.id || '';
}

export async function sendMedia(to: string, buffer: Buffer, mimeType: string, caption?: string): Promise<string> {
  if (!sock || connectionState !== 'connected') {
    throw new Error('Not connected to WhatsApp');
  }
  const jid = formatJid(to);
  let content: AnyMessageContent;
  
  if (mimeType.startsWith('image/')) {
    content = { image: buffer, caption };
  } else if (mimeType.startsWith('video/')) {
    content = { video: buffer, caption };
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
    qr: currentQr
  };
}

export async function closeConnection() {
  if (sock) {
    (sock.ev as any).removeAllListeners();
    sock.end(undefined);
    sock = null;
  }
}
