import React, { useState } from 'react';
import { ArrowLeft, ArrowRight, Info, Moon, Sun } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import type { CandidateProfile, ExamDefinition, ExamLanguage } from '../../types/exam';
import { formatMarks } from '../../utils/formatters';
import {
  getEffectiveQuestionMarks,
  getEffectiveTotalDurationSeconds,
  getSectionDurationMinutes,
  getTotalExamQuestions,
  getTotalMaxMarks,
} from '../../utils/scoring';
import { PaletteBadge } from './PaletteBadge';

interface InstructionsScreenProps {
  exam: ExamDefinition;
  profile: CandidateProfile;
  initialLanguage: ExamLanguage;
  onStart: (language: ExamLanguage) => void;
  onBack: () => void;
}

export const InstructionsScreen: React.FC<InstructionsScreenProps> = ({
  exam,
  profile,
  initialLanguage,
  onStart,
  onBack,
}) => {
  const { theme, toggleTheme } = useApp();
  const [selectedLang, setSelectedLang] = useState<ExamLanguage>(initialLanguage);
  const [accepted, setAccepted] = useState(false);

  const totalQs = getTotalExamQuestions(exam);
  const maxMarks = getTotalMaxMarks(exam);
  const totalMins = Math.round(getEffectiveTotalDurationSeconds(exam) / 60);
  const hasHindi = exam.languages.includes('hi');

  return (
    <div className="flex min-h-screen flex-col bg-white text-slate-900 dark:bg-neutral-950 dark:text-neutral-100">
      {/* Classic CBT Header */}
      <header className="flex items-center justify-between gap-3 bg-[#1E1E1E] px-4 py-2 text-white dark:border-b dark:border-neutral-800 dark:bg-neutral-900">
        <div className="flex min-w-0 flex-1 items-center gap-3">
          <button
            type="button"
            onClick={onBack}
            className="flex shrink-0 items-center gap-1 whitespace-nowrap rounded bg-white/10 px-2.5 py-1 text-xs font-medium hover:bg-white/20"
          >
            <ArrowLeft className="h-3.5 w-3.5 shrink-0" />
            Back
          </button>
          <span className="truncate text-sm font-semibold">{exam.title}</span>
        </div>
        <div className="flex shrink-0 items-center gap-3">
          <span className="whitespace-nowrap text-xs font-medium text-orange-300">
            General Instructions
          </span>
          <button
            type="button"
            onClick={() => void toggleTheme()}
            className="shrink-0 rounded bg-white/10 p-1 text-amber-300 hover:bg-white/20"
            title={theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
            aria-label={theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
          >
            {theme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          </button>
        </div>
      </header>

      <div className="flex flex-1 flex-col lg:flex-row">
        {/* Left Instructions Pane */}
        <div className="flex flex-1 flex-col border-r border-slate-300 dark:border-neutral-800">
          <div className="border-b border-orange-200 bg-orange-50 px-5 py-2.5 dark:border-neutral-800 dark:bg-neutral-900">
            <h1 className="flex items-center gap-2 text-base font-bold text-slate-900 dark:text-white">
              <Info className="h-4 w-4 text-orange-600 dark:text-orange-400" />
              Instructions — Please read carefully before starting
            </h1>
          </div>

          <div className="flex-1 space-y-5 overflow-y-auto p-5 text-sm leading-relaxed text-slate-800 sm:px-7 dark:text-neutral-200">
            {/* Section-wise Paper Structure */}
            <section>
              <h2 className="mb-2 font-bold text-slate-900 dark:text-white">
                1. Paper Structure &amp; Marking Scheme
              </h2>
              <div className="overflow-x-auto rounded border border-slate-300 dark:border-neutral-700">
                <table className="min-w-full border-collapse text-xs sm:text-sm">
                  <thead className="bg-slate-100 text-left text-slate-700 dark:bg-neutral-800 dark:text-neutral-200">
                    <tr>
                      <th className="border-b border-slate-300 px-3 py-2 font-semibold dark:border-neutral-700">
                        Section
                      </th>
                      <th className="border-b border-slate-300 px-3 py-2 font-semibold dark:border-neutral-700">
                        Questions
                      </th>
                      <th className="border-b border-slate-300 px-3 py-2 font-semibold dark:border-neutral-700">
                        Max Marks
                      </th>
                      <th className="border-b border-slate-300 px-3 py-2 font-semibold dark:border-neutral-700">
                        Negative Marking
                      </th>
                      {exam.settings.sectionalTiming && (
                        <th className="border-b border-slate-300 px-3 py-2 font-semibold dark:border-neutral-700">
                          Time Limit
                        </th>
                      )}
                    </tr>
                  </thead>
                  <tbody>
                    {exam.sections.map((sec) => {
                      const secMax = sec.questions.reduce(
                        (sum, q) => sum + getEffectiveQuestionMarks(q, sec, exam).positive,
                        0
                      );
                      const sampleNeg =
                        sec.defaultNegativeMarks ?? exam.settings.defaultNegativeMarks;
                      return (
                        <tr
                          key={sec.id}
                          className="border-b border-slate-200 last:border-b-0 dark:border-neutral-800"
                        >
                          <td className="px-3 py-2 font-medium">{sec.name}</td>
                          <td className="px-3 py-2">{sec.questions.length}</td>
                          <td className="px-3 py-2">{formatMarks(secMax)}</td>
                          <td className="px-3 py-2 text-rose-700 dark:text-rose-400">
                            {sampleNeg > 0 ? `-${formatMarks(sampleNeg)}` : 'No negative marking'}
                          </td>
                          {exam.settings.sectionalTiming && (
                            <td className="px-3 py-2 font-medium text-orange-700 dark:text-orange-400">
                              {getSectionDurationMinutes(sec, exam)} mins
                            </td>
                          )}
                        </tr>
                      );
                    })}
                    <tr className="bg-slate-50 font-bold text-slate-900 dark:bg-neutral-800/70 dark:text-white">
                      <td className="px-3 py-2">Total</td>
                      <td className="px-3 py-2">{totalQs}</td>
                      <td className="px-3 py-2">{formatMarks(maxMarks)}</td>
                      <td className="px-3 py-2">
                        {totalMins > 0 ? `Total Time: ${totalMins} mins` : 'Untimed Practice'}
                      </td>
                      {exam.settings.sectionalTiming && (
                        <td className="px-3 py-2">
                          {exam.settings.allowBackNavigationInSectionalTiming
                            ? 'Flexible Switch'
                            : 'Locked Order'}
                        </td>
                      )}
                    </tr>
                  </tbody>
                </table>
              </div>
            </section>

            {/* General CBT Rules */}
            <section>
              <h2 className="mb-2 font-bold text-slate-900 dark:text-white">
                2. General Instructions &amp; Question Palette
              </h2>
              <ol className="list-decimal space-y-1.5 pl-5">
                <li>
                  {totalMins > 0 ? (
                    <>
                      Total duration of this examination is <strong>{totalMins} minutes</strong>.
                      {exam.settings.sectionalTiming
                        ? ' Individual sections are strictly timed and will auto-advance when their timer expires.'
                        : ' You may switch freely between any sections during the exam.'}
                    </>
                  ) : (
                    'This is an untimed practice session. Take as much time as you need before submitting.'
                  )}
                </li>
                <li>
                  The clock is displayed in the top-right bar. When the countdown reaches zero, the
                  examination will automatically end and submit your responses.
                </li>
                <li>
                  The Question Palette on the right side shows the status of every question using the
                  following symbols:
                </li>
              </ol>

              {/* Authentic 5-symbol Palette Legend */}
              <div className="mt-3 rounded border border-slate-300 bg-slate-50 p-4 dark:border-neutral-700 dark:bg-neutral-900">
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="flex items-center gap-3">
                    <PaletteBadge status="not_visited" label="1" size="md" />
                    <span>
                      You have <strong>not visited</strong> the question yet.
                    </span>
                  </div>
                  <div className="flex items-center gap-3">
                    <PaletteBadge status="not_answered" label="3" size="md" />
                    <span>
                      You have <strong>not answered</strong> the question.
                    </span>
                  </div>
                  <div className="flex items-center gap-3">
                    <PaletteBadge status="answered" label="5" size="md" />
                    <span>
                      You have <strong>answered</strong> the question.
                    </span>
                  </div>
                  <div className="flex items-center gap-3">
                    <PaletteBadge status="marked" label="7" size="md" />
                    <span>
                      You have <strong>NOT answered</strong> the question, but marked it for review.
                    </span>
                  </div>
                  <div className="flex items-center gap-3 sm:col-span-2">
                    <PaletteBadge status="answered_marked" label="9" size="md" />
                    <span>
                      You have <strong>answered</strong> the question AND{' '}
                      <strong>marked it for review</strong>.{' '}
                      <strong className="text-orange-700 dark:text-orange-400">
                        {exam.settings.evaluateMarkedAnswered
                          ? '(Will be considered for evaluation!)'
                          : '(Will NOT be considered for evaluation unless saved!)'}
                      </strong>
                    </span>
                  </div>
                </div>
              </div>
            </section>

            {/* Navigation & Custom Instructions */}
            <section>
              <h2 className="mb-2 font-bold text-slate-900 dark:text-white">
                3. Navigating &amp; Answering a Question
              </h2>
              <ul className="list-disc space-y-1.5 pl-5">
                <li>
                  Click on any option radio button (or press keys{' '}
                  <kbd className="rounded border px-1 text-xs dark:border-neutral-600">1</kbd>–
                  <kbd className="rounded border px-1 text-xs dark:border-neutral-600">8</kbd>) to
                  select your response.
                </li>
                <li>
                  Click <strong>Save &amp; Next</strong> to save your answer for the current question
                  and proceed to the next question.
                </li>
                <li>
                  Click <strong>Mark for Review &amp; Next</strong> to flag the question for later
                  review and move to the next question.
                </li>
                <li>
                  Click <strong>Clear Response</strong> to deselect your currently chosen option.
                </li>
                {exam.instructions?.map((inst, i) => (
                  <li key={i}>{inst}</li>
                ))}
              </ul>
            </section>
          </div>

          {/* Bottom Language + Declaration Bar */}
          <div className="border-t border-slate-300 bg-slate-50 p-4 sm:px-7 dark:border-neutral-800 dark:bg-neutral-900">
            <div className="mb-3 flex flex-wrap items-center gap-3">
              <label className="text-xs font-bold uppercase tracking-wide text-slate-700 dark:text-neutral-300">
                Choose your default language:
              </label>
              <select
                value={selectedLang}
                onChange={(e) => setSelectedLang(e.target.value as ExamLanguage)}
                className="rounded border border-slate-300 bg-white px-3 py-1.5 text-sm font-medium text-slate-800 outline-none focus:border-orange-600 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-100"
              >
                <option value="en">English</option>
                {hasHindi && <option value="hi">Hindi (हिन्दी)</option>}
              </select>
              {!hasHindi && (
                <span className="text-xs text-slate-500 dark:text-neutral-400">
                  (Only English text available in this paper)
                </span>
              )}
            </div>

            <label className="flex cursor-pointer items-start gap-2.5 rounded border border-slate-200 bg-white p-3 text-xs leading-relaxed text-slate-700 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-300">
              <input
                type="checkbox"
                checked={accepted}
                onChange={(e) => setAccepted(e.target.checked)}
                className="mt-0.5 h-4 w-4 shrink-0 accent-orange-600"
              />
              <span>
                I have read and understood the instructions. All computer hardware allotted to me is
                in proper working condition. I agree that in case of not adhering to the
                instructions, I shall be liable to be disqualified from this mock test.
              </span>
            </label>

            <div className="mt-4 flex items-center justify-between">
              <button
                type="button"
                onClick={onBack}
                className="rounded border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-200 dark:hover:bg-neutral-700"
              >
                Previous
              </button>
              <button
                type="button"
                disabled={!accepted}
                onClick={() => onStart(selectedLang)}
                className="flex items-center gap-2 rounded bg-orange-600 px-6 py-2 text-sm font-bold text-white shadow transition hover:bg-orange-700 disabled:cursor-not-allowed disabled:bg-slate-300 disabled:text-slate-500 dark:disabled:bg-neutral-800 dark:disabled:text-neutral-600"
              >
                I am ready to begin
                <ArrowRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>

        {/* Right Candidate Profile Sidebar */}
        <aside className="flex w-full flex-col items-center justify-start bg-[#F8F6F2] p-6 lg:w-72 dark:bg-neutral-900/70">
          <div
            className="flex h-28 w-24 items-center justify-center rounded border-2 border-slate-300 text-3xl font-bold text-white shadow-sm dark:border-neutral-600"
            style={{ backgroundColor: profile.avatarColor }}
          >
            {profile.name.trim().charAt(0).toUpperCase() || 'C'}
          </div>
          <div className="mt-3 text-center">
            <div className="text-base font-bold text-slate-900 dark:text-white">{profile.name}</div>
            <div className="mt-0.5 font-mono text-xs text-slate-600 dark:text-neutral-400">
              {profile.rollNumber}
            </div>
            <div className="mt-2 rounded-full bg-orange-100 px-3 py-0.5 text-xs font-medium text-orange-800 dark:bg-orange-950 dark:text-orange-300">
              {exam.category}
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
};
