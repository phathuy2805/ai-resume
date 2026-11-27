// Chạy thử @hireflow/ai với Gemini thật.
//
//   npm run try -w packages/ai                 # chạy tất cả demo
//   npm run try -w packages/ai -- text         # chỉ generateText
//   npm run try -w packages/ai -- structured   # chỉ generateStructured
//   npm run try -w packages/ai -- jd           # parseJd trên 3 JD của fixtures (W1-AI-05)
//   npm run try -w packages/ai -- cv           # extractCvText trên 30 CV + 2 scan (W1-AI-03)
//   npm run try -w packages/ai -- cv cv_mkt_03.pdf   # như trên, in nội dung CV chỉ định để xem bằng mắt
//   npm run try -w packages/ai -- parse-cv     # parseCv trên 11 CV tập dev, in JSON để chỉnh prompt (W1-AI-04)
//   npm run try -w packages/ai -- parse-cv all # parseCv trên cả 30 CV, chỉ in kết quả kiểm tra
//   npm run try -w packages/ai -- parse-cv cv_be_06.pdf   # một CV của fixtures, in JSON
//   npm run try -w packages/ai -- parse-cv ./my-cvs [--jd be]   # CV tự thêm (.pdf/.txt, file hoặc thư mục)
//   npm run try -w packages/ai -- embed quick  # kiểm tra nhanh model embedding (3 lần gọi) (W2-AI-01)
//   npm run try -w packages/ai -- embed        # embedding 3 JD + 11 CV tập dev, in khoảng cosine
//   npm run try -w packages/ai -- embed all    # như trên với cả 30 CV
//   npm run try -w packages/ai -- score        # scoreCv trên các cặp CV ↔ JD tập dev của labels.csv (W2-AI-02)
//   npm run try -w packages/ai -- score all    # như trên với cả 40 cặp
//   npm run try -w packages/ai -- score repeat cv_be_06.pdf [3] [--full]   # chấm lại 3 lần, kiểm tra ±5
//   npm run try -w packages/ai -- screen       # screenCv trên 3 cặp dev: phù hợp / borderline / khác ngành (W2-AI-03)
//   npm run try -w packages/ai -- screen dev   # như trên với cả 13 cặp tập dev
//   npm run try -w packages/ai -- screen cv_be_06.pdf [...]   # CV chỉ định, ghép JD theo labels.csv
//   npm run try -w packages/ai -- questions    # generateQuestionPlan trên 3 cặp dev (5 / 4 / 3 câu) (W3-AI-01)
//   npm run try -w packages/ai -- questions cv_be_06.pdf [...]   # CV chỉ định, ghép JD theo labels.csv
//
// Chỉ chỉnh prompt dựa trên tập dev. "parse-cv all" chỉ dùng để xác nhận sau khi đã chốt prompt.
// Nghỉ giữa các lần gọi Gemini: TRY_DELAY_MS (mặc định 2000) để không vượt quota.
//
// Biến môi trường đọc từ packages/ai/.env (copy từ .env.example) hoặc từ terminal ($env:...).
// Biến đặt trong terminal được ưu tiên hơn file .env.
// Package không tự đọc process.env: chỉ script này đọc rồi truyền vào createAiClient.
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import path from 'node:path';
import { z } from 'zod';
import {
  buildCvEmbeddingText,
  buildJdEmbeddingText,
  cosineSimilarity,
  createAiClient,
  EMBEDDING_DIMENSIONS,
  EMBEDDING_TASK_TYPE,
  embedCv,
  embedJd,
  embedText,
  extractCvText,
  generateQuestionPlan,
  scoreCv,
  screenCv,
  ScreeningStepError,
  isAiError,
  isCvExtractionError,
  normalizeSkills,
  parseCv,
  ParsedCvSchema,
  parseJd,
  ParsedJdSchema,
} from '../dist/index.mjs';

const REQUIRED_ENV = ['GEMINI_API_KEY', 'GEMINI_MODEL_TEXT'];
const missing = REQUIRED_ENV.filter((name) => !process.env[name]?.trim());
if (missing.length > 0) {
  console.error(`Thiếu biến môi trường: ${missing.join(', ')}`);
  console.error('Copy packages/ai/.env.example thành packages/ai/.env rồi điền giá trị.');
  process.exit(1);
}

const ai = createAiClient({
  apiKey: process.env.GEMINI_API_KEY,
  models: {
    text: process.env.GEMINI_MODEL_TEXT,
    // Chỉ demo embed cần model embedding (embedDemo tự báo nếu thiếu); script chưa gọi audio.
    // Giá trị tạm chỉ để qua bước kiểm tra cấu hình.
    embedding: process.env.GEMINI_MODEL_EMBEDDING || 'not-set',
    audio: process.env.GEMINI_MODEL_AUDIO || 'not-used-by-try',
  },
});

const JdRequirementsSchema = z.object({
  title: z.string(),
  requiredSkills: z.array(z.string()),
  niceToHaveSkills: z.array(z.string()).default([]),
  minYearsOfExperience: z.number().int().min(0),
});

// JD giả, không chứa dữ liệu thật.
const SAMPLE_JD = `Công ty ABC tuyển Backend Developer (NestJS).
Yêu cầu: tối thiểu 2 năm kinh nghiệm Node.js/NestJS, thành thạo PostgreSQL, có kinh nghiệm Docker.
Ưu tiên: biết AWS, Redis, đã từng viết unit test.`;

// ── Demo jd: parseJd trên 3 JD của W1-AI-01 ─────────────────────────────
const JD_DIR = path.resolve(import.meta.dirname, '../fixtures/jds');
const EXPECTED_LEVEL = { be: 'senior', da: 'middle', mkt: 'middle' };

function readFixtureJd(name) {
  return JSON.parse(readFileSync(path.join(JD_DIR, `jd_${name}.json`), 'utf8'));
}

/** Mô tả như HR dán vào form: phần mô tả + các ý trách nhiệm. */
function descriptionOf(jd) {
  return `${jd.description}\nTrách nhiệm:\n${jd.responsibilities.map((r) => `- ${r}`).join('\n')}`;
}

let failedChecks = 0;
function check(ok, label, detail = '') {
  if (!ok) failedChecks++;
  console.log(`   ${ok ? '✓' : '✗'} ${label}${detail ? `: ${detail}` : ''}`);
}
const includesAll = (list, items) => items.every((item) => list.includes(item));

