'use client';

import React, { useRef, useState, useEffect, useCallback } from 'react';
import { Camera, RefreshCw, CheckCircle2, AlertCircle, Scan } from 'lucide-react';
import { kioskAudio } from '@/components/kiosk/KioskAudio';
import { voiceAgent } from '@/lib/kiosk/voice-agent';
import { KycExtractedData } from '@/lib/server/llm';
import { cn } from '@/lib/utils';

interface KioskDocumentScannerProps {
  gymId?: string;
  onExtracted: (data: KycExtractedData, snapshotBase64: string) => void;
  onCancel?: () => void;
}

export function KioskDocumentScanner({
  gymId,
  onExtracted,
  onCancel,
}: KioskDocumentScannerProps) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const [cameraActive, setCameraActive] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [countdown, setCountdown] = useState<number | null>(null);

  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    setCameraActive(false);
  }, []);

  const startCamera = useCallback(async () => {
    setCameraError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: 'environment', // Rear camera on tablet or fallback to user camera
          width: { ideal: 1920 },
          height: { ideal: 1080 },
        },
      });

      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
        setCameraActive(true);
      }
    } catch (err: any) {
      // Fallback to any available camera (e.g. front camera if tablet is mounted facing front)
      try {
        const fallbackStream = await navigator.mediaDevices.getUserMedia({ video: true });
        streamRef.current = fallbackStream;
        if (videoRef.current) {
          videoRef.current.srcObject = fallbackStream;
          await videoRef.current.play();
          setCameraActive(true);
        }
      } catch (fallbackErr: any) {
        setCameraError('Camera access denied or unavailable. You can enter details manually.');
      }
    }
  }, []);

  useEffect(() => {
    startCamera();
    voiceAgent.speakScanDocumentPrompt();

    return () => {
      stopCamera();
    };
  }, [startCamera, stopCamera]);

  const handleCapture = async () => {
    if (!videoRef.current || !canvasRef.current || isProcessing) return;

    kioskAudio.playTap();
    setCountdown(3);

    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev === 1) {
          clearInterval(timer);
          processSnapshot();
          return null;
        }
        return prev ? prev - 1 : null;
      });
    }, 800);
  };

  const processSnapshot = async () => {
    if (!videoRef.current || !canvasRef.current) return;
    setIsProcessing(true);
    kioskAudio.playTap();

    try {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      canvas.width = video.videoWidth || 1280;
      canvas.height = video.videoHeight || 720;

      const ctx = canvas.getContext('2d');
      if (!ctx) throw new Error('Canvas context error');

      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      const base64Image = canvas.toDataURL('image/jpeg', 0.85);

      // Call server OCR endpoint
      const res = await fetch('/api/kiosk/ocr', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          imageBase64: base64Image,
          gymId,
        }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        kioskAudio.playSuccess();
        if (data.name) {
          voiceAgent.speakAutoFillConfirmation(data.name);
        }
        onExtracted(data, base64Image);
      } else {
        kioskAudio.playError();
        setCameraError(data.error || 'Could not parse card clearly. Please adjust lighting.');
      }
    } catch (e: any) {
      kioskAudio.playError();
      setCameraError('Network error reading card.');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="relative w-full max-w-md mx-auto space-y-4 text-center">
      <div className="relative aspect-[4/3] rounded-3xl overflow-hidden bg-zinc-950 border-2 border-zinc-800 shadow-2xl">
        <video
          ref={videoRef}
          playsInline
          muted
          className="w-full h-full object-cover"
        />
        <canvas ref={canvasRef} className="hidden" />

        {/* Reticle / Document Alignment Frame */}
        <div className="absolute inset-0 pointer-events-none flex items-center justify-center p-6">
          <div className="relative w-[85%] aspect-[1.58/1] rounded-2xl border-2 border-dashed border-indigo-400/80 bg-indigo-500/5 shadow-[0_0_0_9999px_rgba(0,0,0,0.45)] flex items-center justify-center">
            {isProcessing ? (
              <div className="space-y-2 text-indigo-300 animate-pulse">
                <Scan className="size-8 mx-auto animate-spin" />
                <span className="text-xs font-mono font-bold block">AI OCR SCANNING...</span>
              </div>
            ) : countdown ? (
              <span className="text-5xl font-mono font-bold text-white animate-ping">
                {countdown}
              </span>
            ) : (
              <div className="text-center px-4">
                <span className="text-xs font-mono text-indigo-200 bg-zinc-900/90 px-3 py-1.5 rounded-full border border-indigo-500/30">
                  Align Aadhaar / ID Card Here
                </span>
              </div>
            )}
          </div>
        </div>

        {cameraError && (
          <div className="absolute inset-0 bg-zinc-950/90 flex flex-col items-center justify-center p-6 text-amber-400 space-y-3">
            <AlertCircle className="size-10" />
            <p className="text-xs font-medium">{cameraError}</p>
            <button
              type="button"
              onClick={startCamera}
              className="text-xs text-white underline pt-2"
            >
              Retry Camera
            </button>
          </div>
        )}
      </div>

      <div className="flex items-center justify-between gap-3">
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            className="px-5 py-3 rounded-2xl bg-zinc-900 text-zinc-400 hover:text-white text-xs font-mono border border-zinc-800"
          >
            Cancel
          </button>
        )}
        <button
          type="button"
          disabled={!cameraActive || isProcessing}
          onClick={handleCapture}
          className="flex-1 py-3.5 rounded-2xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-medium text-sm flex items-center justify-center gap-2 shadow-lg shadow-indigo-600/25 active:scale-95 transition-all"
        >
          <Camera className="size-4" />
          <span>{isProcessing ? 'Reading Document...' : 'Snap & Auto-Fill'}</span>
        </button>
      </div>
    </div>
  );
}
