import { describe, expect, it, vi } from 'vitest';
import type { AiClient, EmbedOptions } from './client.js';
import type { ParsedCv } from './cv.js';
import {
  buildCvEmbeddingText,
  buildJdEmbeddingText,
  cosineSimilarity,
  EMBEDDING_DIMENSIONS,
  EMBEDDING_TASK_TYPE,
  embedCv,
  embedJd,
  embedText,
} from './embedding.js';
import { AiInvalidResponseError } from './errors.js';
import type { ParsedJd } from './jd.js';

const CV: ParsedCv = {
  schemaVersion: 1,
  summary: 'Backend developer with 4 years of NodeJS experience.',
  skills: ['NodeJS', 'NestJS', 'PostgreSQL', 'Docker'],
  experiences: [
    {
      company: 'Công ty Bí Mật ABC',
      title: 'Backend Developer',
      startDate: '2022-01',
      endDate: null,
      description: 'Xây dựng REST API cho hệ thống thanh toán.',
      technologies: ['NestJS', 'PostgreSQL'],
    },
  ],
  education: [{ school: 'Đại học XYZ', major: 'CNTT', degree: 'Kỹ sư', graduationYear: 2021 }],
  projects: [
    {
      name: 'HireFlow',
      role: 'Backend',
      technologies: ['Redis'],
      description: 'Hệ thống tuyển dụng có hàng đợi xử lý nền.',
    },
  ],
  certifications: ['AWS Certified Developer'],
  languages: ['English B2'],
  totalYearsExperience: 4.5,
};

const JD: ParsedJd = {
  schemaVersion: 1,
  requiredSkills: ['NodeJS', 'NestJS', 'PostgreSQL'],
  preferredSkills: ['Redis', 'AWS'],
  minYearsExperience: 3,
  level: 'senior',
  educationRequirement: 'Đại học CNTT',
  responsibilities: ['Thiết kế RESTful API', 'Tối ưu cơ sở dữ liệu'],
  domain: 'Backend Engineering',
};

/** Vector 768 chiều, chỉ phần tử đầu bằng `value` (độ dài = |value|). */
function vectorOf(value: number, length = EMBEDDING_DIMENSIONS): number[] {
  const v = new Array<number>(length).fill(0);
  v[0] = value;
  return v;
}

function fakeAi(embed: (text: string, options?: EmbedOptions) => Promise<number[]>) {
  const fn = vi.fn(embed);
  return { ai: { embed: fn } as unknown as AiClient, embed: fn };
}

describe('cosineSimilarity', () => {
  it('hai vector giống hệt = 1, vuông góc = 0', () => {
    expect(cosineSimilarity([1, 2, 3], [1, 2, 3])).toBeCloseTo(1, 10);
    expect(cosineSimilarity([1, 0], [0, 5])).toBe(0);
  });

  it('không phụ thuộc độ dài vector', () => {
    expect(cosineSimilarity([1, 1], [3, 3])).toBeCloseTo(1, 10);
    expect(cosineSimilarity([1, 0], [1, 1])).toBeCloseTo(Math.SQRT1_2, 10);
  });

  it('ngược chiều (cosine âm) kẹp về 0', () => {
    expect(cosineSimilarity([1, 0], [-1, 0])).toBe(0);
  });

  it('vector toàn số 0 trả 0', () => {
    expect(cosineSimilarity([0, 0], [1, 2])).toBe(0);
  });

  it('khác số chiều hoặc rỗng: ném RangeError', () => {
    expect(() => cosineSimilarity([1, 2], [1, 2, 3])).toThrow(RangeError);
    expect(() => cosineSimilarity([], [])).toThrow(RangeError);
  });
});

