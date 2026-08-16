import { supabase } from '../config/supabase';
import { logger } from '../config/logger';
import { AttendanceEvent, SyncResult } from '../types';
import { ZKTecoAdapter } from '../devices/zktecoAdapter';
import { SocketBridgeService } from './socketBridge';

export class AttendanceSyncService {
  private socketBridge: SocketBridgeService;

  constructor(socketBridge: SocketBridgeService) {
    this.socketBridge = socketBridge;
  }

  async processAttendanceEvent(event: AttendanceEvent, deviceId: string): Promise<void> {
    try {
      // 1. Map biometricUserId to memberId via Supabase `hardware_users` table
      const { data: userMapping, error: mapErr } = await supabase
        .from('hardware_users')
        .select('member_id')
        .eq('biometric_user_id', event.biometricUserId)
        .single();

      if (mapErr || !userMapping) {
        logger.warn(`No mapping found for biometric user ${event.biometricUserId}`);
        return;
      }

      const memberId = userMapping.member_id;
      const dateStr = new Date(event.timestamp).toISOString().split('T')[0];

      // 2. Deduplication check
      const { data: existing, error: dedupErr } = await supabase
        .from('attendance')
        .select('id')
        .eq('member_id', memberId)
        .gte('timestamp', `${dateStr}T00:00:00Z`)
        .lt('timestamp', `${dateStr}T23:59:59Z`)
        .limit(1);

      if (dedupErr) throw dedupErr;
      if (existing && existing.length > 0) {
        logger.debug(`Attendance already logged for member ${memberId} today`);
        return;
      }

      // 3. Write to Supabase `attendance` table
      const { error: insertErr } = await supabase
        .from('attendance')
        .insert({
          member_id: memberId,
          timestamp: event.timestamp,
          method: event.method,
          device_id: deviceId
        });

      if (insertErr) throw insertErr;

      // 4. Update member.last_attendance
      await supabase
        .from('members')
        .update({ last_attendance: event.timestamp })
        .eq('id', memberId);

      logger.info(`Synced attendance for member ${memberId} via device ${deviceId}`);

      // 5. Emit socket event
      this.socketBridge.emitAttendanceEvent(event);
    } catch (err) {
      logger.error('Error processing attendance event:', err);
    }
  }

  async syncDeviceAttendance(deviceId: string, adapter: ZKTecoAdapter): Promise<SyncResult> {
    const result: SyncResult = { synced: 0, failed: 0, total: 0 };
    
    try {
      const logs = await adapter.getAttendances();
      result.total = logs.length;

      // Get latest timestamp we have from this device
      const { data: latestRecord } = await supabase
        .from('attendance')
        .select('timestamp')
        .eq('device_id', deviceId)
        .order('timestamp', { ascending: false })
        .limit(1)
        .single();

      const lastSyncTime = latestRecord ? new Date(latestRecord.timestamp).getTime() : 0;

      for (const log of logs) {
        if (log.recordTime.getTime() > lastSyncTime) {
          try {
            await this.processAttendanceEvent({
              biometricUserId: parseInt(log.deviceUserId),
              timestamp: log.recordTime.toISOString(),
              method: 'fingerprint',
              deviceId
            }, deviceId);
            result.synced++;
          } catch (e) {
            result.failed++;
          }
        }
      }

      if (result.synced > 0) {
        logger.info(`Bulk sync completed for ${deviceId}: ${result.synced} synced, ${result.failed} failed`);
        // Optional: clear logs from device if needed
        // await adapter.clearAttendances();
      }

      return result;
    } catch (err) {
      logger.error(`Error in syncDeviceAttendance for ${deviceId}:`, err);
      return result;
    }
  }
}
