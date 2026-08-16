'use client';

import React from 'react';
import { AlertTriangle, X } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface ImpersonateBannerProps {
  gymName: string;
  onExit: () => void;
}

export function ImpersonateBanner({ gymName, onExit }: ImpersonateBannerProps) {
  return (
    <div className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between bg-amber-500/90 px-4 py-2 text-amber-950 backdrop-blur-md">
      <div className="flex items-center gap-2 font-medium">
        <AlertTriangle className="h-4 w-4" />
        <span>Super Admin Mode: Currently impersonating <strong>{gymName}</strong></span>
      </div>
      <Button 
        variant="ghost" 
        size="sm" 
        onClick={onExit}
        className="h-8 hover:bg-amber-600/20 hover:text-amber-950"
      >
        <span className="mr-2">Exit Impersonation</span>
        <X className="h-4 w-4" />
      </Button>
    </div>
  );
}
