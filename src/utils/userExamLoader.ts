import type {
  ExamDefinition,
  UserJsonSyncReport,
  UserJsonVerificationItem,
} from '../types/exam';
import { parseExamJson } from './jsonParser';

export interface RawUserJsonEntry {
  fileName: string;
  rawContent: string;
}

export interface VerifiedUserExamBatch {
  report: UserJsonSyncReport;
  exams: ExamDefinition[];
}

/**
 * Deterministic 32-bit FNV-1a hash used to detect edits to files in User_Exam_JSONs
 * without rewriting unchanged records in IndexedDB on every startup.
 */
export function hashString(input: string): string {
  let hash = 0x811c9dc5;
  for (let i = 0; i < input.length; i++) {
    hash ^= input.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  return (hash >>> 0).toString(16).padStart(8, '0');
}

export function buildUserFolderExamId(fileName: string): string {
  const base = fileName.replace(/\.json$/i, '').replace(/[^a-zA-Z0-9_-]+/g, '_');
  return `user_folder_${base}`;
}

function extractFileName(modulePath: string): string {
  const normalized = modulePath.replace(/\\/g, '/');
  const lastSlash = normalized.lastIndexOf('/');
  return lastSlash >= 0 ? normalized.slice(lastSlash + 1) : normalized;
}

/**
 * Discovers and loads every .json file in the root User_Exam_JSONs/ folder on demand
 * so exam banks are code-split out of the main JS entry bundle.
 */
export async function loadUserFolderExamEntries(): Promise<RawUserJsonEntry[]> {
  const modules = import.meta.glob('/User_Exam_JSONs/*.json', {
    query: '?raw',
    import: 'default',
  }) as Record<string, () => Promise<string>>;

  const entries = await Promise.all(
    Object.entries(modules).map(async ([modulePath, loader]) => ({
      fileName: extractFileName(modulePath),
      rawContent: await loader(),
    }))
  );

  return entries
    .map((entry) => ({
      fileName: entry.fileName,
      rawContent: typeof entry.rawContent === 'string' ? entry.rawContent : '',
    }))
    .sort((a, b) =>
      a.fileName.localeCompare(b.fileName, undefined, { numeric: true, sensitivity: 'base' })
    );
}

/**
 * Verifies strict JSON syntax and full BharatCBT schema compliance for a list of
 * raw JSON files from User_Exam_JSONs/.
 */
export function verifyUserExamEntries(
  entries: RawUserJsonEntry[],
  now = Date.now()
): VerifiedUserExamBatch {
  const sorted = [...entries].sort((a, b) =>
    a.fileName.localeCompare(b.fileName, undefined, { numeric: true, sensitivity: 'base' })
  );

  const items: UserJsonVerificationItem[] = [];
  const exams: ExamDefinition[] = [];
  let verifiedCount = 0;
  let failedCount = 0;
  let warningCount = 0;

  sorted.forEach((entry, idx) => {
    const examId = buildUserFolderExamId(entry.fileName);
    const sourceHash = hashString(entry.rawContent);

    let strictJsonOk = false;
    try {
      JSON.parse(entry.rawContent.trim());
      strictJsonOk = true;
    } catch {
      strictJsonOk = false;
    }

    const parsed = parseExamJson(entry.rawContent);
    // Preserve natural filename sort order on initial load (Mock 1 newest -> at top)
    const orderedTimestamp = now + (sorted.length - idx) * 1000;

    if (parsed.ok && parsed.exam) {
      verifiedCount++;
      if (parsed.warnings.length > 0) warningCount++;

      const questionCount = parsed.exam.sections.reduce(
        (sum, sec) => sum + sec.questions.length,
        0
      );

      exams.push({
        ...parsed.exam,
        id: examId,
        isBuiltIn: false,
        sourceFile: entry.fileName,
        sourceHash,
        createdAt: orderedTimestamp,
        updatedAt: orderedTimestamp,
      });

      items.push({
        fileName: entry.fileName,
        examId,
        ok: true,
        strictJsonOk,
        title: parsed.exam.title,
        questionCount,
        sectionCount: parsed.exam.sections.length,
        warnings: parsed.warnings,
        errors: [],
        checkedAt: now,
      });
    } else {
      failedCount++;
      items.push({
        fileName: entry.fileName,
        examId,
        ok: false,
        strictJsonOk,
        warnings: parsed.warnings,
        errors: parsed.errors.length > 0 ? parsed.errors : ['Unknown JSON verification error.'],
        checkedAt: now,
      });
    }
  });

  return {
    report: {
      totalFiles: sorted.length,
      verifiedCount,
      failedCount,
      warningCount,
      items,
      checkedAt: now,
    },
    exams,
  };
}
