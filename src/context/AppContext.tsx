import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { DEFAULT_ACCENT_COLOR, isValidAccentColor } from '../constants/accentColors';
import {
  DEFAULT_PROFILE,
  clearAllAttempts as dbClearAttempts,
  deleteActiveSession as dbDeleteSession,
  deleteAttempt as dbDeleteAttempt,
  deleteBookmark as dbDeleteBookmark,
  deleteExam as dbDeleteExam,
  getAllActiveSessions,
  getAllAttempts,
  getAllBookmarks,
  getAllExams,
  getProfile,
  initializeStorageAndSeed,
  restoreSampleExams as dbRestoreSamples,
  saveActiveSession as dbSaveSession,
  saveAttempt as dbSaveAttempt,
  saveBookmark as dbSaveBookmark,
  saveExam as dbSaveExam,
  saveProfile as dbSaveProfile,
  syncUserFolderExams as dbSyncUserFolderExams,
} from '../storage/db';
import type {
  AccentColorId,
  ActiveSession,
  BookmarkedQuestion,
  CandidateProfile,
  ExamAttempt,
  ExamDefinition,
  ThemeMode,
  UserJsonSyncReport,
} from '../types/exam';
import { generateId } from '../utils/formatters';

const THEME_LS_KEY = 'bharat_cbt_theme';
const ACCENT_LS_KEY = 'bharat_cbt_accent';

export interface ToastMessage {
  id: string;
  type: 'success' | 'error' | 'info';
  message: string;
}

interface AppContextValue {
  ready: boolean;
  route: string;
  navigate: (path: string) => void;
  exams: ExamDefinition[];
  attempts: ExamAttempt[];
  activeSessions: ActiveSession[];
  bookmarks: BookmarkedQuestion[];
  profile: CandidateProfile;
  theme: ThemeMode;
  setTheme: (mode: ThemeMode) => Promise<void>;
  toggleTheme: () => Promise<void>;
  accentColor: AccentColorId;
  setAccentColor: (color: AccentColorId) => Promise<void>;
  userJsonReport: UserJsonSyncReport | null;
  resyncUserFolderExams: () => Promise<
    UserJsonSyncReport & { addedCount: number; updatedCount: number }
  >;
  toasts: ToastMessage[];
  showToast: (message: string, type?: ToastMessage['type']) => void;
  dismissToast: (id: string) => void;
  refreshAll: () => Promise<void>;
  upsertExam: (exam: ExamDefinition) => Promise<void>;
  removeExam: (id: string) => Promise<void>;
  restoreSamples: () => Promise<void>;
  saveSession: (session: ActiveSession) => Promise<void>;
  removeSession: (sessionId: string) => Promise<void>;
  recordAttempt: (attempt: ExamAttempt, sessionIdToClear?: string) => Promise<void>;
  removeAttempt: (id: string) => Promise<void>;
  clearAttempts: () => Promise<void>;
  toggleBookmark: (bm: BookmarkedQuestion) => Promise<boolean>;
  updateBookmark: (bm: BookmarkedQuestion) => Promise<void>;
  removeBookmark: (id: string) => Promise<void>;
  updateProfile: (profile: CandidateProfile) => Promise<void>;
}

const AppContext = createContext<AppContextValue | null>(null);

function readHashRoute(): string {
  const hash = window.location.hash;
  if (!hash || hash === '#') return '/';
  const stripped = hash.startsWith('#') ? hash.slice(1) : hash;
  return stripped.startsWith('/') ? stripped : `/${stripped}`;
}

function readInitialTheme(): ThemeMode {
  try {
    return localStorage.getItem(THEME_LS_KEY) === 'dark' ? 'dark' : 'light';
  } catch {
    return 'light';
  }
}

function applyThemeToDom(mode: ThemeMode): void {
  if (typeof document !== 'undefined') {
    document.documentElement.classList.toggle('dark', mode === 'dark');
  }
  try {
    localStorage.setItem(THEME_LS_KEY, mode);
  } catch {
    // ignore
  }
}

function readInitialAccentColor(): AccentColorId {
  try {
    const raw = localStorage.getItem(ACCENT_LS_KEY);
    return isValidAccentColor(raw) ? raw : DEFAULT_ACCENT_COLOR;
  } catch {
    return DEFAULT_ACCENT_COLOR;
  }
}

