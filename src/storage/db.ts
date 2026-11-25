import { DEFAULT_ACCENT_COLOR, isValidAccentColor } from '../constants/accentColors';
import { DEFAULT_EXAM_SETTINGS } from '../constants/examPresets';
import { SAMPLE_EXAMS } from '../constants/sampleExams';
import type {
  AccentColorId,
  ActiveSession,
  BookmarkedQuestion,
  CandidateProfile,
  ExamAttempt,
  ExamDefinition,
  UserJsonSyncReport,
  WorkspaceBackup,
} from '../types/exam';
import { loadUserFolderExamEntries, verifyUserExamEntries } from '../utils/userExamLoader';

const DB_NAME = 'bharat_cbt_db';
const DB_VERSION = 1;

const STORES = {
  EXAMS: 'exams',
  ATTEMPTS: 'attempts',
  SESSIONS: 'active_sessions',
  BOOKMARKS: 'bookmarks',
  META: 'meta',
} as const;

const PROFILE_KEY = 'candidate_profile';
const SEEDED_KEY = 'samples_seeded_v1';
const DISMISSED_FOLDER_KEY = 'dismissed_folder_exams_v1';
const LS_FALLBACK_PREFIX = 'bharat_cbt_fallback_';

export const DEFAULT_PROFILE: CandidateProfile = {
  name: 'Aarav Sharma',
  rollNumber: 'CBT2026014829',
  targetExam: 'SSC CGL / IBPS PO',
  avatarColor: '#2563EB',
  preferredLanguage: 'en',
  preferredFontScale: 'md',
  theme: 'light',
  accentColor: DEFAULT_ACCENT_COLOR,
};

let dbPromise: Promise<IDBDatabase | null> | null = null;

function openDatabase(): Promise<IDBDatabase | null> {
  if (typeof indexedDB === 'undefined') {
    return Promise.resolve(null);
  }
  if (dbPromise) return dbPromise;

  dbPromise = new Promise((resolve) => {
    try {
      const request = indexedDB.open(DB_NAME, DB_VERSION);
      request.onupgradeneeded = () => {
        const db = request.result;
        if (!db.objectStoreNames.contains(STORES.EXAMS)) {
          db.createObjectStore(STORES.EXAMS, { keyPath: 'id' });
        }
        if (!db.objectStoreNames.contains(STORES.ATTEMPTS)) {
          const store = db.createObjectStore(STORES.ATTEMPTS, { keyPath: 'id' });
          store.createIndex('submittedAt', 'submittedAt', { unique: false });
          store.createIndex('examId', 'examId', { unique: false });
        }
        if (!db.objectStoreNames.contains(STORES.SESSIONS)) {
          db.createObjectStore(STORES.SESSIONS, { keyPath: 'id' });
        }
        if (!db.objectStoreNames.contains(STORES.BOOKMARKS)) {
          db.createObjectStore(STORES.BOOKMARKS, { keyPath: 'id' });
        }
        if (!db.objectStoreNames.contains(STORES.META)) {
          db.createObjectStore(STORES.META, { keyPath: 'key' });
        }
      };
      request.onsuccess = () => {
        const db = request.result;
        db.onversionchange = () => {
          db.close();
          dbPromise = null;
        };
        db.onclose = () => {
          dbPromise = null;
        };
        resolve(db);
      };
      request.onerror = () => {
        dbPromise = null;
        resolve(null);
      };
      request.onblocked = () => {
        dbPromise = null;
        resolve(null);
      };
    } catch {
      dbPromise = null;
      resolve(null);
    }
  });

  return dbPromise;
}

// LocalStorage fallback helpers when IndexedDB is unavailable
function lsGetAll<T>(storeName: string): T[] {
  try {
    const raw = localStorage.getItem(`${LS_FALLBACK_PREFIX}${storeName}`);
    return raw ? (JSON.parse(raw) as T[]) : [];
  } catch {
    return [];
  }
}

