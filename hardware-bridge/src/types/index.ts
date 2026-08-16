export interface DeviceInfo {
  firmware: string;
  serialNumber: string;
  capacity: number;
}

export interface DeviceUser {
  uid: number;
  role: number;
  password: string;
  name: string;
  cardno: string;
  userId: string;
}

export interface DeviceStatus {
  online: boolean;
  lastPing: Date;
  status: 'connected' | 'disconnected' | 'error';
}

export interface AttendanceRecord {
  userSn: number;
  deviceUserId: string;
  recordTime: Date;
}

export interface AttendanceEvent {
  biometricUserId: number;
  timestamp: string;
  method: string;
  deviceId: string;
}

export interface DiscoveredDevice {
  ip: string;
  port: number;
  type: 'zkteco' | 'ip_camera';
  model?: string;
}

export interface HIDDeviceInfo {
  vendorId: number;
  productId: number;
  path: string;
  manufacturer?: string;
  product?: string;
  serialNumber?: string;
}

export interface USBDeviceInfo extends HIDDeviceInfo {}

export interface SyncResult {
  synced: number;
  failed: number;
  total: number;
}

export interface HardwareUser {
  id: string;
  memberId: string;
  biometricUserId: number;
}

export interface PortInfo {
  path: string;
  manufacturer: string | undefined;
  serialNumber: string | undefined;
  pnpId: string | undefined;
  locationId: string | undefined;
  vendorId: string | undefined;
  productId: string | undefined;
}
