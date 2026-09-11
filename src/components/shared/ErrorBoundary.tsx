'use client';

import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error caught by ErrorBoundary:', error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="min-h-[400px] flex flex-col items-center justify-center p-8 text-center bg-zinc-950 text-zinc-100 rounded-2xl border border-zinc-800">
          <div className="h-12 w-12 rounded-full bg-red-500/10 text-red-400 flex items-center justify-center mb-4">
            <AlertTriangle className="h-6 w-6" />
          </div>
          <h2 className="text-lg font-bold text-zinc-100 mb-2">Something went wrong</h2>
          <p className="text-sm text-zinc-400 max-w-md mb-6">
            An unexpected error occurred while loading this view. You can reload the page or return to the dashboard.
          </p>
          <div className="flex gap-3">
            <Button
              onClick={() => {
                this.setState({ hasError: false, error: null });
                window.location.reload();
              }}
              className="bg-purple-600 hover:bg-purple-700 text-white gap-2"
            >
              <RefreshCw className="h-4 w-4" />
              Reload Page
            </Button>
            <Button
              variant="outline"
              onClick={() => {
                this.setState({ hasError: false, error: null });
                window.location.href = '/dashboard';
              }}
              className="border-zinc-800 hover:bg-zinc-800 text-zinc-300"
            >
              Return to Dashboard
            </Button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
