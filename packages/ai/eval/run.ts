import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import type { AiLogger, ParsedJd } from '../dist/index.d.mts';
import {
  createAiClient,
  embedJd,
  extractCvText,
  isAiError,
  parseJd,
  screenCv,
  ScreeningStepError,
} from '../dist/index.mjs';
import {
  buildEvalReport,
  parseLabelsCsv,
  parseTokenLogLine,
  renderResultsMarkdown,
  type LabelRow,
  type PairEvalRecord,
  type StabilityCase,
  type TokenUsage,
} from './metrics.ts';

const EVAL_DIR = import.meta.dirname;
const FIXTURES_DIR = path.resolve(EVAL_DIR, '../fixtures');
const CACHE_DIR = path.join(EVAL_DIR, '.cache');
const CACHE_PATH = path.join(CACHE_DIR, 'eval-cache.json');
const RESULTS_JSON_PATH = path.join(EVAL_DIR, 'results.json');
const RESULTS_MD_PATH = path.join(EVAL_DIR, 'results.md');

const FIXTURE_REFERENCE_DATE = new Date('2026-11-01');
const STABILITY_RUNS = 3;
const STABILITY_TARGETS: ReadonlyArray<{ cvFile: string; jdId: string }> = [
  { cvFile: 'cv_be_01.pdf', jdId: 'JD_BE' },
  { cvFile: 'cv_be_05.pdf', jdId: 'JD_BE' },
  { cvFile: 'cv_da_01.pdf', jdId: 'JD_DA' },
  { cvFile: 'cv_da_06.pdf', jdId: 'JD_DA' },
  { cvFile: 'cv_mkt_01.pdf', jdId: 'JD_MKT' },
];

interface FixtureJd {
  code: string;
  title: string;
  level: string;
  description: string;
  responsibilities: string[];
  requiredSkills: string[];
  preferredSkills: string[];
  minYearsExperience: number;
}

interface CachedJd {
  parsedJd: ParsedJd;
  jdEmbedding: number[];
  evaluatedAt: string;
}

interface EvalCache {
  models: {
    text: string;
    embedding: string;
  };
  jds: Record<string, CachedJd>;
  pairs: Record<string, PairEvalRecord>;
  stability: Record<string, StabilityCase>;
}

const quietLogger: AiLogger = {
  log() {},
  warn() {},
  error: (message) => console.error(message),
};

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));
const OUTER_RETRY_DELAYS_MS = [8_000, 15_000, 25_000, 40_000] as const;

function isTransientEvalError(error: unknown): boolean {
  const target = error instanceof ScreeningStepError ? error.cause : error;
  if (!isAiError(target)) return false;
  const causeMsg = target.cause instanceof Error ? target.cause.message : '';
  if (/PerDay|per day/i.test(causeMsg)) {
    return false;
  }
  return (
    target.code === 'AI_RATE_LIMIT' ||
    target.code === 'AI_TIMEOUT' ||
    target.status === 429 ||
    target.status === 500 ||
    target.status === 503
  );
}

async function runWithOuterRetry<T>(label: string, fn: () => Promise<T>): Promise<T> {
  for (let attempt = 0; ; attempt++) {
    try {
      return await fn();
    } catch (error) {
      const waitMs = OUTER_RETRY_DELAYS_MS[attempt];
      if (!isTransientEvalError(error) || waitMs === undefined) {
        throw error;
      }
      const target = error instanceof ScreeningStepError ? error.cause : error;
      const detail = isAiError(target)
        ? `${target.code} (status=${target.status ?? 'n/a'})`
        : String(error);
      console.warn(
        `   ↻ [${label}] gặp lỗi tạm thời ${detail}, nghỉ ${waitMs / 1000}s rồi thử lại (lần ${attempt + 1}/${OUTER_RETRY_DELAYS_MS.length})...`,
      );
      await sleep(waitMs);
    }
  }
}

function pairKey(cvFile: string, jdId: string): string {
  return `${cvFile}::${jdId}`;
}

function jdFileOf(jdId: string): string {
  const short = jdId.replace(/^JD_/i, '').toLowerCase();
  return path.join(FIXTURES_DIR, 'jds', `jd_${short}.json`);
}

function readFixtureJd(jdId: string): FixtureJd {
  return JSON.parse(readFileSync(jdFileOf(jdId), 'utf8')) as FixtureJd;
}

