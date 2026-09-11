'use client';

import React, { useState, useRef, useCallback, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Checkbox } from '@/components/ui/checkbox';
import { Camera, CheckCircle2, AlertCircle, Loader2, Trash2, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';
import { getHumanInstance } from '@/lib/face-attendance/models';
import { averageDescriptors, normalizeDescriptor } from '@/lib/face-attendance/matcher';
import { fetchWithAuth } from '@/lib/utils/api-client';

interface FaceEnrollmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  member: {
    id: string;
    name: string;
    member_code: string;
    face_enrolled?: boolean;
    photo_url?: string | null;
  };
  onSuccess?: () => void;
}

export function FaceEnrollmentModal({ isOpen, onClose, member, onSuccess }: FaceEnrollmentModalProps) {
  const [consentGiven, setConsentGiven] = useState(false);
  const [isLoadingModels, setIsLoadingModels] = useState(true);
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [isCapturing, setIsCapturing] = useState(false);
  const [capturedFrames, setCapturedFrames] = useState<number[][]>([]);
  const [progress, setProgress] = useState(0);
  const [statusMessage, setStatusMessage] = useState('Position face inside the oval frame');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const humanRef = useRef<any>(null);

  // Stop camera helper
  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    setIsCameraActive(false);
  }, []);

  // Start camera helper
  const startCamera = useCallback(async () => {
    try {
      setErrorMessage(null);
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: { ideal: 640 }, height: { ideal: 480 }, facingMode: 'user' },
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
      setIsCameraActive(true);
    } catch (err) {
      setErrorMessage('Camera access denied or unavailable.');
    }
  }, []);

  // Load models on open
  useEffect(() => {
    if (!isOpen) {
      stopCamera();
      setProgress(0);
      setCapturedFrames([]);
      setConsentGiven(false);
      setErrorMessage(null);
      return;
    }

    let isMounted = true;
    (async () => {
      try {
        setIsLoadingModels(true);
        const human = await getHumanInstance();
        if (isMounted) {
          humanRef.current = human;
          setIsLoadingModels(false);
          await startCamera();
        }
      } catch (err: unknown) {
        if (isMounted) {
          const msg = err instanceof Error ? err.message : 'Failed to initialize neural engine';
          setErrorMessage(msg);
          setIsLoadingModels(false);
        }
      }
    })();

    return () => {
      isMounted = false;
      stopCamera();
    };
  }, [isOpen, startCamera, stopCamera]);

  // Capture face descriptors across 5 guided poses
  const handleStartCapture = async () => {
    if (!consentGiven) {
      toast.error('Please accept the biometric data consent before continuing.');
      return;
    }

    if (!videoRef.current || !humanRef.current) return;

    setIsCapturing(true);
    setErrorMessage(null);
    setCapturedFrames([]);
    setProgress(0);

    const human = humanRef.current;
    const descriptors: number[][] = [];
    const TOTAL_FRAMES = 5;

    const POSE_INSTRUCTIONS = [
      'Pose 1/5: Look straight into the camera',
      'Pose 2/5: Hold steady, neutral expression',
      'Pose 3/5: Turn face slightly left (~10°)',
      'Pose 4/5: Turn face slightly right (~10°)',
      'Pose 5/5: Look straight again (natural expression)',
    ];

    for (let i = 0; i < TOTAL_FRAMES; i++) {
      setStatusMessage(POSE_INSTRUCTIONS[i]);
      await new Promise(r => setTimeout(r, 600));

      if (!videoRef.current) break;

      const result = await human.detect(videoRef.current);

      if (!result || !result.face || result.face.length === 0) {
        setStatusMessage('No face detected. Please position within the oval.');
        i--; // Retry this pose
        await new Promise(r => setTimeout(r, 400));
        continue;
      }

      // Pick most prominent face in viewport
      const face = result.face.reduce((prev: any, curr: any) =>
        (curr.box[2] * curr.box[3] > prev.box[2] * prev.box[3] ? curr : prev)
      );

      const [x, y, width, height] = face.box;
      // Quality Gate: Ensure face is close enough and sharp
      if (width < 75 || height < 75) {
        setStatusMessage('Move a bit closer to the camera...');
        i--;
        await new Promise(r => setTimeout(r, 400));
        continue;
      }

      if ((face.score ?? 0) < 0.45 && (face.boxScore ?? 0) < 0.45) {
        setStatusMessage('Adjust lighting and hold steady...');
        i--;
        await new Promise(r => setTimeout(r, 400));
        continue;
      }

      if (!face.embedding || face.embedding.length < 512) {
        setStatusMessage('Extracting biometric features, hold steady...');
        i--;
        await new Promise(r => setTimeout(r, 400));
        continue;
      }

      descriptors.push(normalizeDescriptor(Array.from(face.embedding)));
      setProgress(Math.round(((i + 1) / TOTAL_FRAMES) * 100));
    }

    setIsCapturing(false);

    if (descriptors.length === TOTAL_FRAMES) {
      try {
        setIsSaving(true);
        setStatusMessage('Computing multi-pose biometric template...');
        // Average with outlier rejection for primary centroid
        const averagedVector = averageDescriptors(descriptors, true);

        const res = await fetchWithAuth(`/api/members/${member.id}/face-enroll`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            descriptor: averagedVector,
            descriptors: descriptors, // 5-pose gallery
            consentGiven: true,
            dimension: averagedVector.length,
            model: averagedVector.length === 1024 ? 'human-1024' : 'insightface-512',
          }),
        });

        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Failed to save enrollment');

        toast.success(`Face ID enrolled for ${member.name}!`);
        stopCamera();
        onSuccess?.();
        onClose();
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : 'Error saving face data';
        setErrorMessage(msg);
      } finally {
        setIsSaving(false);
      }
    }
  };

  // Remove existing face enrollment (Right to Erasure)
  const handleDeleteEnrollment = async () => {
    try {
      setIsDeleting(true);
      const res = await fetchWithAuth(`/api/members/${member.id}/face-enroll`, {
        method: 'DELETE',
      });
      if (!res.ok) throw new Error('Failed to delete face descriptor');

      toast.success('Face ID removed successfully');
      stopCamera();
      onSuccess?.();
      onClose();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Deletion error';
      toast.error(msg);
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={open => !open && onClose()}>
      <DialogContent className="max-w-lg bg-zinc-950 border-zinc-800 text-zinc-100 p-6">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl font-bold">
            <Camera className="h-5 w-5 text-primary" />
            Face ID Enrollment — {member.name}
          </DialogTitle>
          <DialogDescription className="text-zinc-400 text-xs">
            Capture 5 rapid frames to compute a high-precision deep biometric mathematical descriptor (1024-D).
            No raw photographs are stored or transmitted.
          </DialogDescription>
        </DialogHeader>

        {/* Video Viewport with Oval Target Overlay */}
        <div className="relative w-full aspect-video bg-zinc-900 rounded-2xl overflow-hidden border border-zinc-800 flex items-center justify-center my-3">
          <video
            ref={videoRef}
            playsInline
            muted
            className="w-full h-full object-cover scale-x-[-1]"
          />

          {/* Oval Guide Overlay */}
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div
              className={`w-40 h-52 rounded-[50%] border-2 border-dashed transition-colors duration-300 ${
                isCapturing ? 'border-primary animate-pulse' : 'border-zinc-400/50'
              }`}
            />
          </div>

          {isLoadingModels && (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-zinc-950/80 backdrop-blur-sm gap-2">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <p className="text-xs text-zinc-400 font-medium">Loading neural models (WebGL / Human AI)...</p>
            </div>
          )}

          {errorMessage && (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-zinc-950/90 p-4 text-center">
              <AlertCircle className="h-8 w-8 text-red-400 mb-2" />
              <p className="text-sm text-red-300">{errorMessage}</p>
              <Button size="sm" variant="outline" onClick={startCamera} className="mt-3 gap-1">
                <RefreshCw className="h-3.5 w-3.5" /> Retry Camera
              </Button>
            </div>
          )}
        </div>

        {/* Progress Bar & Status */}
        {isCapturing && (
          <div className="space-y-1.5 my-2">
            <div className="flex justify-between text-xs text-zinc-400">
              <span>{statusMessage}</span>
              <span className="font-mono">{progress}%</span>
            </div>
            <Progress value={progress} className="h-2" />
          </div>
        )}

        {!isCapturing && !errorMessage && (
          <p className="text-center text-xs text-zinc-400">{statusMessage}</p>
        )}

        {/* DPDP Compliance Mandatory Consent Checkbox */}
        <div className="flex items-start space-x-2 bg-zinc-900/60 p-3 rounded-xl border border-zinc-800 my-2">
          <Checkbox
            id="dpdp-consent"
            checked={consentGiven}
            onCheckedChange={(val: boolean | 'indeterminate') => setConsentGiven(val === true)}
            disabled={isCapturing || isSaving}
            className="mt-0.5"
          />
          <label htmlFor="dpdp-consent" className="text-[11px] text-zinc-400 leading-relaxed cursor-pointer">
            <strong className="text-zinc-200">DPDP Act Explicit Biometric Consent:</strong> I explicitly consent to computing and storing a high-precision mathematical vector representation of my facial geometry for check-in/out attendance. I understand raw photos are immediately discarded and I hold the right to permanent erasure at any time.
          </label>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-between gap-3 mt-4 pt-3 border-t border-zinc-900">
          {member.face_enrolled ? (
            <Button
              variant="destructive"
              size="sm"
              onClick={handleDeleteEnrollment}
              disabled={isDeleting || isCapturing}
              className="gap-1.5 text-xs"
            >
              {isDeleting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
              Delete Face ID
            </Button>
          ) : (
            <div />
          )}

          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" onClick={onClose} disabled={isCapturing || isSaving}>
              Cancel
            </Button>

            <Button
              onClick={handleStartCapture}
              disabled={!consentGiven || isLoadingModels || isCapturing || isSaving || !isCameraActive}
              className="gap-2 font-semibold shadow-lg"
            >
              {isSaving ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : isCapturing ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Capturing...
                </>
              ) : (
                <>
                  <Camera className="h-4 w-4" />
                  Start Enrollment (5 Frames)
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
