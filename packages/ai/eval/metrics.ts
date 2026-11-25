import type { Explanation, ScoreBreakdown, ScreeningTimings } from '../src/index.js';

export type BinaryLabel = 'phù hợp' | 'không phù hợp';
export type ConfidenceLevel = 'chắc' | 'chưa chắc';
export type DatasetSplit = 'dev' | 'test';

export interface LabelRow {
  cvFile: string;
  jdId: string;
  label: BinaryLabel;
  reason: string;
  missingSkills: string[];
  confidence: ConfidenceLevel;
  split: DatasetSplit;
  expectedScore: number;
}

export interface TokenUsage {
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
  llmCalls: number;
}

export interface PairEvalRecord {
  key: string;
  cvFile: string;
  jdId: string;
  split: DatasetSplit;
  label: BinaryLabel;
  confidence: ConfidenceLevel;
  expectedScore: number;
  labelReason: string;
  expectedMissingSkills: string[];
  aiScore: number;
  breakdown: ScoreBreakdown;
  explanation: Explanation;
  timings: ScreeningTimings;
  tokens: TokenUsage;
  evaluatedAt: string;
}

export interface StabilityRunRecord {
  run: number;
  total: number;
  timings: ScreeningTimings;
  tokens: TokenUsage;
}

export interface StabilityCase {
  cvFile: string;
  jdId: string;
  runs: StabilityRunRecord[];
}

export interface BinaryMetrics {
  threshold: number;
  total: number;
  tp: number;
  fp: number;
  fn: number;
  tn: number;
  accuracy: number;
  precision: number;
  recall: number;
  f1: number;
  mae: number;
}

export interface MisclassifiedCase {
  cvFile: string;
  jdId: string;
  trueLabel: BinaryLabel;
  predictedLabel: BinaryLabel;
  aiScore: number;
  expectedScore: number;
  confidence: ConfidenceLevel;
  labelReason: string;
  explanationSummary: string;
  gaps: string[];
  capped: boolean;
}

export interface StabilityCaseSummary {
  cvFile: string;
  jdId: string;
  scores: number[];
  min: number;
  max: number;
  maxDiff: number;
  withinTarget: boolean;
}

export interface StabilitySummary {
  targetMaxDiff: number;
  cases: StabilityCaseSummary[];
  overallMaxDiff: number;
  allWithinTarget: boolean;
}

export interface PerformanceSummary {
  sampleCount: number;
  avgTotalMs: number;
  avgParseCvMs: number;
  avgEmbedMs: number;
  avgScoreMs: number;
  avgExplainMs: number;
  avgInputTokens: number;
  avgOutputTokens: number;
  avgTotalTokens: number;
}

export interface EvalReport {
  generatedAt: string;
  models: {
    text: string;
    embedding: string;
  };
  referenceDate: string;
  candidateThresholds: number[];
  selectedThreshold: number;
  devThresholdSweep: BinaryMetrics[];
  testOverall: BinaryMetrics;
  testByJd: Record<string, BinaryMetrics>;
  testByConfidence: {
    sure: BinaryMetrics;
    unsure: BinaryMetrics;
  };
  allUnsure: BinaryMetrics;
  testMisclassified: MisclassifiedCase[];
  stability: StabilitySummary;
  performance: PerformanceSummary;
  pairs: PairEvalRecord[];
}

export const CANDIDATE_THRESHOLDS = [50, 60, 70, 80] as const;
export const STABILITY_TARGET_MAX_DIFF = 5;

const TOKEN_USAGE_PATTERN = /tokens\(in\/out\/total\)=(\d+)\/(\d+)\/(\d+)/;

/** Parse 1 dòng CSV theo chuẩn RFC 4180 (hỗ trợ dấu phẩy trong ngoặc kép và `""`). */
export function parseCsvLine(line: string): string[] {
  const cells: string[] = [];
  let cell = '';
  let quoted = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (quoted && char === '"' && line[i + 1] === '"') {
      cell += '"';
      i += 1;
    } else if (char === '"') {
      quoted = !quoted;
    } else if (char === ',' && !quoted) {
      cells.push(cell);
      cell = '';
    } else {
      cell += char;
    }
  }
  cells.push(cell);
  return cells;
}

