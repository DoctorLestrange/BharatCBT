import { describe, expect, it } from 'vitest';
import { DEFAULT_EXAM_SETTINGS } from '../constants/examPresets';
import type { ExamDefinition } from '../types/exam';
import { evaluateCalculatorExpression, formatCalculatorResult } from '../utils/calculator';
import { formatDateTime, roundMarks } from '../utils/formatters';
import { exportExamToJson, parseExamJson } from '../utils/jsonParser';
import {
  isSafeImageSrc,
  parseContentBlocks,
  sanitizeSvgMarkup,
  splitMarkdownTableCells,
} from '../utils/sanitize';
import {
  computeNextResponseState,
  createBookmarksExam,
  createRetryWrongExam,
  evaluateExamSession,
  initializeActiveSession,
} from '../utils/scoring';

describe('Scientific calculator parser & evaluator', () => {
  it('enforces standard operator precedence and associativity', () => {
    expect(evaluateCalculatorExpression('-2^2', 'DEG')).toBe(-4);
    expect(evaluateCalculatorExpression('(-2)^2', 'DEG')).toBe(4);
    expect(evaluateCalculatorExpression('2^-3', 'DEG')).toBeCloseTo(0.125, 10);
    expect(evaluateCalculatorExpression('2^3^2', 'DEG')).toBe(512);
    expect(evaluateCalculatorExpression('3 + 4 × 2 − 1', 'DEG')).toBe(10);
    expect(evaluateCalculatorExpression('10 ÷ 4', 'DEG')).toBe(2.5);
  });

  it('supports implicit multiplication and constants', () => {
    expect(evaluateCalculatorExpression('2(3+4)', 'DEG')).toBe(14);
    expect(evaluateCalculatorExpression('(2)(3)', 'DEG')).toBe(6);
    expect(evaluateCalculatorExpression('2π', 'DEG')).toBeCloseTo(2 * Math.PI, 10);
    expect(evaluateCalculatorExpression('2sin(30)', 'DEG')).toBeCloseTo(1, 10);
    expect(evaluateCalculatorExpression('2e', 'DEG')).toBeCloseTo(2 * Math.E, 10);
  });

  it('evaluates exact trigonometric values and rejects undefined tangents', () => {
    expect(evaluateCalculatorExpression('sin(180)', 'DEG')).toBe(0);
    expect(evaluateCalculatorExpression('sin(360)', 'DEG')).toBe(0);
    expect(evaluateCalculatorExpression('cos(90)', 'DEG')).toBe(0);
    expect(evaluateCalculatorExpression('cos(270)', 'DEG')).toBe(0);
    expect(evaluateCalculatorExpression('tan(45)', 'DEG')).toBeCloseTo(1, 10);
    expect(() => evaluateCalculatorExpression('tan(90)', 'DEG')).toThrow();
    expect(() => evaluateCalculatorExpression('tan(270)', 'DEG')).toThrow();

    expect(evaluateCalculatorExpression('sin(pi/2)', 'RAD')).toBeCloseTo(1, 10);
    expect(evaluateCalculatorExpression('cos(pi)', 'RAD')).toBeCloseTo(-1, 10);
  });

  it('supports logarithms, roots, absolute values, empty input, and domain errors', () => {
    expect(evaluateCalculatorExpression('log(100)', 'DEG')).toBeCloseTo(2, 10);
    expect(evaluateCalculatorExpression('log10(1000)', 'DEG')).toBeCloseTo(3, 10);
    expect(evaluateCalculatorExpression('log2(8)', 'DEG')).toBeCloseTo(3, 10);
    expect(evaluateCalculatorExpression('ln(e)', 'DEG')).toBeCloseTo(1, 10);
    expect(evaluateCalculatorExpression('sqrt(16)', 'DEG')).toBe(4);
    expect(evaluateCalculatorExpression('√25', 'DEG')).toBe(5);
    expect(evaluateCalculatorExpression('abs(-7)', 'DEG')).toBe(7);
    expect(evaluateCalculatorExpression('', 'DEG')).toBe(0);
    expect(evaluateCalculatorExpression('   ', 'DEG')).toBe(0);

    expect(() => evaluateCalculatorExpression('1/0', 'DEG')).toThrow();
    expect(() => evaluateCalculatorExpression('sqrt(-4)', 'DEG')).toThrow();
    expect(() => evaluateCalculatorExpression('log(0)', 'DEG')).toThrow();
    expect(() => evaluateCalculatorExpression('2+*3', 'DEG')).toThrow();
  });

  it('formats results cleanly without negative zero or non-finite values', () => {
    expect(formatCalculatorResult(-0)).toBe('0');
    expect(formatCalculatorResult(NaN)).toBe('Error');
    expect(formatCalculatorResult(Infinity)).toBe('Error');
    expect(formatCalculatorResult(0.1 + 0.2)).toBe('0.3');
  });
});

