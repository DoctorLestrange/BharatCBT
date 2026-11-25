import type { ExamSettings } from '../types/exam';

export interface ExamPreset {
  id: string;
  name: string;
  category: string;
  badge: string;
  description: string;
  settings: Partial<ExamSettings>;
}

export const DEFAULT_EXAM_SETTINGS: ExamSettings = {
  durationMinutes: 60,
  sectionalTiming: false,
  allowBackNavigationInSectionalTiming: false,
  defaultMarks: 2,
  defaultNegativeMarks: 0.5,
  evaluateMarkedAnswered: true,
  shuffleQuestions: true,
  shuffleOptions: true,
  autoSaveOnPaletteNav: true,
  allowPause: true,
  showCalculator: false,
  showRoughPad: true,
  showLoginScreen: true,
  showInstructionsScreen: true,
  strictFullscreenPrompt: false,
  practiceModeInstantCheck: false,
  cutoffPercent: 60,
  defaultLanguage: 'en',
};

export const INDIAN_EXAM_PRESETS: ExamPreset[] = [
  {
    id: 'ssc_cgl',
    name: 'SSC CGL / CHSL / CPO',
    category: 'SSC',
    badge: '+2 / -0.5',
    description:
      '60 mins composite time, free section switching, +2 per correct answer, -0.5 (1/4th) negative marking.',
    settings: {
      durationMinutes: 60,
      sectionalTiming: false,
      defaultMarks: 2,
      defaultNegativeMarks: 0.5,
      evaluateMarkedAnswered: true,
      showCalculator: false,
      showRoughPad: true,
      cutoffPercent: 65,
    },
  },
  {
    id: 'ibps_po',
    name: 'IBPS / SBI PO Prelims',
    category: 'Banking',
    badge: '+1 / -0.25 (Sectional Timer)',
    description:
      '60 mins split into locked 20-min sectional timers, +1 mark, -0.25 (1/4th) negative marking.',
    settings: {
      durationMinutes: 60,
      sectionalTiming: true,
      allowBackNavigationInSectionalTiming: false,
      defaultMarks: 1,
      defaultNegativeMarks: 0.25,
      evaluateMarkedAnswered: true,
      showCalculator: false,
      showRoughPad: true,
      cutoffPercent: 60,
    },
  },
  {
    id: 'upsc_prelims',
    name: 'UPSC CSE / State PSC Prelims',
    category: 'UPSC / PSC',
    badge: '+2 / -0.66',
    description:
      '120 mins composite time, +2 marks per question, -1/3rd (0.6667) negative marking.',
    settings: {
      durationMinutes: 120,
      sectionalTiming: false,
      defaultMarks: 2,
      defaultNegativeMarks: 0.6667,
      evaluateMarkedAnswered: true,
      showCalculator: false,
      showRoughPad: true,
      cutoffPercent: 50,
    },
  },
  {
    id: 'rrb_ntpc',
    name: 'RRB NTPC / ALP / Group D',
    category: 'Railways (RRB)',
    badge: '+1 / -0.33',
    description:
      '90 mins composite CBT, +1 mark per question, -1/3rd (0.3333) negative marking.',
    settings: {
      durationMinutes: 90,
      sectionalTiming: false,
      defaultMarks: 1,
      defaultNegativeMarks: 0.3333,
      evaluateMarkedAnswered: true,
      showCalculator: false,
      showRoughPad: true,
      cutoffPercent: 65,
    },
  },
  {
    id: 'nta_cuet',
    name: 'NTA JEE / NEET / CUET',
    category: 'NTA Entrance',
    badge: '+4 or +5 / -1',
    description:
      'NTA CBT layout with +4 marks per correct answer and -1 negative mark, free navigation.',
    settings: {
      durationMinutes: 180,
      sectionalTiming: false,
      defaultMarks: 4,
      defaultNegativeMarks: 1,
      evaluateMarkedAnswered: true,
      showCalculator: false,
      showRoughPad: true,
      cutoffPercent: 55,
    },
  },
  {
    id: 'gate',
    name: 'GATE / Technical CBT',
    category: 'GATE / Engineering',
    badge: '+1/+2, Scientific Calc',
    description:
      '180 mins CBT with on-screen Scientific Calculator enabled and support for 1-mark & 2-mark questions.',
    settings: {
      durationMinutes: 180,
      sectionalTiming: false,
      defaultMarks: 2,
      defaultNegativeMarks: 0.6667,
      evaluateMarkedAnswered: true,
      showCalculator: true,
      showRoughPad: true,
      cutoffPercent: 35,
    },
  },
  {
    id: 'no_negative',
    name: 'Practice / No Negative Marking',
    category: 'Practice',
    badge: '+1 / 0 Neg',
    description:
      'Zero negative marking, untimed or custom duration, instant answer check option available.',
    settings: {
      durationMinutes: 30,
      sectionalTiming: false,
      defaultMarks: 1,
      defaultNegativeMarks: 0,
      evaluateMarkedAnswered: true,
      showCalculator: false,
      showRoughPad: true,
      practiceModeInstantCheck: true,
      cutoffPercent: 70,
    },
  },
];