/** Đọc nội dung `fixtures/labels.csv` thành danh sách `LabelRow`. */
export function parseLabelsCsv(csvContent: string): LabelRow[] {
  const lines = csvContent
    .replace(/^\uFEFF/, '')
    .trim()
    .split(/\r?\n/)
    .filter((line) => line.trim() !== '');

  if (lines.length < 2) {
    return [];
  }

  const header = parseCsvLine(lines[0]!);
  return lines.slice(1).map((line) => {
    const cells = parseCsvLine(line);
    const raw = Object.fromEntries(header.map((col, idx) => [col.trim(), (cells[idx] ?? '').trim()]));

    const label = raw.label as BinaryLabel;
    if (label !== 'phù hợp' && label !== 'không phù hợp') {
      throw new Error(`Nhãn không hợp lệ ở ${raw.cv_file} ↔ ${raw.jd_id}: "${raw.label}"`);
    }

    const confidence = raw.confidence as ConfidenceLevel;
    if (confidence !== 'chắc' && confidence !== 'chưa chắc') {
      throw new Error(`Confidence không hợp lệ ở ${raw.cv_file} ↔ ${raw.jd_id}: "${raw.confidence}"`);
    }

    const split = raw.split as DatasetSplit;
    if (split !== 'dev' && split !== 'test') {
      throw new Error(`Split không hợp lệ ở ${raw.cv_file} ↔ ${raw.jd_id}: "${raw.split}"`);
    }

    const expectedScore = Number(raw.expected_score);
    if (!Number.isFinite(expectedScore)) {
      throw new Error(`expected_score không hợp lệ ở ${raw.cv_file} ↔ ${raw.jd_id}`);
    }

    return {
      cvFile: raw.cv_file!,
      jdId: raw.jd_id!,
      label,
      reason: raw.reason ?? '',
      missingSkills: raw.missing_skills
        ? raw.missing_skills
            .split(';')
            .map((s) => s.trim())
            .filter(Boolean)
        : [],
      confidence,
      split,
      expectedScore,
    };
  });
}

/** Trích số token từ dòng log `ai.* ok ... tokens(in/out/total)=in/out/total` của `@hireflow/ai`. */
export function parseTokenLogLine(
  message: string,
): { inputTokens: number; outputTokens: number; totalTokens: number } | null {
  const match = TOKEN_USAGE_PATTERN.exec(message);
  if (!match) {
    return null;
  }
  return {
    inputTokens: Number(match[1]),
    outputTokens: Number(match[2]),
    totalTokens: Number(match[3]),
  };
}

function round4(value: number): number {
  return Math.round(value * 10_000) / 10_000;
}

function round2(value: number): number {
  return Math.round(value * 100) / 100;
}

/**
 * Đánh giá nhị phân 2 nhãn:
 * - Dự đoán "phù hợp" (positive) nếu `aiScore >= threshold`
 * - Dự đoán "không phù hợp" (negative) nếu `aiScore < threshold` (CONSIDER tính là không phù hợp)
 */
export function computeBinaryMetrics(
  records: ReadonlyArray<Pick<PairEvalRecord, 'label' | 'aiScore' | 'expectedScore'>>,
  threshold: number,
): BinaryMetrics {
  let tp = 0;
  let fp = 0;
  let fn = 0;
  let tn = 0;
  let absErrorSum = 0;

  for (const record of records) {
    const actualPositive = record.label === 'phù hợp';
    const predictedPositive = record.aiScore >= threshold;

    if (actualPositive && predictedPositive) tp += 1;
    else if (!actualPositive && predictedPositive) fp += 1;
    else if (actualPositive && !predictedPositive) fn += 1;
    else tn += 1;

    absErrorSum += Math.abs(record.aiScore - record.expectedScore);
  }

  const total = records.length;
  const accuracy = total === 0 ? 0 : (tp + tn) / total;
  const precision = tp + fp === 0 ? 0 : tp / (tp + fp);
  const recall = tp + fn === 0 ? 0 : tp / (tp + fn);
  const f1 = precision + recall === 0 ? 0 : (2 * precision * recall) / (precision + recall);
  const mae = total === 0 ? 0 : absErrorSum / total;

  return {
    threshold,
    total,
    tp,
    fp,
    fn,
    tn,
    accuracy: round4(accuracy),
    precision: round4(precision),
    recall: round4(recall),
    f1: round4(f1),
    mae: round2(mae),
  };
}

