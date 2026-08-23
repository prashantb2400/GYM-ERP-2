'use client';

import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface Props {
  children: ReactNode;
  fallbackTitle?: string;
  fallbackMessage?: string;
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

  private handleReset = () => {
    this.setState({ hasError: false, error: null });
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="rounded-xl border border-red-500/20 bg-red-950/20 p-4 text-center space-y-2">
          <div className="flex items-center justify-center gap-2 text-red-400 font-semibold text-xs">
            <AlertTriangle className="h-4 w-4" />
            <span>{this.props.fallbackTitle || 'Component failed to load'}</span>
          </div>
          <p className="text-zinc-500 text-[11px]">
            {this.props.fallbackMessage || 'An unexpected error occurred while rendering this widget.'}
          </p>
          <Button
            variant="ghost"
            size="sm"
            onClick={this.handleReset}
            className="h-7 text-xs text-zinc-400 hover:text-white hover:bg-zinc-800 gap-1.5"
          >
            <RefreshCw className="h-3 w-3" />
            Try again
          </Button>
        </div>
      );
    }

    return this.props.children;
  }
}
