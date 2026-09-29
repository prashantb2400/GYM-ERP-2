/**
 * Cloudflare Tunnel Manager for WhatsApp Bridge
 *
 * Provides lifecycle management for the `cloudflared` process to expose
 * the local bridge (localhost:48291) to the GymERP cloud backend securely
 * without opening inbound firewall ports.
 *
 * Supports two modes:
 * 1. Named Tunnel with Token (Production): Uses CLOUDFLARE_TUNNEL_TOKEN
 * 2. Quick Tunnel (Development/Testing): Spawns cloudflared --url http://localhost:48291
 *    and extracts the temporary *.trycloudflare.com URL.
 */

import { spawn, ChildProcess } from 'child_process';
import fs from 'fs';
import path from 'path';
import pino from 'pino';

const log = pino({ level: 'info' });

export interface TunnelStatus {
  active: boolean;
  url?: string;
  mode: 'token' | 'quick' | 'none';
  pid?: number;
  error?: string;
}

let tunnelProcess: ChildProcess | null = null;
let currentStatus: TunnelStatus = {
  active: false,
  mode: 'none',
};

function getCloudflaredBin(): string {
  const localBridgeBin = path.resolve('./bin/cloudflared');
  if (fs.existsSync(localBridgeBin)) {
    return localBridgeBin;
  }
  const homeBin = path.join(process.env.HOME || '', '.local/bin/cloudflared');
  if (fs.existsSync(homeBin)) {
    return homeBin;
  }
  return 'cloudflared';
}

function persistTunnelUrl(url: string) {
  try {
    if (!fs.existsSync('./data')) {
      fs.mkdirSync('./data', { recursive: true });
    }
    fs.writeFileSync('./data/tunnel.json', JSON.stringify({ url }, null, 2));
  } catch {}
}

/**
 * Start Cloudflare Tunnel.
 * If CLOUDFLARE_TUNNEL_TOKEN is set in process.env, uses token mode.
 * Otherwise falls back to Quick Tunnel mode for instant zero-config pairing.
 */
export async function startTunnel(port: number = 48291): Promise<TunnelStatus> {
  if (tunnelProcess) {
    return currentStatus;
  }

  const token = process.env.CLOUDFLARE_TUNNEL_TOKEN;
  const bin = getCloudflaredBin();

  if (token) {
    log.info('Starting Cloudflare Tunnel using token mode');
    return new Promise((resolve) => {
      try {
        tunnelProcess = spawn(bin, ['tunnel', 'run', '--token', token], {
          stdio: ['ignore', 'pipe', 'pipe'],
        });

        currentStatus = {
          active: true,
          mode: 'token',
          url: process.env.CLOUDFLARE_TUNNEL_HOSTNAME || undefined,
          pid: tunnelProcess.pid,
        };

        if (currentStatus.url) {
          persistTunnelUrl(currentStatus.url);
        }

        tunnelProcess.on('exit', (code, signal) => {
          log.warn({ code, signal }, 'Cloudflare tunnel process exited');
          tunnelProcess = null;
          currentStatus = { active: false, mode: 'none' };
        });

        tunnelProcess.stderr?.on('data', (chunk: Buffer) => {
          const str = chunk.toString();
          if (str.includes('ERR') || str.includes('error')) {
            log.error({ output: str.trim() }, 'cloudflared error');
          }
        });

        resolve(currentStatus);
      } catch (err: any) {
        log.error(err, 'Failed to launch cloudflared binary');
        currentStatus = {
          active: false,
          mode: 'token',
          error: err.message,
        };
        resolve(currentStatus);
      }
    });
  }

  // Quick Tunnel fallback (cloudflared tunnel --url http://localhost:PORT)
  log.info(`Starting Cloudflare Quick Tunnel forwarding to http://localhost:${port}`);
  return new Promise((resolve) => {
    try {
      tunnelProcess = spawn(bin, ['tunnel', '--url', `http://localhost:${port}`], {
        stdio: ['ignore', 'pipe', 'pipe'],
      });

      let resolved = false;

      currentStatus = {
        active: true,
        mode: 'quick',
        pid: tunnelProcess.pid,
      };

      const timeout = setTimeout(() => {
        if (!resolved) {
          resolved = true;
          resolve(currentStatus);
        }
      }, 15000);

      const checkUrl = (chunk: Buffer) => {
        const text = chunk.toString();
        // Regex for *.trycloudflare.com
        const match = text.match(/https:\/\/[a-zA-Z0-9-]+\.trycloudflare\.com/);
        if (match && !resolved) {
          resolved = true;
          clearTimeout(timeout);
          currentStatus.url = match[0];
          persistTunnelUrl(currentStatus.url);
          log.info({ tunnelUrl: currentStatus.url }, 'Quick tunnel URL acquired');
          resolve(currentStatus);
        }
      };

      tunnelProcess.stdout?.on('data', checkUrl);
      tunnelProcess.stderr?.on('data', checkUrl);

      tunnelProcess.on('exit', (code, signal) => {
        log.warn({ code, signal }, 'Quick tunnel exited');
        tunnelProcess = null;
        currentStatus = { active: false, mode: 'none' };
      });
    } catch (err: any) {
      log.warn(err, 'cloudflared is not installed or failed to start. Tunnel inactive.');
      currentStatus = {
        active: false,
        mode: 'none',
        error: 'cloudflared command not found in PATH',
      };
      resolve(currentStatus);
    }
  });
}

/**
 * Stop Cloudflare Tunnel gracefully.
 */
export async function stopTunnel(): Promise<void> {
  if (tunnelProcess) {
    log.info('Stopping Cloudflare tunnel process...');
    tunnelProcess.kill('SIGTERM');
    tunnelProcess = null;
    currentStatus = { active: false, mode: 'none' };
  }
}

/**
 * Get current tunnel status.
 */
export function getTunnelStatus(): TunnelStatus {
  return currentStatus;
}
