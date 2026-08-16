import React, { useRef, useState, useEffect, useCallback } from 'react';
import { Camera, RefreshCw, CheckCircle2, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface FaceEnrollerProps {
  memberId: string;
  onSuccess?: () => void;
  onCancel?: () => void;
}

const REQUIRED_FRAMES = 5;
const INSTRUCTIONS = [
  'Look straight at the camera',
  'Turn your head slightly to the left',
  'Turn your head slightly to the right',
  'Tilt your head slightly up',
  'Tilt your head slightly down'
];

export function FaceEnroller({ memberId, onSuccess, onCancel }: FaceEnrollerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [capturedFrames, setCapturedFrames] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isEncoding, setIsEncoding] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  const startCamera = useCallback(async () => {
    try {
      setError(null);
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user', width: 640, height: 480 }
      });
      setStream(mediaStream);
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
      }
    } catch (err) {
      console.error('Camera error:', err);
      setError('Failed to access camera. Please check permissions.');
    }
  }, []);

  useEffect(() => {
    startCamera();
    return () => {
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
    };
  }, [startCamera]);

  const captureFrame = () => {
    if (!videoRef.current || !canvasRef.current) return;

    const video = videoRef.current;
    const canvas = canvasRef.current;
    const context = canvas.getContext('2d');

    if (context) {
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      context.drawImage(video, 0, 0, canvas.width, canvas.height);
      const base64Image = canvas.toDataURL('image/jpeg', 0.8);
      setCapturedFrames(prev => [...prev, base64Image]);
    }
  };

  const submitEnrolment = async () => {
    if (capturedFrames.length < REQUIRED_FRAMES) return;

    setIsEncoding(true);
    setError(null);

    try {
      const response = await fetch(`/api/members/${memberId}/enrol-face`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ images: capturedFrames })
      });

      if (!response.ok) {
        throw new Error('Failed to enrol face');
      }

      setIsSuccess(true);
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
      if (onSuccess) {
        setTimeout(onSuccess, 1500);
      }
    } catch (err) {
      console.error('Enrolment error:', err);
      setError('Failed to enrol face. Please try again.');
    } finally {
      setIsEncoding(false);
    }
  };

  if (isSuccess) {
    return (
      <div className="flex flex-col items-center justify-center p-8 space-y-4">
        <CheckCircle2 className="w-16 h-16 text-green-500" />
        <h3 className="text-xl font-semibold">Face Enrolled Successfully</h3>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center p-4 space-y-6 w-full max-w-md mx-auto">
      {error && (
        <div className="flex items-center text-red-500 bg-red-50 p-3 rounded-md w-full">
          <AlertCircle className="w-5 h-5 mr-2 flex-shrink-0" />
          <p className="text-sm">{error}</p>
        </div>
      )}

      {capturedFrames.length < REQUIRED_FRAMES ? (
        <>
          <div className="text-center">
            <h3 className="font-medium text-lg">Step {capturedFrames.length + 1} of {REQUIRED_FRAMES}</h3>
            <p className="text-muted-foreground">{INSTRUCTIONS[capturedFrames.length]}</p>
          </div>

          <div className="relative w-64 h-64 rounded-full overflow-hidden border-4 border-primary bg-black">
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className="absolute top-0 left-0 w-full h-full object-cover transform -scale-x-100"
            />
            {/* Overlay guides */}
            <div className="absolute inset-0 border-2 border-dashed border-white/50 rounded-full m-4 pointer-events-none" />
          </div>

          <canvas ref={canvasRef} className="hidden" />

          <div className="flex space-x-4">
            <Button variant="outline" onClick={onCancel}>Cancel</Button>
            <Button onClick={captureFrame} disabled={!stream}>
              <Camera className="w-4 h-4 mr-2" />
              Capture
            </Button>
          </div>
        </>
      ) : (
        <>
          <h3 className="font-medium text-lg">Review Captures</h3>
          <div className="grid grid-cols-3 gap-2 w-full">
            {capturedFrames.map((frame, index) => (
              <img
                key={index}
                src={frame}
                alt={`Capture ${index + 1}`}
                className="w-full aspect-square object-cover rounded-md border"
              />
            ))}
          </div>

          <div className="flex space-x-4 w-full">
            <Button variant="outline" className="flex-1" onClick={() => setCapturedFrames([])} disabled={isEncoding}>
              <RefreshCw className="w-4 h-4 mr-2" />
              Retake
            </Button>
            <Button className="flex-1" onClick={submitEnrolment} disabled={isEncoding}>
              {isEncoding ? 'Encoding...' : 'Submit Enrolment'}
            </Button>
          </div>
        </>
      )}
    </div>
  );
}
