import { Hono } from 'hono';
import { enqueue } from '../queue.js';
import { getStatus } from '../baileys.js';

const sendRoute = new Hono();

sendRoute.post('/', async (c) => {
  try {
    const body = await c.req.json();
    
    if (!body.to) {
      return c.json({ success: false, error: 'Missing "to" field' }, 400);
    }
    if (!body.type || !['text', 'media'].includes(body.type)) {
      return c.json({ success: false, error: 'Invalid or missing "type" field' }, 400);
    }
    
    if (body.type === 'text' && !body.body) {
      return c.json({ success: false, error: 'Missing "body" for text message' }, 400);
    }
    
    if (body.type === 'media' && (!body.media || !body.media.base64 || !body.media.mimeType)) {
      return c.json({ success: false, error: 'Missing media details for media message' }, 400);
    }

    const status = getStatus();
    if (status.state !== 'connected') {
      return c.json({ success: false, error: 'WhatsApp not connected' }, 503);
    }

    const messageId = enqueue({
      to: body.to,
      type: body.type,
      body: body.body,
      media: body.media
    });

    return c.json({ success: true, queued: true, messageId });
  } catch (err: any) {
    return c.json({ success: false, error: err.message }, 500);
  }
});

export default sendRoute;
