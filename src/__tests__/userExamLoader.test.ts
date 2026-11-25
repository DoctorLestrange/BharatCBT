import { describe, expect, it } from 'vitest';
import {
  ACCENT_PRESETS,
  DEFAULT_ACCENT_COLOR,
  isValidAccentColor,
} from '../constants/accentColors';
import { DEFAULT_PROFILE } from '../storage/db';
import {
  buildUserFolderExamId,
  hashString,
  loadUserFolderExamEntries,
  verifyUserExamEntries,
} from '../utils/userExamLoader';

describe('userExamLoader', () => {
  it('discovers and verifies every JSON file in User_Exam_JSONs cleanly', async () => {
    const entries = await loadUserFolderExamEntries();
    expect(entries.length).toBeGreaterThanOrEqual(10);

    const { report, exams } = verifyUserExamEntries(entries, 1_700_000_000_000);
    expect(report.totalFiles).toBe(entries.length);
    expect(report.failedCount).toBe(0);
    expect(report.verifiedCount).toBe(entries.length);
    expect(exams.length).toBe(entries.length);

    const expectedBlueprints: Record<
      string,
      { questions: number; durationMinutes: number; sectionalTiming: boolean; optionsPerQ: number }
    > = {
      '01_UPSC_CSE_Prelims_GS1_Mock.json': {
        questions: 100,
        durationMinutes: 120,
        sectionalTiming: false,
        optionsPerQ: 4,
      },
      '02_SSC_CGL_Tier1_Mock.json': {
        questions: 100,
        durationMinutes: 60,
        sectionalTiming: false,
        optionsPerQ: 4,
      },
      '03_SSC_CHSL_Tier1_Mock.json': {
        questions: 100,
        durationMinutes: 60,
        sectionalTiming: false,
        optionsPerQ: 4,
      },
      '04_SSC_MTS_Havaldar_Mock.json': {
        questions: 90,
        durationMinutes: 90,
        sectionalTiming: true,
        optionsPerQ: 4,
      },
      '05_IBPS_PO_Prelims_Mock.json': {
        questions: 100,
        durationMinutes: 60,
        sectionalTiming: true,
        optionsPerQ: 5,
      },
      '06_SBI_PO_Prelims_Mock.json': {
        questions: 100,
        durationMinutes: 60,
        sectionalTiming: true,
        optionsPerQ: 5,
      },
      '07_IBPS_Clerk_Prelims_Mock.json': {
        questions: 100,
        durationMinutes: 60,
        sectionalTiming: true,
        optionsPerQ: 5,
      },
      '08_RRB_NTPC_CBT1_Mock.json': {
        questions: 100,
        durationMinutes: 90,
        sectionalTiming: false,
        optionsPerQ: 4,
      },
      '09_RRB_JE_CBT1_Mock.json': {
        questions: 100,
        durationMinutes: 90,
        sectionalTiming: false,
        optionsPerQ: 4,
      },
      '10_RBI_Grade_B_Phase1_Mock.json': {
        questions: 200,
        durationMinutes: 120,
        sectionalTiming: true,
        optionsPerQ: 5,
      },
    };

    for (const item of report.items) {
      expect(item.ok).toBe(true);
      expect(item.strictJsonOk).toBe(true);
      expect(item.errors).toEqual([]);
      expect(item.warnings).toEqual([]);

      const expected = expectedBlueprints[item.fileName];
      if (expected) {
        expect(item.questionCount).toBe(expected.questions);
        const exam = exams.find((e) => e.sourceFile === item.fileName);
        expect(exam).toBeDefined();
        expect(exam?.settings.durationMinutes).toBe(expected.durationMinutes);
        expect(exam?.settings.sectionalTiming).toBe(expected.sectionalTiming);
        for (const sec of exam?.sections ?? []) {
          for (const q of sec.questions) {
            expect(q.options.length).toBe(expected.optionsPerQ);
          }
        }
        if (item.fileName === '04_SSC_MTS_Havaldar_Mock.json' && exam) {
          expect(exam.sections.length).toBe(2);
          expect(exam.sections[0].questions.length).toBe(40);
          expect(exam.sections[0].durationMinutes).toBe(45);
          expect(exam.sections[0].questions.every((q) => q.negativeMarks === 0)).toBe(true);
          expect(exam.sections[1].questions.length).toBe(50);
          expect(exam.sections[1].durationMinutes).toBe(45);
          expect(exam.sections[1].questions.every((q) => q.negativeMarks === 1)).toBe(true);
        }
      }
    }

    // Natural sort order puts 01_UPSC_CSE_Prelims_GS1_Mock.json first
    expect(exams[0].sourceFile).toBe('01_UPSC_CSE_Prelims_GS1_Mock.json');
    expect(exams[0].id).toBe(buildUserFolderExamId('01_UPSC_CSE_Prelims_GS1_Mock.json'));
    expect(exams[0].sourceHash).toBe(hashString(entries[0].rawContent));
  });

  it('reports invalid JSON files without blocking valid exams', () => {
    const validRaw = JSON.stringify({
      title: 'Valid Folder Mock',
      questions: [
        {
          question: '1 + 1 = ?',
          options: ['1', '2', '3', '4'],
          correctIndex: 1,
        },
      ],
    });
    const brokenRaw = '{ "title": "Broken", "questions": [ }';

    const { report, exams } = verifyUserExamEntries([
      { fileName: 'mock10.json', rawContent: validRaw },
      { fileName: 'mock2.json', rawContent: brokenRaw },
    ]);

    expect(report.totalFiles).toBe(2);
    expect(report.verifiedCount).toBe(1);
    expect(report.failedCount).toBe(1);
    expect(exams.length).toBe(1);
    expect(exams[0].sourceFile).toBe('mock10.json');

    // Sorted naturally: mock2 before mock10
    expect(report.items[0].fileName).toBe('mock2.json');
    expect(report.items[0].ok).toBe(false);
    expect(report.items[0].strictJsonOk).toBe(false);
    expect(report.items[0].errors.length).toBeGreaterThan(0);

    expect(report.items[1].fileName).toBe('mock10.json');
    expect(report.items[1].ok).toBe(true);
  });

  it('validates accent color presets and defaults cleanly', () => {
    expect(DEFAULT_ACCENT_COLOR).toBe('blue');
    expect(DEFAULT_PROFILE.theme).toBe('light');
    expect(DEFAULT_PROFILE.accentColor).toBe('blue');
    expect(ACCENT_PRESETS.length).toBe(8);
    expect(isValidAccentColor('orange')).toBe(true);
    expect(isValidAccentColor('blue')).toBe(true);
    expect(isValidAccentColor('emerald')).toBe(true);
    expect(isValidAccentColor('invalid-color')).toBe(false);
    expect(isValidAccentColor(undefined)).toBe(false);
  });
});
