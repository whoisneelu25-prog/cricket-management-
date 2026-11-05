import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertCircle, RotateCcw } from 'lucide-react';

interface Props {
  children: ReactNode;
  fallbackTitle?: string;
  onReset?: () => void;
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
    console.error('ErrorBoundary caught an unhandled error:', error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      return (
        <div className="bg-[#070a0e] border border-[#ff5470]/40 rounded-2xl p-6 sm:p-8 max-w-2xl mx-auto my-12 text-center text-[#e8edf2] shadow-2xl">
          <div className="w-14 h-14 rounded-full bg-[#ff5470]/10 border-2 border-[#ff5470]/50 flex items-center justify-center mx-auto mb-4 text-[#ff5470]">
            <AlertCircle className="w-7 h-7" />
          </div>
          <h3 className="text-xl font-bold font-display text-white">
            {this.props.fallbackTitle || 'Match Centre Encountered an Issue'}
          </h3>
          <p className="text-xs text-[#8b97a3] mt-2 max-w-md mx-auto">
            A temporary display error occurred during match rendering. Your match state and career save are safe.
          </p>
          {this.state.error && (
            <div className="mt-4 p-3 bg-[#10151c] border border-[#1e2733] rounded-lg text-left text-[11px] font-mono text-[#ff5470] overflow-x-auto max-h-32">
              {this.state.error.message}
            </div>
          )}
          <div className="mt-6 flex items-center justify-center gap-3">
            <button
              onClick={() => {
                const isHookMismatch = Boolean(
                  this.state.error?.message?.includes('Rendered more hooks') ||
                  this.state.error?.message?.includes('Rendered fewer hooks') ||
                  this.state.error?.message?.includes('Rules of Hooks')
                );
                if (isHookMismatch) {
                  window.location.reload();
                  return;
                }
                this.setState({ hasError: false, error: null });
                if (this.props.onReset) this.props.onReset();
              }}
              className="btn-gold text-xs px-6 py-2.5 rounded-xl cursor-pointer flex items-center gap-2 font-display font-bold shadow-lg"
            >
              <RotateCcw className="w-4 h-4" />
              <span>Retry / Resume Match</span>
            </button>
            <button
              onClick={() => {
                window.location.reload();
              }}
              className="bg-[#10151c] hover:bg-[#1a2330] text-[#ffe9a8] border border-[#e2b64a]/40 text-xs px-5 py-2.5 rounded-xl cursor-pointer font-display font-bold"
            >
              Reload Website
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