function lsSetAll<T>(storeName: string, items: T[]): void {
  try {
    localStorage.setItem(`${LS_FALLBACK_PREFIX}${storeName}`, JSON.stringify(items));
  } catch {
    // ignore quota errors
  }
}

async function idbGetAll<T>(storeName: string): Promise<T[]> {
  const db = await openDatabase();
  if (!db) return lsGetAll<T>(storeName);

  return new Promise((resolve) => {
    try {
      const tx = db.transaction(storeName, 'readonly');
      const store = tx.objectStore(storeName);
      const req = store.getAll();
      req.onsuccess = () => resolve((req.result as T[]) ?? []);
      req.onerror = () => resolve(lsGetAll<T>(storeName));
      tx.onabort = () => resolve(lsGetAll<T>(storeName));
    } catch {
      dbPromise = null;
      resolve(lsGetAll<T>(storeName));
    }
  });
}

async function idbPut<T extends Record<string, unknown>>(
  storeName: string,
  item: T,
  keyField = 'id'
): Promise<void> {
  const fallbackWrite = () => {
    const existing = lsGetAll<T>(storeName);
    const idx = existing.findIndex((x) => x[keyField] === item[keyField]);
    if (idx >= 0) existing[idx] = item;
    else existing.push(item);
    lsSetAll(storeName, existing);
  };

  const db = await openDatabase();
  if (!db) {
    fallbackWrite();
    return;
  }

  return new Promise((resolve) => {
    try {
      const tx = db.transaction(storeName, 'readwrite');
      tx.objectStore(storeName).put(item);
      tx.oncomplete = () => resolve();
      tx.onerror = () => {
        fallbackWrite();
        resolve();
      };
      tx.onabort = () => {
        fallbackWrite();
        resolve();
      };
    } catch {
      dbPromise = null;
      fallbackWrite();
      resolve();
    }
  });
}

async function idbDelete(storeName: string, key: string, keyField = 'id'): Promise<void> {
  const fallbackDelete = () => {
    const existing = lsGetAll<Record<string, unknown>>(storeName);
    lsSetAll(
      storeName,
      existing.filter((x) => x[keyField] !== key)
    );
  };

  const db = await openDatabase();
  if (!db) {
    fallbackDelete();
    return;
  }

  return new Promise((resolve) => {
    try {
      const tx = db.transaction(storeName, 'readwrite');
      tx.objectStore(storeName).delete(key);
      tx.oncomplete = () => resolve();
      tx.onerror = () => {
        fallbackDelete();
        resolve();
      };
      tx.onabort = () => {
        fallbackDelete();
        resolve();
      };
    } catch {
      dbPromise = null;
      fallbackDelete();
      resolve();
    }
  });
}

async function idbClear(storeName: string): Promise<void> {
  const db = await openDatabase();
  if (!db) {
    lsSetAll(storeName, []);
    return;
  }

  return new Promise((resolve) => {
    try {
      const tx = db.transaction(storeName, 'readwrite');
      tx.objectStore(storeName).clear();
      tx.oncomplete = () => resolve();
      tx.onerror = () => {
        lsSetAll(storeName, []);
        resolve();
      };
      tx.onabort = () => {
        lsSetAll(storeName, []);
        resolve();
      };
    } catch {
      dbPromise = null;
      lsSetAll(storeName, []);
      resolve();
    }
  });
}

async function getMeta<T>(key: string): Promise<T | null> {
  const fallbackRead = () => {
    const all = lsGetAll<{ key: string; value: T }>(STORES.META);
    return all.find((x) => x.key === key)?.value ?? null;
  };

  const db = await openDatabase();
  if (!db) return fallbackRead();

  return new Promise((resolve) => {
    try {
      const tx = db.transaction(STORES.META, 'readonly');
      const req = tx.objectStore(STORES.META).get(key);
      req.onsuccess = () =>
        resolve((req.result as { key: string; value: T } | undefined)?.value ?? null);
      req.onerror = () => resolve(fallbackRead());
      tx.onabort = () => resolve(fallbackRead());
    } catch {
      dbPromise = null;
      resolve(fallbackRead());
    }
  });
}

