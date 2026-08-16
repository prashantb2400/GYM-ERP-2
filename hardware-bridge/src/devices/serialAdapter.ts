import { SerialPort } from 'serialport';
import { PortInfo } from '../types';
import { logger } from '../config/logger';

export class SerialAdapter {
  private ports: Map<string, SerialPort> = new Map();

  async listPorts(): Promise<PortInfo[]> {
    const ports = await SerialPort.list();
    return ports.map(p => ({
      path: p.path,
      manufacturer: p.manufacturer,
      serialNumber: p.serialNumber,
      pnpId: p.pnpId,
      locationId: p.locationId,
      vendorId: p.vendorId,
      productId: p.productId
    }));
  }

  async openPort(path: string, baudRate: number): Promise<boolean> {
    return new Promise((resolve) => {
      const port = new SerialPort({ path, baudRate }, (err) => {
        if (err) {
          logger.error(`Error opening serial port ${path}:`, err);
          resolve(false);
        }
      });
      
      port.on('open', () => {
        logger.info(`Opened serial port ${path} at ${baudRate} baud`);
        this.ports.set(path, port);
        resolve(true);
      });
    });
  }

  async closePort(path: string): Promise<void> {
    const port = this.ports.get(path);
    if (port) {
      port.close((err) => {
        if (err) logger.error(`Error closing serial port ${path}:`, err);
        else logger.info(`Closed serial port ${path}`);
      });
      this.ports.delete(path);
    }
  }

  onData(path: string, callback: (data: Buffer) => void): void {
    const port = this.ports.get(path);
    if (port) {
      port.on('data', (data: Buffer) => {
        callback(data);
      });
    }
  }
}
