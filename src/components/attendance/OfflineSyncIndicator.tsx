'use client';

import React, { useEffect, useState, useCallback } from 'react';
import {
  getPendingCheckInCount,
  flushPendingCheckIns,
  setupAttendanceSyncListener,
} from '@/lib/attendance/offline-queue';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Wifi, WifiOff, RefreshCw, CloudCheck } from 'lucide-react';
import { toast } from 'sonner';

interface OfflineSyncIndicatorProps {
  className?: string;
  showWhenSynced?: boolean;
}

export function OfflineSyncIndicator({
  className = '',
  showWhenSynced = true,
}: OfflineSyncIndicatorProps) {
  const [isOnline, setIsOnline] = useState(
    typeof navigator !== 'undefined' ? navigator.onLine : true
  );
  const [pendingCount, setPendingCount] = useState(0);
  const [syncing, setSyncing] = useState(false);

  const checkCount = useCallback(async () => {
    try {
      const count = await getPendingCheckInCount();
      setPendingCount(count);
    } catch {
      // Ignored in SSR
    }
  }, []);

  const triggerSync = async () => {
    if (!isOnline) {
      toast.info('Cannot sync while offline. Check-ins remain securely buffered locally.');
      return;
    }

    try {
      setSyncing(true);
      const res = await flushPendingCheckIns();
      if (res.synced > 0) {
        toast.success(`Synchronized ${res.synced} offline check-in records!`);
      }
      setPendingCount(res.remaining);
    } catch (err: any) {
      toast.error(err.message || 'Sync failed. Will retry automatically.');
    } finally {
      setSyncing(false);
    }
  };

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const handleOnline = () => {
      setIsOnline(true);
      checkCount();
    };

    const handleOffline = () => {
      setIsOnline(false);
      checkCount();
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Initial check
    checkCount();

    // Auto-poll count every 4 seconds
    const interval = setInterval(() => {
      checkCount();
    }, 4000);

    // Attach global sync heartbeat
    const cleanupHeartbeat = setupAttendanceSyncListener();

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      clearInterval(interval);
      cleanupHeartbeat();
    };
  }, [checkCount]);

  // If fully synced and showWhenSynced is false, hide
  if (!showWhenSynced && pendingCount === 0 && isOnline) {
    return null;
  }

  return (
    <div className={`inline-flex items-center gap-2 ${className}`}>
      {/* Offline with buffered records */}
      {!isOnline && (
        <Badge
          variant="outline"
          className="bg-amber-500/10 border-amber-500/30 text-amber-400 text-xs px-2.5 py-1 flex items-center gap-1.5 animate-pulse"
        >
          <WifiOff className="h-3.5 w-3.5" />
          <span>Offline Mode ({pendingCount} buffered)</span>
        </Badge>
      )}

      {/* Online with pending queue to sync */}
      {isOnline && pendingCount > 0 && (
        <div className="flex items-center gap-2">
          <Badge
            variant="outline"
            className="bg-purple-500/10 border-purple-500/30 text-purple-300 text-xs px-2.5 py-1 flex items-center gap-1.5"
          >
            <RefreshCw className={`h-3 w-3 ${syncing ? 'animate-spin' : ''}`} />
            <span>{pendingCount} check-in{pendingCount > 1 ? 's' : ''} queued</span>
          </Badge>
          <Button
            size="sm"
            variant="ghost"
            onClick={triggerSync}
            disabled={syncing}
            className="h-7 px-2 text-xs text-purple-400 hover:text-purple-300 hover:bg-purple-500/10"
          >
            Sync Now
          </Button>
        </div>
      )}

      {/* Online and completely synced */}
      {isOnline && pendingCount === 0 && showWhenSynced && (
        <div className="flex items-center gap-1.5 text-[11px] text-zinc-400 px-2 py-0.5 rounded-full bg-zinc-900/60 border border-zinc-800">
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-400"></span>
          <span className="font-medium text-zinc-300">Cloud Sync Active</span>
        </div>
      )}
    </div>
  );
}
