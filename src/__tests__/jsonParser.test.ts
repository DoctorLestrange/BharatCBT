import { describe, expect, it } from 'vitest';
import { exportExamToJson, parseExamJson, SIMPLE_TEMPLATE_JSON } from '../utils/jsonParser';

describe('parseExamJson', () => {
  it('parses the built-in simple template cleanly', () => {
    const res = parseExamJson(SIMPLE_TEMPLATE_JSON);
    expect(res.ok).toBe(true);
    expect(res.errors).toEqual([]);
    expect(res.exam).toBeDefined();
    expect(res.exam?.sections.length).toBe(3);
    expect(res.summary?.questionCount).toBe(3);
    expect(res.exam?.settings.defaultMarks).toBe(2);
    expect(res.exam?.settings.defaultNegativeMarks).toBe(0.5);
  });

  it('supports bare array of questions and wraps in default settings', () => {
    const raw = JSON.stringify([
      {
        question: '2 + 2 = ?',
        options: ['3', '4', '5', '6'],
        correctOption: 'B',
      },
      {
        question: 'Capital of France?',
        options: ['Berlin', 'Madrid', 'Paris', 'Rome'],
        answer: 'Paris',
      },
    ]);
    const res = parseExamJson(raw);
    expect(res.ok).toBe(true);
    expect(res.exam?.sections[0].questions[0].correctIndices).toEqual([1]);
    expect(res.exam?.sections[0].questions[1].correctIndices).toEqual([2]);
    expect(res.warnings.length).toBeGreaterThan(0);
  });

  it('supports multi-section bilingual JSON with passageId lookup and MSQ', () => {
    const raw = JSON.stringify({
      title: 'Bilingual Test',
      sectionalTiming: true,
      passages: {
        p1: { title: 'Passage 1', content: 'Passage content here.' },
      },
      sections: [
        {
          name: 'Quant',
          durationMinutes: 25,
          questions: [
            {
              id: 'q_bi',
              passageId: 'p1',
              question: { en: 'Solve 1+1', hi: '1+1 हल करें' },
              options: { en: ['1', '2', '3', '4'], hi: ['१', '२', '३', '४'] },
              correctIndex: 1,
            },
            {
              id: 'q_msq',
              type: 'multi',
              question: 'Select prime numbers:',
              options: ['2', '4', '5', '9'],
              correctOptions: ['A', 'C'],
            },
          ],
        },
      ],
    });
    const res = parseExamJson(raw);
    expect(res.ok).toBe(true);
    expect(res.summary?.bilingualCount).toBe(1);
    expect(res.exam?.languages).toEqual(['en', 'hi']);
    expect(res.exam?.sections[0].questions[0].passage).toBe('Passage content here.');
    expect(res.exam?.sections[0].questions[1].type).toBe('multi');
    expect(res.exam?.sections[0].questions[1].correctIndices).toEqual([0, 2]);
  });

  it('normalizes negative negativeMarks values to positive deduction magnitude with warning', () => {
    const raw = JSON.stringify({
      title: 'Neg Check',
      defaultNegativeMarks: -0.25,
      questions: [
        {
          question: 'Test?',
          options: ['Yes', 'No'],
          correctIndex: 0,
        },
      ],
    });
    const res = parseExamJson(raw);
    expect(res.ok).toBe(true);
    expect(res.exam?.settings.defaultNegativeMarks).toBe(0.25);
    expect(res.warnings.some((w) => w.includes('normalized to positive deduction'))).toBe(true);
  });

  it('returns clear errors on malformed JSON or out-of-range correctIndex', () => {
    expect(parseExamJson('{ bad json').ok).toBe(false);

    const invalidIndex = JSON.stringify({
      title: 'Bad Index',
      questions: [
        {
          question: 'Pick one',
          options: ['A', 'B'],
          correctIndex: 5,
        },
      ],
    });
    const res = parseExamJson(invalidIndex);
    expect(res.ok).toBe(false);
    expect(res.errors[0]).toContain('must be between 0 and 1');
  });

  it('round-trips exported exam JSON cleanly', () => {
    const first = parseExamJson(SIMPLE_TEMPLATE_JSON);
    expect(first.exam).toBeDefined();
    const exported = exportExamToJson(first.exam!);
    const second = parseExamJson(exported);
    expect(second.ok).toBe(true);
    expect(second.summary?.questionCount).toBe(first.summary?.questionCount);
  });

  it('assigns unique section IDs when flat section names contain non-ASCII characters', () => {
    const raw = JSON.stringify({
      title: 'Hindi Sections',
      questions: [
        { section: 'भाग - १', question: 'Q1?', options: ['A', 'B'], correctIndex: 0 },
        { section: 'भाग - २', question: 'Q2?', options: ['A', 'B'], correctIndex: 1 },
      ],
    });
    const res = parseExamJson(raw);
    expect(res.ok).toBe(true);
    expect(res.exam?.sections.length).toBe(2);
    expect(res.exam?.sections[0].id).not.toBe(res.exam?.sections[1].id);
  });

  it('auto-repairs unescaped LaTeX braces like \\{1,3,4\\} while preserving valid escapes', () => {
    const rawInput =
      '{"title":"Escape Repair Test","questions":[{"id":"q31","question":"Line 1\\nLine 2","options":["A","B"],"correctIndex":0,"explanation":"Set is $\\\\{1,2\\\\}$ and remaining $\\{1,3,4\\}$ \\\\implies OK"}]}';
    const res = parseExamJson(rawInput);
    expect(res.ok).toBe(true);
    expect(res.repairedJson).toBeDefined();
    expect(res.warnings.some((w) => w.includes('Auto-repaired 2 unescaped character(s)'))).toBe(true);
    expect(res.exam?.sections[0].questions[0].question).toBe('Line 1\nLine 2');
    expect(res.exam?.sections[0].questions[0].explanation).toBe(
      'Set is $\\{1,2\\}$ and remaining $\\{1,3,4\\}$ \\implies OK'
    );
  });

  it('strips optional surrounding markdown code fences around JSON', () => {
    const fenced = '```json\n' + SIMPLE_TEMPLATE_JSON + '\n```';
    const res = parseExamJson(fenced);
    expect(res.ok).toBe(true);
    expect(res.summary?.questionCount).toBe(3);
  });
});
