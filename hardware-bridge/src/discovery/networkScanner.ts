import net from 'net';
import ping from 'net-ping';
import { DiscoveredDevice } from '../types';
import { logger } from '../config/logger';

export async function probePort(ip: string, port: number, timeout: number = 500): Promise<boolean> {
  return new Promise((resolve) => {
    const socket = new net.Socket();
    let status = false;

    socket.setTimeout(timeout);

    socket.on('connect', () => {
      status = true;
      socket.destroy();
    });

    socket.on('timeout', () => {
      socket.destroy();
    });

    socket.on('error', () => {
      socket.destroy();
    });

    socket.on('close', () => {
      resolve(status);
    });

    socket.connect(port, ip);
  });
}

export async function pingHost(ip: string, timeout: number = 1000): Promise<boolean> {
  return new Promise((resolve) => {
    const session = ping.createSession({ timeout });
    session.pingHost(ip, (error: any) => {
      if (error) {
        resolve(false);
      } else {
        resolve(true);
      }
    });
  });
}

function getIPsFromCIDR(cidr: string): string[] {
  const [baseIp, subnetStr] = cidr.split('/');
  if (!subnetStr) return [baseIp];
  const subnet = parseInt(subnetStr, 10);
  
  const ipToLong = (ip: string) => ip.split('.').reduce((acc, octet) => (acc << 8) + parseInt(octet, 10), 0);
  const longToIp = (long: number) => [(long >>> 24), (long >> 16 & 255), (long >> 8 & 255), (long & 255)].join('.');

  const ipLong = ipToLong(baseIp);
  const mask = -1 << (32 - subnet);
  const networkStart = ipLong & mask;
  const networkEnd = networkStart | ~mask;

  const ips: string[] = [];
  for (let i = networkStart + 1; i < networkEnd; i++) {
    ips.push(longToIp(i));
  }
  return ips;
}

export async function scanForZKTecoDevices(networkRange: string): Promise<DiscoveredDevice[]> {
  logger.info(`Scanning network ${networkRange} for devices...`);
  const ips = getIPsFromCIDR(networkRange);
  const discovered: DiscoveredDevice[] = [];

  const BATCH_SIZE = 50;
  for (let i = 0; i < ips.length; i += BATCH_SIZE) {
    const batch = ips.slice(i, i + BATCH_SIZE);
    
    await Promise.all(batch.map(async (ip) => {
      const isZkteco = await probePort(ip, 4370, 500);
      if (isZkteco) {
        discovered.push({ ip, port: 4370, type: 'zkteco' });
      } else {
        const isCamera = await probePort(ip, 80, 500) || await probePort(ip, 8080, 500);
        if (isCamera) {
          discovered.push({ ip, port: 80, type: 'ip_camera' });
        }
      }
    }));
  }

  logger.info(`Discovered ${discovered.length} devices.`);
  return discovered;
}
