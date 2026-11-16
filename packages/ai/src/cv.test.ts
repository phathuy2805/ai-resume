import { describe, expect, it, vi } from 'vitest';
import type { AiClient } from './client.js';
import {
  buildCvPrompt,
  CV_SYSTEM_INSTRUCTION,
  CvExtractionSchema,
  mergeParsedCv,
  parseCv,
  parseCvDate,
  ParsedCvSchema,
  type CvExtraction,
} from './cv.js';
import { CvExtractionError } from './cv-text.js';
import { toGeminiJsonSchema } from './structured.js';

const REFERENCE = { referenceDate: new Date('2026-11-01') };

/** Kết quả AI giả (dạng đã qua CvExtractionSchema), có thể ghi đè từng trường. */
function extraction(overrides: Partial<CvExtraction> = {}): CvExtraction {
  return CvExtractionSchema.parse({
    summary: 'Ứng viên có hơn 3 năm kinh nghiệm backend.',
    skills: ['Node.js', 'NestJS', 'Postgres', 'Docker'],
    experiences: [
      {
        company: 'Kite Startup Studio',
        title: 'Backend Engineer',
        startDate: '2023-09',
        endDate: null,
        description: 'Xây dựng module thanh toán bằng NestJS.',
        technologies: ['NestJS', 'PostgreSQL', 'Prisma'],
      },
    ],
    education: [
      {
        school: 'Đại học FPT',
        major: 'Kỹ thuật Phần mềm',
        degree: 'Cử nhân',
        graduationYear: 2021,
      },
    ],
    projects: [
      {
        name: 'HireFlow',
        role: 'Backend',
        technologies: ['Redis', 'node js'],
        description: 'Demo',
      },
    ],
    certifications: ['IELTS 7.0'],
    languages: ['English'],
    ...overrides,
  });
}

describe('parseCvDate', () => {
  it.each([
    ['2024-03', '2024-03'],
    ['2024-3', '2024-03'],
    ['2024/03', '2024-03'],
    ['03/2024', '2024-03'],
    ['3/2024', '2024-03'],
    ['T3/2024', '2024-03'],
    ['Tháng 3/2024', '2024-03'],
    ['Mar 2024', '2024-03'],
    ['March 2024', '2024-03'],
    ['Sept. 2024', '2024-09'],
  ])('đọc "%s" thành %s', (raw, expected) => {
    expect(parseCvDate(raw, 'start')).toEqual({ kind: 'month', value: expected });
  });

  it('chỉ có năm: bắt đầu tháng 01, kết thúc tháng 12', () => {
    expect(parseCvDate('2021', 'start')).toEqual({ kind: 'month', value: '2021-01' });
    expect(parseCvDate('2021', 'end')).toEqual({ kind: 'month', value: '2021-12' });
  });

  it('ngày kết thúc null / Present / Hiện tại là đang làm', () => {
    for (const raw of [null, '', 'Present', 'hiện tại', 'Hiện nay', 'Now']) {
      expect(parseCvDate(raw, 'end')).toEqual({ kind: 'present' });
    }
  });

  it('ngày bắt đầu không có hoặc là "Present" thì không hợp lệ', () => {
    expect(parseCvDate(null, 'start')).toEqual({ kind: 'invalid' });
    expect(parseCvDate('Present', 'start')).toEqual({ kind: 'invalid' });
  });

  it('không đọc được thì không hợp lệ', () => {
    for (const raw of ['13/2024', '2024-00', 'abc 2024', 'sắp tới', '1800']) {
      expect(parseCvDate(raw, 'end')).toEqual({ kind: 'invalid' });
    }
  });
});

