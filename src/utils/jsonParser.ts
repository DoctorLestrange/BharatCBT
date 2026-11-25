import { DEFAULT_EXAM_SETTINGS } from '../constants/examPresets';
import type {
  BilingualText,
  DifficultyLevel,
  ExamDefinition,
  ExamLanguage,
  ExamSection,
  ExamSettings,
  LocalizedText,
  Question,
  QuestionType,
} from '../types/exam';
import { generateId, hasHindiTranslation } from './formatters';

export interface ParseExamResult {
  ok: boolean;
  exam?: ExamDefinition;
  errors: string[];
  warnings: string[];
  repairedJson?: string;
  summary?: {
    sectionCount: number;
    questionCount: number;
    bilingualCount: number;
  };
}

const VALID_JSON_ESCAPES = new Set(['"', '\\', '/', 'b', 'f', 'n', 'r', 't']);

/**
 * Repairs common invalid escape sequences (such as unescaped LaTeX `\{`, `\}`, `\%`)
 * and literal control characters inside JSON string literals without modifying valid escapes.
 */
export function repairJsonStringLiterals(raw: string): {
  repaired: string;
  repairedCount: number;
  samples: string[];
} {
  let inString = false;
  let repairedCount = 0;
  const sampleSet = new Set<string>();
  const out: string[] = [];

  for (let i = 0; i < raw.length; i++) {
    const ch = raw[i];
    if (!inString) {
      if (ch === '"') inString = true;
      out.push(ch);
      continue;
    }

    if (ch === '"') {
      inString = false;
      out.push(ch);
      continue;
    }

    if (ch === '\n') {
      out.push('\\n');
      repairedCount++;
      sampleSet.add('newline');
      continue;
    }
    if (ch === '\r') {
      out.push('\\r');
      repairedCount++;
      sampleSet.add('carriage-return');
      continue;
    }
    if (ch === '\t') {
      out.push('\\t');
      repairedCount++;
      sampleSet.add('tab');
      continue;
    }
    const code = ch.charCodeAt(0);
    if (code < 0x20) {
      out.push(`\\u${code.toString(16).padStart(4, '0')}`);
      repairedCount++;
      if (sampleSet.size < 5) sampleSet.add(`U+${code.toString(16).padStart(4, '0').toUpperCase()}`);
      continue;
    }

    if (ch === '\\') {
      const next = raw[i + 1];
      if (next === undefined) {
        out.push('\\\\');
        repairedCount++;
        sampleSet.add('\\');
        continue;
      }
      if (VALID_JSON_ESCAPES.has(next)) {
        out.push('\\', next);
        i++;
        continue;
      }
      if (next === 'u' && /^[0-9a-fA-F]{4}$/.test(raw.slice(i + 2, i + 6))) {
        out.push(raw.slice(i, i + 6));
        i += 5;
        continue;
      }
      // Invalid escape (e.g. \{, \}, \%, \_) -> double-escape backslash
      out.push('\\\\', next);
      repairedCount++;
      if (sampleSet.size < 5) sampleSet.add(`\\${next}`);
      i++;
      continue;
    }

    out.push(ch);
  }

  return {
    repaired: out.join(''),
    repairedCount,
    samples: Array.from(sampleSet),
  };
}

