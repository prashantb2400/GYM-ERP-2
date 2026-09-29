import { DatabaseSync } from 'node:sqlite';
import { AuthenticationCreds, AuthenticationState, BufferJSON, initAuthCreds, SignalDataTypeMap } from '@whiskeysockets/baileys';
import fs from 'fs';
import path from 'path';

let db: DatabaseSync | null = null;
let selectKeyStmt: ReturnType<DatabaseSync['prepare']> | null = null;
let insertKeyStmt: ReturnType<DatabaseSync['prepare']> | null = null;
let deleteKeyStmt: ReturnType<DatabaseSync['prepare']> | null = null;

function getDb(dbPath: string): DatabaseSync {
  if (!db) {
    const dir = path.dirname(dbPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    db = new DatabaseSync(dbPath);
    db.exec(`
      CREATE TABLE IF NOT EXISTS auth_keys (
        id TEXT PRIMARY KEY,
        value TEXT
      );
      CREATE TABLE IF NOT EXISTS config (
        key TEXT PRIMARY KEY,
        value TEXT
      );
    `);
    selectKeyStmt = db.prepare('SELECT value FROM auth_keys WHERE id = ?');
    insertKeyStmt = db.prepare('INSERT OR REPLACE INTO auth_keys (id, value) VALUES (?, ?)');
    deleteKeyStmt = db.prepare('DELETE FROM auth_keys WHERE id = ?');
  }
  return db;
}

export function getAuthToken(): string {
  const database = getDb('./data/auth.db');
  const stmt = database.prepare('SELECT value FROM config WHERE key = ?');
  const row = stmt.get('api_token') as { value: string } | undefined;
  if (row) {
    return row.value;
  }
  const token = 'f5bb8941-04a2-4a16-995d-7be7426b0daa';
  database.prepare('INSERT INTO config (key, value) VALUES (?, ?)').run('api_token', token);
  return token;
}

export function useSqliteAuthState(dbPath: string): { state: AuthenticationState, saveCreds: () => void } {
  getDb(dbPath);
  
  const readKey = (id: string) => {
    const row = selectKeyStmt!.get(id) as { value: string } | undefined;
    if (row) {
      return JSON.parse(row.value, BufferJSON.reviver);
    }
    return null;
  };
  
  const writeKey = (id: string, value: any) => {
    insertKeyStmt!.run(id, JSON.stringify(value, BufferJSON.replacer));
  };

  const deleteKey = (id: string) => {
    deleteKeyStmt!.run(id);
  };
  
  const credsData = readKey('creds');
  const creds: AuthenticationCreds = credsData || initAuthCreds();
  
  return {
    state: {
      creds,
      keys: {
        get: (type, ids) => {
          const data: { [key: string]: SignalDataTypeMap[typeof type] } = {};
          for (const id of ids) {
            let value = readKey(`${type}-${id}`);
            if (type === 'app-state-sync-key' && value) {
              value = importSyncKey(value);
            }
            if (value) {
              data[id] = value as any;
            }
          }
          return data;
        },
        set: (data) => {
          for (const category in data) {
            for (const id in (data as any)[category]) {
              const value = (data as any)[category][id];
              const key = `${category}-${id}`;
              if (value) {
                writeKey(key, value);
              } else {
                deleteKey(key);
              }
            }
          }
        }
      }
    },
    saveCreds: () => {
      writeKey('creds', creds);
    }
  };
}

function importSyncKey(data: any) {
  return data;
}
