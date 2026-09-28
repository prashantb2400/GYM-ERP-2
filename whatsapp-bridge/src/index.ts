import { Hono } from 'hono';
import { serve } from '@hono/node-server';
import { bearerAuth } from 'hono/bearer-auth';
import { logger } from 'hono/logger';
import { cors } from 'hono/cors';
import { initConnection, closeConnection } from './baileys.js';
import { getAuthToken } from './auth-store.js';
import sendRoute from './routes/send.js';
import statusRoute from './routes/status.js';
import qrRoute from './routes/qr.js';
import messagesRoute from './routes/messages.js';
import { startQueueWorker, stopQueueWorker } from './queue.js';
import pino from 'pino';
import fs from 'fs';

const log = pino({ level: 'info' });

const app = new Hono();

app.use('*', logger());
app.use('*', cors());

let token = '';

app.use('*', async (c, next) => {
  if (c.req.path.startsWith('/qr/stream') || c.req.path.startsWith('/messages/stream')) {
    return next();
  }
  const authMiddleware = bearerAuth({ token });
  return authMiddleware(c, next);
});

app.route('/send', sendRoute);
app.route('/status', statusRoute);
app.route('/qr', qrRoute);
app.route('/messages', messagesRoute);

app.get('/', (c) => {
  return c.text('WhatsApp Bridge is running.');
});

async function bootstrap() {
  if (!fs.existsSync('./data')) {
    fs.mkdirSync('./data', { recursive: true });
  }

  token = process.env.API_TOKEN || getAuthToken();
  log.info({ token }, 'API Authentication Token');

  await initConnection();
  startQueueWorker();

  const port = 48291;
  const server = serve({
    fetch: app.fetch,
    port
  });

  log.info(`Server is running on port ${port}`);

  const shutdown = async () => {
    log.info('Shutting down...');
    server.close();
    stopQueueWorker();
    await closeConnection();
    process.exit(0);
  };

  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
}

bootstrap().catch(err => {
  log.error(err, 'Failed to start server');
  process.exit(1);
});
