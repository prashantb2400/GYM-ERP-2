/**
 * Universal Offline Attendance Queue
 *
 * Provides resilient offline check-in caching across all biometric and manual
 * check-in modalities (Face, Fingerprint, QR, and Receptionist Manual).
 * When internet connectivity drops, events are persisted in IndexedDB and
 * automatically flushed to the server once connection is re-established.
 */

import { openDB, type DBSchema, type IDBPDatabase } from 'idb';

export type CheckInMethod = 'face' | 'fingerprint' | 'qr' | 'manual';

export interface QueuedCheckInEvent {
  localId: string;
  gymId: string;
  memberId: string;
  memberName: string;
  branchId?: string | null;
  method: CheckInMethod;
  timestamp: string; // ISO 8601 string
  notes?: string;
  synced: 0 | 1; // 0 = unsynced, 1 = synced
  attempts: number;
}

interface AttendanceQueueDB extends DBSchema {
  checkin_queue: {
    key: string;
    value: QueuedCheckInEvent;
    indexes: {
      'by-synced': number;
      'by-timestamp': string;
    };
  };
}

const DB_NAME = 'gymerp_universal_attendance_v1';
const DB_VERSION = 1;

let dbPromise: Promise<IDBPDatabase<AttendanceQueueDB>> | null = null;

function getQueueDB(): Promise<IDBPDatabase<AttendanceQueueDB>> {
  if (typeof window === 'undefined') {
    return Promise.reject(new Error('IndexedDB is browser-only'));
  }

  if (!dbPromise) {
    dbPromise = openDB<AttendanceQueueDB>(DB_NAME, DB_VERSION, {
      upgrade(db) {
        if (!db.objectStoreNames.contains('checkin_queue')) {
          const store = db.createObjectStore('checkin_queue', { keyPath: 'localId' });
          store.createIndex('by-synced', 'synced');
          store.createIndex('by-timestamp', 'timestamp');
        }
      },
    });
  }

  return dbPromise;
}

/**
 * Enqueue an attendance event locally.
 * Returns the local identifier for UI tracking.
 */
export async function enqueueCheckIn(
  event: Omit<QueuedCheckInEvent, 'localId' | 'synced' | 'attempts'>
): Promise<string> {
  const localId = typeof crypto !== 'undefined' && crypto.randomUUID
    ? crypto.randomUUID()
    : `local_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;

  const record: QueuedCheckInEvent = {
    ...event,
    localId,
    synced: 0,
    attempts: 0,
  };

  try {
    const db = await getQueueDB();
    await db.put('checkin_queue', record);
  } catch (err) {
    console.error('Failed to write check-in to offline store:', err);
  }

  // Attempt immediate flush if browser is online
  if (typeof navigator !== 'undefined' && navigator.onLine) {
    flushPendingCheckIns().catch((e) => console.warn('Background sync deferred:', e));
  }

  return localId;
}

/**
 * Get count of unsynced attendance records waiting to flush.
 */
export async function getPendingCheckInCount(): Promise<number> {
  try {
    const db = await getQueueDB();
    return await db.countFromIndex('checkin_queue', 'by-synced', 0);
  } catch {
    return 0;
  }
}

/**
 * Flush all pending offline check-in events to the cloud.
 */
export async function flushPendingCheckIns(): Promise<{
  synced: number;
  remaining: number;
}> {
  if (typeof navigator !== 'undefined' && !navigator.onLine) {
    const remaining = await getPendingCheckInCount();
    return { synced: 0, remaining };
  }

  const db = await getQueueDB();
  const pending = await db.getAllFromIndex('checkin_queue', 'by-synced', 0);

  if (!pending || pending.length === 0) {
    return { synced: 0, remaining: 0 };
  }

  try {
    const response = await fetch('/api/attendance/offline-sync', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ events: pending }),
    });

    if (!response.ok) {
      throw new Error(`Sync failed with HTTP status ${response.status}`);
    }

    const result = await response.json();

    if (result.success) {
      // Mark successful events or delete them to keep local storage lean
      const tx = db.transaction('checkin_queue', 'readwrite');
      for (const item of pending) {
        await tx.store.delete(item.localId);
      }
      await tx.done;

      return {
        synced: result.synced || pending.length,
        remaining: 0,
      };
    }
  } catch (err) {
    console.warn('Offline attendance flush failed, will retry on next cycle:', err);
    // Increment attempt counter
    const tx = db.transaction('checkin_queue', 'readwrite');
    for (const item of pending) {
      item.attempts += 1;
      await tx.store.put(item);
    }
    await tx.done;
  }

  const remaining = await getPendingCheckInCount();
  return { synced: 0, remaining };
}

/**
 * Attach global connectivity listeners to flush queued attendance
 * automatically when internet reconnects.
 */
export function setupAttendanceSyncListener(): () => void {
  if (typeof window === 'undefined') return () => {};

  const handleOnline = () => {
    console.log('[OfflineQueue] Device returned online. Syncing attendance queue...');
    flushPendingCheckIns().catch((err) => console.error('Auto-sync error:', err));
  };

  window.addEventListener('online', handleOnline);

  // Background heartbeat every 60 seconds
  const interval = setInterval(() => {
    if (navigator.onLine) {
      flushPendingCheckIns().catch(() => {});
    }
  }, 60000);

  return () => {
    window.removeEventListener('online', handleOnline);
    clearInterval(interval);
  };
}
