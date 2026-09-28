import { Hono } from 'hono';
import { streamSSE } from 'hono/streaming';
import { baileysEvents } from '../baileys.js';

const messagesRoute = new Hono();

messagesRoute.get('/stream', (c) => {
  return streamSSE(c, async (stream) => {
    const onMessage = (msg: any) => {
      stream.writeSSE({ data: JSON.stringify(msg) });
    };

    baileysEvents.on('message', onMessage);

    c.req.raw.signal.addEventListener('abort', () => {
      baileysEvents.off('message', onMessage);
    });

    // Keep alive
    while (!c.req.raw.signal.aborted) {
      await stream.writeSSE({ data: JSON.stringify({ event: 'ping' }) });
      await new Promise(r => setTimeout(r, 15000));
    }
  });
});

export default messagesRoute;
