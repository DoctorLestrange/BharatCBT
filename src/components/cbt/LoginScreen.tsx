import React, { useState } from 'react';
import { ArrowLeft, Monitor, Moon, ShieldCheck, Sun, User } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import type { CandidateProfile, ExamDefinition } from '../../types/exam';
import {
  getEffectiveTotalDurationSeconds,
  getTotalExamQuestions,
  getTotalMaxMarks,
} from '../../utils/scoring';

interface LoginScreenProps {
  exam: ExamDefinition;
  profile: CandidateProfile;
  onSignIn: (candidateName: string, rollNo: string) => void;
  onExit: () => void;
}

export const LoginScreen: React.FC<LoginScreenProps> = ({
  exam,
  profile,
  onSignIn,
  onExit,
}) => {
  const { theme, toggleTheme } = useApp();
  const [name, setName] = useState(profile.name);
  const [rollNo, setRollNo] = useState(profile.rollNumber);

  const totalQs = getTotalExamQuestions(exam);
  const maxMarks = getTotalMaxMarks(exam);
  const totalMins = Math.round(getEffectiveTotalDurationSeconds(exam) / 60);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSignIn(name.trim() || 'Candidate', rollNo.trim() || 'CBT001');
  };

  return (
    <div className="flex min-h-screen flex-col bg-[#F1EFEA] dark:bg-neutral-950">
      {/* Classic CBT Top Header */}
      <header className="flex items-center justify-between gap-3 bg-[#1E1E1E] px-4 py-2.5 text-white shadow dark:bg-neutral-900 dark:border-b dark:border-neutral-800">
        <div className="flex min-w-0 flex-1 items-center gap-3">
          <button
            type="button"
            onClick={onExit}
            className="flex shrink-0 items-center gap-1 whitespace-nowrap rounded bg-white/10 px-2.5 py-1 text-xs font-medium hover:bg-white/20"
          >
            <ArrowLeft className="h-3.5 w-3.5 shrink-0" />
            Portal
          </button>
          <span className="truncate text-sm font-semibold tracking-wide">
            COMPUTER BASED EXAMINATION TERMINAL
          </span>
        </div>
        <div className="flex shrink-0 items-center gap-3">
          <span className="hidden whitespace-nowrap text-xs text-slate-300 sm:inline">
            Node ID: <strong className="font-mono text-orange-300">TC-DEL-042</strong>
          </span>
          <button
            type="button"
            onClick={() => void toggleTheme()}
            className="shrink-0 rounded bg-white/10 p-1.5 text-amber-300 hover:bg-white/20"
            title={theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
            aria-label={theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
          >
            {theme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          </button>
        </div>
      </header>

      {/* System Name & Candidate Photo Banner */}
      <div className="border-b border-slate-300 bg-[#262626] px-4 py-4 text-white sm:px-8 dark:border-neutral-800 dark:bg-neutral-900/90">
        <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-6">
            <div>
              <div className="text-xs uppercase tracking-wider text-slate-300">System Name</div>
              <div className="mt-0.5 text-3xl font-extrabold tracking-tight text-orange-400">
                C001
              </div>
              <div className="mt-0.5 flex items-center gap-1.5 text-xs text-slate-200">
                <Monitor className="h-3.5 w-3.5 text-orange-300" />
                <span>Kindly contact the invigilator if your photo does not match</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="text-right">
              <div className="text-xs text-slate-300">Candidate Name</div>
              <div className="text-lg font-bold text-orange-400">{name || 'Candidate'}</div>
              <div className="text-xs text-slate-200">
                Subject: <span className="font-semibold text-white">{exam.title}</span>
              </div>
            </div>
            <div
              className="flex h-20 w-18 shrink-0 items-center justify-center rounded border-2 border-white/70 text-2xl font-bold text-white shadow"
              style={{ backgroundColor: profile.avatarColor }}
            >
              {(name || 'C').trim().charAt(0).toUpperCase()}
            </div>
          </div>
        </div>
      </div>

      {/* Center Login Card */}
      <main className="flex flex-1 items-center justify-center p-4">
        <form
          onSubmit={handleSubmit}
          className="w-full max-w-md overflow-hidden rounded border border-slate-300 bg-white shadow-lg dark:border-neutral-700 dark:bg-neutral-900"
        >
          <div className="border-b border-slate-200 bg-slate-100 px-5 py-3 dark:border-neutral-700 dark:bg-neutral-800">
            <h1 className="flex items-center gap-2 text-base font-bold text-slate-800 dark:text-white">
              <ShieldCheck className="h-5 w-5 text-orange-600 dark:text-orange-400" />
              Candidate Login
            </h1>
          </div>

          <div className="space-y-4 p-5">
            <div className="rounded border border-orange-200 bg-orange-50/70 px-3 py-2 text-xs text-slate-700 dark:border-orange-900/60 dark:bg-orange-950/40 dark:text-neutral-200">
              <div className="font-semibold text-orange-900 dark:text-orange-300">{exam.title}</div>
              <div className="mt-0.5 text-slate-600 dark:text-neutral-400">
                {totalQs} Questions • {maxMarks} Max Marks •{' '}
                {totalMins > 0 ? `${totalMins} Mins` : 'Untimed Practice'}
              </div>
            </div>

            <div>
              <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-600 dark:text-neutral-400">
                Roll Number / Username
              </label>
              <div className="flex items-center overflow-hidden rounded border border-slate-300 bg-slate-50 focus-within:border-orange-600 focus-within:bg-white dark:border-neutral-700 dark:bg-neutral-800 dark:focus-within:border-orange-500 dark:focus-within:bg-neutral-800">
                <span className="border-r border-slate-300 bg-slate-200/70 px-3 py-2 text-slate-600 dark:border-neutral-700 dark:bg-neutral-700 dark:text-neutral-300">
                  <User className="h-4 w-4" />
                </span>
                <input
                  type="text"
                  value={rollNo}
                  onChange={(e) => setRollNo(e.target.value)}
                  className="w-full bg-transparent px-3 py-2 font-mono text-sm text-slate-900 outline-none dark:text-neutral-100"
                  required
                />
              </div>
            </div>

            <div>
              <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-600 dark:text-neutral-400">
                Candidate Name
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full rounded border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-orange-600 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-100 dark:focus:border-orange-500"
                required
              />
            </div>

            <button
              type="submit"
              className="w-full rounded bg-orange-600 py-2.5 text-sm font-bold text-white shadow transition hover:bg-orange-700 active:translate-y-px dark:bg-orange-600 dark:hover:bg-orange-500"
            >
              Sign In
            </button>
          </div>
        </form>
      </main>
    </div>
  );
};
