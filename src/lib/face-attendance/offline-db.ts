import { openDB, type DBSchema, type IDBPDatabase } from 'idb';
import { FaceDescriptorRecord, AttendanceEvent } from './types';

interface FaceAttendanceDB extends DBSchema {
  roster: {
    key: string; // memberId
    value: FaceDescriptorRecord & { gymId: string; updatedAt: string };
    indexes: { 'by-gym': string };
  };
  attendance_queue: {
    key: string; // auto-generated or event id
    value: AttendanceEvent & { localId: string; createdAt: string; attempts: number };
    indexes: { 'by-synced': number }; // 0 = unsynced, 1 = synced
  };
}

const DB_NAME = 'gymerp_face_attendance_db';
const DB_VERSION = 1;

let dbPromise: Promise<IDBPDatabase<FaceAttendanceDB>> | null = null;

export function getOfflineDB(): Promise<IDBPDatabase<FaceAttendanceDB>> {
  if (typeof window === 'undefined') {
    return Promise.reject(new Error('IndexedDB is only available in browser'));
  }

  if (!dbPromise) {
    dbPromise = openDB<FaceAttendanceDB>(DB_NAME, DB_VERSION, {
      upgrade(db) {
        // Roster store
        if (!db.objectStoreNames.contains('roster')) {
          const rosterStore = db.createObjectStore('roster', { keyPath: 'memberId' });
          rosterStore.createIndex('by-gym', 'gymId');
        }

        // Attendance queue store
        if (!db.objectStoreNames.contains('attendance_queue')) {
          const queueStore = db.createObjectStore('attendance_queue', { keyPath: 'localId' });
          queueStore.createIndex('by-synced', 'synced');
        }
      },
    });
  }

  return dbPromise;
}

/**
 * Saves a full gym roster into IndexedDB for offline recognition.
 */
export async function saveRosterToOfflineDB(gymId: string, records: FaceDescriptorRecord[]): Promise<void> {
  const db = await getOfflineDB();
  const tx = db.transaction('roster', 'readwrite');
  const now = new Date().toISOString();

  for (const record of records) {
    await tx.store.put({
      ...record,
      gymId,
      updatedAt: now,
    });
  }

  await tx.done;
}

/**
 * Loads the active roster for a gym from IndexedDB.
 */
export async function getRosterFromOfflineDB(gymId: string): Promise<FaceDescriptorRecord[]> {
  const db = await getOfflineDB();
  const allRecords = await db.getAllFromIndex('roster', 'by-gym', gymId);
  return allRecords.map(r => ({
    memberId: r.memberId,
    name: r.name,
    memberCode: r.memberCode,
    photoUrl: r.photoUrl,
    descriptor: r.descriptor,
  }));
}

/**
 * Queues an attendance event in IndexedDB.
 */
export async function queueAttendanceEvent(event: AttendanceEvent): Promise<string> {
  const db = await getOfflineDB();
  const localId = `evt_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

  await db.put('attendance_queue', {
    ...event,
    localId,
    createdAt: new Date().toISOString(),
    attempts: 0,
    synced: false,
  });

  return localId;
}

/**
 * Retrieves all pending unsynced attendance events.
 */
export async function getPendingAttendanceEvents(): Promise<(AttendanceEvent & { localId: string; attempts: number })[]> {
  const db = await getOfflineDB();
  const all = await db.getAll('attendance_queue');
  return all.filter(e => !e.synced);
}

/**
 * Marks an attendance event as synced and removes it from the queue.
 */
export async function removeSyncedEvent(localId: string): Promise<void> {
  const db = await getOfflineDB();
  await db.delete('attendance_queue', localId);
}