function descriptionOf(jd: FixtureJd): string {
  return `${jd.description}\nTrách nhiệm:\n${jd.responsibilities.map((r) => `- ${r}`).join('\n')}`;
}

function createEmptyCache(models: { text: string; embedding: string }): EvalCache {
  return {
    models,
    jds: {},
    pairs: {},
    stability: {},
  };
}

function loadCache(models: { text: string; embedding: string }, reset: boolean): EvalCache {
  if (reset || !existsSync(CACHE_PATH)) {
    return createEmptyCache(models);
  }
  const raw = JSON.parse(readFileSync(CACHE_PATH, 'utf8')) as EvalCache;
  if (raw.models?.text !== models.text || raw.models?.embedding !== models.embedding) {
    console.log(
      `ℹ Cache cũ dùng model (${raw.models?.text} / ${raw.models?.embedding}) khác cấu hình hiện tại (${models.text} / ${models.embedding}) → chạy lại mới.`,
    );
    return createEmptyCache(models);
  }
  return raw;
}

function saveCache(cache: EvalCache): void {
  mkdirSync(CACHE_DIR, { recursive: true });
  writeFileSync(CACHE_PATH, JSON.stringify(cache, null, 2), 'utf8');
}

function createTokenCollector() {
  let current: TokenUsage = { inputTokens: 0, outputTokens: 0, totalTokens: 0, llmCalls: 0 };

  const logger: AiLogger = {
    log(message) {
      const parsed = parseTokenLogLine(message);
      if (parsed) {
        current.inputTokens += parsed.inputTokens;
        current.outputTokens += parsed.outputTokens;
        current.totalTokens += parsed.totalTokens;
        current.llmCalls += 1;
      }
    },
    warn(message) {
      console.warn(`   ! ${message}`);
    },
    error(message) {
      console.error(`   ✗ ${message}`);
    },
  };

  return {
    logger,
    reset() {
      current = { inputTokens: 0, outputTokens: 0, totalTokens: 0, llmCalls: 0 };
    },
    snapshot(): TokenUsage {
      return { ...current };
    },
  };
}

async function extractCvTextCached(
  cvFile: string,
  textCache: Map<string, string>,
): Promise<string> {
  const existing = textCache.get(cvFile);
  if (existing !== undefined) {
    return existing;
  }
  const bytes = new Uint8Array(readFileSync(path.join(FIXTURES_DIR, 'cvs', cvFile)));
  const { text } = await extractCvText(bytes, { logger: quietLogger });
  textCache.set(cvFile, text);
  return text;
}

