// Chạy thử @hireflow/ai với Gemini thật.
//
//   npm run try -w packages/ai                 # chạy tất cả demo
//   npm run try -w packages/ai -- text         # chỉ generateText
//   npm run try -w packages/ai -- structured   # chỉ generateStructured
//
// Biến môi trường đọc từ packages/ai/.env (copy từ .env.example) hoặc từ terminal ($env:...).
// Biến đặt trong terminal được ưu tiên hơn file .env.
// Package không tự đọc process.env: chỉ script này đọc rồi truyền vào createAiClient.
import { z } from 'zod';
import { createAiClient, isAiError } from '../dist/index.mjs';

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

const demos = {
  text: () => ai.generateText('Trả lời trong 1 câu: thủ đô của Việt Nam là gì?'),
  structured: () =>
    ai.generateStructured(
      `Trích yêu cầu tuyển dụng từ JD sau. Chỉ dùng thông tin có trong JD.\n\n${SAMPLE_JD}`,
      JdRequirementsSchema,
      { temperature: 0 },
    ),
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
    console.dir(await demos[name](), { depth: null });
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
