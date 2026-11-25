export type ExamLanguage = 'en' | 'hi';

export type ThemeMode = 'light' | 'dark';

export type AccentColorId =
  | 'orange'
  | 'blue'
  | 'emerald'
  | 'indigo'
  | 'violet'
  | 'teal'
  | 'rose'
  | 'amber';

export interface BilingualText {
  en: string;
  hi?: string;
}

export type LocalizedText = string | BilingualText;

export type QuestionType = 'single' | 'multi';

export type DifficultyLevel = 'easy' | 'medium' | 'hard';

/**
 * Authentic TCS iON / NTA 5-state Question Palette status.
 */
export type QuestionStatus =
  | 'not_visited'
  | 'not_answered'
  | 'answered'
  | 'marked'
  | 'answered_marked';

export interface Question {
  id: string;
  sectionId: string;
  question: LocalizedText;
  options: LocalizedText[];
  type: QuestionType;
  correctIndices: number[];
  marks?: number;
  negativeMarks?: number;
  unattemptedMarks?: number;
  partialMarking?: boolean;
  passageTitle?: LocalizedText;
  passage?: LocalizedText;
  image?: string;
  svg?: string;
  explanation?: LocalizedText;
  topic?: string;
  difficulty?: DifficultyLevel;
}

export interface ExamSection {
  id: string;
  name: string;
  durationMinutes?: number;
  defaultMarks?: number;
  defaultNegativeMarks?: number;
  questions: Question[];
}

export interface ExamSettings {
  durationMinutes: number;
  sectionalTiming: boolean;
  allowBackNavigationInSectionalTiming: boolean;
  defaultMarks: number;
  defaultNegativeMarks: number;
  evaluateMarkedAnswered: boolean;
  shuffleQuestions: boolean;
  shuffleOptions: boolean;
  autoSaveOnPaletteNav: boolean;
  allowPause: boolean;
  showCalculator: boolean;
  showRoughPad: boolean;
  showLoginScreen: boolean;
  showInstructionsScreen: boolean;
  strictFullscreenPrompt: boolean;
  practiceModeInstantCheck: boolean;
  cutoffPercent?: number;
  defaultLanguage: ExamLanguage;
}

export interface ExamDefinition {
  id: string;
  title: string;
  subtitle?: string;
  category: string;
  description?: string;
  instructions?: string[];
  languages: ExamLanguage[];
  settings: ExamSettings;
  sections: ExamSection[];
  isBuiltIn?: boolean;
  sourceFile?: string;
  sourceHash?: string;
  createdAt: number;
  updatedAt: number;
}

export interface QuestionResponseState {
  selectedIndices: number[];
  status: QuestionStatus;
  timeSpentSeconds: number;
  visitCount: number;
  revealedInPractice?: boolean;
}

export type SessionStage = 'login' | 'instructions' | 'running';

export interface ActiveSession {
  id: string;
  examId: string;
  examSnapshot: ExamDefinition;
  stage: SessionStage;
  language: ExamLanguage;
  currentSectionIndex: number;
  currentQuestionIndex: number;
  responses: Record<string, QuestionResponseState>;
  totalRemainingSeconds: number;
  sectionRemainingSeconds: Record<string, number>;
  lockedSectionIds: string[];
  roughPadNotes: string;
  tabSwitchCount: number;
  startedAt: number;
  lastSavedAt: number;
  isPaused: boolean;
  sourceMode: 'normal' | 'retry_wrong' | 'bookmarks';
}

export type QuestionOutcome = 'correct' | 'incorrect' | 'unattempted' | 'partial';

export interface QuestionAttemptDetail {
  questionId: string;
  sectionId: string;
  sectionName: string;
  questionNumber: number;
  topic?: string;
  difficulty?: DifficultyLevel;
  selectedIndices: number[];
  correctIndices: number[];
  status: QuestionStatus;
  evaluated: boolean;
  outcome: QuestionOutcome;
  marksAwarded: number;
  maxMarks: number;
  negativeMarksApplied: number;
  timeSpentSeconds: number;
}

export interface SectionResultSummary {
  sectionId: string;
  sectionName: string;
  totalQuestions: number;
  attemptedCount: number;
  correctCount: number;
  incorrectCount: number;
  partialCount: number;
  unattemptedCount: number;
  markedNotEvaluatedCount: number;
  score: number;
  maxScore: number;
  accuracy: number;
  timeSpentSeconds: number;
}

export interface TopicResultSummary {
  topic: string;
  totalQuestions: number;
  correctCount: number;
  incorrectCount: number;
  partialCount?: number;
  unattemptedCount: number;
  accuracy: number;
  score: number;
  maxScore: number;
  timeSpentSeconds: number;
}

export interface ExamAttempt {
  id: string;
  examId: string;
  examTitle: string;
  category: string;
  candidateName: string;
  candidateRollNo: string;
  startedAt: number;
  submittedAt: number;
  autoSubmitted: boolean;
  timeTakenSeconds: number;
  totalDurationSeconds: number;
  score: number;
  maxScore: number;
  percentage: number;
  accuracy: number;
  attemptRate: number;
  correctCount: number;
  incorrectCount: number;
  partialCount: number;
  unattemptedCount: number;
  markedForReviewCount: number;
  answeredMarkedEvaluatedCount: number;
  evaluateMarkedAnswered: boolean;
  tabSwitchCount: number;
  cutoffPercent?: number;
  sectionResults: SectionResultSummary[];
  topicResults: TopicResultSummary[];
  questionResults: QuestionAttemptDetail[];
  examSnapshot: ExamDefinition;
}

export interface BookmarkedQuestion {
  id: string;
  examId: string;
  examTitle: string;
  sectionName: string;
  question: Question;
  userNote?: string;
  createdAt: number;
}

export interface CandidateProfile {
  name: string;
  rollNumber: string;
  targetExam: string;
  avatarColor: string;
  avatarDataUrl?: string;
  preferredLanguage: ExamLanguage;
  preferredFontScale: 'sm' | 'md' | 'lg';
  theme: ThemeMode;
  accentColor?: AccentColorId;
}

export interface UserJsonVerificationItem {
  fileName: string;
  examId: string;
  ok: boolean;
  strictJsonOk: boolean;
  title?: string;
  questionCount?: number;
  sectionCount?: number;
  warnings: string[];
  errors: string[];
  checkedAt: number;
}

export interface UserJsonSyncReport {
  totalFiles: number;
  verifiedCount: number;
  failedCount: number;
  warningCount: number;
  items: UserJsonVerificationItem[];
  checkedAt: number;
}

export interface WorkspaceBackup {
  version: 1;
  exportedAt: number;
  profile: CandidateProfile;
  exams: ExamDefinition[];
  attempts: ExamAttempt[];
  bookmarks: BookmarkedQuestion[];
}
