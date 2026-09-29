import { DatabaseSync } from 'node:sqlite';
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

let db: DatabaseSync | null = null;
let isProcessing = false;
let workerTimer: NodeJS.Timeout | null = null;

let insertStmt: ReturnType<DatabaseSync['prepare']> | null = null;
let selectNextStmt: ReturnType<DatabaseSync['prepare']> | null = null;
let updateProcessingStmt: ReturnType<DatabaseSync['prepare']> | null = null;
let updateCompletedStmt: ReturnType<DatabaseSync['prepare']> | null = null;
let updateFailedStmt: ReturnType<DatabaseSync['prepare']> | null = null;
let updateRetryStmt: ReturnType<DatabaseSync['prepare']> | null = null;
let countStmt: ReturnType<DatabaseSync['prepare']> | null = null;

function getDb(): DatabaseSync {
  if (!db) {
    const dir = './data';
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    db = new DatabaseSync(path.join(dir, 'queue.db'));
    db.exec(`
      CREATE TABLE IF NOT EXISTS queue (
        id TEXT PRIMARY KEY,
        data TEXT NOT NULL,
        status TEXT NOT NULL,
        retries INTEGER DEFAULT 0,
        addedAt INTEGER NOT NULL
      )
    `);
    insertStmt = db.prepare('INSERT INTO queue (id, data, status, retries, addedAt) VALUES (?, ?, ?, ?, ?)');
    selectNextStmt = db.prepare('SELECT * FROM queue WHERE status = ? ORDER BY addedAt ASC LIMIT 1');
    updateProcessingStmt = db.prepare('UPDATE queue SET status = ? WHERE id = ?');
    updateCompletedStmt = db.prepare('UPDATE queue SET status = ? WHERE id = ?');
    updateFailedStmt = db.prepare('UPDATE queue SET status = ?, retries = ? WHERE id = ?');
    updateRetryStmt = db.prepare('UPDATE queue SET status = ?, retries = ?, data = ? WHERE id = ?');
    countStmt = db.prepare('SELECT COUNT(*) as c FROM queue WHERE status = ?');
  }
  return db;
}

export function enqueue(message: Omit<QueueMessage, 'id' | 'retries' | 'addedAt'>): string {
  getDb();
  const id = Math.random().toString(36).substring(2, 15);
  const fullMessage: QueueMessage = {
    ...message,
    id,
    retries: 0,
    addedAt: Date.now()
  };
  
  insertStmt!.run(id, JSON.stringify(fullMessage), 'pending', 0, fullMessage.addedAt);
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
  getDb();
  
  try {
    const row = selectNextStmt!.get('pending') as any;
    
    if (!row) {
      isProcessing = false;
      return;
    }

    const msg: QueueMessage = JSON.parse(row.data);
    
    // Mark as processing
    updateProcessingStmt!.run('processing', msg.id);
    
    try {
      if (msg.type === 'text' && msg.body) {
        await sendText(msg.to, msg.body);
      } else if (msg.type === 'media' && msg.media) {
        const buffer = Buffer.from(msg.media.base64, 'base64');
        await sendMedia(msg.to, buffer, msg.media.mimeType, msg.media.caption);
      }
      
      recordSend();
      updateCompletedStmt!.run('completed', msg.id);
    } catch (err: any) {
      log.error({ err, msgId: msg.id }, 'Failed to send queued message');
      const retries = msg.retries + 1;
      if (retries >= 3) {
        updateFailedStmt!.run('failed', retries, msg.id);
      } else {
        msg.retries = retries;
        updateRetryStmt!.run('pending', retries, JSON.stringify(msg), msg.id);
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
    try {
      db.close();
    } catch {}
    db = null;
  }
}

export function getQueueStatus() {
  getDb();
  const getCount = (status: string) => {
    const row = countStmt!.get(status) as { c: number } | undefined;
    return row?.c ?? 0;
  };
  return {
    pending: getCount('pending'),
    processing: getCount('processing'),
    failed: getCount('failed'),
    completed: getCount('completed')
  };
}
