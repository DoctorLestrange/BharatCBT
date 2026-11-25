import React, { useState } from 'react';
import { Check, ClipboardCopy, Code2, Download, FilePlus2, Sparkles } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { downloadTextFile } from '../../utils/formatters';
import { AI_CONVERTER_PROMPT, SIMPLE_TEMPLATE_JSON } from '../../utils/jsonParser';

const FULL_SECTIONED_TEMPLATE = `{
  "title": "IBPS PO Prelims Sectional Mock",
  "subtitle": "All India Pattern",
  "category": "IBPS / Banking",
  "durationMinutes": 60,
  "sectionalTiming": true,
  "defaultMarks": 1,
  "defaultNegativeMarks": 0.25,
  "evaluateMarkedAnswered": true,
  "passages": {
    "rc_upi": {
      "title": "Directions: Read the passage carefully.",
      "content": "Digital public infrastructure in India has accelerated low-cost retail payments..."
    }
  },
  "sections": [
    {
      "id": "eng",
      "name": "English Language",
      "durationMinutes": 20,
      "questions": [
        {
          "id": "e1",
          "passageId": "rc_upi",
          "topic": "Reading Comprehension",
          "difficulty": "easy",
          "question": "What has accelerated low-cost retail payments according to the passage?",
          "options": [
            "Paper cheques",
            "Digital public infrastructure",
            "Foreign currency reserves",
            "Gold bonds",
            "None of these"
          ],
          "correctOption": "B",
          "explanation": "The passage directly credits digital public infrastructure."
        }
      ]
    },
    {
      "id": "quant",
      "name": "Quantitative Aptitude",
      "durationMinutes": 20,
      "questions": [
        {
          "id": "q1",
          "topic": "Speed & Distance",
          "difficulty": "medium",
          "question": {
            "en": "A train $150\\\\text{ m}$ long passes a pole in $15\\\\text{ s}$. Find its speed in km/h.",
            "hi": "150 मीटर लंबी एक ट्रेन एक खंभे को 15 सेकंड में पार करती है। किमी/घंटा में इसकी गति ज्ञात कीजिए।"
          },
          "options": {
            "en": ["30 km/h", "36 km/h", "45 km/h", "54 km/h", "40 km/h"],
            "hi": ["30 किमी/घंटा", "36 किमी/घंटा", "45 किमी/घंटा", "54 किमी/घंटा", "40 किमी/घंटा"]
          },
          "correctIndex": 1,
          "explanation": "Speed = $150/15 = 10\\\\text{ m/s} = 10 \\\\times \\\\frac{18}{5} = 36\\\\text{ km/h}$."
        }
      ]
    }
  ]
}`;

