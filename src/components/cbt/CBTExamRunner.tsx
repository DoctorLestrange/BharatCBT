import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  AlertTriangle,
  Bookmark,
  Calculator,
  ChevronLeft,
  ChevronRight,
  Clock,
  FileText,
  Grid,
  HelpCircle,
  Info,
  Lock,
  LogOut,
  Maximize2,
  Minimize2,
  Moon,
  Pause,
  PenLine,
  Play,
  ShieldAlert,
  Sun,
  X,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import type {
  ActiveSession,
  ExamDefinition,
  ExamLanguage,
  QuestionResponseState,
} from '../../types/exam';
import { cn } from '../../utils/cn';
import {
  formatMarks,
  formatTimerHMS,
  formatTimerMMSS,
  getLocalizedText,
  hasHindiTranslation,
  optionIndexToLetter,
} from '../../utils/formatters';
import {
  computeNextResponseState,
  countPaletteStatuses,
  evaluateExamSession,
  getEffectiveQuestionMarks,
  initializeActiveSession,
} from '../../utils/scoring';
import { ConfirmModal } from '../common/ConfirmModal';
import { MathText, SafeDiagram } from '../common/MathText';
import { Modal } from '../common/Modal';
import { CalculatorWidget } from './CalculatorWidget';
import { ExamSummaryModal } from './ExamSummaryModal';
import { InstructionsScreen } from './InstructionsScreen';
import { LoginScreen } from './LoginScreen';
import { PaletteBadge } from './PaletteBadge';
import { QuestionPaperModal } from './QuestionPaperModal';
import { RoughPadModal } from './RoughPadModal';

interface CBTExamRunnerProps {
  exam: ExamDefinition;
  existingSession?: ActiveSession;
  forceFresh?: boolean;
}

