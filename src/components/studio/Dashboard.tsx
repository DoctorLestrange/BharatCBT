import React, { useMemo, useState } from 'react';
import {
  AlertTriangle,
  Award,
  BookOpen,
  Download,
  Edit3,
  FilePlus2,
  Filter,
  FolderCheck,
  History,
  Layers,
  Play,
  RotateCcw,
  Search,
  Sparkles,
  Timer,
  Trash2,
  Zap,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import type { ExamDefinition } from '../../types/exam';
import { cn } from '../../utils/cn';
import {
  downloadTextFile,
  formatDateTime,
  formatDurationHuman,
  formatMarks,
  generateId,
} from '../../utils/formatters';
import { exportExamToJson } from '../../utils/jsonParser';
import {
  getEffectiveTotalDurationSeconds,
  getTotalExamQuestions,
  getTotalMaxMarks,
} from '../../utils/scoring';
import { ConfirmModal } from '../common/ConfirmModal';

export const Dashboard: React.FC = () => {
  const {
    exams,
    attempts,
    activeSessions,
    bookmarks,
    userJsonReport,
    navigate,
    removeExam,
    removeSession,
    upsertExam,
    restoreSamples,
    showToast,
  } = useApp();

  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [examToDelete, setExamToDelete] = useState<ExamDefinition | null>(null);

  const categories = useMemo(() => {
    const cats = Array.from(new Set(exams.map((e) => e.category))).sort();
    return ['All', ...cats];
  }, [exams]);

  const activeCategory = categories.includes(selectedCategory) ? selectedCategory : 'All';

  const filteredExams = useMemo(() => {
    const q = search.trim().toLowerCase();
    return exams.filter((e) => {
      const catMatch = activeCategory === 'All' || e.category === activeCategory;
      const textMatch =
        !q ||
        e.title.toLowerCase().includes(q) ||
        e.category.toLowerCase().includes(q) ||
        (e.description ?? '').toLowerCase().includes(q);
      return catMatch && textMatch;
    });
  }, [exams, search, activeCategory]);

  const stats = useMemo(() => {
    const avgAccuracy =
      attempts.length > 0
        ? Math.round(attempts.reduce((s, a) => s + a.accuracy, 0) / attempts.length)
        : 0;
    const avgPct =
      attempts.length > 0
        ? Math.round(attempts.reduce((s, a) => s + a.percentage, 0) / attempts.length)
        : 0;
    const totalPracticeSec = attempts.reduce((s, a) => s + a.timeTakenSeconds, 0);
    return { avgAccuracy, avgPct, totalPracticeSec };
  }, [attempts]);

  const latestAttemptByExam = useMemo(() => {
    const map = new Map<string, (typeof attempts)[number]>();
    for (const att of attempts) {
      if (!map.has(att.examId)) map.set(att.examId, att);
    }
    return map;
  }, [attempts]);

  const handleDuplicate = async (exam: ExamDefinition) => {
    const copy: ExamDefinition = {
      ...JSON.parse(JSON.stringify(exam)),
      id: generateId('exam'),
      title: `${exam.title} (Copy)`,
      isBuiltIn: false,
      sourceFile: undefined,
      sourceHash: undefined,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
    await upsertExam(copy);
    showToast('Exam duplicated.', 'success');
  };

  const handleExportExam = (exam: ExamDefinition) => {
    const json = exportExamToJson(exam);
    const baseName = exam.title.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '');
    downloadTextFile(`${baseName || 'exam'}.json`, json);
    showToast('Exam JSON downloaded.', 'success');
  };

  const handleConfirmDeleteExam = async () => {
    if (!examToDelete) return;
    await removeExam(examToDelete.id);
    showToast('Exam deleted.', 'info');
    setExamToDelete(null);
  };

  return (
    <div className="mx-auto max-w-7xl space-y-6 px-4 py-6 sm:px-6">
      {/* Hero Banner */}
      <section className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-orange-900 via-orange-700 to-orange-600 p-6 text-white shadow-lg sm:p-8">
        <div className="relative z-10 flex flex-col justify-between gap-6 lg:flex-row lg:items-center">
          <div className="max-w-2xl space-y-2">
            <div className="inline-flex items-center gap-1.5 rounded-full bg-white/15 px-3 py-1 text-xs font-semibold backdrop-blur-xs">
              <Sparkles className="h-3.5 w-3.5 text-amber-200" />
              Authentic SSC / IBPS / UPSC / RRB / NTA CBT Interface
            </div>
            <h1 className="text-2xl font-extrabold tracking-tight sm:text-3xl">
              Practice in Real Exam Conditions
            </h1>
            <p className="text-sm leading-relaxed text-orange-50 sm:text-base">
              Plug in your own MCQ questions via JSON, customize sectional timers and negative
              marking, and take tests inside an authentic Indian Government CBT terminal with
              offline IndexedDB persistence.
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              onClick={() => navigate('/builder')}
              className="flex items-center gap-2 rounded-xl bg-white px-5 py-3 text-sm font-bold text-orange-900 shadow-md transition hover:bg-orange-50"
            >
              <FilePlus2 className="h-4 w-4 text-orange-600" />
              Import JSON / Create Test
            </button>
            <button
              type="button"
              onClick={() => navigate('/format')}
              className="flex items-center gap-2 rounded-xl border border-white/35 bg-white/10 px-4 py-3 text-sm font-semibold text-white backdrop-blur-xs transition hover:bg-white/20"
            >
              <BookOpen className="h-4 w-4" />
              View JSON Format
            </button>
          </div>
        </div>
      </section>

      {/* Folder JSON Verification Failure Alert */}
      {userJsonReport && userJsonReport.failedCount > 0 && (
        <section className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-900 dark:border-red-900/70 dark:bg-red-950/40 dark:text-red-200">
          <div className="flex items-start gap-2.5">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-red-600 dark:text-red-400" />
            <div>
              <span className="font-bold">
                {userJsonReport.failedCount} file(s) in User_Exam_JSONs failed verification on
                startup:
              </span>{' '}
              <span className="font-mono text-xs">
                {userJsonReport.items
                  .filter((i) => !i.ok)
                  .map((i) => i.fileName)
                  .join(', ')}
              </span>
            </div>
          </div>
          <button
            type="button"
            onClick={() => navigate('/settings')}
            className="rounded-lg bg-red-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-red-700"
          >
            Inspect Verification Report
          </button>
        </section>
      )}

      {/* Active / Paused Sessions Resume Banner */}
      {activeSessions.length > 0 && (
        <section className="space-y-2.5">
          {activeSessions.map((sess) => {
            const answered = Object.values(sess.responses).filter(
              (r) => r.status === 'answered' || r.status === 'answered_marked'
            ).length;
            const total = Object.keys(sess.responses).length;
            return (
              <div
                key={sess.id}
                className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-orange-300 bg-orange-50 px-4 py-3.5 shadow-xs dark:border-orange-800/70 dark:bg-orange-950/40"
              >
                <div className="flex items-start gap-3">
                  <div className="rounded-lg bg-orange-200/80 p-2 text-orange-900 dark:bg-orange-900/70 dark:text-orange-200">
                    <Timer className="h-5 w-5" />
                  </div>
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-sm font-bold text-slate-900 dark:text-white">
                        In-Progress Exam: {sess.examSnapshot.title}
                      </span>
                      <span className="rounded bg-orange-200 px-2 py-0.5 text-[10px] font-bold uppercase text-orange-950 dark:bg-orange-900 dark:text-orange-200">
                        Saved {formatDateTime(sess.lastSavedAt)}
                      </span>
                    </div>
                    <p className="mt-0.5 text-xs text-slate-700 dark:text-neutral-300">
                      Answered {answered}/{total} questions • Remaining time:{' '}
                      <strong>{formatDurationHuman(sess.totalRemainingSeconds)}</strong>
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={async () => {
                      await removeSession(sess.id);
                      showToast('Saved session discarded.', 'info');
                    }}
                    className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-100 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-200 dark:hover:bg-neutral-700"
                  >
                    Discard
                  </button>
                  <button
                    type="button"
                    onClick={async () => {
                      if (!exams.some((e) => e.id === sess.examId)) {
                        await upsertExam({
                          ...sess.examSnapshot,
                          id: sess.examId,
                          isBuiltIn: false,
                          sourceFile: undefined,
                          sourceHash: undefined,
                          updatedAt: Date.now(),
                        });
                      }
                      navigate(`/exam/${encodeURIComponent(sess.examId)}`);
                    }}
                    className="flex items-center gap-1.5 rounded-lg bg-orange-600 px-4 py-1.5 text-xs font-bold text-white shadow hover:bg-orange-700"
                  >
                    <Play className="h-3.5 w-3.5" />
                    Resume Test
                  </button>
                </div>
              </div>
            );
          })}
        </section>
      )}

      {/* KPI Metrics */}
      <section className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-xs dark:border-neutral-800 dark:bg-neutral-900">
          <div className="flex items-center justify-between text-xs font-semibold text-slate-500 dark:text-neutral-400">
            <span>Mock Exams Ready</span>
            <Layers className="h-4 w-4 text-orange-600 dark:text-orange-400" />
          </div>
          <div className="mt-2 text-2xl font-extrabold text-slate-900 dark:text-white">
            {exams.length}
          </div>
          <div className="mt-0.5 text-[11px] text-slate-500 dark:text-neutral-400">
            Stored in IndexedDB
          </div>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-xs dark:border-neutral-800 dark:bg-neutral-900">
          <div className="flex items-center justify-between text-xs font-semibold text-slate-500 dark:text-neutral-400">
            <span>Tests Completed</span>
            <History className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
          </div>
          <div className="mt-2 text-2xl font-extrabold text-slate-900 dark:text-white">
            {attempts.length}
          </div>
          <div className="mt-0.5 text-[11px] text-slate-500 dark:text-neutral-400">
            {stats.totalPracticeSec > 0
              ? `${formatDurationHuman(stats.totalPracticeSec)} practiced`
              : 'Start your first test'}
          </div>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-xs dark:border-neutral-800 dark:bg-neutral-900">
          <div className="flex items-center justify-between text-xs font-semibold text-slate-500 dark:text-neutral-400">
            <span>Avg Accuracy</span>
            <Award className="h-4 w-4 text-amber-600 dark:text-amber-400" />
          </div>
          <div className="mt-2 text-2xl font-extrabold text-slate-900 dark:text-white">
            {attempts.length > 0 ? `${stats.avgAccuracy}%` : '—'}
          </div>
          <div className="mt-0.5 text-[11px] text-slate-500 dark:text-neutral-400">
            Avg Score: {attempts.length > 0 ? `${stats.avgPct}%` : '—'}
          </div>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-xs dark:border-neutral-800 dark:bg-neutral-900">
          <div className="flex items-center justify-between text-xs font-semibold text-slate-500 dark:text-neutral-400">
            <span>Saved Questions</span>
            <BookOpen className="h-4 w-4 text-purple-600 dark:text-purple-400" />
          </div>
          <div className="mt-2 text-2xl font-extrabold text-slate-900 dark:text-white">
            {bookmarks.length}
          </div>
          <button
            type="button"
            onClick={() => navigate('/bookmarks')}
            className="mt-0.5 text-[11px] font-semibold text-orange-600 hover:underline dark:text-orange-400"
          >
            Open Revision Bank →
          </button>
        </div>
      </section>

      {/* Search & Category Filter */}
      <section className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
        <div className="flex flex-wrap items-center gap-1.5">
          <Filter className="mr-1 h-4 w-4 text-slate-400" />
          {categories.map((cat) => (
            <button
              key={cat}
              type="button"
              onClick={() => setSelectedCategory(cat)}
              className={cn(
                'rounded-full px-3 py-1 text-xs font-semibold transition',
                activeCategory === cat
                  ? 'bg-orange-600 text-white shadow-xs'
                  : 'border border-slate-200 bg-white text-slate-600 hover:bg-slate-100 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-300 dark:hover:bg-neutral-800'
              )}
            >
              {cat}
            </button>
          ))}
        </div>

        <div className="relative w-full sm:w-72">
          <Search className="pointer-events-none absolute top-2.5 left-3 h-4 w-4 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search exams by title or tag..."
            className="w-full rounded-lg border border-slate-200 bg-white py-2 pr-3 pl-9 text-sm text-slate-800 outline-none focus:border-orange-500 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-100"
          />
        </div>
      </section>

      {/* Exams Grid */}
      {filteredExams.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center dark:border-neutral-700 dark:bg-neutral-900">
          <p className="text-base font-semibold text-slate-800 dark:text-white">
            No mock exams match your filter
          </p>
          <p className="mt-1 text-sm text-slate-500 dark:text-neutral-400">
            Import a custom JSON exam or restore the built-in Indian Government CBT demos.
          </p>
          <div className="mt-4 flex flex-wrap justify-center gap-3">
            <button
              type="button"
              onClick={() => navigate('/builder')}
              className="rounded-lg bg-orange-600 px-4 py-2 text-sm font-semibold text-white hover:bg-orange-700"
            >
              Import Exam JSON
            </button>
            <button
              type="button"
              onClick={async () => {
                await restoreSamples();
                setSearch('');
                setSelectedCategory('All');
                showToast('Sample mock tests restored.', 'success');
              }}
              className="flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-200 dark:hover:bg-neutral-700"
            >
              <RotateCcw className="h-4 w-4" />
              Restore Sample Mocks
            </button>
          </div>
        </div>
      ) : (
        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {filteredExams.map((exam) => {
            const totalQs = getTotalExamQuestions(exam);
            const maxMarks = getTotalMaxMarks(exam);
            const mins = Math.round(getEffectiveTotalDurationSeconds(exam) / 60);
            const lastAttempt = latestAttemptByExam.get(exam.id);
            const hasActive = activeSessions.some((s) => s.examId === exam.id);

            return (
              <article
                key={exam.id}
                className="flex flex-col justify-between rounded-2xl border border-slate-200 bg-white p-5 shadow-xs transition hover:border-orange-300 hover:shadow-md dark:border-neutral-800 dark:bg-neutral-900 dark:hover:border-orange-700"
              >
                <div>
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="rounded-md bg-orange-50 px-2.5 py-0.5 text-xs font-bold text-orange-800 dark:bg-orange-950/70 dark:text-orange-300">
                      {exam.category}
                    </span>
                    <div className="flex items-center gap-1.5">
                      {exam.sourceFile && (
                        <span
                          className="inline-flex items-center gap-1 rounded bg-sky-50 px-2 py-0.5 text-[10px] font-bold text-sky-700 dark:bg-sky-950/70 dark:text-sky-300"
                          title={`Auto-loaded & verified from User_Exam_JSONs/${exam.sourceFile}`}
                        >
                          <FolderCheck className="h-3 w-3" />
                          Folder
                        </span>
                      )}
                      {exam.languages.includes('hi') && (
                        <span className="rounded bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-700 dark:bg-emerald-950/70 dark:text-emerald-300">
                          EN / HI
                        </span>
                      )}
                      {exam.settings.sectionalTiming && (
                        <span className="rounded bg-purple-50 px-2 py-0.5 text-[10px] font-bold text-purple-700 dark:bg-purple-950/70 dark:text-purple-300">
                          Sectional Timer
                        </span>
                      )}
                      {exam.settings.showCalculator && (
                        <span className="rounded bg-amber-50 px-2 py-0.5 text-[10px] font-bold text-amber-800 dark:bg-amber-950/70 dark:text-amber-300">
                          Calc
                        </span>
                      )}
                    </div>
                  </div>

                  <h2 className="mt-3 text-lg font-bold leading-snug text-slate-900 dark:text-white">
                    {exam.title}
                  </h2>
                  {exam.subtitle && (
                    <p className="mt-0.5 text-xs font-medium text-orange-700 dark:text-orange-400">
                      {exam.subtitle}
                    </p>
                  )}
                  {exam.description && (
                    <p className="mt-2 line-clamp-2 text-xs leading-relaxed text-slate-600 dark:text-neutral-400">
                      {exam.description}
                    </p>
                  )}

                  {/* Specs */}
                  <div className="mt-4 grid grid-cols-3 gap-2 rounded-xl bg-slate-50 p-2.5 text-center text-xs dark:bg-neutral-800/70">
                    <div>
                      <div className="font-bold text-slate-900 dark:text-white">{totalQs}</div>
                      <div className="text-[11px] text-slate-500 dark:text-neutral-400">
                        Questions
                      </div>
                    </div>
                    <div className="border-x border-slate-200 dark:border-neutral-700">
                      <div className="font-bold text-slate-900 dark:text-white">
                        {mins > 0 ? `${mins}m` : 'Untimed'}
                      </div>
                      <div className="text-[11px] text-slate-500 dark:text-neutral-400">
                        Duration
                      </div>
                    </div>
                    <div>
                      <div className="font-bold text-slate-900 dark:text-white">
                        {formatMarks(maxMarks)}
                      </div>
                      <div className="text-[11px] text-slate-500 dark:text-neutral-400">
                        Max Marks
                      </div>
                    </div>
                  </div>

                  <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-xs text-slate-500 dark:text-neutral-400">
                    <span>
                      Marking:{' '}
                      <strong className="text-emerald-700 dark:text-emerald-400">
                        +{formatMarks(exam.settings.defaultMarks)}
                      </strong>{' '}
                      /{' '}
                      <strong className="text-rose-600 dark:text-rose-400">
                        {exam.settings.defaultNegativeMarks > 0
                          ? `-${formatMarks(exam.settings.defaultNegativeMarks)}`
                          : '0'}
                      </strong>
                    </span>
                    <span>
                      {exam.sections.length} {exam.sections.length === 1 ? 'Section' : 'Sections'}
                    </span>
                  </div>

                  {lastAttempt && (
                    <button
                      type="button"
                      onClick={() => navigate(`/results/${encodeURIComponent(lastAttempt.id)}`)}
                      className="mt-3 flex w-full items-center justify-between rounded-lg border border-emerald-200 bg-emerald-50/70 px-3 py-1.5 text-xs text-emerald-900 hover:bg-emerald-100/70 dark:border-emerald-800/70 dark:bg-emerald-950/40 dark:text-emerald-200 dark:hover:bg-emerald-900/50"
                    >
                      <span>
                        Last Score:{' '}
                        <strong>
                          {formatMarks(lastAttempt.score)}/{formatMarks(lastAttempt.maxScore)}
                        </strong>{' '}
                        ({lastAttempt.accuracy}% acc)
                      </span>
                      <span className="font-semibold underline">Review →</span>
                    </button>
                  )}
                </div>

                <div className="mt-4 space-y-2 border-t border-slate-100 pt-3.5 dark:border-neutral-800">
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => navigate(`/exam/${encodeURIComponent(exam.id)}`)}
                      className="flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-orange-600 px-4 py-2.5 text-sm font-bold text-white shadow-xs transition hover:bg-orange-700"
                    >
                      <Play className="h-4 w-4" />
                      {hasActive ? 'Resume CBT' : 'Start Exam'}
                    </button>
                    {hasActive && (
                      <button
                        type="button"
                        onClick={() => navigate(`/exam/${encodeURIComponent(exam.id)}?fresh=1`)}
                        className="flex items-center gap-1 rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-200 dark:hover:bg-neutral-700"
                        title="Start a brand new attempt"
                      >
                        <Zap className="h-3.5 w-3.5 text-orange-500" />
                        New
                      </button>
                    )}
                  </div>

                  <div className="flex items-center justify-between text-xs text-slate-500 dark:text-neutral-400">
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => navigate(`/builder/${encodeURIComponent(exam.id)}`)}
                        className="flex items-center gap-1 rounded px-2 py-1 hover:bg-slate-100 hover:text-slate-900 dark:hover:bg-neutral-800 dark:hover:text-white"
                      >
                        <Edit3 className="h-3.5 w-3.5" />
                        Edit / Config
                      </button>
                      <button
                        type="button"
                        onClick={() => handleExportExam(exam)}
                        className="flex items-center gap-1 rounded px-2 py-1 hover:bg-slate-100 hover:text-slate-900 dark:hover:bg-neutral-800 dark:hover:text-white"
                      >
                        <Download className="h-3.5 w-3.5" />
                        JSON
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDuplicate(exam)}
                        className="rounded px-2 py-1 hover:bg-slate-100 hover:text-slate-900 dark:hover:bg-neutral-800 dark:hover:text-white"
                      >
                        Clone
                      </button>
                    </div>
                    <button
                      type="button"
                      onClick={() => setExamToDelete(exam)}
                      className="rounded p-1.5 text-slate-400 hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-950/60 dark:hover:text-rose-400"
                      title={`Delete ${exam.title}`}
                      aria-label={`Delete ${exam.title}`}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              </article>
            );
          })}
        </section>
      )}

      <ConfirmModal
        open={Boolean(examToDelete)}
        onClose={() => setExamToDelete(null)}
        onConfirm={() => void handleConfirmDeleteExam()}
        title="Delete Mock Exam"
        message={
          <>
            Delete <strong>{examToDelete?.title}</strong> from your local exam library? Saved
            attempt history for this exam will remain in Attempts.
          </>
        }
        confirmLabel="Delete Exam"
        variant="danger"
      />
    </div>
  );
};
