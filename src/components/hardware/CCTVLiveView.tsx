'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Camera, AlertTriangle, RefreshCw, Power } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { createClient } from '@/lib/supabase/client';

interface CCTVLiveViewProps {
  cameraId: string;
  cameraName: string;
  location: string;
  rtspUrl?: string;
  showControls?: boolean;
}

export function CCTVLiveView({ cameraId, cameraName, location, rtspUrl, showControls = true }: CCTVLiveViewProps) {
  const [status, setStatus] = useState<'streaming' | 'offline'>('offline');
  const [fps, setFps] = useState(0);
  const [isDetecting, setIsDetecting] = useState(false);
  const [detectionEvent, setDetectionEvent] = useState<{ name: string; time: number } | null>(null);
  const [isActive, setIsActive] = useState(true);
  
  const imgRef = useRef<HTMLImageElement>(null);
  const frameCountRef = useRef(0);
  const lastFpsTimeRef = useRef(Date.now());
  const supabase = createClient();

  const streamUrl = `/api/hardware/cameras/${cameraId}/stream`;

  useEffect(() => {
    let fpsInterval: NodeJS.Timeout;
    
    if (status === 'streaming') {
      fpsInterval = setInterval(() => {
        const now = Date.now();
        const elapsed = (now - lastFpsTimeRef.current) / 1000;
        setFps(Math.round(frameCountRef.current / elapsed));
        frameCountRef.current = 0;
        lastFpsTimeRef.current = now;
      }, 1000);
    }

    return () => clearInterval(fpsInterval);
  }, [status]);

  useEffect(() => {
    let timeout: NodeJS.Timeout;
    if (detectionEvent) {
      timeout = setTimeout(() => {
        setDetectionEvent(null);
      }, 3000);
    }
    return () => clearTimeout(timeout);
  }, [detectionEvent]);

  useEffect(() => {
    if (!isDetecting) return;

    const channel = supabase
      .channel(`face_recognition_${cameraId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'face_recognition_logs',
          filter: `camera_id=eq.${cameraId}`,
        },
        async (payload: any) => {
          if (payload.new.member_id) {
            const { data } = await supabase
              .from('members')
              .select('first_name, last_name')
              .eq('id', payload.new.member_id)
              .single();
              
            if (data) {
              setDetectionEvent({
                name: `${data.first_name} ${data.last_name}`,
                time: Date.now()
              });
            }
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [isDetecting, cameraId, supabase]);

  useEffect(() => {
    if (!isActive) return;

    const timeout = setTimeout(() => {
      setIsActive(false);
      setStatus('offline');
    }, 30 * 60 * 1000); // 30 mins

    return () => clearTimeout(timeout);
  }, [isActive]);

  const handleImageLoad = () => {
    setStatus('streaming');
    frameCountRef.current += 1;
  };

  const handleImageError = () => {
    setStatus('offline');
  };

  const retryStream = () => {
    setIsActive(true);
    setStatus('offline');
    if (imgRef.current) {
      imgRef.current.src = `${streamUrl}?t=${Date.now()}`;
    }
  };

  return (
    <div className="flex flex-col border rounded-lg overflow-hidden bg-card shadow-sm w-full max-w-3xl">
      <div className="flex items-center justify-between p-3 border-b bg-muted/30">
        <div className="flex flex-col">
          <div className="flex items-center space-x-2">
            <Camera className="w-4 h-4 text-muted-foreground" />
            <h3 className="font-medium text-sm">{cameraName}</h3>
            {status === 'streaming' ? (
              <Badge variant="outline" className="bg-green-100 text-green-800 border-green-200 text-[10px] h-5">
                <span className="w-1.5 h-1.5 rounded-full bg-green-500 mr-1 animate-pulse" />
                Live
              </Badge>
            ) : (
              <Badge variant="outline" className="bg-red-100 text-red-800 border-red-200 text-[10px] h-5">
                Offline
              </Badge>
            )}
          </div>
          <span className="text-xs text-muted-foreground ml-6">{location}</span>
        </div>
        {status === 'streaming' && (
          <span className="text-xs font-mono bg-black/80 text-green-400 px-2 py-1 rounded">
            {fps} FPS
          </span>
        )}
      </div>

      <div className="relative aspect-video bg-black w-full flex items-center justify-center overflow-hidden">
        {isActive ? (
          <img
            ref={imgRef}
            src={streamUrl}
            onLoad={handleImageLoad}
            onError={handleImageError}
            alt={`Live view from ${cameraName}`}
            className="w-full h-full object-contain"
          />
        ) : (
          <div className="flex flex-col items-center text-white/50 space-y-4">
            <Power className="w-12 h-12" />
            <p>Stream paused to save bandwidth</p>
            <Button variant="outline" onClick={retryStream} className="text-black">
              Resume Stream
            </Button>
          </div>
        )}

        {status === 'offline' && isActive && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/80 text-white space-y-4">
            <AlertTriangle className="w-12 h-12 text-yellow-500" />
            <p>Camera feed unavailable</p>
            <Button variant="outline" onClick={retryStream} className="text-black">
              <RefreshCw className="w-4 h-4 mr-2" /> Retry Connection
            </Button>
          </div>
        )}

        {/* Detection Overlay */}
        {detectionEvent && (
          <div className="absolute bottom-4 left-4 bg-black/70 backdrop-blur-sm text-white px-4 py-2 rounded-lg border border-white/20 animate-in slide-in-from-bottom-5 fade-in">
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 rounded-full bg-green-500 flex items-center justify-center">
                <ScanFace className="w-4 h-4 text-white" />
              </div>
              <div>
                <p className="text-xs text-white/70">Face Detected</p>
                <p className="font-medium text-sm">{detectionEvent.name}</p>
              </div>
            </div>
          </div>
        )}
      </div>

      {showControls && (
        <div className="flex items-center justify-between p-3 border-t bg-muted/10">
          <div className="flex space-x-2">
            <Button 
              variant={isDetecting ? 'default' : 'outline'} 
              size="sm"
              onClick={() => setIsDetecting(!isDetecting)}
              className={isDetecting ? 'bg-cyan-600 hover:bg-cyan-700' : ''}
            >
              <ScanFace className="w-4 h-4 mr-2" />
              {isDetecting ? 'Stop Detection' : 'Start Detection'}
            </Button>
            <Button variant="outline" size="sm" onClick={() => {}}>
              <Camera className="w-4 h-4 mr-2" />
              Snapshot
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

// Quick fallback icon import since it's used in overlay
function ScanFace(props: any) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M3 7V5a2 2 0 0 1 2-2h2" />
      <path d="M17 3h2a2 2 0 0 1 2 2v2" />
      <path d="M21 17v2a2 2 0 0 1-2 2h-2" />
      <path d="M7 21H5a2 2 0 0 1-2-2v-2" />
      <path d="M8 14s1.5 2 4 2 4-2 4-2" />
      <path d="M9 9h.01" />
      <path d="M15 9h.01" />
    </svg>
  );
}
