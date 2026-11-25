import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  AlertCircle,
  ArrowLeft,
  CheckCircle2,
  ClipboardCopy,
  Code2,
  Download,
  FileJson,
  Layers,
  Play,
  Plus,
  Save,
  Sliders,
  Sparkles,
  Trash2,
  Upload,
} from 'lucide-react';
import { DEFAULT_EXAM_SETTINGS, INDIAN_EXAM_PRESETS } from '../../constants/examPresets';
import { useApp } from '../../context/AppContext';
import type {
  DifficultyLevel,
  ExamDefinition,
  ExamLanguage,
  ExamSection,
  ExamSettings,
  Question,
} from '../../types/exam';
import { cn } from '../../utils/cn';
import {
  downloadTextFile,
  formatMarks,
  generateId,
  getLocalizedText,
  optionIndexToLetter,
} from '../../utils/formatters';
import {
  AI_CONVERTER_PROMPT,
  SIMPLE_TEMPLATE_JSON,
  exportExamToJson,
  parseExamJson,
} from '../../utils/jsonParser';
import { getTotalExamQuestions, getTotalMaxMarks } from '../../utils/scoring';
import { MathText } from '../common/MathText';

interface ExamBuilderProps {
  examId?: string;
}

function createEmptyExam(): ExamDefinition {
  const secId = generateId('sec');
  const qId = generateId('q');
  return {
    id: generateId('exam'),
    title: 'New Custom Mock Test',
    category: 'Custom',
    languages: ['en'],
    settings: { ...DEFAULT_EXAM_SETTINGS },
    sections: [
      {
        id: secId,
        name: 'General Section',
        durationMinutes: 30,
        questions: [
          {
            id: qId,
            sectionId: secId,
            type: 'single',
            topic: 'General',
            difficulty: 'medium',
            question: 'Sample question: Which city is the capital of India?',
            options: ['Mumbai', 'New Delhi', 'Kolkata', 'Chennai'],
            correctIndices: [1],
            explanation: 'New Delhi is the capital city of India.',
          },
        ],
      },
    ],
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };
}

