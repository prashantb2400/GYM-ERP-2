import HID from 'node-hid';
import { USBDeviceInfo } from '../types';
import { logger } from '../config/logger';

const KNOWN_VIDS = new Set([0x1162, 0x09BE, 0x05BA]); // SecuGen, Futronic, Digital Persona

export function watchUSBDevices(callback: (event: 'add' | 'remove', device: USBDeviceInfo) => void): void {
  let knownDevices = new Map<string, USBDeviceInfo>();

  setInterval(() => {
    try {
      const currentDevices = HID.devices();
      const currentMap = new Map<string, USBDeviceInfo>();

      for (const dev of currentDevices) {
        if (dev.path && KNOWN_VIDS.has(dev.vendorId)) {
          const deviceInfo: USBDeviceInfo = {
            vendorId: dev.vendorId,
            productId: dev.productId,
            path: dev.path,
            manufacturer: dev.manufacturer,
            product: dev.product,
            serialNumber: dev.serialNumber
          };
          currentMap.set(dev.path, deviceInfo);
          
          if (!knownDevices.has(dev.path)) {
            logger.info(`New known USB biometric device connected: ${dev.product}`);
            callback('add', deviceInfo);
          }
        }
      }

      for (const [path, dev] of knownDevices.entries()) {
        if (!currentMap.has(path)) {
          logger.info(`USB biometric device disconnected: ${dev.product}`);
          callback('remove', dev);
        }
      }

      knownDevices = currentMap;
    } catch (err) {
      logger.error('Error polling USB devices:', err);
    }
  }, 5000);
}
