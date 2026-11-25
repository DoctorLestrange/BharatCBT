import { describe, expect, it } from 'vitest';
import { DEFAULT_EXAM_SETTINGS } from '../constants/examPresets';
import { SAMPLE_EXAMS } from '../constants/sampleExams';
import type { ExamDefinition } from '../types/exam';
import {
  computeNextResponseState,
  createBookmarksExam,
  createExamSnapshot,
  createRetryWrongExam,
  evaluateExamSession,
  getEffectiveTotalDurationSeconds,
  initializeActiveSession,
} from '../utils/scoring';

function buildTestExam(evaluateMarkedAnswered = true): ExamDefinition {
  return {
    id: 'test_exam',
    title: 'Scoring Unit Test',
    category: 'SSC',
    languages: ['en'],
    createdAt: 1,
    updatedAt: 1,
    settings: {
      ...DEFAULT_EXAM_SETTINGS,
      durationMinutes: 10,
      defaultMarks: 2,
      defaultNegativeMarks: 0.5,
      evaluateMarkedAnswered,
      showLoginScreen: false,
      showInstructionsScreen: false,
    },
    sections: [
      {
        id: 'sec1',
        name: 'Quant',
        questions: [
          {
            id: 'q1',
            sectionId: 'sec1',
            type: 'single',
            topic: 'Algebra',
            question: 'Q1',
            options: ['A', 'B', 'C', 'D'],
            correctIndices: [1],
          },
          {
            id: 'q2',
            sectionId: 'sec1',
            type: 'single',
            topic: 'Geometry',
            question: 'Q2',
            options: ['A', 'B', 'C', 'D'],
            correctIndices: [0],
          },
          {
            id: 'q3',
            sectionId: 'sec1',
            type: 'single',
            topic: 'Algebra',
            question: 'Q3',
            options: ['A', 'B', 'C', 'D'],
            correctIndices: [2],
          },
          {
            id: 'q4',
            sectionId: 'sec1',
            type: 'multi',
            topic: 'CS',
            marks: 4,
            negativeMarks: 0,
            partialMarking: true,
            question: 'Q4 MSQ',
            options: ['A', 'B', 'C', 'D'],
            correctIndices: [0, 2],
          },
        ],
      },
    ],
  };
}