function applyAccentToDom(color: AccentColorId): void {
  if (typeof document !== 'undefined') {
    if (color === 'orange') {
      document.documentElement.removeAttribute('data-accent');
    } else {
      document.documentElement.dataset.accent = color;
    }
  }
  try {
    localStorage.setItem(ACCENT_LS_KEY, color);
  } catch {
    // ignore
  }
}

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [ready, setReady] = useState(false);
  const [route, setRoute] = useState<string>(() => readHashRoute());
  const [exams, setExams] = useState<ExamDefinition[]>([]);
  const [attempts, setAttempts] = useState<ExamAttempt[]>([]);
  const [activeSessions, setActiveSessions] = useState<ActiveSession[]>([]);
  const [bookmarks, setBookmarks] = useState<BookmarkedQuestion[]>([]);
  const [theme, setThemeState] = useState<ThemeMode>(() => {
    const initial = readInitialTheme();
    applyThemeToDom(initial);
    return initial;
  });
  const [accentColor, setAccentColorState] = useState<AccentColorId>(() => {
    const initial = readInitialAccentColor();
    applyAccentToDom(initial);
    return initial;
  });
  const [userJsonReport, setUserJsonReport] = useState<UserJsonSyncReport | null>(null);
  const [profile, setProfile] = useState<CandidateProfile>(() => ({
    ...DEFAULT_PROFILE,
    theme: readInitialTheme(),
    accentColor: readInitialAccentColor(),
  }));
  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  const profileRef = useRef(profile);
  profileRef.current = profile;
  const toastTimersRef = useRef<Map<string, number>>(new Map());

  useEffect(() => {
    const timers = toastTimersRef.current;
    return () => {
      for (const timerId of timers.values()) {
        window.clearTimeout(timerId);
      }
      timers.clear();
    };
  }, []);

  useEffect(() => {
    applyThemeToDom(theme);
  }, [theme]);

  useEffect(() => {
    applyAccentToDom(accentColor);
  }, [accentColor]);

  useEffect(() => {
    const onHashChange = () => setRoute(readHashRoute());
    window.addEventListener('hashchange', onHashChange);
    return () => window.removeEventListener('hashchange', onHashChange);
  }, []);

  const navigate = useCallback((path: string) => {
    const normalized = path.startsWith('/') ? path : `/${path}`;
    if (window.location.hash !== `#${normalized}`) {
      window.location.hash = `#${normalized}`;
    } else {
      setRoute(normalized);
    }
    window.scrollTo({ top: 0, behavior: 'instant' as ScrollBehavior });
  }, []);

  const dismissToast = useCallback((id: string) => {
    const timerId = toastTimersRef.current.get(id);
    if (timerId !== undefined) {
      window.clearTimeout(timerId);
      toastTimersRef.current.delete(id);
    }
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const showToast = useCallback(
    (message: string, type: ToastMessage['type'] = 'info') => {
      const id = generateId('toast');
      setToasts((prev) => [...prev.slice(-3), { id, type, message }]);
      const timerId = window.setTimeout(() => {
        toastTimersRef.current.delete(id);
        setToasts((prev) => prev.filter((t) => t.id !== id));
      }, 3600);
      toastTimersRef.current.set(id, timerId);
    },
    []
  );

  const refreshAll = useCallback(async () => {
    const [ex, att, sess, bm, prof] = await Promise.all([
      getAllExams(),
      getAllAttempts(),
      getAllActiveSessions(),
      getAllBookmarks(),
      getProfile(),
    ]);
    setExams(ex);
    setAttempts(att);
    setActiveSessions(sess);
    setBookmarks(bm);
    const resolvedTheme: ThemeMode = prof.theme ?? readInitialTheme();
    const resolvedAccent: AccentColorId = isValidAccentColor(prof.accentColor)
      ? prof.accentColor
      : readInitialAccentColor();
    setThemeState(resolvedTheme);
    applyThemeToDom(resolvedTheme);
    setAccentColorState(resolvedAccent);
    applyAccentToDom(resolvedAccent);
    setProfile({ ...prof, theme: resolvedTheme, accentColor: resolvedAccent });
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        await initializeStorageAndSeed();
        const syncResult = await dbSyncUserFolderExams();
        if (cancelled) return;
        setUserJsonReport(syncResult);
        await refreshAll();
        if (cancelled) return;

        if (syncResult.failedCount > 0) {
          const failedNames = syncResult.items
            .filter((item) => !item.ok)
            .map((item) => item.fileName)
            .join(', ');
          showToast(
            `JSON verification failed in User_Exam_JSONs (${syncResult.failedCount}): ${failedNames}`,
            'error'
          );
        } else if (syncResult.addedCount > 0 || syncResult.updatedCount > 0) {
          showToast(
            `Verified & auto-loaded ${syncResult.verifiedCount} exam(s) from User_Exam_JSONs.`,
            'success'
          );
        }
      } catch (err) {
        if (!cancelled) {
          const msg = err instanceof Error ? err.message : 'Could not initialize local storage.';
          showToast(`Workspace loaded with fallback storage: ${msg}`, 'error');
        }
      } finally {
        if (!cancelled) {
          setReady(true);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [refreshAll, showToast]);

  const setTheme = useCallback(async (mode: ThemeMode) => {
    setThemeState(mode);
    applyThemeToDom(mode);
    const updated: CandidateProfile = { ...profileRef.current, theme: mode };
    profileRef.current = updated;
    setProfile(updated);
    await dbSaveProfile(updated);
  }, []);

  const toggleTheme = useCallback(async () => {
    const next: ThemeMode = theme === 'dark' ? 'light' : 'dark';
    await setTheme(next);
  }, [theme, setTheme]);

  const setAccentColor = useCallback(async (color: AccentColorId) => {
    setAccentColorState(color);
    applyAccentToDom(color);
    const updated: CandidateProfile = { ...profileRef.current, accentColor: color };
    profileRef.current = updated;
    setProfile(updated);
    await dbSaveProfile(updated);
  }, []);

  const resyncUserFolderExams = useCallback(async () => {
    const syncResult = await dbSyncUserFolderExams({ includeDismissed: true });
    setUserJsonReport(syncResult);
    setExams(await getAllExams());
    return syncResult;
  }, []);

  const upsertExam = useCallback(async (exam: ExamDefinition) => {
    await dbSaveExam(exam);
    setExams(await getAllExams());
  }, []);

  const removeExam = useCallback(async (id: string) => {
    await dbDeleteExam(id);
    setExams(await getAllExams());
    setActiveSessions(await getAllActiveSessions());
  }, []);

  const restoreSamples = useCallback(async () => {
    await dbRestoreSamples();
    setExams(await getAllExams());
  }, []);

  const saveSession = useCallback(async (session: ActiveSession) => {
    await dbSaveSession(session);
    setActiveSessions((prev) => {
      const idx = prev.findIndex((s) => s.id === session.id);
      if (idx >= 0) {
        const next = [...prev];
        next[idx] = session;
        return next;
      }
      return [session, ...prev];
    });
  }, []);

  const removeSession = useCallback(async (sessionId: string) => {
    await dbDeleteSession(sessionId);
    setActiveSessions((prev) => prev.filter((s) => s.id !== sessionId));
  }, []);

  const recordAttempt = useCallback(async (attempt: ExamAttempt, sessionIdToClear?: string) => {
    await dbSaveAttempt(attempt);
    if (sessionIdToClear) {
      await dbDeleteSession(sessionIdToClear);
      setActiveSessions((prev) => prev.filter((s) => s.id !== sessionIdToClear));
    }
    setAttempts(await getAllAttempts());
  }, []);

  const removeAttempt = useCallback(async (id: string) => {
    await dbDeleteAttempt(id);
    setAttempts((prev) => prev.filter((a) => a.id !== id));
  }, []);

  const clearAttempts = useCallback(async () => {
    await dbClearAttempts();
    setAttempts([]);
  }, []);

  const toggleBookmark = useCallback(
    async (bm: BookmarkedQuestion): Promise<boolean> => {
      const exists = bookmarks.some((x) => x.id === bm.id);
      if (exists) {
        await dbDeleteBookmark(bm.id);
        setBookmarks((prev) => prev.filter((x) => x.id !== bm.id));
        return false;
      }
      await dbSaveBookmark(bm);
      setBookmarks((prev) => [bm, ...prev]);
      return true;
    },
    [bookmarks]
  );

  const updateBookmark = useCallback(async (bm: BookmarkedQuestion) => {
    await dbSaveBookmark(bm);
    setBookmarks((prev) => prev.map((x) => (x.id === bm.id ? bm : x)));
  }, []);

  const removeBookmark = useCallback(async (id: string) => {
    await dbDeleteBookmark(id);
    setBookmarks((prev) => prev.filter((x) => x.id !== id));
  }, []);

  const updateProfile = useCallback(
    async (next: CandidateProfile) => {
      const resolvedTheme = next.theme ?? theme;
      const resolvedAccent = isValidAccentColor(next.accentColor)
        ? next.accentColor
        : accentColor;
      const normalized = {
        ...next,
        theme: resolvedTheme,
        accentColor: resolvedAccent,
      };
      await dbSaveProfile(normalized);
      setProfile(normalized);
      setThemeState(resolvedTheme);
      applyThemeToDom(resolvedTheme);
      setAccentColorState(resolvedAccent);
      applyAccentToDom(resolvedAccent);
    },
    [theme, accentColor]
  );

  return (
    <AppContext.Provider
      value={{
        ready,
        route,
        navigate,
        exams,
        attempts,
        activeSessions,
        bookmarks,
        profile,
        theme,
        setTheme,
        toggleTheme,
        accentColor,
        setAccentColor,
        userJsonReport,
        resyncUserFolderExams,
        toasts,
        showToast,
        dismissToast,
        refreshAll,
        upsertExam,
        removeExam,
        restoreSamples,
        saveSession,
        removeSession,
        recordAttempt,
        removeAttempt,
        clearAttempts,
        toggleBookmark,
        updateBookmark,
        removeBookmark,
        updateProfile,
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

export function useApp(): AppContextValue {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used inside AppProvider');
  return ctx;
}
