import { FaceDescriptorRecord, AttendanceEvent } from './types';
import {
  saveRosterToOfflineDB,
  getRosterFromOfflineDB,
  queueAttendanceEvent,
  getPendingAttendanceEvents,
  removeSyncedEvent,
} from './offline-db';
import { fetchWithAuth } from '@/lib/utils/api-client';

/**
 * Synchronizes the member face roster from Supabase into IndexedDB.
 * Falls back to offline IndexedDB cache if network is unavailable.
 */
export async function syncRoster(gymId: string, branchId?: string): Promise<{ roster: FaceDescriptorRecord[]; isOffline: boolean }> {
  if (typeof window === 'undefined') {
    return { roster: [], isOffline: false };
  }

  if (navigator.onLine) {
    try {
      const url = branchId 
        ? `/api/attendance/face-roster?gymId=${gymId}&branchId=${branchId}` 
        : `/api/attendance/face-roster?gymId=${gymId}`;
      const res = await fetchWithAuth(url);
      if (res.ok) {
        const data: FaceDescriptorRecord[] = await res.json();
        await saveRosterToOfflineDB(gymId, data);
        return { roster: data, isOffline: false };
      } else {
        console.warn(`Face roster sync returned status ${res.status}: ${res.statusText}`);
      }
    } catch (err) {
      console.warn('Network fetch failed for face roster, falling back to IndexedDB:', err);
    }
  }

  // Offline fallback
  const cached = await getRosterFromOfflineDB(gymId);
  return { roster: cached, isOffline: true };
}

/**
 * Records an attendance event:
 * - Queues in IndexedDB immediately (ensuring 0 data loss).
 * - Attempts to flush to backend if online.
 */
export async function recordAttendanceEvent(
  event: AttendanceEvent
): Promise<{ success: boolean; isOffline: boolean; event: AttendanceEvent }> {
  const localId = await queueAttendanceEvent(event);

  if (navigator.onLine) {
    try {
      const res = await fetchWithAuth('/api/attendance/face-checkin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(event),
      });

      if (res.ok) {
        const result = await res.json();
        await removeSyncedEvent(localId);
        return { success: true, isOffline: false, event: { ...event, ...result } };
      }
    } catch (err) {
      console.warn('Direct attendance check-in failed, queued in IndexedDB:', err);
    }
  }

  return { success: true, isOffline: true, event };
}

/**
 * Flushes all pending attendance events to Supabase.
 */
export async function flushAttendanceQueue(): Promise<{ syncedCount: number; remainingCount: number }> {
  if (typeof window === 'undefined' || !navigator.onLine) {
    return { syncedCount: 0, remainingCount: 0 };
  }

  const pending = await getPendingAttendanceEvents();
  let synced = 0;

  for (const item of pending) {
    try {
      const res = await fetchWithAuth('/api/attendance/face-checkin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(item),
      });

      if (res.ok) {
        await removeSyncedEvent(item.localId);
        synced++;
      }
    } catch (err) {
      console.warn(`Failed to sync event ${item.localId}:`, err);
      break; // Pause if network dropped mid-flush
    }
  }

  const remaining = pending.length - synced;
  return { syncedCount: synced, remainingCount: remaining };
}
