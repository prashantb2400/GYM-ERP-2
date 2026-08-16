import { SocketBridgeService } from './socketBridge';
import { ZKTecoAdapter } from '../devices/zktecoAdapter';
import { logger } from '../config/logger';

export class HealthMonitor {
  private checkInterval: NodeJS.Timeout | null = null;
  private failCounts: Map<string, number> = new Map();
  private adapters: Map<string, ZKTecoAdapter>;
  private socketBridge: SocketBridgeService;

  constructor(adapters: Map<string, ZKTecoAdapter>, socketBridge: SocketBridgeService) {
    this.adapters = adapters;
    this.socketBridge = socketBridge;
  }

  start(interval: number = 60000): void {
    if (this.checkInterval) return;
    this.checkInterval = setInterval(() => this.checkAllDevices(), interval);
    logger.info(`Health monitor started, checking every ${interval}ms`);
  }

  stop(): void {
    if (this.checkInterval) {
      clearInterval(this.checkInterval);
      this.checkInterval = null;
      logger.info('Health monitor stopped');
    }
  }

  private async checkAllDevices(): Promise<void> {
    for (const [deviceId, adapter] of this.adapters.entries()) {
      const isOnline = await adapter.ping();
      
      if (!isOnline) {
        const fails = (this.failCounts.get(deviceId) || 0) + 1;
        this.failCounts.set(deviceId, fails);
        
        if (fails >= 3) {
          logger.warn(`Device ${deviceId} failed 3 health checks. Marking offline.`);
          this.socketBridge.emitDeviceStatus(deviceId, {
            online: false,
            lastPing: new Date(),
            status: 'disconnected'
          });
          
          if (!adapter.isConnected) {
            // Attempt auto-reconnect
            logger.info(`Attempting auto-reconnect for ${deviceId}...`);
            await adapter.connect();
          }
        }
      } else {
        if ((this.failCounts.get(deviceId) || 0) > 0) {
          logger.info(`Device ${deviceId} is back online.`);
          this.failCounts.set(deviceId, 0);
          this.socketBridge.emitDeviceStatus(deviceId, {
            online: true,
            lastPing: new Date(),
            status: 'connected'
          });
        }
      }
    }
  }
}
