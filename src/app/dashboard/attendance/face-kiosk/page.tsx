'use client';

import React from 'react';
import Link from 'next/link';
import { ArrowLeft, ScanFace } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { BiometricScannerCockpit } from '@/components/attendance/BiometricScannerCockpit';

export default function FaceKioskPage() {
  return (
    <div className="fixed inset-0 bg-zinc-950 z-50 flex flex-col overflow-hidden text-zinc-100 select-none">
      {/* Top Bar */}
      <div className="flex items-center justify-between px-4 h-12 bg-zinc-900/90 border-b border-zinc-800 backdrop-blur-md shrink-0">
        <div className="flex items-center gap-3">
          <Link href="/dashboard/attendance">
            <Button variant="ghost" size="sm" className="text-zinc-400 hover:text-zinc-100 gap-1.5 h-8 px-2.5 text-xs">
              <ArrowLeft className="h-3.5 w-3.5" />
              <span>Back to Attendance Station</span>
            </Button>
          </Link>
          <div className="flex items-center gap-2 border-l border-zinc-800 pl-3">
            <div className="h-6 w-6 rounded-md bg-cyan-950/80 border border-cyan-800/60 flex items-center justify-center">
              <ScanFace className="h-3.5 w-3.5 text-cyan-400" />
            </div>
            <span className="font-bold text-xs tracking-tight text-zinc-100">AI Face and Optical Kiosk</span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-950/60 border border-emerald-800/60 text-emerald-400 text-[10px] font-mono">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
            <span>Autonomous Mode</span>
          </div>
        </div>
      </div>

      {/* Full Kiosk Biometrics */}
      <div className="flex-1 flex flex-col items-center justify-center p-4 overflow-y-auto">
        <div className="w-full max-w-4xl mx-auto">
          <BiometricScannerCockpit variant="kiosk" />
        </div>
      </div>
    </div>
  );
}
