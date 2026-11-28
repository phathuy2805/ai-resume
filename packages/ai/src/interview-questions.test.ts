import { describe, expect, it, vi } from 'vitest';
import type { AiClient } from './client.js';
import { PARSED_CV_SCHEMA_VERSION, type ParsedCv } from './cv.js';
import { AiInvalidResponseError, AiRateLimitError } from './errors.js';
import {
  buildQuestionPlanPrompt,
  generateQuestionPlan,
  QUESTION_PLAN_MAX_ATTEMPTS,
  QUESTION_PLAN_SYSTEM_INSTRUCTION,
  QUESTION_PLAN_TEMPERATURE,
  QuestionPlanResponseSchema,
  questionTypeMix,
  selectQuestions,
  type GenerateQuestionPlanInput,
  type QuestionPlanResponse,
} from './interview-questions.js';
import { PARSED_JD_SCHEMA_VERSION, type ParsedJd } from './jd.js';
import type { AiLogger } from './logger.js';

const JD: ParsedJd = {
  schemaVersion: PARSED_JD_SCHEMA_VERSION,
  requiredSkills: ['NodeJS', 'NestJS', 'PostgreSQL', 'Docker'],
  preferredSkills: ['Redis'],
  minYearsExperience: 2,
  level: 'middle',
  educationRequirement: 'Tốt nghiệp đại học ngành CNTT',
  responsibilities: ['Phát triển RESTful API', 'Tối ưu truy vấn cơ sở dữ liệu'],
  domain: 'Backend Engineering',
};

const CV: ParsedCv = {
  schemaVersion: PARSED_CV_SCHEMA_VERSION,
  summary: 'Backend developer 3 năm kinh nghiệm.',
  skills: ['NodeJS', 'NestJS', 'PostgreSQL', 'TypeScript'],
  experiences: [
    {
      company: 'Công ty ABC',
      title: 'Backend Developer',
      startDate: '2022-01',
      endDate: null,
      description: 'Xây dựng API thanh toán phục vụ 2 triệu người dùng.',
      technologies: ['NestJS', 'PostgreSQL'],
    },
  ],
  education: [
    { school: 'Đại học Bách khoa', major: 'CNTT', degree: 'Kỹ sư', graduationYear: 2021 },
  ],
  projects: [
    {
      name: 'Shop Online',
      role: 'Team lead',
      technologies: ['NodeJS'],
      description: 'Website bán hàng.',
    },
  ],
  certifications: ['AWS Certified Developer'],
  languages: ['Tiếng Anh'],
  totalYearsExperience: 3,
};

function input(overrides: Partial<GenerateQuestionPlanInput> = {}): GenerateQuestionPlanInput {
  return {
    parsedJd: JD,
    parsedCv: CV,
    missingSkills: ['Docker'],
    count: 4,
    jobTitle: 'Backend Developer (NestJS)',
    ...overrides,
  };
}

type Question = QuestionPlanResponse['questions'][number];

const Q_NEST: Question = {
  targetSkill: 'NestJS',
  type: 'TECHNICAL',
  question: 'Bạn phân biệt guard và interceptor trong NestJS như thế nào?',
};
const Q_DOCKER: Question = {
  targetSkill: 'Docker',
  type: 'TECHNICAL',
  question: 'Bạn sẽ đóng gói một ứng dụng NodeJS bằng Docker như thế nào?',
};
const Q_EXP: Question = {
  targetSkill: 'PostgreSQL',
  type: 'EXPERIENCE',
  question: 'Ở Công ty ABC, bạn đã tối ưu truy vấn cho API thanh toán ra sao?',
};
const Q_SIT: Question = {
  targetSkill: 'Giải quyết vấn đề',
  type: 'SITUATIONAL',
  question: 'Nếu API production đột nhiên chậm gấp năm lần, bạn sẽ điều tra thế nào?',
};
const Q_REDIS: Question = {
  targetSkill: 'Redis',
  type: 'TECHNICAL',
  question: 'Bạn dùng cache để giảm tải cho cơ sở dữ liệu khi nào?',
};