export const ExamBuilder: React.FC<ExamBuilderProps> = ({ examId }) => {
  const { exams, upsertExam, navigate, showToast } = useApp();

  const existingExam = useMemo(
    () => (examId ? exams.find((e) => e.id === examId) : undefined),
    [exams, examId]
  );

  const [draft, setDraft] = useState<ExamDefinition>(() =>
    existingExam ? JSON.parse(JSON.stringify(existingExam)) : createEmptyExam()
  );

  const [activeTab, setActiveTab] = useState<'json' | 'config' | 'questions'>(() =>
    examId ? 'config' : 'json'
  );

  const [jsonText, setJsonText] = useState<string>(() =>
    existingExam ? exportExamToJson(existingExam) : SIMPLE_TEMPLATE_JSON
  );
  // Start dirty for new exam so sample template can be applied immediately if user clicks top Save
  const [jsonDirty, setJsonDirty] = useState<boolean>(() => !examId);

  const [selectedSectionIdx, setSelectedSectionIdx] = useState(0);
  const [selectedQuestionIdx, setSelectedQuestionIdx] = useState(0);
  const [editLang, setEditLang] = useState<ExamLanguage>('en');
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (existingExam) {
      const cloned: ExamDefinition = JSON.parse(JSON.stringify(existingExam));
      setDraft(cloned);
      setJsonText(exportExamToJson(cloned));
      setJsonDirty(false);
      setSelectedSectionIdx(0);
      setSelectedQuestionIdx(0);
    }
  }, [existingExam?.id]);

  const jsonValidation = useMemo(() => parseExamJson(jsonText), [jsonText]);

  const buildMergedFromJson = (): ExamDefinition | null => {
    if (!jsonValidation.ok || !jsonValidation.exam) return null;
    const parsed = jsonValidation.exam;
    return {
      ...parsed,
      id: existingExam ? existingExam.id : parsed.id || generateId('exam'),
      isBuiltIn: existingExam ? existingExam.isBuiltIn : false,
      sourceFile: existingExam?.sourceFile,
      sourceHash: existingExam?.sourceHash,
      createdAt: existingExam ? existingExam.createdAt : Date.now(),
      updatedAt: Date.now(),
    };
  };

  const handleApplyJson = (launchImmediately = false) => {
    const mergedExam = buildMergedFromJson();
    if (!mergedExam) {
      showToast('Please fix JSON validation errors first.', 'error');
      return;
    }

    setDraft(mergedExam);
    setJsonDirty(false);
    setSelectedSectionIdx(0);
    setSelectedQuestionIdx(0);

    if (launchImmediately) {
      void upsertExam(mergedExam).then(() => {
        showToast('Exam saved! Launching CBT simulator...', 'success');
        navigate(`/exam/${encodeURIComponent(mergedExam.id)}?fresh=1`);
      });
    } else {
      setActiveTab('config');
      showToast(
        `Loaded ${jsonValidation.summary?.questionCount ?? 0} questions across ${jsonValidation.summary?.sectionCount ?? 0} section(s).`,
        'success'
      );
    }
  };

  const handleFileUpload = (file: File) => {
    const MAX_JSON_BYTES = 25 * 1024 * 1024;
    if (file.size > MAX_JSON_BYTES) {
      showToast('File exceeds the 25 MB limit. Please upload a smaller JSON file.', 'error');
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        setJsonText(reader.result);
        setJsonDirty(true);
        setActiveTab('json');
        showToast(`Loaded "${file.name}" into JSON editor.`, 'info');
      }
    };
    reader.onerror = () => {
      showToast(`Could not read "${file.name}". Please try again.`, 'error');
    };
    reader.readAsText(file);
  };

  const handleSaveDraft = async (andStart = false) => {
    let targetDraft = draft;

    // If user edited JSON directly in Tab 1 and clicked header Save, validate & apply JSON seamlessly
    if (activeTab === 'json' && jsonDirty) {
      const merged = buildMergedFromJson();
      if (!merged) {
        showToast('Please fix the JSON validation errors before saving.', 'error');
        return;
      }
      targetDraft = merged;
      setDraft(merged);
      setJsonDirty(false);
    }

    if (!targetDraft.title.trim()) {
      showToast('Please enter an exam title.', 'error');
      return;
    }
    const totalQ = getTotalExamQuestions(targetDraft);
    if (totalQ === 0) {
      showToast('Exam must contain at least 1 question.', 'error');
      return;
    }

    // Validate sections, question text, options, and answer keys before persisting
    for (let sIdx = 0; sIdx < targetDraft.sections.length; sIdx++) {
      const sec = targetDraft.sections[sIdx];
      if (!sec.name.trim()) {
        showToast(`Section #${sIdx + 1} needs a non-empty name.`, 'error');
        return;
      }
      if (sec.questions.length === 0) {
        showToast(`Section "${sec.name}" must contain at least 1 question.`, 'error');
        return;
      }
      for (let qIdx = 0; qIdx < sec.questions.length; qIdx++) {
        const q = sec.questions[qIdx];
        const qTextEn = getLocalizedText(q.question, 'en').trim();
        const qTextHi = getLocalizedText(q.question, 'hi').trim();
        if (!qTextEn && !qTextHi) {
          showToast(`Section "${sec.name}" Q${qIdx + 1} has empty question text.`, 'error');
          return;
        }
        if (q.options.length < 2) {
          showToast(`Section "${sec.name}" Q${qIdx + 1} must have at least 2 options.`, 'error');
          return;
        }
        for (let oIdx = 0; oIdx < q.options.length; oIdx++) {
          const optEn = getLocalizedText(q.options[oIdx], 'en').trim();
          const optHi = getLocalizedText(q.options[oIdx], 'hi').trim();
          if (!optEn && !optHi) {
            showToast(
              `Section "${sec.name}" Q${qIdx + 1} Option (${optionIndexToLetter(oIdx)}) cannot be empty.`,
              'error'
            );
            return;
          }
        }
        if (
          q.correctIndices.length === 0 ||
          q.correctIndices.some((ci) => ci < 0 || ci >= q.options.length)
        ) {
          showToast(`Section "${sec.name}" Q${qIdx + 1} needs a valid correct option.`, 'error');
          return;
        }
      }
    }

    const toSave: ExamDefinition = {
      ...targetDraft,
      title: targetDraft.title.trim(),
      category: targetDraft.category.trim() || 'Custom',
      updatedAt: Date.now(),
    };
    await upsertExam(toSave);
    setDraft(toSave);
    setJsonText(exportExamToJson(toSave));
    setJsonDirty(false);
    showToast('Exam saved to persistent storage!', 'success');
    if (andStart) {
      navigate(`/exam/${encodeURIComponent(toSave.id)}?fresh=1`);
    }
  };

  const handleSwitchTab = (tab: 'json' | 'config' | 'questions') => {
    if (tab === activeTab) return;
    if (activeTab === 'json' && jsonDirty) {
      const merged = buildMergedFromJson();
      if (merged) {
        setDraft(merged);
        setJsonDirty(false);
        setSelectedSectionIdx(0);
        setSelectedQuestionIdx(0);
      } else {
        showToast(
          'JSON has validation errors — switched view without overwriting your JSON draft.',
          'info'
        );
      }
    } else if (tab === 'json' && !jsonDirty) {
      setJsonText(exportExamToJson(draft));
    }
    setActiveTab(tab);
  };

  const updateSettings = (patch: Partial<ExamSettings>) => {
    setDraft((prev) => {
      const nextSettings = { ...prev.settings, ...patch };
      let nextSections = prev.sections;
      if (patch.sectionalTiming === true) {
        const defaultPerSec = Math.max(
          5,
          Math.round((nextSettings.durationMinutes || 60) / Math.max(1, prev.sections.length))
        );
        nextSections = prev.sections.map((s) => ({
          ...s,
          durationMinutes: s.durationMinutes && s.durationMinutes > 0 ? s.durationMinutes : defaultPerSec,
        }));
      }
      return {
        ...prev,
        settings: nextSettings,
        sections: nextSections,
      };
    });
    setJsonDirty(false);
  };

  const applyPreset = (presetId: string) => {
    const preset = INDIAN_EXAM_PRESETS.find((p) => p.id === presetId);
    if (!preset) return;
    setDraft((prev) => {
      const nextSettings = { ...prev.settings, ...preset.settings };
      const defaultPerSec = Math.max(
        5,
        Math.round((nextSettings.durationMinutes || 60) / Math.max(1, prev.sections.length))
      );
      // Clear section-level mark overrides so the chosen exam preset governs scoring uniformly
      const nextSections = prev.sections.map((s) => ({
        ...s,
        defaultMarks: undefined,
        defaultNegativeMarks: undefined,
        durationMinutes: nextSettings.sectionalTiming
          ? s.durationMinutes && s.durationMinutes > 0
            ? s.durationMinutes
            : defaultPerSec
          : s.durationMinutes,
      }));
      return {
        ...prev,
        category: preset.category,
        settings: nextSettings,
        sections: nextSections,
      };
    });
    setJsonDirty(false);
    showToast(`Applied ${preset.name} preset.`, 'info');
  };

  const safeSectionIdx = Math.min(selectedSectionIdx, Math.max(0, draft.sections.length - 1));
  const activeSection = draft.sections[safeSectionIdx];
  const safeQuestionIdx = activeSection
    ? Math.min(selectedQuestionIdx, Math.max(0, activeSection.questions.length - 1))
    : 0;
  const activeQuestion = activeSection?.questions[safeQuestionIdx];

  const updateSection = (sIdx: number, updater: (sec: ExamSection) => ExamSection) => {
    setDraft((prev) => ({
      ...prev,
      sections: prev.sections.map((s, idx) => (idx === sIdx ? updater(s) : s)),
    }));
    setJsonDirty(false);
  };

  const updateActiveQuestion = (updater: (q: Question) => Question) => {
    if (!activeSection || !activeQuestion) return;
    updateSection(safeSectionIdx, (sec) => ({
      ...sec,
      questions: sec.questions.map((q, idx) => (idx === safeQuestionIdx ? updater(q) : q)),
    }));
  };

  const handleAddSection = () => {
    const newSec: ExamSection = {
      id: generateId('sec'),
      name: `Section ${draft.sections.length + 1}`,
      durationMinutes: 20,
      questions: [
        {
          id: generateId('q'),
          sectionId: '',
          type: 'single',
          question: 'New question text...',
          options: ['Option A', 'Option B', 'Option C', 'Option D'],
          correctIndices: [0],
        },
      ],
    };
    newSec.questions[0].sectionId = newSec.id;
    setDraft((prev) => ({
      ...prev,
      sections: [...prev.sections, newSec],
    }));
    setJsonDirty(false);
    setSelectedSectionIdx(draft.sections.length);
    setSelectedQuestionIdx(0);
  };

  const handleAddQuestion = () => {
    if (!activeSection) return;
    const newQ: Question = {
      id: generateId('q'),
      sectionId: activeSection.id,
      type: 'single',
      topic: 'General',
      difficulty: 'medium',
      question: 'Enter your question here...',
      options: ['Option A', 'Option B', 'Option C', 'Option D'],
      correctIndices: [0],
      explanation: '',
    };
    updateSection(safeSectionIdx, (sec) => ({
      ...sec,
      questions: [...sec.questions, newQ],
    }));
    setSelectedQuestionIdx(activeSection.questions.length);
  };

  const handleDeleteQuestion = (qIdx: number) => {
    if (!activeSection || activeSection.questions.length <= 1) {
      showToast('Each section needs at least 1 question.', 'error');
      return;
    }
    updateSection(safeSectionIdx, (sec) => ({
      ...sec,
      questions: sec.questions.filter((_, i) => i !== qIdx),
    }));
    setSelectedQuestionIdx(Math.max(0, qIdx - 1));
  };

  const handleCopyPrompt = async () => {
    try {
      await navigator.clipboard.writeText(AI_CONVERTER_PROMPT);
      showToast('AI JSON Converter Prompt copied to clipboard!', 'success');
    } catch {
      showToast('Could not access clipboard.', 'error');
    }
  };

  const handleDownloadJson = () => {
    const out = activeTab === 'json' && jsonDirty ? jsonText : exportExamToJson(draft);
    const baseName = draft.title.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '');
    downloadTextFile(`${baseName || 'exam'}.json`, out);
  };

  const updateLocalizedField = (
    current: Question['question'] | undefined,
    value: string,
    lang: ExamLanguage
  ): Question['question'] => {
    if (lang === 'en') {
      if (typeof current === 'object' && current !== null) {
        return { ...current, en: value };
      }
      return value;
    }
    const enVal = typeof current === 'object' && current !== null ? current.en : current ?? '';
    return { en: enVal, hi: value };
  };

  const updateOptionalLocalizedField = (
    current: Question['question'] | undefined,
    value: string,
    lang: ExamLanguage
  ): Question['question'] | undefined => {
    const currentEn = typeof current === 'object' && current !== null ? current.en : current ?? '';
    const currentHi = typeof current === 'object' && current !== null ? current.hi ?? '' : '';
    const nextEn = lang === 'en' ? value : currentEn;
    const nextHi = lang === 'hi' ? value : currentHi;

    if (!nextEn.trim() && !nextHi.trim()) {
      return undefined;
    }
    if (nextHi.trim()) {
      return { en: nextEn, hi: nextHi };
    }
    return nextEn;
  };

  const ensureHindiEnabledOnDraft = () => {
    setDraft((prev) =>
      prev.languages.includes('hi') ? prev : { ...prev, languages: ['en', 'hi'] }
    );
  };

  if (examId && !existingExam) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-16 text-center">
        <h1 className="text-xl font-bold text-slate-900 dark:text-white">Exam Not Found</h1>
        <p className="mt-2 text-sm text-slate-500 dark:text-neutral-400">
          The exam you tried to edit no longer exists in local storage.
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

  return (
    <div className="mx-auto max-w-7xl space-y-5 px-4 py-6 sm:px-6">
      {/* Header Bar */}
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
              {existingExam ? `Edit: ${draft.title}` : 'Import JSON & Exam Builder'}
            </h1>
            <p className="text-xs text-slate-500 dark:text-neutral-400">
              {getTotalExamQuestions(draft)} Questions • {draft.sections.length} Section(s) •{' '}
              {formatMarks(getTotalMaxMarks(draft))} Max Marks
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={handleDownloadJson}
            className="flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-200 dark:hover:bg-neutral-800"
          >
            <Download className="h-4 w-4" />
            Export JSON
          </button>
          <button
            type="button"
            onClick={() => void handleSaveDraft(false)}
            className="flex items-center gap-1.5 rounded-lg border border-orange-200 bg-orange-50 px-4 py-2 text-xs font-bold text-orange-800 hover:bg-orange-100 dark:border-orange-800 dark:bg-orange-950/60 dark:text-orange-300 dark:hover:bg-orange-900/60"
          >
            <Save className="h-4 w-4" />
            Save Exam
          </button>
          <button
            type="button"
            onClick={() => void handleSaveDraft(true)}
            className="flex items-center gap-1.5 rounded-lg bg-orange-600 px-4 py-2 text-xs font-bold text-white shadow hover:bg-orange-700"
          >
            <Play className="h-4 w-4" />
            Save &amp; Start CBT
          </button>
        </div>
      </div>

      {/* Mode Tabs */}
      <div className="flex flex-wrap gap-2 border-b border-slate-200 pb-3 dark:border-neutral-800">
        <button
          type="button"
          onClick={() => handleSwitchTab('json')}
          className={cn(
            'flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold transition',
            activeTab === 'json'
              ? 'bg-orange-600 text-white shadow-xs'
              : 'border border-slate-200 bg-white text-slate-600 hover:bg-slate-100 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-300 dark:hover:bg-neutral-800'
          )}
        >
          <Code2 className="h-4 w-4" />
          1. Plug In / Import JSON
        </button>
        <button
          type="button"
          onClick={() => handleSwitchTab('config')}
          className={cn(
            'flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold transition',
            activeTab === 'config'
              ? 'bg-orange-600 text-white shadow-xs'
              : 'border border-slate-200 bg-white text-slate-600 hover:bg-slate-100 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-300 dark:hover:bg-neutral-800'
          )}
        >
          <Sliders className="h-4 w-4" />
          2. Time, Negative Marking &amp; Options
        </button>
        <button
          type="button"
          onClick={() => handleSwitchTab('questions')}
          className={cn(
            'flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold transition',
            activeTab === 'questions'
              ? 'bg-orange-600 text-white shadow-xs'
              : 'border border-slate-200 bg-white text-slate-600 hover:bg-slate-100 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-300 dark:hover:bg-neutral-800'
          )}
        >
          <Layers className="h-4 w-4" />
          3. Visual Question Editor ({getTotalExamQuestions(draft)})
        </button>
      </div>

      {/* TAB 1: JSON IMPORT & LIVE VALIDATOR */}
      {activeTab === 'json' && (
        <div className="grid gap-5 lg:grid-cols-3">
          <div className="space-y-3 lg:col-span-2">
            {/* Upload / Drag Drop Bar */}
            <div
              onDragOver={(e) => {
                e.preventDefault();
                setDragActive(true);
              }}
              onDragLeave={() => setDragActive(false)}
              onDrop={(e) => {
                e.preventDefault();
                setDragActive(false);
                const file = e.dataTransfer.files?.[0];
                if (file) handleFileUpload(file);
              }}
              className={cn(
                'flex flex-wrap items-center justify-between gap-3 rounded-xl border-2 border-dashed p-4 transition',
                dragActive
                  ? 'border-orange-500 bg-orange-50 dark:bg-orange-950/30'
                  : 'border-slate-300 bg-white hover:border-slate-400 dark:border-neutral-700 dark:bg-neutral-900 dark:hover:border-neutral-600'
              )}
            >
              <div className="flex items-center gap-3">
                <div className="rounded-lg bg-orange-50 p-2.5 text-orange-700 dark:bg-orange-950 dark:text-orange-400">
                  <FileJson className="h-5 w-5" />
                </div>
                <div>
                  <div className="text-sm font-bold text-slate-900 dark:text-white">
                    Paste JSON below or Drop a `.json` file here
                  </div>
                  <div className="text-xs text-slate-500 dark:text-neutral-400">
                    Supports flat question arrays, multi-section papers, Hindi/English, LaTeX math,
                    passages &amp; SVG diagrams.
                  </div>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".json,application/json"
                  className="hidden"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) handleFileUpload(f);
                    e.target.value = '';
                  }}
                />
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="flex items-center gap-1.5 rounded-lg border border-slate-300 bg-slate-50 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-100 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-200 dark:hover:bg-neutral-700"
                >
                  <Upload className="h-3.5 w-3.5" />
                  Upload .json
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setJsonText(SIMPLE_TEMPLATE_JSON);
                    setJsonDirty(true);
                  }}
                  className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-200 dark:hover:bg-neutral-700"
                >
                  Load Sample
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setJsonText(exportExamToJson(draft));
                    setJsonDirty(false);
                  }}
                  className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-200 dark:hover:bg-neutral-700"
                >
                  Sync from Editor
                </button>
              </div>
            </div>

            <textarea
              value={jsonText}
              onChange={(e) => {
                setJsonText(e.target.value);
                setJsonDirty(true);
              }}
              spellCheck={false}
              rows={20}
              placeholder="Paste your questions JSON here..."
              className="w-full rounded-xl border border-slate-300 bg-neutral-950 p-4 font-mono text-xs leading-relaxed text-slate-100 outline-none focus:border-orange-500 dark:border-neutral-700"
            />
          </div>

          {/* Right Validation & Quick Actions Column */}
          <div className="space-y-4">
            <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-xs dark:border-neutral-800 dark:bg-neutral-900">
              <h2 className="text-sm font-bold text-slate-900 dark:text-white">
                JSON Validation Status
              </h2>

              {jsonValidation.ok && jsonValidation.summary ? (
                <div className="mt-3 space-y-3">
                  <div className="flex items-start gap-2 rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-xs text-emerald-900 dark:border-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-200">
                    <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
                    <div>
                      <div className="font-bold">Valid Exam JSON Ready!</div>
                      <div className="mt-1 space-y-0.5">
                        <div>
                          Title: <strong>{jsonValidation.exam?.title}</strong>
                        </div>
                        <div>
                          Sections: <strong>{jsonValidation.summary.sectionCount}</strong> •
                          Questions: <strong>{jsonValidation.summary.questionCount}</strong>
                        </div>
                        {jsonValidation.summary.bilingualCount > 0 && (
                          <div>
                            Bilingual (EN/HI):{' '}
                            <strong>{jsonValidation.summary.bilingualCount} Qs</strong>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {jsonValidation.warnings.length > 0 && (
                    <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900 dark:border-amber-800 dark:bg-amber-950/50 dark:text-amber-200">
                      <div className="font-bold">Warnings ({jsonValidation.warnings.length}):</div>
                      <ul className="mt-1 list-disc space-y-1 pl-4">
                        {jsonValidation.warnings.slice(0, 5).map((w, i) => (
                          <li key={i}>{w}</li>
                        ))}
                      </ul>
                      {jsonValidation.repairedJson && (
                        <button
                          type="button"
                          onClick={() => {
                            setJsonText(jsonValidation.repairedJson!);
                            setJsonDirty(true);
                            showToast('Updated editor with strict JSON escapes.', 'success');
                          }}
                          className="mt-2 rounded bg-amber-700 px-2.5 py-1 text-[11px] font-semibold text-white hover:bg-amber-800"
                        >
                          Update Editor with Clean Escapes
                        </button>
                      )}
                    </div>
                  )}

                  <div className="space-y-2 pt-1">
                    <button
                      type="button"
                      onClick={() => handleApplyJson(false)}
                      className="w-full rounded-lg border border-orange-600 bg-orange-50 py-2.5 text-xs font-bold text-orange-800 hover:bg-orange-100 dark:border-orange-700 dark:bg-orange-950/60 dark:text-orange-300 dark:hover:bg-orange-900/60"
                    >
                      Apply JSON &amp; Configure Settings →
                    </button>
                    <button
                      type="button"
                      onClick={() => handleApplyJson(true)}
                      className="flex w-full items-center justify-center gap-1.5 rounded-lg bg-orange-600 py-2.5 text-xs font-bold text-white shadow hover:bg-orange-700"
                    >
                      <Play className="h-4 w-4" />
                      Save &amp; Launch Exam Now
                    </button>
                  </div>
                </div>
              ) : (
                <div className="mt-3 rounded-lg border border-rose-200 bg-rose-50 p-3 text-xs text-rose-900 dark:border-rose-800 dark:bg-rose-950/50 dark:text-rose-200">
                  <div className="flex items-center gap-1.5 font-bold">
                    <AlertCircle className="h-4 w-4 text-rose-600 dark:text-rose-400" />
                    Errors Found ({jsonValidation.errors.length})
                  </div>
                  <ul className="mt-2 list-disc space-y-1 pl-4">
                    {jsonValidation.errors.slice(0, 8).map((err, idx) => (
                      <li key={idx}>{err}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>

            {/* AI Converter Helper Box */}
            <div className="rounded-xl border border-orange-200 bg-orange-50/70 p-4 text-xs text-orange-950 dark:border-orange-900/60 dark:bg-orange-950/30 dark:text-orange-100">
              <div className="flex items-center gap-1.5 font-bold text-orange-900 dark:text-orange-300">
                <Sparkles className="h-4 w-4 text-orange-600 dark:text-orange-400" />
                Convert PDF / Notes via AI
              </div>
              <p className="mt-1.5 leading-relaxed text-orange-900/80 dark:text-orange-200/80">
                Have questions in a PDF, textbook, or notes? Copy our schema prompt, paste it into
                ChatGPT / Gemini / Claude along with your questions, and paste the output JSON here!
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={handleCopyPrompt}
                  className="flex items-center gap-1.5 rounded-lg bg-orange-600 px-3 py-1.5 font-semibold text-white hover:bg-orange-700"
                >
                  <ClipboardCopy className="h-3.5 w-3.5" />
                  Copy AI Prompt
                </button>
                <button
                  type="button"
                  onClick={() => navigate('/format')}
                  className="rounded-lg border border-orange-300 bg-white px-3 py-1.5 font-semibold text-orange-800 hover:bg-orange-100 dark:border-orange-800 dark:bg-neutral-900 dark:text-orange-300 dark:hover:bg-neutral-800"
                >
                  Full Schema Guide
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: TIME, NEGATIVE MARKING & CBT OPTIONS */}
      {activeTab === 'config' && (
        <div className="space-y-6">
          {/* Indian Exam Presets */}
          <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs dark:border-neutral-800 dark:bg-neutral-900">
            <h2 className="text-sm font-bold text-slate-900 dark:text-white">
              Quick Indian Government Exam Presets
            </h2>
            <p className="mt-0.5 text-xs text-slate-500 dark:text-neutral-400">
              Click any exam board to auto-fill authentic duration, sectional timing, and negative
              marking rules.
            </p>
            <div className="mt-3 grid gap-2.5 sm:grid-cols-2 lg:grid-cols-4">
              {INDIAN_EXAM_PRESETS.map((preset) => (
                <button
                  key={preset.id}
                  type="button"
                  onClick={() => applyPreset(preset.id)}
                  className="rounded-xl border border-slate-200 bg-slate-50/70 p-3 text-left transition hover:border-orange-400 hover:bg-orange-50/50 dark:border-neutral-700 dark:bg-neutral-800/60 dark:hover:border-orange-600 dark:hover:bg-orange-950/30"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-bold text-slate-900 dark:text-white">
                      {preset.name}
                    </span>
                  </div>
                  <span className="mt-1 inline-block rounded bg-orange-100 px-2 py-0.5 text-[10px] font-bold text-orange-800 dark:bg-orange-950 dark:text-orange-300">
                    {preset.badge}
                  </span>
                  <p className="mt-1.5 text-[11px] leading-snug text-slate-600 dark:text-neutral-400">
                    {preset.description}
                  </p>
                </button>
              ))}
            </div>
          </section>

          <div className="grid gap-5 lg:grid-cols-2">
            {/* General Info & Timing */}
            <section className="space-y-4 rounded-xl border border-slate-200 bg-white p-5 shadow-xs dark:border-neutral-800 dark:bg-neutral-900">
              <h2 className="text-sm font-bold text-slate-900 dark:text-white">
                Exam Identity &amp; Timing
              </h2>

              <div className="grid gap-3 sm:grid-cols-2">
                <div className="sm:col-span-2">
                  <label className="mb-1 block text-xs font-semibold text-slate-700 dark:text-neutral-300">
                    Exam Title
                  </label>
                  <input
                    type="text"
                    value={draft.title}
                    onChange={(e) => {
                      setDraft({ ...draft, title: e.target.value });
                      setJsonDirty(false);
                    }}
                    className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-orange-500 dark:border-neutral-700 dark:bg-neutral-800 dark:text-white"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-semibold text-slate-700 dark:text-neutral-300">
                    Category / Exam Board
                  </label>
                  <input
                    type="text"
                    value={draft.category}
                    onChange={(e) => {
                      setDraft({ ...draft, category: e.target.value });
                      setJsonDirty(false);
                    }}
                    className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-orange-500 dark:border-neutral-700 dark:bg-neutral-800 dark:text-white"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-semibold text-slate-700 dark:text-neutral-300">
                    Target Cutoff (%)
                  </label>
                  <input
                    type="number"
                    min={0}
                    max={100}
                    value={draft.settings.cutoffPercent ?? 60}
                    onChange={(e) => {
                      const val = Number(e.target.value);
                      updateSettings({
                        cutoffPercent: Number.isFinite(val) ? Math.min(100, Math.max(0, val)) : 0,
                      });
                    }}
                    className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-orange-500 dark:border-neutral-700 dark:bg-neutral-800 dark:text-white"
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className="mb-1 block text-xs font-semibold text-slate-700 dark:text-neutral-300">
                    Subtitle / Description
                  </label>
                  <input
                    type="text"
                    value={draft.description ?? ''}
                    onChange={(e) => {
                      setDraft({ ...draft, description: e.target.value });
                      setJsonDirty(false);
                    }}
                    placeholder="Optional notes or paper syllabus..."
                    className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-orange-500 dark:border-neutral-700 dark:bg-neutral-800 dark:text-white"
                  />
                </div>
              </div>

              <div className="space-y-3 border-t border-slate-200 pt-4 dark:border-neutral-800">
                <label className="flex items-center justify-between gap-3 rounded-lg border border-slate-200 bg-slate-50 p-3 dark:border-neutral-700 dark:bg-neutral-800/60">
                  <div>
                    <div className="text-xs font-bold text-slate-900 dark:text-white">
                      Sectional Timing Mode (IBPS / SBI Style)
                    </div>
                    <div className="text-[11px] text-slate-500 dark:text-neutral-400">
                      Each section gets an independent countdown timer and auto-advances when time
                      ends.
                    </div>
                  </div>
                  <input
                    type="checkbox"
                    checked={draft.settings.sectionalTiming}
                    onChange={(e) => updateSettings({ sectionalTiming: e.target.checked })}
                    className="h-4 w-4 accent-orange-600"
                  />
                </label>

                {!draft.settings.sectionalTiming ? (
                  <div>
                    <label className="mb-1 block text-xs font-semibold text-slate-700 dark:text-neutral-300">
                      Total Duration (minutes — set 0 for Untimed Practice)
                    </label>
                    <input
                      type="number"
                      min={0}
                      max={600}
                      value={draft.settings.durationMinutes}
                      onChange={(e) => {
                        const val = Number(e.target.value);
                        updateSettings({
                          durationMinutes: Number.isFinite(val) ? Math.max(0, val) : 0,
                        });
                      }}
                      className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-orange-500 dark:border-neutral-700 dark:bg-neutral-800 dark:text-white"
                    />
                  </div>
                ) : (
                  <div className="space-y-2 rounded-lg border border-orange-200 bg-orange-50/60 p-3 dark:border-orange-900/60 dark:bg-orange-950/30">
                    <div className="text-xs font-bold text-orange-900 dark:text-orange-300">
                      Per-Section Time Limits (minutes)
                    </div>
                    {draft.sections.map((sec, idx) => (
                      <div key={sec.id} className="flex items-center justify-between gap-2">
                        <span className="truncate text-xs font-medium text-slate-800 dark:text-neutral-200">
                          {sec.name} ({sec.questions.length} Qs)
                        </span>
                        <input
                          type="number"
                          min={1}
                          max={300}
                          value={sec.durationMinutes ?? 20}
                          onChange={(e) => {
                            const val = Number(e.target.value);
                            updateSection(idx, (s) => ({
                              ...s,
                              durationMinutes: Number.isFinite(val) ? Math.max(1, val) : 1,
                            }));
                          }}
                          className="w-24 rounded border border-slate-300 bg-white px-2.5 py-1 text-xs font-semibold dark:border-neutral-700 dark:bg-neutral-800 dark:text-white"
                        />
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </section>

            {/* Marking Scheme & Conduct Options */}
            <section className="space-y-4 rounded-xl border border-slate-200 bg-white p-5 shadow-xs dark:border-neutral-800 dark:bg-neutral-900">
              <h2 className="text-sm font-bold text-slate-900 dark:text-white">
                Negative Marking &amp; Conduct Rules
              </h2>

              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <label className="mb-1 block text-xs font-semibold text-slate-700 dark:text-neutral-300">
                    Positive Marks (per Correct Q)
                  </label>
                  <input
                    type="number"
                    step="0.25"
                    min={0}
                    value={draft.settings.defaultMarks}
                    onChange={(e) => {
                      const val = Number(e.target.value);
                      updateSettings({
                        defaultMarks: Number.isFinite(val) ? Math.max(0, val) : 0,
                      });
                    }}
                    className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-orange-500 dark:border-neutral-700 dark:bg-neutral-800 dark:text-white"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-semibold text-slate-700 dark:text-neutral-300">
                    Negative Marks Deducted (per Wrong Q)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min={0}
                    value={draft.settings.defaultNegativeMarks}
                    onChange={(e) => {
                      const val = Number(e.target.value);
                      updateSettings({
                        defaultNegativeMarks: Number.isFinite(val) ? Math.max(0, val) : 0,
                      });
                    }}
                    className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-orange-500 dark:border-neutral-700 dark:bg-neutral-800 dark:text-white"
                  />
                  <div className="mt-1.5 flex flex-wrap gap-1">
                    {[
                      { label: 'None (0)', val: 0 },
                      { label: '0.25', val: 0.25 },
                      { label: '1/3 (0.33)', val: 0.3333 },
                      { label: '0.5', val: 0.5 },
                      { label: '2/3 (0.67)', val: 0.6667 },
                      { label: '1.0', val: 1 },
                    ].map((chip) => (
                      <button
                        key={chip.label}
                        type="button"
                        onClick={() => updateSettings({ defaultNegativeMarks: chip.val })}
                        className="rounded border border-slate-200 bg-slate-50 px-2 py-0.5 text-[10px] font-semibold text-slate-700 hover:border-orange-400 hover:bg-orange-50 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-300 dark:hover:border-orange-600 dark:hover:bg-orange-950/50"
                      >
                        {chip.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Toggles */}
              <div className="grid gap-2 sm:grid-cols-2">
                {[
                  {
                    key: 'evaluateMarkedAnswered' as const,
                    label: 'Evaluate "Answered & Marked"',
                    desc: 'Official TCS iON / SSC / IBPS rule',
                  },
                  {
                    key: 'shuffleQuestions' as const,
                    label: 'Shuffle Questions',
                    desc: 'Always enabled — randomized within sections',
                    lockedOn: true,
                  },
                  {
                    key: 'shuffleOptions' as const,
                    label: 'Shuffle Options',
                    desc: 'Always enabled — randomized A/B/C/D per attempt',
                    lockedOn: true,
                  },
                  {
                    key: 'autoSaveOnPaletteNav' as const,
                    label: 'Auto-save on Palette Click',
                    desc: 'Turn off for strict Save & Next mode',
                  },
                  {
                    key: 'allowPause' as const,
                    label: 'Allow Pause & Resume',
                    desc: 'Let student pause clock & save',
                  },
                  {
                    key: 'showCalculator' as const,
                    label: 'Scientific Calculator',
                    desc: 'On-screen GATE-style calculator',
                  },
                  {
                    key: 'showRoughPad' as const,
                    label: 'Digital Rough Sheet',
                    desc: 'Scratchpad modal inside exam',
                  },
                  {
                    key: 'practiceModeInstantCheck' as const,
                    label: 'Practice Instant Check',
                    desc: 'Allow revealing answer mid-test',
                  },
                  {
                    key: 'showLoginScreen' as const,
                    label: 'Candidate Login Screen',
                    desc: 'Authentic terminal sign-in step',
                  },
                  {
                    key: 'showInstructionsScreen' as const,
                    label: 'Instructions Screen',
                    desc: 'Official 5-symbol guide + agree',
                  },
                ].map((opt: { key: keyof ExamSettings; label: string; desc: string; lockedOn?: boolean }) => (
                  <label
                    key={opt.key}
                    className={cn(
                      'flex items-start justify-between gap-2 rounded-lg border border-slate-200 p-2.5 dark:border-neutral-700',
                      opt.lockedOn
                        ? 'cursor-default bg-slate-50/70 dark:bg-neutral-800/40'
                        : 'cursor-pointer hover:bg-slate-50 dark:hover:bg-neutral-800/60'
                    )}
                  >
                    <div>
                      <div className="text-xs font-bold text-slate-800 dark:text-neutral-100">
                        {opt.label}
                      </div>
                      <div className="text-[10px] text-slate-500 dark:text-neutral-400">
                        {opt.desc}
                      </div>
                    </div>
                    <input
                      type="checkbox"
                      checked={opt.lockedOn ? true : Boolean(draft.settings[opt.key])}
                      disabled={Boolean(opt.lockedOn)}
                      onChange={(e) => {
                        if (!opt.lockedOn) {
                          updateSettings({ [opt.key]: e.target.checked });
                        }
                      }}
                      className="mt-0.5 h-4 w-4 shrink-0 accent-orange-600 disabled:opacity-75"
                    />
                  </label>
                ))}
              </div>
            </section>
          </div>
        </div>
      )}

      {/* TAB 3: VISUAL QUESTION & SECTION EDITOR */}
      {activeTab === 'questions' && (
        <div className="grid gap-5 lg:grid-cols-12">
          {/* Left Navigator */}
          <div className="space-y-4 lg:col-span-4">
            <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-xs dark:border-neutral-800 dark:bg-neutral-900">
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-bold text-slate-900 dark:text-white">Sections</h2>
                <button
                  type="button"
                  onClick={handleAddSection}
                  className="flex items-center gap-1 rounded bg-orange-50 px-2.5 py-1 text-xs font-bold text-orange-700 hover:bg-orange-100 dark:bg-orange-950/60 dark:text-orange-300 dark:hover:bg-orange-900/60"
                >
                  <Plus className="h-3.5 w-3.5" /> Add Section
                </button>
              </div>
              <div className="mt-3 space-y-1.5">
                {draft.sections.map((sec, idx) => (
                  <div
                    key={sec.id}
                    className={cn(
                      'flex items-center justify-between gap-2 rounded-lg border px-3 py-2 text-xs',
                      idx === safeSectionIdx
                        ? 'border-orange-500 bg-orange-50 font-bold text-orange-900 dark:border-orange-600 dark:bg-orange-950/50 dark:text-orange-200'
                        : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-300 dark:hover:bg-neutral-700'
                    )}
                  >
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedSectionIdx(idx);
                        setSelectedQuestionIdx(0);
                      }}
                      className="flex-1 truncate text-left"
                    >
                      {sec.name} ({sec.questions.length})
                    </button>
                    {draft.sections.length > 1 && (
                      <button
                        type="button"
                        onClick={() => {
                          setDraft((prev) => ({
                            ...prev,
                            sections: prev.sections.filter((_, i) => i !== idx),
                          }));
                          setJsonDirty(false);
                          setSelectedSectionIdx(0);
                          setSelectedQuestionIdx(0);
                        }}
                        className="text-slate-400 hover:text-rose-600"
                        title={`Delete section ${sec.name}`}
                        aria-label={`Delete section ${sec.name}`}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {activeSection && (
              <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-xs dark:border-neutral-800 dark:bg-neutral-900">
                <label className="mb-1 block text-xs font-semibold text-slate-600 dark:text-neutral-400">
                  Selected Section Name
                </label>
                <input
                  type="text"
                  value={activeSection.name}
                  onChange={(e) =>
                    updateSection(safeSectionIdx, (s) => ({ ...s, name: e.target.value }))
                  }
                  className="mb-3 w-full rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm font-semibold dark:border-neutral-700 dark:bg-neutral-800 dark:text-white"
                />

                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-bold uppercase tracking-wide text-slate-600 dark:text-neutral-400">
                    Questions ({activeSection.questions.length})
                  </h3>
                  <button
                    type="button"
                    onClick={handleAddQuestion}
                    className="flex items-center gap-1 rounded bg-emerald-600 px-2.5 py-1 text-xs font-bold text-white hover:bg-emerald-700"
                  >
                    <Plus className="h-3.5 w-3.5" /> Add Q
                  </button>
                </div>

                <div className="mt-2.5 max-h-80 space-y-1.5 overflow-y-auto pr-1">
                  {activeSection.questions.map((q, qIdx) => (
                    <div
                      key={q.id}
                      className={cn(
                        'flex items-center justify-between gap-2 rounded-lg border px-2.5 py-2 text-xs',
                        qIdx === safeQuestionIdx
                          ? 'border-orange-600 bg-orange-50 text-orange-950 dark:border-orange-500 dark:bg-orange-950/50 dark:text-orange-200'
                          : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-300 dark:hover:bg-neutral-700'
                      )}
                    >
                      <button
                        type="button"
                        onClick={() => setSelectedQuestionIdx(qIdx)}
                        className="min-w-0 flex-1 truncate text-left font-medium"
                      >
                        <span className="mr-1.5 font-bold">Q{qIdx + 1}.</span>
                        {getLocalizedText(q.question, 'en')}
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeleteQuestion(qIdx)}
                        className="shrink-0 text-slate-400 hover:text-rose-600"
                        title={`Delete question ${qIdx + 1}`}
                        aria-label={`Delete question ${qIdx + 1}`}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Right Active Question Editor */}
          <div className="lg:col-span-8">
            {activeQuestion ? (
              <div className="space-y-4 rounded-xl border border-slate-200 bg-white p-5 shadow-xs dark:border-neutral-800 dark:bg-neutral-900">
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 pb-3 dark:border-neutral-800">
                  <h2 className="text-base font-bold text-slate-900 dark:text-white">
                    Editing Question {safeQuestionIdx + 1} ({activeSection.name})
                  </h2>
                  <div className="flex flex-wrap items-center gap-2 text-xs">
                    <div className="flex overflow-hidden rounded border border-slate-300 dark:border-neutral-700">
                      {(['en', 'hi'] as const).map((l) => (
                        <button
                          key={l}
                          type="button"
                          onClick={() => {
                            if (l === 'hi') ensureHindiEnabledOnDraft();
                            setEditLang(l);
                          }}
                          className={cn(
                            'px-2.5 py-1 font-semibold',
                            editLang === l
                              ? 'bg-orange-600 text-white'
                              : 'bg-white text-slate-700 hover:bg-slate-50 dark:bg-neutral-800 dark:text-neutral-300'
                          )}
                        >
                          {l === 'en' ? 'English' : 'Hindi (हिन्दी)'}
                        </button>
                      ))}
                    </div>
                    <select
                      value={activeQuestion.type}
                      onChange={(e) =>
                        updateActiveQuestion((q) => ({
                          ...q,
                          type: e.target.value as 'single' | 'multi',
                          correctIndices:
                            e.target.value === 'single'
                              ? [q.correctIndices[0] ?? 0]
                              : q.correctIndices,
                        }))
                      }
                      className="rounded border border-slate-300 bg-white px-2.5 py-1 font-semibold dark:border-neutral-700 dark:bg-neutral-800 dark:text-white"
                    >
                      <option value="single">Single Choice (MCQ)</option>
                      <option value="multi">Multiple Select (MSQ)</option>
                    </select>
                  </div>
                </div>

                <div className="grid gap-3 sm:grid-cols-4">
                  <div>
                    <label className="mb-1 block text-xs font-semibold text-slate-600 dark:text-neutral-400">
                      Topic Tag
                    </label>
                    <input
                      type="text"
                      value={activeQuestion.topic ?? ''}
                      onChange={(e) =>
                        updateActiveQuestion((q) => ({ ...q, topic: e.target.value }))
                      }
                      placeholder="e.g. Algebra"
                      className="w-full rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm dark:border-neutral-700 dark:bg-neutral-800 dark:text-white"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-semibold text-slate-600 dark:text-neutral-400">
                      Difficulty
                    </label>
                    <select
                      value={activeQuestion.difficulty ?? 'medium'}
                      onChange={(e) =>
                        updateActiveQuestion((q) => ({
                          ...q,
                          difficulty: e.target.value as DifficultyLevel,
                        }))
                      }
                      className="w-full rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-sm dark:border-neutral-700 dark:bg-neutral-800 dark:text-white"
                    >
                      <option value="easy">Easy</option>
                      <option value="medium">Medium</option>
                      <option value="hard">Hard</option>
                    </select>
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-semibold text-slate-600 dark:text-neutral-400">
                      Marks Override
                    </label>
                    <input
                      type="number"
                      step="0.25"
                      min={0}
                      placeholder={`Default (${draft.settings.defaultMarks})`}
                      value={activeQuestion.marks ?? ''}
                      onChange={(e) => {
                        const raw = e.target.value;
                        const num = Number(raw);
                        updateActiveQuestion((q) => ({
                          ...q,
                          marks:
                            raw === '' ? undefined : Number.isFinite(num) ? Math.max(0, num) : q.marks,
                        }));
                      }}
                      className="w-full rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm dark:border-neutral-700 dark:bg-neutral-800 dark:text-white"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-semibold text-slate-600 dark:text-neutral-400">
                      Negative Override
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      min={0}
                      placeholder={`Default (${formatMarks(draft.settings.defaultNegativeMarks)})`}
                      value={activeQuestion.negativeMarks ?? ''}
                      onChange={(e) => {
                        const raw = e.target.value;
                        const num = Number(raw);
                        updateActiveQuestion((q) => ({
                          ...q,
                          negativeMarks:
                            raw === ''
                              ? undefined
                              : Number.isFinite(num)
                                ? Math.max(0, num)
                                : q.negativeMarks,
                        }));
                      }}
                      className="w-full rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm dark:border-neutral-700 dark:bg-neutral-800 dark:text-white"
                    />
                  </div>
                </div>

                <div>
                  <label className="mb-1 block text-xs font-semibold text-slate-600 dark:text-neutral-400">
                    Question Text ({editLang === 'hi' ? 'Hindi' : 'English'} — supports `$LaTeX$`
                    math, `**bold**`, Markdown tables)
                  </label>
                  <textarea
                    rows={3}
                    value={
                      editLang === 'hi'
                        ? typeof activeQuestion.question === 'object'
                          ? activeQuestion.question.hi ?? ''
                          : ''
                        : getLocalizedText(activeQuestion.question, 'en')
                    }
                    onChange={(e) =>
                      updateActiveQuestion((q) => ({
                        ...q,
                        question: updateLocalizedField(q.question, e.target.value, editLang),
                      }))
                    }
                    className="w-full rounded-lg border border-slate-300 bg-white p-2.5 text-sm outline-none focus:border-orange-500 dark:border-neutral-700 dark:bg-neutral-800 dark:text-white"
                  />
                </div>

                <div>
                  <label className="mb-1 block text-xs font-semibold text-slate-600 dark:text-neutral-400">
                    Optional Passage / Data Interpretation Context
                  </label>
                  <textarea
                    rows={2}
                    value={
                      editLang === 'hi'
                        ? typeof activeQuestion.passage === 'object'
                          ? activeQuestion.passage.hi ?? ''
                          : ''
                        : getLocalizedText(activeQuestion.passage, 'en')
                    }
                    onChange={(e) =>
                      updateActiveQuestion((q) => ({
                        ...q,
                        passage: updateOptionalLocalizedField(q.passage, e.target.value, editLang),
                      }))
                    }
                    placeholder="Leave empty for standalone questions..."
                    className="w-full rounded-lg border border-slate-300 bg-white p-2.5 text-xs outline-none focus:border-orange-500 dark:border-neutral-700 dark:bg-neutral-800 dark:text-white"
                  />
                </div>

                {/* Options & Correct Answer Selection */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-semibold text-slate-700 dark:text-neutral-300">
                      Options (click radio/checkbox to mark correct answer)
                    </label>
                    {activeQuestion.options.length < 8 && (
                      <button
                        type="button"
                        onClick={() =>
                          updateActiveQuestion((q) => ({
                            ...q,
                            options: [...q.options, `Option ${optionIndexToLetter(q.options.length)}`],
                          }))
                        }
                        className="text-xs font-semibold text-orange-600 hover:underline dark:text-orange-400"
                      >
                        + Add Option
                      </button>
                    )}
                  </div>

                  {activeQuestion.options.map((opt, oIdx) => {
                    const isCorrect = activeQuestion.correctIndices.includes(oIdx);
                    const optVal =
                      editLang === 'hi'
                        ? typeof opt === 'object'
                          ? opt.hi ?? ''
                          : ''
                        : getLocalizedText(opt, 'en');
                    return (
                      <div key={oIdx} className="flex items-center gap-2">
                        <input
                          type={activeQuestion.type === 'multi' ? 'checkbox' : 'radio'}
                          checked={isCorrect}
                          onChange={() =>
                            updateActiveQuestion((q) => {
                              if (q.type === 'single') {
                                return { ...q, correctIndices: [oIdx] };
                              }
                              const next = isCorrect
                                ? q.correctIndices.filter((x) => x !== oIdx)
                                : [...q.correctIndices, oIdx].sort((a, b) => a - b);
                              return {
                                ...q,
                                correctIndices: next.length > 0 ? next : [oIdx],
                              };
                            })
                          }
                          className="h-4 w-4 accent-emerald-600"
                          title="Mark as correct option"
                        />
                        <span className="w-6 text-xs font-bold text-slate-600 dark:text-neutral-400">
                          ({optionIndexToLetter(oIdx)})
                        </span>
                        <input
                          type="text"
                          value={optVal}
                          onChange={(e) =>
                            updateActiveQuestion((q) => ({
                              ...q,
                              options: q.options.map((existing, i) =>
                                i === oIdx
                                  ? updateLocalizedField(existing, e.target.value, editLang)
                                  : existing
                              ),
                            }))
                          }
                          className={cn(
                            'flex-1 rounded-lg border bg-white px-3 py-1.5 text-sm outline-none dark:bg-neutral-800 dark:text-white',
                            isCorrect
                              ? 'border-emerald-400 bg-emerald-50/50 dark:border-emerald-600 dark:bg-emerald-950/30'
                              : 'border-slate-300 dark:border-neutral-700'
                          )}
                        />
                        {activeQuestion.options.length > 2 && (
                          <button
                            type="button"
                            onClick={() =>
                              updateActiveQuestion((q) => {
                                const nextOpts = q.options.filter((_, i) => i !== oIdx);
                                const remapped = q.correctIndices
                                  .filter((ci) => ci !== oIdx)
                                  .map((ci) => (ci > oIdx ? ci - 1 : ci));
                                return {
                                  ...q,
                                  options: nextOpts,
                                  correctIndices: remapped.length > 0 ? remapped : [0],
                                };
                              })
                            }
                            className="text-slate-400 hover:text-rose-600"
                            title={`Remove option ${optionIndexToLetter(oIdx)}`}
                            aria-label={`Remove option ${optionIndexToLetter(oIdx)}`}
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>

                <div>
                  <label className="mb-1 block text-xs font-semibold text-slate-600 dark:text-neutral-400">
                    Solution / Explanation (shown after submission)
                  </label>
                  <textarea
                    rows={2}
                    value={
                      editLang === 'hi'
                        ? typeof activeQuestion.explanation === 'object'
                          ? activeQuestion.explanation.hi ?? ''
                          : ''
                        : getLocalizedText(activeQuestion.explanation, 'en')
                    }
                    onChange={(e) =>
                      updateActiveQuestion((q) => ({
                        ...q,
                        explanation: updateOptionalLocalizedField(
                          q.explanation,
                          e.target.value,
                          editLang
                        ),
                      }))
                    }
                    className="w-full rounded-lg border border-slate-300 bg-white p-2.5 text-sm outline-none focus:border-orange-500 dark:border-neutral-700 dark:bg-neutral-800 dark:text-white"
                  />
                </div>

                {/* Live KaTeX Preview */}
                <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 dark:border-neutral-700 dark:bg-neutral-800/70">
                  <div className="mb-1 text-[11px] font-bold uppercase tracking-wide text-slate-500 dark:text-neutral-400">
                    Live Math &amp; Markdown Preview
                  </div>
                  <MathText
                    text={getLocalizedText(activeQuestion.question, editLang)}
                    className="text-sm text-slate-900 dark:text-neutral-100"
                  />
                </div>
              </div>
            ) : null}
          </div>
        </div>
      )}
    </div>
  );
};
