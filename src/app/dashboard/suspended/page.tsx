'use client';

import React from 'react';
import { ShieldAlert, Mail, Phone } from 'lucide-react';
import { Button } from '@/components/ui/button';
import Link from 'next/link';

export default function SuspendedPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-950 text-zinc-50 p-6">
      <div className="max-w-md text-center">
        <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-red-500/10">
          <ShieldAlert className="h-10 w-10 text-red-500" />
        </div>
        <h1 className="text-2xl font-bold text-zinc-100 mb-3">Account Suspended</h1>
        <p className="text-zinc-400 mb-6">
          Your gym account has been suspended. This usually happens due to a pending payment or a policy violation.
        </p>
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 mb-6 text-left">
          <h3 className="text-sm font-semibold text-zinc-200 mb-2">To reactivate your account:</h3>
          <ol className="text-sm text-zinc-400 space-y-2">
            <li className="flex gap-2"><span className="text-purple-400 font-bold">1.</span> Clear any pending payments</li>
            <li className="flex gap-2"><span className="text-purple-400 font-bold">2.</span> Contact our support team</li>
            <li className="flex gap-2"><span className="text-purple-400 font-bold">3.</span> Your data is safe and will be restored</li>
          </ol>
        </div>
        <div className="flex flex-col gap-3">
          <Link href="/#pricing">
            <Button className="w-full bg-purple-600 hover:bg-purple-500 text-white">
              View Plans & Pay
            </Button>
          </Link>
          <Button variant="outline" className="w-full border-zinc-700 text-zinc-300" asChild>
            <a href="mailto:support@gymerp.com">
              <Mail className="h-4 w-4 mr-2" /> Contact Support
            </a>
          </Button>
        </div>
      </div>
    </div>
  );
}
