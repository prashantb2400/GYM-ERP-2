import { createClient } from '@supabase/supabase-js';

// Admin client that bypasses RLS (Row-Level Security).
// Use ONLY in secure server contexts.
const supabaseUrl =
  process.env.INTERNAL_SUPABASE_URL ||
  process.env.NEXT_PUBLIC_APP_URL ||
  process.env.NEXT_PUBLIC_SUPABASE_URL ||
  'http://localhost:3000';

const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 'placeholder-service-key';

// Fallback transport for Node environments lacking native WebSocket (Node < 22 or minimal container)
const getRealtimeOptions = () => {
  if (typeof globalThis !== 'undefined' && typeof globalThis.WebSocket !== 'undefined') {
    return undefined;
  }
  class FallbackWebSocket {
    static readonly CONNECTING = 0;
    static readonly OPEN = 1;
    static readonly CLOSING = 2;
    static readonly CLOSED = 3;
    readonly CONNECTING = 0;
    readonly OPEN = 1;
    readonly CLOSING = 2;
    readonly CLOSED = 3;
    readyState = 1;
    url = '';
    protocol = '';
    onopen = null;
    onclose = null;
    onmessage = null;
    onerror = null;
    constructor(url?: string) {
      this.url = url || '';
    }
    send() {}
    close() {}
    addEventListener() {}
    removeEventListener() {}
    dispatchEvent() {
      return true;
    }
  }
  return { transport: FallbackWebSocket as any };
};

const realtimeOptions = getRealtimeOptions();

export const supabaseAdmin = createClient(
  supabaseUrl,
  supabaseKey,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
    ...(realtimeOptions ? { realtime: realtimeOptions } : {}),
  }
);