export const CBTExamRunner: React.FC<CBTExamRunnerProps> = ({
  exam,
  existingSession,
  forceFresh = false,
}) => {
  const {
    profile,
    updateProfile,
    theme,
    toggleTheme,
    saveSession,
    removeSession,
    recordAttempt,
    bookmarks,
    toggleBookmark,
    navigate,
    showToast,
  } = useApp();

  const isResumedAttempt = Boolean(existingSession && !forceFresh);
  const [session, setSession] = useState<ActiveSession>(() => {
    if (isResumedAttempt && existingSession) {
      return existingSession;
    }
    return initializeActiveSession(exam, 'normal', profile.preferredLanguage);
  });

  const sessionRef = useRef(session);
  sessionRef.current = session;

  const submittedLockRef = useRef(false);
  const exitedIntentionallyRef = useRef(false);
  const runningPersistedRef = useRef(isResumedAttempt);

  // Lock in a newly started running session immediately and clear ?fresh=1 so F5 resumes instead of re-shuffling
  useEffect(() => {
    if (session.stage !== 'running' || submittedLockRef.current || exitedIntentionallyRef.current) {
      return;
    }
    if (!runningPersistedRef.current) {
      runningPersistedRef.current = true;
      void saveSession({ ...sessionRef.current, lastSavedAt: Date.now() });
    }
    if (typeof window !== 'undefined' && window.location.hash.includes('?')) {
      const cleanHash = `#/exam/${encodeURIComponent(exam.id)}`;
      window.history.replaceState(null, '', cleanHash);
    }
  }, [session.stage, exam.id, saveSession]);

  const currentSection = session.examSnapshot.sections[session.currentSectionIndex];
  const currentQuestion = currentSection?.questions[session.currentQuestionIndex];
  const currentResp = currentQuestion ? session.responses[currentQuestion.id] : undefined;

  const [pendingSelection, setPendingSelection] = useState<number[]>(
    () => currentResp?.selectedIndices ?? []
  );
  const pendingRef = useRef(pendingSelection);
  pendingRef.current = pendingSelection;

  // Scroll refs to reset scroll position on question switch
  const splitContainerRef = useRef<HTMLDivElement>(null);
  const passageScrollRef = useRef<HTMLDivElement>(null);
  const questionScrollRef = useRef<HTMLDivElement>(null);

  // Sync pendingSelection & reset scroll whenever active question changes
  useEffect(() => {
    if (currentQuestion) {
      const saved = sessionRef.current.responses[currentQuestion.id]?.selectedIndices ?? [];
      pendingRef.current = saved;
      setPendingSelection(saved);
    }
    if (splitContainerRef.current) splitContainerRef.current.scrollTop = 0;
    if (passageScrollRef.current) passageScrollRef.current.scrollTop = 0;
    if (questionScrollRef.current) questionScrollRef.current.scrollTop = 0;
  }, [session.currentSectionIndex, session.currentQuestionIndex, currentQuestion?.id]);

  // Modals & UI panels
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false);
  const [paperModalOpen, setPaperModalOpen] = useState(false);
  const [instructionsModalOpen, setInstructionsModalOpen] = useState(false);
  const [summaryModalOpen, setSummaryModalOpen] = useState(false);
  const [exitConfirmOpen, setExitConfirmOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [calcOpen, setCalcOpen] = useState(false);
  const [roughPadOpen, setRoughPadOpen] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [fontScale, setFontScale] = useState<'sm' | 'md' | 'lg'>(profile.preferredFontScale);
  const [candidateIdentity, setCandidateIdentity] = useState({
    name: profile.name,
    rollNo: profile.rollNumber,
  });

  // Close mobile palette drawer on Escape
  useEffect(() => {
    if (!mobileDrawerOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setMobileDrawerOpen(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [mobileDrawerOpen]);

  const commitSession = useCallback((next: ActiveSession, persist = false) => {
    sessionRef.current = next;
    setSession(next);
    if (persist) {
      void saveSession(next);
    }
  }, [saveSession]);

  // Track fullscreen changes
  useEffect(() => {
    const handler = () => setIsFullscreen(Boolean(document.fullscreenElement));
    document.addEventListener('fullscreenchange', handler);
    return () => document.removeEventListener('fullscreenchange', handler);
  }, []);

  const toggleFullscreen = async () => {
    try {
      if (!document.fullscreenElement) {
        await document.documentElement.requestFullscreen();
      } else {
        await document.exitFullscreen();
      }
    } catch {
      showToast('Fullscreen is not supported in this browser context.', 'info');
    }
  };

  // Persist session periodically (every 5 seconds while running)
  useEffect(() => {
    if (session.stage !== 'running') return;
    const interval = window.setInterval(() => {
      if (submittedLockRef.current || exitedIntentionallyRef.current) return;
      void saveSession({ ...sessionRef.current, lastSavedAt: Date.now() });
    }, 5000);
    return () => window.clearInterval(interval);
  }, [session.stage, saveSession]);

  // Save on unmount / tab close ONLY if not submitted or discarded
  useEffect(() => {
    const saveIfActive = () => {
      const latest = sessionRef.current;
      if (
        latest.stage === 'running' &&
        !submittedLockRef.current &&
        !exitedIntentionallyRef.current
      ) {
        const snap = latest.examSnapshot;
        const sec = snap.sections[latest.currentSectionIndex];
        const q = sec?.questions[latest.currentQuestionIndex];
        let nextResponses = latest.responses;
        if (q) {
          const flushed = computeNextResponseState(
            latest.responses[q.id],
            'navigate_away',
            pendingRef.current,
            snap.settings.autoSaveOnPaletteNav
          );
          nextResponses = { ...latest.responses, [q.id]: flushed };
        }
        void saveSession({
          ...latest,
          responses: nextResponses,
          isPaused: snap.settings.allowPause ? true : latest.isPaused,
          lastSavedAt: Date.now(),
        });
      }
    };
    window.addEventListener('beforeunload', saveIfActive);
    return () => {
      saveIfActive();
      window.removeEventListener('beforeunload', saveIfActive);
    };
  }, [saveSession]);

  // Tab switch detection
  useEffect(() => {
    if (session.stage !== 'running' || session.isPaused) return;
    const onVisibility = () => {
      if (document.hidden && !submittedLockRef.current) {
        const latest = sessionRef.current;
        const next: ActiveSession = {
          ...latest,
          tabSwitchCount: latest.tabSwitchCount + 1,
        };
        commitSession(next, false);
      }
    };
    document.addEventListener('visibilitychange', onVisibility);
    return () => document.removeEventListener('visibilitychange', onVisibility);
  }, [session.stage, session.isPaused, commitSession]);

  const finalizeSubmit = useCallback(
    async (autoSubmitted = false) => {
      if (submittedLockRef.current) return;
      submittedLockRef.current = true;
      setIsSubmitting(true);

      try {
        const latest = sessionRef.current;
        const snap = latest.examSnapshot;
        const sec = snap.sections[latest.currentSectionIndex];
        const q = sec?.questions[latest.currentQuestionIndex];

        let finalResponses = latest.responses;
        if (q) {
          const flushed = computeNextResponseState(
            latest.responses[q.id],
            'navigate_away',
            pendingRef.current,
            snap.settings.autoSaveOnPaletteNav
          );
          finalResponses = { ...latest.responses, [q.id]: flushed };
        }

        const finalSession: ActiveSession = {
          ...latest,
          responses: finalResponses,
          lastSavedAt: Date.now(),
        };

        const attempt = evaluateExamSession(
          finalSession,
          candidateIdentity.name,
          candidateIdentity.rollNo,
          autoSubmitted
        );

        await recordAttempt(attempt, finalSession.id);
        if (document.fullscreenElement) {
          document.exitFullscreen().catch(() => {});
        }
        showToast(
          autoSubmitted
            ? 'Time expired! Exam submitted automatically.'
            : 'Exam submitted successfully!',
          autoSubmitted ? 'info' : 'success'
        );
        navigate(`/results/${encodeURIComponent(attempt.id)}`);
      } catch (err) {
        submittedLockRef.current = false;
        setIsSubmitting(false);
        showToast(
          err instanceof Error ? err.message : 'Failed to submit exam. Please try again.',
          'error'
        );
      }
    },
    [candidateIdentity, recordAttempt, navigate, showToast]
  );

  const finalizeSubmitRef = useRef(finalizeSubmit);
  finalizeSubmitRef.current = finalizeSubmit;

  // 1-second exam countdown & per-question time tracker (StrictMode safe, zero updater side-effects)
  useEffect(() => {
    if (session.stage !== 'running' || session.isPaused) return;

    const timer = window.setInterval(() => {
      const prev = sessionRef.current;
      if (prev.stage !== 'running' || prev.isPaused || submittedLockRef.current) return;

      const snap = prev.examSnapshot;
      const sec = snap.sections[prev.currentSectionIndex];
      const q = sec?.questions[prev.currentQuestionIndex];
      if (!sec || !q) return;

      const prevQResp = prev.responses[q.id];
      const nextResponses: Record<string, QuestionResponseState> = prevQResp
        ? {
            ...prev.responses,
            [q.id]: {
              ...prevQResp,
              timeSpentSeconds: prevQResp.timeSpentSeconds + 1,
            },
          }
        : prev.responses;

      if (snap.settings.sectionalTiming) {
        const secLeft = Math.max(0, (prev.sectionRemainingSeconds[sec.id] ?? 0) - 1);
        const nextSectionRemaining = { ...prev.sectionRemainingSeconds, [sec.id]: secLeft };
        const nextTotalLeft = Object.values(nextSectionRemaining).reduce(
          (sum, v) => sum + Math.max(0, v),
          0
        );

        if (secLeft <= 0) {
          const nextLocked = prev.lockedSectionIds.includes(sec.id)
            ? prev.lockedSectionIds
            : [...prev.lockedSectionIds, sec.id];

          const nextSecIdx = snap.sections.findIndex((s) => !nextLocked.includes(s.id));

          if (nextSecIdx === -1) {
            const expiredSession: ActiveSession = {
              ...prev,
              responses: nextResponses,
              totalRemainingSeconds: 0,
              sectionRemainingSeconds: nextSectionRemaining,
              lockedSectionIds: nextLocked,
            };
            commitSession(expiredSession, false);
            void finalizeSubmitRef.current(true);
            return;
          }

          nextResponses[q.id] = computeNextResponseState(
            nextResponses[q.id],
            'navigate_away',
            pendingRef.current,
            snap.settings.autoSaveOnPaletteNav
          );

          const nextSec = snap.sections[nextSecIdx];
          const firstNextQ = nextSec.questions[0];
          if (firstNextQ && nextResponses[firstNextQ.id]) {
            const targetPrev = nextResponses[firstNextQ.id];
            nextResponses[firstNextQ.id] = {
              ...targetPrev,
              status: targetPrev.status === 'not_visited' ? 'not_answered' : targetPrev.status,
              visitCount: targetPrev.visitCount + 1,
            };
          }

          const advancedSession: ActiveSession = {
            ...prev,
            responses: nextResponses,
            currentSectionIndex: nextSecIdx,
            currentQuestionIndex: 0,
            totalRemainingSeconds: nextTotalLeft,
            sectionRemainingSeconds: nextSectionRemaining,
            lockedSectionIds: nextLocked,
            lastSavedAt: Date.now(),
          };
          commitSession(advancedSession, true);
          showToast(`Section "${sec.name}" time ended. Switched to "${nextSec.name}".`, 'info');
          return;
        }

        commitSession(
          {
            ...prev,
            responses: nextResponses,
            totalRemainingSeconds: nextTotalLeft,
            sectionRemainingSeconds: nextSectionRemaining,
          },
          false
        );
        return;
      }

      // Composite timer mode
      if (snap.settings.durationMinutes > 0) {
        const nextTotal = prev.totalRemainingSeconds - 1;
        if (nextTotal <= 0) {
          commitSession(
            {
              ...prev,
              responses: nextResponses,
              totalRemainingSeconds: 0,
            },
            false
          );
          void finalizeSubmitRef.current(true);
          return;
        }
        commitSession(
          {
            ...prev,
            responses: nextResponses,
            totalRemainingSeconds: nextTotal,
          },
          false
        );
        return;
      }

      // Untimed practice mode
      commitSession({ ...prev, responses: nextResponses }, false);
    }, 1000);

    return () => window.clearInterval(timer);
  }, [session.stage, session.isPaused, commitSession, showToast]);

  // Navigation & Action Handlers
  const navigateTo = useCallback(
    (
      targetSecIdx: number,
      targetQIdx: number,
      leaveAction: 'save' | 'mark' | 'navigate_away'
    ) => {
      const prev = sessionRef.current;
      const snap = prev.examSnapshot;
      const curSec = snap.sections[prev.currentSectionIndex];
      const curQ = curSec?.questions[prev.currentQuestionIndex];
      const targetSec = snap.sections[targetSecIdx];
      const targetQ = targetSec?.questions[targetQIdx];
      if (!curQ || !targetQ) return;

      if (
        snap.settings.sectionalTiming &&
        targetSecIdx !== prev.currentSectionIndex &&
        !snap.settings.allowBackNavigationInSectionalTiming
      ) {
        return;
      }
      if (prev.lockedSectionIds.includes(targetSec.id)) {
        return;
      }

      const nextResponses = { ...prev.responses };
      nextResponses[curQ.id] = computeNextResponseState(
        nextResponses[curQ.id],
        leaveAction,
        pendingRef.current,
        snap.settings.autoSaveOnPaletteNav
      );

      const targetResp = nextResponses[targetQ.id];
      if (targetResp) {
        nextResponses[targetQ.id] = {
          ...targetResp,
          status: targetResp.status === 'not_visited' ? 'not_answered' : targetResp.status,
          visitCount: targetResp.visitCount + 1,
        };
      }

      commitSession(
        {
          ...prev,
          responses: nextResponses,
          currentSectionIndex: targetSecIdx,
          currentQuestionIndex: targetQIdx,
          lastSavedAt: Date.now(),
        },
        true
      );
    },
    [commitSession]
  );

  const findAdjacentQuestion = useCallback(
    (direction: 'next' | 'prev'): { sIdx: number; qIdx: number } | null => {
      const prev = sessionRef.current;
      const snap = prev.examSnapshot;
      const curS = prev.currentSectionIndex;
      const curQ = prev.currentQuestionIndex;
      const sec = snap.sections[curS];
      if (!sec) return null;

      const canCrossSections =
        !snap.settings.sectionalTiming || snap.settings.allowBackNavigationInSectionalTiming;

      if (direction === 'next') {
        if (curQ + 1 < sec.questions.length) {
          return { sIdx: curS, qIdx: curQ + 1 };
        }
        if (!canCrossSections) {
          return { sIdx: curS, qIdx: 0 };
        }
        for (let offset = 1; offset <= snap.sections.length; offset++) {
          const candidateIdx = (curS + offset) % snap.sections.length;
          const candidateSec = snap.sections[candidateIdx];
          if (!prev.lockedSectionIds.includes(candidateSec.id) && candidateSec.questions.length > 0) {
            return { sIdx: candidateIdx, qIdx: 0 };
          }
        }
        return { sIdx: curS, qIdx: 0 };
      }

      if (curQ - 1 >= 0) {
        return { sIdx: curS, qIdx: curQ - 1 };
      }
      if (!canCrossSections) {
        return { sIdx: curS, qIdx: sec.questions.length - 1 };
      }
      for (let offset = 1; offset <= snap.sections.length; offset++) {
        const candidateIdx = (curS - offset + snap.sections.length) % snap.sections.length;
        const candidateSec = snap.sections[candidateIdx];
        if (!prev.lockedSectionIds.includes(candidateSec.id) && candidateSec.questions.length > 0) {
          return { sIdx: candidateIdx, qIdx: candidateSec.questions.length - 1 };
        }
      }
      return { sIdx: curS, qIdx: sec.questions.length - 1 };
    },
    []
  );

  const handleSaveAndNext = useCallback(() => {
    const next = findAdjacentQuestion('next');
    if (!next) return;
    if (
      next.sIdx === sessionRef.current.currentSectionIndex &&
      next.qIdx === sessionRef.current.currentQuestionIndex
    ) {
      const prev = sessionRef.current;
      const curQ =
        prev.examSnapshot.sections[prev.currentSectionIndex]?.questions[prev.currentQuestionIndex];
      if (!curQ) return;
      const nextResp = computeNextResponseState(
        prev.responses[curQ.id],
        'save',
        pendingRef.current,
        prev.examSnapshot.settings.autoSaveOnPaletteNav
      );
      commitSession(
        {
          ...prev,
          responses: { ...prev.responses, [curQ.id]: nextResp },
          lastSavedAt: Date.now(),
        },
        true
      );
      return;
    }
    navigateTo(next.sIdx, next.qIdx, 'save');
  }, [findAdjacentQuestion, navigateTo, commitSession]);

  const handleMarkAndNext = useCallback(() => {
    const next = findAdjacentQuestion('next');
    if (!next) return;
    if (
      next.sIdx === sessionRef.current.currentSectionIndex &&
      next.qIdx === sessionRef.current.currentQuestionIndex
    ) {
      const prev = sessionRef.current;
      const curQ =
        prev.examSnapshot.sections[prev.currentSectionIndex]?.questions[prev.currentQuestionIndex];
      if (!curQ) return;
      const nextResp = computeNextResponseState(
        prev.responses[curQ.id],
        'mark',
        pendingRef.current,
        prev.examSnapshot.settings.autoSaveOnPaletteNav
      );
      commitSession(
        {
          ...prev,
          responses: { ...prev.responses, [curQ.id]: nextResp },
          lastSavedAt: Date.now(),
        },
        true
      );
      return;
    }
    navigateTo(next.sIdx, next.qIdx, 'mark');
  }, [findAdjacentQuestion, navigateTo, commitSession]);

  const handleClearResponse = useCallback(() => {
    pendingRef.current = [];
    setPendingSelection([]);
    const prev = sessionRef.current;
    const curQ =
      prev.examSnapshot.sections[prev.currentSectionIndex]?.questions[prev.currentQuestionIndex];
    if (!curQ) return;
    const cleared = computeNextResponseState(
      prev.responses[curQ.id],
      'clear',
      [],
      prev.examSnapshot.settings.autoSaveOnPaletteNav
    );
    commitSession(
      {
        ...prev,
        responses: { ...prev.responses, [curQ.id]: cleared },
        lastSavedAt: Date.now(),
      },
      true
    );
  }, [commitSession]);

  const handlePrevious = useCallback(() => {
    const prevPos = findAdjacentQuestion('prev');
    if (prevPos) {
      navigateTo(prevPos.sIdx, prevPos.qIdx, 'navigate_away');
    }
  }, [findAdjacentQuestion, navigateTo]);

  const handleOptionSelect = useCallback(
    (optIndex: number) => {
      if (!currentQuestion) return;
      if (currentQuestion.type === 'multi') {
        const prev = pendingRef.current;
        const next = prev.includes(optIndex)
          ? prev.filter((i) => i !== optIndex)
          : [...prev, optIndex].sort((a, b) => a - b);
        pendingRef.current = next;
        setPendingSelection(next);
      } else {
        const next = [optIndex];
        pendingRef.current = next;
        setPendingSelection(next);
      }
    },
    [currentQuestion]
  );

  // Keyboard shortcuts during live exam
  useEffect(() => {
    if (session.stage !== 'running' || session.isPaused) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.metaKey || e.altKey) return;
      if (
        summaryModalOpen ||
        paperModalOpen ||
        instructionsModalOpen ||
        roughPadOpen ||
        calcOpen ||
        exitConfirmOpen ||
        mobileDrawerOpen
      ) {
        return;
      }
      const target = e.target as HTMLElement | null;
      if (target?.isContentEditable) return;
      const tag = target?.tagName;
      if (tag === 'INPUT' && (target as HTMLInputElement).type === 'text') return;
      if (tag === 'TEXTAREA' || tag === 'SELECT') return;
      if (e.key === 'Enter' && (tag === 'BUTTON' || tag === 'A')) return;

      if (e.key >= '1' && e.key <= '8' && currentQuestion) {
        const idx = Number(e.key) - 1;
        if (idx < currentQuestion.options.length) {
          e.preventDefault();
          handleOptionSelect(idx);
        }
      } else if (e.key === 'ArrowRight' || (e.key === 'Enter' && !e.shiftKey)) {
        e.preventDefault();
        handleSaveAndNext();
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault();
        handlePrevious();
      } else if (e.key.toLowerCase() === 'm') {
        e.preventDefault();
        handleMarkAndNext();
      } else if (e.key.toLowerCase() === 'c') {
        e.preventDefault();
        handleClearResponse();
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [
    session.stage,
    session.isPaused,
    summaryModalOpen,
    paperModalOpen,
    instructionsModalOpen,
    roughPadOpen,
    calcOpen,
    exitConfirmOpen,
    mobileDrawerOpen,
    currentQuestion,
    handleOptionSelect,
    handleSaveAndNext,
    handlePrevious,
    handleMarkAndNext,
    handleClearResponse,
  ]);

  const handleOpenSubmitModal = () => {
    if (currentQuestion) {
      const prev = sessionRef.current;
      const flushed = computeNextResponseState(
        prev.responses[currentQuestion.id],
        'navigate_away',
        pendingRef.current,
        prev.examSnapshot.settings.autoSaveOnPaletteNav
      );
      commitSession(
        {
          ...prev,
          responses: { ...prev.responses, [currentQuestion.id]: flushed },
        },
        false
      );
    }
    setSummaryModalOpen(true);
  };

  const handleSaveAndExit = async () => {
    exitedIntentionallyRef.current = true;
    const latest = sessionRef.current;
    const sec = latest.examSnapshot.sections[latest.currentSectionIndex];
    const q = sec?.questions[latest.currentQuestionIndex];
    let updatedResponses = latest.responses;
    if (q) {
      updatedResponses = {
        ...latest.responses,
        [q.id]: computeNextResponseState(
          latest.responses[q.id],
          'navigate_away',
          pendingRef.current,
          latest.examSnapshot.settings.autoSaveOnPaletteNav
        ),
      };
    }
    await saveSession({
      ...latest,
      responses: updatedResponses,
      isPaused: true,
      lastSavedAt: Date.now(),
    });
    if (document.fullscreenElement) {
      document.exitFullscreen().catch(() => {});
    }
    showToast('Progress saved! You can resume anytime from the Dashboard.', 'info');
    navigate('/');
  };

  const handleDiscardAndExit = async () => {
    exitedIntentionallyRef.current = true;
    await removeSession(session.id);
    if (document.fullscreenElement) {
      document.exitFullscreen().catch(() => {});
    }
    navigate('/');
  };

  const handleFontScaleChange = (sz: 'sm' | 'md' | 'lg') => {
    setFontScale(sz);
    void updateProfile({ ...profile, preferredFontScale: sz });
  };

  const isBookmarked = useMemo(() => {
    if (!currentQuestion) return false;
    const bmId = `${exam.id}_${currentQuestion.id}`;
    return bookmarks.some((b) => b.id === bmId);
  }, [bookmarks, exam.id, currentQuestion]);

  const handleToggleBookmark = async () => {
    if (!currentQuestion || !currentSection) return;
    const bmId = `${exam.id}_${currentQuestion.id}`;
    const added = await toggleBookmark({
      id: bmId,
      examId: exam.id,
      examTitle: exam.title,
      sectionName: currentSection.name,
      question: currentQuestion,
      createdAt: Date.now(),
    });
    showToast(added ? 'Question saved to Revision Bank.' : 'Removed from Revision Bank.', 'info');
  };

  // Stage 1: Login Screen
  if (session.stage === 'login') {
    return (
      <LoginScreen
        exam={session.examSnapshot}
        profile={profile}
        onExit={() => {
          exitedIntentionallyRef.current = true;
          navigate('/');
        }}
        onSignIn={(rawName, rawRollNo) => {
          const name = rawName.trim() || profile.name;
          const rollNo = rawRollNo.trim() || profile.rollNumber;
          setCandidateIdentity({ name, rollNo });
          if (name !== profile.name || rollNo !== profile.rollNumber) {
            void updateProfile({ ...profile, name, rollNumber: rollNo });
          }
          if (session.examSnapshot.settings.showInstructionsScreen) {
            commitSession({ ...sessionRef.current, stage: 'instructions' }, false);
          } else {
            const prev = sessionRef.current;
            const firstQ = prev.examSnapshot.sections[0]?.questions[0];
            const existingFirst = firstQ ? prev.responses[firstQ.id] : undefined;
            commitSession(
              {
                ...prev,
                stage: 'running',
                startedAt: Date.now(),
                lastSavedAt: Date.now(),
                responses: firstQ
                  ? {
                      ...prev.responses,
                      [firstQ.id]: {
                        selectedIndices: existingFirst?.selectedIndices ?? [],
                        timeSpentSeconds: existingFirst?.timeSpentSeconds ?? 0,
                        status:
                          !existingFirst || existingFirst.status === 'not_visited'
                            ? 'not_answered'
                            : existingFirst.status,
                        visitCount: Math.max(1, existingFirst?.visitCount ?? 0),
                      },
                    }
                  : prev.responses,
              },
              true
            );
          }
        }}
      />
    );
  }

  // Stage 2: General Instructions Screen
  if (session.stage === 'instructions') {
    return (
      <InstructionsScreen
        exam={session.examSnapshot}
        profile={{ ...profile, name: candidateIdentity.name, rollNumber: candidateIdentity.rollNo }}
        initialLanguage={session.language}
        onBack={() => {
          if (session.examSnapshot.settings.showLoginScreen) {
            commitSession({ ...sessionRef.current, stage: 'login' }, false);
          } else {
            exitedIntentionallyRef.current = true;
            navigate('/');
          }
        }}
        onStart={(chosenLang) => {
          if (session.examSnapshot.settings.strictFullscreenPrompt) {
            document.documentElement.requestFullscreen?.().catch(() => {});
          }
          const prev = sessionRef.current;
          const firstQ = prev.examSnapshot.sections[0]?.questions[0];
          const nextResponses = { ...prev.responses };
          if (firstQ && nextResponses[firstQ.id]) {
            nextResponses[firstQ.id] = {
              ...nextResponses[firstQ.id],
              status:
                nextResponses[firstQ.id].status === 'not_visited'
                  ? 'not_answered'
                  : nextResponses[firstQ.id].status,
              visitCount: Math.max(1, nextResponses[firstQ.id].visitCount),
            };
          }
          commitSession(
            {
              ...prev,
              language: chosenLang,
              stage: 'running',
              startedAt: Date.now(),
              lastSavedAt: Date.now(),
              isPaused: false,
              responses: nextResponses,
            },
            true
          );
        }}
      />
    );
  }

  // Stage 3: Live Authentic CBT Exam Interface
  if (!currentSection || !currentQuestion) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-white p-6 text-center dark:bg-neutral-950 dark:text-neutral-100">
        <p className="text-slate-700 dark:text-neutral-300">No questions found in this exam.</p>
        <button
          type="button"
          onClick={() => navigate('/')}
          className="mt-4 rounded bg-orange-600 px-4 py-2 text-sm font-semibold text-white hover:bg-orange-700"
        >
          Back to Dashboard
        </button>
      </div>
    );
  }

  const snap = session.examSnapshot;
  const { positive: qPosMarks, negative: qNegMarks } = getEffectiveQuestionMarks(
    currentQuestion,
    currentSection,
    snap
  );
  const currentSectionCounts = countPaletteStatuses(currentSection.questions, session.responses);

  const activeTimerSeconds = snap.settings.sectionalTiming
    ? session.sectionRemainingSeconds[currentSection.id] ?? 0
    : session.totalRemainingSeconds;

  const isUntimed = !snap.settings.sectionalTiming && snap.settings.durationMinutes === 0;
  const isCriticalTime = !isUntimed && activeTimerSeconds <= 60;
  const isWarningTime = !isUntimed && activeTimerSeconds > 60 && activeTimerSeconds <= 300;

  const questionHasHindi =
    hasHindiTranslation(currentQuestion.question) ||
    currentQuestion.options.some((o) => hasHindiTranslation(o)) ||
    hasHindiTranslation(currentQuestion.passage);

  const effectiveLang: ExamLanguage =
    session.language === 'hi' && questionHasHindi ? 'hi' : 'en';

  const passageText = getLocalizedText(currentQuestion.passage, effectiveLang);
  const passageTitle = getLocalizedText(currentQuestion.passageTitle, effectiveLang);
  const questionText = getLocalizedText(currentQuestion.question, effectiveLang);
  const explanationText = getLocalizedText(currentQuestion.explanation, effectiveLang);

  const fontSizeClass =
    fontScale === 'sm'
      ? 'text-[14px]'
      : fontScale === 'lg'
        ? 'text-[18px]'
        : 'text-[15.5px]';

  const PaletteSidebarContent = (
    <div className="flex h-full flex-col bg-orange-50 dark:bg-neutral-900">
      {/* Candidate Profile Header */}
      <div className="flex items-center gap-3 border-b border-slate-300 bg-white px-3 py-2.5 dark:border-neutral-800 dark:bg-neutral-950">
        <div
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded border border-slate-300 text-base font-bold text-white shadow-sm dark:border-neutral-700"
          style={{ backgroundColor: profile.avatarColor }}
        >
          {candidateIdentity.name.trim().charAt(0).toUpperCase() || 'C'}
        </div>
        <div className="min-w-0 flex-1">
          <div className="truncate text-sm font-bold text-slate-900 dark:text-white">
            {candidateIdentity.name}
          </div>
          <div className="truncate font-mono text-[11px] text-slate-500 dark:text-neutral-400">
            {candidateIdentity.rollNo}
          </div>
        </div>
      </div>

      {/* 5-Symbol Status Legend */}
      <div className="border-b border-slate-300 bg-white px-3 py-2.5 text-[11px] text-slate-700 dark:border-neutral-800 dark:bg-neutral-950/70 dark:text-neutral-300">
        <div className="grid grid-cols-2 gap-x-2 gap-y-2">
          <div className="flex items-center gap-1.5">
            <PaletteBadge status="answered" label={currentSectionCounts.answered} size="sm" />
            <span className="leading-tight">Answered</span>
          </div>
          <div className="flex items-center gap-1.5">
            <PaletteBadge
              status="not_answered"
              label={currentSectionCounts.not_answered}
              size="sm"
            />
            <span className="leading-tight">Not Answered</span>
          </div>
          <div className="flex items-center gap-1.5">
            <PaletteBadge
              status="not_visited"
              label={currentSectionCounts.not_visited}
              size="sm"
            />
            <span className="leading-tight">Not Visited</span>
          </div>
          <div className="flex items-center gap-1.5">
            <PaletteBadge status="marked" label={currentSectionCounts.marked} size="sm" />
            <span className="leading-tight">Marked for Review</span>
          </div>
          <div className="col-span-2 flex items-center gap-1.5">
            <PaletteBadge
              status="answered_marked"
              label={currentSectionCounts.answered_marked}
              size="sm"
            />
            <span className="leading-tight">
              Answered &amp; Marked for Review{' '}
              <span className="text-[10px] text-slate-500 dark:text-neutral-400">
                ({snap.settings.evaluateMarkedAnswered ? 'evaluated' : 'not evaluated'})
              </span>
            </span>
          </div>
        </div>
      </div>

      {/* Section Name Orange Bar */}
      <div className="bg-orange-600 px-3 py-2 text-white dark:bg-orange-700">
        <div className="truncate text-xs font-bold">{currentSection.name}</div>
        <div className="text-[11px] text-orange-100">Choose a Question</div>
      </div>

      {/* Scrollable Numbered Question Palette Grid */}
      <div className="flex-1 overflow-y-auto p-3">
        <div className="grid grid-cols-5 gap-2.5 sm:grid-cols-4 xl:grid-cols-5">
          {currentSection.questions.map((q, qIdx) => {
            const st = session.responses[q.id]?.status ?? 'not_visited';
            const isActive = qIdx === session.currentQuestionIndex;
            return (
              <div key={q.id} className="flex justify-center">
                <PaletteBadge
                  status={st}
                  label={qIdx + 1}
                  size="md"
                  active={isActive}
                  title={`Question ${qIdx + 1} (${st.replace('_', ' ')})`}
                  onClick={() => {
                    navigateTo(session.currentSectionIndex, qIdx, 'navigate_away');
                    setMobileDrawerOpen(false);
                  }}
                />
              </div>
            );
          })}
        </div>
      </div>

      {/* Submit Button Footer */}
      <div className="border-t border-orange-200 bg-orange-100/70 p-3 dark:border-neutral-800 dark:bg-neutral-950">
        <button
          type="button"
          onClick={handleOpenSubmitModal}
          className="w-full rounded bg-orange-600 py-2.5 text-sm font-bold tracking-wide text-white shadow transition hover:bg-orange-700 active:translate-y-px"
        >
          Submit
        </button>
      </div>
    </div>
  );

  return (
    <div className="flex h-screen flex-col overflow-hidden bg-white select-none sm:select-text dark:bg-neutral-950 dark:text-neutral-100">
      {/* TOP BAR (TCS iON Dark Header Strip) */}
      <header className="flex shrink-0 items-center justify-between gap-2 bg-[#1E1E1E] px-3 py-1.5 text-white dark:border-b dark:border-neutral-800 dark:bg-neutral-900">
        <div className="flex min-w-0 flex-1 items-center gap-2">
          <span className="truncate text-xs font-bold sm:text-sm">{snap.title}</span>
          <span className="hidden shrink-0 whitespace-nowrap rounded bg-orange-500/20 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-orange-300 sm:inline">
            {snap.category}
          </span>
          {session.tabSwitchCount > 0 && (
            <span
              className="flex shrink-0 items-center gap-1 whitespace-nowrap rounded bg-amber-500/20 px-2 py-0.5 text-[11px] font-semibold text-amber-300"
              title="Tab switches detected during this session"
            >
              <ShieldAlert className="h-3.5 w-3.5 shrink-0" />
              Switches: {session.tabSwitchCount}
            </span>
          )}
        </div>

        <div className="flex shrink-0 items-center gap-1.5 whitespace-nowrap text-xs">
          <button
            type="button"
            onClick={() => setPaperModalOpen(true)}
            className="flex shrink-0 items-center gap-1 whitespace-nowrap rounded bg-white/10 px-2 py-1 font-medium hover:bg-white/20"
            title="View full section question paper"
          >
            <FileText className="h-3.5 w-3.5 shrink-0 text-orange-300" />
            <span className="hidden md:inline">Question Paper</span>
          </button>

          <button
            type="button"
            onClick={() => setInstructionsModalOpen(true)}
            className="flex shrink-0 items-center gap-1 whitespace-nowrap rounded bg-white/10 px-2 py-1 font-medium hover:bg-white/20"
            title="View Instructions"
          >
            <Info className="h-3.5 w-3.5 shrink-0 text-orange-300" />
            <span className="hidden md:inline">Instructions</span>
          </button>

          {snap.settings.showCalculator && (
            <button
              type="button"
              onClick={() => setCalcOpen((v) => !v)}
              className={cn(
                'flex shrink-0 items-center gap-1 whitespace-nowrap rounded px-2 py-1 font-medium transition',
                calcOpen ? 'bg-orange-600 text-white' : 'bg-white/10 hover:bg-white/20'
              )}
              title="Scientific Calculator"
            >
              <Calculator className="h-3.5 w-3.5 shrink-0" />
              <span className="hidden lg:inline">Calc</span>
            </button>
          )}

          {snap.settings.showRoughPad && (
            <button
              type="button"
              onClick={() => setRoughPadOpen(true)}
              className="flex shrink-0 items-center gap-1 whitespace-nowrap rounded bg-white/10 px-2 py-1 font-medium hover:bg-white/20"
              title="Open Rough Sheet"
            >
              <PenLine className="h-3.5 w-3.5 shrink-0 text-amber-300" />
              <span className="hidden lg:inline">Rough Pad</span>
            </button>
          )}

          {/* Font zoom control */}
          <div className="hidden shrink-0 items-center overflow-hidden rounded border border-white/20 sm:flex">
            {(['sm', 'md', 'lg'] as const).map((sz, i) => (
              <button
                key={sz}
                type="button"
                onClick={() => handleFontScaleChange(sz)}
                className={cn(
                  'whitespace-nowrap px-1.5 py-0.5 text-[11px] font-semibold',
                  fontScale === sz ? 'bg-orange-600 text-white' : 'hover:bg-white/15'
                )}
              >
                {i === 0 ? 'A-' : i === 1 ? 'A' : 'A+'}
              </button>
            ))}
          </div>

          <button
            type="button"
            onClick={() => void toggleTheme()}
            className="shrink-0 rounded bg-white/10 p-1 text-amber-300 hover:bg-white/20"
            title={theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
            aria-label={theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
          >
            {theme === 'dark' ? <Sun className="h-3.5 w-3.5" /> : <Moon className="h-3.5 w-3.5" />}
          </button>

          <button
            type="button"
            onClick={toggleFullscreen}
            className="hidden shrink-0 rounded bg-white/10 p-1 hover:bg-white/20 sm:inline-flex"
            title={isFullscreen ? 'Exit Fullscreen' : 'Enter Fullscreen'}
            aria-label={isFullscreen ? 'Exit Fullscreen' : 'Enter Fullscreen'}
          >
            {isFullscreen ? (
              <Minimize2 className="h-3.5 w-3.5" />
            ) : (
              <Maximize2 className="h-3.5 w-3.5" />
            )}
          </button>

          {snap.settings.allowPause ? (
            <button
              type="button"
              onClick={() => void handleSaveAndExit()}
              className="flex shrink-0 items-center gap-1 whitespace-nowrap rounded bg-orange-600 px-2.5 py-1 font-bold text-white hover:bg-orange-500"
              title="Save progress & exit to Dashboard"
            >
              <LogOut className="h-3.5 w-3.5 shrink-0" />
              <span className="hidden sm:inline">Save &amp; Exit</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={() => setExitConfirmOpen(true)}
              className="shrink-0 whitespace-nowrap rounded bg-rose-600 px-2 py-1 font-semibold text-white hover:bg-rose-500"
            >
              Exit
            </button>
          )}

          {/* Mobile Palette Drawer Trigger */}
          <button
            type="button"
            onClick={() => setMobileDrawerOpen(true)}
            className="flex shrink-0 items-center gap-1 whitespace-nowrap rounded bg-orange-600 px-2.5 py-1 font-bold text-white lg:hidden"
          >
            <Grid className="h-3.5 w-3.5 shrink-0" />
            Palette
          </button>
        </div>
      </header>

      {/* SECTION TABS + COUNTDOWN TIMER BAR */}
      <div className="flex shrink-0 flex-wrap items-center justify-between gap-2 border-b border-slate-300 bg-[#F4F6F9] px-3 py-1.5 dark:border-neutral-800 dark:bg-neutral-900">
        <div className="flex min-w-0 flex-1 items-center gap-1.5 overflow-x-auto">
          <span className="hidden shrink-0 text-[11px] font-bold uppercase tracking-wide text-slate-500 sm:inline dark:text-neutral-400">
            Sections:
          </span>
          {snap.sections.map((sec, sIdx) => {
            const isActive = sIdx === session.currentSectionIndex;
            const isLocked = session.lockedSectionIds.includes(sec.id);
            const blockedBySectional =
              snap.settings.sectionalTiming &&
              !snap.settings.allowBackNavigationInSectionalTiming &&
              !isActive;
            const counts = countPaletteStatuses(sec.questions, session.responses);
            const answeredTotal = counts.answered + counts.answered_marked;

            return (
              <button
                key={sec.id}
                type="button"
                disabled={isLocked || blockedBySectional}
                onClick={() => navigateTo(sIdx, 0, 'navigate_away')}
                className={cn(
                  'flex shrink-0 items-center gap-1.5 rounded border px-3 py-1 text-xs font-semibold transition',
                  isActive
                    ? 'border-orange-700 bg-orange-600 text-white shadow-sm'
                    : isLocked || blockedBySectional
                      ? 'cursor-not-allowed border-slate-200 bg-slate-100 text-slate-400 dark:border-neutral-800 dark:bg-neutral-800/50 dark:text-neutral-600'
                      : 'border-slate-300 bg-white text-slate-700 hover:border-orange-400 hover:bg-orange-50 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-200 dark:hover:border-orange-500 dark:hover:bg-neutral-700'
                )}
              >
                {(isLocked || blockedBySectional) && <Lock className="h-3 w-3" />}
                <span>{sec.name}</span>
                <span
                  className={cn(
                    'rounded-full px-1.5 py-0 text-[10px]',
                    isActive
                      ? 'bg-white/20 text-white'
                      : 'bg-slate-100 text-slate-600 dark:bg-neutral-700 dark:text-neutral-300'
                  )}
                >
                  {answeredTotal}/{sec.questions.length}
                </span>
              </button>
            );
          })}
        </div>

        {/* Countdown Clock */}
        <div className="flex shrink-0 items-center gap-2">
          {snap.settings.allowPause && (
            <button
              type="button"
              onClick={() =>
                commitSession({ ...sessionRef.current, isPaused: !sessionRef.current.isPaused }, true)
              }
              className="rounded border border-slate-300 bg-white px-2.5 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-100 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-200 dark:hover:bg-neutral-700"
              title={session.isPaused ? 'Resume timer' : 'Pause timer in place'}
            >
              {session.isPaused ? (
                <span className="flex items-center gap-1 text-emerald-700 dark:text-emerald-400">
                  <Play className="h-3.5 w-3.5" /> Resume
                </span>
              ) : (
                <span className="flex items-center gap-1">
                  <Pause className="h-3.5 w-3.5" />
                  <span className="hidden sm:inline">Pause</span>
                </span>
              )}
            </button>
          )}

          <div
            className={cn(
              'flex items-center gap-1.5 rounded border px-3 py-1 font-mono text-sm font-bold',
              isUntimed
                ? 'border-slate-300 bg-white text-slate-700 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-200'
                : isCriticalTime
                  ? 'animate-pulse border-rose-500 bg-rose-600 text-white'
                  : isWarningTime
                    ? 'border-amber-400 bg-amber-50 text-amber-900 dark:border-amber-700 dark:bg-amber-950/70 dark:text-amber-200'
                    : 'border-slate-300 bg-white text-slate-900 dark:border-neutral-700 dark:bg-neutral-800 dark:text-white'
            )}
          >
            <Clock className="h-4 w-4" />
            <span className="font-sans text-[11px] font-semibold uppercase opacity-80">
              {isUntimed
                ? 'Elapsed:'
                : snap.settings.sectionalTiming
                  ? 'Section Time:'
                  : 'Time Left:'}
            </span>
            <span>
              {isUntimed
                ? formatTimerMMSS(
                    Object.values(session.responses).reduce(
                      (s, r) => s + r.timeSpentSeconds,
                      0
                    )
                  )
                : formatTimerHMS(activeTimerSeconds)}
            </span>
          </div>
        </div>
      </div>

      {/* MAIN SPLIT WORKSPACE */}
      <div className="relative flex min-h-0 flex-1 overflow-hidden">
        {/* LEFT QUESTION CANVAS */}
        <main className="flex min-w-0 flex-1 flex-col bg-white dark:bg-neutral-950">
          {/* Question Type + Marks + Language Strip */}
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 bg-slate-50 px-4 py-1.5 text-xs dark:border-neutral-800 dark:bg-neutral-900/70">
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-semibold text-slate-700 dark:text-neutral-300">
                Question Type:{' '}
                <strong className="text-slate-900 dark:text-white">
                  {currentQuestion.type === 'multi' ? 'Multiple Select (MSQ)' : 'MCQ'}
                </strong>
              </span>
              {currentQuestion.topic && (
                <span className="rounded border border-orange-200 bg-orange-50 px-2 py-0.5 font-medium text-orange-800 dark:border-orange-900/60 dark:bg-orange-950/60 dark:text-orange-300">
                  {currentQuestion.topic}
                </span>
              )}
              {currentQuestion.difficulty && (
                <span
                  className={cn(
                    'rounded px-2 py-0.5 text-[10px] font-bold uppercase',
                    currentQuestion.difficulty === 'easy' &&
                      'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300',
                    currentQuestion.difficulty === 'medium' &&
                      'bg-amber-50 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300',
                    currentQuestion.difficulty === 'hard' &&
                      'bg-rose-50 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300'
                  )}
                >
                  {currentQuestion.difficulty}
                </span>
              )}
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <span className="font-medium text-slate-600 dark:text-neutral-400">
                Marks:{' '}
                <strong className="text-emerald-700 dark:text-emerald-400">
                  +{formatMarks(qPosMarks)}
                </strong>
                <span className="mx-1.5 text-slate-300 dark:text-neutral-700">|</span>
                Negative:{' '}
                <strong className="text-rose-600 dark:text-rose-400">
                  {qNegMarks > 0 ? `-${formatMarks(qNegMarks)}` : '0'}
                </strong>
              </span>

              {(snap.languages.includes('hi') || questionHasHindi) && (
                <div className="flex items-center gap-1.5">
                  <span className="text-slate-600 dark:text-neutral-400">View in:</span>
                  <select
                    value={session.language}
                    onChange={(e) =>
                      commitSession(
                        { ...sessionRef.current, language: e.target.value as ExamLanguage },
                        true
                      )
                    }
                    className="rounded border border-slate-300 bg-white px-2 py-0.5 text-xs font-semibold text-slate-800 outline-none focus:border-orange-500 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-100"
                  >
                    <option value="en">English</option>
                    <option value="hi">Hindi (हिन्दी)</option>
                  </select>
                </div>
              )}

              <button
                type="button"
                onClick={handleToggleBookmark}
                className={cn(
                  'flex items-center gap-1 rounded border px-2 py-0.5 text-xs font-medium transition',
                  isBookmarked
                    ? 'border-amber-400 bg-amber-50 text-amber-800 dark:border-amber-700 dark:bg-amber-950/60 dark:text-amber-300'
                    : 'border-slate-300 bg-white text-slate-600 hover:bg-slate-100 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-300 dark:hover:bg-neutral-700'
                )}
                title="Bookmark question for later revision"
              >
                <Bookmark
                  className={cn('h-3.5 w-3.5', isBookmarked && 'fill-amber-500 text-amber-600')}
                />
                <span className="hidden sm:inline">{isBookmarked ? 'Saved' : 'Save Q'}</span>
              </button>
            </div>
          </div>

          {/* Question No Header */}
          <div className="flex items-center justify-between border-b border-slate-200 px-4 py-2 dark:border-neutral-800">
            <h2 className="text-sm font-bold text-orange-800 sm:text-base dark:text-orange-400">
              Question No. {session.currentQuestionIndex + 1}
              <span className="ml-2 text-xs font-normal text-slate-500 dark:text-neutral-400">
                of {currentSection.questions.length}
              </span>
            </h2>
            {snap.settings.practiceModeInstantCheck && (
              <button
                type="button"
                onClick={() => {
                  const prev = sessionRef.current;
                  const existing = prev.responses[currentQuestion.id] ?? {
                    selectedIndices: [],
                    status: 'not_answered' as const,
                    timeSpentSeconds: 0,
                    visitCount: 1,
                  };
                  commitSession(
                    {
                      ...prev,
                      responses: {
                        ...prev.responses,
                        [currentQuestion.id]: {
                          ...existing,
                          revealedInPractice: !existing.revealedInPractice,
                        },
                      },
                    },
                    false
                  );
                }}
                className="flex items-center gap-1 rounded border border-orange-300 bg-orange-50 px-2.5 py-1 text-xs font-semibold text-orange-800 hover:bg-orange-100 dark:border-orange-800 dark:bg-orange-950/60 dark:text-orange-300 dark:hover:bg-orange-900/60"
              >
                <HelpCircle className="h-3.5 w-3.5" />
                {currentResp?.revealedInPractice ? 'Hide Solution' : 'Check Answer'}
              </button>
            )}
          </div>

          {/* Question & Optional Split Passage Body */}
          <div
            ref={splitContainerRef}
            className={cn(
              'min-h-0 flex-1 overflow-y-auto',
              passageText ? 'grid lg:grid-cols-2 lg:overflow-hidden' : ''
            )}
          >
            {passageText && (
              <div
                ref={passageScrollRef}
                className="border-b border-slate-200 bg-[#FFFAF5] p-4 sm:p-5 lg:overflow-y-auto lg:border-r lg:border-b-0 dark:border-neutral-800 dark:bg-neutral-900/60"
              >
                {passageTitle && (
                  <div className="mb-2 text-xs font-bold uppercase tracking-wide text-orange-900 dark:text-orange-400">
                    {passageTitle}
                  </div>
                )}
                <MathText
                  text={passageText}
                  className={cn(
                    'leading-relaxed text-slate-800 dark:text-neutral-200',
                    fontSizeClass
                  )}
                />
              </div>
            )}

            <div
              ref={questionScrollRef}
              className={cn('p-4 sm:p-6', passageText && 'lg:overflow-y-auto')}
            >
              {session.language === 'hi' && !questionHasHindi && (
                <div className="mb-3 flex items-center gap-1.5 rounded border border-amber-200 bg-amber-50 px-3 py-1.5 text-xs text-amber-800 dark:border-amber-800 dark:bg-amber-950/50 dark:text-amber-300">
                  <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
                  Hindi translation is not provided for this question; displaying English text.
                </div>
              )}

              <SafeDiagram svg={currentQuestion.svg} image={currentQuestion.image} />

              <MathText
                text={questionText}
                className={cn(
                  'font-medium leading-relaxed text-slate-900 dark:text-neutral-100',
                  fontSizeClass
                )}
              />

              {/* Options List */}
              <div className="mt-5 space-y-2.5">
                {currentQuestion.options.map((opt, idx) => {
                  const isSelected = pendingSelection.includes(idx);
                  const isRevealed = Boolean(
                    snap.settings.practiceModeInstantCheck && currentResp?.revealedInPractice
                  );
                  const isCorrectOpt = currentQuestion.correctIndices.includes(idx);
                  const optText = getLocalizedText(opt, effectiveLang);

                  return (
                    <label
                      key={`${currentQuestion.id}_${idx}`}
                      className={cn(
                        'flex cursor-pointer items-start gap-3 rounded-md border px-3.5 py-3 transition',
                        isRevealed && isCorrectOpt
                          ? 'border-emerald-500 bg-emerald-50/90 dark:border-emerald-600 dark:bg-emerald-950/50'
                          : isRevealed && isSelected && !isCorrectOpt
                            ? 'border-rose-400 bg-rose-50 dark:border-rose-700 dark:bg-rose-950/50'
                            : isSelected
                              ? 'border-orange-600 bg-orange-50 ring-1 ring-orange-600 dark:border-orange-500 dark:bg-orange-950/40 dark:ring-orange-500'
                              : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50 dark:border-neutral-800 dark:bg-neutral-900 dark:hover:border-neutral-700 dark:hover:bg-neutral-800/70'
                      )}
                    >
                      <input
                        type={currentQuestion.type === 'multi' ? 'checkbox' : 'radio'}
                        name={`q_${currentQuestion.id}`}
                        checked={isSelected}
                        onChange={() => handleOptionSelect(idx)}
                        className="mt-1 h-4 w-4 shrink-0 accent-orange-600"
                      />
                      <span className="mt-0.5 shrink-0 text-sm font-bold text-slate-600 dark:text-neutral-400">
                        ({optionIndexToLetter(idx)})
                      </span>
                      <div
                        className={cn(
                          'min-w-0 flex-1 text-slate-900 dark:text-neutral-100',
                          fontSizeClass
                        )}
                      >
                        <MathText text={optText} />
                      </div>
                    </label>
                  );
                })}
              </div>

              {/* Practice Mode Instant Explanation */}
              {snap.settings.practiceModeInstantCheck && currentResp?.revealedInPractice && (
                <div className="mt-5 rounded-md border border-emerald-200 bg-emerald-50/70 p-4 text-sm text-slate-800 dark:border-emerald-800 dark:bg-emerald-950/40 dark:text-neutral-200">
                  <div className="font-bold text-emerald-900 dark:text-emerald-300">
                    Correct Option:{' '}
                    {currentQuestion.correctIndices.map(optionIndexToLetter).join(', ')}
                  </div>
                  {explanationText && (
                    <div className="mt-1.5 text-slate-700 dark:text-neutral-300">
                      <MathText text={explanationText} />
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* BOTTOM ACTION BAR (Authentic CBT Controls) */}
          <footer className="flex shrink-0 flex-wrap items-center justify-between gap-2 border-t border-slate-300 bg-[#F4F6F9] px-3 py-2.5 sm:px-4 dark:border-neutral-800 dark:bg-neutral-900">
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={handleMarkAndNext}
                className="rounded border border-slate-300 bg-white px-3.5 py-2 text-xs font-bold text-slate-800 shadow-xs transition hover:border-purple-400 hover:bg-purple-50 hover:text-purple-900 sm:text-sm dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-200 dark:hover:border-purple-500 dark:hover:bg-purple-950/50 dark:hover:text-purple-200"
              >
                Mark for Review &amp; Next
              </button>
              <button
                type="button"
                onClick={handleClearResponse}
                className="rounded border border-slate-300 bg-white px-3.5 py-2 text-xs font-bold text-slate-700 shadow-xs transition hover:bg-slate-100 sm:text-sm dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-200 dark:hover:bg-neutral-700"
              >
                Clear Response
              </button>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handlePrevious}
                className="rounded border border-slate-300 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100 sm:text-sm dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-200 dark:hover:bg-neutral-700"
              >
                Previous
              </button>
              <button
                type="button"
                onClick={handleSaveAndNext}
                className="rounded bg-orange-600 px-5 py-2 text-xs font-bold text-white shadow transition hover:bg-orange-700 active:translate-y-px sm:text-sm"
              >
                Save &amp; Next
              </button>
              <button
                type="button"
                onClick={handleOpenSubmitModal}
                className="rounded bg-emerald-600 px-4 py-2 text-xs font-bold text-white shadow hover:bg-emerald-700 lg:hidden"
              >
                Submit
              </button>
            </div>
          </footer>
        </main>

        {/* CLASSIC TCS iON SIDEBAR COLLAPSE HANDLE (Desktop) */}
        <div className="hidden items-center border-l border-slate-300 bg-slate-200 lg:flex dark:border-neutral-800 dark:bg-neutral-900">
          <button
            type="button"
            onClick={() => setSidebarOpen((o) => !o)}
            className="flex h-16 w-4 items-center justify-center bg-[#1E1E1E] text-white hover:bg-orange-600 dark:bg-neutral-800 dark:hover:bg-orange-600"
            title={sidebarOpen ? 'Hide Question Palette' : 'Show Question Palette'}
            aria-label={sidebarOpen ? 'Hide Question Palette' : 'Show Question Palette'}
          >
            {sidebarOpen ? (
              <ChevronRight className="h-3.5 w-3.5" />
            ) : (
              <ChevronLeft className="h-3.5 w-3.5" />
            )}
          </button>
        </div>

        {/* RIGHT QUESTION PALETTE SIDEBAR (Desktop) */}
        {sidebarOpen && (
          <aside className="hidden w-72 shrink-0 border-l border-slate-300 lg:block xl:w-80 dark:border-neutral-800">
            {PaletteSidebarContent}
          </aside>
        )}
      </div>

      {/* MOBILE QUESTION PALETTE DRAWER */}
      {mobileDrawerOpen && (
        <div
          className="fixed inset-0 z-40 flex justify-end bg-neutral-900/55 lg:hidden"
          onClick={() => setMobileDrawerOpen(false)}
          role="dialog"
          aria-modal="true"
          aria-label="Question Palette"
        >
          <div
            className="relative flex h-full w-80 max-w-[85vw] flex-col bg-white shadow-2xl dark:bg-neutral-900"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              onClick={() => setMobileDrawerOpen(false)}
              aria-label="Close question palette"
              className="absolute top-2.5 right-2.5 z-10 rounded bg-slate-200 p-1 text-slate-700 dark:bg-neutral-700 dark:text-neutral-200"
            >
              <X className="h-4 w-4" />
            </button>
            {PaletteSidebarContent}
          </div>
        </div>
      )}

      {/* PAUSED OVERLAY */}
      {session.isPaused && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-neutral-900/75 p-4 backdrop-blur-xs">
          <div className="w-full max-w-md rounded-lg border border-slate-200 bg-white p-6 text-center shadow-2xl dark:border-neutral-700 dark:bg-neutral-900">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-orange-100 text-orange-700 dark:bg-orange-950 dark:text-orange-400">
              <Pause className="h-6 w-6" />
            </div>
            <h3 className="mt-3 text-lg font-bold text-slate-900 dark:text-white">
              Examination Paused
            </h3>
            <p className="mt-1 text-sm text-slate-600 dark:text-neutral-400">
              Your timer is paused and all responses are saved securely in local storage.
            </p>
            <div className="mt-5 flex justify-center gap-3">
              <button
                type="button"
                onClick={() => void handleSaveAndExit()}
                className="rounded border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100 dark:border-neutral-700 dark:text-neutral-200 dark:hover:bg-neutral-800"
              >
                Save &amp; Go to Portal
              </button>
              <button
                type="button"
                onClick={() =>
                  commitSession({ ...sessionRef.current, isPaused: false }, true)
                }
                className="flex items-center gap-1.5 rounded bg-orange-600 px-5 py-2 text-sm font-bold text-white hover:bg-orange-700"
              >
                <Play className="h-4 w-4" /> Resume Exam
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODALS & FLOATING TOOLS */}
      <QuestionPaperModal
        open={paperModalOpen}
        onClose={() => setPaperModalOpen(false)}
        exam={snap}
        activeSectionIndex={session.currentSectionIndex}
        language={session.language}
        lockedSectionIds={session.lockedSectionIds}
        onJumpToQuestion={(sIdx, qIdx) => navigateTo(sIdx, qIdx, 'navigate_away')}
      />

      <Modal
        open={instructionsModalOpen}
        onClose={() => setInstructionsModalOpen(false)}
        title="Exam Instructions & Shortcuts"
        headerClassName="bg-[#1E1E1E] text-white border-slate-700 dark:bg-neutral-800"
      >
        <div className="space-y-4 text-sm text-slate-700 dark:text-neutral-300">
          <div>
            <h4 className="font-bold text-slate-900 dark:text-white">Marking Rules</h4>
            <p className="mt-1">
              Default correct: <strong>+{formatMarks(snap.settings.defaultMarks)}</strong> • Default
              negative: <strong>-{formatMarks(snap.settings.defaultNegativeMarks)}</strong> •
              Answered &amp; Marked for Review:{' '}
              <strong>
                {snap.settings.evaluateMarkedAnswered ? 'Evaluated' : 'Not Evaluated'}
              </strong>
            </p>
          </div>
          {snap.instructions && snap.instructions.length > 0 && (
            <div>
              <h4 className="font-bold text-slate-900 dark:text-white">Paper Notes</h4>
              <ul className="mt-1 list-disc space-y-1 pl-5">
                {snap.instructions.map((ins, i) => (
                  <li key={i}>{ins}</li>
                ))}
              </ul>
            </div>
          )}
          <div>
            <h4 className="font-bold text-slate-900 dark:text-white">Keyboard Shortcuts</h4>
            <div className="mt-1.5 grid grid-cols-2 gap-2 text-xs">
              <div className="rounded bg-slate-100 px-2.5 py-1.5 dark:bg-neutral-800">
                <kbd className="font-bold">1</kbd>–<kbd className="font-bold">8</kbd>: Select Option
              </div>
              <div className="rounded bg-slate-100 px-2.5 py-1.5 dark:bg-neutral-800">
                <kbd className="font-bold">Enter</kbd> / <kbd className="font-bold">→</kbd>: Save
                &amp; Next
              </div>
              <div className="rounded bg-slate-100 px-2.5 py-1.5 dark:bg-neutral-800">
                <kbd className="font-bold">←</kbd>: Previous Question
              </div>
              <div className="rounded bg-slate-100 px-2.5 py-1.5 dark:bg-neutral-800">
                <kbd className="font-bold">M</kbd>: Mark for Review &amp; Next
              </div>
              <div className="rounded bg-slate-100 px-2.5 py-1.5 dark:bg-neutral-800">
                <kbd className="font-bold">C</kbd>: Clear Response
              </div>
            </div>
          </div>
        </div>
      </Modal>

      <ExamSummaryModal
        open={summaryModalOpen}
        onClose={() => setSummaryModalOpen(false)}
        onConfirmSubmit={() => {
          setSummaryModalOpen(false);
          void finalizeSubmit(false);
        }}
        exam={snap}
        responses={session.responses}
        submitting={isSubmitting}
      />

      <ConfirmModal
        open={exitConfirmOpen}
        onClose={() => setExitConfirmOpen(false)}
        onConfirm={() => void handleDiscardAndExit()}
        title="Exit Without Submitting?"
        message="This exam does not allow pausing. Exiting now will discard your current unsubmitted session and return to the Dashboard."
        confirmLabel="Discard & Exit"
        cancelLabel="Stay in Exam"
        variant="danger"
      />

      <RoughPadModal
        open={roughPadOpen}
        onClose={() => setRoughPadOpen(false)}
        notes={session.roughPadNotes}
        onChange={(notes) => commitSession({ ...sessionRef.current, roughPadNotes: notes }, false)}
      />

      <CalculatorWidget open={calcOpen} onClose={() => setCalcOpen(false)} />
    </div>
  );
};
