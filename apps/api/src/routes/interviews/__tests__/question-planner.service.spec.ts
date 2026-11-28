import * as aiPkg from '@hireflow/ai';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AiQuestionPlannerService } from '../question-planner.service.js';

describe('AiQuestionPlannerService', () => {
  const aiClient = {
    generateText: vi.fn(),
    generateStructured: vi.fn(),
    embed: vi.fn(),
  } as unknown as aiPkg.AiClient;

  let service: AiQuestionPlannerService;

  beforeEach(() => {
    vi.restoreAllMocks();
    service = new AiQuestionPlannerService(aiClient);
  });

  it('gọi generateQuestionPlan từ @hireflow/ai với parsedJd/parsedCv hợp lệ và map về PlannedQuestion[]', async () => {
    const spy = vi.spyOn(aiPkg, 'generateQuestionPlan').mockResolvedValueOnce([
      {
        order: 1,
        question: 'Bạn tối ưu truy vấn PostgreSQL chậm như thế nào?',
        type: 'TECHNICAL',
        targetSkill: 'PostgreSQL',
      },
      {
        order: 2,
        question: 'Trong dự án HireFlow, bạn phụ trách phần kiến trúc nào?',
        type: 'EXPERIENCE',
        targetSkill: 'NodeJS',
      },
      {
        order: 3,
        question: 'Bạn sẽ xử lý ra sao nếu API tăng tải đột biến?',
        type: 'SITUATIONAL',
        targetSkill: 'Redis',
      },
    ]);

    const parsedJd: aiPkg.ParsedJd = {
      schemaVersion: 1,
      requiredSkills: ['NodeJS', 'PostgreSQL'],
      preferredSkills: ['Redis'],
      minYearsExperience: 2,
      level: 'middle',
      educationRequirement: null,
      responsibilities: ['Xây dựng API backend'],
      domain: 'Backend Engineering',
    };
    const parsedCv: aiPkg.ParsedCv = {
      schemaVersion: 1,
      summary: 'Backend developer 3 năm kinh nghiệm',
      skills: ['NodeJS', 'PostgreSQL'],
      experiences: [],
      education: [],
      projects: [],
      certifications: [],
      languages: [],
      totalYearsExperience: 3,
    };

    const result = await service.generateQuestionPlan({
      jobTitle: 'Backend Engineer',
      requiredSkills: ['NodeJS', 'PostgreSQL'],
      preferredSkills: ['Redis'],
      parsedJd,
      parsedCv,
      questionCount: 3,
      missingSkills: ['Redis'],
    });

    expect(spy).toHaveBeenCalledWith(
      aiClient,
      {
        parsedJd,
        parsedCv,
        missingSkills: ['Redis'],
        count: 3,
        jobTitle: 'Backend Engineer',
      },
      expect.objectContaining({ logger: expect.anything() }),
    );
    expect(result).toEqual([
      {
        question: 'Bạn tối ưu truy vấn PostgreSQL chậm như thế nào?',
        questionType: 'TECHNICAL',
        targetSkill: 'PostgreSQL',
      },
      {
        question: 'Trong dự án HireFlow, bạn phụ trách phần kiến trúc nào?',
        questionType: 'EXPERIENCE',
        targetSkill: 'NodeJS',
      },
      {
        question: 'Bạn sẽ xử lý ra sao nếu API tăng tải đột biến?',
        questionType: 'SITUATIONAL',
        targetSkill: 'Redis',
      },
    ]);
  });

  it('chuẩn hóa fallback parsedJd/parsedCv và giới hạn count về [3, 5] khi dữ liệu cũ bị thiếu', async () => {
    const spy = vi.spyOn(aiPkg, 'generateQuestionPlan').mockResolvedValueOnce([
      { order: 1, question: 'Q1', type: 'TECHNICAL', targetSkill: 'NestJS' },
      { order: 2, question: 'Q2', type: 'TECHNICAL', targetSkill: 'SQL' },
      { order: 3, question: 'Q3', type: 'SITUATIONAL', targetSkill: 'Debugging' },
    ]);

    await service.generateQuestionPlan({
      jobTitle: 'Backend NestJS',
      requiredSkills: ['NestJS', 'SQL'],
      preferredSkills: ['Docker'],
      parsedJd: null,
      parsedCv: { invalid: true },
      questionCount: 1,
      missingSkills: ['Docker'],
    });

    const callInput = spy.mock.calls[0][1];
    expect(callInput.count).toBe(3);
    expect(callInput.parsedJd).toEqual({
      schemaVersion: 1,
      requiredSkills: ['NestJS', 'SQL'],
      preferredSkills: ['Docker'],
      minYearsExperience: null,
      level: null,
      educationRequirement: null,
      responsibilities: [],
      domain: 'Backend NestJS',
    });
    expect(callInput.parsedCv.schemaVersion).toBe(1);
    expect(callInput.parsedCv.skills).toEqual([]);
  });

  it('ném lại lỗi từ generateQuestionPlan để InterviewsService giữ INTERVIEW_INVITED', async () => {
    vi.spyOn(aiPkg, 'generateQuestionPlan').mockRejectedValueOnce(new Error('Gemini rate limit'));

    await expect(
      service.generateQuestionPlan({
        jobTitle: 'Backend Engineer',
        requiredSkills: ['NodeJS'],
        preferredSkills: [],
        parsedJd: null,
        parsedCv: null,
        questionCount: 3,
        missingSkills: [],
      }),
    ).rejects.toThrow('Gemini rate limit');
  });
});
