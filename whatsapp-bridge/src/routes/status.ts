import { Hono } from 'hono';
import { getStatus } from '../baileys.js';
import { getStats as getRateLimitStats } from '../rate-limiter.js';
import { getQueueStatus } from '../queue.js';
import { getTunnelStatus } from '../tunnel.js';

const statusRoute = new Hono();
const startTime = Date.now();

statusRoute.get('/', (c) => {
  const baileyStatus = getStatus();
  return c.json({
    connected: baileyStatus.state === 'connected',
    state: baileyStatus.state,
    phone: baileyStatus.phone,
    uptime: Math.floor((Date.now() - startTime) / 1000),
    queue: getQueueStatus(),
    rateLimit: getRateLimitStats(),
    tunnel: getTunnelStatus()
  });
});

export default statusRoute;
