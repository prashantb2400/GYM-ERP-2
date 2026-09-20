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
  isSpeaking?: boolean;
  currentWord?: string;
  size?: number;
  className?: string;
  children?: React.ReactNode;
}

interface WaterDroplet {
  radius: number;
  opacity: number;
  speed: number;
  maxRadius: number;
  colorHue: number;
}

interface AqueousParticle {
  angle: number;
  distance: number;
  baseDistance: number;
  size: number;
  speed: number;
  opacity: number;
}

export function WaterVoiceOrb({
  state,
  audioLevel = 0,
  isSpeaking = false,
  currentWord = '',
  size = 320,
  className,
  children,
}: WaterVoiceOrbProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const animRef = useRef<number | null>(null);
  const lastWordRef = useRef<string>('');

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

    const prefersReducedMotion =
      typeof window !== 'undefined' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    let time = 0;

    // 1. Hydrodynamic Droplet Ripples
    const droplets: WaterDroplet[] = [];

    const spawnDroplet = (hue: number, boost: number = 1) => {
      if (droplets.length < 6) {
        droplets.push({
          radius: size * 0.28,
          opacity: 0.85,
          speed: (1.4 + Math.random() * 0.8) * boost,
          maxRadius: size * 0.52,
          colorHue: hue,
        });
      }
    };

    // 2. Suspended Aqueous Micro-Particles (Resonance Cavitation)
    const particleCount = 18;
    const particles: AqueousParticle[] = [];
    for (let i = 0; i < particleCount; i++) {
      const angle = (i / particleCount) * Math.PI * 2;
      const baseDistance = size * 0.32 + Math.random() * (size * 0.12);
      particles.push({
        angle,
        distance: baseDistance,
        baseDistance,
        size: 1.2 + Math.random() * 1.8,
        speed: 0.008 + Math.random() * 0.012,
        opacity: 0.3 + Math.random() * 0.5,
      });
    }

    const render = () => {
      time += 0.025;
      ctx.clearRect(0, 0, size, size);

      const centerX = size / 2;
      const centerY = size / 2;
      const baseRadius = size * 0.35;

      // Color themes based on state & speaking
      let primaryHue = 240; // Indigo default
      let secondaryHue = 190; // Cyan
      let saturation = 85;
      let waveSpeed = 1.0;
      let waveAmp = 5;

      const activeSpeech = isSpeaking || state === 'voice_speaking' || audioLevel > 0.08;

      if (state === 'pairing') {
        primaryHue = 195;
        secondaryHue = 220;
        waveSpeed = 0.8;
        waveAmp = 4;
      } else if (activeSpeech) {
        primaryHue = 245;
        secondaryHue = 185; // Vibrant Cyan refraction
        waveSpeed = 2.2 + audioLevel * 1.8;
        waveAmp = 10 + audioLevel * 24; // Dynamic voice deformation
        saturation = 95;
      } else if (state === 'celebrating') {
        primaryHue = 155;
        secondaryHue = 180;
        waveSpeed = 1.8;
        waveAmp = 8;
      } else if (state === 'scanning') {
        primaryHue = 265;
        secondaryHue = 220;
        waveSpeed = 1.6;
        waveAmp = 7;
      } else if (state === 'face_focus') {
        primaryHue = 210;
        secondaryHue = 245;
        waveSpeed = 1.4;
        waveAmp = 6;
      }

      // Spawn droplet burst when speaking or word advances
      if (activeSpeech) {
        if (currentWord && currentWord !== lastWordRef.current) {
          lastWordRef.current = currentWord;
          spawnDroplet(secondaryHue, 1.4);
        } else if (Math.random() < 0.05 + audioLevel * 0.1) {
          spawnDroplet(secondaryHue, 1.0);
        }
      } else if (droplets.length < 2 && Math.random() < 0.02) {
        spawnDroplet(primaryHue, 0.8);
      }

      // 1. Draw Concentric Radiating Droplet Waves
      for (let i = droplets.length - 1; i >= 0; i--) {
        const d = droplets[i];
        d.radius += d.speed;
        d.opacity -= 0.014;

        if (d.opacity <= 0 || d.radius >= d.maxRadius) {
          droplets.splice(i, 1);
        } else {
          ctx.beginPath();
          ctx.arc(centerX, centerY, d.radius, 0, Math.PI * 2);
          ctx.strokeStyle = `hsla(${d.colorHue}, ${saturation}%, 70%, ${d.opacity * 0.45})`;
          ctx.lineWidth = 1.5;
          ctx.stroke();
        }
      }

      // 2. Draw Outer Ambient Water Glow Halo (Expands with voice output)
      const haloExpansion = activeSpeech ? audioLevel * (size * 0.08) : 0;
      const haloGrad = ctx.createRadialGradient(
        centerX,
        centerY,
        baseRadius * 0.5,
        centerX,
        centerY,
        (size * 0.48) + haloExpansion
      );
      haloGrad.addColorStop(0, `hsla(${primaryHue}, ${saturation}%, 60%, ${0.22 + audioLevel * 0.25})`);
      haloGrad.addColorStop(0.55, `hsla(${secondaryHue}, ${saturation}%, 55%, ${0.10 + audioLevel * 0.15})`);
      haloGrad.addColorStop(1, 'transparent');

      ctx.fillStyle = haloGrad;
      ctx.beginPath();
      ctx.arc(centerX, centerY, (size * 0.48) + haloExpansion, 0, Math.PI * 2);
      ctx.fill();

      // 3. Draw Fluid Wave Membrane (Quad-Harmonic Deformed Liquid Perimeter)
      ctx.save();
      ctx.beginPath();

      const numPoints = 140;
      for (let i = 0; i <= numPoints; i++) {
        const angle = (i / numPoints) * Math.PI * 2;

        // Quad-Harmonic fluid wave equation with speech energy modulation
        const displacement =
          Math.sin(angle * 3 + time * waveSpeed) * (waveAmp * 0.55) +
          Math.cos(angle * 5 - time * waveSpeed * 1.3) * (waveAmp * 0.35) +
          Math.sin(angle * 7 + time * 2.2) * (waveAmp * 0.2 * (activeSpeech ? 1.5 : 0.4)) +
          Math.cos(angle * 2 + time * 0.8) * (waveAmp * 0.15);

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

      // Liquid Core Gradient Fill (Deep obsidian center with luminous refraction rim)
      const liquidGrad = ctx.createRadialGradient(
        centerX - baseRadius * 0.25,
        centerY - baseRadius * 0.25,
        baseRadius * 0.1,
        centerX,
        centerY,
        baseRadius * 1.1
      );
      liquidGrad.addColorStop(0, `hsla(${primaryHue}, 90%, 65%, ${0.35 + audioLevel * 0.3})`);
      liquidGrad.addColorStop(0.6, `hsla(${secondaryHue}, 85%, 50%, ${0.20 + audioLevel * 0.2})`);
      liquidGrad.addColorStop(1, `hsla(${primaryHue}, 90%, 18%, 0.55)`);

      ctx.fillStyle = liquidGrad;
      ctx.fill();

      // Specular Highlight Rim (Hairline water surface tension reflection with angular rotation)
      ctx.strokeStyle = `hsla(${secondaryHue}, 95%, 80%, ${0.65 + audioLevel * 0.3})`;
      ctx.lineWidth = 2.2;
      ctx.stroke();
      ctx.restore();

      // 4. Secondary Interior Fluid Ripple Ring
      ctx.save();
      ctx.beginPath();
      for (let i = 0; i <= numPoints; i++) {
        const angle = (i / numPoints) * Math.PI * 2;
        const innerDisplacement =
          Math.cos(angle * 4 + time * waveSpeed * 0.9) * (waveAmp * 0.45) +
          Math.sin(angle * 2 - time * 0.7) * (waveAmp * 0.25);

        const r = baseRadius * 0.74 + innerDisplacement;
        const x = centerX + Math.cos(angle) * r;
        const y = centerY + Math.sin(angle) * r;

        if (i === 0) {
          ctx.moveTo(x, y);
        } else {
          ctx.lineTo(x, y);
        }
      }
      ctx.closePath();
      ctx.strokeStyle = `hsla(${primaryHue}, 85%, 72%, ${0.30 + audioLevel * 0.3})`;
      ctx.lineWidth = 1.2;
      ctx.stroke();
      ctx.restore();

      // 5. Suspended Aqueous Micro-Particles (Orbit & Acoustic Vibration)
      for (let i = 0; i < particles.length; i++) {
        const p = particles[i];
        p.angle += p.speed * (activeSpeech ? 1.8 : 1.0);

        // Acoustic expansion push
        const targetDist = p.baseDistance + (activeSpeech ? audioLevel * 22 : 0);
        p.distance += (targetDist - p.distance) * 0.15;

        const px = centerX + Math.cos(p.angle) * p.distance;
        const py = centerY + Math.sin(p.angle) * p.distance;

        ctx.beginPath();
        ctx.arc(px, py, p.size, 0, Math.PI * 2);
        ctx.fillStyle = `hsla(${secondaryHue}, 90%, 80%, ${p.opacity * (activeSpeech ? 0.9 : 0.5)})`;
        ctx.fill();
      }

      if (!prefersReducedMotion) {
        animRef.current = requestAnimationFrame(render);
      }
    };

    render();

    return () => {
      if (animRef.current) {
        cancelAnimationFrame(animRef.current);
      }
    };
  }, [state, audioLevel, isSpeaking, currentWord, size]);

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
