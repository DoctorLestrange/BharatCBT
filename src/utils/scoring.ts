import { DEFAULT_EXAM_SETTINGS } from '../constants/examPresets';
import type {
  ActiveSession,
  BookmarkedQuestion,
  ExamAttempt,
  ExamDefinition,
  ExamSection,
  Question,
  QuestionAttemptDetail,
  QuestionOutcome,
  QuestionResponseState,
  QuestionStatus,
  SectionResultSummary,
  TopicResultSummary,
} from '../types/exam';
import { generateId, hasHindiTranslation, roundMarks } from './formatters';

function shuffleArray<T>(items: T[]): T[] {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

function shuffleQuestionOptions(q: Question): Question {
  const indexed = q.options.map((opt, origIdx) => ({ opt, origIdx }));
  const shuffled = shuffleArray(indexed);
  const newCorrectIndices = shuffled
    .map((item, newIdx) => (q.correctIndices.includes(item.origIdx) ? newIdx : -1))
    .filter((idx) => idx !== -1)
    .sort((a, b) => a - b);

  return {
    ...q,
    options: shuffled.map((item) => item.opt),
    correctIndices: newCorrectIndices,
  };
}

export function createExamSnapshot(exam: ExamDefinition): ExamDefinition {
  const cloned: ExamDefinition = JSON.parse(JSON.stringify(exam));
  cloned.settings = {
    ...cloned.settings,
    shuffleQuestions: true,
    shuffleOptions: true,
  };
  cloned.sections = cloned.sections.map((sec) => ({
    ...sec,
    questions: shuffleArray(sec.questions).map(shuffleQuestionOptions),
  }));
  return cloned;
}

export function getEffectiveQuestionMarks(
  question: Question,
  section: ExamSection,
  exam: ExamDefinition
): { positive: number; negative: number; unattempted: number } {
  return {
    positive:
      question.marks ?? section.defaultMarks ?? exam.settings.defaultMarks ?? 1,
    negative:
      question.negativeMarks ??
      section.defaultNegativeMarks ??
      exam.settings.defaultNegativeMarks ??
      0,
    unattempted: question.unattemptedMarks ?? 0,
  };
}

export function getTotalExamQuestions(exam: ExamDefinition): number {
  return exam.sections.reduce((acc, s) => acc + s.questions.length, 0);
}

export function getTotalMaxMarks(exam: ExamDefinition): number {
  let sum = 0;
  for (const sec of exam.sections) {
    for (const q of sec.questions) {
      sum += getEffectiveQuestionMarks(q, sec, exam).positive;
    }
  }
  return roundMarks(sum);
}

export function getSectionDurationMinutes(sec: ExamSection, exam: ExamDefinition): number {
  if (sec.durationMinutes && sec.durationMinutes > 0) {
    return sec.durationMinutes;
  }
  const secCount = Math.max(1, exam.sections.length);
  return Math.max(5, Math.round((exam.settings.durationMinutes || 60) / secCount));
}

export function getEffectiveTotalDurationSeconds(exam: ExamDefinition): number {
  if (exam.settings.sectionalTiming) {
    const sumSectionMins = exam.sections.reduce(
      (acc, sec) => acc + getSectionDurationMinutes(sec, exam),
      0
    );
    return sumSectionMins * 60;
  }
  return Math.max(0, exam.settings.durationMinutes) * 60;
}

export function initializeActiveSession(
  exam: ExamDefinition,
  sourceMode: ActiveSession['sourceMode'] = 'normal',
  preferredLang?: 'en' | 'hi'
): ActiveSession {
  const snapshot = createExamSnapshot(exam);
  const responses: Record<string, QuestionResponseState> = {};

  snapshot.sections.forEach((sec, sIdx) => {
    sec.questions.forEach((q, qIdx) => {
      const isInitialFirst =
        sIdx === 0 &&
        qIdx === 0 &&
        !snapshot.settings.showLoginScreen &&
        !snapshot.settings.showInstructionsScreen;

      responses[q.id] = {
        selectedIndices: [],
        status: isInitialFirst ? 'not_answered' : 'not_visited',
        timeSpentSeconds: 0,
        visitCount: isInitialFirst ? 1 : 0,
      };
    });
  });

  const sectionRemainingSeconds: Record<string, number> = {};
  snapshot.sections.forEach((sec) => {
    sectionRemainingSeconds[sec.id] = getSectionDurationMinutes(sec, snapshot) * 60;
  });

  const stage: ActiveSession['stage'] = snapshot.settings.showLoginScreen
    ? 'login'
    : snapshot.settings.showInstructionsScreen
      ? 'instructions'
      : 'running';

  const defaultLang = snapshot.languages.includes(snapshot.settings.defaultLanguage)
    ? snapshot.settings.defaultLanguage
    : (snapshot.languages[0] ?? 'en');
  const lang =
    preferredLang && snapshot.languages.includes(preferredLang) ? preferredLang : defaultLang;

  return {
    id: `session_${exam.id}`,
    examId: exam.id,
    examSnapshot: snapshot,
    stage,
    language: lang,
    currentSectionIndex: 0,
    currentQuestionIndex: 0,
    responses,
    totalRemainingSeconds: getEffectiveTotalDurationSeconds(snapshot),
    sectionRemainingSeconds,
    lockedSectionIds: [],
    roughPadNotes: '',
    tabSwitchCount: 0,
    startedAt: Date.now(),
    lastSavedAt: Date.now(),
    isPaused: false,
    sourceMode,
  };
}

export function computeNextResponseState(
  prev: QuestionResponseState | undefined,
  action: 'save' | 'mark' | 'clear' | 'navigate_away',
  pendingSelection: number[],
  autoSaveOnPaletteNav: boolean
): QuestionResponseState {
  const safePrev: QuestionResponseState = prev ?? {
    selectedIndices: [],
    status: 'not_visited',
    timeSpentSeconds: 0,
    visitCount: 0,
  };
  const cleanSelection = Array.from(new Set(pendingSelection)).sort((a, b) => a - b);

  if (action === 'clear') {
    return {
      ...safePrev,
      selectedIndices: [],
      status: 'not_answered',
    };
  }

  if (action === 'save') {
    return {
      ...safePrev,
      selectedIndices: cleanSelection,
      status: cleanSelection.length > 0 ? 'answered' : 'not_answered',
    };
  }

  if (action === 'mark') {
    return {
      ...safePrev,
      selectedIndices: cleanSelection,
      status: cleanSelection.length > 0 ? 'answered_marked' : 'marked',
    };
  }

  // navigate_away (palette click / section switch / prev button)
  if (!autoSaveOnPaletteNav) {
    return {
      ...safePrev,
      status: safePrev.status === 'not_visited' ? 'not_answered' : safePrev.status,
    };
  }

  const keepMarked = safePrev.status === 'marked' || safePrev.status === 'answered_marked';

  if (cleanSelection.length > 0) {
    return {
      ...safePrev,
      selectedIndices: cleanSelection,
      status: keepMarked ? 'answered_marked' : 'answered',
    };
  }

  return {
    ...safePrev,
    selectedIndices: [],
    status: keepMarked ? 'marked' : 'not_answered',
  };
}

export function countPaletteStatuses(
  questions: Question[],
  responses: Record<string, QuestionResponseState>
): Record<QuestionStatus, number> {
  const counts: Record<QuestionStatus, number> = {
    not_visited: 0,
    not_answered: 0,
    answered: 0,
    marked: 0,
    answered_marked: 0,
  };
  for (const q of questions) {
    const st = responses[q.id]?.status ?? 'not_visited';
    counts[st]++;
  }
  return counts;
}

function setsEqual(a: number[], b: number[]): boolean {
  if (a.length !== b.length) return false;
  const sa = [...a].sort((x, y) => x - y);
  const sb = [...b].sort((x, y) => x - y);
  return sa.every((val, idx) => val === sb[idx]);
}

export function evaluateExamSession(
  session: ActiveSession,
  candidateName: string,
  candidateRollNo: string,
  autoSubmitted = false
): ExamAttempt {
  const exam = session.examSnapshot;
  const evaluateMarkedAnswered = exam.settings.evaluateMarkedAnswered;

  let totalScore = 0;
  let totalMaxScore = 0;
  let correctCount = 0;
  let incorrectCount = 0;
  let partialCount = 0;
  let unattemptedCount = 0;
  let markedForReviewCount = 0;
  let answeredMarkedEvaluatedCount = 0;

  const sectionResults: SectionResultSummary[] = [];
  const questionResults: QuestionAttemptDetail[] = [];
  const topicBuckets = new Map<
    string,
    {
      totalQuestions: number;
      correctCount: number;
      incorrectCount: number;
      partialCount: number;
      unattemptedCount: number;
      score: number;
      maxScore: number;
      timeSpentSeconds: number;
    }
  >();

  let globalNumber = 1;

  for (const sec of exam.sections) {
    let secCorrect = 0;
    let secIncorrect = 0;
    let secPartial = 0;
    let secUnattempted = 0;
    let secMarkedNotEvaluated = 0;
    let secScore = 0;
    let secMaxScore = 0;
    let secTime = 0;

    for (const q of sec.questions) {
      const resp = session.responses[q.id] ?? {
        selectedIndices: [],
        status: 'not_visited' as QuestionStatus,
        timeSpentSeconds: 0,
        visitCount: 0,
      };
      const { positive, negative, unattempted } = getEffectiveQuestionMarks(q, sec, exam);
      totalMaxScore += positive;
      secMaxScore += positive;
      secTime += resp.timeSpentSeconds;

      if (resp.status === 'marked' || resp.status === 'answered_marked') {
        markedForReviewCount++;
      }

      const hasSelection = resp.selectedIndices.length > 0;
      const shouldEvaluate =
        hasSelection &&
        (resp.status !== 'answered_marked' || evaluateMarkedAnswered);

      if (resp.status === 'answered_marked' && evaluateMarkedAnswered && hasSelection) {
        answeredMarkedEvaluatedCount++;
      }

      let outcome: QuestionOutcome = 'unattempted';
      let marksAwarded = unattempted;
      let negativeApplied = 0;

      if (!shouldEvaluate) {
        outcome = 'unattempted';
        unattemptedCount++;
        secUnattempted++;
        if (resp.status === 'answered_marked' && !evaluateMarkedAnswered && hasSelection) {
          secMarkedNotEvaluated++;
        }
      } else if (q.type === 'multi') {
        if (setsEqual(resp.selectedIndices, q.correctIndices)) {
          outcome = 'correct';
          marksAwarded = positive;
          correctCount++;
          secCorrect++;
        } else if (
          q.partialMarking &&
          resp.selectedIndices.every((idx) => q.correctIndices.includes(idx))
        ) {
          outcome = 'partial';
          marksAwarded = roundMarks(
            (resp.selectedIndices.length / Math.max(1, q.correctIndices.length)) * positive
          );
          partialCount++;
          secPartial++;
        } else {
          outcome = 'incorrect';
          marksAwarded = -negative;
          negativeApplied = negative;
          incorrectCount++;
          secIncorrect++;
        }
      } else {
        // Single choice MCQ
        const chosen = resp.selectedIndices[0];
        if (q.correctIndices.includes(chosen)) {
          outcome = 'correct';
          marksAwarded = positive;
          correctCount++;
          secCorrect++;
        } else {
          outcome = 'incorrect';
          marksAwarded = -negative;
          negativeApplied = negative;
          incorrectCount++;
          secIncorrect++;
        }
      }

      totalScore += marksAwarded;
      secScore += marksAwarded;

      questionResults.push({
        questionId: q.id,
        sectionId: sec.id,
        sectionName: sec.name,
        questionNumber: globalNumber++,
        topic: q.topic,
        difficulty: q.difficulty,
        selectedIndices: resp.selectedIndices,
        correctIndices: q.correctIndices,
        status: resp.status,
        evaluated: shouldEvaluate,
        outcome,
        marksAwarded: roundMarks(marksAwarded),
        maxMarks: positive,
        negativeMarksApplied: roundMarks(negativeApplied),
        timeSpentSeconds: resp.timeSpentSeconds,
      });

      const topicKey = q.topic?.trim() || sec.name;
      const bucket = topicBuckets.get(topicKey) ?? {
        totalQuestions: 0,
        correctCount: 0,
        incorrectCount: 0,
        partialCount: 0,
        unattemptedCount: 0,
        score: 0,
        maxScore: 0,
        timeSpentSeconds: 0,
      };
      bucket.totalQuestions++;
      bucket.maxScore += positive;
      bucket.score += marksAwarded;
      bucket.timeSpentSeconds += resp.timeSpentSeconds;
      if (outcome === 'correct') bucket.correctCount++;
      else if (outcome === 'incorrect') bucket.incorrectCount++;
      else if (outcome === 'partial') bucket.partialCount++;
      else if (outcome === 'unattempted') bucket.unattemptedCount++;
      topicBuckets.set(topicKey, bucket);
    }

    const secAttempted = secCorrect + secIncorrect + secPartial;
    sectionResults.push({
      sectionId: sec.id,
      sectionName: sec.name,
      totalQuestions: sec.questions.length,
      attemptedCount: secAttempted,
      correctCount: secCorrect,
      incorrectCount: secIncorrect,
      partialCount: secPartial,
      unattemptedCount: secUnattempted,
      markedNotEvaluatedCount: secMarkedNotEvaluated,
      score: roundMarks(secScore),
      maxScore: roundMarks(secMaxScore),
      accuracy: secAttempted > 0 ? roundMarks((secCorrect / secAttempted) * 100) : 0,
      timeSpentSeconds: secTime,
    });
  }

  const topicResults: TopicResultSummary[] = Array.from(topicBuckets.entries()).map(
    ([topic, b]) => {
      const att = b.correctCount + b.incorrectCount + b.partialCount;
      return {
        topic,
        totalQuestions: b.totalQuestions,
        correctCount: b.correctCount,
        incorrectCount: b.incorrectCount,
        partialCount: b.partialCount,
        unattemptedCount: b.unattemptedCount,
        accuracy: att > 0 ? roundMarks((b.correctCount / att) * 100) : 0,
        score: roundMarks(b.score),
        maxScore: roundMarks(b.maxScore),
        timeSpentSeconds: b.timeSpentSeconds,
      };
    }
  );

  const totalQuestions = questionResults.length;
  const totalAttempted = correctCount + incorrectCount + partialCount;
  const totalDurationSeconds = getEffectiveTotalDurationSeconds(exam);
  const timeTakenSeconds =
    totalDurationSeconds > 0
      ? Math.max(1, totalDurationSeconds - session.totalRemainingSeconds)
      : Math.max(
          1,
          questionResults.reduce((acc, q) => acc + q.timeSpentSeconds, 0)
        );

  return {
    id: generateId('att'),
    examId: session.examId,
    examTitle: exam.title,
    category: exam.category,
    candidateName,
    candidateRollNo,
    startedAt: session.startedAt,
    submittedAt: Date.now(),
    autoSubmitted,
    timeTakenSeconds,
    totalDurationSeconds,
    score: roundMarks(totalScore),
    maxScore: roundMarks(totalMaxScore),
    percentage: totalMaxScore > 0 ? roundMarks((totalScore / totalMaxScore) * 100) : 0,
    accuracy: totalAttempted > 0 ? roundMarks((correctCount / totalAttempted) * 100) : 0,
    attemptRate: totalQuestions > 0 ? roundMarks((totalAttempted / totalQuestions) * 100) : 0,
    correctCount,
    incorrectCount,
    partialCount,
    unattemptedCount,
    markedForReviewCount,
    answeredMarkedEvaluatedCount,
    evaluateMarkedAnswered,
    tabSwitchCount: session.tabSwitchCount,
    cutoffPercent: exam.settings.cutoffPercent,
    sectionResults,
    topicResults,
    questionResults,
    examSnapshot: exam,
  };
}

export function createRetryWrongExam(attempt: ExamAttempt): ExamDefinition | null {
  const wrongIds = new Set(
    attempt.questionResults
      .filter((qr) => qr.outcome === 'incorrect' || qr.outcome === 'unattempted')
      .map((qr) => qr.questionId)
  );
  if (wrongIds.size === 0) return null;

  const filteredSections: ExamSection[] = attempt.examSnapshot.sections
    .map((sec) => ({
      ...sec,
      questions: sec.questions.filter((q) => wrongIds.has(q.id)),
    }))
    .filter((sec) => sec.questions.length > 0);

  if (filteredSections.length === 0) return null;

  const qCount = filteredSections.reduce((a, s) => a + s.questions.length, 0);

  return {
    ...attempt.examSnapshot,
    id: `${attempt.examId}_retry_${Date.now()}`,
    title: `${attempt.examTitle} — Retry Mistakes (${qCount} Qs)`,
    isBuiltIn: false,
    sourceFile: undefined,
    sourceHash: undefined,
    settings: {
      ...attempt.examSnapshot.settings,
      durationMinutes: Math.max(5, Math.ceil(qCount * 1.5)),
      sectionalTiming: false,
      showLoginScreen: false,
      showInstructionsScreen: false,
    },
    sections: filteredSections,
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };
}

export function createBookmarksExam(bookmarks: BookmarkedQuestion[]): ExamDefinition | null {
  if (bookmarks.length === 0) return null;
  const groups = new Map<string, Question[]>();
  for (const bm of bookmarks) {
    const secName = bm.sectionName || 'Revision Bank';
    const list = groups.get(secName) ?? [];
    list.push({ ...bm.question });
    groups.set(secName, list);
  }

  const sections: ExamSection[] = Array.from(groups.entries()).map(([name, qs], idx) => ({
    id: `bm_sec_${idx + 1}`,
    name,
    questions: qs.map((q, qIdx) => ({
      ...q,
      id: `${q.id}_${idx + 1}_${qIdx + 1}`,
      sectionId: `bm_sec_${idx + 1}`,
    })),
  }));

  const hasAnyHindi = bookmarks.some(
    (bm) =>
      hasHindiTranslation(bm.question.question) ||
      bm.question.options.some((opt) => hasHindiTranslation(opt)) ||
      hasHindiTranslation(bm.question.passage)
  );

  return {
    id: `bookmarks_practice_${Date.now()}`,
    title: `Bookmarked Revision Mock (${bookmarks.length} Qs)`,
    category: 'Revision Bank',
    description: 'Custom CBT test compiled from your saved/bookmarked questions.',
    languages: hasAnyHindi ? ['en', 'hi'] : ['en'],
    settings: {
      ...DEFAULT_EXAM_SETTINGS,
      durationMinutes: Math.max(5, Math.ceil(bookmarks.length * 1.5)),
      defaultMarks: 2,
      defaultNegativeMarks: 0.5,
      showLoginScreen: false,
      showInstructionsScreen: false,
      practiceModeInstantCheck: true,
    },
    sections,
    isBuiltIn: false,
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };
}