function formatJsonSyntaxError(raw: string, message: string): string {
  const lineColMatch = /line\s+(\d+)\s+column\s+(\d+)/i.exec(message);
  if (lineColMatch) {
    const lineNum = Number(lineColMatch[1]);
    const colNum = Number(lineColMatch[2]);
    const lines = raw.split(/\r?\n/);
    const lineText = lines[lineNum - 1];
    if (lineText !== undefined) {
      const start = Math.max(0, colNum - 35);
      const end = Math.min(lineText.length, colNum + 35);
      const excerpt = lineText.slice(start, end);
      return `JSON syntax error: ${message} — near: "${excerpt}"`;
    }
  }
  return `JSON syntax error: ${message}`;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function normalizeLocalizedText(value: unknown): LocalizedText | undefined {
  if (typeof value === 'string') {
    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : undefined;
  }
  if (typeof value === 'number' || typeof value === 'boolean') {
    return String(value);
  }
  if (isRecord(value)) {
    const en = typeof value.en === 'string' ? value.en.trim() : '';
    const hi = typeof value.hi === 'string' ? value.hi.trim() : '';
    if (!en && !hi) return undefined;
    if (hi) {
      return { en: en || hi, hi };
    }
    return en;
  }
  return undefined;
}

function normalizeOptions(rawOptions: unknown): {
  options: LocalizedText[];
  error?: string;
} {
  // Format A: { en: [...], hi: [...] }
  if (isRecord(rawOptions) && Array.isArray(rawOptions.en)) {
    const enArr = rawOptions.en;
    const hiArr = Array.isArray(rawOptions.hi) ? rawOptions.hi : [];
    const normalized: LocalizedText[] = [];
    for (let i = 0; i < enArr.length; i++) {
      const enVal = typeof enArr[i] === 'string' ? enArr[i].trim() : String(enArr[i] ?? '').trim();
      const hiVal =
        typeof hiArr[i] === 'string' ? hiArr[i].trim() : hiArr[i] != null ? String(hiArr[i]).trim() : '';
      if (!enVal && !hiVal) {
        return {
          options: [],
          error: `Option ${String.fromCharCode(65 + i)} is empty. Empty options are not allowed because they shift answer indices.`,
        };
      }
      normalized.push(hiVal ? { en: enVal || hiVal, hi: hiVal } : enVal);
    }
    if (normalized.length < 2) {
      return { options: [], error: 'At least 2 non-empty options are required.' };
    }
    if (normalized.length > 8) {
      return { options: [], error: 'A maximum of 8 options per question is supported.' };
    }
    return { options: normalized };
  }

  // Format B: array of strings, {en, hi}, or {id, text}
  if (Array.isArray(rawOptions)) {
    const normalized: LocalizedText[] = [];
    for (let i = 0; i < rawOptions.length; i++) {
      const item = rawOptions[i];
      let val: LocalizedText | undefined;
      if (isRecord(item) && ('text' in item || 'label' in item)) {
        val = normalizeLocalizedText(item.text ?? item.label);
      } else {
        val = normalizeLocalizedText(item);
      }
      if (!val) {
        return {
          options: [],
          error: `Option ${String.fromCharCode(65 + i)} is empty. Empty options are not allowed because they shift answer indices.`,
        };
      }
      normalized.push(val);
    }
    if (normalized.length < 2) {
      return { options: [], error: 'At least 2 non-empty options are required.' };
    }
    if (normalized.length > 8) {
      return { options: [], error: 'A maximum of 8 options per question is supported.' };
    }
    return { options: normalized };
  }

  return { options: [], error: 'Missing or invalid "options" array.' };
}

function resolveLetterToIndex(letter: string, optionCount: number): number | null {
  const clean = letter.trim().toUpperCase().replace(/^[(\[]?([A-H])[)\].]?$/, '$1');
  if (clean.length === 1 && clean >= 'A' && clean <= 'H') {
    const idx = clean.charCodeAt(0) - 65;
    if (idx >= 0 && idx < optionCount) return idx;
  }
  return null;
}

function resolveOptionTextMatch(target: string, options: LocalizedText[]): number | null {
  const clean = target.trim().toLowerCase();
  if (!clean) return null;
  for (let i = 0; i < options.length; i++) {
    const opt = options[i];
    if (typeof opt === 'string') {
      if (opt.trim().toLowerCase() === clean) return i;
    } else {
      if (opt.en.trim().toLowerCase() === clean || opt.hi?.trim().toLowerCase() === clean) {
        return i;
      }
    }
  }
  return null;
}

function resolveCorrectIndices(
  raw: Record<string, unknown>,
  options: LocalizedText[],
  label: string,
  warnings: string[]
): { indices: number[]; type: QuestionType; error?: string } {
  const explicitType: QuestionType =
    raw.type === 'multi' || raw.questionType === 'multi' || raw.type === 'MSQ' ? 'multi' : 'single';

  // 1. correctIndices: number[]
  if (Array.isArray(raw.correctIndices)) {
    if (raw.correctIndices.length === 0) {
      return {
        indices: [],
        type: explicitType,
        error: `${label}: "correctIndices" cannot be empty.`,
      };
    }
    const parsedIndices: number[] = [];
    for (const v of raw.correctIndices) {
      let n: number;
      if (typeof v === 'number') {
        n = v;
      } else if (typeof v === 'string' && /^\d+$/.test(v.trim())) {
        n = Number(v.trim());
      } else {
        return {
          indices: [],
          type: explicitType,
          error: `${label}: "correctIndices" contains invalid value "${String(v)}" (expected integer 0-${options.length - 1}).`,
        };
      }
      if (!Number.isInteger(n) || n < 0 || n >= options.length) {
        return {
          indices: [],
          type: explicitType,
          error: `${label}: "correctIndices" has invalid or out-of-range index "${String(v)}" (0-${options.length - 1}).`,
        };
      }
      parsedIndices.push(n);
    }
    const unique = Array.from(new Set(parsedIndices)).sort((a, b) => a - b);
    return {
      indices: unique,
      type: unique.length > 1 ? 'multi' : explicitType,
    };
  }

  // 2. correctOptions: string[] e.g. ["A", "C"]
  if (Array.isArray(raw.correctOptions)) {
    if (raw.correctOptions.length === 0) {
      return {
        indices: [],
        type: explicitType,
        error: `${label}: "correctOptions" cannot be empty.`,
      };
    }
    const mapped: number[] = [];
    for (const entry of raw.correctOptions) {
      if (typeof entry === 'string') {
        const idx =
          resolveLetterToIndex(entry, options.length) ?? resolveOptionTextMatch(entry, options);
        if (idx === null) {
          return {
            indices: [],
            type: explicitType,
            error: `${label}: "correctOptions" entry "${entry}" does not match any option (A-${String.fromCharCode(64 + options.length)}).`,
          };
        }
        mapped.push(idx);
      } else if (
        typeof entry === 'number' &&
        Number.isInteger(entry) &&
        entry >= 0 &&
        entry < options.length
      ) {
        mapped.push(entry);
      } else {
        return {
          indices: [],
          type: explicitType,
          error: `${label}: "correctOptions" contains invalid entry "${String(entry)}".`,
        };
      }
    }
    const unique = Array.from(new Set(mapped)).sort((a, b) => a - b);
    return { indices: unique, type: unique.length > 1 ? 'multi' : explicitType };
  }

  // 3. correctIndex: number (0-based)
  if (typeof raw.correctIndex === 'number' && Number.isInteger(raw.correctIndex)) {
    if (raw.correctIndex < 0 || raw.correctIndex >= options.length) {
      return {
        indices: [],
        type: explicitType,
        error: `${label}: "correctIndex" (${raw.correctIndex}) must be between 0 and ${options.length - 1}.`,
      };
    }
    return { indices: [raw.correctIndex], type: explicitType };
  }

  // 4. correctOption or answer
  const rawAnswer = raw.correctOption ?? raw.answer ?? raw.correctAnswer;
  if (typeof rawAnswer === 'number' && Number.isInteger(rawAnswer)) {
    if (rawAnswer >= 0 && rawAnswer < options.length) {
      warnings.push(
        `${label}: Numeric "answer" (${rawAnswer}) interpreted as 0-based index (Option ${String.fromCharCode(65 + rawAnswer)}). Prefer "correctIndex" or "correctOption": "A".`
      );
      return { indices: [rawAnswer], type: explicitType };
    }
    return {
      indices: [],
      type: explicitType,
      error: `${label}: Numeric answer ${rawAnswer} is out of range (0-${options.length - 1}).`,
    };
  }

  if (typeof rawAnswer === 'string' && rawAnswer.trim().length > 0) {
    const exactTextIdx = resolveOptionTextMatch(rawAnswer, options);
    const letterIdx = resolveLetterToIndex(rawAnswer, options.length);
    const resolved = letterIdx ?? exactTextIdx;
    if (resolved !== null) {
      return { indices: [resolved], type: explicitType };
    }
    return {
      indices: [],
      type: explicitType,
      error: `${label}: Answer "${rawAnswer}" does not match an option letter (A-${String.fromCharCode(64 + options.length)}) or option text.`,
    };
  }

  return {
    indices: [],
    type: explicitType,
    error: `${label}: Missing answer key ("correctIndex", "correctOption", "correctIndices", or "answer").`,
  };
}

function normalizePositiveNumber(
  value: unknown,
  fallback: number | undefined,
  fieldLabel: string,
  warnings: string[]
): number | undefined {
  if (value === undefined || value === null || value === '') return fallback;
  const num = Number(value);
  if (!Number.isFinite(num)) {
    warnings.push(`${fieldLabel}: Invalid number "${String(value)}", using default.`);
    return fallback;
  }
  if (num < 0) {
    warnings.push(
      `${fieldLabel}: Negative value (${num}) normalized to positive deduction magnitude ${Math.abs(num)}.`
    );
    return Math.abs(num);
  }
  return num;
}

function normalizeDifficulty(value: unknown): DifficultyLevel | undefined {
  if (typeof value !== 'string') return undefined;
  const lower = value.trim().toLowerCase();
  if (lower === 'easy' || lower === 'medium' || lower === 'hard') return lower;
  return undefined;
}

function parseQuestion(
  rawItem: unknown,
  sectionId: string,
  indexLabel: string,
  passagesMap: Record<string, { title?: LocalizedText; content: LocalizedText }>,
  warnings: string[],
  errors: string[]
): Question | null {
  if (!isRecord(rawItem)) {
    errors.push(`${indexLabel}: Question entry must be a JSON object.`);
    return null;
  }

  const qText = normalizeLocalizedText(rawItem.question ?? rawItem.text ?? rawItem.prompt);
  if (!qText) {
    errors.push(`${indexLabel}: Missing "question" text.`);
    return null;
  }

  const { options, error: optError } = normalizeOptions(rawItem.options ?? rawItem.choices);
  if (optError) {
    errors.push(`${indexLabel}: ${optError}`);
    return null;
  }

  const { indices, type, error: ansError } = resolveCorrectIndices(
    rawItem,
    options,
    indexLabel,
    warnings
  );
  if (ansError) {
    errors.push(ansError);
    return null;
  }

  // Passage resolution: inline passage OR passageId lookup
  let passage = normalizeLocalizedText(rawItem.passage);
  let passageTitle = normalizeLocalizedText(rawItem.passageTitle);
  if (!passage && typeof rawItem.passageId === 'string' && passagesMap[rawItem.passageId]) {
    passage = passagesMap[rawItem.passageId].content;
    if (!passageTitle) {
      passageTitle = passagesMap[rawItem.passageId].title;
    }
  }

  const marks =
    rawItem.marks !== undefined
      ? normalizePositiveNumber(rawItem.marks, undefined, `${indexLabel} marks`, warnings)
      : undefined;
  const negativeMarks =
    rawItem.negativeMarks !== undefined
      ? normalizePositiveNumber(
          rawItem.negativeMarks,
          undefined,
          `${indexLabel} negativeMarks`,
          warnings
        )
      : undefined;

  const id =
    typeof rawItem.id === 'string' && rawItem.id.trim().length > 0
      ? rawItem.id.trim()
      : generateId('q');

  return {
    id,
    sectionId,
    question: qText,
    options,
    type,
    correctIndices: indices,
    marks,
    negativeMarks,
    unattemptedMarks:
      typeof rawItem.unattemptedMarks === 'number' ? rawItem.unattemptedMarks : undefined,
    partialMarking: Boolean(rawItem.partialMarking),
    passageTitle,
    passage,
    image: typeof rawItem.image === 'string' ? rawItem.image.trim() : undefined,
    svg: typeof rawItem.svg === 'string' ? rawItem.svg.trim() : undefined,
    explanation: normalizeLocalizedText(rawItem.explanation ?? rawItem.solution),
    topic: typeof rawItem.topic === 'string' ? rawItem.topic.trim() : undefined,
    difficulty: normalizeDifficulty(rawItem.difficulty),
  };
}

export function parseExamJson(rawInput: string): ParseExamResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  if (!rawInput || rawInput.trim().length === 0) {
    return { ok: false, errors: ['Please paste or upload exam JSON first.'], warnings };
  }

  let candidate = rawInput.trim();
  // Strip optional Markdown code fences if pasted from an LLM/chat output
  const fenceMatch = /^```(?:json)?\s*\r?\n([\s\S]*?)\r?\n```\s*$/i.exec(candidate);
  if (fenceMatch) {
    candidate = fenceMatch[1];
    warnings.push('Stripped surrounding Markdown code fences around JSON.');
  }

  let parsed: unknown;
  let repairedJson: string | undefined;
  try {
    parsed = JSON.parse(candidate);
  } catch (err) {
    const repairResult = repairJsonStringLiterals(candidate);
    if (repairResult.repairedCount > 0) {
      try {
        parsed = JSON.parse(repairResult.repaired);
        repairedJson = repairResult.repaired;
        warnings.push(
          `Auto-repaired ${repairResult.repairedCount} unescaped character(s) inside JSON strings (${repairResult.samples.join(', ')}).`
        );
      } catch (repairedErr) {
        const msg = repairedErr instanceof Error ? repairedErr.message : 'Invalid JSON syntax';
        return {
          ok: false,
          errors: [formatJsonSyntaxError(repairResult.repaired, msg)],
          warnings,
        };
      }
    } else {
      const msg = err instanceof Error ? err.message : 'Invalid JSON syntax';
      return {
        ok: false,
        errors: [formatJsonSyntaxError(candidate, msg)],
        warnings,
      };
    }
  }

  // Wrap raw array of questions into an exam object
  let root: Record<string, unknown>;
  if (Array.isArray(parsed)) {
    root = {
      title: 'Imported Mock Test',
      category: 'Custom',
      questions: parsed,
    };
    warnings.push('Top-level question array detected; wrapped in default exam settings.');
  } else if (isRecord(parsed)) {
    root = parsed;
  } else {
    return {
      ok: false,
      errors: ['JSON root must be an object or an array of question objects.'],
      warnings,
    };
  }

  // Optional top-level passages lookup map
  const passagesMap: Record<string, { title?: LocalizedText; content: LocalizedText }> = {};
  if (isRecord(root.passages)) {
    for (const [key, val] of Object.entries(root.passages)) {
      if (isRecord(val)) {
        const content = normalizeLocalizedText(val.content ?? val.text ?? val.passage);
        if (content) {
          passagesMap[key] = {
            title: normalizeLocalizedText(val.title),
            content,
          };
        }
      } else {
        const content = normalizeLocalizedText(val);
        if (content) {
          passagesMap[key] = { content };
        }
      }
    }
  }

  const rootSettings = isRecord(root.settings) ? root.settings : {};
  const mergedSettings: ExamSettings = {
    ...DEFAULT_EXAM_SETTINGS,
    durationMinutes:
      normalizePositiveNumber(
        root.durationMinutes ?? rootSettings.durationMinutes,
        DEFAULT_EXAM_SETTINGS.durationMinutes,
        'durationMinutes',
        warnings
      ) ?? DEFAULT_EXAM_SETTINGS.durationMinutes,
    sectionalTiming: Boolean(root.sectionalTiming ?? rootSettings.sectionalTiming ?? false),
    allowBackNavigationInSectionalTiming: Boolean(
      root.allowBackNavigationInSectionalTiming ??
        rootSettings.allowBackNavigationInSectionalTiming ??
        false
    ),
    defaultMarks:
      normalizePositiveNumber(
        root.defaultMarks ?? rootSettings.defaultMarks,
        DEFAULT_EXAM_SETTINGS.defaultMarks,
        'defaultMarks',
        warnings
      ) ?? DEFAULT_EXAM_SETTINGS.defaultMarks,
    defaultNegativeMarks:
      normalizePositiveNumber(
        root.defaultNegativeMarks ?? rootSettings.defaultNegativeMarks,
        DEFAULT_EXAM_SETTINGS.defaultNegativeMarks,
        'defaultNegativeMarks',
        warnings
      ) ?? DEFAULT_EXAM_SETTINGS.defaultNegativeMarks,
    evaluateMarkedAnswered:
      typeof (root.evaluateMarkedAnswered ?? rootSettings.evaluateMarkedAnswered) === 'boolean'
        ? Boolean(root.evaluateMarkedAnswered ?? rootSettings.evaluateMarkedAnswered)
        : DEFAULT_EXAM_SETTINGS.evaluateMarkedAnswered,
    shuffleQuestions: true,
    shuffleOptions: true,
    autoSaveOnPaletteNav:
      typeof (root.autoSaveOnPaletteNav ?? rootSettings.autoSaveOnPaletteNav) === 'boolean'
        ? Boolean(root.autoSaveOnPaletteNav ?? rootSettings.autoSaveOnPaletteNav)
        : DEFAULT_EXAM_SETTINGS.autoSaveOnPaletteNav,
    allowPause:
      typeof (root.allowPause ?? rootSettings.allowPause) === 'boolean'
        ? Boolean(root.allowPause ?? rootSettings.allowPause)
        : DEFAULT_EXAM_SETTINGS.allowPause,
    showCalculator: Boolean(root.showCalculator ?? rootSettings.showCalculator ?? false),
    showRoughPad:
      typeof (root.showRoughPad ?? rootSettings.showRoughPad) === 'boolean'
        ? Boolean(root.showRoughPad ?? rootSettings.showRoughPad)
        : DEFAULT_EXAM_SETTINGS.showRoughPad,
    showLoginScreen:
      typeof (root.showLoginScreen ?? rootSettings.showLoginScreen) === 'boolean'
        ? Boolean(root.showLoginScreen ?? rootSettings.showLoginScreen)
        : DEFAULT_EXAM_SETTINGS.showLoginScreen,
    showInstructionsScreen:
      typeof (root.showInstructionsScreen ?? rootSettings.showInstructionsScreen) === 'boolean'
        ? Boolean(root.showInstructionsScreen ?? rootSettings.showInstructionsScreen)
        : DEFAULT_EXAM_SETTINGS.showInstructionsScreen,
    strictFullscreenPrompt: Boolean(
      root.strictFullscreenPrompt ?? rootSettings.strictFullscreenPrompt ?? false
    ),
    practiceModeInstantCheck: Boolean(
      root.practiceModeInstantCheck ?? rootSettings.practiceModeInstantCheck ?? false
    ),
    cutoffPercent: (() => {
      const rawCutoff = root.cutoffPercent ?? rootSettings.cutoffPercent;
      if (typeof rawCutoff === 'number' && Number.isFinite(rawCutoff)) {
        return Math.min(100, Math.max(0, rawCutoff));
      }
      return DEFAULT_EXAM_SETTINGS.cutoffPercent;
    })(),
    defaultLanguage:
      (root.defaultLanguage ?? rootSettings.defaultLanguage) === 'hi' ? 'hi' : 'en',
  };

  const sections: ExamSection[] = [];
  const usedQuestionIds = new Set<string>();
  const usedSectionIds = new Set<string>();

  const ensureUniqueSectionId = (rawId: string, fallbackIndex: number): string => {
    const cleaned = rawId.replace(/[^a-zA-Z0-9_-]+/g, '_').replace(/^_+|_+$/g, '');
    const base = cleaned || `sec_${fallbackIndex}`;
    let candidate = base;
    let suffix = 1;
    while (usedSectionIds.has(candidate)) {
      candidate = `${base}_${suffix++}`;
    }
    usedSectionIds.add(candidate);
    return candidate;
  };

  const ensureUniqueQuestionId = (q: Question): Question => {
    let candidate = q.id;
    let suffix = 1;
    while (usedQuestionIds.has(candidate)) {
      candidate = `${q.id}_${suffix++}`;
    }
    usedQuestionIds.add(candidate);
    return candidate === q.id ? q : { ...q, id: candidate };
  };

  if (Array.isArray(root.sections) && root.sections.length > 0) {
    root.sections.forEach((rawSec, sIdx) => {
      if (!isRecord(rawSec)) {
        errors.push(`Section #${sIdx + 1}: Must be an object.`);
        return;
      }
      const secName =
        typeof rawSec.name === 'string' && rawSec.name.trim().length > 0
          ? rawSec.name.trim()
          : `Section ${sIdx + 1}`;
      const rawSecId =
        typeof rawSec.id === 'string' && rawSec.id.trim().length > 0
          ? rawSec.id.trim()
          : `sec_${sIdx + 1}`;
      const secId = ensureUniqueSectionId(rawSecId, sIdx + 1);

      if (!Array.isArray(rawSec.questions) || rawSec.questions.length === 0) {
        errors.push(`Section "${secName}": Must include a non-empty "questions" array.`);
        return;
      }

      const secQuestions: Question[] = [];
      rawSec.questions.forEach((rawQ, qIdx) => {
        const parsedQ = parseQuestion(
          rawQ,
          secId,
          `Section "${secName}" Q${qIdx + 1}`,
          passagesMap,
          warnings,
          errors
        );
        if (parsedQ) secQuestions.push(ensureUniqueQuestionId(parsedQ));
      });

      if (secQuestions.length > 0) {
        sections.push({
          id: secId,
          name: secName,
          durationMinutes:
            rawSec.durationMinutes !== undefined
              ? normalizePositiveNumber(
                  rawSec.durationMinutes,
                  undefined,
                  `Section "${secName}" durationMinutes`,
                  warnings
                )
              : undefined,
          defaultMarks:
            rawSec.defaultMarks !== undefined
              ? normalizePositiveNumber(
                  rawSec.defaultMarks,
                  undefined,
                  `Section "${secName}" defaultMarks`,
                  warnings
                )
              : undefined,
          defaultNegativeMarks:
            rawSec.defaultNegativeMarks !== undefined
              ? normalizePositiveNumber(
                  rawSec.defaultNegativeMarks,
                  undefined,
                  `Section "${secName}" defaultNegativeMarks`,
                  warnings
                )
              : undefined,
          questions: secQuestions,
        });
      }
    });
  } else if (Array.isArray(root.questions) && root.questions.length > 0) {
    // Group flat questions by optional "section" field preserving first-seen order
    const sectionGroups = new Map<string, { id: string; questions: Question[] }>();
    let secCounter = 1;
    root.questions.forEach((rawQ, qIdx) => {
      const secName =
        isRecord(rawQ) && typeof rawQ.section === 'string' && rawQ.section.trim().length > 0
          ? rawQ.section.trim()
          : 'General Section';
      let group = sectionGroups.get(secName);
      if (!group) {
        const slug = secName.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '');
        const uniqueId = ensureUniqueSectionId(slug ? `sec_${slug}` : `sec_${secCounter}`, secCounter);
        secCounter++;
        group = { id: uniqueId, questions: [] };
        sectionGroups.set(secName, group);
      }
      const parsedQ = parseQuestion(
        rawQ,
        group.id,
        `Question #${qIdx + 1}`,
        passagesMap,
        warnings,
        errors
      );
      if (parsedQ) {
        group.questions.push(ensureUniqueQuestionId(parsedQ));
      }
    });

    for (const [secName, group] of sectionGroups.entries()) {
      sections.push({
        id: group.id,
        name: secName,
        questions: group.questions,
      });
    }
  } else {
    errors.push('Exam JSON must contain either a "sections" array or a "questions" array.');
  }

  if (errors.length > 0 || sections.length === 0) {
    return { ok: false, errors, warnings };
  }

  // Detect languages present
  let bilingualCount = 0;
  let totalQuestions = 0;
  for (const sec of sections) {
    for (const q of sec.questions) {
      totalQuestions++;
      const hasHi =
        hasHindiTranslation(q.question) ||
        q.options.some((o) => hasHindiTranslation(o)) ||
        hasHindiTranslation(q.passage);
      if (hasHi) bilingualCount++;
    }
  }

  const languages: ExamLanguage[] =
    bilingualCount > 0 ||
    (Array.isArray(root.languages) && root.languages.includes('hi'))
      ? ['en', 'hi']
      : ['en'];

  // If sectional timing is enabled and sections don't have individual durationMinutes, split total evenly
  if (mergedSettings.sectionalTiming) {
    const missingDurationSecs = sections.filter((s) => !s.durationMinutes || s.durationMinutes <= 0);
    if (missingDurationSecs.length > 0) {
      const fallbackPerSec = Math.max(
        5,
        Math.round(mergedSettings.durationMinutes / sections.length)
      );
      sections.forEach((s) => {
        if (!s.durationMinutes || s.durationMinutes <= 0) {
          s.durationMinutes = fallbackPerSec;
        }
      });
      warnings.push(
        `Sectional timing enabled: assigned ${fallbackPerSec} min default to sections missing "durationMinutes".`
      );
    }
  }

  const now = Date.now();
  const exam: ExamDefinition = {
    id:
      typeof root.id === 'string' && root.id.trim().length > 0
        ? root.id.trim()
        : generateId('exam'),
    title:
      typeof root.title === 'string' && root.title.trim().length > 0
        ? root.title.trim()
        : 'Untitled Mock Exam',
    subtitle: typeof root.subtitle === 'string' ? root.subtitle.trim() : undefined,
    category:
      typeof root.category === 'string' && root.category.trim().length > 0
        ? root.category.trim()
        : 'Custom',
    description: typeof root.description === 'string' ? root.description.trim() : undefined,
    instructions: Array.isArray(root.instructions)
      ? root.instructions.filter((i): i is string => typeof i === 'string' && i.trim().length > 0)
      : undefined,
    languages,
    settings: mergedSettings,
    sections,
    isBuiltIn: false,
    createdAt: typeof root.createdAt === 'number' ? root.createdAt : now,
    updatedAt: now,
  };

  return {
    ok: true,
    exam,
    errors,
    warnings,
    repairedJson,
    summary: {
      sectionCount: sections.length,
      questionCount: totalQuestions,
      bilingualCount,
    },
  };
}