async function setMeta<T>(key: string, value: T): Promise<void> {
  await idbPut(STORES.META, { key, value }, 'key');
}

export async function initializeStorageAndSeed(): Promise<void> {
  const seeded = await getMeta<boolean>(SEEDED_KEY);
  const existingExams = await idbGetAll<ExamDefinition>(STORES.EXAMS);

  if (!seeded && existingExams.length === 0) {
    for (const exam of SAMPLE_EXAMS) {
      await idbPut(STORES.EXAMS, exam as unknown as Record<string, unknown>);
    }
    await setMeta(SEEDED_KEY, true);
  }
}

export async function restoreSampleExams(): Promise<void> {
  for (const exam of SAMPLE_EXAMS) {
    await idbPut(STORES.EXAMS, exam as unknown as Record<string, unknown>);
  }
  await setMeta(SEEDED_KEY, true);
}

/**
 * Verifies every JSON file in User_Exam_JSONs/ on startup and automatically
 * inserts new exams or updates modified ones into local storage.
 */
export async function syncUserFolderExams(options?: {
  includeDismissed?: boolean;
}): Promise<UserJsonSyncReport & { addedCount: number; updatedCount: number }> {
  const entries = await loadUserFolderExamEntries();
  const { report, exams } = verifyUserExamEntries(entries);

  const includeDismissed = Boolean(options?.includeDismissed);
  if (includeDismissed) {
    await setMeta<Record<string, string>>(DISMISSED_FOLDER_KEY, {});
  }
  const dismissedMap = includeDismissed
    ? {}
    : ((await getMeta<Record<string, string>>(DISMISSED_FOLDER_KEY)) ?? {});

  const existingExams = await idbGetAll<ExamDefinition>(STORES.EXAMS);
  const existingById = new Map(existingExams.map((e) => [e.id, e]));

  let addedCount = 0;
  let updatedCount = 0;

  for (const exam of exams) {
    if (!includeDismissed && exam.sourceHash && dismissedMap[exam.id] === exam.sourceHash) {
      continue;
    }

    const existing = existingById.get(exam.id);
    if (!existing) {
      await idbPut(STORES.EXAMS, exam as unknown as Record<string, unknown>);
      addedCount++;
    } else if (existing.sourceHash !== exam.sourceHash) {
      const merged: ExamDefinition = {
        ...exam,
        createdAt: existing.createdAt,
      };
      await idbPut(STORES.EXAMS, merged as unknown as Record<string, unknown>);
      updatedCount++;
    }
  }

  return {
    ...report,
    addedCount,
    updatedCount,
  };
}

// Exams CRUD
export async function getAllExams(): Promise<ExamDefinition[]> {
  const exams = await idbGetAll<ExamDefinition>(STORES.EXAMS);
  return exams.sort((a, b) => b.updatedAt - a.updatedAt);
}

export async function saveExam(exam: ExamDefinition): Promise<void> {
  await idbPut(STORES.EXAMS, exam as unknown as Record<string, unknown>);
}

export async function deleteExam(id: string): Promise<void> {
  if (id.startsWith('user_folder_')) {
    const existing = (await idbGetAll<ExamDefinition>(STORES.EXAMS)).find((e) => e.id === id);
    if (existing?.sourceHash) {
      const dismissedMap = (await getMeta<Record<string, string>>(DISMISSED_FOLDER_KEY)) ?? {};
      dismissedMap[id] = existing.sourceHash;
      await setMeta(DISMISSED_FOLDER_KEY, dismissedMap);
    }
  }
  await idbDelete(STORES.EXAMS, id);
  await idbDelete(STORES.SESSIONS, `session_${id}`);
  const allSessions = await idbGetAll<ActiveSession>(STORES.SESSIONS);
  for (const sess of allSessions) {
    if (sess.examId === id && sess.id !== `session_${id}`) {
      await idbDelete(STORES.SESSIONS, sess.id);
    }
  }
}

