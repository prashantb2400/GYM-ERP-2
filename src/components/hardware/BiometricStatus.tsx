'use client';

import React from 'react';
import { Fingerprint, Usb, Wifi, RefreshCw, ServerOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { formatDistanceToNow } from 'date-fns';
import { create } from 'zustand';

// Mocked zustand store for the component
interface HardwareState {
  isSyncing: Record<string, boolean>;
  syncDevice: (id: string) => Promise<void>;
  statuses: Record<string, 'connected' | 'offline' | 'connecting'>;
}

const useHardwareStore = create<HardwareState>((set) => ({
  isSyncing: {},
  statuses: {},
  syncDevice: async (id: string) => {
    set((state) => ({ isSyncing: { ...state.isSyncing, [id]: true } }));
    try {
      await fetch(`/api/hardware/devices/${id}/sync`, { method: 'POST' });
    } catch (error) {
      console.error(error);
    } finally {
      set((state) => ({ isSyncing: { ...state.isSyncing, [id]: false } }));
    }
  },
}));

interface BiometricStatusProps {
  deviceId: string;
  deviceName: string;
  deviceType: 'zkteco' | 'hid_fingerprint' | 'serial';
  ipAddress?: string;
  enrolledCount?: number;
  lastSync?: string;
  className?: string;
}

export function BiometricStatus({
  deviceId,
  deviceName,
  deviceType,
  ipAddress,
  enrolledCount = 0,
  lastSync,
  className = ''
}: BiometricStatusProps) {
  const { isSyncing, syncDevice, statuses } = useHardwareStore();
  
  // Default to connected if not in store for demo purposes
  const status = statuses[deviceId] || 'connected';
  const syncing = isSyncing[deviceId] || false;

  const handleSync = () => {
    syncDevice(deviceId);
  };

  const getDeviceIcon = () => {
    switch (deviceType) {
      case 'zkteco': return <Wifi className="w-5 h-5" />;
      case 'hid_fingerprint': return <Fingerprint className="w-5 h-5" />;
      case 'serial': return <Usb className="w-5 h-5" />;
      default: return <Fingerprint className="w-5 h-5" />;
    }
  };

  return (
    <Card className={`overflow-hidden ${className}`}>
      <CardContent className="p-0">
        <div className="flex items-center justify-between p-4 border-b">
          <div className="flex items-center space-x-3">
            <div className={`p-2 rounded-md ${
              status === 'connected' ? 'bg-primary/10 text-primary' : 
              status === 'connecting' ? 'bg-yellow-100 text-yellow-600' : 
              'bg-red-100 text-red-600'
            }`}>
              {getDeviceIcon()}
            </div>
            <div>
              <h3 className="font-semibold text-sm">{deviceName}</h3>
              <p className="text-xs text-muted-foreground flex items-center gap-1">
                <span className="uppercase">{deviceType.replace('_', ' ')}</span>
                {ipAddress && <span>• {ipAddress}</span>}
              </p>
            </div>
          </div>
          
          <div className="flex flex-col items-end">
            <div className="flex items-center space-x-1.5">
              {status === 'connected' && (
                <>
                  <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                  <span className="text-xs font-medium text-green-600">Connected</span>
                </>
              )}
              {status === 'connecting' && (
                <>
                  <span className="w-2 h-2 rounded-full bg-yellow-500 animate-pulse" />
                  <span className="text-xs font-medium text-yellow-600">Connecting</span>
                </>
              )}
              {status === 'offline' && (
                <>
                  <span className="w-2 h-2 rounded-full bg-red-500" />
                  <span className="text-xs font-medium text-red-600">Offline</span>
                </>
              )}
            </div>
          </div>
        </div>

        <div className="p-4 bg-muted/10 grid grid-cols-2 gap-4 text-sm">
          <div>
            <p className="text-muted-foreground text-xs mb-1">Enrolled Users</p>
            <p className="font-medium text-lg">{enrolledCount.toLocaleString()}</p>
          </div>
          <div>
            <p className="text-muted-foreground text-xs mb-1">Last Sync</p>
            <p className="font-medium">
              {lastSync ? formatDistanceToNow(new Date(lastSync), { addSuffix: true }) : 'Never'}
            </p>
          </div>
        </div>

        <div className="p-3 border-t bg-card flex gap-2">
          {status === 'offline' ? (
            <Button variant="outline" className="w-full" size="sm" onClick={() => {}}>
              <ServerOff className="w-4 h-4 mr-2" /> Reconnect
            </Button>
          ) : (
            <Button 
              variant="outline" 
              className="w-full" 
              size="sm" 
              onClick={handleSync}
              disabled={syncing}
            >
              <RefreshCw className={`w-4 h-4 mr-2 ${syncing ? 'animate-spin' : ''}`} /> 
              {syncing ? 'Syncing...' : 'Sync Now'}
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
