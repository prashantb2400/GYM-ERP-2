'use client';

import React, { useEffect, useState, useCallback } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Loader2, QrCode, CheckCircle2, AlertCircle, RefreshCw, Smartphone } from 'lucide-react';
import { toast } from 'sonner';

interface WhatsAppQrModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConnected?: () => void;
}

export function WhatsAppQrModal({
  open,
  onOpenChange,
  onConnected,
}: WhatsAppQrModalProps) {
  const [loading, setLoading] = useState(true);
  const [qrCode, setQrCode] = useState<string | null>(null);
  const [status, setStatus] = useState<string>('connecting');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const fetchQr = useCallback(async () => {
    try {
      setErrorMsg(null);
      const res = await fetch('/api/whatsapp/qr');
      const data = await res.json();

      if (!res.ok || !data.success) {
        setErrorMsg(data.error || 'Failed to communicate with bridge');
        setLoading(false);
        return;
      }

      setStatus(data.status);

      if (data.status === 'connected') {
        setQrCode(null);
        toast.success('WhatsApp connected successfully!');
        if (onConnected) onConnected();
        setTimeout(() => {
          onOpenChange(false);
        }, 1800);
      } else if (data.status === 'waiting_qr' && data.qr) {
        setQrCode(data.qr);
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Network error fetching QR code');
    } finally {
      setLoading(false);
    }
  }, [onConnected, onOpenChange]);

  useEffect(() => {
    if (!open) {
      setQrCode(null);
      setStatus('connecting');
      setErrorMsg(null);
      return;
    }

    setLoading(true);
    fetchQr();

    // Auto-poll every 3 seconds while waiting for scan
    const interval = setInterval(() => {
      fetchQr();
    }, 3000);

    return () => clearInterval(interval);
  }, [open, fetchQr]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-zinc-900 border-zinc-800 text-white max-w-md">
        <DialogHeader className="text-center sm:text-left">
          <DialogTitle className="flex items-center gap-2 text-lg font-bold">
            <QrCode className="h-5 w-5 text-purple-400" />
            Link WhatsApp Device
          </DialogTitle>
          <DialogDescription className="text-zinc-400 text-xs">
            Link the gym front-desk WhatsApp account to enable automated membership reminders and receipts.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col items-center justify-center p-4 space-y-4">
          {/* State 1: Connected */}
          {status === 'connected' && (
            <div className="flex flex-col items-center justify-center py-6 text-center space-y-3">
              <div className="h-16 w-16 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 animate-in zoom-in-95">
                <CheckCircle2 className="h-9 w-9" />
              </div>
              <h3 className="text-sm font-bold text-zinc-100">Device Linked Successfully</h3>
              <p className="text-xs text-zinc-400">
                Your WhatsApp bridge is active and ready to dispatch messages.
              </p>
            </div>
          )}

          {/* State 2: QR Code Available */}
          {status === 'waiting_qr' && qrCode && (
            <div className="flex flex-col items-center space-y-4">
              <div className="p-3 bg-white rounded-xl shadow-lg border border-zinc-700/50">
                <img
                  src={qrCode}
                  alt="WhatsApp QR Code"
                  className="w-56 h-56 object-contain rounded"
                />
              </div>

              {/* Instructions */}
              <div className="w-full bg-zinc-950/60 border border-zinc-800/80 rounded-lg p-3 text-xs space-y-1.5 text-zinc-300">
                <div className="flex items-center gap-2 font-semibold text-purple-300">
                  <Smartphone className="h-4 w-4" />
                  <span>How to scan:</span>
                </div>
                <ol className="list-decimal list-inside space-y-1 text-zinc-400 pl-1">
                  <li>Open WhatsApp on the gym phone</li>
                  <li>Tap Menu / Settings &gt; <strong>Linked Devices</strong></li>
                  <li>Tap <strong>Link a Device</strong> and point camera here</li>
                </ol>
              </div>
            </div>
          )}

          {/* State 3: Loading or Generating QR */}
          {loading && !qrCode && status !== 'connected' && !errorMsg && (
            <div className="flex flex-col items-center justify-center py-12 text-center space-y-3">
              <Loader2 className="h-8 w-8 animate-spin text-purple-500" />
              <p className="text-xs text-zinc-400">Requesting pairing QR from local bridge...</p>
            </div>
          )}

          {/* State 4: Error / Unreachable */}
          {errorMsg && (
            <div className="flex flex-col items-center justify-center py-6 text-center space-y-3">
              <div className="h-12 w-12 rounded-full bg-red-500/10 border border-red-500/20 flex items-center justify-center text-red-400">
                <AlertCircle className="h-6 w-6" />
              </div>
              <p className="text-xs text-red-300 max-w-xs">{errorMsg}</p>
              <div className="text-[11px] text-zinc-500 max-w-xs">
                Ensure the desktop app or <code className="bg-zinc-800 px-1 py-0.5 rounded text-zinc-300">whatsapp-bridge</code> and Cloudflare Tunnel are active.
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={fetchQr}
                className="border-zinc-800 bg-zinc-950 text-zinc-200 text-xs gap-1.5 mt-2"
              >
                <RefreshCw className="h-3.5 w-3.5" />
                Retry Connection
              </Button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
