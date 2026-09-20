import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const { data: camera } = await supabaseAdmin
      .from('cctv_cameras')
      .select('id, name, location, status, fps, last_ping_at')
      .eq('id', id)
      .maybeSingle();

    if (!camera) {
      return new NextResponse('Camera not found', { status: 404 });
    }

    // Try edge daemon snapshot if configured
    const edgeServiceUrl = process.env.CCTV_SERVICE_URL || 'http://localhost:5001';
    try {
      const edgeRes = await fetch(`${edgeServiceUrl}/cameras/${id}/snapshot`, {
        headers: {
          Authorization: `Bearer ${process.env.CCTV_AUTH_TOKEN || ''}`,
        },
        signal: AbortSignal.timeout(1200),
      });

      if (edgeRes.ok) {
        const imageBlob = await edgeRes.arrayBuffer();
        return new NextResponse(imageBlob, {
          headers: {
            'Content-Type': 'image/jpeg',
            'Cache-Control': 'no-cache, no-store, must-revalidate',
          },
        });
      }
    } catch {
      // Edge daemon offline or unreachable; fall through to animated test card SVG
    }

    // High-tech terminal test pattern SVG
    const now = new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    const isOnline = camera.status === 'online';
    const statusColor = isOnline ? '#10b981' : '#f59e0b';
    const statusText = isOnline ? `ONLINE (${camera.fps || 15} FPS)` : 'CONNECTING...';

    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="640" height="360" viewBox="0 0 640 360">
      <defs>
        <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="#09090b"/>
          <stop offset="100%" stop-color="#18181b"/>
        </linearGradient>
        <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
          <path d="M 40 0 L 0 0 0 40" fill="none" stroke="#27272a" stroke-width="0.75" stroke-opacity="0.4"/>
        </pattern>
      </defs>
      
      <!-- Background -->
      <rect width="640" height="360" fill="url(#bg)"/>
      <rect width="640" height="360" fill="url(#grid)"/>
      
      <!-- Center Reticle -->
      <circle cx="320" cy="180" r="60" fill="none" stroke="#3f3f46" stroke-width="1.5" stroke-dasharray="4,4"/>
      <circle cx="320" cy="180" r="4" fill="${statusColor}"/>
      <line x1="240" y1="180" x2="400" y2="180" stroke="#3f3f46" stroke-width="1" stroke-opacity="0.5"/>
      <line x1="320" y1="100" x2="320" y2="260" stroke="#3f3f46" stroke-width="1" stroke-opacity="0.5"/>
      
      <!-- Scanline Overlay -->
      <rect width="640" height="2" y="160" fill="#6366f1" opacity="0.3"/>
      
      <!-- OSD Header -->
      <rect x="16" y="16" width="608" height="32" rx="6" fill="#18181b" fill-opacity="0.8"/>
      <circle cx="32" cy="32" r="5" fill="${statusColor}"/>
      <text x="46" y="36" fill="#f43f5e" font-family="monospace" font-size="12" font-weight="bold">● REC</text>
      <text x="100" y="36" fill="#e4e4e7" font-family="sans-serif" font-size="12" font-weight="bold">${camera.name}</text>
      <text x="320" y="36" fill="#a1a1aa" font-family="monospace" font-size="11" text-anchor="middle">[${camera.location || 'Entrance'}]</text>
      <text x="610" y="36" fill="#818cf8" font-family="monospace" font-size="12" text-anchor="end">${now}</text>
      
      <!-- Bottom Status -->
      <rect x="16" y="312" width="608" height="32" rx="6" fill="#18181b" fill-opacity="0.8"/>
      <text x="30" y="332" fill="${statusColor}" font-family="monospace" font-size="11" font-weight="bold">STATUS: ${statusText}</text>
      <text x="610" y="332" fill="#71717a" font-family="monospace" font-size="10" text-anchor="end">AI VIGILANCE ACTIVE</text>
    </svg>`;

    return new NextResponse(svg, {
      headers: {
        'Content-Type': 'image/svg+xml',
        'Cache-Control': 'no-cache, no-store, must-revalidate',
      },
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Stream fetch error';
    return new NextResponse(msg, { status: 500 });
  }
}
