import React, { useMemo, useState } from 'react';
import {
  ArrowLeft,
  Award,
  Bookmark,
  CheckCircle2,
  Clock,
  Download,
  MinusCircle,
  RotateCcw,
  ShieldAlert,
  Target,
  TrendingUp,
  XCircle,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import type { ExamLanguage, QuestionAttemptDetail } from '../../types/exam';
import { cn } from '../../utils/cn';
import {
  downloadTextFile,
  formatDateTime,
  formatDurationHuman,
  formatMarks,
  getLocalizedText,
  optionIndexToLetter,
} from '../../utils/formatters';
import { createRetryWrongExam } from '../../utils/scoring';
import { MathText, SafeDiagram } from '../common/MathText';

interface AttemptResultsProps {
  attemptId: string;
}

export const AttemptResults: React.FC<AttemptResultsProps> = ({ attemptId }) => {
  const { exams, profile, attempts, bookmarks, toggleBookmark, upsertExam, navigate, showToast } =
    useApp();
  const attempt = useMemo(
    () => attempts.find((a) => a.id === attemptId),
    [attempts, attemptId]
  );

  const [outcomeFilter, setOutcomeFilter] = useState<
    'all' | 'correct' | 'incorrect' | 'unattempted' | 'marked'
  >('all');
  const [sectionFilter, setSectionFilter] = useState<string>('all');
  const [lang, setLang] = useState<ExamLanguage>(() =>
    attempt && attempt.examSnapshot.languages.includes(profile.preferredLanguage)
      ? profile.preferredLanguage
      : 'en'
  );
  const effectiveLang: ExamLanguage =
    attempt && attempt.examSnapshot.languages.includes(lang) ? lang : 'en';

  const questionMap = useMemo(() => {
    const map = new Map<
      string,
      NonNullable<typeof attempt>['examSnapshot']['sections'][number]['questions'][number]
    >();
    if (!attempt) return map;
    for (const sec of attempt.examSnapshot.sections) {
      for (const q of sec.questions) {
        map.set(q.id, q);
      }
    }
    return map;
  }, [attempt]);

  const marksSummary = useMemo(() => {
    let gained = 0;
    let incorrectDeducted = 0;
    let unattemptedMarks = 0;
    if (!attempt) return { gained, incorrectDeducted, unattemptedMarks };
    for (const qr of attempt.questionResults) {
      if (qr.outcome === 'unattempted') {
        unattemptedMarks += qr.marksAwarded;
      } else if (qr.marksAwarded > 0) {
        gained += qr.marksAwarded;
      } else if (qr.marksAwarded < 0) {
        incorrectDeducted += Math.abs(qr.marksAwarded);
      }
    }
    return { gained, incorrectDeducted, unattemptedMarks };
  }, [attempt]);

  const filteredQuestions = useMemo(() => {
    if (!attempt) return [];
    return attempt.questionResults.filter((qr) => {
      if (sectionFilter !== 'all' && qr.sectionId !== sectionFilter) return false;
      if (outcomeFilter === 'correct') return qr.outcome === 'correct' || qr.outcome === 'partial';
      if (outcomeFilter === 'incorrect') return qr.outcome === 'incorrect';
      if (outcomeFilter === 'unattempted') return qr.outcome === 'unattempted';
      if (outcomeFilter === 'marked') {
        return qr.status === 'marked' || qr.status === 'answered_marked';
      }
      return true;
    });
  }, [attempt, outcomeFilter, sectionFilter]);

  if (!attempt) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-16 text-center">
        <h1 className="text-xl font-bold text-slate-900 dark:text-white">
          Attempt Result Not Found
        </h1>
        <p className="mt-2 text-sm text-slate-500 dark:text-neutral-400">
          This exam attempt may have been deleted from local storage.
        </p>
        <button
          type="button"
          onClick={() => navigate('/')}
          className="mt-5 rounded-lg bg-orange-600 px-5 py-2 text-sm font-semibold text-white hover:bg-orange-700"
        >
          Back to Dashboard
        </button>
      </div>
    );
  }

  const handleRetryMistakes = async () => {
    const retryExam = createRetryWrongExam(attempt);
    if (!retryExam) {
      showToast('You scored 100% — no incorrect or skipped questions to retry!', 'success');
      return;
    }
    await upsertExam(retryExam);
    showToast('Generated focused mistake-retry mock test!', 'info');
    navigate(`/exam/${encodeURIComponent(retryExam.id)}?fresh=1`);
  };

  const handleRetakeFullTest = async () => {
    if (!exams.some((e) => e.id === attempt.examId)) {
      await upsertExam({
        ...attempt.examSnapshot,
        id: attempt.examId,
        isBuiltIn: false,
        sourceFile: undefined,
        sourceHash: undefined,
        updatedAt: Date.now(),
      });
    }
    navigate(`/exam/${encodeURIComponent(attempt.examId)}?fresh=1`);
  };

  const handleExportReport = () => {
    const json = JSON.stringify(attempt, null, 2);
    const baseName = attempt.examTitle
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '_')
      .replace(/^_+|_+$/g, '');
    downloadTextFile(`result_${baseName || 'exam'}.json`, json);
  };

  const cutoffPassed =
    attempt.cutoffPercent !== undefined ? attempt.percentage >= attempt.cutoffPercent : null;

  const isBookmarked = (qId: string) =>
    bookmarks.some((b) => b.id === `${attempt.examId}_${qId}`);

  const handleToggleBookmark = async (qr: QuestionAttemptDetail) => {
    const q = questionMap.get(qr.questionId);
    if (!q) return;
    const added = await toggleBookmark({
      id: `${attempt.examId}_${q.id}`,
      examId: attempt.examId,
      examTitle: attempt.examTitle,
      sectionName: qr.sectionName,
      question: q,
      createdAt: Date.now(),
    });
    showToast(added ? 'Saved to Revision Bank.' : 'Removed from Revision Bank.', 'info');
  };

  return (
    <div className="mx-auto max-w-7xl space-y-6 px-4 py-6 sm:px-6">
      {/* Top Action Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => navigate('/')}
            className="flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-100 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-200 dark:hover:bg-neutral-800"
          >
            <ArrowLeft className="h-4 w-4" />
            Dashboard
          </button>
          <div>
            <h1 className="text-xl font-extrabold text-slate-900 dark:text-white">
              {attempt.examTitle}
            </h1>
            <p className="text-xs text-slate-500 dark:text-neutral-400">
              Candidate: <strong>{attempt.candidateName}</strong> ({attempt.candidateRollNo}) •
              Submitted {formatDateTime(attempt.submittedAt)}
              {attempt.autoSubmitted && ' • Auto-submitted on Timeout'}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={handleExportReport}
            className="flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-200 dark:hover:bg-neutral-800"
          >
            <Download className="h-4 w-4" />
            Export Report
          </button>
          {(attempt.incorrectCount > 0 || attempt.unattemptedCount > 0) && (
            <button
              type="button"
              onClick={handleRetryMistakes}
              className="flex items-center gap-1.5 rounded-lg border border-amber-300 bg-amber-50 px-3.5 py-2 text-xs font-bold text-amber-900 hover:bg-amber-100 dark:border-amber-800 dark:bg-amber-950/60 dark:text-amber-300 dark:hover:bg-amber-900/60"
            >
              <Target className="h-4 w-4" />
              Retry Wrong &amp; Skipped ({attempt.incorrectCount + attempt.unattemptedCount})
            </button>
          )}
          <button
            type="button"
            onClick={() => void handleRetakeFullTest()}
            className="flex items-center gap-1.5 rounded-lg bg-orange-600 px-4 py-2 text-xs font-bold text-white shadow hover:bg-orange-700"
          >
            <RotateCcw className="h-4 w-4" />
            Retake Full Test
          </button>
        </div>
      </div>

      {/* Scorecard Hero */}
      <section className="grid gap-4 lg:grid-cols-12">
        <div className="flex flex-col justify-between rounded-2xl bg-gradient-to-br from-neutral-900 via-orange-900 to-orange-600 p-6 text-white shadow-lg lg:col-span-5">
          <div className="flex items-start justify-between gap-3">
            <div>
              <span className="text-xs font-semibold uppercase tracking-wider text-orange-200">
                Total Score Obtained
              </span>
              <div className="mt-1 flex items-baseline gap-2">
                <span className="text-4xl font-extrabold tracking-tight">
                  {formatMarks(attempt.score)}
                </span>
                <span className="text-lg font-medium text-orange-200">
                  / {formatMarks(attempt.maxScore)}
                </span>
              </div>
            </div>
            {cutoffPassed !== null && (
              <span
                className={cn(
                  'rounded-full border px-3 py-1 text-xs font-bold',
                  cutoffPassed
                    ? 'border-emerald-400/40 bg-emerald-400/20 text-emerald-200'
                    : 'border-rose-400/40 bg-rose-400/20 text-rose-200'
                )}
              >
                {cutoffPassed
                  ? `Cleared Cutoff (${attempt.cutoffPercent}%)`
                  : `Below Cutoff (${attempt.cutoffPercent}%)`}
              </span>
            )}
          </div>

          <div className="mt-6 grid grid-cols-3 gap-3 border-t border-white/15 pt-4 text-center">
            <div>
              <div className="text-xl font-extrabold">{attempt.percentage}%</div>
              <div className="text-[11px] text-orange-200">Percentage</div>
            </div>
            <div className="border-x border-white/15">
              <div className="text-xl font-extrabold text-emerald-300">{attempt.accuracy}%</div>
              <div className="text-[11px] text-orange-200">Accuracy</div>
            </div>
            <div>
              <div className="text-xl font-extrabold">{attempt.attemptRate}%</div>
              <div className="text-[11px] text-orange-200">Attempted</div>
            </div>
          </div>
        </div>

        {/* Breakdown Cards */}
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:col-span-7">
          <div className="rounded-xl border border-emerald-200 bg-emerald-50/70 p-4 dark:border-emerald-800/70 dark:bg-emerald-950/40">
            <div className="flex items-center justify-between text-xs font-semibold text-emerald-800 dark:text-emerald-300">
              <span>Correct</span>
              <CheckCircle2 className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
            </div>
            <div className="mt-2 flex items-baseline gap-1.5">
              <span className="text-2xl font-extrabold text-emerald-950 dark:text-white">
                {attempt.correctCount}
              </span>
              {attempt.partialCount > 0 && (
                <span className="text-xs font-bold text-amber-700 dark:text-amber-400">
                  +{attempt.partialCount} partial
                </span>
              )}
            </div>
            <div className="mt-0.5 text-xs font-medium text-emerald-700 dark:text-emerald-400">
              +{formatMarks(marksSummary.gained)} marks earned
            </div>
          </div>

          <div className="rounded-xl border border-rose-200 bg-rose-50/70 p-4 dark:border-rose-800/70 dark:bg-rose-950/40">
            <div className="flex items-center justify-between text-xs font-semibold text-rose-800 dark:text-rose-300">
              <span>Incorrect</span>
              <XCircle className="h-4 w-4 text-rose-600 dark:text-rose-400" />
            </div>
            <div className="mt-2 text-2xl font-extrabold text-rose-950 dark:text-white">
              {attempt.incorrectCount}
            </div>
            <div className="mt-0.5 text-xs font-medium text-rose-700 dark:text-rose-400">
              -{formatMarks(marksSummary.incorrectDeducted)} negative penalty
            </div>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-4 dark:border-neutral-800 dark:bg-neutral-900">
            <div className="flex items-center justify-between text-xs font-semibold text-slate-600 dark:text-neutral-400">
              <span>Unattempted</span>
              <MinusCircle className="h-4 w-4 text-slate-400" />
            </div>
            <div className="mt-2 text-2xl font-extrabold text-slate-900 dark:text-white">
              {attempt.unattemptedCount}
            </div>
            <div className="mt-0.5 text-xs text-slate-500 dark:text-neutral-400">
              {marksSummary.unattemptedMarks > 0
                ? `+${formatMarks(marksSummary.unattemptedMarks)}`
                : formatMarks(marksSummary.unattemptedMarks)}{' '}
              marks applied
            </div>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-4 dark:border-neutral-800 dark:bg-neutral-900">
            <div className="flex items-center justify-between text-xs font-semibold text-slate-600 dark:text-neutral-400">
              <span>Time Taken</span>
              <Clock className="h-4 w-4 text-orange-600 dark:text-orange-400" />
            </div>
            <div className="mt-2 text-xl font-extrabold text-slate-900 dark:text-white">
              {formatDurationHuman(attempt.timeTakenSeconds)}
            </div>
            <div className="mt-0.5 text-xs text-slate-500 dark:text-neutral-400">
              {attempt.totalDurationSeconds > 0
                ? `of ${formatDurationHuman(attempt.totalDurationSeconds)}`
                : 'Untimed session'}
            </div>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-4 dark:border-neutral-800 dark:bg-neutral-900">
            <div className="flex items-center justify-between text-xs font-semibold text-slate-600 dark:text-neutral-400">
              <span>Marked Review</span>
              <Award className="h-4 w-4 text-purple-600 dark:text-purple-400" />
            </div>
            <div className="mt-2 text-xl font-extrabold text-slate-900 dark:text-white">
              {attempt.markedForReviewCount}
            </div>
            <div className="mt-0.5 text-xs text-slate-500 dark:text-neutral-400">
              {attempt.answeredMarkedEvaluatedCount} ans &amp; marked evaluated
            </div>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-4 dark:border-neutral-800 dark:bg-neutral-900">
            <div className="flex items-center justify-between text-xs font-semibold text-slate-600 dark:text-neutral-400">
              <span>Focus Integrity</span>
              <ShieldAlert className="h-4 w-4 text-amber-600 dark:text-amber-400" />
            </div>
            <div className="mt-2 text-xl font-extrabold text-slate-900 dark:text-white">
              {attempt.tabSwitchCount}
            </div>
            <div className="mt-0.5 text-xs text-slate-500 dark:text-neutral-400">
              Tab switches logged
            </div>
          </div>
        </div>
      </section>

      {/* Section-wise Performance Table */}
      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs dark:border-neutral-800 dark:bg-neutral-900">
        <h2 className="mb-3 flex items-center gap-2 text-base font-bold text-slate-900 dark:text-white">
          <TrendingUp className="h-4 w-4 text-orange-600 dark:text-orange-400" />
          Section-wise Performance Breakdown
        </h2>
        <div className="overflow-x-auto">
          <table className="min-w-full border-collapse text-left text-xs sm:text-sm">
            <thead className="bg-slate-50 text-slate-700 dark:bg-neutral-800 dark:text-neutral-200">
              <tr>
                <th className="border-b border-slate-200 px-3 py-2.5 font-bold dark:border-neutral-700">
                  Section
                </th>
                <th className="border-b border-slate-200 px-3 py-2.5 font-bold dark:border-neutral-700">
                  Score
                </th>
                <th className="border-b border-slate-200 px-3 py-2.5 font-bold dark:border-neutral-700">
                  Attempted
                </th>
                <th className="border-b border-slate-200 px-3 py-2.5 font-bold text-emerald-700 dark:border-neutral-700 dark:text-emerald-400">
                  Correct
                </th>
                <th className="border-b border-slate-200 px-3 py-2.5 font-bold text-rose-700 dark:border-neutral-700 dark:text-rose-400">
                  Wrong
                </th>
                <th className="border-b border-slate-200 px-3 py-2.5 font-bold dark:border-neutral-700">
                  Accuracy
                </th>
                <th className="border-b border-slate-200 px-3 py-2.5 font-bold dark:border-neutral-700">
                  Time
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-neutral-800">
              {attempt.sectionResults.map((sr) => (
                <tr key={sr.sectionId} className="hover:bg-slate-50/70 dark:hover:bg-neutral-800/50">
                  <td className="px-3 py-2.5 font-semibold text-slate-900 dark:text-white">
                    {sr.sectionName}
                  </td>
                  <td className="px-3 py-2.5 font-bold text-orange-700 dark:text-orange-400">
                    {formatMarks(sr.score)} / {formatMarks(sr.maxScore)}
                  </td>
                  <td className="px-3 py-2.5">
                    {sr.attemptedCount} / {sr.totalQuestions}
                  </td>
                  <td className="px-3 py-2.5 font-semibold text-emerald-700 dark:text-emerald-400">
                    {sr.correctCount}
                    {sr.partialCount > 0 && (
                      <span className="ml-1 text-xs font-medium text-amber-600 dark:text-amber-400">
                        (+{sr.partialCount}~)
                      </span>
                    )}
                  </td>
                  <td className="px-3 py-2.5 font-semibold text-rose-600 dark:text-rose-400">
                    {sr.incorrectCount}
                  </td>
                  <td className="px-3 py-2.5">
                    <div className="flex items-center gap-2">
                      <div className="h-2 w-20 overflow-hidden rounded-full bg-slate-200 dark:bg-neutral-700">
                        <div
                          className="h-full rounded-full bg-orange-600"
                          style={{ width: `${Math.min(100, sr.accuracy)}%` }}
                        />
                      </div>
                      <span className="font-semibold">{sr.accuracy}%</span>
                    </div>
                  </td>
                  <td className="px-3 py-2.5 font-mono text-xs text-slate-600 dark:text-neutral-400">
                    {formatDurationHuman(sr.timeSpentSeconds)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* Topic-wise Accuracy Insights */}
      {attempt.topicResults.length > 1 && (
        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs dark:border-neutral-800 dark:bg-neutral-900">
          <h2 className="mb-3 text-base font-bold text-slate-900 dark:text-white">
            Topic-wise Insights
          </h2>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {attempt.topicResults.map((tr) => (
              <div
                key={tr.topic}
                className="rounded-xl border border-slate-200 bg-slate-50/60 p-3.5 text-xs dark:border-neutral-700 dark:bg-neutral-800/60"
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="font-bold text-slate-900 dark:text-white">{tr.topic}</span>
                  <span
                    className={cn(
                      'rounded-full px-2 py-0.5 font-bold',
                      tr.accuracy >= 75
                        ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                        : tr.accuracy >= 45
                          ? 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                          : 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300'
                    )}
                  >
                    {tr.accuracy}% acc
                  </span>
                </div>
                <div className="mt-2 flex items-center justify-between text-slate-600 dark:text-neutral-300">
                  <span>
                    {tr.correctCount}✓ • {tr.incorrectCount}✗ •{' '}
                    {tr.partialCount ? `${tr.partialCount}~ • ` : ''}
                    {tr.unattemptedCount} skipped
                  </span>
                  <span className="font-mono">{formatDurationHuman(tr.timeSpentSeconds)}</span>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Question-by-Question Solution Review */}
      <section className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-xs dark:border-neutral-800 dark:bg-neutral-900">
          <div className="flex flex-wrap items-center gap-1.5">
            {(
              [
                { id: 'all', label: `All (${attempt.questionResults.length})` },
                { id: 'correct', label: `Correct (${attempt.correctCount + attempt.partialCount})` },
                { id: 'incorrect', label: `Incorrect (${attempt.incorrectCount})` },
                { id: 'unattempted', label: `Skipped (${attempt.unattemptedCount})` },
                { id: 'marked', label: `Marked (${attempt.markedForReviewCount})` },
              ] as const
            ).map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setOutcomeFilter(tab.id)}
                className={cn(
                  'rounded-lg px-3 py-1.5 text-xs font-semibold transition',
                  outcomeFilter === tab.id
                    ? 'bg-orange-600 text-white'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200 dark:bg-neutral-800 dark:text-neutral-300 dark:hover:bg-neutral-700'
                )}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <select
              value={sectionFilter}
              onChange={(e) => setSectionFilter(e.target.value)}
              className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-200"
            >
              <option value="all">All Sections</option>
              {attempt.sectionResults.map((sr) => (
                <option key={sr.sectionId} value={sr.sectionId}>
                  {sr.sectionName}
                </option>
              ))}
            </select>

            {attempt.examSnapshot.languages.includes('hi') && (
              <select
                value={effectiveLang}
                onChange={(e) => setLang(e.target.value as ExamLanguage)}
                className="rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-700 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-200"
              >
                <option value="en">English</option>
                <option value="hi">Hindi (हिन्दी)</option>
              </select>
            )}
          </div>
        </div>

        {filteredQuestions.length === 0 ? (
          <div className="rounded-xl border border-slate-200 bg-white p-8 text-center text-sm text-slate-500 dark:border-neutral-800 dark:bg-neutral-900 dark:text-neutral-400">
            No questions match the selected filter.
          </div>
        ) : (
          <div className="space-y-4">
            {filteredQuestions.map((qr) => {
              const q = questionMap.get(qr.questionId);
              if (!q) return null;
              const saved = isBookmarked(q.id);
              const qText = getLocalizedText(q.question, effectiveLang);
              const passageText = getLocalizedText(q.passage, effectiveLang);
              const explanationText = getLocalizedText(q.explanation, effectiveLang);

              return (
                <article
                  key={qr.questionId}
                  className={cn(
                    'rounded-2xl border bg-white p-5 shadow-xs dark:bg-neutral-900',
                    qr.outcome === 'correct' && 'border-emerald-200 dark:border-emerald-900/70',
                    qr.outcome === 'incorrect' && 'border-rose-200 dark:border-rose-900/70',
                    qr.outcome === 'unattempted' && 'border-slate-200 dark:border-neutral-800',
                    qr.outcome === 'partial' && 'border-amber-200 dark:border-amber-900/70'
                  )}
                >
                  {/* Question Card Header */}
                  <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-3 dark:border-neutral-800">
                    <div className="flex flex-wrap items-center gap-2 text-xs">
                      <span className="rounded bg-neutral-900 px-2.5 py-0.5 font-bold text-white dark:bg-orange-600">
                        Q{qr.questionNumber}
                      </span>
                      <span className="font-semibold text-slate-700 dark:text-neutral-300">
                        {qr.sectionName}
                      </span>
                      {qr.topic && (
                        <span className="rounded bg-orange-50 px-2 py-0.5 font-medium text-orange-800 dark:bg-orange-950/70 dark:text-orange-300">
                          {qr.topic}
                        </span>
                      )}
                      <span className="font-mono text-slate-500 dark:text-neutral-400">
                        ⏱ {formatDurationHuman(qr.timeSpentSeconds)}
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      <span
                        className={cn(
                          'rounded-full px-2.5 py-0.5 text-xs font-bold',
                          qr.outcome === 'correct' &&
                            'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300',
                          qr.outcome === 'incorrect' &&
                            'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300',
                          qr.outcome === 'unattempted' &&
                            'bg-slate-100 text-slate-700 dark:bg-neutral-800 dark:text-neutral-300',
                          qr.outcome === 'partial' &&
                            'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                        )}
                      >
                        {qr.marksAwarded > 0
                          ? `+${formatMarks(qr.marksAwarded)}`
                          : formatMarks(qr.marksAwarded)}{' '}
                        marks
                      </span>
                      <button
                        type="button"
                        onClick={() => void handleToggleBookmark(qr)}
                        className={cn(
                          'flex items-center gap-1 rounded-lg border px-2.5 py-1 text-xs font-semibold',
                          saved
                            ? 'border-amber-300 bg-amber-50 text-amber-800 dark:border-amber-800 dark:bg-amber-950/60 dark:text-amber-300'
                            : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-300 dark:hover:bg-neutral-700'
                        )}
                      >
                        <Bookmark
                          className={cn('h-3.5 w-3.5', saved && 'fill-amber-500 text-amber-600')}
                        />
                        {saved ? 'Saved' : 'Save'}
                      </button>
                    </div>
                  </div>

                  {passageText && (
                    <div className="mt-3 rounded-lg border border-amber-200 bg-amber-50/50 p-3 text-xs text-slate-700 dark:border-amber-900/50 dark:bg-amber-950/30 dark:text-neutral-300">
                      <MathText text={passageText} />
                    </div>
                  )}

                  <SafeDiagram svg={q.svg} image={q.image} />

                  <div className="mt-3 text-sm font-medium text-slate-900 dark:text-neutral-100">
                    <MathText text={qText} />
                  </div>

                  {/* Options Highlight */}
                  <div className="mt-3 grid gap-2 sm:grid-cols-2">
                    {q.options.map((opt, oIdx) => {
                      const isCorrectOpt = qr.correctIndices.includes(oIdx);
                      const isUserChoice = qr.selectedIndices.includes(oIdx);
                      return (
                        <div
                          key={oIdx}
                          className={cn(
                            'flex items-start justify-between gap-2 rounded-lg border px-3 py-2 text-xs sm:text-sm',
                            isCorrectOpt
                              ? 'border-emerald-400 bg-emerald-50 text-emerald-950 dark:border-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-200'
                              : isUserChoice
                                ? 'border-rose-400 bg-rose-50 text-rose-950 dark:border-rose-700 dark:bg-rose-950/50 dark:text-rose-200'
                                : 'border-slate-200 bg-slate-50/40 text-slate-700 dark:border-neutral-800 dark:bg-neutral-800/40 dark:text-neutral-300'
                          )}
                        >
                          <div className="flex items-start gap-2">
                            <span className="font-bold">({optionIndexToLetter(oIdx)})</span>
                            <MathText text={getLocalizedText(opt, effectiveLang)} />
                          </div>
                          {isCorrectOpt && (
                            <span className="shrink-0 rounded bg-emerald-600 px-1.5 py-0.5 text-[10px] font-bold text-white">
                              Correct
                            </span>
                          )}
                          {!isCorrectOpt && isUserChoice && (
                            <span className="shrink-0 rounded bg-rose-600 px-1.5 py-0.5 text-[10px] font-bold text-white">
                              Your Choice
                            </span>
                          )}
                        </div>
                      );
                    })}
                  </div>

                  {/* Explanation */}
                  {explanationText && (
                    <div className="mt-3 rounded-xl border border-orange-200 bg-orange-50/60 p-3.5 text-xs sm:text-sm text-slate-800 dark:border-orange-900/60 dark:bg-orange-950/30 dark:text-neutral-200">
                      <div className="mb-1 font-bold text-orange-900 dark:text-orange-300">
                        Explanation / Solution
                      </div>
                      <MathText text={explanationText} />
                    </div>
                  )}
                </article>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
};
