import React, { useEffect } from 'react';
import { X } from 'lucide-react';
import { cn } from '../../utils/cn';

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  maxWidthClass?: string;
  headerClassName?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
}

export const Modal: React.FC<ModalProps> = ({
  open,
  onClose,
  title,
  maxWidthClass = 'max-w-2xl',
  headerClassName,
  children,
  footer,
}) => {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-neutral-900/60 p-3 sm:p-4 backdrop-blur-[1px]"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label={title}
    >
      <div
        className={cn(
          'flex max-h-[90vh] w-full flex-col overflow-hidden rounded-lg border border-slate-300 bg-white text-slate-900 shadow-2xl dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-100',
          maxWidthClass
        )}
        onClick={(e) => e.stopPropagation()}
      >
        <div
          className={cn(
            'flex items-center justify-between border-b border-slate-200 bg-slate-50 px-4 py-3 dark:border-neutral-700 dark:bg-neutral-800',
            headerClassName
          )}
        >
          <h3 className="text-base font-semibold">{title}</h3>
          <button
            type="button"
            onClick={onClose}
            className="rounded p-1 opacity-80 transition hover:bg-black/10 hover:opacity-100 dark:hover:bg-white/10"
            aria-label="Close modal"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-4 sm:p-5">{children}</div>
        {footer && (
          <div className="flex flex-wrap items-center justify-end gap-2 border-t border-slate-200 bg-slate-50 px-4 py-3 dark:border-neutral-700 dark:bg-neutral-800/80">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
};
