import express from 'express';
import cors from 'cors';
import { createServer } from 'http';
import dotenv from 'dotenv';
import cron from 'node-cron';

import { logger } from './config/logger';
import { SocketBridgeService } from './services/socketBridge';
import { AttendanceSyncService } from './services/attendanceSync';
import { HealthMonitor } from './services/healthMonitor';
import { ZKTecoAdapter } from './devices/zktecoAdapter';
import { HIDAdapter } from './devices/hidAdapter';
import { watchUSBDevices } from './discovery/usbWatcher';
import { createDevicesRouter } from './routes/devices';
import { createAttendanceRouter } from './routes/attendance';

dotenv.config();

const app = express();
const httpServer = createServer(app);
const PORT = process.env.PORT || 5002;

app.use(cors({ origin: process.env.NEXTJS_APP_URL || 'http://localhost:3000' }));
app.use(express.json());

// Global State
const activeZktecoAdapters = new Map<string, ZKTecoAdapter>();
const hidAdapter = new HIDAdapter();

// Services
const socketBridge = new SocketBridgeService(httpServer);
const attendanceSync = new AttendanceSyncService(socketBridge);
const healthMonitor = new HealthMonitor(activeZktecoAdapters, socketBridge);

// Routes
app.use('/devices', createDevicesRouter(activeZktecoAdapters, attendanceSync, socketBridge, hidAdapter));
app.use('/attendance', createAttendanceRouter());

// Background Tasks
const HEALTH_CHECK_INTERVAL = parseInt(process.env.HEALTH_CHECK_INTERVAL || '60000', 10);
healthMonitor.start(HEALTH_CHECK_INTERVAL);

// Sync Cron Job (Run every 5 minutes by default)
cron.schedule('*/5 * * * *', async () => {
  logger.info('Running periodic attendance sync for all connected devices...');
  for (const [deviceId, adapter] of activeZktecoAdapters.entries()) {
    if (adapter.isConnected) {
      await attendanceSync.syncDeviceAttendance(deviceId, adapter);
    }
  }
});

// USB Watcher
watchUSBDevices((event, device) => {
  if (event === 'add') {
    logger.info(`Detected new biometric scanner: ${device.product}`);
    // Use type casting to access private io, or ideally add emitUsbChange to SocketBridgeService
    (socketBridge as any).io.emit('hardware:usb_change', { event, device });
  } else {
    (socketBridge as any).io.emit('hardware:usb_change', { event, device });
  }
});

// Graceful Shutdown
const shutdown = () => {
  logger.info('Shutting down Hardware Bridge...');
  healthMonitor.stop();
  for (const adapter of activeZktecoAdapters.values()) {
    adapter.disconnect();
  }
  httpServer.close(() => {
    logger.info('Server stopped.');
    process.exit(0);
  });
};

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);

// Start Server
httpServer.listen(PORT, () => {
  logger.info(`GymERP Hardware Bridge running on port ${PORT}`);
  logger.info(`CORS Origin: ${process.env.NEXTJS_APP_URL || 'http://localhost:3000'}`);
});
