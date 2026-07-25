// src/components/ErrorBoundary.tsx
import React from 'react';
import type { ErrorInfo, ReactNode } from 'react';

interface ErrorBoundaryProps {
  children: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
}

export class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(): ErrorBoundaryState {
    return { hasError: true };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    console.error('[ErrorBoundary] Uncaught error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center px-4 text-center">
          <div className="bg-slate-800 p-6 rounded-[2rem] mb-6 shadow-inner border border-slate-700">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="w-12 h-12 text-orange-500"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
          </div>
          <h1 className="text-2xl font-black text-white mb-2 tracking-tight">
            Something went wrong
          </h1>
          <p className="text-sm text-slate-400 font-medium max-w-xs mx-auto mb-8 leading-relaxed">
            An unexpected error occurred. Please reload the app and try again.
          </p>
          <button
            onClick={() => window.location.reload()}
            className="bg-orange-500 hover:bg-orange-400 text-white font-bold py-3.5 px-8 rounded-2xl shadow-lg shadow-orange-500/20 transition-all active:scale-95"
          >
            Reload App
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