// Attempts CRUD
export async function getAllAttempts(): Promise<ExamAttempt[]> {
  const attempts = await idbGetAll<ExamAttempt>(STORES.ATTEMPTS);
  return attempts.sort((a, b) => b.submittedAt - a.submittedAt);
}

export async function saveAttempt(attempt: ExamAttempt): Promise<void> {
  await idbPut(STORES.ATTEMPTS, attempt as unknown as Record<string, unknown>);
}

export async function deleteAttempt(id: string): Promise<void> {
  await idbDelete(STORES.ATTEMPTS, id);
}

export async function clearAllAttempts(): Promise<void> {
  await idbClear(STORES.ATTEMPTS);
}

// Active Sessions CRUD
export async function getAllActiveSessions(): Promise<ActiveSession[]> {
  const sessions = await idbGetAll<ActiveSession>(STORES.SESSIONS);
  return sessions.sort((a, b) => b.lastSavedAt - a.lastSavedAt);
}

export async function saveActiveSession(session: ActiveSession): Promise<void> {
  await idbPut(STORES.SESSIONS, session as unknown as Record<string, unknown>);
}

export async function deleteActiveSession(sessionId: string): Promise<void> {
  await idbDelete(STORES.SESSIONS, sessionId);
}

// Bookmarks CRUD
export async function getAllBookmarks(): Promise<BookmarkedQuestion[]> {
  const bms = await idbGetAll<BookmarkedQuestion>(STORES.BOOKMARKS);
  return bms.sort((a, b) => b.createdAt - a.createdAt);
}

export async function saveBookmark(bookmark: BookmarkedQuestion): Promise<void> {
  await idbPut(STORES.BOOKMARKS, bookmark as unknown as Record<string, unknown>);
}

export async function deleteBookmark(id: string): Promise<void> {
  await idbDelete(STORES.BOOKMARKS, id);
}

// Candidate Profile
export async function getProfile(): Promise<CandidateProfile> {
  const stored = await getMeta<CandidateProfile>(PROFILE_KEY);
  let lsTheme: CandidateProfile['theme'] = DEFAULT_PROFILE.theme;
  let lsAccent: AccentColorId = DEFAULT_ACCENT_COLOR;
  try {
    if (typeof localStorage !== 'undefined') {
      if (localStorage.getItem('bharat_cbt_theme') === 'dark') {
        lsTheme = 'dark';
      }
      const rawAccent = localStorage.getItem('bharat_cbt_accent');
      if (isValidAccentColor(rawAccent)) {
        lsAccent = rawAccent;
      }
    }
  } catch {
    // ignore
  }
  const resolvedAccent = isValidAccentColor(stored?.accentColor)
    ? stored.accentColor
    : lsAccent;
  return stored
    ? {
        ...DEFAULT_PROFILE,
        ...stored,
        theme: stored.theme ?? lsTheme,
        accentColor: resolvedAccent,
      }
    : { ...DEFAULT_PROFILE, theme: lsTheme, accentColor: lsAccent };
}

export async function saveProfile(profile: CandidateProfile): Promise<void> {
  await setMeta(PROFILE_KEY, profile);
}

// Workspace Backup Export / Import
export async function createWorkspaceBackup(): Promise<WorkspaceBackup> {
  const [profile, exams, attempts, bookmarks] = await Promise.all([
    getProfile(),
    getAllExams(),
    getAllAttempts(),
    getAllBookmarks(),
  ]);
  return {
    version: 1,
    exportedAt: Date.now(),
    profile,
    exams,
    attempts,
    bookmarks,
  };
}