describe('XSS sanitization and math/table content parsing', () => {
  it('validates image URLs strictly and blocks SVG data URIs and protocol-relative URLs', () => {
    expect(isSafeImageSrc('https://example.com/diagram.png')).toBe(true);
    expect(isSafeImageSrc('http://example.com/diagram.jpg')).toBe(true);
    expect(isSafeImageSrc('/images/q1.png')).toBe(true);
    expect(isSafeImageSrc('./images/q1.webp')).toBe(true);
    expect(isSafeImageSrc('data:image/png;base64,iVBORw0KGgo=')).toBe(true);

    expect(isSafeImageSrc('')).toBe(false);
    expect(isSafeImageSrc('//evil.example/tracker.png')).toBe(false);
    expect(isSafeImageSrc('javascript:alert(1)')).toBe(false);
    expect(isSafeImageSrc('data:image/svg+xml;utf8,<svg onload=alert(1)/>')).toBe(false);
    expect(isSafeImageSrc('data:text/html,<script>alert(1)</script>')).toBe(false);
  });

  it('sanitizes inline SVG diagrams while preserving valid geometry and fragment references', () => {
    const dirty = `
      <svg viewBox="0 0 100 100" onload="alert(1)">
        <style>@import url("https://evil.example/x.css"); .a { fill: url(#grad1); background: url(https://evil.example/a.png); }</style>
        <defs><linearGradient id="grad1"></linearGradient></defs>
        <script>alert('xss')</script>
        <foreignObject><body xmlns="http://www.w3.org/1999/xhtml"><img src=x onerror=alert(1)></body></foreignObject>
        <a href="javascript:alert(1)"><rect width="10" height="10" /></a>
        <use href="#grad1" />
        <image href="https://evil.example/leak.png" />
      </svg>
    `;
    const clean = sanitizeSvgMarkup(dirty);
    expect(clean.startsWith('<svg')).toBe(true);
    expect(clean).not.toMatch(/<script/i);
    expect(clean).not.toMatch(/foreignObject/i);
    expect(clean).not.toMatch(/onload/i);
    expect(clean).not.toMatch(/javascript:/i);
    expect(clean).not.toMatch(/@import/i);
    expect(clean).not.toMatch(/https:\/\/evil\.example/i);
    expect(clean).toContain('href="#grad1"');

    expect(sanitizeSvgMarkup('<div onclick="alert(1)">not svg</div>')).toBe('');
  });

  it('splits markdown table cells without breaking inline math pipes or escaped pipes', () => {
    const cells = splitMarkdownTableCells('| Expression | Value |');
    expect(cells).toEqual(['Expression', 'Value']);

    const mathCells = splitMarkdownTableCells('| $|x| + |y|$ | $a \\| b$ |');
    expect(mathCells).toEqual(['$|x| + |y|$', '$a | b$']);
  });

  it('parses multi-line display math blocks and CRLF line endings cleanly', () => {
    const raw = 'Intro\r\n$$\r\n\\frac{a}{b}\r\n+ c\r\n$$\r\n| Col1 | Col2 |\r\n| --- | --- |\r\n| $|x|$ | 5 |';
    const blocks = parseContentBlocks(raw);
    expect(blocks[0]).toEqual({ type: 'line', content: 'Intro' });
    expect(blocks[1]).toEqual({ type: 'display-math', content: '\\frac{a}{b}\n+ c' });
    expect(blocks[2].type).toBe('table');
    expect(blocks[2].headers).toEqual(['Col1', 'Col2']);
    expect(blocks[2].rows).toEqual([['$|x|$', '5']]);
  });
});

describe('Formatter edge cases', () => {
  it('rounds symmetrically without producing -0 or NaN', () => {
    expect(Object.is(roundMarks(-0.001), 0)).toBe(true);
    expect(roundMarks(-1.005)).toBe(-1.01);
    expect(roundMarks(1.005)).toBe(1.01);
    expect(roundMarks(NaN)).toBe(0);
    expect(roundMarks(Infinity)).toBe(0);
  });

  it('handles invalid timestamps safely in formatDateTime', () => {
    expect(formatDateTime(NaN)).toBe('—');
    expect(formatDateTime(Infinity)).toBe('—');
  });
});

