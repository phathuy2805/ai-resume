import { describe, expect, it, vi } from 'vitest';
import type { AiClient } from './client.js';
import { PARSED_CV_SCHEMA_VERSION, type ParsedCv } from './cv.js';
import { AiRateLimitError } from './errors.js';
import {
  buildExplanationPrompt,
  defaultGapNote,
  EXPLANATION_SYSTEM_INSTRUCTION,
  ExplanationResponseSchema,
  explainScore,
  mergeGaps,
  verifyQuote,
  verifyStrengths,
  type ExplainScoreInput,
  type ExplanationResponse,
} from './explanation.js';
import { PARSED_JD_SCHEMA_VERSION, type ParsedJd } from './jd.js';
import type { AiLogger } from './logger.js';
import type { ScoreBreakdown } from './scoring.js';
import { normalizeForMatch } from './text.js';

const CV_TEXT = `NGUYỄN VĂN A
Backend Developer
Kinh nghiệm
Công ty ABC (2022 - nay)
- Xây dựng RESTful API cho hệ thống thanh toán
  bằng NestJS và PostgreSQL, phục vụ 2 triệu người dùng.
- Viết unit test với Jest, độ phủ 85%.
Kỹ năng: NodeJS, TypeScript, Docker`;

const JD: ParsedJd = {
  schemaVersion: PARSED_JD_SCHEMA_VERSION,
  requiredSkills: ['NodeJS', 'NestJS', 'PostgreSQL', 'Kubernetes', 'GraphQL'],
  preferredSkills: ['Redis'],
  minYearsExperience: 3,
  level: 'middle',
  educationRequirement: null,
  responsibilities: ['Phát triển RESTful API'],
  domain: 'Backend Engineering',
};

const CV: ParsedCv = {
  schemaVersion: PARSED_CV_SCHEMA_VERSION,
  summary: null,
  skills: ['NodeJS', 'TypeScript', 'Docker', 'NestJS', 'PostgreSQL', 'Jest'],
  experiences: [],
  education: [],
  projects: [],
  certifications: [],
  languages: [],
  totalYearsExperience: 4,
};

function breakdown(overrides: Partial<ScoreBreakdown> = {}): ScoreBreakdown {
  return {
    requiredSkills: {
      score: 60,
      weight: 35,
      matched: ['NodeJS', 'NestJS', 'PostgreSQL'],
      missing: ['Kubernetes', 'GraphQL'],
    },
    preferredSkills: { score: 0, weight: 10, matched: [], missing: ['Redis'] },
    experienceYears: { score: 100, weight: 15, candidateYears: 4, requiredYears: 3 },
    relevance: { score: 80, weight: 25, comment: 'Ứng viên có kinh nghiệm xây dựng API.' },
    similarity: { score: 70, weight: 15, cosine: 0.87 },
    capped: false,
    ...overrides,
  };
}

function input(overrides: Partial<ExplainScoreInput> = {}): ExplainScoreInput {
  return { cvText: CV_TEXT, parsedCv: CV, parsedJd: JD, breakdown: breakdown(), ...overrides };
}

const RESPONSE: ExplanationResponse = {
  strengths: [
    {
      quote: 'Xây dựng RESTful API cho hệ thống thanh toán bằng NestJS và PostgreSQL',
      point: 'Ứng viên đã xây dựng API thanh toán với đúng công nghệ của vị trí.',
    },
    { quote: 'Viết unit test với Jest, độ phủ 85%', point: 'Ứng viên chú trọng kiểm thử.' },
  ],
  gapNotes: [
    { skill: 'Kubernetes', note: 'CV chỉ nhắc Docker, chưa có Kubernetes.' },
    { skill: 'GraphQL', note: 'CV không đề cập GraphQL.' },
  ],
  summary: 'Ứng viên khá phù hợp. Còn thiếu Kubernetes và GraphQL.',
};