function writeOutputs(labels: readonly LabelRow[], cache: EvalCache): void {
  const pairs: PairEvalRecord[] = labels.map((row) => {
    const record = cache.pairs[pairKey(row.cvFile, row.jdId)];
    if (!record) {
      throw new Error(`Thiếu kết quả cho cặp ${row.cvFile} ↔ ${row.jdId}`);
    }
    return record;
  });

  const stabilityCases: StabilityCase[] = STABILITY_TARGETS.map(({ cvFile, jdId }) => {
    const item = cache.stability[pairKey(cvFile, jdId)];
    if (!item || item.runs.length < STABILITY_RUNS) {
      throw new Error(`Thiếu kết quả đo độ ổn định cho ${cvFile} ↔ ${jdId}`);
    }
    return item;
  });

  const report = buildEvalReport({
    generatedAt: new Date().toISOString(),
    models: cache.models,
    referenceDate: FIXTURE_REFERENCE_DATE.toISOString().slice(0, 10),
    pairs,
    stabilityCases,
  });

  writeFileSync(RESULTS_JSON_PATH, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
  writeFileSync(RESULTS_MD_PATH, renderResultsMarkdown(report), 'utf8');

  console.log('\n════════════════════════════════════════════════════════');
  console.log(
    `✓ Đã xuất ${path.relative(process.cwd(), RESULTS_MD_PATH)} và ${path.relative(process.cwd(), RESULTS_JSON_PATH)}`,
  );
  console.log(`  Ngưỡng tốt nhất trên Dev : ${report.selectedThreshold}`);
  console.log(
    `  Test Accuracy / F1 / MAE : ${(report.testOverall.accuracy * 100).toFixed(1)}% / ${(report.testOverall.f1 * 100).toFixed(1)}% / ${report.testOverall.mae.toFixed(2)}`,
  );
  console.log(
    `  Độ ổn định (5 CV × 3)    : lệch tối đa ±${report.stability.overallMaxDiff} (${report.stability.allWithinTarget ? 'ĐẠT' : 'VƯỢT'})`,
  );
  console.log(
    `  Trung bình mỗi CV        : ${report.performance.avgTotalMs} ms | ${report.performance.avgTotalTokens} tokens`,
  );
  console.log('════════════════════════════════════════════════════════\n');
}

async function main(): Promise<void> {
  const args = new Set(process.argv.slice(2));
  const reportOnly = args.has('--report-only');
  const reset = args.has('--reset') || process.env.EVAL_RESET === '1';
  const delayMs = Number(process.env.EVAL_DELAY_MS ?? process.env.TRY_DELAY_MS ?? 2500);

  const labels = parseLabelsCsv(readFileSync(path.join(FIXTURES_DIR, 'labels.csv'), 'utf8'));

  if (reportOnly) {
    if (!existsSync(CACHE_PATH)) {
      throw new Error(`Không tìm thấy file cache ${CACHE_PATH} để chạy --report-only`);
    }
    const cache = JSON.parse(readFileSync(CACHE_PATH, 'utf8')) as EvalCache;
    writeOutputs(labels, cache);
    return;
  }

  const requiredEnv = ['GEMINI_API_KEY', 'GEMINI_MODEL_TEXT', 'GEMINI_MODEL_EMBEDDING'] as const;
  const missing = requiredEnv.filter((name) => !process.env[name]?.trim());
  if (missing.length > 0) {
    console.error(`Thiếu biến môi trường: ${missing.join(', ')}`);
    console.error(
      'Copy packages/ai/.env.example thành packages/ai/.env và điền đủ giá trị (vd. gemini-3.5-flash-lite, gemini-embedding-001).',
    );
    process.exit(1);
  }

  const models = {
    text: process.env.GEMINI_MODEL_TEXT!.trim(),
    embedding: process.env.GEMINI_MODEL_EMBEDDING!.trim(),
  };

  const collector = createTokenCollector();
  const ai = createAiClient({
    apiKey: process.env.GEMINI_API_KEY!.trim(),
    models: {
      text: models.text,
      embedding: models.embedding,
      audio: process.env.GEMINI_MODEL_AUDIO?.trim() || 'not-used-by-eval',
    },
    maxRetries: 5,
    logger: collector.logger,
  });

  const cache = loadCache(models, reset);
  const cvTextCache = new Map<string, string>();
  const uniqueJds = [...new Set(labels.map((row) => row.jdId))];

  console.log(
    `Bắt đầu đánh giá ${labels.length} cặp CV–JD + độ ổn định (${STABILITY_TARGETS.length} CV × ${STABILITY_RUNS} lần)`,
  );
  console.log(`Model: text=${models.text}, embedding=${models.embedding}, delay=${delayMs}ms`);

  // 1. Parse + embed 3 JD một lần (bỏ qua nếu đã có trong cache)
  for (const jdId of uniqueJds) {
    if (cache.jds[jdId]) {
      console.log(`  [cache] JD ${jdId}`);
      continue;
    }
    const jd = readFixtureJd(jdId);
    console.log(`  [run]   Phân tích & embedding JD ${jdId}...`);
    const parsedJd = await runWithOuterRetry(`JD ${jdId}`, () =>
      parseJd(ai, {
        title: jd.title,
        description: descriptionOf(jd),
        requiredSkills: jd.requiredSkills,
        preferredSkills: jd.preferredSkills,
        minYearsExperience: jd.minYearsExperience,
        level: jd.level,
      }),
    );
    const jdEmbedding = await runWithOuterRetry(`embed ${jdId}`, () => embedJd(ai, parsedJd));
    cache.jds[jdId] = {
      parsedJd,
      jdEmbedding,
      evaluatedAt: new Date().toISOString(),
    };
    saveCache(cache);
    await sleep(delayMs);
  }

  // 2. Chạy tuần tự 40 cặp CV–JD trong labels.csv
  for (const [index, row] of labels.entries()) {
    const key = pairKey(row.cvFile, row.jdId);
    if (cache.pairs[key]) {
      console.log(
        `  [${String(index + 1).padStart(2, '0')}/${labels.length}] [cache] ${row.cvFile} ↔ ${row.jdId} → ${cache.pairs[key]!.aiScore}`,
      );
      continue;
    }

    const jdData = cache.jds[row.jdId]!;
    const cvText = await extractCvTextCached(row.cvFile, cvTextCache);
    collector.reset();

    try {
      const output = await runWithOuterRetry(`${row.cvFile} ↔ ${row.jdId}`, () => {
        collector.reset();
        return screenCv(
          ai,
          { cvText, parsedJd: jdData.parsedJd, jdEmbedding: jdData.jdEmbedding },
          { referenceDate: FIXTURE_REFERENCE_DATE, logger: quietLogger },
        );
      });

      const record: PairEvalRecord = {
        key,
        cvFile: row.cvFile,
        jdId: row.jdId,
        split: row.split,
        label: row.label,
        confidence: row.confidence,
        expectedScore: row.expectedScore,
        labelReason: row.reason,
        expectedMissingSkills: row.missingSkills,
        aiScore: output.total,
        breakdown: output.breakdown,
        explanation: output.explanation,
        timings: output.timings,
        tokens: collector.snapshot(),
        evaluatedAt: new Date().toISOString(),
      };

      cache.pairs[key] = record;
      saveCache(cache);

      console.log(
        `  [${String(index + 1).padStart(2, '0')}/${labels.length}] [run]   ${row.cvFile} ↔ ${row.jdId} (${row.split}) → ${output.total} (nhãn: ${row.label}, kỳ vọng: ${row.expectedScore}, ${output.timings.totalMs}ms, ${record.tokens.totalTokens} tok)`,
      );
    } catch (error) {
      if (error instanceof ScreeningStepError && isAiError(error.cause)) {
        console.error(
          `✗ Lỗi tại ${row.cvFile} ↔ ${row.jdId} (${error.step}): ${error.cause.code} status=${error.cause.status ?? 'n/a'}`,
        );
      }
      throw error;
    }

    await sleep(delayMs);
  }

  // 3. Đo độ ổn định: 5 CV × 3 lần chạy (tái sử dụng lần 1 từ cache.pairs nếu muốn, hoặc chạy độc lập đủ 3 lần)
  console.log(`\n── Đo độ ổn định (${STABILITY_TARGETS.length} CV × ${STABILITY_RUNS} lần):`);
  for (const target of STABILITY_TARGETS) {
    const key = pairKey(target.cvFile, target.jdId);
    const existing = cache.stability[key] ?? {
      cvFile: target.cvFile,
      jdId: target.jdId,
      runs: [],
    };

    // Lần 1 có thể lấy luôn từ kết quả đánh giá chính để tiết kiệm quota, chạy thêm lần 2 & 3
    if (existing.runs.length === 0 && cache.pairs[key]) {
      const base = cache.pairs[key]!;
      existing.runs.push({
        run: 1,
        total: base.aiScore,
        timings: base.timings,
        tokens: base.tokens,
      });
      cache.stability[key] = existing;
      saveCache(cache);
    }

    const jdData = cache.jds[target.jdId]!;
    const cvText = await extractCvTextCached(target.cvFile, cvTextCache);

    for (let run = existing.runs.length + 1; run <= STABILITY_RUNS; run++) {
      const output = await runWithOuterRetry(`stability ${target.cvFile} #${run}`, () => {
        collector.reset();
        return screenCv(
          ai,
          { cvText, parsedJd: jdData.parsedJd, jdEmbedding: jdData.jdEmbedding },
          { referenceDate: FIXTURE_REFERENCE_DATE, logger: quietLogger },
        );
      });

      existing.runs.push({
        run,
        total: output.total,
        timings: output.timings,
        tokens: collector.snapshot(),
      });
      cache.stability[key] = existing;
      saveCache(cache);

      console.log(
        `  [stability] ${target.cvFile} ↔ ${target.jdId} lần ${run}/${STABILITY_RUNS} → ${output.total} (${output.timings.totalMs}ms)`,
      );
      await sleep(delayMs);
    }

    const scores = existing.runs.map((r) => r.total);
    console.log(
      `  ✓ ${target.cvFile} ↔ ${target.jdId}: [${scores.join(', ')}] (lệch ${Math.max(...scores) - Math.min(...scores)})`,
    );
  }

  writeOutputs(labels, cache);
}

await main();
