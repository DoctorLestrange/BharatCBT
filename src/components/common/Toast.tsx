import React from 'react';
import { CheckCircle2, AlertCircle, Info, X } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { cn } from '../../utils/cn';

export const ToastContainer: React.FC = () => {
  const { toasts, dismissToast } = useApp();
  if (toasts.length === 0) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      className="pointer-events-none fixed right-4 bottom-4 z-[60] flex max-w-sm flex-col gap-2"
    >
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className={cn(
            'pointer-events-auto flex items-start gap-2.5 rounded-lg border px-3.5 py-2.5 text-sm shadow-lg transition-all',
            toast.type === 'success' &&
              'border-emerald-200 bg-emerald-50 text-emerald-900 dark:border-emerald-800 dark:bg-emerald-950/90 dark:text-emerald-200',
            toast.type === 'error' &&
              'border-rose-200 bg-rose-50 text-rose-900 dark:border-rose-800 dark:bg-rose-950/90 dark:text-rose-200',
            toast.type === 'info' &&
              'border-orange-200 bg-orange-50 text-orange-950 dark:border-orange-800 dark:bg-orange-950/90 dark:text-orange-200'
          )}
        >
          {toast.type === 'success' && (
            <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
          )}
          {toast.type === 'error' && (
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-rose-600 dark:text-rose-400" />
          )}
          {toast.type === 'info' && (
            <Info className="mt-0.5 h-4 w-4 shrink-0 text-orange-600 dark:text-orange-400" />
          )}
          <span className="flex-1 font-medium leading-snug">{toast.message}</span>
          <button
            type="button"
            onClick={() => dismissToast(toast.id)}
            aria-label="Dismiss notification"
            className="rounded p-0.5 opacity-60 hover:bg-black/5 hover:opacity-100 dark:hover:bg-white/10"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      ))}
    </div>
  );
};