function fakeAi(response: unknown = RESPONSE) {
  const generateStructured = vi.fn().mockResolvedValue(response);
  const ai = { generateStructured } as unknown as AiClient;
  return { ai, generateStructured };
}

function fakeLogger() {
  return {
    log: vi.fn<(message: string) => void>(),
    warn: vi.fn<(message: string) => void>(),
    error: vi.fn<(message: string) => void>(),
  } satisfies AiLogger;
}

describe('normalizeForMatch', () => {
  it('NFC, chữ thường, gộp khoảng trắng và xuống dòng', () => {
    expect(normalizeForMatch('  Xây  DỰNG\n\tAPI  ')).toBe('xây dựng api');
  });

  it('dạng tổ hợp (NFD) và dựng sẵn (NFC) cho cùng kết quả', () => {
    expect(normalizeForMatch('Nguyễn'.normalize('NFD'))).toBe(normalizeForMatch('Nguyễn'));
  });

  it('giữ dấu tiếng Việt', () => {
    expect(normalizeForMatch('Thanh toán')).not.toBe(normalizeForMatch('Thanh toan'));
  });
});

describe('verifyQuote', () => {
  const cv = normalizeForMatch(CV_TEXT);

  it('giữ trích dẫn đúng nguyên văn', () => {
    expect(verifyQuote('Viết unit test với Jest, độ phủ 85%', cv)).toBe(
      'Viết unit test với Jest, độ phủ 85%',
    );
  });

  it('bỏ trích dẫn bịa', () => {
    expect(verifyQuote('Triển khai Kubernetes cho 50 microservice', cv)).toBeNull();
  });

  it('khác chữ hoa, dấu cách, xuống dòng vẫn khớp', () => {
    expect(
      verifyQuote('xây dựng  RESTFUL api cho hệ thống thanh toán bằng nestjs và postgresql', cv),
    ).not.toBeNull();
  });

  it('trích dẫn dạng NFD vẫn khớp với CV dạng NFC', () => {
    const quote = 'hệ thống thanh toán'.normalize('NFD');
    expect(verifyQuote(quote, cv)).toBe(quote);
  });

  it('sai dấu tiếng Việt thì không khớp', () => {
    expect(verifyQuote('He thong thanh toan', cv)).toBeNull();
  });

  it('bỏ ngoặc kép, dấu ba chấm và dấu chấm câu ở hai đầu', () => {
    expect(verifyQuote('“...Viết unit test với Jest…”', cv)).toBe('Viết unit test với Jest');
    expect(verifyQuote('"độ phủ 85%."', cv)).toBe('độ phủ 85%');
    expect(verifyQuote('Viết unit test với Jest,', cv)).toBe('Viết unit test với Jest');
  });

  it('giữ dấu chấm đầu của tên như .NET', () => {
    expect(verifyQuote('.NET Core', normalizeForMatch('Kỹ năng: .NET Core, C#'))).toBe('.NET Core');
  });

  it('trích dẫn rỗng hoặc quá dài thì bỏ', () => {
    expect(verifyQuote('  “ ” ', cv)).toBeNull();
    const long = Array.from({ length: 31 }, () => 'API').join(' ');
    expect(verifyQuote(long, normalizeForMatch(long))).toBeNull();
  });
});

describe('verifyStrengths', () => {
  it('giữ point, đổi trích dẫn không tìm thấy thành null và đếm', () => {
    const result = verifyStrengths(
      [
        { point: 'A', quote: 'độ phủ 85%' },
        { point: 'B', quote: 'Triển khai Kubernetes' },
        { point: 'C', quote: '' },
        { point: 'D', quote: null },
      ],
      CV_TEXT,
    );
    expect(result.strengths).toEqual([
      { point: 'A', quote: 'độ phủ 85%' },
      { point: 'B', quote: null },
      { point: 'C', quote: null },
      { point: 'D', quote: null },
    ]);
    expect(result.checked).toBe(2);
    expect(result.dropped).toBe(1);
  });
});

