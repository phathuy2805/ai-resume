import { fold, toWords } from './text.js';

/**
 * Bảng tên kỹ năng dùng chung cho JD (W1-AI-05) và CV (W1-AI-04).
 *
 * - Khóa là TÊN CHUẨN: đúng tên trong requiredSkills/preferredSkills của 3 JD fixtures
 *   (labels.csv cũng dùng đúng các tên này). Không đổi tên chuẩn nếu chưa sửa cả JD và labels.csv.
 * - Giá trị là các cách viết khác (alias). So khớp không phân biệt hoa thường, dấu tiếng Việt,
 *   dấu chấm, gạch, khoảng trắng: "Node.js", "node js", "NODEJS" đều là một.
 * - Thêm cách viết mới: thêm vào mảng alias. Kỹ năng mới: thêm một dòng.
 *   Nếu một alias bị gán cho 2 kỹ năng, package báo lỗi ngay khi import (có test kiểm tra).
 */
export const SKILL_ALIASES: Readonly<Record<string, readonly string[]>> = {
  // ── Backend / phần mềm ───────────────────────────────────────────────
  NodeJS: ['Node.js', 'Node', 'Node JS'],
  NestJS: ['Nest.js', 'Nest', 'Nest JS'],
  TypeScript: ['TS'],
  JavaScript: ['JS', 'ECMAScript', 'ES6'],
  PostgreSQL: ['Postgres', 'Postgre', 'PSQL'],
  'RESTful API': [
    'REST API',
    'REST APIs',
    'RESTful APIs',
    'RESTful',
    'REST',
    'Restful Web Service',
  ],
  Docker: ['Docker Container', 'Containerization'],
  Redis: ['Redis Cache'],
  BullMQ: ['Bull MQ', 'Bull'],
  'AWS S3': ['S3', 'Amazon S3'],
  AWS: ['Amazon Web Services'],
  Microservices: ['Microservice', 'Micro-services', 'Microservice Architecture'],
  GraphQL: ['Graph QL'],
  'Express.js': ['Express', 'ExpressJS'],
  MongoDB: ['Mongo'],
  Prisma: ['Prisma ORM'],
  Git: ['Git Flow', 'Gitflow'],
  'CI/CD': ['CICD', 'CI CD'],
  Kafka: ['Apache Kafka'],
  '.NET': ['NET Core', '.NET Core', 'ASP.NET Core', 'ASP.NET', 'dotnet'],
  'C#': ['CSharp', 'C Sharp'],
  ReactJS: ['React', 'React.js'],
  'SQL Server': ['MSSQL', 'MS SQL', 'Microsoft SQL Server'],
  'Tailwind CSS': ['TailwindCSS', 'Tailwind'],
  HTML5: ['HTML'],
  CSS3: ['CSS'],

  // ── Dữ liệu / phân tích ──────────────────────────────────────────────
  SQL: ['Structured Query Language'],
  Python: ['Python3', 'Python 3'],
  PowerBI: ['Power BI', 'Microsoft Power BI', 'MS Power BI', 'PBI'],
  'Data Analysis': ['Data Analytics', 'Phân tích dữ liệu', 'Phân tích số liệu'],
  Statistics: ['Thống kê', 'Statistical Analysis', 'Phân tích thống kê', 'Xác suất thống kê'],
  Tableau: ['Tableau Desktop'],
  Pandas: ['Python Pandas'],
  NumPy: ['Numpy'],
  ETL: ['ETL Pipeline', 'ETL Pipelines'],
  BigQuery: ['Google BigQuery', 'Big Query', 'BQ'],
  'Data Modeling': ['Data Modelling', 'Mô hình hóa dữ liệu'],
  'Data Visualization': ['Data Viz', 'Trực quan hóa dữ liệu'],
  Excel: ['Microsoft Excel', 'MS Excel'],
  DAX: ['Power BI DAX'],

  // ── Digital Marketing ────────────────────────────────────────────────
  SEO: [
    'Search Engine Optimization',
    'Tối ưu hóa công cụ tìm kiếm',
    'Technical SEO',
    'SEO kỹ thuật',
    'SEO Onpage',
    'SEO On-page',
    'SEO Offpage',
    'SEO Off-page',
  ],
  'Google Ads': ['Google AdWords', 'AdWords', 'Quảng cáo Google', 'Google Search Ads'],
  'Meta Ads': ['Facebook Ads', 'FB Ads', 'Facebook Advertising', 'Quảng cáo Facebook'],
  'Content Marketing': ['Tiếp thị nội dung', 'Sáng tạo nội dung', 'Content Creation'],
  'Google Analytics': ['GA', 'GA4', 'Google Analytics 4', 'Universal Analytics'],
  'TikTok Ads': ['TikTok Advertising', 'Quảng cáo TikTok'],
  Copywriting: ['Copywriter', 'Viết quảng cáo'],
  'Email Marketing': ['Email Campaigns', 'Email Campaign'],
  Canva: ['Canva Design'],
  'A/B Testing': ['AB Testing', 'A-B Testing', 'Split Testing'],
  CRO: ['Conversion Rate Optimization'],
  'Google Tag Manager': ['GTM'],
};

