import { Hono } from 'hono';
import { streamSSE } from 'hono/streaming';
import QRCode from 'qrcode';
import { getStatus, baileysEvents } from '../baileys.js';

const qrRoute = new Hono();

qrRoute.get('/', async (c) => {
  const status = getStatus();
  
  if (status.state === 'connected') {
    return c.json({ status: 'connected' });
  }
  
  if (status.qr) {
    const dataUrl = await QRCode.toDataURL(status.qr);
    return c.json({ status: 'waiting_qr', qr: dataUrl });
  }
  
  return c.json({ status: status.state });
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

    baileysEvents.on('state_change', onStateChange);
    baileysEvents.on('qr', onQr);

    // Initial state
    const status = getStatus();
    onStateChange(status.state);
    if (status.qr) {
      onQr(status.qr);
    }

    c.req.raw.signal.addEventListener('abort', () => {
      baileysEvents.off('state_change', onStateChange);
      baileysEvents.off('qr', onQr);
    });
    
    // Keep alive
    while (!c.req.raw.signal.aborted) {
      await stream.writeSSE({ data: JSON.stringify({ event: 'ping' }) });
      await new Promise(r => setTimeout(r, 15000));
    }
  });
});

export default qrRoute;
