'use client';

import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tablet, Sparkles, CheckCircle2, RefreshCw, QrCode } from 'lucide-react';
import { toast } from 'sonner';
import { fetchWithAuth } from '@/lib/utils/api-client';

interface KioskPairingModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  branches: Array<{ id: string; name: string }>;
  initialCode?: string;
  onPaired?: () => void;
}

export function KioskPairingModal({
  open,
  onOpenChange,
  branches,
  initialCode = '',
  onPaired,
}: KioskPairingModalProps) {
  const [pairingCode, setPairingCode] = useState(initialCode);
  const [selectedBranchId, setSelectedBranchId] = useState<string>('');
  const [deviceName, setDeviceName] = useState('Front Desk Tablet');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (initialCode) {
      setPairingCode(initialCode.toUpperCase());
    }
  }, [initialCode]);

  useEffect(() => {
    if (branches.length > 0 && !selectedBranchId) {
      setSelectedBranchId(branches[0].id);
    }
  }, [branches, selectedBranchId]);

  const handlePair = async () => {
    if (!pairingCode.trim()) {
      toast.error('Please enter the 6-character pairing code shown on tablet');
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await fetchWithAuth('/api/kiosk/pair/authorize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          pairingCode: pairingCode.trim().toUpperCase(),
          branchId: selectedBranchId || null,
          deviceName: deviceName.trim(),
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || 'Failed to authorize tablet');
      } else {
        toast.success(data.message || 'Tablet paired successfully!');
        onOpenChange(false);
        setPairingCode('');
        onPaired?.();
      }
    } catch {
      toast.error('Network error during pairing authorization');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md bg-zinc-950 border border-zinc-800 text-zinc-100">
        <DialogHeader className="space-y-1">
          <div className="size-11 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 flex items-center justify-center mb-2">
            <Tablet className="size-6" />
          </div>
          <DialogTitle className="text-xl font-bold">Pair Kiosk Tablet</DialogTitle>
          <DialogDescription className="text-zinc-400 text-xs">
            Enter the 6-character code displayed on the Android tablet screen to connect it to your gym workspace.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-3">
          <div className="space-y-1.5">
            <Label className="text-xs font-mono text-zinc-300">Pairing Code (from Tablet Screen)</Label>
            <Input
              type="text"
              placeholder="e.g. GYM-482"
              value={pairingCode}
              onChange={(e) => setPairingCode(e.target.value.toUpperCase())}
              maxLength={8}
              className="h-12 font-mono text-center tracking-widest text-lg font-bold bg-zinc-900 border-zinc-800 text-indigo-400 focus:border-indigo-500"
            />
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs font-mono text-zinc-300">Device Nickname</Label>
            <Input
              type="text"
              placeholder="e.g. Reception Desk 1"
              value={deviceName}
              onChange={(e) => setDeviceName(e.target.value)}
              className="h-11 bg-zinc-900 border-zinc-800 text-sm"
            />
          </div>

          {branches.length > 0 && (
            <div className="space-y-1.5">
              <Label className="text-xs font-mono text-zinc-300">Assign to Branch</Label>
              <select
                value={selectedBranchId}
                onChange={(e) => setSelectedBranchId(e.target.value)}
                className="w-full h-11 rounded-xl bg-zinc-900 border border-zinc-800 px-3 text-sm text-zinc-200 focus:outline-none focus:border-indigo-500"
              >
                {branches.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button
            type="button"
            variant="ghost"
            onClick={() => onOpenChange(false)}
            className="text-zinc-400 hover:text-white text-xs font-mono"
          >
            Cancel
          </Button>
          <Button
            type="button"
            disabled={isSubmitting || !pairingCode.trim()}
            onClick={handlePair}
            className="bg-indigo-600 hover:bg-indigo-500 text-white font-medium text-xs shadow-lg shadow-indigo-600/20"
          >
            {isSubmitting ? (
              <>
                <RefreshCw className="size-4 animate-spin mr-2" />
                <span>Authorizing...</span>
              </>
            ) : (
              <>
                <CheckCircle2 className="size-4 mr-2" />
                <span>Authorize & Pair Tablet</span>
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