/**
 * Thử các ngưỡng ứng viên (mặc định `50 / 60 / 70 / 80`) CHỈ trên tập `dev`,
 * chọn ngưỡng có F1 cao nhất (hòa F1 → ưu tiên Accuracy cao hơn → ưu tiên Precision cao hơn → ưu tiên ngưỡng gần 70).
 */
export function selectBestThreshold(
  devRecords: ReadonlyArray<Pick<PairEvalRecord, 'label' | 'aiScore' | 'expectedScore'>>,
  thresholds: readonly number[] = CANDIDATE_THRESHOLDS,
): { selectedThreshold: number; sweep: BinaryMetrics[] } {
  if (thresholds.length === 0) {
    throw new Error('Cần ít nhất 1 ngưỡng ứng viên');
  }

  const sweep = thresholds.map((threshold) => computeBinaryMetrics(devRecords, threshold));
  const best = [...sweep].sort((a, b) => {
    if (b.f1 !== a.f1) return b.f1 - a.f1;
    if (b.accuracy !== a.accuracy) return b.accuracy - a.accuracy;
    if (b.precision !== a.precision) return b.precision - a.precision;
    return Math.abs(a.threshold - 70) - Math.abs(b.threshold - 70);
  })[0]!;

  return { selectedThreshold: best.threshold, sweep };
}

export function findMisclassifiedCases(
  records: readonly PairEvalRecord[],
  threshold: number,
): MisclassifiedCase[] {
  const wrong: MisclassifiedCase[] = [];

  for (const record of records) {
    const predictedLabel: BinaryLabel =
      record.aiScore >= threshold ? 'phù hợp' : 'không phù hợp';
    if (predictedLabel === record.label) {
      continue;
    }

    wrong.push({
      cvFile: record.cvFile,
      jdId: record.jdId,
      trueLabel: record.label,
      predictedLabel,
      aiScore: record.aiScore,
      expectedScore: record.expectedScore,
      confidence: record.confidence,
      labelReason: record.labelReason,
      explanationSummary: record.explanation.summary,
      gaps: record.explanation.gaps.map((g) => `${g.skill}: ${g.note}`),
      capped: record.breakdown.capped,
    });
  }

  return wrong;
}

export function summarizeStability(
  cases: readonly StabilityCase[],
  targetMaxDiff = STABILITY_TARGET_MAX_DIFF,
): StabilitySummary {
  const summaries: StabilityCaseSummary[] = cases.map((item) => {
    const scores = item.runs.map((r) => r.total);
    const min = scores.length > 0 ? Math.min(...scores) : 0;
    const max = scores.length > 0 ? Math.max(...scores) : 0;
    const maxDiff = max - min;
    return {
      cvFile: item.cvFile,
      jdId: item.jdId,
      scores,
      min,
      max,
      maxDiff,
      withinTarget: maxDiff <= targetMaxDiff,
    };
  });

  const overallMaxDiff =
    summaries.length > 0 ? Math.max(...summaries.map((s) => s.maxDiff)) : 0;

  return {
    targetMaxDiff,
    cases: summaries,
    overallMaxDiff,
    allWithinTarget: summaries.every((s) => s.withinTarget),
  };
}

export function summarizePerformance(records: readonly PairEvalRecord[]): PerformanceSummary {
  const n = records.length;
  if (n === 0) {
    return {
      sampleCount: 0,
      avgTotalMs: 0,
      avgParseCvMs: 0,
      avgEmbedMs: 0,
      avgScoreMs: 0,
      avgExplainMs: 0,
      avgInputTokens: 0,
      avgOutputTokens: 0,
      avgTotalTokens: 0,
    };
  }

  const avg = (getter: (r: PairEvalRecord) => number) =>
    Math.round(records.reduce((sum, r) => sum + getter(r), 0) / n);

  return {
    sampleCount: n,
    avgTotalMs: avg((r) => r.timings.totalMs),
    avgParseCvMs: avg((r) => r.timings.parseCvMs),
    avgEmbedMs: avg((r) => r.timings.embedMs),
    avgScoreMs: avg((r) => r.timings.scoreMs),
    avgExplainMs: avg((r) => r.timings.explainMs),
    avgInputTokens: avg((r) => r.tokens.inputTokens),
    avgOutputTokens: avg((r) => r.tokens.outputTokens),
    avgTotalTokens: avg((r) => r.tokens.totalTokens),
  };
}

