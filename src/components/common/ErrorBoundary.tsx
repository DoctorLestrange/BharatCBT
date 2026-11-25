import React from 'react';
import { AlertTriangle, Home, RotateCcw } from 'lucide-react';

interface ErrorBoundaryState {
  hasError: boolean;
  errorMessage: string;
}

/**
 * Top-level error boundary so unexpected render failures never produce a blank white screen
 * in production deployments.
 */
export class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  ErrorBoundaryState
> {
  state: ErrorBoundaryState = { hasError: false, errorMessage: '' };

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return {
      hasError: true,
      errorMessage: error?.message || 'An unexpected application error occurred.',
    };
  }

  render() {
    if (!this.state.hasError) {
      return this.props.children;
    }

    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 p-6 text-slate-900 dark:bg-neutral-950 dark:text-neutral-100">
        <div className="w-full max-w-md rounded-2xl border border-rose-200 bg-white p-6 text-center shadow-lg dark:border-rose-900/60 dark:bg-neutral-900">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-rose-100 text-rose-600 dark:bg-rose-950 dark:text-rose-400">
            <AlertTriangle className="h-6 w-6" />
          </div>
          <h1 className="mt-4 text-lg font-extrabold text-slate-900 dark:text-white">
            Something went wrong
          </h1>
          <p className="mt-1.5 text-xs text-slate-600 dark:text-neutral-400">
            Your saved exams, attempts, and progress in browser storage remain safe.
          </p>
          {this.state.errorMessage && (
            <pre className="mt-3 max-h-24 overflow-auto rounded-lg bg-slate-100 p-2.5 text-left font-mono text-[11px] text-rose-700 dark:bg-neutral-800 dark:text-rose-300">
              {this.state.errorMessage}
            </pre>
          )}
          <div className="mt-5 flex justify-center gap-3">
            <button
              type="button"
              onClick={() => {
                window.location.hash = '#/';
                this.setState({ hasError: false, errorMessage: '' });
              }}
              className="flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-4 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-200 dark:hover:bg-neutral-700"
            >
              <Home className="h-4 w-4" />
              Go to Dashboard
            </button>
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="flex items-center gap-1.5 rounded-lg bg-orange-600 px-4 py-2 text-xs font-bold text-white shadow hover:bg-orange-700"
            >
              <RotateCcw className="h-4 w-4" />
              Reload App
            </button>
          </div>
        </div>
      </div>
    );
  }
}
