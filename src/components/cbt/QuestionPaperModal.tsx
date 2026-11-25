import React, { useEffect, useState } from 'react';
import type { ExamDefinition, ExamLanguage } from '../../types/exam';
import { getLocalizedText } from '../../utils/formatters';
import { MathText, SafeDiagram } from '../common/MathText';
import { Modal } from '../common/Modal';

interface QuestionPaperModalProps {
  open: boolean;
  onClose: () => void;
  exam: ExamDefinition;
  activeSectionIndex: number;
  language: ExamLanguage;
  lockedSectionIds: string[];
  onJumpToQuestion?: (sectionIndex: number, questionIndex: number) => void;
}

export const QuestionPaperModal: React.FC<QuestionPaperModalProps> = ({
  open,
  onClose,
  exam,
  activeSectionIndex,
  language,
  lockedSectionIds,
  onJumpToQuestion,
}) => {
  const [selectedTab, setSelectedTab] = useState<number>(activeSectionIndex);

  useEffect(() => {
    if (open) {
      setSelectedTab(activeSectionIndex);
    }
  }, [open, activeSectionIndex]);

  const currentTab = Math.max(0, Math.min(selectedTab, exam.sections.length - 1));
  const section = exam.sections[currentTab];

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Question Paper"
      maxWidthClass="max-w-4xl"
      headerClassName="bg-[#1E1E1E] text-white border-slate-700 dark:bg-neutral-800"
    >
      <div className="mb-4 flex flex-wrap gap-1.5 border-b border-slate-200 pb-3 dark:border-neutral-700">
        {exam.sections.map((sec, idx) => {
          const isLocked = lockedSectionIds.includes(sec.id);
          const disabled =
            exam.settings.sectionalTiming &&
            !exam.settings.allowBackNavigationInSectionalTiming &&
            idx !== activeSectionIndex;
          return (
            <button
              key={sec.id}
              type="button"
              disabled={disabled || isLocked}
              onClick={() => setSelectedTab(idx)}
              className={`rounded px-3 py-1.5 text-xs font-semibold transition ${
                currentTab === idx
                  ? 'bg-orange-600 text-white'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200 disabled:cursor-not-allowed disabled:opacity-45 dark:bg-neutral-800 dark:text-neutral-300 dark:hover:bg-neutral-700'
              }`}
            >
              {sec.name} ({sec.questions.length})
            </button>
          );
        })}
      </div>

      {section && (
        <div className="space-y-5">
          {section.questions.map((q, qIdx) => {
            const qText = getLocalizedText(q.question, language);
            const passageText = getLocalizedText(q.passage, language);
            const canJump =
              onJumpToQuestion &&
              (!exam.settings.sectionalTiming ||
                exam.settings.allowBackNavigationInSectionalTiming ||
                currentTab === activeSectionIndex) &&
              !lockedSectionIds.includes(section.id);

            return (
              <div
                key={q.id}
                className="rounded border border-slate-200 bg-slate-50/60 p-4 text-sm dark:border-neutral-700 dark:bg-neutral-800/50"
              >
                <div className="mb-2 flex items-center justify-between gap-2 border-b border-slate-200 pb-2 dark:border-neutral-700">
                  <span className="font-bold text-slate-900 dark:text-white">
                    Question {qIdx + 1}
                    {q.topic ? (
                      <span className="ml-2 rounded bg-slate-200 px-2 py-0.5 text-[11px] font-medium text-slate-700 dark:bg-neutral-700 dark:text-neutral-200">
                        {q.topic}
                      </span>
                    ) : null}
                  </span>
                  {canJump && (
                    <button
                      type="button"
                      onClick={() => {
                        onJumpToQuestion(currentTab, qIdx);
                        onClose();
                      }}
                      className="rounded bg-orange-600 px-2.5 py-1 text-xs font-semibold text-white hover:bg-orange-700"
                    >
                      Go to Q{qIdx + 1}
                    </button>
                  )}
                </div>

                {passageText && (
                  <div className="mb-3 rounded border border-amber-200 bg-amber-50/60 p-2.5 text-xs text-slate-700 dark:border-amber-900/50 dark:bg-amber-950/30 dark:text-neutral-200">
                    <MathText text={passageText} />
                  </div>
                )}
                <SafeDiagram svg={q.svg} image={q.image} />
                <MathText text={qText} className="font-medium text-slate-900 dark:text-neutral-100" />
                <ol className="mt-2.5 grid gap-1.5 pl-4 sm:grid-cols-2">
                  {q.options.map((opt, oIdx) => (
                    <li
                      key={oIdx}
                      className="list-none text-xs text-slate-700 dark:text-neutral-300"
                    >
                      <span className="mr-1.5 font-semibold text-slate-900 dark:text-white">
                        ({String.fromCharCode(65 + oIdx)})
                      </span>
                      <span className="inline-block align-top">
                        <MathText text={getLocalizedText(opt, language)} />
                      </span>
                    </li>
                  ))}
                </ol>
              </div>
            );
          })}
        </div>
      )}
    </Modal>
  );
};