/** Từ chỉ mức độ, bỏ đi khi so khớp: "SQL cơ bản" → SQL, "Advanced Excel" → Excel. */
const QUALIFIER_PATTERN =
  /\b(co ban|nang cao|chuyen sau|thuc chien|thanh thao|basic|basics|advanced|intermediate|beginner|expert|proficient|fundamentals?)\b/g;

/** Khóa so khớp: chỉ giữ a-z, 0-9, + và # (để C++ và C# không thành "c"). */
export function skillKey(name: string): string {
  return fold(name).replace(/[^a-z0-9+#]/g, '');
}

/** Dựng bảng tra "khóa → tên chuẩn". Ném lỗi nếu một alias thuộc về 2 kỹ năng. */
export function buildSkillIndex(
  table: Readonly<Record<string, readonly string[]>>,
): Map<string, string> {
  const index = new Map<string, string>();
  for (const [canonical, aliases] of Object.entries(table)) {
    for (const name of [canonical, ...aliases]) {
      const key = skillKey(name);
      const existing = index.get(key);
      if (existing !== undefined && existing !== canonical) {
        throw new Error(`Skill alias "${name}" is used by both "${existing}" and "${canonical}"`);
      }
      index.set(key, canonical);
    }
  }
  return index;
}

const SKILL_INDEX = buildSkillIndex(SKILL_ALIASES);

/**
 * Trả về tên chuẩn của một kỹ năng.
 * Kỹ năng không có trong bảng được giữ nguyên (chỉ gọn khoảng trắng), không bao giờ bị bỏ.
 *
 * @example normalizeSkill('Node.js') // 'NodeJS'
 * @example normalizeSkill('SQL cơ bản') // 'SQL'
 * @example normalizeSkill('Rust') // 'Rust'
 */
export function normalizeSkill(raw: string): string {
  const cleaned = raw.normalize('NFC').replace(/\s+/g, ' ').trim();
  if (cleaned === '') return '';

  const exact = SKILL_INDEX.get(skillKey(cleaned));
  if (exact !== undefined) return exact;

  const withoutQualifiers = fold(cleaned)
    .replace(/[()[\]]/g, ' ')
    .replace(QUALIFIER_PATTERN, ' ');
  return SKILL_INDEX.get(skillKey(withoutQualifiers)) ?? cleaned;
}

/** Chuẩn hóa cả danh sách, bỏ chuỗi rỗng và bỏ trùng; giữ thứ tự xuất hiện đầu tiên. */
export function normalizeSkills(skills: readonly string[]): string[] {
  const seen = new Set<string>();
  const result: string[] = [];
  for (const raw of skills) {
    const skill = normalizeSkill(raw);
    const key = skillKey(skill);
    if (key === '' || seen.has(key)) continue;
    seen.add(key);
    result.push(skill);
  }
  return result;
}

/**
 * Kiểm tra một kỹ năng (theo tên chuẩn hoặc bất kỳ alias nào) có được nhắc trong đoạn văn không.
 * Dùng để chặn AI tự thêm kỹ năng không có trong JD.
 */
export function mentionsSkill(text: string, skill: string): boolean {
  const haystack = ` ${toWords(text)} `;
  const canonical = normalizeSkill(skill);
  const names = [skill, canonical, ...(SKILL_ALIASES[canonical] ?? [])];
  return names.some((name) => {
    const words = toWords(name);
    return words !== '' && haystack.includes(` ${words} `);
  });
}
