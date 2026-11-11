import { describe, expect, it, vi } from 'vitest';
import type { AiClient } from './client.js';
import {
  buildJdPrompt,
  JD_SYSTEM_INSTRUCTION,
  JdExtractionSchema,
  mergeParsedJd,
  parseJd,
  ParsedJdSchema,
  type JdExtraction,
  type ParseJdInput,
} from './jd.js';

const INPUT: ParseJdInput = {
  title: 'Senior Backend NodeJS Developer',
  description:
    'Phát triển RESTful API bằng Node.js và NestJS, tối ưu PostgreSQL, đóng gói bằng Docker. ' +
    'Ưu tiên ứng viên biết Redis hoặc GraphQL.',
  requiredSkills: ['NodeJS', 'NestJS'],
  preferredSkills: ['GraphQL'],
  minYearsExperience: 3,
  level: 'Senior',
};

/** Kết quả AI giả, có thể ghi đè từng trường. */
function extraction(overrides: Partial<JdExtraction> = {}): JdExtraction {
  return {
    requiredSkills: ['Node.js', 'PostgreSQL', 'Docker', 'RESTful API'],
    preferredSkills: ['Redis', 'GraphQL'],
    minYearsExperience: 5,
    level: 'middle',
    educationRequirement: 'Tốt nghiệp đại học CNTT',
    responsibilities: ['Phát triển API', 'Tối ưu cơ sở dữ liệu'],
    domain: 'Backend Engineering',
    ...overrides,
  };
}

describe('mergeParsedJd', () => {
  it('giữ kỹ năng HR (đứng đầu), AI chỉ bổ sung, bỏ trùng theo alias', () => {
    const parsed = mergeParsedJd(INPUT, extraction());

    expect(parsed.requiredSkills).toEqual([
      'NodeJS',
      'NestJS',
      'PostgreSQL',
      'Docker',
      'RESTful API',
    ]);
    expect(parsed.preferredSkills).toEqual(['GraphQL', 'Redis']);
  });

  it('kỹ năng HR luôn được giữ kể cả khi AI không trả về, hoặc không có trong mô tả', () => {
    const parsed = mergeParsedJd(
      { ...INPUT, requiredSkills: ['Kubernetes', 'NodeJS'] },
      extraction({ requiredSkills: [], preferredSkills: [] }),
    );

    expect(parsed.requiredSkills).toEqual(['Kubernetes', 'NodeJS']);
    expect(parsed.preferredSkills).toEqual(['GraphQL']);
  });

  it('bỏ kỹ năng AI tự thêm mà mô tả không nhắc tới', () => {
    const parsed = mergeParsedJd(
      INPUT,
      extraction({ requiredSkills: ['PostgreSQL', 'Kubernetes'], preferredSkills: ['AWS'] }),
    );

    expect(parsed.requiredSkills).not.toContain('Kubernetes');
    expect(parsed.preferredSkills).not.toContain('AWS');
  });

  it('giữ đúng nhóm HR đã chọn: AI không đưa kỹ năng ưu tiên của HR lên bắt buộc', () => {
    const parsed = mergeParsedJd(INPUT, extraction({ requiredSkills: ['GraphQL', 'Docker'] }));

    expect(parsed.requiredSkills).not.toContain('GraphQL');
    expect(parsed.preferredSkills).toContain('GraphQL');
  });

  it('kỹ năng ở cả 2 nhóm thì chỉ giữ ở nhóm bắt buộc', () => {
    const parsed = mergeParsedJd(
      { ...INPUT, preferredSkills: [] },
      extraction({ requiredSkills: ['Docker'], preferredSkills: ['Docker', 'Redis'] }),
    );

    expect(parsed.requiredSkills).toContain('Docker');
    expect(parsed.preferredSkills).toEqual(['Redis']);
  });

  it('số năm và cấp độ của HR không bị AI ghi đè (kể cả HR nhập 0)', () => {
    expect(mergeParsedJd(INPUT, extraction())).toMatchObject({
      minYearsExperience: 3,
      level: 'senior',
    });
    expect(mergeParsedJd({ ...INPUT, minYearsExperience: 0 }, extraction())).toMatchObject({
      minYearsExperience: 0,
    });
  });

  it('cấp độ HR dạng chữ tự do được quy về mức thấp nhất', () => {
    expect(mergeParsedJd({ ...INPUT, level: 'Middle / Senior' }, extraction()).level).toBe(
      'middle',
    );
  });

  it('HR không nhập số năm / cấp độ (hoặc cấp độ không nhận ra) thì dùng của AI', () => {
    const parsed = mergeParsedJd(
      { ...INPUT, minYearsExperience: undefined, level: 'Nhân viên' },
      extraction(),
    );

    expect(parsed).toMatchObject({ minYearsExperience: 5, level: 'middle' });
  });

  it('cả HR và AI đều không có thì để null', () => {
    const parsed = mergeParsedJd(
      { title: 'Job', description: 'Mô tả' },
      extraction({ minYearsExperience: null, level: null, educationRequirement: '  ' }),
    );

    expect(parsed).toMatchObject({
      minYearsExperience: null,
      level: null,
      educationRequirement: null,
    });
  });

  it('trách nhiệm: bỏ rỗng, bỏ trùng, tối đa 8 ý', () => {
    const items = ['  A ', 'A', '', ...Array.from({ length: 10 }, (_, i) => `Việc ${i}`)];
    const parsed = mergeParsedJd(INPUT, extraction({ responsibilities: items }));

    expect(parsed.responsibilities).toHaveLength(8);
    expect(parsed.responsibilities.slice(0, 2)).toEqual(['A', 'Việc 0']);
  });

  it('domain rỗng thì dùng tiêu đề; kết quả luôn hợp lệ theo ParsedJdSchema', () => {
    const parsed = mergeParsedJd(INPUT, extraction({ domain: ' ' }));

    expect(parsed.domain).toBe(INPUT.title);
    expect(ParsedJdSchema.safeParse(parsed).success).toBe(true);
    expect(parsed.schemaVersion).toBe(1);
  });

  it('nhận ra kỹ năng nằm trong phần yêu cầu (requirements)', () => {
    const parsed = mergeParsedJd(
      {
        title: 'Data Analyst',
        description: 'Phân tích số liệu bán hàng.',
        requirements: 'Thành thạo Power BI',
      },
      extraction({ requiredSkills: ['Power BI'], preferredSkills: [] }),
    );

    expect(parsed.requiredSkills).toEqual(['PowerBI']);
  });
});

