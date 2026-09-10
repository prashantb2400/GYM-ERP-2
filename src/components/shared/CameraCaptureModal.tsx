'use client';

import React, { useRef, useState, useEffect, useCallback } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Camera, RefreshCw, Check, FlipHorizontal, AlertCircle } from 'lucide-react';

interface CameraCaptureModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCapture: (file: File, previewUrl: string) => void;
  title?: string;
}

export function CameraCaptureModal({
  isOpen,
  onClose,
  onCapture,
  title = 'Take Member Photo',
}: CameraCaptureModalProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const [capturedUrl, setCapturedUrl] = useState<string | null>(null);
  const [capturedBlob, setCapturedBlob] = useState<Blob | null>(null);
  const [facingMode, setFacingMode] = useState<'user' | 'environment'>('user');
  const [error, setError] = useState<string | null>(null);
  const [isLoadingCamera, setIsLoadingCamera] = useState(false);

  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
  }, []);

  const startCamera = useCallback(async (facing: 'user' | 'environment') => {
    try {
      setIsLoadingCamera(true);
      setError(null);
      stopCamera();

      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: facing,
          width: { ideal: 640 },
          height: { ideal: 480 },
        },
        audio: false,
      });

      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play().catch(() => {});
      }
    } catch (err: unknown) {
      console.error('Camera access error:', err);
      const msg =
        err instanceof Error
          ? err.message
          : 'Could not access camera. Please check browser permissions.';
      setError(msg);
    } finally {
      setIsLoadingCamera(false);
    }
  }, [stopCamera]);

  useEffect(() => {
    if (isOpen) {
      setCapturedUrl(null);
      setCapturedBlob(null);
      setError(null);
      startCamera(facingMode);
    } else {
      stopCamera();
    }

    return () => {
      stopCamera();
    };
  }, [isOpen, facingMode, startCamera, stopCamera]);

  const handleToggleFacingMode = () => {
    const nextMode = facingMode === 'user' ? 'environment' : 'user';
    setFacingMode(nextMode);
    setCapturedUrl(null);
    setCapturedBlob(null);
  };

  const handleTakeSnapshot = () => {
    if (!videoRef.current || !canvasRef.current) return;

    const video = videoRef.current;
    const canvas = canvasRef.current;

    // Use square framing for profile snapshot
    const size = Math.min(video.videoWidth, video.videoHeight);
    canvas.width = size;
    canvas.height = size;

    const startX = (video.videoWidth - size) / 2;
    const startY = (video.videoHeight - size) / 2;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // If facing user, mirror horizontally for natural selfie feel
    if (facingMode === 'user') {
      ctx.translate(size, 0);
      ctx.scale(-1, 1);
    }

    ctx.drawImage(video, startX, startY, size, size, 0, 0, size, size);

    canvas.toBlob(
      (blob) => {
        if (blob) {
          const url = URL.createObjectURL(blob);
          setCapturedUrl(url);
          setCapturedBlob(blob);
          stopCamera();
        }
      },
      'image/jpeg',
      0.9
    );
  };

  const handleRetake = () => {
    if (capturedUrl) {
      URL.revokeObjectURL(capturedUrl);
    }
    setCapturedUrl(null);
    setCapturedBlob(null);
    startCamera(facingMode);
  };

  const handleConfirm = () => {
    if (!capturedBlob || !capturedUrl) return;

    const file = new File([capturedBlob], `snapshot_${Date.now()}.jpg`, {
      type: 'image/jpeg',
    });

    onCapture(file, capturedUrl);
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="bg-zinc-900 border-zinc-800 text-zinc-100 sm:max-w-md p-6">
        <DialogHeader>
          <DialogTitle className="text-lg font-bold flex items-center gap-2">
            <Camera className="h-5 w-5 text-purple-400" />
            {title}
          </DialogTitle>
        </DialogHeader>

        {/* Hidden offscreen canvas for snapshot cropping */}
        <canvas ref={canvasRef} className="hidden" />

        <div className="relative aspect-square w-full max-w-[320px] mx-auto rounded-2xl overflow-hidden bg-black border-2 border-zinc-800 flex items-center justify-center my-2">
          {error ? (
            <div className="p-4 text-center text-red-400 space-y-2 text-xs">
              <AlertCircle className="h-8 w-8 mx-auto text-red-500" />
              <p className="font-semibold">Camera Access Error</p>
              <p className="text-zinc-400">{error}</p>
              <Button
                variant="outline"
                size="sm"
                onClick={() => startCamera(facingMode)}
                className="mt-2 text-xs border-zinc-700 hover:bg-zinc-800"
              >
                Retry
              </Button>
            </div>
          ) : capturedUrl ? (
            <img
              src={capturedUrl}
              alt="Captured Snapshot"
              className="w-full h-full object-cover"
            />
          ) : (
            <>
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className={`w-full h-full object-cover ${
                  facingMode === 'user' ? 'scale-x-[-1]' : ''
                }`}
              />

              {/* Circular framing guide */}
              <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
                <div className="w-56 h-56 rounded-full border-2 border-dashed border-purple-400/70 shadow-[0_0_0_9999px_rgba(0,0,0,0.4)]" />
              </div>

              {isLoadingCamera && (
                <div className="absolute inset-0 bg-black/60 flex items-center justify-center text-xs text-zinc-300">
                  Initializing camera...
                </div>
              )}
            </>
          )}

          {/* Camera flip button */}
          {!capturedUrl && !error && (
            <Button
              type="button"
              variant="secondary"
              size="icon"
              onClick={handleToggleFacingMode}
              className="absolute top-3 right-3 h-8 w-8 rounded-full bg-black/60 hover:bg-black/80 text-white border border-white/20"
              title="Flip Camera"
            >
              <FlipHorizontal className="h-4 w-4" />
            </Button>
          )}
        </div>

        <p className="text-center text-xs text-zinc-400">
          {capturedUrl
            ? 'Preview your snapshot. Retake or click Use Photo to save.'
            : 'Center the member’s face inside the circle, then click Capture.'}
        </p>

        <DialogFooter className="flex flex-row justify-between items-center gap-2 pt-2">
          <Button
            type="button"
            variant="ghost"
            onClick={onClose}
            className="text-zinc-400 hover:bg-zinc-800 text-xs"
          >
            Cancel
          </Button>

          {capturedUrl ? (
            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={handleRetake}
                className="border-zinc-700 text-zinc-200 hover:bg-zinc-800 text-xs gap-1.5"
              >
                <RefreshCw className="h-3.5 w-3.5" /> Retake
              </Button>
              <Button
                type="button"
                onClick={handleConfirm}
                className="bg-purple-600 hover:bg-purple-700 text-white text-xs font-semibold gap-1.5"
              >
                <Check className="h-3.5 w-3.5" /> Use Photo
              </Button>
            </div>
          ) : (
            <Button
              type="button"
              disabled={isLoadingCamera || Boolean(error)}
              onClick={handleTakeSnapshot}
              className="bg-purple-600 hover:bg-purple-700 text-white text-xs font-semibold gap-2"
            >
              <Camera className="h-4 w-4" /> Capture Photo
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
