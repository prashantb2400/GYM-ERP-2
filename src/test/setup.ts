import '@testing-library/jest-dom';

// Polyfill WebSocket for test environments lacking native WebSocket support
if (typeof globalThis.WebSocket === 'undefined') {
  class MockWebSocket {
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

    constructor(url: string, _protocols?: string | string[]) {
      this.url = url;
    }

    send() {}
    close() {}
    addEventListener() {}
    removeEventListener() {}
    dispatchEvent() {
      return true;
    }
  }

  globalThis.WebSocket = MockWebSocket as any;
  if (typeof global !== 'undefined') {
    (global as any).WebSocket = MockWebSocket;
  }
}

