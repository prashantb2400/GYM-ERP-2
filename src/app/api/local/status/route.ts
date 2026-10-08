import { NextResponse } from 'next/server';
import os from 'os';

export async function GET() {
  try {
    const interfaces = os.networkInterfaces();
    const localIps: { name: string; address: string }[] = [];

    for (const [name, addrs] of Object.entries(interfaces)) {
      if (addrs) {
        for (const addr of addrs) {
          if (addr.family === 'IPv4' && !addr.internal) {
            localIps.push({ name, address: addr.address });
          }
        }
      }
    }

    const totalMem = Math.round(os.totalmem() / 1024 / 1024);
    const freeMem = Math.round(os.freemem() / 1024 / 1024);

    return NextResponse.json(
      {
        status: 'ok',
        offlineAppliance: true,
        host: {
          hostname: os.hostname(),
          platform: os.platform(),
          arch: os.arch(),
          uptimeSeconds: Math.round(os.uptime()),
        },
        memory: {
          totalMB: totalMem,
          freeMB: freeMem,
          usedMB: totalMem - freeMem,
        },
        network: {
          primaryIp: localIps[0]?.address || '127.0.0.1',
          interfaces: localIps,
          mDnsUrl: 'http://gymerp.local:3000',
        },
        timestamp: Date.now(),
      },
      {
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, OPTIONS',
          'Cache-Control': 'no-store, max-age=0',
        },
      }
    );
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Diagnostic error';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  });
}
