// Chạy thử @hireflow/ai với Gemini thật.
//
//   npm run try -w packages/ai                 # chạy tất cả demo
//   npm run try -w packages/ai -- text         # chỉ generateText
//   npm run try -w packages/ai -- structured   # chỉ generateStructured
//   npm run try -w packages/ai -- jd           # parseJd trên 3 JD của fixtures (W1-AI-05)
//   npm run try -w packages/ai -- cv           # extractCvText trên 30 CV + 2 scan (W1-AI-03)
//   npm run try -w packages/ai -- cv cv_mkt_03.pdf   # như trên, in nội dung CV chỉ định để xem bằng mắt
//
// Biến môi trường đọc từ packages/ai/.env (copy từ .env.example) hoặc từ terminal ($env:...).
// Biến đặt trong terminal được ưu tiên hơn file .env.
// Package không tự đọc process.env: chỉ script này đọc rồi truyền vào createAiClient.
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { z } from 'zod';
import {
  createAiClient,
  extractCvText,
  isAiError,
  isCvExtractionError,
  normalizeSkills,
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
    // Script chưa gọi embedding/audio; giá trị tạm chỉ để qua bước kiểm tra cấu hình.
    embedding: process.env.GEMINI_MODEL_EMBEDDING || 'not-used-by-try',
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
