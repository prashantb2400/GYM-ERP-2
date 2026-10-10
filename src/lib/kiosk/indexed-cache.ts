/**
 * Indexed Cache Utility
 * Inspired by Zerodha's indexed-cache (https://github.com/knadh/indexed-cache).
 * Sideloads and caches static assets, neural network model weights (ArrayBuffer),
 * sound effects (Blob), and roster JSON payloads in IndexedDB for 100% offline
 * kiosk boot performance.
 */

import { openDB, type IDBPDatabase, type DBSchema } from 'idb';

interface CacheEntry {
  key: string;
  data: ArrayBuffer | string;
  contentType: string;
  version: string;
  timestamp: number;
  expiresAt: number | null; // null = persistent
}

interface IndexedCacheDBSchema extends DBSchema {
  cache_entries: {
    key: string;
    value: CacheEntry;
    indexes: { 'by-timestamp': number };
  };
}

const DB_NAME = 'gymerp_kiosk_indexed_cache';
const DB_VERSION = 1;

let dbPromise: Promise<IDBPDatabase<IndexedCacheDBSchema>> | null = null;

function getCacheDB(): Promise<IDBPDatabase<IndexedCacheDBSchema>> {
  if (typeof window === 'undefined') {
    return Promise.reject(new Error('IndexedDB is only available in browser environments'));
  }

  if (!dbPromise) {
    dbPromise = openDB<IndexedCacheDBSchema>(DB_NAME, DB_VERSION, {
      upgrade(db) {
        if (!db.objectStoreNames.contains('cache_entries')) {
          const store = db.createObjectStore('cache_entries', { keyPath: 'key' });
          store.createIndex('by-timestamp', 'timestamp');
        }
      },
    });
  }

  return dbPromise;
}

export interface CacheOptions {
  version?: string;
  ttlSeconds?: number;
}

export class IndexedCache {
  /**
   * Retrieves a cached item by key. Returns null if expired or missing.
   */
  static async get(key: string, expectedVersion = 'v1'): Promise<CacheEntry | null> {
    if (typeof window === 'undefined') return null;

    try {
      const db = await getCacheDB();
      const entry = await db.get('cache_entries', key);

      if (!entry) return null;

      // Version mismatch invalidation
      if (entry.version !== expectedVersion) {
        await db.delete('cache_entries', key);
        return null;
      }

      // TTL expiration check
      if (entry.expiresAt && Date.now() > entry.expiresAt) {
        await db.delete('cache_entries', key);
        return null;
      }

      return entry;
    } catch (err) {
      console.warn('[IndexedCache] Read error for key:', key, err);
      return null;
    }
  }

  /**
   * Saves an item to IndexedDB cache.
   */
  static async set(
    key: string,
    data: ArrayBuffer | string,
    contentType = 'application/octet-stream',
    options: CacheOptions = {}
  ): Promise<void> {
    if (typeof window === 'undefined') return;

    const { version = 'v1', ttlSeconds } = options;
    const now = Date.now();
    const expiresAt = ttlSeconds ? now + ttlSeconds * 1000 : null;

    try {
      const db = await getCacheDB();
      await db.put('cache_entries', {
        key,
        data,
        contentType,
        version,
        timestamp: now,
        expiresAt,
      });
    } catch (err) {
      console.warn('[IndexedCache] Write error for key:', key, err);
    }
  }

  /**
   * Fetches an ArrayBuffer asset (e.g. face model weights or audio chime),
   * returning from IndexedDB cache if available, or fetching from network and caching.
   */
  static async fetchCachedArrayBuffer(
    url: string,
    options: CacheOptions = {}
  ): Promise<ArrayBuffer> {
    const key = `ab_${url}`;
    const cached = await this.get(key, options.version);

    if (cached && cached.data instanceof ArrayBuffer) {
      return cached.data;
    }

    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Failed to fetch asset ${url}: ${response.statusText}`);
    }

    const buffer = await response.arrayBuffer();
    const contentType = response.headers.get('content-type') || 'application/octet-stream';

    await this.set(key, buffer, contentType, options);
    return buffer;
  }

  /**
   * Fetches a JSON payload with offline caching in IndexedDB.
   */
  static async fetchCachedJSON<T>(
    url: string,
    options: CacheOptions = {}
  ): Promise<T> {
    const key = `json_${url}`;
    const cached = await this.get(key, options.version);

    if (cached && typeof cached.data === 'string') {
      try {
        return JSON.parse(cached.data) as T;
      } catch {
        // Fall through to fetch if corrupted
      }
    }

    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Failed to fetch JSON ${url}: ${response.statusText}`);
    }

    const json = await response.json();
    await this.set(key, JSON.stringify(json), 'application/json', options);
    return json as T;
  }

  /**
   * Clears all expired entries from the cache.
   */
  static async purgeExpired(): Promise<number> {
    if (typeof window === 'undefined') return 0;

    try {
      const db = await getCacheDB();
      const allEntries = await db.getAll('cache_entries');
      const now = Date.now();
      let purgedCount = 0;

      for (const entry of allEntries) {
        if (entry.expiresAt && now > entry.expiresAt) {
          await db.delete('cache_entries', entry.key);
          purgedCount++;
        }
      }
      return purgedCount;
    } catch {
      return 0;
    }
  }

  /**
   * Clears the entire kiosk asset cache.
   */
  static async clearAll(): Promise<void> {
    if (typeof window === 'undefined') return;
    try {
      const db = await getCacheDB();
      await db.clear('cache_entries');
    } catch (err) {
      console.warn('[IndexedCache] Clear error:', err);
    }
  }
}
