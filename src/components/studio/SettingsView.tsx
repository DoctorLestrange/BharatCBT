import React, { useEffect, useRef, useState } from 'react';
import {
  AlertTriangle,
  Check,
  CheckCircle2,
  Database,
  Download,
  FolderCheck,
  Moon,
  Palette,
  RefreshCw,
  RotateCcw,
  Save,
  Sun,
  Upload,
  UserCheck,
  XCircle,
} from 'lucide-react';
import { ACCENT_PRESETS } from '../../constants/accentColors';
import { useApp } from '../../context/AppContext';
import {
  createWorkspaceBackup,
  getStorageUsageSummary,
  importWorkspaceBackup,
} from '../../storage/db';
import type { CandidateProfile, ExamLanguage } from '../../types/exam';
import { cn } from '../../utils/cn';
import { downloadTextFile } from '../../utils/formatters';

const AVATAR_COLORS = [
  '#2563EB',
  '#EA580C',
  '#0F766E',
  '#7C3AED',
  '#BE123C',
  '#222222',
];

export const SettingsView: React.FC = () => {
  const {
    profile,
    updateProfile,
    theme,
    setTheme,
    accentColor,
    setAccentColor,
    userJsonReport,
    resyncUserFolderExams,
    exams,
    attempts,
    bookmarks,
    restoreSamples,
    refreshAll,
    showToast,
  } = useApp();

  const [form, setForm] = useState<CandidateProfile>(profile);
  const [storageInfo, setStorageInfo] = useState<{
    usedBytes: number | null;
    quotaBytes: number | null;
    backend: 'IndexedDB' | 'localStorage';
  } | null>(null);
  const importInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setForm((prev) => ({
      ...prev,
      name: profile.name,
      rollNumber: profile.rollNumber,
      targetExam: profile.targetExam,
      avatarColor: profile.avatarColor,
      preferredLanguage: profile.preferredLanguage,
      preferredFontScale: profile.preferredFontScale,
    }));
  }, [
    profile.name,
    profile.rollNumber,
    profile.targetExam,
    profile.avatarColor,
    profile.preferredLanguage,
    profile.preferredFontScale,
  ]);

  useEffect(() => {
    void getStorageUsageSummary().then(setStorageInfo);
  }, [exams.length, attempts.length, bookmarks.length]);

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    await updateProfile({
      ...form,
      theme,
      accentColor,
      name: form.name.trim() || 'Candidate',
      rollNumber: form.rollNumber.trim() || 'CBT2026001',
    });
    showToast('Candidate profile saved!', 'success');
  };

  const handleExportBackup = async () => {
    const backup = await createWorkspaceBackup();
    const json = JSON.stringify(backup, null, 2);
    downloadTextFile(`bharatcbt_backup_${new Date().toISOString().slice(0, 10)}.json`, json);
    showToast('Full workspace backup downloaded.', 'success');
  };

  const handleImportBackup = (file: File) => {
    const MAX_BACKUP_BYTES = 25 * 1024 * 1024;
    if (file.size > MAX_BACKUP_BYTES) {
      showToast('Backup file exceeds the 25 MB limit.', 'error');
      return;
    }
    const reader = new FileReader();
    reader.onerror = () => {
      showToast('Unable to read the selected backup file.', 'error');
    };
    reader.onload = async () => {
      if (typeof reader.result !== 'string') return;
      try {
        const res = await importWorkspaceBackup(reader.result);
        await refreshAll();
        showToast(
          `Restored ${res.examsAdded} exam(s), ${res.attemptsAdded} attempt(s), ${res.bookmarksAdded} bookmark(s).`,
          'success'
        );
      } catch (err) {
        showToast(err instanceof Error ? err.message : 'Failed to import backup.', 'error');
      }
    };
    reader.readAsText(file);
  };

  const formatMB = (bytes: number | null) => {
    if (bytes === null) return 'N/A';
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  };

  return (
    <div className="mx-auto max-w-4xl space-y-6 px-4 py-6 sm:px-6">
      <div>
        <h1 className="text-2xl font-extrabold text-slate-900 dark:text-white">
          Candidate Profile &amp; Persistent Storage
        </h1>
        <p className="mt-0.5 text-sm text-slate-500 dark:text-neutral-400">
          Customize your CBT admit identity, appearance theme, and export or restore your local
          IndexedDB workspace.
        </p>
      </div>

      {/* Appearance / Dark Mode Selector */}
      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs dark:border-neutral-800 dark:bg-neutral-900">
        <h2 className="text-base font-bold text-slate-900 dark:text-white">
          Appearance &amp; Theme
        </h2>
        <p className="mt-0.5 text-xs text-slate-500 dark:text-neutral-400">
          Switch between Light and Dark mode across both the portal and the live CBT exam terminal.
        </p>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <button
            type="button"
            onClick={() => void setTheme('light')}
            className={cn(
              'flex items-center gap-3 rounded-xl border p-4 text-left transition',
              theme === 'light'
                ? 'border-orange-600 bg-orange-50 ring-1 ring-orange-600 dark:bg-orange-950/30'
                : 'border-slate-200 hover:bg-slate-50 dark:border-neutral-700 dark:hover:bg-neutral-800'
            )}
          >
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-100 text-orange-700">
              <Sun className="h-5 w-5" />
            </div>
            <div>
              <div className="text-sm font-bold text-slate-900 dark:text-white">Light Mode</div>
              <div className="text-xs text-slate-500 dark:text-neutral-400">
                Classic daylight CBT interface
              </div>
            </div>
          </button>

          <button
            type="button"
            onClick={() => void setTheme('dark')}
            className={cn(
              'flex items-center gap-3 rounded-xl border p-4 text-left transition',
              theme === 'dark'
                ? 'border-orange-500 bg-orange-950/40 ring-1 ring-orange-500'
                : 'border-slate-200 hover:bg-slate-50 dark:border-neutral-700 dark:hover:bg-neutral-800'
            )}
          >
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-neutral-800 text-amber-300">
              <Moon className="h-5 w-5" />
            </div>
            <div>
              <div className="text-sm font-bold text-slate-900 dark:text-white">Dark Mode</div>
              <div className="text-xs text-slate-500 dark:text-neutral-400">
                Low-glare dark workspace for night study
              </div>
            </div>
          </button>
        </div>

        {/* Accent Color Selector */}
        <div className="mt-6 border-t border-slate-100 pt-5 dark:border-neutral-800">
          <div className="flex items-center gap-2">
            <Palette className="h-4 w-4 text-orange-600 dark:text-orange-400" />
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">Accent Color</h3>
          </div>
          <p className="mt-0.5 text-xs text-slate-500 dark:text-neutral-400">
            Personalize the primary highlight color across buttons, navigation, banners, and the
            CBT exam runner.
          </p>
          <div className="mt-3 grid grid-cols-2 gap-2.5 sm:grid-cols-4">
            {ACCENT_PRESETS.map((preset) => {
              const selected = accentColor === preset.id;
              return (
                <button
                  key={preset.id}
                  type="button"
                  onClick={() => {
                    void setAccentColor(preset.id);
                    showToast(`Accent color changed to ${preset.name}.`, 'success');
                  }}
                  aria-pressed={selected}
                  className={cn(
                    'flex items-center gap-2.5 rounded-xl border px-3 py-2.5 text-left transition',
                    selected
                      ? 'border-orange-600 bg-orange-50 ring-1 ring-orange-600 dark:border-orange-500 dark:bg-orange-950/40 dark:ring-orange-500'
                      : 'border-slate-200 hover:bg-slate-50 dark:border-neutral-700 dark:hover:bg-neutral-800'
                  )}
                >
                  <span
                    className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-white shadow-xs"
                    style={{ backgroundColor: preset.swatchHex }}
                  >
                    {selected && <Check className="h-3.5 w-3.5 stroke-[3]" />}
                  </span>
                  <span className="min-w-0">
                    <span className="block truncate text-xs font-bold text-slate-900 dark:text-white">
                      {preset.name}
                    </span>
                    <span className="block truncate text-[10px] text-slate-500 dark:text-neutral-400">
                      {preset.description}
                    </span>
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      </section>

      {/* Profile Form */}
      <form
        onSubmit={handleSaveProfile}
        className="space-y-4 rounded-2xl border border-slate-200 bg-white p-6 shadow-xs dark:border-neutral-800 dark:bg-neutral-900"
      >
        <div className="flex items-center gap-2 border-b border-slate-100 pb-3 dark:border-neutral-800">
          <UserCheck className="h-5 w-5 text-orange-600 dark:text-orange-400" />
          <h2 className="text-base font-bold text-slate-900 dark:text-white">
            Candidate Admit Card Identity
          </h2>
        </div>

        <div className="flex flex-col gap-5 sm:flex-row sm:items-center">
          <div
            className="flex h-20 w-20 shrink-0 items-center justify-center rounded-xl text-2xl font-extrabold text-white shadow"
            style={{ backgroundColor: form.avatarColor }}
          >
            {form.name.trim().charAt(0).toUpperCase() || 'C'}
          </div>
          <div className="space-y-2">
            <div className="text-xs font-semibold text-slate-600 dark:text-neutral-400">
              Avatar Badge Color
            </div>
            <div className="flex flex-wrap gap-2">
              {AVATAR_COLORS.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setForm({ ...form, avatarColor: c })}
                  aria-label={`Select avatar color ${c}`}
                  aria-pressed={form.avatarColor === c}
                  className={cn(
                    'h-7 w-7 rounded-full border-2 transition',
                    form.avatarColor === c
                      ? 'scale-110 border-slate-900 ring-2 ring-orange-500/40 dark:border-white'
                      : 'border-slate-300/70 hover:scale-105 dark:border-neutral-600'
                  )}
                  style={{ backgroundColor: c }}
                />
              ))}
            </div>
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="mb-1 block text-xs font-semibold text-slate-700 dark:text-neutral-300">
              Candidate Full Name
            </label>
            <input
              type="text"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-orange-500 dark:border-neutral-700 dark:bg-neutral-800 dark:text-white"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-semibold text-slate-700 dark:text-neutral-300">
              Roll Number / Registration ID
            </label>
            <input
              type="text"
              value={form.rollNumber}
              onChange={(e) => setForm({ ...form, rollNumber: e.target.value })}
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 font-mono text-sm outline-none focus:border-orange-500 dark:border-neutral-700 dark:bg-neutral-800 dark:text-white"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-semibold text-slate-700 dark:text-neutral-300">
              Target Examination
            </label>
            <input
              type="text"
              value={form.targetExam}
              onChange={(e) => setForm({ ...form, targetExam: e.target.value })}
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-orange-500 dark:border-neutral-700 dark:bg-neutral-800 dark:text-white"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-700 dark:text-neutral-300">
                Default Language
              </label>
              <select
                value={form.preferredLanguage}
                onChange={(e) =>
                  setForm({ ...form, preferredLanguage: e.target.value as ExamLanguage })
                }
                className="w-full rounded-lg border border-slate-300 bg-white px-2.5 py-2 text-sm dark:border-neutral-700 dark:bg-neutral-800 dark:text-white"
              >
                <option value="en">English</option>
                <option value="hi">Hindi (हिन्दी)</option>
              </select>
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-700 dark:text-neutral-300">
                Question Font Size
              </label>
              <select
                value={form.preferredFontScale}
                onChange={(e) =>
                  setForm({
                    ...form,
                    preferredFontScale: e.target.value as 'sm' | 'md' | 'lg',
                  })
                }
                className="w-full rounded-lg border border-slate-300 bg-white px-2.5 py-2 text-sm dark:border-neutral-700 dark:bg-neutral-800 dark:text-white"
              >
                <option value="sm">Compact</option>
                <option value="md">Standard</option>
                <option value="lg">Large</option>
              </select>
            </div>
          </div>
        </div>

        <div className="flex justify-end pt-2">
          <button
            type="submit"
            className="flex items-center gap-1.5 rounded-lg bg-orange-600 px-5 py-2 text-sm font-bold text-white shadow hover:bg-orange-700"
          >
            <Save className="h-4 w-4" />
            Save Profile
          </button>
        </div>
      </form>

      {/* Storage & Backup */}
      <section className="space-y-4 rounded-2xl border border-slate-200 bg-white p-6 shadow-xs dark:border-neutral-800 dark:bg-neutral-900">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3 dark:border-neutral-800">
          <div className="flex items-center gap-2">
            <Database className="h-5 w-5 text-emerald-700 dark:text-emerald-400" />
            <h2 className="text-base font-bold text-slate-900 dark:text-white">
              Persistent Storage &amp; Portable Backup
            </h2>
          </div>
          {storageInfo && (
            <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
              Engine: {storageInfo.backend}
            </span>
          )}
        </div>

        <div className="grid grid-cols-2 gap-3 rounded-xl bg-slate-50 p-4 text-xs sm:grid-cols-4 dark:bg-neutral-800/70">
          <div>
            <div className="text-slate-500 dark:text-neutral-400">Saved Exams</div>
            <div className="mt-0.5 text-lg font-extrabold text-slate-900 dark:text-white">
              {exams.length}
            </div>
          </div>
          <div>
            <div className="text-slate-500 dark:text-neutral-400">Attempt Records</div>
            <div className="mt-0.5 text-lg font-extrabold text-slate-900 dark:text-white">
              {attempts.length}
            </div>
          </div>
          <div>
            <div className="text-slate-500 dark:text-neutral-400">Bookmarked Qs</div>
            <div className="mt-0.5 text-lg font-extrabold text-slate-900 dark:text-white">
              {bookmarks.length}
            </div>
          </div>
          <div>
            <div className="text-slate-500 dark:text-neutral-400">Browser Usage</div>
            <div className="mt-0.5 text-lg font-extrabold text-slate-900 dark:text-white">
              {storageInfo ? formatMB(storageInfo.usedBytes) : '—'}
            </div>
          </div>
        </div>

        <div className="flex flex-wrap gap-3">
          <button
            type="button"
            onClick={handleExportBackup}
            className="flex items-center gap-2 rounded-lg bg-neutral-900 px-4 py-2 text-xs font-bold text-white hover:bg-neutral-800 dark:bg-orange-600 dark:hover:bg-orange-700"
          >
            <Download className="h-4 w-4" />
            Export Full Workspace Backup (.json)
          </button>

          <input
            ref={importInputRef}
            type="file"
            accept=".json,application/json"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) handleImportBackup(file);
              e.target.value = '';
            }}
          />
          <button
            type="button"
            onClick={() => importInputRef.current?.click()}
            className="flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-200 dark:hover:bg-neutral-700"
          >
            <Upload className="h-4 w-4" />
            Import Backup File
          </button>

          <button
            type="button"
            onClick={async () => {
              await restoreSamples();
              showToast('Built-in Indian Govt mock exams restored.', 'success');
            }}
            className="flex items-center gap-2 rounded-lg border border-orange-200 bg-orange-50 px-4 py-2 text-xs font-bold text-orange-800 hover:bg-orange-100 dark:border-orange-900 dark:bg-orange-950/60 dark:text-orange-300 dark:hover:bg-orange-900/60"
          >
            <RotateCcw className="h-4 w-4" />
            Restore Built-in Sample Exams
          </button>
        </div>
      </section>

      {/* Auto-Loaded User_Exam_JSONs Startup Verification */}
      <section className="space-y-4 rounded-2xl border border-slate-200 bg-white p-6 shadow-xs dark:border-neutral-800 dark:bg-neutral-900">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-3 dark:border-neutral-800">
          <div className="flex items-center gap-2">
            <FolderCheck className="h-5 w-5 text-orange-600 dark:text-orange-400" />
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-white">
                User_Exam_JSONs Folder Auto-Loader
              </h2>
              <p className="text-xs text-slate-500 dark:text-neutral-400">
                Every <code className="font-mono">.json</code> file in{' '}
                <code className="font-mono">User_Exam_JSONs/</code> is verified and loaded
                automatically on startup.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {userJsonReport && (
              <span
                className={cn(
                  'rounded-full px-3 py-1 text-xs font-bold',
                  userJsonReport.failedCount > 0
                    ? 'bg-red-50 text-red-700 dark:bg-red-950/70 dark:text-red-300'
                    : userJsonReport.warningCount > 0
                      ? 'bg-amber-50 text-amber-800 dark:bg-amber-950/70 dark:text-amber-300'
                      : 'bg-emerald-50 text-emerald-800 dark:bg-emerald-950/70 dark:text-emerald-300'
                )}
              >
                {userJsonReport.verifiedCount} / {userJsonReport.totalFiles} Verified
              </span>
            )}
            <button
              type="button"
              onClick={async () => {
                const res = await resyncUserFolderExams();
                if (res.failedCount > 0) {
                  showToast(
                    `Verified ${res.verifiedCount}/${res.totalFiles}; ${res.failedCount} failed.`,
                    'error'
                  );
                } else {
                  showToast(
                    `All ${res.verifiedCount} folder JSON(s) verified & synced (${res.addedCount} added, ${res.updatedCount} updated).`,
                    'success'
                  );
                }
              }}
              className="flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-bold text-slate-700 hover:bg-slate-50 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-200 dark:hover:bg-neutral-700"
            >
              <RefreshCw className="h-3.5 w-3.5" />
              Verify &amp; Re-sync
            </button>
          </div>
        </div>

        {!userJsonReport || userJsonReport.totalFiles === 0 ? (
          <p className="text-xs text-slate-500 dark:text-neutral-400">
            No <code className="font-mono">.json</code> files found in{' '}
            <code className="font-mono">User_Exam_JSONs/</code>.
          </p>
        ) : (
          <div className="max-h-72 space-y-2 overflow-y-auto pr-1">
            {userJsonReport.items.map((item) => (
              <div
                key={item.fileName}
                className={cn(
                  'rounded-xl border p-3 text-xs',
                  item.ok
                    ? 'border-slate-200 bg-slate-50/70 dark:border-neutral-800 dark:bg-neutral-800/40'
                    : 'border-red-200 bg-red-50/70 dark:border-red-900/60 dark:bg-red-950/30'
                )}
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2 font-mono font-bold text-slate-800 dark:text-neutral-100">
                    {item.ok ? (
                      item.warnings.length > 0 ? (
                        <AlertTriangle className="h-4 w-4 shrink-0 text-amber-600 dark:text-amber-400" />
                      ) : (
                        <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
                      )
                    ) : (
                      <XCircle className="h-4 w-4 shrink-0 text-red-600 dark:text-red-400" />
                    )}
                    <span>{item.fileName}</span>
                  </div>
                  <div className="flex items-center gap-2 text-[11px]">
                    {item.ok ? (
                      <>
                        <span className="text-slate-600 dark:text-neutral-400">
                          {item.sectionCount} sec · {item.questionCount} Qs
                        </span>
                        <span
                          className={cn(
                            'rounded px-1.5 py-0.5 font-semibold',
                            item.strictJsonOk
                              ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                              : 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                          )}
                        >
                          {item.strictJsonOk ? 'Strict JSON OK' : 'Auto-repaired'}
                        </span>
                      </>
                    ) : (
                      <span className="rounded bg-red-100 px-1.5 py-0.5 font-semibold text-red-800 dark:bg-red-950 dark:text-red-300">
                        Verification Failed
                      </span>
                    )}
                  </div>
                </div>
                {item.title && (
                  <div className="mt-1 truncate text-slate-600 dark:text-neutral-300">
                    {item.title}
                  </div>
                )}
                {item.errors.length > 0 && (
                  <ul className="mt-1.5 list-disc space-y-0.5 pl-5 text-red-700 dark:text-red-300">
                    {item.errors.map((err, i) => (
                      <li key={i}>{err}</li>
                    ))}
                  </ul>
                )}
                {item.warnings.length > 0 && (
                  <ul className="mt-1.5 list-disc space-y-0.5 pl-5 text-amber-700 dark:text-amber-300">
                    {item.warnings.map((warn, i) => (
                      <li key={i}>{warn}</li>
                    ))}
                  </ul>
                )}
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
};
