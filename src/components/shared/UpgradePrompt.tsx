'use client';

import React from 'react';
import { Lock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import Link from 'next/link';

interface UpgradePromptProps {
  feature: string;
  currentPlan?: string;
}

export function UpgradePrompt({ feature, currentPlan }: UpgradePromptProps) {
  return (
    <Card className="overflow-hidden border-zinc-800 bg-black/40 backdrop-blur-xl">
      <CardContent className="flex flex-col items-center justify-center p-8 text-center sm:p-12">
        <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-purple-500/10">
          <Lock className="h-8 w-8 text-purple-500" />
        </div>
        <h3 className="mb-2 text-2xl font-semibold tracking-tight text-zinc-100">
          Unlock {feature}
        </h3>
        <p className="mb-6 max-w-md text-zinc-400">
          This feature is not available on your {currentPlan ? `current ${currentPlan}` : 'current'} plan. 
          Upgrade to Pro to access this and many other premium features.
        </p>
        <Link href="/#pricing">
          <Button 
            className="bg-purple-600 hover:bg-purple-700 text-white shadow-lg shadow-purple-500/20"
            size="lg"
          >
            Upgrade to Pro
          </Button>
        </Link>
      </CardContent>
    </Card>
  );
}
