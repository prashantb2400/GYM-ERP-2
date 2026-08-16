'use client';

import React from 'react';
import Link from 'next/link';
import { Camera, Fingerprint, ChevronRight, Activity } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

interface HardwareStats {
  cameras: { total: number; online: number };
  biometrics: { total: number; online: number };
}

// In a real app this would use a store or SWR/React Query
const mockStats: HardwareStats = {
  cameras: { total: 4, online: 3 },
  biometrics: { total: 2, online: 2 }
};

export function HardwarePanel() {
  const stats = mockStats;

  return (
    <Card className="w-full flex flex-col h-full">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-md flex items-center gap-2">
            <Activity className="w-4 h-4 text-primary" />
            Hardware Status
          </CardTitle>
          <div className="flex items-center space-x-1">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
            </span>
            <span className="text-[10px] text-muted-foreground uppercase font-medium tracking-wider">Live</span>
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="flex-1 space-y-4 pt-2">
        <div className="grid grid-cols-2 gap-3">
          {/* Cameras Widget */}
          <div className="bg-muted/30 rounded-lg p-3 border border-border/50 flex flex-col">
            <div className="flex items-center gap-2 text-muted-foreground mb-2">
              <Camera className="w-4 h-4" />
              <span className="text-xs font-medium">CCTV Cameras</span>
            </div>
            <div className="flex items-end justify-between mt-auto">
              <div>
                <span className="text-2xl font-bold">{stats.cameras.online}</span>
                <span className="text-sm text-muted-foreground">/{stats.cameras.total}</span>
              </div>
              <div className={`text-[10px] font-medium px-1.5 py-0.5 rounded ${
                stats.cameras.online === stats.cameras.total 
                  ? 'bg-green-100 text-green-700' 
                  : 'bg-yellow-100 text-yellow-700'
              }`}>
                {stats.cameras.online === stats.cameras.total ? 'All Online' : 'Issues'}
              </div>
            </div>
          </div>

          {/* Biometrics Widget */}
          <div className="bg-muted/30 rounded-lg p-3 border border-border/50 flex flex-col">
            <div className="flex items-center gap-2 text-muted-foreground mb-2">
              <Fingerprint className="w-4 h-4" />
              <span className="text-xs font-medium">Biometrics</span>
            </div>
            <div className="flex items-end justify-between mt-auto">
              <div>
                <span className="text-2xl font-bold">{stats.biometrics.online}</span>
                <span className="text-sm text-muted-foreground">/{stats.biometrics.total}</span>
              </div>
              <div className={`text-[10px] font-medium px-1.5 py-0.5 rounded ${
                stats.biometrics.online === stats.biometrics.total 
                  ? 'bg-green-100 text-green-700' 
                  : 'bg-yellow-100 text-yellow-700'
              }`}>
                {stats.biometrics.online === stats.biometrics.total ? 'All Online' : 'Issues'}
              </div>
            </div>
          </div>
        </div>
      </CardContent>
      
      <CardFooter className="pt-2 pb-4 px-4 border-t">
        <Link href="/admin/hardware" className="w-full">
          <Button variant="ghost" className="w-full h-8 text-xs justify-between group">
            Manage Devices
            <ChevronRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
          </Button>
        </Link>
      </CardFooter>
    </Card>
  );
}
