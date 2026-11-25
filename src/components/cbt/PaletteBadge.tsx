import React from 'react';
import type { QuestionStatus } from '../../types/exam';
import { cn } from '../../utils/cn';

interface PaletteBadgeProps {
  status: QuestionStatus;
  label: string | number;
  size?: 'sm' | 'md';
  active?: boolean;
  onClick?: () => void;
  title?: string;
}

export const PaletteBadge: React.FC<PaletteBadgeProps> = ({
  status,
  label,
  size = 'md',
  active = false,
  onClick,
  title,
}) => {
  const dims = size === 'sm' ? 'h-6 w-6 text-[11px]' : 'h-9 w-9 text-xs';

  const content = (() => {
    switch (status) {
      case 'answered':
        return (
          <svg viewBox="0 0 36 36" className="h-full w-full drop-shadow-[0_1px_1px_rgba(0,0,0,0.18)]">
            <polygon
              points="3,10 10,3 26,3 33,10 33,33 3,33"
              fill="#2E9E36"
              stroke="#1E7424"
              strokeWidth="1.5"
            />
          </svg>
        );
      case 'not_answered':
        return (
          <svg viewBox="0 0 36 36" className="h-full w-full drop-shadow-[0_1px_1px_rgba(0,0,0,0.18)]">
            <polygon
              points="3,3 33,3 33,26 26,33 10,33 3,26"
              fill="#DC3545"
              stroke="#A71D2A"
              strokeWidth="1.5"
            />
          </svg>
        );
      case 'marked':
        return (
          <svg viewBox="0 0 36 36" className="h-full w-full drop-shadow-[0_1px_1px_rgba(0,0,0,0.18)]">
            <circle cx="18" cy="18" r="15.5" fill="#7030A0" stroke="#4D1E73" strokeWidth="1.5" />
          </svg>
        );
      case 'answered_marked':
        return (
          <svg viewBox="0 0 36 36" className="h-full w-full drop-shadow-[0_1px_1px_rgba(0,0,0,0.18)]">
            <circle cx="18" cy="18" r="15.5" fill="#7030A0" stroke="#4D1E73" strokeWidth="1.5" />
            <circle cx="28" cy="28" r="6.2" fill="#22C55E" stroke="#FFFFFF" strokeWidth="1.6" />
            <path
              d="M25.4 28.1L27.2 29.8L30.6 26.3"
              fill="none"
              stroke="#FFFFFF"
              strokeWidth="1.6"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        );
      case 'not_visited':
      default:
        return (
          <svg viewBox="0 0 36 36" className="h-full w-full">
            <rect
              x="2"
              y="2"
              width="32"
              height="32"
              rx="4"
              strokeWidth="1.5"
              className="fill-[#E9ECEF] stroke-[#ADB5BD] dark:fill-neutral-700 dark:stroke-neutral-500"
            />
          </svg>
        );
    }
  })();

  const textColor =
    status === 'not_visited' ? 'text-slate-800 dark:text-neutral-100' : 'text-white';

  const baseClass = cn(
    'relative inline-flex select-none items-center justify-center font-bold transition-transform',
    dims,
    onClick && 'cursor-pointer hover:scale-105 active:scale-95',
    active &&
      'rounded ring-2 ring-orange-600 ring-offset-2 ring-offset-orange-50 dark:ring-orange-400 dark:ring-offset-neutral-900'
  );

  if (onClick) {
    return (
      <button type="button" onClick={onClick} className={baseClass} title={title}>
        {content}
        <span className={cn('pointer-events-none absolute inset-0 flex items-center justify-center', textColor)}>
          {label}
        </span>
      </button>
    );
  }

  return (
    <span className={baseClass} title={title}>
      {content}
      <span className={cn('pointer-events-none absolute inset-0 flex items-center justify-center', textColor)}>
        {label}
      </span>
    </span>
  );
};
