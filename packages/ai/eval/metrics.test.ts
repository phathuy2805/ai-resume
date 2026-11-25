import { describe, expect, it } from 'vitest';
import {
  buildEvalReport,
  computeBinaryMetrics,
  findMisclassifiedCases,
  parseCsvLine,
  parseLabelsCsv,
  parseTokenLogLine,
  renderResultsMarkdown,
  selectBestThreshold,
  summarizePerformance,
  summarizeStability,
  type PairEvalRecord,
} from './metrics.ts';

function makeRecord(overrides: Partial<PairEvalRecord> = {}): PairEvalRecord {
  return {
    key: 'cv_be_01.pdf::JD_BE',
    cvFile: 'cv_be_01.pdf',
    jdId: 'JD_BE',
    split: 'test',
    label: 'phù hợp',
    confidence: 'chắc',
    expectedScore: 90,
    labelReason: 'Đáp ứng tốt',
    expectedMissingSkills: [],
    aiScore: 88,
    breakdown: {
      requiredSkills: { score: 100, weight: 35, matched: ['NodeJS'], missing: [] },
      preferredSkills: { score: 50, weight: 10, matched: ['Redis'], missing: ['Docker'] },
      experienceYears: { score: 100, weight: 15, candidateYears: 4, requiredYears: 3 },
      relevance: { score: 90, weight: 25, comment: 'Rất phù hợp' },
      similarity: { score: 80, weight: 15, cosine: 0.89 },
      capped: false,
    },
    explanation: {
      strengths: [{ point: 'Kinh nghiệm NodeJS tốt', quote: '4 năm NodeJS' }],
      gaps: [],
      summary: 'Ứng viên phù hợp tốt với vị trí.',
    },
    timings: {
      parseCvMs: 1000,
      embedMs: 300,
      scoreMs: 800,
      explainMs: 1200,
      totalMs: 3300,
    },
    tokens: {
      inputTokens: 1200,
      outputTokens: 300,
      totalTokens: 1500,
      llmCalls: 3,
    },
    evaluatedAt: '2026-11-24T12:00:00.000Z',
    ...overrides,
  };
}

