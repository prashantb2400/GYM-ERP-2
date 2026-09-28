import Database from 'better-sqlite3';
import { canSend, recordSend } from './rate-limiter.js';
import { sendText, sendMedia, getStatus } from './baileys.js';
import path from 'path';
import fs from 'fs';
import pino from 'pino';

const log = pino({ level: 'info' });

interface QueueMessage {
  id: string;
  to: string;
  type: 'text' | 'media';
  body?: string;
  media?: {
    base64: string;
    mimeType: string;
    caption?: string;
  };
  retries: number;
  addedAt: number;
}

let db: ReturnType<typeof Database> | null = null;
let isProcessing = false;
let workerTimer: NodeJS.Timeout | null = null;

function getDb() {
  if (!db) {
    const dir = './data';
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    db = new Database(path.join(dir, 'queue.db'));
    db.pragma('journal_mode = WAL');
    db.exec(`
      CREATE TABLE IF NOT EXISTS queue (
        id TEXT PRIMARY KEY,
        data TEXT NOT NULL,
        status TEXT NOT NULL,
        retries INTEGER DEFAULT 0,
        addedAt INTEGER NOT NULL
      )
    `);
  }
  return db;
}

export function enqueue(message: Omit<QueueMessage, 'id' | 'retries' | 'addedAt'>): string {
  const database = getDb();
  const id = Math.random().toString(36).substring(2, 15);
  const fullMessage: QueueMessage = {
    ...message,
    id,
    retries: 0,
    addedAt: Date.now()
  };
  
  const stmt = database.prepare('INSERT INTO queue (id, data, status, retries, addedAt) VALUES (?, ?, ?, ?, ?)');
  stmt.run(id, JSON.stringify(fullMessage), 'pending', 0, fullMessage.addedAt);
  
  return id;
}

async function processNext() {
  if (isProcessing) return;
  
  const status = getStatus();
  if (status.state !== 'connected') return;

  const rateLimit = canSend();
  if (!rateLimit.allowed) {
    if (rateLimit.retryAfterMs) {
      setTimeout(processQueue, rateLimit.retryAfterMs);
    }
    return;
  }

  isProcessing = true;
  const database = getDb();
  
  try {
    const stmt = database.prepare('SELECT * FROM queue WHERE status = ? ORDER BY addedAt ASC LIMIT 1');
    const row = stmt.get('pending') as any;
    
    if (!row) {
      isProcessing = false;
      return;
    }

    const msg: QueueMessage = JSON.parse(row.data);
    
    // Mark as processing
    database.prepare('UPDATE queue SET status = ? WHERE id = ?').run('processing', msg.id);
    
    try {
      if (msg.type === 'text' && msg.body) {
        await sendText(msg.to, msg.body);
      } else if (msg.type === 'media' && msg.media) {
        const buffer = Buffer.from(msg.media.base64, 'base64');
        await sendMedia(msg.to, buffer, msg.media.mimeType, msg.media.caption);
      }
      
      recordSend();
      database.prepare('UPDATE queue SET status = ? WHERE id = ?').run('completed', msg.id);
    } catch (err: any) {
      log.error({ err, msgId: msg.id }, 'Failed to send queued message');
      const retries = msg.retries + 1;
      if (retries >= 3) {
        database.prepare('UPDATE queue SET status = ?, retries = ? WHERE id = ?').run('failed', retries, msg.id);
      } else {
        msg.retries = retries;
        database.prepare('UPDATE queue SET status = ?, retries = ?, data = ? WHERE id = ?').run('pending', retries, JSON.stringify(msg), msg.id);
      }
    }
  } catch (err) {
    log.error({ err }, 'Error in queue processor');
  } finally {
    isProcessing = false;
    processQueue(); // Loop to next message
  }
}

function processQueue() {
  if (workerTimer) clearTimeout(workerTimer);
  workerTimer = setTimeout(processNext, 1000);
}

export function startQueueWorker() {
  processQueue();
}

export function stopQueueWorker() {
  if (workerTimer) {
    clearTimeout(workerTimer);
    workerTimer = null;
  }
  if (db) {
    db.close();
    db = null;
  }
}

export function getQueueStatus() {
  const database = getDb();
  const getCount = (status: string) => {
    const row = database.prepare('SELECT COUNT(*) as c FROM queue WHERE status = ?').get() as { c: number };
    return row.c;
  };
  return {
    pending: getCount('pending'),
    processing: getCount('processing'),
    failed: getCount('failed'),
    completed: getCount('completed')
  };
}
