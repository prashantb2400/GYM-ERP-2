import { Server as HttpServer } from 'http';
import { Server, Socket } from 'socket.io';
import { AttendanceEvent, DeviceStatus, DiscoveredDevice } from '../types';
import { logger } from '../config/logger';
import dotenv from 'dotenv';
dotenv.config();

export class SocketBridgeService {
  private io: Server;

  constructor(server: HttpServer) {
    this.io = new Server(server, {
      cors: {
        origin: process.env.NEXTJS_APP_URL || 'http://localhost:3000',
        methods: ['GET', 'POST']
      }
    });

    this.io.on('connection', (socket: Socket) => {
      logger.info(`Client connected to WebSocket: ${socket.id}`);
      
      socket.on('disconnect', () => {
        logger.info(`Client disconnected: ${socket.id}`);
      });
    });
  }

  emitAttendanceEvent(event: AttendanceEvent): void {
    this.io.emit('attendance:new', event);
  }

  emitDeviceStatus(deviceId: string, status: DeviceStatus): void {
    this.io.emit('hardware:status', { deviceId, ...status });
  }

  emitDiscoveryResult(devices: DiscoveredDevice[]): void {
    this.io.emit('hardware:discovery', devices);
  }

  getConnectedClients(): number {
    return this.io.engine.clientsCount;
  }
}
