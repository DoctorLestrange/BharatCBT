import React from 'react';
import { AlertTriangle, CheckCircle2 } from 'lucide-react';
import type { ExamDefinition, QuestionResponseState } from '../../types/exam';
import { countPaletteStatuses } from '../../utils/scoring';
import { Modal } from '../common/Modal';

interface ExamSummaryModalProps {
  open: boolean;
  onClose: () => void;
  onConfirmSubmit: () => void;
  exam: ExamDefinition;
  responses: Record<string, QuestionResponseState>;
  submitting?: boolean;
}

export const ExamSummaryModal: React.FC<ExamSummaryModalProps> = ({
  open,
  onClose,
  onConfirmSubmit,
  exam,
  responses,
  submitting = false,
}) => {
  const totals = {
    total: 0,
    answered: 0,
    not_answered: 0,
    marked: 0,
    answered_marked: 0,
    not_visited: 0,
  };

  const rows = exam.sections.map((sec) => {
    const counts = countPaletteStatuses(sec.questions, responses);
    totals.total += sec.questions.length;
    totals.answered += counts.answered;
    totals.not_answered += counts.not_answered;
    totals.marked += counts.marked;
    totals.answered_marked += counts.answered_marked;
    totals.not_visited += counts.not_visited;
    return { section: sec, counts };
  });

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Exam Summary"
      maxWidthClass="max-w-4xl"
      headerClassName="bg-[#1E1E1E] text-white border-slate-700 dark:bg-neutral-800"
      footer={
        <>
          <button
            type="button"
            disabled={submitting}
            onClick={onClose}
            className="rounded border border-slate-300 bg-white px-5 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100 disabled:opacity-50 dark:border-neutral-600 dark:bg-neutral-800 dark:text-neutral-200 dark:hover:bg-neutral-700"
          >
            No, Resume Exam
          </button>
          <button
            type="button"
            disabled={submitting}
            onClick={onConfirmSubmit}
            className="flex items-center gap-1.5 rounded bg-orange-600 px-6 py-2 text-sm font-bold text-white shadow hover:bg-orange-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            <CheckCircle2 className="h-4 w-4" />
            {submitting ? 'Submitting...' : 'Yes, Submit Exam'}
          </button>
        </>
      }
    >
      <div className="space-y-4">
        <div className="flex items-start gap-2.5 rounded border border-amber-200 bg-amber-50 p-3 text-xs sm:text-sm text-amber-900 dark:border-amber-900/60 dark:bg-amber-950/40 dark:text-amber-200">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600 dark:text-amber-400" />
          <div>
            <strong>Are you sure you want to submit this exam for final grading?</strong>
            <p className="mt-0.5 text-xs text-amber-800 dark:text-amber-300">
              {exam.settings.evaluateMarkedAnswered
                ? 'Questions marked as "Answered & Marked for Review" WILL be evaluated for marks.'
                : 'Questions marked as "Answered & Marked for Review" will NOT be evaluated.'}
            </p>
          </div>
        </div>

        <div className="overflow-x-auto rounded border border-slate-300 dark:border-neutral-700">
          <table className="min-w-full border-collapse text-center text-xs sm:text-sm">
            <thead className="bg-orange-50 text-slate-800 dark:bg-neutral-800 dark:text-neutral-100">
              <tr>
                <th className="border border-slate-300 px-3 py-2 text-left font-bold dark:border-neutral-700">
                  Section Name
                </th>
                <th className="border border-slate-300 px-2.5 py-2 font-bold dark:border-neutral-700">
                  No. of Qs
                </th>
                <th className="border border-slate-300 px-2.5 py-2 font-bold text-emerald-700 dark:border-neutral-700 dark:text-emerald-400">
                  Answered
                </th>
                <th className="border border-slate-300 px-2.5 py-2 font-bold text-rose-700 dark:border-neutral-700 dark:text-rose-400">
                  Not Answered
                </th>
                <th className="border border-slate-300 px-2.5 py-2 font-bold text-purple-700 dark:border-neutral-700 dark:text-purple-400">
                  Marked for Review
                </th>
                <th className="border border-slate-300 px-2.5 py-2 font-bold text-purple-800 dark:border-neutral-700 dark:text-purple-300">
                  Ans &amp; Marked
                </th>
                <th className="border border-slate-300 px-2.5 py-2 font-bold text-slate-600 dark:border-neutral-700 dark:text-neutral-300">
                  Not Visited
                </th>
              </tr>
            </thead>
            <tbody>
              {rows.map(({ section, counts }) => (
                <tr
                  key={section.id}
                  className="bg-white hover:bg-slate-50 dark:bg-neutral-900 dark:hover:bg-neutral-800/60"
                >
                  <td className="border border-slate-300 px-3 py-2 text-left font-semibold text-slate-900 dark:border-neutral-700 dark:text-neutral-100">
                    {section.name}
                  </td>
                  <td className="border border-slate-300 px-2.5 py-2 font-medium dark:border-neutral-700">
                    {section.questions.length}
                  </td>
                  <td className="border border-slate-300 px-2.5 py-2 font-bold text-emerald-700 dark:border-neutral-700 dark:text-emerald-400">
                    {counts.answered}
                  </td>
                  <td className="border border-slate-300 px-2.5 py-2 font-bold text-rose-700 dark:border-neutral-700 dark:text-rose-400">
                    {counts.not_answered}
                  </td>
                  <td className="border border-slate-300 px-2.5 py-2 font-bold text-purple-700 dark:border-neutral-700 dark:text-purple-400">
                    {counts.marked}
                  </td>
                  <td className="border border-slate-300 px-2.5 py-2 font-bold text-purple-800 dark:border-neutral-700 dark:text-purple-300">
                    {counts.answered_marked}
                  </td>
                  <td className="border border-slate-300 px-2.5 py-2 font-semibold text-slate-600 dark:border-neutral-700 dark:text-neutral-300">
                    {counts.not_visited}
                  </td>
                </tr>
              ))}
              <tr className="bg-slate-100 font-bold text-slate-900 dark:bg-neutral-800 dark:text-white">
                <td className="border border-slate-300 px-3 py-2 text-left dark:border-neutral-700">
                  Total
                </td>
                <td className="border border-slate-300 px-2.5 py-2 dark:border-neutral-700">
                  {totals.total}
                </td>
                <td className="border border-slate-300 px-2.5 py-2 text-emerald-700 dark:border-neutral-700 dark:text-emerald-400">
                  {totals.answered}
                </td>
                <td className="border border-slate-300 px-2.5 py-2 text-rose-700 dark:border-neutral-700 dark:text-rose-400">
                  {totals.not_answered}
                </td>
                <td className="border border-slate-300 px-2.5 py-2 text-purple-700 dark:border-neutral-700 dark:text-purple-400">
                  {totals.marked}
                </td>
                <td className="border border-slate-300 px-2.5 py-2 text-purple-800 dark:border-neutral-700 dark:text-purple-300">
                  {totals.answered_marked}
                </td>
                <td className="border border-slate-300 px-2.5 py-2 text-slate-700 dark:border-neutral-700 dark:text-neutral-300">
                  {totals.not_visited}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </Modal>
  );
};