function fakeAi(...responses: Question[][]) {
  const generateStructured = vi.fn();
  for (const questions of responses) generateStructured.mockResolvedValueOnce({ questions });
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

describe('questionTypeMix', () => {
  it.each([
    [3, { TECHNICAL: 2, SITUATIONAL: 0, EXPERIENCE: 1 }],
    [4, { TECHNICAL: 2, SITUATIONAL: 1, EXPERIENCE: 1 }],
    [5, { TECHNICAL: 3, SITUATIONAL: 1, EXPERIENCE: 1 }],
  ])('count %i → khoảng một nửa TECHNICAL', (count, mix) => {
    expect(questionTypeMix(count)).toEqual(mix);
  });
});

describe('buildQuestionPlanPrompt', () => {
  const prompt = buildQuestionPlanPrompt(input());

  it('có số câu, tỷ lệ loại câu, tên vị trí, kỹ năng còn thiếu', () => {
    expect(prompt).toContain('Number of questions: 4');
    expect(prompt).toContain('2 TECHNICAL, 1 SITUATIONAL, 1 EXPERIENCE');
    expect(prompt).toContain('Title: Backend Developer (NestJS)');
    expect(prompt).toContain('MISSING REQUIRED SKILLS\n- Docker');
  });

  it('có công việc và dự án của CV', () => {
    expect(prompt).toContain('Backend Developer at Công ty ABC [NestJS, PostgreSQL]');
    expect(prompt).toContain('Shop Online – Team lead');
  });

  it('không gửi học vấn, chứng chỉ, ngôn ngữ, yêu cầu bằng cấp', () => {
    expect(prompt).not.toContain('Bách khoa');
    expect(prompt).not.toContain('AWS Certified');
    expect(prompt).not.toContain('Tiếng Anh');
    expect(prompt).not.toContain('Tốt nghiệp đại học');
  });

  it('không thiếu kỹ năng nào → "none"; không có tên vị trí thì bỏ dòng Title', () => {
    const p = buildQuestionPlanPrompt(input({ missingSkills: [], jobTitle: null }));
    expect(p).toContain('MISSING REQUIRED SKILLS\nnone');
    expect(p).not.toContain('Title:');
  });

  it('cắt mô tả dài', () => {
    const long = 'a'.repeat(1000);
    const cv = { ...CV, experiences: [{ ...CV.experiences[0]!, description: long }] };
    expect(buildQuestionPlanPrompt(input({ parsedCv: cv }))).not.toContain(long);
  });

  it('không có company → không có phần COMPANY', () => {
    expect(prompt).not.toContain('COMPANY');
  });

  it('có company → phần COMPANY đứng trước JOB, bỏ dòng trống, cắt giới thiệu dài', () => {
    const longAbout = 'b'.repeat(1000);
    const p = buildQuestionPlanPrompt(
      input({
        company: {
          name: ' Lumora Tech ',
          industry: 'Thương mại điện tử',
          description: longAbout,
          culture: '  ',
        },
      }),
    );
    expect(p).toMatch(
      /COMPANY\nName: Lumora Tech\nIndustry: Thương mại điện tử\nAbout: b+…\n\nJOB/,
    );
    expect(p).not.toContain(longAbout);
    expect(p).not.toContain('Culture:');
  });

  it('company không có tên → bỏ qua phần COMPANY', () => {
    expect(buildQuestionPlanPrompt(input({ company: { name: '  ' } }))).not.toContain('COMPANY');
  });

  it('thêm NOTE khi gọi lại', () => {
    expect(buildQuestionPlanPrompt(input(), 'Return exactly 4.')).toMatch(
      /NOTE\nReturn exactly 4\.$/,
    );
  });
});

describe('QuestionPlanResponseSchema', () => {
  it('không nhận type ngoài 3 loại', () => {
    const result = QuestionPlanResponseSchema.safeParse({
      questions: [{ ...Q_NEST, type: 'BEHAVIORAL' }],
    });
    expect(result.success).toBe(false);
  });
});

describe('selectQuestions', () => {
  it('đánh lại order 1..n theo thứ tự Gemini trả', () => {
    const { plan } = selectQuestions([Q_NEST, Q_DOCKER, Q_EXP, Q_SIT], input());
    expect(plan.map((item) => item.order)).toEqual([1, 2, 3, 4]);
    expect(plan[0]).toEqual({ order: 1, ...Q_NEST });
  });

  it('bỏ câu rỗng và câu trùng (khác hoa thường, khoảng trắng)', () => {
    const dup = { ...Q_NEST, question: `  ${Q_NEST.question.toUpperCase()}  ` };
    const empty = { ...Q_SIT, question: '   ' };
    const result = selectQuestions([Q_NEST, dup, empty, Q_DOCKER], input());
    expect(result.usable).toBe(2);
    expect(result.plan).toHaveLength(2);
  });

  it('gộp khoảng trắng trong câu hỏi', () => {
    const q = { ...Q_SIT, question: 'Nếu API   chậm,\n bạn làm gì?' };
    expect(selectQuestions([q], input()).plan[0]!.question).toBe('Nếu API chậm, bạn làm gì?');
  });

  it('thừa câu → cắt về count', () => {
    const { plan, usable } = selectQuestions([Q_DOCKER, Q_NEST, Q_EXP, Q_SIT, Q_REDIS], input());
    expect(usable).toBe(5);
    expect(plan.map((item) => item.targetSkill)).toEqual([
      'Docker',
      'NestJS',
      'PostgreSQL',
      'Giải quyết vấn đề',
    ]);
  });

  it('câu về kỹ năng còn thiếu nằm ở phần bị cắt → thay câu cuối bằng câu đó', () => {
    const result = selectQuestions([Q_NEST, Q_EXP, Q_SIT, Q_REDIS, Q_DOCKER], input());
    expect(result.coversMissingSkill).toBe(true);
    expect(result.plan.map((item) => item.targetSkill)).toEqual([
      'NestJS',
      'PostgreSQL',
      'Giải quyết vấn đề',
      'Docker',
    ]);
    expect(result.plan[3]!.order).toBe(4);
  });

  it('targetSkill được đưa về tên chuẩn của JD', () => {
    const q = { ...Q_NEST, targetSkill: 'node.js' };
    const jd = { ...JD, requiredSkills: ['Node.js'] };
    expect(selectQuestions([q], input({ parsedJd: jd })).plan[0]!.targetSkill).toBe('NodeJS');
  });

  it('targetSkill ngoài JD giữ nguyên; rỗng thì dùng domain của JD', () => {
    const { plan } = selectQuestions([Q_SIT, { ...Q_EXP, targetSkill: '  ' }], input());
    expect(plan[0]!.targetSkill).toBe('Giải quyết vấn đề');
    expect(plan[1]!.targetSkill).toBe('Backend Engineering');
  });

  it('nhận ra câu về kỹ năng còn thiếu qua nội dung câu hỏi dù targetSkill khác', () => {
    const q = { ...Q_DOCKER, targetSkill: 'Triển khai' };
    expect(selectQuestions([q], input({ count: 3 })).coversMissingSkill).toBe(true);
  });

  it('không thiếu kỹ năng nào → coversMissingSkill luôn true', () => {
    expect(selectQuestions([Q_NEST], input({ missingSkills: [] })).coversMissingSkill).toBe(true);
  });
});

describe('generateQuestionPlan', () => {
  it('gọi Gemini 1 lần với prompt, schema, temperature, system instruction', async () => {
    const { ai, generateStructured } = fakeAi([Q_NEST, Q_DOCKER, Q_EXP, Q_SIT]);
    const plan = await generateQuestionPlan(ai, input(), { timeoutMs: 5000, logger: fakeLogger() });

    expect(plan).toHaveLength(4);
    expect(generateStructured).toHaveBeenCalledTimes(1);
    expect(generateStructured).toHaveBeenCalledWith(
      buildQuestionPlanPrompt(input()),
      QuestionPlanResponseSchema,
      {
        timeoutMs: 5000,
        temperature: QUESTION_PLAN_TEMPERATURE,
        systemInstruction: QUESTION_PLAN_SYSTEM_INSTRUCTION,
      },
    );
  });

  it.each([2, 6, 3.5, Number.NaN])('count = %s → RangeError, không gọi Gemini', async (count) => {
    const { ai, generateStructured } = fakeAi();
    await expect(generateQuestionPlan(ai, input({ count }))).rejects.toBeInstanceOf(RangeError);
    expect(generateStructured).not.toHaveBeenCalled();
  });

  it('thiếu câu → gọi lại 1 lần có NOTE, lần 2 đủ thì dùng', async () => {
    const logger = fakeLogger();
    const { ai, generateStructured } = fakeAi([Q_DOCKER, Q_NEST], [Q_DOCKER, Q_NEST, Q_EXP, Q_SIT]);
    const plan = await generateQuestionPlan(ai, input(), { logger });

    expect(plan).toHaveLength(4);
    expect(generateStructured).toHaveBeenCalledTimes(2);
    expect(generateStructured.mock.calls[1]![0]).toContain('only 2 usable questions');
    expect(logger.warn).toHaveBeenCalledWith(expect.stringContaining('got 2/4'));
  });

  it('2 lần đều thiếu câu → AiInvalidResponseError', async () => {
    const { ai, generateStructured } = fakeAi([Q_NEST], [Q_NEST, Q_EXP]);
    const error = await generateQuestionPlan(ai, input(), { logger: fakeLogger() }).catch(
      (e: unknown) => e,
    );

    expect(error).toBeInstanceOf(AiInvalidResponseError);
    expect((error as AiInvalidResponseError).attempts).toBe(QUESTION_PLAN_MAX_ATTEMPTS);
    expect((error as AiInvalidResponseError).issues).toEqual([
      'questions: expected 4 usable questions, got 2',
    ]);
    expect(generateStructured).toHaveBeenCalledTimes(2);
  });

  it('không có câu về kỹ năng còn thiếu → gọi lại, lần 2 có thì dùng lần 2', async () => {
    const { ai, generateStructured } = fakeAi(
      [Q_NEST, Q_EXP, Q_SIT, Q_REDIS],
      [Q_NEST, Q_DOCKER, Q_EXP, Q_SIT],
    );
    const plan = await generateQuestionPlan(ai, input(), { logger: fakeLogger() });

    expect(plan.map((item) => item.targetSkill)).toContain('Docker');
    expect(generateStructured.mock.calls[1]![0]).toContain('MISSING REQUIRED SKILLS. Include');
  });

  it('2 lần đều không có câu về kỹ năng còn thiếu → vẫn dùng, ghi log', async () => {
    const logger = fakeLogger();
    const first = [Q_NEST, Q_EXP, Q_SIT, Q_REDIS];
    const { ai } = fakeAi(first, [Q_NEST, Q_SIT, Q_EXP, Q_REDIS]);
    const plan = await generateQuestionPlan(ai, input(), { logger });

    expect(plan).toHaveLength(4);
    expect(plan.map((item) => item.targetSkill)).not.toContain('Docker');
    expect(logger.warn).toHaveBeenCalledWith(
      expect.stringContaining('without a missing required skill question'),
    );
  });

  it('lần 1 đủ câu nhưng thiếu câu kỹ năng, lần 2 thiếu câu → dùng kết quả lần 1', async () => {
    const first = [Q_NEST, Q_EXP, Q_SIT, Q_REDIS];
    const { ai } = fakeAi(first, [Q_NEST]);
    const plan = await generateQuestionPlan(ai, input(), { logger: fakeLogger() });
    expect(plan.map(({ order: _order, ...rest }) => rest)).toEqual(first);
  });

  it('câu quá 30 từ → chỉ ghi log, vẫn giữ', async () => {
    const logger = fakeLogger();
    const long = { ...Q_SIT, question: Array.from({ length: 35 }, () => 'từ').join(' ') };
    const { ai } = fakeAi([Q_NEST, Q_DOCKER, Q_EXP, long]);
    const plan = await generateQuestionPlan(ai, input(), { logger });

    expect(plan).toHaveLength(4);
    expect(logger.warn).toHaveBeenCalledWith(expect.stringContaining('1/4 questions over 30'));
  });

  it('lỗi của client (429) được ném ra nguyên vẹn', async () => {
    const generateStructured = vi.fn().mockRejectedValue(new AiRateLimitError());
    const ai = { generateStructured } as unknown as AiClient;
    await expect(generateQuestionPlan(ai, input())).rejects.toBeInstanceOf(AiRateLimitError);
    expect(generateStructured).toHaveBeenCalledTimes(1);
  });
});