export async function importWorkspaceBackup(rawJson: string): Promise<{
  examsAdded: number;
  attemptsAdded: number;
  bookmarksAdded: number;
}> {
  let parsed: Partial<WorkspaceBackup>;
  try {
    parsed = JSON.parse(rawJson) as Partial<WorkspaceBackup>;
  } catch {
    throw new Error('Selected file is not valid JSON.');
  }
  if (!parsed || typeof parsed !== 'object' || parsed.version !== 1 || !Array.isArray(parsed.exams)) {
    throw new Error('Invalid BharatCBT backup file format.');
  }

  let examsAdded = 0;
  let attemptsAdded = 0;
  let bookmarksAdded = 0;

  if (parsed.profile && typeof parsed.profile === 'object') {
    const p = parsed.profile;
    await saveProfile({
      ...DEFAULT_PROFILE,
      ...p,
      theme: p.theme === 'dark' ? 'dark' : 'light',
      accentColor: isValidAccentColor(p.accentColor) ? p.accentColor : DEFAULT_ACCENT_COLOR,
      preferredLanguage: p.preferredLanguage === 'hi' ? 'hi' : 'en',
      preferredFontScale:
        p.preferredFontScale === 'sm' || p.preferredFontScale === 'lg' ? p.preferredFontScale : 'md',
    });
  }
  const now = Date.now();
  for (const exam of parsed.exams) {
    if (
      exam &&
      typeof exam.id === 'string' &&
      exam.id.trim().length > 0 &&
      typeof exam.title === 'string' &&
      exam.title.trim().length > 0 &&
      Array.isArray(exam.sections) &&
      exam.sections.some((sec) => Array.isArray(sec?.questions) && sec.questions.length > 0)
    ) {
      const normalizedExam: ExamDefinition = {
        ...exam,
        category: typeof exam.category === 'string' && exam.category.trim() ? exam.category.trim() : 'Custom',
        languages:
          Array.isArray(exam.languages) && exam.languages.length > 0
            ? exam.languages.filter((l): l is 'en' | 'hi' => l === 'en' || l === 'hi')
            : ['en'],
        settings: {
          ...DEFAULT_EXAM_SETTINGS,
          ...(exam.settings && typeof exam.settings === 'object' ? exam.settings : {}),
          shuffleQuestions: true,
          shuffleOptions: true,
        },
        createdAt: Number.isFinite(exam.createdAt) ? exam.createdAt : now,
        updatedAt: Number.isFinite(exam.updatedAt) ? exam.updatedAt : now,
      };
      if (normalizedExam.languages.length === 0) {
        normalizedExam.languages = ['en'];
      }
      await saveExam(normalizedExam);
      examsAdded++;
    }
  }
  if (Array.isArray(parsed.attempts)) {
    for (const att of parsed.attempts) {
      if (
        att &&
        typeof att.id === 'string' &&
        typeof att.examId === 'string' &&
        Array.isArray(att.questionResults)
      ) {
        await saveAttempt({
          ...att,
          submittedAt: Number.isFinite(att.submittedAt) ? att.submittedAt : now,
          startedAt: Number.isFinite(att.startedAt) ? att.startedAt : now,
        });
        attemptsAdded++;
      }
    }
  }
  if (Array.isArray(parsed.bookmarks)) {
    for (const bm of parsed.bookmarks) {
      if (bm && typeof bm.id === 'string' && bm.question && Array.isArray(bm.question.options)) {
        await saveBookmark({
          ...bm,
          createdAt: Number.isFinite(bm.createdAt) ? bm.createdAt : now,
        });
        bookmarksAdded++;
      }
    }
  }

  return { examsAdded, attemptsAdded, bookmarksAdded };
}

export async function getStorageUsageSummary(): Promise<{
  usedBytes: number | null;
  quotaBytes: number | null;
  backend: 'IndexedDB' | 'localStorage';
}> {
  const db = await openDatabase();
  let usedBytes: number | null = null;
  let quotaBytes: number | null = null;
  try {
    if (typeof navigator !== 'undefined' && navigator.storage?.estimate) {
      const est = await navigator.storage.estimate();
      usedBytes = est.usage ?? null;
      quotaBytes = est.quota ?? null;
    }
  } catch {
    // ignore
  }
  return {
    usedBytes,
    quotaBytes,
    backend: db ? 'IndexedDB' : 'localStorage',
  };
}
