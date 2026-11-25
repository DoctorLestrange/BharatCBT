import React, { useMemo, useState } from 'react';
import { Bookmark, Eye, EyeOff, Play, Search, Trash2 } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import type { ExamLanguage } from '../../types/exam';
import { cn } from '../../utils/cn';
import {
  formatDateTime,
  getLocalizedText,
  hasHindiTranslation,
  optionIndexToLetter,
} from '../../utils/formatters';
import { createBookmarksExam } from '../../utils/scoring';
import { MathText, SafeDiagram } from '../common/MathText';

export const BookmarksView: React.FC = () => {
  const { profile, bookmarks, updateBookmark, removeBookmark, upsertExam, navigate, showToast } =
    useApp();
  const [query, setQuery] = useState('');
  const [lang, setLang] = useState<ExamLanguage>(profile.preferredLanguage);
  const [revealedIds, setRevealedIds] = useState<Set<string>>(() => new Set());
  const [editingNoteId, setEditingNoteId] = useState<string | null>(null);
  const [noteDraft, setNoteDraft] = useState('');

  const hasAnyHindi = useMemo(
    () =>
      bookmarks.some(
        (bm) =>
          hasHindiTranslation(bm.question.question) ||
          bm.question.options.some((o) => hasHindiTranslation(o))
      ),
    [bookmarks]
  );

  const effectiveLang: ExamLanguage = hasAnyHindi ? lang : 'en';

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return bookmarks;
    return bookmarks.filter(
      (bm) =>
        bm.examTitle.toLowerCase().includes(q) ||
        bm.sectionName.toLowerCase().includes(q) ||
        (bm.question.topic ?? '').toLowerCase().includes(q) ||
        (bm.userNote ?? '').toLowerCase().includes(q) ||
        getLocalizedText(bm.question.question, 'en').toLowerCase().includes(q) ||
        getLocalizedText(bm.question.question, 'hi').toLowerCase().includes(q)
    );
  }, [bookmarks, query]);

  const toggleReveal = (id: string) => {
    setRevealedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleLaunchPractice = async () => {
    const practiceExam = createBookmarksExam(filtered);
    if (!practiceExam) return;
    await upsertExam(practiceExam);
    showToast(`Created revision mock with ${filtered.length} saved questions!`, 'success');
    navigate(`/exam/${encodeURIComponent(practiceExam.id)}?fresh=1`);
  };

  const handleSaveNote = async (bm: (typeof bookmarks)[number]) => {
    await updateBookmark({ ...bm, userNote: noteDraft.trim() || undefined });
    setEditingNoteId(null);
    showToast('Study note saved.', 'success');
  };

  return (
    <div className="mx-auto max-w-5xl space-y-5 px-4 py-6 sm:px-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-extrabold text-slate-900 dark:text-white">
            <Bookmark className="h-6 w-6 text-orange-600 dark:text-orange-400" />
            Saved Questions &amp; Revision Bank
          </h1>
          <p className="mt-0.5 text-sm text-slate-500 dark:text-neutral-400">
            Bookmark tricky questions during exams or review, add personal notes, and re-test
            yourself anytime.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {hasAnyHindi && (
            <select
              value={effectiveLang}
              onChange={(e) => setLang(e.target.value as ExamLanguage)}
              className="rounded-lg border border-slate-300 bg-white px-2.5 py-2 text-xs font-semibold text-slate-700 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-200"
            >
              <option value="en">English</option>
              <option value="hi">Hindi (हिन्दी)</option>
            </select>
          )}
          {filtered.length > 0 && (
            <button
              type="button"
              onClick={handleLaunchPractice}
              className="flex items-center gap-2 rounded-xl bg-orange-600 px-4 py-2.5 text-xs font-bold text-white shadow hover:bg-orange-700"
            >
              <Play className="h-4 w-4" />
              Practice Saved Qs ({filtered.length})
            </button>
          )}
        </div>
      </div>

      {bookmarks.length > 0 && (
        <div className="relative">
          <Search className="pointer-events-none absolute top-2.5 left-3 h-4 w-4 text-slate-400" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search saved questions by keyword, exam, or topic..."
            className="w-full rounded-xl border border-slate-200 bg-white py-2 pr-4 pl-9 text-sm outline-none focus:border-orange-500 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-100"
          />
        </div>
      )}

      {filtered.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-12 text-center dark:border-neutral-700 dark:bg-neutral-900">
          <p className="text-base font-semibold text-slate-800 dark:text-white">
            {bookmarks.length === 0
              ? 'No saved questions yet'
              : 'No saved questions match your search'}
          </p>
          <p className="mt-1 text-sm text-slate-500 dark:text-neutral-400">
            Click &quot;Save Q&quot; during any live exam or &quot;Save&quot; in Solution Review to
            collect tricky questions here.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {filtered.map((bm) => {
            const revealed = revealedIds.has(bm.id);
            const q = bm.question;
            const passage = getLocalizedText(q.passage, effectiveLang);
            const explanation = getLocalizedText(q.explanation, effectiveLang);

            return (
              <article
                key={bm.id}
                className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs dark:border-neutral-800 dark:bg-neutral-900"
              >
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-3 text-xs dark:border-neutral-800">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="rounded bg-orange-50 px-2 py-0.5 font-bold text-orange-800 dark:bg-orange-950/70 dark:text-orange-300">
                      {bm.examTitle}
                    </span>
                    <span className="text-slate-600 dark:text-neutral-400">{bm.sectionName}</span>
                    {q.topic && (
                      <span className="rounded bg-slate-100 px-2 py-0.5 font-medium text-slate-700 dark:bg-neutral-800 dark:text-neutral-300">
                        {q.topic}
                      </span>
                    )}
                    <span className="text-slate-400 dark:text-neutral-500">
                      {formatDateTime(bm.createdAt)}
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => toggleReveal(bm.id)}
                      className="flex items-center gap-1 rounded-lg border border-slate-300 bg-slate-50 px-2.5 py-1 font-semibold text-slate-700 hover:bg-slate-100 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-200 dark:hover:bg-neutral-700"
                    >
                      {revealed ? (
                        <>
                          <EyeOff className="h-3.5 w-3.5" /> Hide Answer
                        </>
                      ) : (
                        <>
                          <Eye className="h-3.5 w-3.5" /> Reveal Answer
                        </>
                      )}
                    </button>
                    <button
                      type="button"
                      onClick={async () => {
                        await removeBookmark(bm.id);
                        showToast('Removed from Revision Bank.', 'info');
                      }}
                      className="rounded-lg p-1.5 text-slate-400 hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-950/60 dark:hover:text-rose-400"
                      title="Remove bookmark"
                      aria-label="Remove bookmark"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>

                {passage && (
                  <div className="mt-3 rounded-lg border border-amber-200 bg-amber-50/50 p-3 text-xs text-slate-700 dark:border-amber-900/50 dark:bg-amber-950/30 dark:text-neutral-300">
                    <MathText text={passage} />
                  </div>
                )}

                <SafeDiagram svg={q.svg} image={q.image} />

                <div className="mt-3 text-sm font-medium text-slate-900 dark:text-neutral-100">
                  <MathText text={getLocalizedText(q.question, effectiveLang)} />
                </div>

                <div className="mt-3 grid gap-2 sm:grid-cols-2">
                  {q.options.map((opt, idx) => {
                    const isAns = q.correctIndices.includes(idx);
                    return (
                      <div
                        key={idx}
                        className={cn(
                          'flex items-start gap-2 rounded-lg border px-3 py-2 text-xs',
                          revealed && isAns
                            ? 'border-emerald-400 bg-emerald-50 font-semibold text-emerald-950 dark:border-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-200'
                            : 'border-slate-200 bg-slate-50/50 text-slate-700 dark:border-neutral-800 dark:bg-neutral-800/50 dark:text-neutral-300'
                        )}
                      >
                        <span className="font-bold">({optionIndexToLetter(idx)})</span>
                        <MathText text={getLocalizedText(opt, effectiveLang)} />
                      </div>
                    );
                  })}
                </div>

                {revealed && explanation && (
                  <div className="mt-3 rounded-xl border border-orange-200 bg-orange-50/60 p-3 text-xs text-slate-800 dark:border-orange-900/60 dark:bg-orange-950/30 dark:text-neutral-200">
                    <div className="mb-1 font-bold text-orange-900 dark:text-orange-300">
                      Explanation
                    </div>
                    <MathText text={explanation} />
                  </div>
                )}

                {/* Personal Study Note */}
                <div className="mt-3 border-t border-slate-100 pt-3 dark:border-neutral-800">
                  {editingNoteId === bm.id ? (
                    <div className="flex flex-col gap-2 sm:flex-row">
                      <input
                        type="text"
                        value={noteDraft}
                        onChange={(e) => setNoteDraft(e.target.value)}
                        placeholder="Add your trick, formula reminder, or mistake note..."
                        className="flex-1 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs outline-none focus:border-orange-500 dark:border-neutral-700 dark:bg-neutral-800 dark:text-white"
                      />
                      <div className="flex gap-1.5">
                        <button
                          type="button"
                          onClick={() => void handleSaveNote(bm)}
                          className="rounded-lg bg-orange-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-orange-700"
                        >
                          Save Note
                        </button>
                        <button
                          type="button"
                          onClick={() => setEditingNoteId(null)}
                          className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-semibold text-slate-600 dark:border-neutral-700 dark:text-neutral-300"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center justify-between gap-2 text-xs">
                      <span className="text-slate-600 dark:text-neutral-300">
                        {bm.userNote ? (
                          <>
                            <strong className="text-slate-800 dark:text-white">Note:</strong>{' '}
                            {bm.userNote}
                          </>
                        ) : (
                          <span className="italic text-slate-400">No personal note added</span>
                        )}
                      </span>
                      <button
                        type="button"
                        onClick={() => {
                          setEditingNoteId(bm.id);
                          setNoteDraft(bm.userNote ?? '');
                        }}
                        className="font-semibold text-orange-600 hover:underline dark:text-orange-400"
                      >
                        {bm.userNote ? 'Edit Note' : '+ Add Note'}
                      </button>
                    </div>
                  )}
                </div>
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
};
