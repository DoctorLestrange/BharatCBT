import React, { useMemo, useState } from 'react';
import { Eye, History, RotateCcw, Trash2 } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { cn } from '../../utils/cn';
import { formatDateTime, formatDurationHuman, formatMarks } from '../../utils/formatters';
import { ConfirmModal } from '../common/ConfirmModal';

export const HistoryView: React.FC = () => {
  const { exams, attempts, upsertExam, removeAttempt, clearAttempts, navigate, showToast } =
    useApp();
  const [examFilter, setExamFilter] = useState('all');
  const [clearConfirmOpen, setClearConfirmOpen] = useState(false);

  const uniqueExams = useMemo(() => {
    const map = new Map<string, string>();
    for (const a of attempts) {
      map.set(a.examId, a.examTitle);
    }
    return Array.from(map.entries());
  }, [attempts]);

  const effectiveExamFilter =
    examFilter === 'all' || uniqueExams.some(([id]) => id === examFilter) ? examFilter : 'all';

  const filtered = useMemo(
    () =>
      effectiveExamFilter === 'all'
        ? attempts
        : attempts.filter((a) => a.examId === effectiveExamFilter),
    [attempts, effectiveExamFilter]
  );

  const handleRetakeAttempt = async (att: (typeof attempts)[number]) => {
    if (!exams.some((e) => e.id === att.examId)) {
      await upsertExam({
        ...att.examSnapshot,
        id: att.examId,
        isBuiltIn: false,
        sourceFile: undefined,
        sourceHash: undefined,
        updatedAt: Date.now(),
      });
    }
    navigate(`/exam/${encodeURIComponent(att.examId)}?fresh=1`);
  };

  return (
    <div className="mx-auto max-w-6xl space-y-5 px-4 py-6 sm:px-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-extrabold text-slate-900 dark:text-white">
            <History className="h-6 w-6 text-orange-600 dark:text-orange-400" />
            Attempt History &amp; Performance Log
          </h1>
          <p className="mt-0.5 text-sm text-slate-500 dark:text-neutral-400">
            All completed mock exams are saved permanently in your browser&apos;s IndexedDB storage.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {uniqueExams.length > 1 && (
            <select
              value={effectiveExamFilter}
              onChange={(e) => setExamFilter(e.target.value)}
              className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-700 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-200"
            >
              <option value="all">All Exams ({attempts.length})</option>
              {uniqueExams.map(([id, title]) => (
                <option key={id} value={id}>
                  {title}
                </option>
              ))}
            </select>
          )}
          {attempts.length > 0 && (
            <button
              type="button"
              onClick={() => setClearConfirmOpen(true)}
              className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-semibold text-rose-700 hover:bg-rose-100 dark:border-rose-800 dark:bg-rose-950/60 dark:text-rose-300 dark:hover:bg-rose-900/60"
            >
              Clear All History
            </button>
          )}
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-12 text-center dark:border-neutral-700 dark:bg-neutral-900">
          <p className="text-base font-semibold text-slate-800 dark:text-white">
            No exam attempts recorded yet
          </p>
          <p className="mt-1 text-sm text-slate-500 dark:text-neutral-400">
            Take any mock test from the dashboard to see detailed scorecards and solution reviews
            here.
          </p>
          <button
            type="button"
            onClick={() => navigate('/')}
            className="mt-4 rounded-lg bg-orange-600 px-5 py-2 text-sm font-semibold text-white hover:bg-orange-700"
          >
            Browse Mock Tests
          </button>
        </div>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xs dark:border-neutral-800 dark:bg-neutral-900">
          <div className="overflow-x-auto">
            <table className="min-w-full border-collapse text-left text-xs sm:text-sm">
              <thead className="bg-slate-50 text-slate-700 dark:bg-neutral-800 dark:text-neutral-200">
                <tr>
                  <th className="border-b border-slate-200 px-4 py-3 font-bold dark:border-neutral-700">
                    Exam
                  </th>
                  <th className="border-b border-slate-200 px-4 py-3 font-bold dark:border-neutral-700">
                    Date
                  </th>
                  <th className="border-b border-slate-200 px-4 py-3 font-bold dark:border-neutral-700">
                    Score
                  </th>
                  <th className="border-b border-slate-200 px-4 py-3 font-bold dark:border-neutral-700">
                    Accuracy
                  </th>
                  <th className="border-b border-slate-200 px-4 py-3 font-bold dark:border-neutral-700">
                    Breakdown
                  </th>
                  <th className="border-b border-slate-200 px-4 py-3 font-bold dark:border-neutral-700">
                    Time
                  </th>
                  <th className="border-b border-slate-200 px-4 py-3 text-right font-bold dark:border-neutral-700">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-neutral-800">
                {filtered.map((att) => (
                  <tr key={att.id} className="hover:bg-slate-50/80 dark:hover:bg-neutral-800/60">
                    <td className="px-4 py-3">
                      <div className="font-bold text-slate-900 dark:text-white">
                        {att.examTitle}
                      </div>
                      <div className="text-[11px] text-slate-500 dark:text-neutral-400">
                        {att.category} • {att.candidateName}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-xs text-slate-600 dark:text-neutral-400">
                      {formatDateTime(att.submittedAt)}
                    </td>
                    <td className="px-4 py-3">
                      <div className="font-extrabold text-orange-700 dark:text-orange-400">
                        {formatMarks(att.score)} / {formatMarks(att.maxScore)}
                      </div>
                      <div className="text-[11px] text-slate-500 dark:text-neutral-400">
                        {att.percentage}%
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={cn(
                          'rounded-full px-2.5 py-0.5 text-xs font-bold',
                          att.accuracy >= 75
                            ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                            : att.accuracy >= 50
                              ? 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                              : 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300'
                        )}
                      >
                        {att.accuracy}%
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs">
                      <span className="font-semibold text-emerald-700 dark:text-emerald-400">
                        {att.correctCount}✓
                      </span>{' '}
                      {att.partialCount > 0 && (
                        <>
                          <span className="font-semibold text-amber-600 dark:text-amber-400">
                            {att.partialCount}~
                          </span>{' '}
                        </>
                      )}
                      <span className="font-semibold text-rose-600 dark:text-rose-400">
                        {att.incorrectCount}✗
                      </span>{' '}
                      <span className="text-slate-500 dark:text-neutral-400">
                        {att.unattemptedCount}−
                      </span>
                    </td>
                    <td className="px-4 py-3 font-mono text-xs text-slate-600 dark:text-neutral-400">
                      {formatDurationHuman(att.timeTakenSeconds)}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="inline-flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => navigate(`/results/${encodeURIComponent(att.id)}`)}
                          className="flex items-center gap-1 rounded-lg bg-orange-50 px-2.5 py-1.5 text-xs font-bold text-orange-800 hover:bg-orange-100 dark:bg-orange-950/60 dark:text-orange-300 dark:hover:bg-orange-900/60"
                        >
                          <Eye className="h-3.5 w-3.5" />
                          Review
                        </button>
                        <button
                          type="button"
                          onClick={() => void handleRetakeAttempt(att)}
                          className="rounded-lg border border-slate-200 p-1.5 text-slate-600 hover:bg-slate-100 dark:border-neutral-700 dark:text-neutral-300 dark:hover:bg-neutral-800"
                          title="Retake exam"
                          aria-label={`Retake ${att.examTitle}`}
                        >
                          <RotateCcw className="h-3.5 w-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={async () => {
                            await removeAttempt(att.id);
                            showToast('Attempt deleted.', 'info');
                          }}
                          className="rounded-lg p-1.5 text-slate-400 hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-950/60 dark:hover:text-rose-400"
                          title="Delete attempt"
                          aria-label={`Delete attempt for ${att.examTitle}`}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <ConfirmModal
        open={clearConfirmOpen}
        onClose={() => setClearConfirmOpen(false)}
        onConfirm={async () => {
          setClearConfirmOpen(false);
          await clearAttempts();
          showToast('Attempt history cleared.', 'info');
        }}
        title="Clear All Attempt History?"
        message="This permanently removes all saved scorecards and performance logs from local storage. This action cannot be undone."
        confirmLabel="Clear All History"
        variant="danger"
      />
    </div>
  );
};
