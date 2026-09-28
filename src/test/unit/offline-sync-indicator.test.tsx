/**
 * OfflineSyncIndicator Component Unit Tests
 *
 * Verifies rendering under online and offline network conditions,
 * display of buffered record counts, and manual sync action triggers.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { OfflineSyncIndicator } from '@/components/attendance/OfflineSyncIndicator';
import * as offlineQueue from '@/lib/attendance/offline-queue';

vi.mock('@/lib/attendance/offline-queue', () => ({
  getPendingCheckInCount: vi.fn(),
  flushPendingCheckIns: vi.fn(),
  setupAttendanceSyncListener: vi.fn(() => () => {}),
}));

describe('OfflineSyncIndicator Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders Cloud Sync Active when online and queue is empty', async () => {
    vi.spyOn(offlineQueue, 'getPendingCheckInCount').mockResolvedValue(0);

    render(<OfflineSyncIndicator showWhenSynced={true} />);

    await waitFor(() => {
      expect(screen.getByText('Cloud Sync Active')).toBeInTheDocument();
    });
  });

  it('renders queued count and sync button when records are waiting', async () => {
    vi.spyOn(offlineQueue, 'getPendingCheckInCount').mockResolvedValue(3);
    vi.spyOn(offlineQueue, 'flushPendingCheckIns').mockResolvedValue({ synced: 3, remaining: 0 });

    render(<OfflineSyncIndicator />);

    await waitFor(() => {
      expect(screen.getByText('3 check-ins queued')).toBeInTheDocument();
      expect(screen.getByText('Sync Now')).toBeInTheDocument();
    });

    const syncBtn = screen.getByText('Sync Now');
    fireEvent.click(syncBtn);

    await waitFor(() => {
      expect(offlineQueue.flushPendingCheckIns).toHaveBeenCalledTimes(1);
    });
  });
});
