import { Hono } from 'hono';
import { streamSSE } from 'hono/streaming';
import QRCode from 'qrcode';
import { getStatus, baileysEvents, requestPairingCode } from '../baileys.js';

const qrRoute = new Hono();

qrRoute.get('/', async (c) => {
  const status = getStatus();

  if (status.state === 'connected') {
    return c.json({ status: 'connected', phone: status.phone });
  }

  if (status.pairingCode) {
    return c.json({ status: 'waiting_pairing_code', pairingCode: status.pairingCode });
  }

  if (status.qr) {
    const dataUrl = await QRCode.toDataURL(status.qr);
    return c.json({ status: 'waiting_qr', qr: dataUrl });
  }

  return c.json({ status: status.state });
});

/**
 * Request an 8-digit pairing code to link phone without scanning QR.
 * Inspired by Evolution API's pairing code endpoint.
 */
qrRoute.post('/pair', async (c) => {
  try {
    const body = await c.req.json();
    if (!body.phone) {
      return c.json({ success: false, error: 'Missing "phone" in request body' }, 400);
    }

    const code = await requestPairingCode(body.phone);
    return c.json({
      success: true,
      pairingCode: code,
      instructions: 'Open WhatsApp > Settings > Linked Devices > Link with phone number instead, and enter this code.',
    });
  } catch (err: any) {
    return c.json({ success: false, error: err.message }, 500);
  }
});

qrRoute.get('/stream', (c) => {
  return streamSSE(c, async (stream) => {
    const onStateChange = (state: string) => {
      stream.writeSSE({ data: JSON.stringify({ event: 'state', state }) });
    };

    const onQr = async (qrStr: string) => {
      try {
        const dataUrl = await QRCode.toDataURL(qrStr);
        stream.writeSSE({ data: JSON.stringify({ event: 'qr', qr: dataUrl }) });
      } catch (err) {
        console.error(err);
      }
    };

    const onPairingCode = (code: string) => {
      stream.writeSSE({ data: JSON.stringify({ event: 'pairing_code', pairingCode: code }) });
    };

    baileysEvents.on('state_change', onStateChange);
    baileysEvents.on('qr', onQr);
    baileysEvents.on('pairing_code', onPairingCode);

    // Initial state
    const status = getStatus();
    onStateChange(status.state);
    if (status.pairingCode) {
      onPairingCode(status.pairingCode);
    } else if (status.qr) {
      onQr(status.qr);
    }

    c.req.raw.signal.addEventListener('abort', () => {
      baileysEvents.off('state_change', onStateChange);
      baileysEvents.off('qr', onQr);
      baileysEvents.off('pairing_code', onPairingCode);
    });

    // Keep alive
    while (!c.req.raw.signal.aborted) {
      await stream.writeSSE({ data: JSON.stringify({ event: 'ping' }) });
      await new Promise(r => setTimeout(r, 15000));
    }
  });
});

export default qrRoute;
