'use client';

import React, { useRef, useEffect } from 'react';
import { cn } from '@/lib/utils';

export type WaterOrbState =
  | 'pairing'
  | 'idle_breathing'
  | 'face_focus'
  | 'voice_speaking'
  | 'scanning'
  | 'celebrating';

interface WaterVoiceOrbProps {
  state: WaterOrbState;
  audioLevel?: number; // 0.0 to 1.0 amplitude modulation
  size?: number;
  className?: string;
  children?: React.ReactNode;
}

export function WaterVoiceOrb({
  state,
  audioLevel = 0,
  size = 320,
  className,
  children,
}: WaterVoiceOrbProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const animRef = useRef<number | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Handle High-DPI screens
    const dpr = typeof window !== 'undefined' ? window.devicePixelRatio || 2 : 2;
    canvas.width = size * dpr;
    canvas.height = size * dpr;
    ctx.scale(dpr, dpr);

    let time = 0;

    // Particles for droplet ripple effects
    const droplets: Array<{
      radius: number;
      opacity: number;
      speed: number;
      maxRadius: number;
    }> = [];

    // Periodic droplet spawning
    const maybeSpawnDroplet = () => {
      if (droplets.length < 4 && Math.random() < 0.03) {
        droplets.push({
          radius: size * 0.3,
          opacity: 0.8,
          speed: 1.2 + Math.random() * 0.8,
          maxRadius: size * 0.52,
        });
      }
    };

    const render = () => {
      time += 0.025;
      ctx.clearRect(0, 0, size, size);

      const centerX = size / 2;
      const centerY = size / 2;
      const baseRadius = size * 0.36;

      // Color themes based on state
      let primaryHue = 240; // Indigo default
      let secondaryHue = 190; // Cyan
      let saturation = 85;
      let waveSpeed = 1.0;
      let waveAmp = 5;

      if (state === 'pairing') {
        primaryHue = 200; // Cyan/Blue
        secondaryHue = 230;
        waveSpeed = 0.7;
        waveAmp = 4;
      } else if (state === 'voice_speaking') {
        primaryHue = 245;
        secondaryHue = 280;
        waveSpeed = 2.4;
        waveAmp = 12 + audioLevel * 18;
      } else if (state === 'celebrating') {
        primaryHue = 155; // Emerald
        secondaryHue = 175;
        waveSpeed = 1.8;
        waveAmp = 9;
      } else if (state === 'scanning') {
        primaryHue = 260; // Violet
        secondaryHue = 220;
        waveSpeed = 1.5;
        waveAmp = 7;
      } else if (state === 'face_focus') {
        primaryHue = 240;
        secondaryHue = 210;
        waveSpeed = 1.6;
        waveAmp = 8;
      }

      maybeSpawnDroplet();

      // 1. Draw Concentric Radiating Droplet Waves
      for (let i = droplets.length - 1; i >= 0; i--) {
        const d = droplets[i];
        d.radius += d.speed;
        d.opacity -= 0.012;

        if (d.opacity <= 0 || d.radius >= d.maxRadius) {
          droplets.splice(i, 1);
        } else {
          ctx.beginPath();
          ctx.arc(centerX, centerY, d.radius, 0, Math.PI * 2);
          ctx.strokeStyle = `hsla(${primaryHue}, ${saturation}%, 65%, ${d.opacity * 0.35})`;
          ctx.lineWidth = 1.5;
          ctx.stroke();
        }
      }

      // 2. Draw Outer Ambient Water Glow Halo
      const haloGrad = ctx.createRadialGradient(
        centerX,
        centerY,
        baseRadius * 0.6,
        centerX,
        centerY,
        size * 0.49
      );
      haloGrad.addColorStop(0, `hsla(${primaryHue}, ${saturation}%, 60%, 0.22)`);
      haloGrad.addColorStop(0.5, `hsla(${secondaryHue}, ${saturation}%, 50%, 0.08)`);
      haloGrad.addColorStop(1, 'transparent');

      ctx.fillStyle = haloGrad;
      ctx.beginPath();
      ctx.arc(centerX, centerY, size * 0.49, 0, Math.PI * 2);
      ctx.fill();

      // 3. Draw Fluid Wave Membrane (Harmonic Deformed Liquid Perimeter)
      ctx.save();
      ctx.beginPath();

      const numPoints = 120;
      for (let i = 0; i <= numPoints; i++) {
        const angle = (i / numPoints) * Math.PI * 2;

        // Fluid harmonic wave equation: r(theta, t)
        const displacement =
          Math.sin(angle * 3 + time * waveSpeed) * waveAmp * 0.6 +
          Math.cos(angle * 5 - time * waveSpeed * 1.3) * waveAmp * 0.3 +
          Math.sin(angle * 2 + time * 0.8) * (waveAmp * 0.25);

        const r = baseRadius + displacement;
        const x = centerX + Math.cos(angle) * r;
        const y = centerY + Math.sin(angle) * r;

        if (i === 0) {
          ctx.moveTo(x, y);
        } else {
          ctx.lineTo(x, y);
        }
      }
      ctx.closePath();

      // Liquid Gradient Fill (Dark obsidian center with luminous refraction rim)
      const liquidGrad = ctx.createRadialGradient(
        centerX - baseRadius * 0.2,
        centerY - baseRadius * 0.2,
        baseRadius * 0.1,
        centerX,
        centerY,
        baseRadius * 1.05
      );
      liquidGrad.addColorStop(0, `hsla(${primaryHue}, 90%, 65%, 0.30)`);
      liquidGrad.addColorStop(0.65, `hsla(${secondaryHue}, 80%, 45%, 0.15)`);
      liquidGrad.addColorStop(1, `hsla(${primaryHue}, 85%, 20%, 0.40)`);

      ctx.fillStyle = liquidGrad;
      ctx.fill();

      // Specular Highlight Rim (Hairline water surface tension reflection)
      ctx.strokeStyle = `hsla(${secondaryHue}, 95%, 75%, 0.55)`;
      ctx.lineWidth = 2;
      ctx.stroke();
      ctx.restore();

      // 4. Secondary Interior Fluid Ripple Ring
      ctx.save();
      ctx.beginPath();
      for (let i = 0; i <= numPoints; i++) {
        const angle = (i / numPoints) * Math.PI * 2;
        const innerDisplacement =
          Math.cos(angle * 4 + time * waveSpeed * 0.9) * (waveAmp * 0.4) +
          Math.sin(angle * 2 - time * 0.6) * (waveAmp * 0.2);

        const r = baseRadius * 0.72 + innerDisplacement;
        const x = centerX + Math.cos(angle) * r;
        const y = centerY + Math.sin(angle) * r;

        if (i === 0) {
          ctx.moveTo(x, y);
        } else {
          ctx.lineTo(x, y);
        }
      }
      ctx.closePath();
      ctx.strokeStyle = `hsla(${primaryHue}, 80%, 70%, 0.25)`;
      ctx.lineWidth = 1;
      ctx.stroke();
      ctx.restore();

      animRef.current = requestAnimationFrame(render);
    };

    render();

    return () => {
      if (animRef.current) {
        cancelAnimationFrame(animRef.current);
      }
    };
  }, [state, audioLevel, size]);

  return (
    <div
      className={cn(
        'relative flex items-center justify-center select-none pointer-events-auto',
        className
      )}
      style={{ width: size, height: size }}
    >
      <canvas
        ref={canvasRef}
        className="absolute inset-0 w-full h-full pointer-events-none"
      />
      {/* Content centered inside the living water orb */}
      <div className="relative z-10 flex flex-col items-center justify-center text-center p-4">
        {children}
      </div>
    </div>
  );
}
