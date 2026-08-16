import { Router } from 'express';
import { supabase } from '../config/supabase';
import { ZKTecoAdapter } from '../devices/zktecoAdapter';
import { scanForZKTecoDevices } from '../discovery/networkScanner';
import { AttendanceSyncService } from '../services/attendanceSync';
import { logger } from '../config/logger';
import { HIDAdapter } from '../devices/hidAdapter';
import { SocketBridgeService } from '../services/socketBridge';

export function createDevicesRouter(
  adapters: Map<string, ZKTecoAdapter>,
  attendanceSync: AttendanceSyncService,
  socketBridge: SocketBridgeService,
  hidAdapter: HIDAdapter
) {
  const router = Router();

  router.get('/', async (req, res) => {
    try {
      const { data, error } = await supabase.from('hardware_devices').select('*');
      if (error) throw error;
      
      const devicesWithStatus = data.map(device => ({
        ...device,
        connected: adapters.has(device.id) && adapters.get(device.id)!.isConnected
      }));
      
      res.json(devicesWithStatus);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  router.post('/discover', async (req, res) => {
    const range = process.env.SCAN_NETWORK_RANGE || '192.168.1.0/24';
    try {
      const zktecoDevices = await scanForZKTecoDevices(range);
      const usbDevices = await hidAdapter.scanDevices();
      
      const result = { zkteco: zktecoDevices, usb: usbDevices };
      socketBridge.emitDiscoveryResult(zktecoDevices);
      res.json(result);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  router.post('/:id/connect', async (req, res) => {
    const { id } = req.params;
    const { ip, port, password } = req.body;
    
    let adapter = adapters.get(id);
    if (!adapter) {
      adapter = new ZKTecoAdapter(id, ip, port || 4370, password);
      adapters.set(id, adapter);
    }
    
    const connected = await adapter.connect();
    if (connected) {
      adapter.onAttendance(async (event) => {
        await attendanceSync.processAttendanceEvent(event, id);
      });
      res.json({ success: true, message: 'Connected' });
    } else {
      adapters.delete(id);
      res.status(500).json({ success: false, message: 'Failed to connect' });
    }
  });

  router.post('/:id/disconnect', async (req, res) => {
    const { id } = req.params;
    const adapter = adapters.get(id);
    if (adapter) {
      await adapter.disconnect();
      adapters.delete(id);
    }
    res.json({ success: true });
  });

  router.get('/:id/status', async (req, res) => {
    const { id } = req.params;
    const adapter = adapters.get(id);
    if (!adapter) return res.status(404).json({ error: 'Device not connected' });
    
    try {
      const info = await adapter.getInfo();
      res.json(info);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  router.post('/:id/enrol', async (req, res) => {
    const { id } = req.params;
    const { memberId, memberName, biometricUserId } = req.body;
    
    const adapter = adapters.get(id);
    if (!adapter) return res.status(404).json({ error: 'Device not connected' });
    
    try {
      const success = await adapter.enrollUser(memberId, memberName, biometricUserId);
      res.json({ success });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  router.delete('/:id/users/:uid', async (req, res) => {
    const { id, uid } = req.params;
    const adapter = adapters.get(id);
    if (!adapter) return res.status(404).json({ error: 'Device not connected' });
    
    try {
      const success = await adapter.deleteUser(parseInt(uid, 10));
      res.json({ success });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  router.post('/:id/sync', async (req, res) => {
    const { id } = req.params;
    const adapter = adapters.get(id);
    if (!adapter) return res.status(404).json({ error: 'Device not connected' });
    
    try {
      const result = await attendanceSync.syncDeviceAttendance(id, adapter);
      res.json(result);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  return router;
}