describe('JSON parser strict validation & export fidelity', () => {
  it('rejects empty options instead of silently shifting indices', () => {
    const res = parseExamJson(
      JSON.stringify({
        title: 'Empty Option Test',
        questions: [
          {
            question: 'Pick one',
            options: ['Alpha', '', 'Gamma', 'Delta'],
            correctIndex: 2,
          },
        ],
      })
    );
    expect(res.ok).toBe(false);
    expect(res.errors.some((e) => /empty/i.test(e))).toBe(true);
  });

  it('rejects invalid correctIndices and correctOptions payloads', () => {
    const badIndices = parseExamJson(
      JSON.stringify({
        title: 'Bad Indices',
        questions: [
          {
            question: 'Q1',
            options: ['A', 'B', 'C', 'D'],
            correctIndices: [''],
          },
        ],
      })
    );
    expect(badIndices.ok).toBe(false);

    const badFloat = parseExamJson(
      JSON.stringify({
        title: 'Float Index',
        questions: [
          {
            question: 'Q1',
            options: ['A', 'B', 'C', 'D'],
            correctIndices: [1.5],
          },
        ],
      })
    );
    expect(badFloat.ok).toBe(false);

    const badOptionLetter = parseExamJson(
      JSON.stringify({
        title: 'Bad Letter',
        questions: [
          {
            question: 'Q1',
            options: ['A', 'B', 'C', 'D'],
            correctOptions: ['A', 'Z'],
          },
        ],
      })
    );
    expect(badOptionLetter.ok).toBe(false);
  });

  it('repairs raw control characters in string literals, clamps cutoffPercent, and exports unattemptedMarks', () => {
    const rawWithControlChar =
      '{"title":"Control Char\tTest","settings":{"cutoffPercent":150},"questions":[{"question":"2+2=?","options":["3","4"],"correctIndex":1,"unattemptedMarks":-0.1}]}';
    const parsed = parseExamJson(rawWithControlChar);
    expect(parsed.ok).toBe(true);
    expect(parsed.exam!.settings.cutoffPercent).toBe(100);
    expect(parsed.exam!.sections[0].questions[0].unattemptedMarks).toBe(-0.1);

    const exported = JSON.parse(exportExamToJson(parsed.exam!));
    expect(exported.sections[0].questions[0].unattemptedMarks).toBe(-0.1);
  });
});

describe('Scoring & session hardening', () => {
  function makeSampleExam(): ExamDefinition {
    return {
      id: 'src_exam_1',
      title: 'Hardening Exam',
      category: 'SSC',
      languages: ['en'],
      isBuiltIn: true,
      sourceFile: '01_demo.json',
      sourceHash: 'abc123',
      createdAt: 1,
      updatedAt: 1,
      settings: {
        ...DEFAULT_EXAM_SETTINGS,
        durationMinutes: 15,
        defaultMarks: 2,
        defaultNegativeMarks: 0.5,
      },
      sections: [
        {
          id: 's1',
          name: 'General',
          questions: [
            {
              id: 'q1',
              sectionId: 's1',
              type: 'single',
              question: 'English Q1',
              options: ['A', 'B'],
              correctIndices: [0],
            },
          ],
        },
      ],
    };
  }

  it('handles undefined previous response and preserves marked status on MSQ deselect navigate-away', () => {
    const fromUndefined = computeNextResponseState(undefined, 'navigate_away', [], true);
    expect(fromUndefined.status).toBe('not_answered');
    expect(fromUndefined.selectedIndices).toEqual([]);

    const afterDeselect = computeNextResponseState(
      {
        selectedIndices: [0, 1],
        status: 'answered_marked',
        timeSpentSeconds: 10,
        visitCount: 2,
      },
      'navigate_away',
      [],
      true
    );
    expect(afterDeselect.status).toBe('marked');
    expect(afterDeselect.selectedIndices).toEqual([]);
  });

  it('falls back to English when preferredLanguage is unsupported by the exam', () => {
    const session = initializeActiveSession(makeSampleExam(), 'normal', 'hi');
    expect(session.language).toBe('en');
  });

  it('strips built-in/source metadata on retry exams and detects Hindi dynamically on bookmarks exams', () => {
    const exam = makeSampleExam();
    const session = initializeActiveSession(exam, 'normal', 'en');
    const attempt = evaluateExamSession(session, 'Tester', 'R1', false);
    const retry = createRetryWrongExam(attempt);
    expect(retry).not.toBeNull();
    expect(retry!.isBuiltIn).toBe(false);
    expect(retry!.sourceFile).toBeUndefined();
    expect(retry!.sourceHash).toBeUndefined();

    const enOnlyBookmarks = createBookmarksExam([
      {
        id: 'b1',
        examId: 'e1',
        examTitle: 'E1',
        sectionName: 'S1',
        question: exam.sections[0].questions[0],
        createdAt: 1,
      },
    ]);
    expect(enOnlyBookmarks!.languages).toEqual(['en']);

    const bilingualBookmarks = createBookmarksExam([
      {
        id: 'b2',
        examId: 'e1',
        examTitle: 'E1',
        sectionName: 'S1',
        question: {
          ...exam.sections[0].questions[0],
          question: { en: 'Hello', hi: 'नमस्ते' },
        },
        createdAt: 1,
      },
    ]);
    expect(bilingualBookmarks!.languages).toEqual(['en', 'hi']);
  });
});