describe('embedText', () => {
  it('gọi embed với taskType và số chiều cố định, trả vector độ dài 1', async () => {
    const { ai, embed } = fakeAi(async () => vectorOf(5));

    const vector = await embedText(ai, '  Kỹ năng: NodeJS  ', { timeoutMs: 1000 });

    expect(embed).toHaveBeenCalledWith('Kỹ năng: NodeJS', {
      timeoutMs: 1000,
      taskType: EMBEDDING_TASK_TYPE,
      outputDimensionality: EMBEDDING_DIMENSIONS,
    });
    expect(vector).toHaveLength(EMBEDDING_DIMENSIONS);
    expect(vector[0]).toBeCloseTo(1, 10);
    expect(Math.hypot(...vector)).toBeCloseTo(1, 10);
  });

  it('Gemini trả sai số chiều: ném AiInvalidResponseError', async () => {
    const { ai } = fakeAi(async () => vectorOf(1, 767));
    await expect(embedText(ai, 'text')).rejects.toBeInstanceOf(AiInvalidResponseError);
  });

  it('vector toàn 0 hoặc có NaN: ném AiInvalidResponseError', async () => {
    await expect(embedText(fakeAi(async () => vectorOf(0)).ai, 'text')).rejects.toBeInstanceOf(
      AiInvalidResponseError,
    );
    await expect(
      embedText(fakeAi(async () => vectorOf(Number.NaN)).ai, 'text'),
    ).rejects.toBeInstanceOf(AiInvalidResponseError);
  });

  it('text rỗng: báo lỗi ngay, không gọi Gemini', async () => {
    const { ai, embed } = fakeAi(async () => vectorOf(1));
    await expect(embedText(ai, '   ')).rejects.toThrow(RangeError);
    expect(embed).not.toHaveBeenCalled();
  });
});

describe('buildCvEmbeddingText', () => {
  it('ghép tóm tắt, kỹ năng, công việc, dự án theo nhãn cố định', () => {
    expect(buildCvEmbeddingText(CV)).toBe(
      [
        'Lĩnh vực: Backend developer with 4 years of NodeJS experience.',
        'Kỹ năng: NodeJS, NestJS, PostgreSQL, Docker',
        'Công việc: Backend Developer (NestJS, PostgreSQL): Xây dựng REST API cho hệ thống thanh toán.',
        'Dự án: HireFlow – Backend (Redis): Hệ thống tuyển dụng có hàng đợi xử lý nền.',
      ].join('\n'),
    );
  });

  it('không chứa tên công ty, trường học, chứng chỉ, ngoại ngữ', () => {
    const text = buildCvEmbeddingText(CV);
    for (const hidden of ['Bí Mật ABC', 'Đại học XYZ', 'AWS Certified', 'English B2']) {
      expect(text).not.toContain(hidden);
    }
  });

  it('bỏ dòng trống, cắt mô tả dài, tối đa 5 công việc', () => {
    const job = CV.experiences[0]!;
    const text = buildCvEmbeddingText({
      ...CV,
      summary: null,
      projects: [],
      experiences: Array.from({ length: 7 }, (_, i) => ({
        ...job,
        title: `Job ${i}`,
        description: 'x'.repeat(500),
      })),
    });

    expect(text).not.toContain('Lĩnh vực');
    expect(text).not.toContain('Dự án');
    expect(text).toContain('Job 4');
    expect(text).not.toContain('Job 5');
    expect(text).not.toContain('x'.repeat(200));
    expect(text).toContain('…');
  });
});

describe('buildJdEmbeddingText', () => {
  it('ghép lĩnh vực, kỹ năng bắt buộc, ưu tiên, trách nhiệm; cùng bộ nhãn với CV', () => {
    expect(buildJdEmbeddingText(JD)).toBe(
      [
        'Lĩnh vực: Backend Engineering',
        'Kỹ năng: NodeJS, NestJS, PostgreSQL',
        'Kỹ năng ưu tiên: Redis, AWS',
        'Công việc: Thiết kế RESTful API; Tối ưu cơ sở dữ liệu',
      ].join('\n'),
    );
  });

  it('không có kỹ năng ưu tiên thì bỏ dòng đó', () => {
    expect(buildJdEmbeddingText({ ...JD, preferredSkills: [] })).not.toContain('Kỹ năng ưu tiên');
  });
});

describe('embedCv / embedJd', () => {
  it('embed đúng văn bản đã ghép', async () => {
    const { ai, embed } = fakeAi(async () => vectorOf(2));

    await embedCv(ai, CV);
    await embedJd(ai, JD);

    expect(embed.mock.calls[0]![0]).toBe(buildCvEmbeddingText(CV));
    expect(embed.mock.calls[1]![0]).toBe(buildJdEmbeddingText(JD));
  });
});