describe('mergeParsedCv', () => {
  it('chuẩn hóa kỹ năng, gộp công nghệ của experiences và projects, bỏ trùng', () => {
    const parsed = mergeParsedCv(extraction(), REFERENCE);

    expect(parsed.skills).toEqual(['NodeJS', 'NestJS', 'PostgreSQL', 'Docker', 'Prisma', 'Redis']);
    expect(parsed.experiences[0]!.technologies).toEqual(['NestJS', 'PostgreSQL', 'Prisma']);
    expect(parsed.projects[0]!.technologies).toEqual(['Redis', 'NodeJS']);
  });

  it('tính số năm bằng code từ experiences (đang làm tính đến ngày tham chiếu)', () => {
    expect(mergeParsedCv(extraction(), REFERENCE).totalYearsExperience).toBe(3.2);
  });

  it('gộp khoảng trùng nhau giữa các công việc', () => {
    const job = extraction().experiences[0]!;
    const parsed = mergeParsedCv(
      extraction({
        experiences: [
          { ...job, startDate: '2020-01', endDate: '2021-12' },
          { ...job, startDate: '06/2021', endDate: '12/2022' },
        ],
      }),
      REFERENCE,
    );

    expect(parsed.experiences.map((e) => [e.startDate, e.endDate])).toEqual([
      ['2020-01', '2021-12'],
      ['2021-06', '2022-12'],
    ]);
    expect(parsed.totalYearsExperience).toBe(3);
  });

  it('ngày kết thúc không đọc được: để null và KHÔNG tính như đang làm', () => {
    const job = extraction().experiences[0]!;
    const parsed = mergeParsedCv(
      extraction({ experiences: [{ ...job, startDate: '2020-01', endDate: 'không rõ' }] }),
      REFERENCE,
    );

    expect(parsed.experiences[0]).toMatchObject({ startDate: '2020-01', endDate: null });
    expect(parsed.totalYearsExperience).toBe(0);
  });

  it('bỏ mục rỗng, gọn khoảng trắng, chuỗi rỗng thành null', () => {
    const parsed = mergeParsedCv(
      extraction({
        summary: '   ',
        experiences: [
          {
            company: '  ',
            title: null,
            startDate: '2020-01',
            endDate: null,
            description: '',
            technologies: [],
          },
          {
            company: ' FPT   Software ',
            title: null,
            startDate: null,
            endDate: null,
            description: null,
            technologies: [],
          },
        ],
        education: [{ school: '', major: null, degree: ' ', graduationYear: 2020 }],
        projects: [{ name: null, role: 'Dev', technologies: ['Docker'], description: null }],
        certifications: ['IELTS 7.0', ' ielts 7.0 ', ''],
        languages: [],
      }),
      REFERENCE,
    );

    expect(parsed.summary).toBeNull();
    expect(parsed.experiences).toEqual([
      {
        company: 'FPT Software',
        title: null,
        startDate: null,
        endDate: null,
        description: null,
        technologies: [],
      },
    ]);
    expect(parsed.education).toEqual([]);
    expect(parsed.projects).toEqual([]);
    expect(parsed.certifications).toEqual(['IELTS 7.0']);
    expect(parsed.totalYearsExperience).toBe(0);
  });

  it('năm tốt nghiệp ngoài khoảng hợp lý thành null', () => {
    const parsed = mergeParsedCv(
      extraction({ education: [{ school: 'A', major: null, degree: null, graduationYear: 21 }] }),
      REFERENCE,
    );

    expect(parsed.education[0]!.graduationYear).toBeNull();
  });

  it('CV không có thông tin gì: mảng rỗng, trường đơn null, 0 năm', () => {
    const parsed = mergeParsedCv(CvExtractionSchema.parse({}), REFERENCE);

    expect(parsed).toEqual({
      schemaVersion: 1,
      summary: null,
      skills: [],
      experiences: [],
      education: [],
      projects: [],
      certifications: [],
      languages: [],
      totalYearsExperience: 0,
    });
  });

  it('kết quả luôn hợp lệ theo ParsedCvSchema', () => {
    const parsed = mergeParsedCv(extraction(), REFERENCE);

    expect(ParsedCvSchema.safeParse(parsed).success).toBe(true);
    expect(parsed.schemaVersion).toBe(1);
  });
});

describe('CvExtractionSchema', () => {
  it('đổi được sang JSON Schema để gửi Gemini, các trường đều không bắt buộc', () => {
    const jsonSchema = toGeminiJsonSchema(CvExtractionSchema) as {
      properties: Record<string, unknown>;
      required?: string[];
    };

    expect(Object.keys(jsonSchema.properties)).toEqual([
      'summary',
      'skills',
      'experiences',
      'education',
      'projects',
      'certifications',
      'languages',
    ]);
    expect(jsonSchema.required ?? []).toEqual([]);
  });
});

describe('CV_SYSTEM_INSTRUCTION', () => {
  it('nêu rõ: không bịa, không lấy thông tin cá nhân, text 2 cột có thể bị trộn, VI/EN', () => {
    expect(CV_SYSTEM_INSTRUCTION).toMatch(/never guess, infer or invent/i);
    expect(CV_SYSTEM_INSTRUCTION).toMatch(/never output personal data/i);
    expect(CV_SYSTEM_INSTRUCTION).toMatch(/two-column/i);
    expect(CV_SYSTEM_INSTRUCTION).toMatch(/Vietnamese or English/);
  });
});

describe('parseCv', () => {
  it('gọi generateStructured với temperature 0, system instruction và schema trích CV', async () => {
    const generateStructured = vi.fn(async () => extraction());
    const ai = { generateStructured } as unknown as AiClient;

    const parsed = await parseCv(ai, '  Nội dung CV  ', { ...REFERENCE, timeoutMs: 60_000 });

    expect(generateStructured).toHaveBeenCalledWith(
      buildCvPrompt('Nội dung CV'),
      CvExtractionSchema,
      { timeoutMs: 60_000, temperature: 0, systemInstruction: CV_SYSTEM_INSTRUCTION },
    );
    expect(parsed.totalYearsExperience).toBe(3.2);
  });

  it('text rỗng: ném CvExtractionError EMPTY, không gọi Gemini', async () => {
    const generateStructured = vi.fn();
    const ai = { generateStructured } as unknown as AiClient;

    const error = await parseCv(ai, ' \n ').catch((e: unknown) => e);

    expect(error).toBeInstanceOf(CvExtractionError);
    expect((error as CvExtractionError).code).toBe('EMPTY');
    expect(generateStructured).not.toHaveBeenCalled();
  });

  it('lỗi từ AI được ném ra nguyên vẹn để BE xử lý', async () => {
    const error = new Error('AI down');
    const ai = {
      generateStructured: vi.fn(async () => {
        throw error;
      }),
    } as unknown as AiClient;

    await expect(parseCv(ai, 'CV')).rejects.toBe(error);
  });
});