export function buildEvalReport(params: {
  generatedAt: string;
  models: { text: string; embedding: string };
  referenceDate: string;
  pairs: readonly PairEvalRecord[];
  stabilityCases: readonly StabilityCase[];
  candidateThresholds?: readonly number[];
}): EvalReport {
  const candidateThresholds = [...(params.candidateThresholds ?? CANDIDATE_THRESHOLDS)];
  const devPairs = params.pairs.filter((p) => p.split === 'dev');
  const testPairs = params.pairs.filter((p) => p.split === 'test');

  const { selectedThreshold, sweep: devThresholdSweep } = selectBestThreshold(
    devPairs,
    candidateThresholds,
  );

  const testOverall = computeBinaryMetrics(testPairs, selectedThreshold);

  const jdIds = [...new Set(testPairs.map((p) => p.jdId))].sort();
  const testByJd: Record<string, BinaryMetrics> = {};
  for (const jdId of jdIds) {
    testByJd[jdId] = computeBinaryMetrics(
      testPairs.filter((p) => p.jdId === jdId),
      selectedThreshold,
    );
  }

  const testByConfidence = {
    sure: computeBinaryMetrics(
      testPairs.filter((p) => p.confidence === 'chắc'),
      selectedThreshold,
    ),
    unsure: computeBinaryMetrics(
      testPairs.filter((p) => p.confidence === 'chưa chắc'),
      selectedThreshold,
    ),
  };

  const allUnsure = computeBinaryMetrics(
    params.pairs.filter((p) => p.confidence === 'chưa chắc'),
    selectedThreshold,
  );

  return {
    generatedAt: params.generatedAt,
    models: params.models,
    referenceDate: params.referenceDate,
    candidateThresholds,
    selectedThreshold,
    devThresholdSweep,
    testOverall,
    testByJd,
    testByConfidence,
    allUnsure,
    testMisclassified: findMisclassifiedCases(testPairs, selectedThreshold),
    stability: summarizeStability(params.stabilityCases),
    performance: summarizePerformance(params.pairs),
    pairs: [...params.pairs],
  };
}

function pct(value: number): string {
  return `${(value * 100).toFixed(1)}%`;
}

function escapePipe(text: string): string {
  return text.replace(/\|/g, '\\|').replace(/\r?\n/g, ' ');
}