describe('CBT state transitions & TCS iON scoring engine', () => {
  it('computes 5-state palette transitions accurately', () => {
    const base = {
      selectedIndices: [],
      status: 'not_answered' as const,
      timeSpentSeconds: 0,
      visitCount: 1,
    };

    const saved = computeNextResponseState(base, 'save', [2], true);
    expect(saved.status).toBe('answered');
    expect(saved.selectedIndices).toEqual([2]);

    const markedWithAns = computeNextResponseState(base, 'mark', [1], true);
    expect(markedWithAns.status).toBe('answered_marked');
    expect(markedWithAns.selectedIndices).toEqual([1]);

    const markedNoAns = computeNextResponseState(base, 'mark', [], true);
    expect(markedNoAns.status).toBe('marked');

    const cleared = computeNextResponseState(saved, 'clear', [], true);
    expect(cleared.status).toBe('not_answered');
    expect(cleared.selectedIndices).toEqual([]);

    const strictIgnored = computeNextResponseState(base, 'navigate_away', [3], false);
    expect(strictIgnored.selectedIndices).toEqual([]);
    expect(strictIgnored.status).toBe('not_answered');
  });

  it('evaluates negative marking and Answered & Marked for Review when enabled', () => {
    const exam = buildTestExam(true);
    const session = initializeActiveSession(exam);
    const snapQs = new Map(session.examSnapshot.sections[0].questions.map((q) => [q.id, q]));

    const q1 = snapQs.get('q1')!;
    const q2 = snapQs.get('q2')!;
    const q3 = snapQs.get('q3')!;
    const q4 = snapQs.get('q4')!;
    const q2WrongIdx = [0, 1, 2, 3].find((i) => !q2.correctIndices.includes(i))!;

    // Verify option text mapping matches original answers even after shuffling
    expect(q1.correctIndices.map((i) => q1.options[i])).toEqual(['B']);
    expect(q2.correctIndices.map((i) => q2.options[i])).toEqual(['A']);
    expect(q3.correctIndices.map((i) => q3.options[i])).toEqual(['C']);
    expect(q4.correctIndices.map((i) => q4.options[i]).sort()).toEqual(['A', 'C']);

    // q1: correct (+2)
    session.responses.q1 = {
      selectedIndices: [...q1.correctIndices],
      status: 'answered',
      timeSpentSeconds: 20,
      visitCount: 1,
    };
    // q2: wrong (-0.5)
    session.responses.q2 = {
      selectedIndices: [q2WrongIdx],
      status: 'answered',
      timeSpentSeconds: 15,
      visitCount: 1,
    };
    // q3: Answered & Marked for Review with correct answer (+2 when evaluateMarkedAnswered=true)
    session.responses.q3 = {
      selectedIndices: [...q3.correctIndices],
      status: 'answered_marked',
      timeSpentSeconds: 25,
      visitCount: 1,
    };
    // q4: MSQ partial (1 of 2 correct => +2)
    session.responses.q4 = {
      selectedIndices: [q4.correctIndices[0]],
      status: 'answered',
      timeSpentSeconds: 30,
      visitCount: 1,
    };

    const result = evaluateExamSession(session, 'Aarav', 'ROLL1', false);
    // Total: +2 - 0.5 + 2 + 2 = 5.5 out of 10
    expect(result.score).toBe(5.5);
    expect(result.maxScore).toBe(10);
    expect(result.correctCount).toBe(2);
    expect(result.incorrectCount).toBe(1);
    expect(result.partialCount).toBe(1);
    expect(result.answeredMarkedEvaluatedCount).toBe(1);
    const csTopic = result.topicResults.find((t) => t.topic === 'CS');
    expect(csTopic?.partialCount).toBe(1);
  });

  it('ignores Answered & Marked for Review when evaluateMarkedAnswered=false', () => {
    const exam = buildTestExam(false);
    const session = initializeActiveSession(exam);
    const q3 = session.examSnapshot.sections[0].questions.find((q) => q.id === 'q3')!;
    session.responses.q3 = {
      selectedIndices: [...q3.correctIndices],
      status: 'answered_marked',
      timeSpentSeconds: 10,
      visitCount: 1,
    };

    const result = evaluateExamSession(session, 'Aarav', 'ROLL1', false);
    expect(result.score).toBe(0);
    expect(result.unattemptedCount).toBe(4);
    expect(result.answeredMarkedEvaluatedCount).toBe(0);
  });

  it('creates retry-wrong exam containing only incorrect and skipped questions', () => {
    const exam = buildTestExam(true);
    const session = initializeActiveSession(exam);
    const snapQs = new Map(session.examSnapshot.sections[0].questions.map((q) => [q.id, q]));
    const q1 = snapQs.get('q1')!;
    const q2 = snapQs.get('q2')!;
    const q2WrongIdx = [0, 1, 2, 3].find((i) => !q2.correctIndices.includes(i))!;

    session.responses.q1 = {
      selectedIndices: [...q1.correctIndices],
      status: 'answered',
      timeSpentSeconds: 10,
      visitCount: 1,
    };
    session.responses.q2 = {
      selectedIndices: [q2WrongIdx],
      status: 'answered',
      timeSpentSeconds: 10,
      visitCount: 1,
    };
    const attempt = evaluateExamSession(session, 'Aarav', 'ROLL1', false);
    const retry = createRetryWrongExam(attempt);
    expect(retry).not.toBeNull();
    const retryQIds = retry!.sections[0].questions.map((q) => q.id).sort();
    expect(retryQIds).toEqual(['q2', 'q3', 'q4']);
  });

  it('validates all built-in sample exams have valid correctIndices and non-empty questions', () => {
    for (const sample of SAMPLE_EXAMS) {
      expect(sample.sections.length).toBeGreaterThan(0);
      for (const sec of sample.sections) {
        expect(sec.questions.length).toBeGreaterThan(0);
        for (const q of sec.questions) {
          expect(q.options.length).toBeGreaterThanOrEqual(2);
          expect(q.correctIndices.length).toBeGreaterThanOrEqual(1);
          for (const idx of q.correctIndices) {
            expect(idx).toBeGreaterThanOrEqual(0);
            expect(idx).toBeLessThan(q.options.length);
          }
        }
      }
    }
  });

  it('assigns unique question IDs when compiling a bookmarks mock from multiple exams', () => {
    const qBase = buildTestExam(true).sections[0].questions[0];
    const compiled = createBookmarksExam([
      {
        id: 'bm1',
        examId: 'examA',
        examTitle: 'Exam A',
        sectionName: 'Quant',
        question: { ...qBase, id: 'q1' },
        createdAt: 1,
      },
      {
        id: 'bm2',
        examId: 'examB',
        examTitle: 'Exam B',
        sectionName: 'Quant',
        question: { ...qBase, id: 'q1' },
        createdAt: 2,
      },
    ]);
    expect(compiled).not.toBeNull();
    const ids = compiled!.sections[0].questions.map((q) => q.id);
    expect(new Set(ids).size).toBe(2);
  });

  it('always shuffles questions within sections and options per attempt without mutating source exam', () => {
    const base = buildTestExam(true);
    base.settings.shuffleQuestions = false;
    base.settings.shuffleOptions = false;
    base.sections.push({
      id: 'sec2',
      name: 'Reasoning',
      questions: [
        {
          id: 'r1',
          sectionId: 'sec2',
          type: 'single',
          question: 'R1',
          options: ['R1-A', 'R1-B', 'R1-C', 'R1-D'],
          correctIndices: [2],
        },
        {
          id: 'r2',
          sectionId: 'sec2',
          type: 'single',
          question: 'R2',
          options: ['R2-A', 'R2-B', 'R2-C', 'R2-D'],
          correctIndices: [3],
        },
      ],
    });

    const snapshots = Array.from({ length: 12 }, () => createExamSnapshot(base));
    const questionOrders = new Set<string>();
    const optionOrders = new Set<string>();

    for (const snap of snapshots) {
      // Sections remain in canonical order and never leak questions across sections
      expect(snap.sections.map((s) => s.id)).toEqual(['sec1', 'sec2']);
      expect(snap.sections[0].questions.map((q) => q.id).sort()).toEqual(['q1', 'q2', 'q3', 'q4']);
      expect(snap.sections[1].questions.map((q) => q.id).sort()).toEqual(['r1', 'r2']);
      expect(snap.settings.shuffleQuestions).toBe(true);
      expect(snap.settings.shuffleOptions).toBe(true);

      questionOrders.add(snap.sections[0].questions.map((q) => q.id).join(','));
      const q1 = snap.sections[0].questions.find((q) => q.id === 'q1')!;
      optionOrders.add(q1.options.join(','));
      expect(q1.correctIndices.map((i) => q1.options[i])).toEqual(['B']);

      const r2 = snap.sections[1].questions.find((q) => q.id === 'r2')!;
      expect(r2.correctIndices.map((i) => r2.options[i])).toEqual(['R2-D']);
    }

    // Multiple distinct shuffles observed across attempts
    expect(questionOrders.size).toBeGreaterThan(1);
    expect(optionOrders.size).toBeGreaterThan(1);

    // Original source exam remains completely unmutated
    expect(base.sections[0].questions.map((q) => q.id)).toEqual(['q1', 'q2', 'q3', 'q4']);
    expect(base.sections[0].questions[0].options).toEqual(['A', 'B', 'C', 'D']);
    expect(base.sections[0].questions[0].correctIndices).toEqual([1]);
  });

  it('keeps totalRemainingSeconds aligned with sum of sectionRemainingSeconds in sectionalTiming mode', () => {
    const base = buildTestExam(true);
    base.settings.sectionalTiming = true;
    base.settings.durationMinutes = 90;
    base.sections.push(
      {
        id: 'sec2',
        name: 'Reasoning',
        questions: [
          {
            id: 'r1',
            sectionId: 'sec2',
            type: 'single',
            question: 'R1',
            options: ['A', 'B'],
            correctIndices: [0],
          },
        ],
      },
      {
        id: 'sec3',
        name: 'GK',
        questions: [
          {
            id: 'g1',
            sectionId: 'sec3',
            type: 'single',
            question: 'G1',
            options: ['A', 'B'],
            correctIndices: [1],
          },
        ],
      },
      {
        id: 'sec4',
        name: 'English',
        durationMinutes: 15,
        questions: [
          {
            id: 'e1',
            sectionId: 'sec4',
            type: 'single',
            question: 'E1',
            options: ['A', 'B'],
            correctIndices: [0],
          },
        ],
      }
    );

    const session = initializeActiveSession(base);
    const totalFromSections = Object.values(session.sectionRemainingSeconds).reduce(
      (sum, secs) => sum + secs,
      0
    );
    expect(session.totalRemainingSeconds).toBe(getEffectiveTotalDurationSeconds(base));
    expect(session.totalRemainingSeconds).toBe(totalFromSections);
  });
});