describe('mergeGaps', () => {
  it('đi theo danh sách missing, ghép note theo tên kỹ năng (không phân biệt cách viết)', () => {
    expect(
      mergeGaps(
        ['Kubernetes', 'GraphQL'],
        [
          { skill: 'graphql', note: ' Chưa có GraphQL. ' },
          { skill: 'Kubernetes', note: 'Chưa có K8s.' },
        ],
      ),
    ).toEqual([
      { skill: 'Kubernetes', note: 'Chưa có K8s.' },
      { skill: 'GraphQL', note: 'Chưa có GraphQL.' },
    ]);
  });

  it('kỹ năng Gemini bỏ sót dùng note mặc định, kỹ năng tự thêm bị bỏ', () => {
    expect(
      mergeGaps(['Kubernetes', 'GraphQL'], [{ skill: 'Rust', note: 'Không có Rust.' }]),
    ).toEqual([
      { skill: 'Kubernetes', note: defaultGapNote('Kubernetes') },
      { skill: 'GraphQL', note: defaultGapNote('GraphQL') },
    ]);
  });

  it('note rỗng dùng note mặc định', () => {
    expect(mergeGaps(['GraphQL'], [{ skill: 'GraphQL', note: '  ' }])).toEqual([
      { skill: 'GraphQL', note: defaultGapNote('GraphQL') },
    ]);
  });

  it('không thiếu kỹ năng nào thì rỗng', () => {
    expect(mergeGaps([], RESPONSE.gapNotes)).toEqual([]);
  });
});

describe('buildExplanationPrompt', () => {
  it('có yêu cầu JD, điểm từng phần, danh sách kỹ năng thiếu và text CV', () => {
    const prompt = buildExplanationPrompt(input());
    expect(prompt).toContain('Domain: Backend Engineering');
    expect(prompt).toContain('Missing: Kubernetes, GraphQL');
    expect(prompt).toContain('MISSING REQUIRED SKILLS\n- Kubernetes\n- GraphQL');
    expect(prompt).toContain('more than half of the required skills are missing: no');
    expect(prompt).toContain('candidate 4 years, required 3 years');
    expect(prompt).toContain(`CV TEXT\n${CV_TEXT.trim()}`);
  });

  it('ghi rõ khi bị chặn điểm, không thiếu kỹ năng, JD không yêu cầu số năm', () => {
    const prompt = buildExplanationPrompt(
      input({
        breakdown: breakdown({
          capped: true,
          requiredSkills: { score: 100, weight: 35, matched: ['NodeJS'], missing: [] },
          experienceYears: { score: 100, weight: 15, candidateYears: 1, requiredYears: null },
        }),
      }),
    );
    expect(prompt).toContain('more than half of the required skills are missing: yes');
    expect(prompt).toContain('MISSING REQUIRED SKILLS\nnone');
    expect(prompt).toContain('no minimum required');
  });
});

describe('ExplanationResponseSchema', () => {
  it('gapNotes mặc định rỗng, strengths tối đa 4', () => {
    expect(ExplanationResponseSchema.parse({ strengths: [], summary: 'Ổn.' }).gapNotes).toEqual([]);
    const five = Array.from({ length: 5 }, () => ({ quote: '', point: 'x' }));
    expect(ExplanationResponseSchema.safeParse({ strengths: five, summary: 'x' }).success).toBe(
      false,
    );
  });
});

