import HID from 'node-hid';
import { HIDDeviceInfo } from '../types';
import { logger } from '../config/logger';

export class HIDAdapter {
  private devices: Map<string, HID.HID> = new Map();

  async scanDevices(): Promise<HIDDeviceInfo[]> {
    const devices = HID.devices();
    return devices.map(d => ({
      vendorId: d.vendorId,
      productId: d.productId,
      path: d.path || '',
      manufacturer: d.manufacturer,
      product: d.product,
      serialNumber: d.serialNumber
    }));
  }

  async openDevice(path: string): Promise<boolean> {
    try {
      const device = new HID.HID(path);
      this.devices.set(path, device);
      logger.info(`Opened HID device at path: ${path}`);
      return true;
    } catch (err) {
      logger.error(`Failed to open HID device at ${path}:`, err);
      return false;
    }
  }

  async closeDevice(path: string): Promise<void> {
    const device = this.devices.get(path);
    if (device) {
      device.close();
      this.devices.delete(path);
      logger.info(`Closed HID device at path: ${path}`);
    }
  }

  onScan(devicePath: string, callback: (userId: string) => void): void {
    const device = this.devices.get(devicePath);
    if (device) {
      device.on('data', (data: Buffer) => {
        // Parse biometric data. Placeholder for actual fingerprint parsing logic
        // For standard readers, this requires vendor-specific drivers.
        const simulatedUserId = data.toString('hex').substring(0, 8); 
        callback(simulatedUserId);
      });
      device.on('error', (err) => {
        logger.error(`HID device error on ${devicePath}:`, err);
      });
    }
  }

  watchForConnections(callback: (event: 'connect' | 'disconnect', deviceInfo: HIDDeviceInfo) => void): void {
    // This requires polling or using usb-detection library. Using a simple polling mechanism here.
    let knownDevices = new Set<string>();

    setInterval(async () => {
      const currentDevices = await this.scanDevices();
      const currentPaths = new Set(currentDevices.map(d => d.path));

      for (const dev of currentDevices) {
        if (!knownDevices.has(dev.path)) {
          knownDevices.add(dev.path);
          callback('connect', dev);
        }
      }

      for (const path of knownDevices) {
        if (!currentPaths.has(path)) {
          knownDevices.delete(path);
          callback('disconnect', { path, vendorId: 0, productId: 0 }); // partial info on disconnect
        }
      }
    }, 5000);
  }
}
