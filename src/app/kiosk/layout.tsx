import React from 'react';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'GymERP Self-Service Kiosk',
  description: 'Reception touch kiosk for member check-in, account renewals, and guest trial passes.',
};

export default function KioskLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-[100dvh] w-full bg-[#09090b] text-zinc-100 font-sans select-none touch-manipulation overflow-x-hidden antialiased">
      {children}
    </div>
  );
}