describe('explainScore', () => {
  it('gọi Gemini 1 lần với temperature 0 và system instruction riêng', async () => {
    const { ai, generateStructured } = fakeAi();
    await explainScore(ai, input(), { logger: fakeLogger(), timeoutMs: 5000 });

    expect(generateStructured).toHaveBeenCalledOnce();
    expect(generateStructured).toHaveBeenCalledWith(
      buildExplanationPrompt(input()),
      ExplanationResponseSchema,
      { timeoutMs: 5000, temperature: 0, systemInstruction: EXPLANATION_SYSTEM_INSTRUCTION },
    );
  });

  it('trả strengths đã kiểm chứng, gaps theo breakdown, summary', async () => {
    const { ai } = fakeAi();
    const logger = fakeLogger();
    const result = await explainScore(ai, input(), { logger });

    expect(result).toEqual({
      strengths: [
        {
          point: 'Ứng viên đã xây dựng API thanh toán với đúng công nghệ của vị trí.',
          quote: 'Xây dựng RESTful API cho hệ thống thanh toán bằng NestJS và PostgreSQL',
        },
        { point: 'Ứng viên chú trọng kiểm thử.', quote: 'Viết unit test với Jest, độ phủ 85%' },
      ],
      gaps: [
        { skill: 'Kubernetes', note: 'CV chỉ nhắc Docker, chưa có Kubernetes.' },
        { skill: 'GraphQL', note: 'CV không đề cập GraphQL.' },
      ],
      summary: 'Ứng viên khá phù hợp. Còn thiếu Kubernetes và GraphQL.',
    });
    expect(logger.warn).not.toHaveBeenCalled();
  });

  it('trích dẫn bịa bị bỏ và ghi log số lượng (không ghi nội dung)', async () => {
    const { ai } = fakeAi({
      ...RESPONSE,
      strengths: [
        { quote: 'Dẫn dắt team 10 người', point: 'Ứng viên có kinh nghiệm quản lý.' },
        RESPONSE.strengths[1],
      ],
    });
    const logger = fakeLogger();
    const result = await explainScore(ai, input(), { logger });

    expect(result.strengths[0]).toEqual({ point: 'Ứng viên có kinh nghiệm quản lý.', quote: null });
    expect(result.strengths[1]?.quote).not.toBeNull();
    expect(logger.warn).toHaveBeenCalledWith('explainScore: dropped 1/2 quotes not found in CV');
    expect(String(logger.warn.mock.calls[0]?.[0])).not.toContain('Dẫn dắt');
  });

  it('gaps lấy từ breakdown kể cả khi Gemini bỏ sót hoặc thêm kỹ năng', async () => {
    const { ai } = fakeAi({
      ...RESPONSE,
      gapNotes: [{ skill: 'Rust', note: 'Không có Rust.' }],
    });
    const result = await explainScore(ai, input(), { logger: fakeLogger() });
    expect(result.gaps.map((gap) => gap.skill)).toEqual(['Kubernetes', 'GraphQL']);
    expect(result.gaps[0]?.note).toBe(defaultGapNote('Kubernetes'));
  });

  it('không thiếu kỹ năng bắt buộc thì gaps rỗng', async () => {
    const { ai } = fakeAi();
    const result = await explainScore(
      ai,
      input({
        breakdown: breakdown({
          requiredSkills: { score: 100, weight: 35, matched: ['NodeJS'], missing: [] },
        }),
      }),
      { logger: fakeLogger() },
    );
    expect(result.gaps).toEqual([]);
  });

  it('bỏ điểm mạnh có point rỗng, trim summary', async () => {
    const { ai } = fakeAi({
      ...RESPONSE,
      strengths: [{ quote: 'độ phủ 85%', point: '  ' }, RESPONSE.strengths[1]],
      summary: '  Phù hợp.  ',
    });
    const result = await explainScore(ai, input(), { logger: fakeLogger() });
    expect(result.strengths).toHaveLength(1);
    expect(result.summary).toBe('Phù hợp.');
  });

  it('Gemini lỗi thì ném lỗi gốc', async () => {
    const error = new AiRateLimitError();
    const generateStructured = vi.fn().mockRejectedValue(error);
    const ai = { generateStructured } as unknown as AiClient;
    await expect(explainScore(ai, input(), { logger: fakeLogger() })).rejects.toBe(error);
  });
});