describe('buildJdPrompt', () => {
  it('có tiêu đề, mô tả và yêu cầu (nếu có)', () => {
    const prompt = buildJdPrompt({ ...INPUT, requirements: 'Có 3 năm kinh nghiệm' });

    expect(prompt).toContain(INPUT.title);
    expect(prompt).toContain(INPUT.description);
    expect(prompt).toContain('Requirements:\nCó 3 năm kinh nghiệm');
    expect(buildJdPrompt(INPUT)).not.toContain('Requirements:');
  });
});

describe('parseJd', () => {
  it('gọi generateStructured với temperature 0, system instruction và schema trích JD', async () => {
    const generateStructured = vi.fn(async () => extraction());
    const ai = { models: {}, generateText: vi.fn(), generateStructured } as unknown as AiClient;

    const parsed = await parseJd(ai, INPUT, { timeoutMs: 10_000 });

    expect(generateStructured).toHaveBeenCalledWith(buildJdPrompt(INPUT), JdExtractionSchema, {
      timeoutMs: 10_000,
      temperature: 0,
      systemInstruction: JD_SYSTEM_INSTRUCTION,
    });
    expect(parsed.requiredSkills[0]).toBe('NodeJS');
  });

  it('lỗi từ AI được ném ra nguyên vẹn để BE xử lý', async () => {
    const error = new Error('AI down');
    const ai = {
      generateStructured: vi.fn(async () => {
        throw error;
      }),
    } as unknown as AiClient;

    await expect(parseJd(ai, INPUT)).rejects.toBe(error);
  });
});