async function jdDemo() {
  for (const name of ['be', 'da', 'mkt']) {
    const jd = readFixtureJd(name);
    console.log(`\n── ${jd.code}: ${jd.title}`);

    // (A) Như form thật: HR nhập đủ kỹ năng, số năm, cấp độ → kiểm tra quy tắc gộp.
    const parsed = await parseJd(ai, {
      title: jd.title,
      description: descriptionOf(jd),
      requiredSkills: jd.requiredSkills,
      preferredSkills: jd.preferredSkills,
      minYearsExperience: jd.minYearsExperience,
      level: jd.level,
    });
    console.dir(parsed, { depth: null });
    check(ParsedJdSchema.safeParse(parsed).success, 'hợp lệ theo ParsedJdSchema');
    check(
      includesAll(parsed.requiredSkills, jd.requiredSkills) &&
        jd.requiredSkills.every((s, i) => parsed.requiredSkills[i] === s),
      'giữ đủ kỹ năng bắt buộc của HR, đứng đầu',
    );
    check(includesAll(parsed.preferredSkills, jd.preferredSkills), 'giữ đủ kỹ năng ưu tiên của HR');
    check(
      parsed.minYearsExperience === jd.minYearsExperience,
      'số năm = giá trị HR',
      String(parsed.minYearsExperience),
    );
    check(
      parsed.level === EXPECTED_LEVEL[name],
      `cấp độ "${jd.level}" → ${EXPECTED_LEVEL[name]}`,
      String(parsed.level),
    );
    check(
      parsed.responsibilities.length <= 8,
      'trách nhiệm ≤ 8 ý',
      String(parsed.responsibilities.length),
    );

    // (B) Chỉ có văn bản (HR không nhập gì): đo AI tự trích được bao nhiêu. Chỉ để tham khảo.
    const textOnly = await parseJd(ai, { title: jd.title, description: descriptionOf(jd) });
    const found = normalizeSkills(jd.requiredSkills).filter((s) =>
      textOnly.requiredSkills.includes(s),
    );
    const missed = jd.requiredSkills.filter((s) => !found.includes(s));
    console.log(
      `   ℹ chỉ từ văn bản: AI tìm được ${found.length}/${jd.requiredSkills.length} kỹ năng bắt buộc` +
        (missed.length ? ` (thiếu: ${missed.join(', ')})` : '') +
        ` | cấp độ: ${textOnly.level} | số năm: ${textOnly.minYearsExperience}` +
        ` | domain: ${textOnly.domain}`,
    );
  }
  console.log(
    `\n${failedChecks === 0 ? '✓ Tất cả kiểm tra đạt' : `✗ ${failedChecks} kiểm tra không đạt`}`,
  );
  if (failedChecks > 0) process.exitCode = 1;
}

// ── Demo cv: extractCvText trên 30 CV + 2 scan của W1-AI-01 ─────────────
const CV_DIR = path.resolve(import.meta.dirname, '../fixtures/cvs');
const quietLogger = { log() {}, warn() {}, error() {} };

async function cvDemo() {
  const readCv = (file) => new Uint8Array(readFileSync(path.join(CV_DIR, file)));
  const cvFiles = ['be', 'da', 'mkt'].flatMap((role) =>
    Array.from({ length: 10 }, (_, i) => `cv_${role}_${String(i + 1).padStart(2, '0')}.pdf`),
  );
  const scanFiles = ['scans/cv_scan_01.pdf', 'scans/cv_scan_02.pdf'];
  let failed = 0;

  // (1) Không bật Gemini: 30 CV phải đọc được, 2 scan phải bị từ chối SCANNED.
  console.log('\n── (1) unpdf, không bật Gemini');
  for (const file of [...cvFiles, ...scanFiles]) {
    const expectScan = file.startsWith('scans/');
    try {
      const r = await extractCvText(readCv(file), { logger: quietLogger });
      const ok = !expectScan;
      if (!ok) failed++;
      console.log(
        `   ${ok ? '✓' : '✗'} ${file.padEnd(22)} ${r.pageCount} trang, ${String(r.charCount).padStart(5)} ký tự, truncated=${r.truncated}`,
      );
    } catch (error) {
      if (!isCvExtractionError(error)) throw error;
      const ok = expectScan && error.code === 'SCANNED';
      if (!ok) failed++;
      console.log(`   ${ok ? '✓' : '✗'} ${file.padEnd(22)} bị từ chối: ${error.code}`);
    }
  }

  // (2) Xem bằng mắt: mặc định CV 2 cột tiếng Việt (khó nhất: thứ tự cột + dấu).
  const visualFile = process.argv[3] ?? 'cv_be_06.pdf';
  const visual = await extractCvText(readCv(visualFile), { logger: quietLogger });
  console.log(`\n── (2) Nội dung ${visualFile} (kiểm tra thứ tự chữ và dấu tiếng Việt)`);
  console.log(
    visual.text
      .split('\n')
      .map((line) => `   │ ${line}`)
      .join('\n'),
  );

  // (3) Bật Gemini đọc dự phòng cho 2 file scan.
  console.log('\n── (3) Bật Gemini đọc dự phòng (ocrFallback) cho 2 file scan');
  for (const file of scanFiles) {
    try {
      const r = await extractCvText(readCv(file), { ocrFallback: { ai } });
      const ok = r.source === 'ai-ocr';
      if (!ok) failed++;
      console.log(`   ${ok ? '✓' : '✗'} ${file}: nguồn ${r.source}, ${r.charCount} ký tự`);
      console.log(
        r.text
          .split('\n')
          .map((line) => `     │ ${line}`)
          .join('\n'),
      );
    } catch (error) {
      if (!isCvExtractionError(error)) throw error;
      failed++;
      const cause =
        error.cause instanceof Error ? ` (cause: ${error.cause.message.slice(0, 120)})` : '';
      console.log(`   ✗ ${file}: vẫn bị từ chối ${error.code}${cause}`);
    }
  }

  console.log(`\n${failed === 0 ? '✓ Tất cả kiểm tra đạt' : `✗ ${failed} kiểm tra không đạt`}`);
  if (failed > 0) process.exitCode = 1;
}

// ── Demo parse-cv: parseCv trên CV của W1-AI-01 (W1-AI-04) ──────────────
// Ngày đánh giá cố định của fixtures (fixtures/README.md): "Hiện tại" tính đến 01/11/2026.
const FIXTURE_REFERENCE_DATE = new Date('2026-11-01');
const FIXTURES_DIR = path.resolve(import.meta.dirname, '../fixtures');

