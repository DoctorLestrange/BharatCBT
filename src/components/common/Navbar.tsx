import React from 'react';
import {
  Bookmark,
  Code2,
  FilePlus2,
  GraduationCap,
  History,
  LayoutDashboard,
  Moon,
  Settings,
  Sun,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { cn } from '../../utils/cn';

const NAV_ITEMS = [
  { path: '/', label: 'Dashboard', icon: LayoutDashboard },
  { path: '/builder', label: 'Import / Create', icon: FilePlus2 },
  { path: '/format', label: 'JSON Format', icon: Code2 },
  { path: '/history', label: 'Attempts', icon: History },
  { path: '/bookmarks', label: 'Saved Qs', icon: Bookmark },
  { path: '/settings', label: 'Profile & Backup', icon: Settings },
];

export const Navbar: React.FC = () => {
  const { route, navigate, profile, bookmarks, attempts, theme, toggleTheme } = useApp();

  const pathname = route.split('?')[0] || '/';

  const isRouteActive = (itemPath: string) => {
    if (itemPath === '/') return pathname === '/' || pathname === '';
    return pathname === itemPath || pathname.startsWith(`${itemPath}/`);
  };

  return (
    <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/95 backdrop-blur dark:border-neutral-800 dark:bg-neutral-900/95">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-3 px-4 py-2.5 sm:px-6">
        <button
          type="button"
          onClick={() => navigate('/')}
          className="flex shrink-0 items-center gap-2.5 whitespace-nowrap text-left"
        >
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-orange-700 to-orange-500 text-white shadow-sm">
            <GraduationCap className="h-5 w-5" />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="text-base font-bold tracking-tight text-slate-900 dark:text-white">
                Bharat<span className="text-orange-600 dark:text-orange-400">CBT</span>
              </span>
              <span className="hidden rounded bg-orange-100 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-orange-800 sm:inline-block lg:hidden 2xl:inline-block dark:bg-orange-950 dark:text-orange-300">
                Gov Mock Portal
              </span>
            </div>
            <p className="hidden text-[11px] text-slate-500 sm:block lg:hidden 2xl:block dark:text-neutral-400">
              Authentic Computer Based Test Simulator
            </p>
          </div>
        </button>

        <nav className="hidden min-w-0 flex-1 items-center justify-center gap-0.5 overflow-x-auto px-1 lg:flex xl:gap-1">
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            const active = isRouteActive(item.path);
            const badgeCount =
              item.path === '/bookmarks'
                ? bookmarks.length
                : item.path === '/history'
                  ? attempts.length
                  : 0;
            return (
              <button
                key={item.path}
                type="button"
                onClick={() => navigate(item.path)}
                className={cn(
                  'flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-lg px-2 py-1.5 text-xs font-medium transition xl:px-2.5 xl:text-[13px]',
                  active
                    ? 'bg-orange-50 text-orange-800 dark:bg-orange-950/60 dark:text-orange-300'
                    : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:text-neutral-300 dark:hover:bg-neutral-800 dark:hover:text-white'
                )}
              >
                <Icon className="h-3.5 w-3.5 shrink-0 xl:h-4 xl:w-4" />
                <span>{item.label}</span>
                {badgeCount > 0 && (
                  <span
                    className={cn(
                      'rounded-full px-1.5 py-0.2 text-[11px] font-semibold',
                      active
                        ? 'bg-orange-200 text-orange-950 dark:bg-orange-900 dark:text-orange-200'
                        : 'bg-slate-200 text-slate-700 dark:bg-neutral-700 dark:text-neutral-200'
                    )}
                  >
                    {badgeCount}
                  </span>
                )}
              </button>
            );
          })}
        </nav>

        <div className="flex shrink-0 items-center gap-2">
          <button
            type="button"
            onClick={() => void toggleTheme()}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-slate-200 bg-slate-50 text-slate-700 transition hover:border-orange-300 hover:bg-orange-50 hover:text-orange-700 dark:border-neutral-700 dark:bg-neutral-800 dark:text-amber-300 dark:hover:border-orange-700 dark:hover:bg-neutral-700"
            title={theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
            aria-label={theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
          >
            {theme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          </button>

          <button
            type="button"
            onClick={() => navigate('/settings')}
            className="flex shrink-0 items-center gap-2 whitespace-nowrap rounded-full border border-slate-200 bg-slate-50 p-1 text-left transition hover:border-orange-300 hover:bg-orange-50/40 sm:pl-1.5 sm:pr-3 lg:p-1 xl:pl-1.5 xl:pr-3 dark:border-neutral-700 dark:bg-neutral-800 dark:hover:border-orange-700 dark:hover:bg-neutral-700/70"
            title={`${profile.name} (${profile.rollNumber})`}
          >
            <div
              className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold text-white"
              style={{ backgroundColor: profile.avatarColor }}
            >
              {profile.name.trim().charAt(0).toUpperCase() || 'C'}
            </div>
            <div className="hidden text-xs sm:block lg:hidden xl:block">
              <div className="font-semibold leading-tight text-slate-800 dark:text-neutral-100">
                {profile.name}
              </div>
              <div className="font-mono text-[10px] text-slate-500 dark:text-neutral-400">
                {profile.rollNumber}
              </div>
            </div>
          </button>
        </div>
      </div>

      {/* Mobile / Tablet horizontal nav strip */}
      <div className="flex gap-1 overflow-x-auto border-t border-slate-100 px-3 py-1.5 lg:hidden dark:border-neutral-800">
        {NAV_ITEMS.map((item) => {
          const Icon = item.icon;
          const active = isRouteActive(item.path);
          return (
            <button
              key={item.path}
              type="button"
              onClick={() => navigate(item.path)}
              className={cn(
                'flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-md px-2.5 py-1.5 text-xs font-medium transition',
                active
                  ? 'bg-orange-600 text-white'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200 dark:bg-neutral-800 dark:text-neutral-300 dark:hover:bg-neutral-700'
              )}
            >
              <Icon className="h-3.5 w-3.5" />
              <span>{item.label}</span>
            </button>
          );
        })}
      </div>
    </header>
  );
};