/** Sinh nội dung báo cáo `packages/ai/eval/results.md` dễ đọc. */
export function renderResultsMarkdown(report: EvalReport): string {
  const devCount = report.pairs.filter((p) => p.split === 'dev').length;
  const testCount = report.pairs.filter((p) => p.split === 'test').length;
  const lines: string[] = [];

  lines.push('# Báo cáo Đánh giá Độ chính xác Sàng lọc CV (`W2-AI-04`)');
  lines.push('');
  lines.push(`- **Thời điểm chạy:** ${report.generatedAt}`);
  lines.push(`- **Model Text:** \`${report.models.text}\``);
  lines.push(`- **Model Embedding:** \`${report.models.embedding}\``);
  lines.push(`- **Ngày tham chiếu kinh nghiệm:** \`${report.referenceDate}\``);
  lines.push(`- **Bộ dữ liệu:** ${report.pairs.length} cặp CV–JD (${devCount} dev, ${testCount} test) từ \`packages/ai/fixtures/labels.csv\``);
  lines.push(`- **Quy ước đánh giá 2 nhãn:** \`score >= ngưỡng\` → **phù hợp**; \`score < ngưỡng\` → **không phù hợp** (\`CONSIDER\` tính là không phù hợp).`);
  lines.push(`- **Ngưỡng đề xuất cho \`cvPassThreshold\` mặc định:** **${report.selectedThreshold}** (chọn trên tập dev theo F1 cao nhất).`);
  lines.push('');

  lines.push('## 1. Chọn ngưỡng trên tập Dev (`50 / 60 / 70 / 80`)');
  lines.push('');
  lines.push('| Ngưỡng | Accuracy | Precision | Recall | F1 | TP | FP | FN | TN | MAE | Chọn |');
  lines.push('| ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | :---: |');
  for (const row of report.devThresholdSweep) {
    const picked = row.threshold === report.selectedThreshold ? '**✓**' : '';
    lines.push(
      `| ${row.threshold} | ${pct(row.accuracy)} | ${pct(row.precision)} | ${pct(row.recall)} | **${pct(row.f1)}** | ${row.tp} | ${row.fp} | ${row.fn} | ${row.tn} | ${row.mae.toFixed(2)} | ${picked} |`,
    );
  }
  lines.push('');

  const t = report.testOverall;
  lines.push(`## 2. Kết quả trên tập Test (ngưỡng = ${report.selectedThreshold})`);
  lines.push('');
  lines.push('| Chỉ số | Giá trị |');
  lines.push('| :--- | ---: |');
  lines.push(`| Số cặp đánh giá | ${t.total} |`);
  lines.push(`| Accuracy | **${pct(t.accuracy)}** |`);
  lines.push(`| Precision | ${pct(t.precision)} |`);
  lines.push(`| Recall | ${pct(t.recall)} |`);
  lines.push(`| F1-Score | **${pct(t.f1)}** |`);
  lines.push(`| Sai số điểm trung bình (MAE vs \`expected_score\`) | ${t.mae.toFixed(2)} điểm |`);
  lines.push('');

  lines.push('### Ma trận nhầm lẫn (Confusion Matrix — Tập Test)');
  lines.push('');
  lines.push('| Thực tế \\ Dự đoán | Phù hợp (`>= ' + report.selectedThreshold + '`) | Không phù hợp (`< ' + report.selectedThreshold + '`) |');
  lines.push('| :--- | ---: | ---: |');
  lines.push(`| **Phù hợp** | TP = **${t.tp}** | FN = **${t.fn}** |`);
  lines.push(`| **Không phù hợp** | FP = **${t.fp}** | TN = **${t.tn}** |`);
  lines.push('');

  lines.push('### Kết quả tập Test theo từng JD');
  lines.push('');
  lines.push('| JD | Số cặp | Accuracy | Precision | Recall | F1 | TP / FP / FN / TN | MAE |');
  lines.push('| :--- | ---: | ---: | ---: | ---: | ---: | :---: | ---: |');
  for (const [jdId, m] of Object.entries(report.testByJd)) {
    lines.push(
      `| ${jdId} | ${m.total} | ${pct(m.accuracy)} | ${pct(m.precision)} | ${pct(m.recall)} | ${pct(m.f1)} | ${m.tp} / ${m.fp} / ${m.fn} / ${m.tn} | ${m.mae.toFixed(2)} |`,
    );
  }
  lines.push('');

  lines.push('## 3. Phân tích riêng nhóm độ chắc chắn (`confidence`)');
  lines.push('');
  lines.push('| Nhóm | Số cặp | Accuracy | Precision | Recall | F1 | TP / FP / FN / TN | MAE |');
  lines.push('| :--- | ---: | ---: | ---: | ---: | ---: | :---: | ---: |');
  const confidenceRows: Array<[string, BinaryMetrics]> = [
    ['Tập Test — `chắc`', report.testByConfidence.sure],
    ['Tập Test — `chưa chắc`', report.testByConfidence.unsure],
    ['Toàn bộ (Dev + Test) — `chưa chắc`', report.allUnsure],
  ];
  for (const [name, m] of confidenceRows) {
    lines.push(
      `| ${name} | ${m.total} | ${pct(m.accuracy)} | ${pct(m.precision)} | ${pct(m.recall)} | ${pct(m.f1)} | ${m.tp} / ${m.fp} / ${m.fn} / ${m.tn} | ${m.mae.toFixed(2)} |`,
    );
  }
  lines.push('');

  lines.push('## 4. Các ca AI chấm sai trên tập Test');
  lines.push('');
  if (report.testMisclassified.length === 0) {
    lines.push('Không có ca chấm sai nào trên tập Test ở ngưỡng đã chọn.');
  } else {
    lines.push('| CV | JD | Nhãn đúng | Dự đoán AI | Điểm AI (Kỳ vọng) | Confidence | Lý do theo `explanation` |');
    lines.push('| :--- | :--- | :--- | :--- | :---: | :--- | :--- |');
    for (const item of report.testMisclassified) {
      const gapNote = item.gaps.length > 0 ? ` Gaps: ${item.gaps.join('; ')}` : '';
      const reasonText = escapePipe(`${item.explanationSummary}${gapNote}`);
      lines.push(
        `| \`${item.cvFile}\` | ${item.jdId} | ${item.trueLabel} | ${item.predictedLabel} | **${item.aiScore}** (${item.expectedScore})${item.capped ? ' [capped]' : ''} | ${item.confidence} | ${reasonText} |`,
      );
    }
  }
  lines.push('');

  lines.push(`## 5. Độ ổn định (5 CV × 3 lần chạy, mục tiêu độ lệch ≤ ±${report.stability.targetMaxDiff})`);
  lines.push('');
  lines.push('| CV | JD | Điểm 3 lần | Min | Max | Độ lệch lớn nhất | Đạt mục tiêu |');
  lines.push('| :--- | :--- | :---: | ---: | ---: | ---: | :---: |');
  for (const c of report.stability.cases) {
    lines.push(
      `| \`${c.cvFile}\` | ${c.jdId} | ${c.scores.join(' / ')} | ${c.min} | ${c.max} | **${c.maxDiff}** | ${c.withinTarget ? '✓' : '✗'} |`,
    );
  }
  lines.push('');
  lines.push(
    `- **Độ lệch lớn nhất toàn bộ 5 CV:** **${report.stability.overallMaxDiff}** điểm (${report.stability.allWithinTarget ? 'Đạt mục tiêu ≤ ±5' : 'Vượt mục tiêu ±5'}).`,
  );
  lines.push('');

  const p = report.performance;
  lines.push('## 6. Thời gian xử lý & Token trung bình mỗi CV');
  lines.push('');
  lines.push('| Chỉ số (trung bình trên ' + p.sampleCount + ' cặp) | Giá trị |');
  lines.push('| :--- | ---: |');
  lines.push(`| Tổng thời gian \`screenCv\` | **${p.avgTotalMs} ms** (~${(p.avgTotalMs / 1000).toFixed(2)}s) |`);
  lines.push(`| — Bước \`parseCv\` | ${p.avgParseCvMs} ms |`);
  lines.push(`| — Bước \`embedCv\` | ${p.avgEmbedMs} ms |`);
  lines.push(`| — Bước \`scoreCv\` | ${p.avgScoreMs} ms |`);
  lines.push(`| — Bước \`explainScore\` | ${p.avgExplainMs} ms |`);
  lines.push(`| Input tokens trung bình (các lần gọi LLM) | ${p.avgInputTokens} |`);
  lines.push(`| Output tokens trung bình (các lần gọi LLM) | ${p.avgOutputTokens} |`);
  lines.push(`| **Tổng tokens trung bình mỗi CV** | **${p.avgTotalTokens}** |`);
  lines.push('');
  lines.push('*(Lưu ý: Gemini Developer API không trả `tokenCount` cho lời gọi embedding nên tổng token phản ánh các lời gọi LLM `parseCv`, `scoreCv/relevance` và `explainScore`.)*');
  lines.push('');

  lines.push('## 7. Hạn chế của phép đánh giá');
  lines.push('');
  lines.push('1. **Nhãn do 1 người gán:** Bộ nhãn chuẩn (`labels.csv`) được gán bởi một người, chưa có quy trình gán nhãn độc lập 2 người (double-blind) hay chỉ số đồng thuận liên người gán (Cohen’s kappa), đặc biệt với nhóm hồ sơ ranh giới (`chưa chắc`).');
  lines.push('2. **Bộ dữ liệu nhỏ (30 CV / 40 cặp CV–JD):** Kích thước tập dev (13 cặp) và tập test (27 cặp) còn nhỏ, mỗi ca sai làm dịch chuyển đáng kể tỷ lệ phần trăm Accuracy/F1.');
  lines.push('3. **CV là dữ liệu giả lập (synthetic fixtures):** Toàn bộ 30 CV được sinh từ mẫu dữ liệu giả có bố cục sạch, chưa phản ánh đầy đủ độ nhiễu, định dạng phức tạp hoặc lỗi OCR của CV thực tế ngoài thị trường.');
  lines.push('');

  return `${lines.join('\n')}\n`;
}