export function exportExamToJson(exam: ExamDefinition): string {
  const clean = {
    title: exam.title,
    subtitle: exam.subtitle,
    category: exam.category,
    description: exam.description,
    languages: exam.languages,
    instructions: exam.instructions,
    settings: exam.settings,
    sections: exam.sections.map((sec) => ({
      id: sec.id,
      name: sec.name,
      durationMinutes: sec.durationMinutes,
      defaultMarks: sec.defaultMarks,
      defaultNegativeMarks: sec.defaultNegativeMarks,
      questions: sec.questions.map((q) => ({
        id: q.id,
        question: q.question,
        options: q.options,
        type: q.type,
        correctIndices: q.correctIndices,
        marks: q.marks,
        negativeMarks: q.negativeMarks,
        unattemptedMarks: q.unattemptedMarks,
        partialMarking: q.partialMarking,
        passageTitle: q.passageTitle,
        passage: q.passage,
        image: q.image,
        svg: q.svg,
        explanation: q.explanation,
        topic: q.topic,
        difficulty: q.difficulty,
      })),
    })),
  };
  return JSON.stringify(clean, null, 2);
}

export function normalizeBilingualOption(opt: LocalizedText): BilingualText {
  if (typeof opt === 'string') return { en: opt };
  return opt;
}