describe('eval/metrics', () => {
  it('parses CSV lines with quoted commas and labels.csv rows', () => {
    expect(parseCsvLine('a,"b, c","d ""e""",10')).toEqual(['a', 'b, c', 'd "e"', '10']);

    const csv = [
      'cv_file,jd_id,label,reason,missing_skills,confidence,split,expected_score',
      'cv_be_05.pdf,JD_BE,không phù hợp,"Có 4 năm, thiếu NestJS","NestJS;Docker",chưa chắc,dev,66',
      'cv_be_01.pdf,JD_BE,phù hợp,"Tốt",,chắc,test,92',
    ].join('\r\n');

    const rows = parseLabelsCsv(csv);
    expect(rows).toHaveLength(2);
    expect(rows[0]).toEqual({
      cvFile: 'cv_be_05.pdf',
      jdId: 'JD_BE',
      label: 'không phù hợp',
      reason: 'Có 4 năm, thiếu NestJS',
      missingSkills: ['NestJS', 'Docker'],
      confidence: 'chưa chắc',
      split: 'dev',
      expectedScore: 66,
    });
  });

  it('parses token usage metadata from @hireflow/ai log lines', () => {
    expect(
      parseTokenLogLine(
        'ai.generateStructured model=gemini-3.5-flash-lite ok durationMs=905 retries=0 tokens(in/out/total)=464/81/545',
      ),
    ).toEqual({ inputTokens: 464, outputTokens: 81, totalTokens: 545 });
    expect(
      parseTokenLogLine('ai.embed model=gemini-embedding-001 ok durationMs=327 retries=0 dims=768 tokens=n/a'),
    ).toBeNull();
  });

  it('computes accuracy, precision, recall, F1, confusion matrix, and MAE accurately', () => {
    const records = [
      { label: 'phù hợp' as const, aiScore: 85, expectedScore: 90 }, // TP (err 5)
      { label: 'phù hợp' as const, aiScore: 65, expectedScore: 75 }, // FN (err 10, CONSIDER -> negative)
      { label: 'không phù hợp' as const, aiScore: 72, expectedScore: 66 }, // FP (err 6)
      { label: 'không phù hợp' as const, aiScore: 20, expectedScore: 15 }, // TN (err 5)
    ];

    const m = computeBinaryMetrics(records, 70);
    expect(m).toEqual({
      threshold: 70,
      total: 4,
      tp: 1,
      fp: 1,
      fn: 1,
      tn: 1,
      accuracy: 0.5,
      precision: 0.5,
      recall: 0.5,
      f1: 0.5,
      mae: 6.5,
    });
  });

  it('handles zero denominators without NaN', () => {
    const m = computeBinaryMetrics(
      [{ label: 'không phù hợp', aiScore: 20, expectedScore: 15 }],
      70,
    );
    expect(m.tp).toBe(0);
    expect(m.tn).toBe(1);
    expect(m.accuracy).toBe(1);
    expect(m.precision).toBe(0);
    expect(m.recall).toBe(0);
    expect(m.f1).toBe(0);
  });

  it('selects threshold with highest F1 on dev set', () => {
    const dev = [
      { label: 'phù hợp' as const, aiScore: 86, expectedScore: 90 },
      { label: 'phù hợp' as const, aiScore: 82, expectedScore: 85 },
      { label: 'không phù hợp' as const, aiScore: 74, expectedScore: 66 },
      { label: 'không phù hợp' as const, aiScore: 72, expectedScore: 65 },
      { label: 'không phù hợp' as const, aiScore: 18, expectedScore: 15 },
    ];

    const { selectedThreshold, sweep } = selectBestThreshold(dev, [50, 60, 70, 80]);
    expect(selectedThreshold).toBe(80);
    expect(sweep.find((s) => s.threshold === 80)?.f1).toBe(1);
    expect(sweep.find((s) => s.threshold === 70)?.fp).toBe(2);
  });

  it('identifies misclassified cases, summarizes stability & performance, and renders markdown report', () => {
    const devGood = makeRecord({ key: 'cv_be_01.pdf::JD_BE', split: 'dev', aiScore: 88, label: 'phù hợp' });
    const devBad = makeRecord({
      key: 'cv_be_08.pdf::JD_BE',
      cvFile: 'cv_be_08.pdf',
      split: 'dev',
      aiScore: 20,
      expectedScore: 20,
      label: 'không phù hợp',
    });
    const testRight = makeRecord({ key: 'cv_be_03.pdf::JD_BE', cvFile: 'cv_be_03.pdf', split: 'test', aiScore: 85 });
    const testWrong = makeRecord({
      key: 'cv_da_07.pdf::JD_DA',
      cvFile: 'cv_da_07.pdf',
      jdId: 'JD_DA',
      split: 'test',
      label: 'không phù hợp',
      confidence: 'chưa chắc',
      aiScore: 72,
      expectedScore: 60,
      explanation: {
        strengths: [],
        gaps: [{ skill: 'Python', note: 'Thiếu Python' }],
        summary: 'Thiếu Python nhưng nền tảng SQL tốt.',
      },
    });

    const wrong = findMisclassifiedCases([testRight, testWrong], 70);
    expect(wrong).toHaveLength(1);
    expect(wrong[0]!.cvFile).toBe('cv_da_07.pdf');
    expect(wrong[0]!.gaps).toEqual(['Python: Thiếu Python']);

    const stability = summarizeStability([
      {
        cvFile: 'cv_be_01.pdf',
        jdId: 'JD_BE',
        runs: [
          { run: 1, total: 88, timings: devGood.timings, tokens: devGood.tokens },
          { run: 2, total: 90, timings: devGood.timings, tokens: devGood.tokens },
          { run: 3, total: 89, timings: devGood.timings, tokens: devGood.tokens },
        ],
      },
    ]);
    expect(stability.overallMaxDiff).toBe(2);
    expect(stability.allWithinTarget).toBe(true);

    const perf = summarizePerformance([devGood, devBad]);
    expect(perf.avgTotalMs).toBe(3300);
    expect(perf.avgTotalTokens).toBe(1500);

    const report = buildEvalReport({
      generatedAt: '2026-11-24T12:00:00.000Z',
      models: { text: 'gemini-3.5-flash-lite', embedding: 'gemini-embedding-001' },
      referenceDate: '2026-11-01',
      pairs: [devGood, devBad, testRight, testWrong],
      stabilityCases: [
        {
          cvFile: 'cv_be_01.pdf',
          jdId: 'JD_BE',
          runs: [
            { run: 1, total: 88, timings: devGood.timings, tokens: devGood.tokens },
            { run: 2, total: 90, timings: devGood.timings, tokens: devGood.tokens },
            { run: 3, total: 89, timings: devGood.timings, tokens: devGood.tokens },
          ],
        },
      ],
    });

    const md = renderResultsMarkdown(report);
    expect(md).toContain('Chọn ngưỡng trên tập Dev');
    expect(md).toContain('Ma trận nhầm lẫn');
    expect(md).toContain('chưa chắc');
    expect(md).toContain('cv_da_07.pdf');
    expect(md).toContain('Nhãn do 1 người gán');
    expect(md).toContain('dữ liệu giả lập');
  });
});