export const JsonFormatGuide: React.FC = () => {
  const { navigate, showToast } = useApp();
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const copyText = async (id: string, text: string, label: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedId(id);
      showToast(`${label} copied to clipboard!`, 'success');
      window.setTimeout(() => setCopiedId(null), 2000);
    } catch {
      showToast('Clipboard permission denied.', 'error');
    }
  };

  const downloadFile = (filename: string, content: string) => {
    downloadTextFile(filename, content);
  };

  return (
    <div className="mx-auto max-w-5xl space-y-6 px-4 py-6 sm:px-6">
      <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-slate-200 bg-white p-6 shadow-xs dark:border-neutral-800 dark:bg-neutral-900">
        <div>
          <div className="inline-flex items-center gap-1.5 rounded-full bg-orange-50 px-3 py-1 text-xs font-bold text-orange-800 dark:bg-orange-950 dark:text-orange-300">
            <Code2 className="h-3.5 w-3.5" />
            Exam JSON Specification v1
          </div>
          <h1 className="mt-2 text-2xl font-extrabold text-slate-900 dark:text-white">
            How to Format Your Mock Exam JSON
          </h1>
          <p className="mt-1 text-sm text-slate-600 dark:text-neutral-400">
            Plug in either a simple flat list of questions or a complete multi-section Indian CBT
            paper with bilingual text, passages, LaTeX math, and negative marking.
          </p>
        </div>

        <button
          type="button"
          onClick={() => navigate('/builder')}
          className="flex items-center gap-2 rounded-xl bg-orange-600 px-5 py-2.5 text-sm font-bold text-white shadow hover:bg-orange-700"
        >
          <FilePlus2 className="h-4 w-4" />
          Open JSON Importer
        </button>
      </div>

      {/* AI Prompt Card */}
      <section className="rounded-2xl border border-orange-200 bg-gradient-to-br from-orange-50 to-amber-50 p-5 dark:border-orange-900/60 dark:from-orange-950/40 dark:to-neutral-900">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-orange-700 dark:text-orange-400" />
            <h2 className="text-base font-bold text-orange-950 dark:text-orange-200">
              Instant AI Prompt (ChatGPT / Gemini / Claude)
            </h2>
          </div>
          <button
            type="button"
            onClick={() => void copyText('prompt', AI_CONVERTER_PROMPT, 'AI Converter Prompt')}
            className="flex items-center gap-1.5 rounded-lg bg-orange-600 px-3.5 py-2 text-xs font-bold text-white hover:bg-orange-700"
          >
            {copiedId === 'prompt' ? (
              <Check className="h-3.5 w-3.5" />
            ) : (
              <ClipboardCopy className="h-3.5 w-3.5" />
            )}
            Copy Prompt
          </button>
        </div>
        <p className="mt-1.5 text-xs text-orange-900/80 dark:text-orange-200/80">
          Paste this prompt alongside your question bank text, PYQ PDF, or study notes into any AI
          assistant to generate ready-to-import BharatCBT JSON.
        </p>
        <pre className="mt-3 max-h-56 overflow-auto rounded-xl bg-neutral-950 p-4 font-mono text-xs text-slate-100">
          {AI_CONVERTER_PROMPT}
        </pre>
      </section>

      {/* Format 1: Simple Flat Format */}
      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs dark:border-neutral-800 dark:bg-neutral-900">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h2 className="text-base font-bold text-slate-900 dark:text-white">
              Option A: Simple Flat Format (Recommended for Quick Tests)
            </h2>
            <p className="text-xs text-slate-500 dark:text-neutral-400">
              Automatically groups questions by their optional `"section"` field. You can even paste
              a bare `[...]` array of question objects!
            </p>
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => downloadFile('simple_exam_template.json', SIMPLE_TEMPLATE_JSON)}
              className="flex items-center gap-1 rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 dark:border-neutral-700 dark:text-neutral-200 dark:hover:bg-neutral-800"
            >
              <Download className="h-3.5 w-3.5" /> .json
            </button>
            <button
              type="button"
              onClick={() => void copyText('simple', SIMPLE_TEMPLATE_JSON, 'Simple Template')}
              className="flex items-center gap-1 rounded-lg bg-orange-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-orange-700"
            >
              {copiedId === 'simple' ? (
                <Check className="h-3.5 w-3.5" />
              ) : (
                <ClipboardCopy className="h-3.5 w-3.5" />
              )}
              Copy JSON
            </button>
          </div>
        </div>
        <pre className="mt-3 max-h-80 overflow-auto rounded-xl bg-neutral-950 p-4 font-mono text-xs leading-relaxed text-emerald-300">
          {SIMPLE_TEMPLATE_JSON}
        </pre>
      </section>

      {/* Format 2: Full Multi-Section Format */}
      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs dark:border-neutral-800 dark:bg-neutral-900">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h2 className="text-base font-bold text-slate-900 dark:text-white">
              Option B: Full Multi-Section CBT Format (Sectional Timers, Passages &amp; Bilingual)
            </h2>
            <p className="text-xs text-slate-500 dark:text-neutral-400">
              Ideal for IBPS/SBI sectional timing, shared Reading Comprehension passages (`passages`),
              and English + Hindi (`en`/`hi`) bilingual papers.
            </p>
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => downloadFile('full_sectioned_template.json', FULL_SECTIONED_TEMPLATE)}
              className="flex items-center gap-1 rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 dark:border-neutral-700 dark:text-neutral-200 dark:hover:bg-neutral-800"
            >
              <Download className="h-3.5 w-3.5" /> .json
            </button>
            <button
              type="button"
              onClick={() => void copyText('full', FULL_SECTIONED_TEMPLATE, 'Full Sectioned Template')}
              className="flex items-center gap-1 rounded-lg bg-orange-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-orange-700"
            >
              {copiedId === 'full' ? (
                <Check className="h-3.5 w-3.5" />
              ) : (
                <ClipboardCopy className="h-3.5 w-3.5" />
              )}
              Copy JSON
            </button>
          </div>
        </div>
        <pre className="mt-3 max-h-96 overflow-auto rounded-xl bg-neutral-950 p-4 font-mono text-xs leading-relaxed text-orange-300">
          {FULL_SECTIONED_TEMPLATE}
        </pre>
      </section>

      {/* Supported Fields Reference */}
      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs dark:border-neutral-800 dark:bg-neutral-900">
        <h2 className="mb-3 text-base font-bold text-slate-900 dark:text-white">
          Supported Fields Reference
        </h2>
        <div className="overflow-x-auto">
          <table className="min-w-full border-collapse text-left text-xs">
            <thead className="bg-slate-100 text-slate-800 dark:bg-neutral-800 dark:text-neutral-100">
              <tr>
                <th className="border border-slate-200 px-3 py-2 font-bold dark:border-neutral-700">
                  Field
                </th>
                <th className="border border-slate-200 px-3 py-2 font-bold dark:border-neutral-700">
                  Type / Accepted Values
                </th>
                <th className="border border-slate-200 px-3 py-2 font-bold dark:border-neutral-700">
                  Description
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 text-slate-700 dark:divide-neutral-800 dark:text-neutral-300">
              <tr>
                <td className="border border-slate-200 px-3 py-2 font-mono font-semibold dark:border-neutral-700">
                  question
                </td>
                <td className="border border-slate-200 px-3 py-2 dark:border-neutral-700">
                  <code>string | &#123; en, hi &#125;</code>
                </td>
                <td className="border border-slate-200 px-3 py-2 dark:border-neutral-700">
                  Question prompt. Supports <code>$...$</code> LaTeX math, <code>**bold**</code>,
                  and Markdown tables.
                </td>
              </tr>
              <tr>
                <td className="border border-slate-200 px-3 py-2 font-mono font-semibold dark:border-neutral-700">
                  options
                </td>
                <td className="border border-slate-200 px-3 py-2 dark:border-neutral-700">
                  <code>string[] | &#123; en: string[], hi?: string[] &#125;</code>
                </td>
                <td className="border border-slate-200 px-3 py-2 dark:border-neutral-700">
                  2 to 8 choices (4 for SSC/UPSC, 5 for IBPS/Banking).
                </td>
              </tr>
              <tr>
                <td className="border border-slate-200 px-3 py-2 font-mono font-semibold dark:border-neutral-700">
                  correctIndex / correctOption / answer
                </td>
                <td className="border border-slate-200 px-3 py-2 dark:border-neutral-700">
                  <code>0..7</code> or <code>&quot;A&quot;..&quot;H&quot;</code> or exact option text
                </td>
                <td className="border border-slate-200 px-3 py-2 dark:border-neutral-700">
                  For MSQ (multiple select), set <code>&quot;type&quot;: &quot;multi&quot;</code>{' '}
                  and <code>&quot;correctIndices&quot;: [0, 2]</code>.
                </td>
              </tr>
              <tr>
                <td className="border border-slate-200 px-3 py-2 font-mono font-semibold dark:border-neutral-700">
                  marks / negativeMarks
                </td>
                <td className="border border-slate-200 px-3 py-2 dark:border-neutral-700">
                  <code>number</code> (positive magnitude)
                </td>
                <td className="border border-slate-200 px-3 py-2 dark:border-neutral-700">
                  Optional per-question or per-section override (e.g., <code>negativeMarks: 0.5</code>{' '}
                  subtracts 0.5 on wrong answers).
                </td>
              </tr>
              <tr>
                <td className="border border-slate-200 px-3 py-2 font-mono font-semibold dark:border-neutral-700">
                  passage / passageId
                </td>
                <td className="border border-slate-200 px-3 py-2 dark:border-neutral-700">
                  <code>string | &#123; en, hi &#125;</code>
                </td>
                <td className="border border-slate-200 px-3 py-2 dark:border-neutral-700">
                  Renders a split-pane Reading Comprehension or Data Interpretation view alongside
                  the question.
                </td>
              </tr>
              <tr>
                <td className="border border-slate-200 px-3 py-2 font-mono font-semibold dark:border-neutral-700">
                  svg / image
                </td>
                <td className="border border-slate-200 px-3 py-2 dark:border-neutral-700">
                  <code>string</code> (inline SVG or image URL / data URI)
                </td>
                <td className="border border-slate-200 px-3 py-2 dark:border-neutral-700">
                  Embed geometry diagrams, graphs, or charts safely inside the question.
                </td>
              </tr>
              <tr>
                <td className="border border-slate-200 px-3 py-2 font-mono font-semibold dark:border-neutral-700">
                  explanation / topic / difficulty
                </td>
                <td className="border border-slate-200 px-3 py-2 dark:border-neutral-700">
                  <code>string</code> (difficulty: easy | medium | hard)
                </td>
                <td className="border border-slate-200 px-3 py-2 dark:border-neutral-700">
                  Powers post-test topic analytics and step-by-step solution review.
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
};