/** Tách một dòng CSV (hỗ trợ ô trong ngoặc kép có dấu phẩy). */
function parseCsvLine(line) {
  const cells = [];
  let cell = '';
  let quoted = false;
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (quoted && char === '"' && line[i + 1] === '"') {
      cell += '"';
      i++;
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

/** Các dòng của labels.csv dạng object theo tên cột. */
function readLabels() {
  const [header, ...rows] = readFileSync(path.join(FIXTURES_DIR, 'labels.csv'), 'utf8')
    .trim()
    .split(/\r?\n/)
    .map(parseCsvLine);
  return rows.map((cells) => Object.fromEntries(header.map((name, i) => [name, cells[i] ?? ''])));
}

/**
 * Đáp án của từng CV lấy thẳng từ dữ liệu gốc trong generate-fixtures.mjs
 * (họ tên, liên hệ, mốc thời gian, kỹ năng), để không phải chép tay.
 * Chỉ đọc mảng cvList, không chạy phần sinh PDF của script.
 */
function readFixtureTruth() {
  const source = readFileSync(path.resolve(import.meta.dirname, 'generate-fixtures.mjs'), 'utf8');
  const start = source.indexOf('const cvList = [');
  const end = source.indexOf('\n];', start);
  if (start < 0 || end < 0) throw new Error('Không tìm thấy cvList trong generate-fixtures.mjs');
  const cvList = new Function(`${source.slice(start, end + 3)}\nreturn cvList;`)();
  return new Map(cvList.map((cv) => [cv.fileName, cv]));
}

/** Số năm kỳ vọng, tính theo quy tắc của README từ các mốc "MM/YYYY - MM/YYYY | Present". */
function expectedYears(cv) {
  const toYm = (s) => {
    const m = /(\d{1,2})\/(\d{4})/.exec(s ?? '');
    return m ? `${m[2]}-${m[1].padStart(2, '0')}` : null;
  };
  const months = (cv.experience ?? []).map(({ period }) => {
    const [from, to] = period.split(/\s+-\s+/);
    const start = toYm(from);
    const [sy, sm] = start.split('-').map(Number);
    const end = /present|hiện tại/i.test(to) ? null : toYm(to);
    const [ey, em] = end ? end.split('-').map(Number) : [2026, 10];
    return [sy * 12 + sm - 1, ey * 12 + em];
  });
  // Fixtures không có khoảng chồng nhau, chỉ cộng và kiểm tra lại bằng tay.
  const total = months.reduce((sum, [a, b]) => sum + (b - a), 0);
  return Math.round((total / 12) * 10) / 10;
}

/** Các mẩu thông tin cá nhân của CV không được xuất hiện trong ParsedCv. */
function personalDataOf(cv) {
  const { email, phone, location, github, linkedin } = cv.contact ?? {};
  return [cv.fullName, email, phone, location, github, linkedin].filter(Boolean);
}

const PII_PATTERNS = [/@/, /example\.com/i, /\b0900 000\b/, /\+84 900/];
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

// Thông tin cá nhân dạng chung (cho CV tự thêm, không có đáp án): email, SĐT Việt Nam, link hồ sơ.
const GENERIC_PII_PATTERNS = [
  [/[\w.+-]+@[\w-]+\.[\w.]+/, 'email'],
  [/(?:\+84|\b0)[\s.-]?\d{2,3}[\s.-]?\d{3}[\s.-]?\d{3,4}\b/, 'số điện thoại'],
  [/(?:linkedin|github|facebook|fb)\.com\//i, 'link hồ sơ'],
];

/** Lấy danh sách file CV từ các đường dẫn (file .pdf/.txt hoặc thư mục chứa chúng). */
function collectOwnCvFiles(inputs) {
  // npm run -w chạy script trong packages/ai; INIT_CWD là thư mục bạn gõ lệnh.
  const baseDir = process.env.INIT_CWD ?? process.cwd();
  return inputs.flatMap((input) => {
    const resolved = path.resolve(baseDir, input);
    if (!existsSync(resolved)) {
      // "D:my-cvsfile.pdf": Git Bash đã xóa mất dấu \ trong "D:\my-cvs\file.pdf".
      const hint = /^[a-z]:[^\\/]/i.test(input)
        ? '\nCó vẻ dấu \\ trong đường dẫn đã bị terminal (Git Bash) xóa mất.' +
          ' Dùng dấu / (vd. D:/my-cvs/cv.pdf) hoặc đặt đường dẫn trong nháy đơn.'
        : '';
      throw new Error(`Không tìm thấy file hoặc thư mục: ${resolved}${hint}`);
    }
    if (!statSync(resolved).isDirectory()) return [resolved];
    return readdirSync(resolved)
      .filter((name) => /\.(pdf|txt)$/i.test(name))
      .sort()
      .map((name) => path.join(resolved, name));
  });
}

/**
 * parseCv trên CV tự thêm (không có trong fixtures): in JSON + kiểm tra chung.
 * Không có đáp án nên không kiểm tra số năm / số công việc; họ tên cần xem bằng mắt.
 *   npm run try -w packages/ai -- parse-cv ./my-cvs/cv_a.pdf [./cv_b.txt ...] [--jd be|da|mkt]
 */
async function parseOwnCvDemo(inputs, jdName) {
  const files = collectOwnCvFiles(inputs);
  if (files.length === 0) throw new Error('Không có file .pdf hoặc .txt nào');
  const jd = jdName ? readFixtureJd(jdName) : null;
  const delayMs = Number(process.env.TRY_DELAY_MS ?? 2000);
  const today = new Date();
  console.log(
    `\n── parseCv trên ${files.length} CV tự thêm, ngày tham chiếu ${today.toISOString().slice(0, 10)} (hôm nay)` +
      (jd ? `, so với ${jd.code}` : ''),
  );

  let failed = 0;
  for (const [i, file] of files.entries()) {
    if (i > 0) await sleep(delayMs);
    console.log(`\n${file}`);

    let text;
    if (/\.txt$/i.test(file)) {
      text = readFileSync(file, 'utf8');
    } else {
      try {
        const result = await extractCvText(new Uint8Array(readFileSync(file)), {
          ocrFallback: { ai },
          logger: quietLogger,
        });
        text = result.text;
        console.log(
          `   ℹ trích chữ: ${result.pageCount} trang, ${result.charCount} ký tự, nguồn ${result.source}`,
        );
      } catch (error) {
        if (!isCvExtractionError(error)) throw error;
        failed++;
        console.log(`   ✗ không đọc được PDF: ${error.code} (${error.messageVi})`);
        continue;
      }
    }

    const startedAt = performance.now();
    const parsed = await parseCv(ai, text);
    console.log(`   ℹ parseCv: ${Math.round(performance.now() - startedAt)}ms`);
    console.dir(parsed, { depth: null });

    const schemaOk = ParsedCvSchema.safeParse(parsed).success;
    const json = JSON.stringify(parsed);
    const leaked = GENERIC_PII_PATTERNS.filter(([pattern]) => pattern.test(json)).map(
      ([, name]) => name,
    );
    console.log(`   ${schemaOk ? '✓' : '✗'} hợp lệ theo ParsedCvSchema`);
    console.log(
      `   ${leaked.length === 0 ? '✓' : '✗'} không chứa email, SĐT, link hồ sơ${leaked.length ? `: ${leaked.join(', ')}` : ''}`,
    );
    console.log('   ℹ họ tên, địa chỉ, số năm kinh nghiệm: tự so với file CV bằng mắt');
    if (jd) {
      const notFound = jd.requiredSkills.filter((skill) => !parsed.skills.includes(skill));
      console.log(
        `   ℹ ${jd.code} bắt buộc không thấy trong CV: ${notFound.join(', ') || '(không)'}`,
      );
    }
    if (!schemaOk || leaked.length > 0) failed++;
  }

  console.log(
    `\n${failed === 0 ? '✓ Tất cả CV đạt' : `✗ ${failed}/${files.length} CV có kiểm tra không đạt`}`,
  );
  if (failed > 0) process.exitCode = 1;
}

async function parseCvDemo() {
  const args = process.argv.slice(3);
  const jdFlag = args.indexOf('--jd');
  const jdName = jdFlag >= 0 ? args[jdFlag + 1] : undefined;
  if (jdName !== undefined && !['be', 'da', 'mkt'].includes(jdName)) {
    throw new Error('--jd chỉ nhận be, da hoặc mkt');
  }
  const positional = args.filter((_, i) => jdFlag < 0 || (i !== jdFlag && i !== jdFlag + 1));

  const mode = positional[0] ?? 'dev';
  const labels = readLabels();
  // Mọi cặp của cùng một CV nằm cùng split (fixtures/README.md).
  const splits = new Map(labels.map((row) => [row.cv_file, row.split]));
  const truth = readFixtureTruth();
  if (mode !== 'all' && mode !== 'dev' && !truth.has(mode)) {
    return parseOwnCvDemo(positional, jdName);
  }
  const allFiles = [...truth.keys()];
  const files =
    mode === 'all'
      ? allFiles
      : mode === 'dev'
        ? allFiles.filter((file) => splits.get(file) === 'dev')
        : [mode];
  const printJson = mode !== 'all';
  const delayMs = Number(process.env.TRY_DELAY_MS ?? 2000);
  const readCv = (file) => new Uint8Array(readFileSync(path.join(FIXTURES_DIR, 'cvs', file)));

  console.log(
    `\n── parseCv trên ${files.length} CV (${mode}), ngày tham chiếu ${FIXTURE_REFERENCE_DATE.toISOString().slice(0, 10)}`,
  );
  let failed = 0;
  const durations = [];
  const skillRecall = [];

  for (const [i, file] of files.entries()) {
    const cv = truth.get(file);
    if (!cv) throw new Error(`Không có CV ${file} trong fixtures`);
    if (i > 0) await sleep(delayMs);

    const { text } = await extractCvText(readCv(file), { logger: quietLogger });
    const startedAt = performance.now();
    const parsed = await parseCv(ai, text, { referenceDate: FIXTURE_REFERENCE_DATE });
    const durationMs = Math.round(performance.now() - startedAt);
    durations.push(durationMs);

    console.log(
      `\n${file} [${splits.get(file) ?? '?'} | ${cv.layout} | ${cv.language}] ${durationMs}ms`,
    );
    if (printJson) console.dir(parsed, { depth: null });

    const checks = [];
    const check = (ok, label, detail = '') => {
      checks.push(ok);
      console.log(`   ${ok ? '✓' : '✗'} ${label}${detail ? `: ${detail}` : ''}`);
    };

    check(ParsedCvSchema.safeParse(parsed).success, 'hợp lệ theo ParsedCvSchema');

    const json = JSON.stringify(parsed).toLowerCase();
    const leaked = [
      ...personalDataOf(cv).filter((value) => json.includes(value.toLowerCase())),
      ...PII_PATTERNS.filter((pattern) => pattern.test(json)).map(String),
    ];
    check(leaked.length === 0, 'không chứa họ tên, email, SĐT, địa chỉ, link', leaked.join(', '));

    const expected = expectedYears(cv);
    check(
      parsed.totalYearsExperience === expected,
      'số năm kinh nghiệm',
      `${parsed.totalYearsExperience} (kỳ vọng ${expected})`,
    );
    check(
      parsed.experiences.length === (cv.experience ?? []).length,
      'số công việc',
      `${parsed.experiences.length} (kỳ vọng ${(cv.experience ?? []).length})`,
    );

    // Tham khảo: kỹ năng ghi trong mục Skills của CV có được trích ra không (sau chuẩn hóa).
    const listed = normalizeSkills(cv.skills ?? []);
    const missed = listed.filter((skill) => !parsed.skills.includes(skill));
    skillRecall.push(listed.length ? (listed.length - missed.length) / listed.length : 1);
    console.log(
      `   ℹ kỹ năng mục Skills: trích được ${listed.length - missed.length}/${listed.length}` +
        (missed.length ? ` (thiếu: ${missed.join(', ')})` : '') +
        ` | tổng skills: ${parsed.skills.length}`,
    );

    // Tham khảo: tên kỹ năng CV có khớp tên trong JD mục tiêu không (cùng bảng alias).
    // So với cột missing_skills do người gán nhãn; khác nhau chưa chắc là lỗi parse.
    const jd = readFixtureJd(cv.jdId.replace('JD_', '').toLowerCase());
    const notFound = jd.requiredSkills.filter((skill) => !parsed.skills.includes(skill));
    const label = labels.find((row) => row.cv_file === file && row.jd_id === cv.jdId);
    const labelMissing = (label?.missing_skills ?? '').split(';').filter(Boolean);
    const same =
      notFound.length === labelMissing.length && notFound.every((s) => labelMissing.includes(s));
    console.log(
      `   ℹ ${cv.jdId} bắt buộc không thấy trong CV: ${notFound.join(', ') || '(không)'}` +
        ` | labels.csv ghi thiếu: ${labelMissing.join(', ') || '(không)'}` +
        ` → ${same ? 'khớp nhãn' : 'KHÁC nhãn'}`,
    );

    if (checks.some((ok) => !ok)) failed++;
  }

  const average = (values) => values.reduce((a, b) => a + b, 0) / (values.length || 1);
  console.log(
    `\nThời gian parseCv trung bình: ${Math.round(average(durations))}ms/CV` +
      ` (min ${Math.min(...durations)}, max ${Math.max(...durations)})` +
      ` | kỹ năng mục Skills trích được trung bình: ${Math.round(average(skillRecall) * 100)}%`,
  );
  console.log(
    failed === 0 ? '✓ Tất cả CV đạt' : `✗ ${failed}/${files.length} CV có kiểm tra không đạt`,
  );
  if (failed > 0) process.exitCode = 1;
}

// ── Demo embed: embedding CV / JD + cosine (W2-AI-01) ──────────────────
const JD_NAMES = ['be', 'da', 'mkt'];
const jdNameOf = (jdId) => jdId.replace('JD_', '').toLowerCase();
const average = (values) => values.reduce((a, b) => a + b, 0) / (values.length || 1);
const f3 = (value) => value.toFixed(3);

/** min / trung bình / max của một nhóm cosine, dạng "0.612 / 0.701 / 0.788 (n=8)". */
function describeGroup(values) {
  if (values.length === 0) return '(không có)';
  return `${f3(Math.min(...values))} / ${f3(average(values))} / ${f3(Math.max(...values))} (n=${values.length})`;
}

/** Kiểm tra nhanh model embedding: 3 câu, 3 lần gọi. */
async function embedQuickDemo() {
  const texts = {
    backend: 'Kỹ năng: NodeJS, NestJS, PostgreSQL, Docker\nCông việc: xây dựng REST API',
    backend2: 'Kỹ năng: TypeScript, Express, MySQL, Redis\nCông việc: phát triển API cho hệ thống',
    marketing: 'Kỹ năng: Google Ads, SEO, Content Marketing\nCông việc: chạy chiến dịch quảng cáo',
  };
  const vectors = {};
  for (const [name, text] of Object.entries(texts)) {
    vectors[name] = await embedText(ai, text);
  }
  const v = vectors.backend;
  check(
    v.length === EMBEDDING_DIMENSIONS,
    `vector đủ ${EMBEDDING_DIMENSIONS} chiều`,
    String(v.length),
  );
  check(Math.abs(Math.hypot(...v) - 1) < 1e-6, 'vector có độ dài 1', f3(Math.hypot(...v)));
  const near = cosineSimilarity(vectors.backend, vectors.backend2);
  const far = cosineSimilarity(vectors.backend, vectors.marketing);
  console.log(`   backend ↔ backend2: ${f3(near)} | backend ↔ marketing: ${f3(far)}`);
  check(near > far, 'hai text backend giống nhau hơn backend ↔ marketing');
}

async function embedDemo() {
  if (!process.env.GEMINI_MODEL_EMBEDDING?.trim()) {
    console.error(
      '✗ Thiếu GEMINI_MODEL_EMBEDDING (vd. gemini-embedding-001) trong packages/ai/.env',
    );
    process.exitCode = 1;
    return;
  }
  console.log(
    `── model embedding: ${ai.models.embedding}, taskType ${EMBEDDING_TASK_TYPE}, ${EMBEDDING_DIMENSIONS} chiều`,
  );

  const mode = process.argv[3] ?? 'dev';
  if (mode === 'quick') {
    await embedQuickDemo();
  } else if (mode === 'dev' || mode === 'all') {
    await embedFixturesDemo(mode);
  } else {
    throw new Error('embed chỉ nhận: quick, dev (mặc định), all');
  }
  console.log(
    `\n${failedChecks === 0 ? '✓ Tất cả kiểm tra đạt' : `✗ ${failedChecks} kiểm tra không đạt`}`,
  );
  if (failedChecks > 0) process.exitCode = 1;
}

/**
 * parseJd + embedJd cho 3 JD, parseCv + embedCv cho CV của fixtures, rồi tính cosine CV ↔ JD.
 * In khoảng cosine theo nhóm để W2-AI-02 quy đổi sang thang 0–100.
 */
async function embedFixturesDemo(mode) {
  const delayMs = Number(process.env.TRY_DELAY_MS ?? 2000);
  const labels = readLabels();
  const splits = new Map(labels.map((row) => [row.cv_file, row.split]));
  const truth = readFixtureTruth();
  const files = [...truth.keys()].filter((file) => mode === 'all' || splits.get(file) === 'dev');

  // 1. JD
  const jdVectors = {};
  for (const name of JD_NAMES) {
    const jd = readFixtureJd(name);
    const parsed = await parseJd(ai, {
      title: jd.title,
      description: descriptionOf(jd),
      requiredSkills: jd.requiredSkills,
      preferredSkills: jd.preferredSkills,
      minYearsExperience: jd.minYearsExperience,
      level: jd.level,
    });
    jdVectors[name] = await embedJd(ai, parsed);
    console.log(`\n${jd.code} — văn bản embedding:\n${buildJdEmbeddingText(parsed)}`);
    await sleep(delayMs);
  }

  // 2. CV
  console.log(`\n── ${files.length} CV (${mode}); cột: cosine với JD_BE / JD_DA / JD_MKT`);
  const rows = [];
  for (const [i, file] of files.entries()) {
    if (i > 0) await sleep(delayMs);
    const cv = truth.get(file);
    const bytes = new Uint8Array(readFileSync(path.join(FIXTURES_DIR, 'cvs', file)));
    const { text } = await extractCvText(bytes, { logger: quietLogger });
    const parsed = await parseCv(ai, text, { referenceDate: FIXTURE_REFERENCE_DATE });
    const vector = await embedCv(ai, parsed);

    const cosines = Object.fromEntries(
      JD_NAMES.map((name) => [name, cosineSimilarity(vector, jdVectors[name])]),
    );
    const target = jdNameOf(cv.jdId);
    rows.push({ file, category: cv.category, target, cosines });

    const best = JD_NAMES.reduce((a, b) => (cosines[a] >= cosines[b] ? a : b));
    console.log(
      `${file.padEnd(14)} ${cv.category.padEnd(10)} ` +
        JD_NAMES.map((name) =>
          name === target ? `[${f3(cosines[name])}]` : ` ${f3(cosines[name])} `,
        ).join(' ') +
        (best === target ? '' : `  ← gần ${best.toUpperCase()} hơn JD mục tiêu`),
    );
    if (i === 0)
      console.log(
        `   văn bản embedding (mẫu):\n${buildCvEmbeddingText(parsed).replace(/^/gm, '   │ ')}`,
      );
  }

  // 3. Khoảng cosine theo nhóm
  const targetOf = (category) =>
    rows.filter((row) => row.category === category).map((row) => row.cosines[row.target]);
  const crossDomain = rows.flatMap((row) =>
    JD_NAMES.filter((name) => name !== row.target).map((name) => row.cosines[name]),
  );
  console.log('\n── Khoảng cosine (min / trung bình / max):');
  console.log(`   QUALIFIED  ↔ JD mục tiêu : ${describeGroup(targetOf('QUALIFIED'))}`);
  console.log(`   BORDERLINE ↔ JD mục tiêu : ${describeGroup(targetOf('BORDERLINE'))}`);
  console.log(`   REJECTED   ↔ JD mục tiêu : ${describeGroup(targetOf('REJECTED'))}`);
  console.log(`   CV ↔ JD khác ngành       : ${describeGroup(crossDomain)}`);

  // Theo nhãn của labels.csv (cả cặp chéo)
  const byFile = new Map(rows.map((row) => [row.file, row]));
  const labeled = { 'phù hợp': [], 'không phù hợp': [] };
  for (const row of labels) {
    const result = byFile.get(row.cv_file);
    if (result && labeled[row.label]) labeled[row.label].push(result.cosines[jdNameOf(row.jd_id)]);
  }
  console.log(`   labels.csv "phù hợp"     : ${describeGroup(labeled['phù hợp'])}`);
  console.log(`   labels.csv "không phù hợp": ${describeGroup(labeled['không phù hợp'])}`);
  const all = rows.flatMap((row) => Object.values(row.cosines));
  console.log(`   Toàn bộ cặp CV ↔ JD      : ${describeGroup(all)}`);

  // 4. Kiểm tra theo card: CV phù hợp có cosine với JD mục tiêu cao hơn CV lệch ngành
  console.log('\n── Kiểm tra:');
  for (const name of JD_NAMES) {
    const qualified = rows
      .filter((row) => row.target === name && row.category === 'QUALIFIED')
      .map((row) => row.cosines[name]);
    const rejected = rows
      .filter((row) => row.target === name && row.category === 'REJECTED')
      .map((row) => row.cosines[name]);
    const otherDomain = rows.filter((row) => row.target !== name).map((row) => row.cosines[name]);
    if (qualified.length === 0) continue;
    check(
      average(qualified) > average(otherDomain),
      `JD_${name.toUpperCase()}: CV phù hợp > CV ngành khác (trung bình)`,
      `${f3(average(qualified))} vs ${f3(average(otherDomain))}`,
    );
    if (rejected.length > 0) {
      console.log(
        `   ℹ JD_${name.toUpperCase()}: CV phù hợp ${f3(average(qualified))} vs CV REJECTED nộp vào JD này ${f3(average(rejected))}` +
          ` | CV ngành khác ${f3(average(otherDomain))}` +
          ' (tham khảo: CV REJECTED của bộ dữ liệu phần lớn lệch ngành nên cosine gần mức CV ngành khác)',
      );
    }
  }
}

// ── Demo score: scoreCv trên fixtures (W2-AI-02) ───────────────────────

/** parseJd + embedJd cho một JD của fixtures. */
async function prepareFixtureJd(name) {
  const jd = readFixtureJd(name);
  const parsedJd = await parseJd(ai, {
    title: jd.title,
    description: descriptionOf(jd),
    requiredSkills: jd.requiredSkills,
    preferredSkills: jd.preferredSkills,
    minYearsExperience: jd.minYearsExperience,
    level: jd.level,
  });
  const jdEmbedding = await embedJd(ai, parsedJd);
  return { code: jd.code, threshold: jd.cvPassThreshold, parsedJd, jdEmbedding };
}

/** extractCvText + parseCv + embedCv cho một CV của fixtures. */
async function prepareFixtureCv(file) {
  const bytes = new Uint8Array(readFileSync(path.join(FIXTURES_DIR, 'cvs', file)));
  const { text } = await extractCvText(bytes, { logger: quietLogger });
  const parsedCv = await parseCv(ai, text, { referenceDate: FIXTURE_REFERENCE_DATE });
  const cvEmbedding = await embedCv(ai, parsedCv);
  return { parsedCv, cvEmbedding };
}

/** "R 83 P 50 Y 100 L 70 S 48" — điểm 5 thành phần, gọn trên một dòng. */
function describeBreakdown(b) {
  return (
    `R ${String(b.requiredSkills.score).padStart(3)} P ${String(b.preferredSkills.score).padStart(3)}` +
    ` Y ${String(b.experienceYears.score).padStart(3)} L ${String(b.relevance.score).padStart(3)}` +
    ` S ${String(b.similarity.score).padStart(3)}${b.capped ? ' capped' : ''}`
  );
}

async function scoreDemo() {
  if (!process.env.GEMINI_MODEL_EMBEDDING?.trim()) {
    console.error(
      '✗ Thiếu GEMINI_MODEL_EMBEDDING (vd. gemini-embedding-001) trong packages/ai/.env',
    );
    process.exitCode = 1;
    return;
  }
  const mode = process.argv[3] ?? 'dev';
  if (mode === 'repeat') return scoreRepeatDemo(process.argv.slice(4));
  if (mode !== 'dev' && mode !== 'all') {
    throw new Error('score chỉ nhận: dev (mặc định), all, repeat <cv.pdf> [số lần] [--full]');
  }

  const delayMs = Number(process.env.TRY_DELAY_MS ?? 2000);
  const truth = readFixtureTruth();
  const rows = readLabels().filter((row) => mode === 'all' || row.split === 'dev');

  const jds = {};
  for (const name of JD_NAMES) {
    jds[name] = await prepareFixtureJd(name);
    await sleep(delayMs);
  }

  console.log(
    `\n── scoreCv trên ${rows.length} cặp CV ↔ JD của labels.csv (${mode});` +
      ' R/P = kỹ năng bắt buộc/ưu tiên, Y = số năm, L = liên quan (Gemini), S = tương đồng',
  );
  const cvCache = new Map();
  const results = [];
  for (const [i, row] of rows.entries()) {
    if (i > 0) await sleep(delayMs);
    if (!cvCache.has(row.cv_file)) cvCache.set(row.cv_file, await prepareFixtureCv(row.cv_file));
    const jd = jds[jdNameOf(row.jd_id)];
    const { total, breakdown } = await scoreCv(ai, {
      ...cvCache.get(row.cv_file),
      parsedJd: jd.parsedJd,
      jdEmbedding: jd.jdEmbedding,
    });
    const expected = Number(row.expected_score);
    const pass = total >= jd.threshold;
    const agrees = pass === (row.label === 'phù hợp');
    results.push({ row, total, expected, agrees });

    const category = truth.get(row.cv_file)?.category ?? '?';
    console.log(
      `${row.cv_file.padEnd(14)} ${row.jd_id.padEnd(6)} ${category.padEnd(10)} ` +
        `${String(total).padStart(3)} (nhãn ${String(expected).padStart(2)}, ${row.label.padEnd(13)}) ` +
        `${describeBreakdown(breakdown)}${agrees ? '' : '  ← lệch nhãn theo ngưỡng'}`,
    );
    console.log(`   ${breakdown.relevance.comment}`);
  }

  const errors = results.map(({ total, expected }) => Math.abs(total - expected));
  const byLabel = (label) =>
    results.filter(({ row }) => row.label === label).map(({ total }) => total);
  const range = (values) =>
    values.length ? `${Math.min(...values)}–${Math.max(...values)}` : '(không có)';
  const agreed = results.filter(({ agrees }) => agrees).length;
  console.log('\n── Tổng hợp:');
  console.log(`   "phù hợp": điểm ${range(byLabel('phù hợp'))}`);
  console.log(`   "không phù hợp": điểm ${range(byLabel('không phù hợp'))}`);
  console.log(
    `   Lệch so với expected_score: trung bình ${average(errors).toFixed(1)}, tối đa ${Math.max(...errors)}`,
  );
  console.log(
    `   Khớp nhãn theo ngưỡng của job (≥ ngưỡng ↔ "phù hợp"): ${agreed}/${results.length}`,
  );
}

/**
 * Chấm một CV nhiều lần (mặc định 3) để kiểm tra độ ổn định (±5).
 * Mặc định parse + embed một lần rồi chỉ lặp scoreCv; --full thì parse + embed lại mỗi lần (như BE chấm lại).
 */
async function scoreRepeatDemo(args) {
  const full = args.includes('--full');
  const [file, countArg] = args.filter((arg) => arg !== '--full');
  const truth = readFixtureTruth();
  const cv = truth.get(file);
  if (!cv)
    throw new Error(
      'Cách dùng: score repeat <cv của fixtures, vd. cv_be_06.pdf> [số lần] [--full]',
    );
  const count = Number(countArg ?? 3);
  const delayMs = Number(process.env.TRY_DELAY_MS ?? 2000);

  const jd = await prepareFixtureJd(jdNameOf(cv.jdId));
  console.log(
    `\n── ${file} ↔ ${jd.code}, ${count} lần${full ? ' (parse + embed lại mỗi lần)' : ''}`,
  );
  let prepared;
  const totals = [];
  for (let i = 0; i < count; i++) {
    await sleep(delayMs);
    if (full || !prepared) prepared = await prepareFixtureCv(file);
    const { total, breakdown } = await scoreCv(ai, {
      ...prepared,
      parsedJd: jd.parsedJd,
      jdEmbedding: jd.jdEmbedding,
    });
    totals.push(total);
    console.log(`   lần ${i + 1}: ${String(total).padStart(3)}  ${describeBreakdown(breakdown)}`);
    console.log(`           ${breakdown.relevance.comment}`);
  }
  const spread = Math.max(...totals) - Math.min(...totals);
  check(spread <= 5, 'chênh lệch giữa các lần ≤ 5', `${spread} (${totals.join(', ')})`);
  if (failedChecks > 0) process.exitCode = 1;
}

// ── Demo screen: screenCv trọn gói trên fixtures (W2-AI-03) ─────────────

/** Mặc định: 1 cặp phù hợp, 1 cặp borderline (thiếu NestJS), 1 cặp khác ngành — đều thuộc tập dev. */
const DEFAULT_SCREEN_PAIRS = [
  ['cv_be_01.pdf', 'JD_BE'],
  ['cv_be_05.pdf', 'JD_BE'],
  ['cv_be_02.pdf', 'JD_DA'],
];

/** Chọn các dòng labels.csv cần chạy: mặc định 3 cặp, "dev" cả tập dev, hoặc danh sách file CV. */
function screenRows(args) {
  const labels = readLabels();
  if (args.length === 0) {
    return DEFAULT_SCREEN_PAIRS.map(([file, jdId]) =>
      labels.find((row) => row.cv_file === file && row.jd_id === jdId),
    );
  }
  if (args[0] === 'dev') return labels.filter((row) => row.split === 'dev');
  return args.map((file) => {
    const row = labels.find((item) => item.cv_file === file);
    if (!row) throw new Error(`Không có ${file} trong labels.csv`);
    return row;
  });
}

/** Số câu (ước lượng theo dấu kết thúc câu). */
const countSentences = (text) => text.split(/[.!?](?:\s|$)/).filter((s) => s.trim()).length;

async function screenDemo() {
  if (!process.env.GEMINI_MODEL_EMBEDDING?.trim()) {
    console.error(
      '✗ Thiếu GEMINI_MODEL_EMBEDDING (vd. gemini-embedding-001) trong packages/ai/.env',
    );
    process.exitCode = 1;
    return;
  }
  const delayMs = Number(process.env.TRY_DELAY_MS ?? 2000);
  const rows = screenRows(process.argv.slice(3));
  const truth = readFixtureTruth();

  const jds = {};
  for (const name of new Set(rows.map((row) => jdNameOf(row.jd_id)))) {
    jds[name] = await prepareFixtureJd(name);
    await sleep(delayMs);
  }

  const totals = { quotes: 0, verified: 0, totalMs: [] };
  for (const [i, row] of rows.entries()) {
    if (i > 0) await sleep(delayMs);
    const jd = jds[jdNameOf(row.jd_id)];
    const bytes = new Uint8Array(readFileSync(path.join(FIXTURES_DIR, 'cvs', row.cv_file)));
    const { text: cvText } = await extractCvText(bytes, { logger: quietLogger });

    const warnings = [];
    const logger = { log() {}, error: console.error, warn: (message) => warnings.push(message) };
    let result;
    try {
      result = await screenCv(
        ai,
        { cvText, parsedJd: jd.parsedJd, jdEmbedding: jd.jdEmbedding },
        { referenceDate: FIXTURE_REFERENCE_DATE, logger },
      );
    } catch (error) {
      if (!(error instanceof ScreeningStepError)) throw error;
      console.error(`✗ ${row.cv_file}: ${error.message}`);
      // Để phần xử lý lỗi chung in chi tiết và gợi ý cho lỗi của Gemini.
      throw isAiError(error.cause) ? error.cause : error;
    }

    const { total, breakdown, explanation, timings } = result;
    console.log(
      `\n── ${row.cv_file} ↔ ${row.jd_id}: ${total} điểm (nhãn ${row.expected_score}, ${row.label}, ngưỡng ${jd.threshold}) ` +
        describeBreakdown(breakdown),
    );
    console.log('   Điểm mạnh:');
    for (const { point, quote } of explanation.strengths) {
      console.log(`   - ${point}`);
      console.log(`     ${quote === null ? '✗ (trích dẫn bị bỏ)' : `“${quote}”`}`);
    }
    console.log('   Kỹ năng bắt buộc còn thiếu:');
    if (explanation.gaps.length === 0) console.log('   (không)');
    for (const { skill, note } of explanation.gaps) console.log(`   - ${skill}: ${note}`);
    console.log(`   Tóm tắt: ${explanation.summary}`);
    console.log(
      `   Thời gian: parse ${timings.parseCvMs} / embed ${timings.embedMs} / score ${timings.scoreMs}` +
        ` / explain ${timings.explainMs} / tổng ${timings.totalMs} ms`,
    );
    for (const warning of warnings) console.log(`   ! ${warning}`);

    const verified = explanation.strengths.filter(({ quote }) => quote !== null).length;
    totals.quotes += explanation.strengths.length;
    totals.verified += verified;
    totals.totalMs.push(timings.totalMs);

    const text = JSON.stringify(explanation);
    const leaked = personalDataOf(truth.get(row.cv_file) ?? {}).filter((item) =>
      text.includes(item),
    );
    check(
      explanation.strengths.length >= 2 && explanation.strengths.length <= 4,
      '2–4 điểm mạnh',
      String(explanation.strengths.length),
    );
    check(
      JSON.stringify(explanation.gaps.map(({ skill }) => skill)) ===
        JSON.stringify(breakdown.requiredSkills.missing),
      'gaps khớp breakdown.requiredSkills.missing',
    );
    check(leaked.length === 0, 'không lộ thông tin cá nhân', leaked.join(', '));
    console.log(
      `   · trích dẫn còn giữ ${verified}/${explanation.strengths.length}, tóm tắt ~${countSentences(explanation.summary)} câu`,
    );
  }

  console.log('\n── Tổng hợp:');
  console.log(`   Trích dẫn kiểm chứng được: ${totals.verified}/${totals.quotes}`);
  console.log(`   Thời gian trung bình mỗi CV: ${Math.round(average(totals.totalMs))} ms`);
  if (failedChecks > 0) process.exitCode = 1;
}

// ── Demo questions: generateQuestionPlan trên fixtures (W3-AI-01) ───────

/** Từ ngữ về thông tin cá nhân không được hỏi (so sau khi bỏ dấu). */
const FORBIDDEN_TOPICS = /\b(tuoi|gioi tinh|gia dinh|que quan|ket hon|vo chong|con cai|ton giao)\b/;
const foldText = (text) =>
  text.normalize('NFD').replace(/\p{M}/gu, '').replace(/đ/gi, 'd').toLowerCase();
const wordCount = (text) => text.split(/\s+/).filter(Boolean).length;

async function questionsDemo() {
  const delayMs = Number(process.env.TRY_DELAY_MS ?? 2000);
  const rows = screenRows(process.argv.slice(3));
  const counts = [5, 4, 3];

  const jds = {};
  for (const name of new Set(rows.map((row) => jdNameOf(row.jd_id)))) {
    const jd = readFixtureJd(name);
    const parsedJd = await parseJd(ai, {
      title: jd.title,
      description: descriptionOf(jd),
      requiredSkills: jd.requiredSkills,
      preferredSkills: jd.preferredSkills,
      minYearsExperience: jd.minYearsExperience,
      level: jd.level,
    });
    jds[name] = { title: jd.title, parsedJd };
    await sleep(delayMs);
  }

  for (const [i, row] of rows.entries()) {
    if (i > 0) await sleep(delayMs);
    const jd = jds[jdNameOf(row.jd_id)];
    const bytes = new Uint8Array(readFileSync(path.join(FIXTURES_DIR, 'cvs', row.cv_file)));
    const { text } = await extractCvText(bytes, { logger: quietLogger });
    const parsedCv = await parseCv(ai, text, { referenceDate: FIXTURE_REFERENCE_DATE });
    await sleep(delayMs);

    // Kỹ năng bắt buộc còn thiếu, tính như breakdown.requiredSkills.missing (không gọi Gemini).
    const have = new Set(normalizeSkills(parsedCv.skills).map((skill) => skill.toLowerCase()));
    const missingSkills = normalizeSkills(jd.parsedJd.requiredSkills).filter(
      (skill) => !have.has(skill.toLowerCase()),
    );
    const count = counts[i % counts.length];

    const started = Date.now();
    const plan = await generateQuestionPlan(ai, {
      parsedJd: jd.parsedJd,
      parsedCv,
      missingSkills,
      count,
      jobTitle: jd.title,
    });
    const ms = Date.now() - started;

    console.log(
      `\n── ${row.cv_file} ↔ ${row.jd_id} (${row.label}): ${count} câu, ${ms} ms` +
        `\n   Kỹ năng bắt buộc còn thiếu: ${missingSkills.join(', ') || '(không)'}`,
    );
    for (const item of plan) {
      console.log(
        `   ${item.order}. [${item.type} · ${item.targetSkill}] ${item.question} (${wordCount(item.question)} từ)`,
      );
    }

    const missingKeys = new Set(missingSkills.map((skill) => skill.toLowerCase()));
    check(plan.length === count, `đúng ${count} câu`, String(plan.length));
    check(
      plan.every((item, index) => item.order === index + 1),
      'order liên tục 1..count',
    );
    check(
      plan.every((item) => wordCount(item.question) < 30),
      'mọi câu dưới 30 từ',
    );
    check(
      missingSkills.length === 0 ||
        plan.some((item) => missingKeys.has(item.targetSkill.toLowerCase())),
      'có câu về kỹ năng còn thiếu',
    );
    check(
      plan.some((item) => item.type === 'EXPERIENCE'),
      'có câu EXPERIENCE (dựa trên CV)',
    );
    check(
      plan.every((item) => !FORBIDDEN_TOPICS.test(foldText(item.question))),
      'không hỏi thông tin cá nhân',
    );
  }
  if (failedChecks > 0) process.exitCode = 1;
}

const demos = {
  text: () => ai.generateText('Trả lời trong 1 câu: thủ đô của Việt Nam là gì?'),
  structured: () =>
    ai.generateStructured(
      `Trích yêu cầu tuyển dụng từ JD sau. Chỉ dùng thông tin có trong JD.\n\n${SAMPLE_JD}`,
      JdRequirementsSchema,
      { temperature: 0 },
    ),
  jd: jdDemo,
  cv: cvDemo,
  'parse-cv': parseCvDemo,
  embed: embedDemo,
  score: scoreDemo,
  screen: screenDemo,
  questions: questionsDemo,
};

/** Gợi ý cách xử lý cho các lỗi hay gặp khi chạy thử. */
function hint(error) {
  const cause = error.cause instanceof Error ? error.cause.message : '';
  if (cause.includes('API_KEY_INVALID')) return 'API key sai. Kiểm tra lại GEMINI_API_KEY.';
  if (error.status === 400)
    return 'Xem cause: có thể Gemini không nhận một phần JSON Schema sinh từ Zod.';
  if (error.status === 403)
    return 'Project của API key chưa được dùng Gemini (thường do chưa bật billing).';
  if (error.status === 404)
    return 'Sai tên model. Liệt kê model bằng ai.models.list() rồi sửa GEMINI_MODEL_TEXT.';
  if (error.code === 'AI_RATE_LIMIT') return 'Hết quota tạm thời. Chờ một lúc rồi chạy lại.';
  if (error.code === 'AI_TIMEOUT') return 'Gemini phản hồi chậm hoặc mạng có vấn đề.';
  return undefined;
}

const choice = process.argv[2] ?? 'all';
const names = choice === 'all' ? Object.keys(demos) : [choice];
if (!names.every((name) => name in demos)) {
  console.error(`Không có demo "${choice}". Chọn một trong: ${Object.keys(demos).join(', ')}, all`);
  process.exit(1);
}

for (const name of names) {
  console.log(`\n=== ${name} (model: ${ai.models.text})`);
  try {
    const result = await demos[name]();
    if (result !== undefined) console.dir(result, { depth: null });
  } catch (error) {
    if (!isAiError(error)) throw error;
    console.error(
      `✗ ${error.name} code=${error.code} status=${error.status ?? 'n/a'} attempts=${error.attempts}`,
    );
    if (error.issues) console.error('  issues:', error.issues);
    if (error.cause instanceof Error)
      console.error(`  cause: ${error.cause.message.slice(0, 300)}`);
    const tip = hint(error);
    if (tip) console.error(`  gợi ý: ${tip}`);
    process.exitCode = 1;
    break;
  }
}