export const SIMPLE_TEMPLATE_JSON = `{
  "title": "SSC CGL Mini Practice Test",
  "category": "SSC CGL",
  "durationMinutes": 20,
  "defaultMarks": 2,
  "defaultNegativeMarks": 0.5,
  "questions": [
    {
      "id": "q1",
      "section": "Quantitative Aptitude",
      "topic": "Percentage",
      "difficulty": "easy",
      "question": "If $25\\\\%$ of a number is $45$, what is $40\\\\%$ of that number?",
      "options": ["64", "72", "80", "90"],
      "correctIndex": 1,
      "explanation": "Number = $45 \\\\times \\\\frac{100}{25} = 180$. Hence $40\\\\%$ of $180 = 72$."
    },
    {
      "id": "q2",
      "section": "General Awareness",
      "topic": "Indian Polity",
      "difficulty": "medium",
      "question": "Which Article of the Constitution of India deals with the Right to Constitutional Remedies?",
      "options": ["Article 14", "Article 19", "Article 21", "Article 32"],
      "correctOption": "D",
      "explanation": "Article 32 grants the Right to Constitutional Remedies and was called the 'heart and soul' of the Constitution by Dr. B.R. Ambedkar."
    },
    {
      "id": "q3",
      "section": "General Intelligence & Reasoning",
      "topic": "Number Series",
      "difficulty": "medium",
      "question": "Find the missing number in the series: $3, 7, 15, 31, 63, ?$",
      "options": ["125", "127", "129", "131"],
      "correctIndex": 1,
      "explanation": "Pattern is $\\\\times 2 + 1$: $63 \\\\times 2 + 1 = 127$."
    }
  ]
}`;

export const AI_CONVERTER_PROMPT = `Convert the attached notes / questions into valid JSON matching this exact CBT Mock Exam schema. Output ONLY raw valid JSON (no markdown fences if possible):

{
  "title": "Exam Title",
  "category": "SSC CGL | IBPS PO | UPSC CSE | RRB NTPC | Custom",
  "durationMinutes": 60,
  "sectionalTiming": false,
  "defaultMarks": 2,
  "defaultNegativeMarks": 0.5,
  "sections": [
    {
      "name": "Section Name",
      "questions": [
        {
          "id": "q1",
          "topic": "Topic Name",
          "difficulty": "easy | medium | hard",
          "passage": "Optional passage or DI context if applicable",
          "question": "Question text (LaTeX math wrapped in $...$ is supported)",
          "options": ["Option A", "Option B", "Option C", "Option D"],
          "correctIndex": 0,
          "explanation": "Concise step-by-step solution"
        }
      ]
    }
  ]
}

Rules:
1. "correctIndex" is 0-based (0 = first option, 1 = second, etc.).
2. Escape backslashes in LaTeX math properly for JSON (e.g., "\\\\frac{1}{2}").
3. Include an accurate "explanation" and "topic" for every question.`;
