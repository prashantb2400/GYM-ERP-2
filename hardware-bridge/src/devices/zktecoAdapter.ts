import ZKLib from 'node-zklib';
import { DeviceInfo, DeviceUser, AttendanceRecord, AttendanceEvent } from '../types';
import { logger } from '../config/logger';

export class ZKTecoAdapter {
  private device: any;
  private deviceId: string;
  public isConnected: boolean = false;
  private ip: string;
  private port: number;

  constructor(deviceId: string, ip: string, port: number, password?: string) {
    this.deviceId = deviceId;
    this.ip = ip;
    this.port = port;
    this.device = new ZKLib(ip, port, 10000, 4000);
  }

  async connect(): Promise<boolean> {
    try {
      await this.device.createSocket();
      this.isConnected = true;
      logger.info(`Connected to ZKTeco device ${this.deviceId} at ${this.ip}:${this.port}`);
      return true;
    } catch (err) {
      this.isConnected = false;
      logger.error(`Failed to connect to ZKTeco ${this.deviceId}:`, err);
      return false;
    }
  }

  async disconnect(): Promise<void> {
    try {
      if (this.isConnected) {
        await this.device.disconnect();
        this.isConnected = false;
        logger.info(`Disconnected from ZKTeco device ${this.deviceId}`);
      }
    } catch (err) {
      logger.error(`Error disconnecting ZKTeco ${this.deviceId}:`, err);
    }
  }

  async getInfo(): Promise<DeviceInfo> {
    const info = await this.device.getInfo();
    return {
      firmware: info.firmwareVersion || 'Unknown',
      serialNumber: info.serialNumber || 'Unknown',
      capacity: info.userCapacity || 0
    };
  }

  async getAttendances(): Promise<AttendanceRecord[]> {
    try {
      const logs = await this.device.getAttendances();
      return logs.data.map((log: any) => ({
        userSn: log.userSn,
        deviceUserId: log.deviceUserId,
        recordTime: new Date(log.recordTime)
      }));
    } catch (err) {
      logger.error(`Error fetching attendances from ${this.deviceId}:`, err);
      return [];
    }
  }

  async getUsers(): Promise<DeviceUser[]> {
    try {
      const users = await this.device.getUsers();
      return users.data;
    } catch (err) {
      logger.error(`Error fetching users from ${this.deviceId}:`, err);
      return [];
    }
  }

  async enrollUser(memberId: string, memberName: string, biometricUserId: number): Promise<boolean> {
    // This is a placeholder as actual enrollment typically requires manual interaction on the device itself
    // Or specific commands that vary heavily by SDK version.
    logger.info(`Enrollment request for ${memberName} (${memberId}) to uid ${biometricUserId}`);
    return true; 
  }

  async deleteUser(biometricUserId: number): Promise<boolean> {
    try {
      // Not all node-zklib versions support delete directly like this, handling gracefully
      if (this.device.deleteUser) {
        await this.device.deleteUser(biometricUserId);
        return true;
      }
      return false;
    } catch (err) {
      logger.error(`Error deleting user ${biometricUserId} on ${this.deviceId}:`, err);
      return false;
    }
  }

  async clearAttendances(): Promise<void> {
    try {
      await this.device.clearAttendanceLog();
    } catch (err) {
      logger.error(`Error clearing attendance log on ${this.deviceId}:`, err);
    }
  }

  async ping(): Promise<boolean> {
    try {
      const status = await this.device.getInfo();
      return !!status;
    } catch (err) {
      return false;
    }
  }

  onAttendance(callback: (event: AttendanceEvent) => void): void {
    if (this.device.getRealTimeLogs) {
      this.device.getRealTimeLogs((data: any) => {
        callback({
          biometricUserId: data.userId,
          timestamp: new Date().toISOString(),
          method: 'fingerprint',
          deviceId: this.deviceId
        });
      });
    }
  }
}
