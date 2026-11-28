import {
  generateQuestionPlan,
  MAX_INTERVIEW_QUESTIONS,
  MIN_INTERVIEW_QUESTIONS,
  ParsedCvSchema,
  ParsedJdSchema,
  type AiClient,
  type ParsedCv,
  type ParsedJd,
  type QuestionPlanCompany,
} from '@hireflow/ai';
import { Inject, Injectable, Logger } from '@nestjs/common';
import { AI_CLIENT } from '../../shared/ai/ai.constant.js';
import { CompanyService } from '../company/company.service.js';
import type { PlannedQuestion, QuestionPlanInput, QuestionPlanner } from './interviews.type.js';

@Injectable()
export class AiQuestionPlannerService implements QuestionPlanner {
  private readonly logger = new Logger(AiQuestionPlannerService.name);

  constructor(
    @Inject(AI_CLIENT)
    private readonly aiClient: AiClient,
    private readonly companyService: CompanyService,
  ) {}

  async generateQuestionPlan(input: QuestionPlanInput): Promise<PlannedQuestion[]> {
    const count = Math.min(
      Math.max(Math.trunc(input.questionCount || MIN_INTERVIEW_QUESTIONS), MIN_INTERVIEW_QUESTIONS),
      MAX_INTERVIEW_QUESTIONS,
    );

    const plan = await generateQuestionPlan(
      this.aiClient,
      {
        parsedJd: this.resolveParsedJd(input),
        parsedCv: this.resolveParsedCv(input),
        missingSkills: input.missingSkills,
        count,
        jobTitle: input.jobTitle,
        company: await this.resolveCompany(),
      },
      { logger: this.logger },
    );

    return plan.map((item) => ({
      question: item.question,
      questionType: item.type,
      targetSkill: item.targetSkill,
    }));
  }

  /**
   * Thông tin công ty giúp câu hỏi tình huống sát bối cảnh doanh nghiệp.
   * Không bắt buộc: chưa cấu hình hoặc lỗi thì vẫn sinh câu hỏi như cũ (chỉ ghi log).
   */
  private async resolveCompany(): Promise<QuestionPlanCompany | null> {
    try {
      const company = await this.companyService.getCompany();
      return {
        name: company.name,
        industry: company.industry,
        description: company.description,
        culture: company.culture,
      };
    } catch (error) {
      const reason = error instanceof Error ? error.message : String(error);
      this.logger.warn(`Bỏ qua thông tin công ty khi sinh câu hỏi phỏng vấn: ${reason}`);
      return null;
    }
  }

  private resolveParsedJd(input: QuestionPlanInput): ParsedJd {
    const parsed = ParsedJdSchema.safeParse(input.parsedJd);
    if (parsed.success) {
      return parsed.data;
    }

    return {
      schemaVersion: 1,
      requiredSkills: input.requiredSkills.map((s) => s.trim()).filter(Boolean),
      preferredSkills: input.preferredSkills.map((s) => s.trim()).filter(Boolean),
      minYearsExperience: null,
      level: null,
      educationRequirement: null,
      responsibilities: [],
      domain: input.jobTitle.trim() || 'General',
    };
  }

  private resolveParsedCv(input: QuestionPlanInput): ParsedCv {
    const parsed = ParsedCvSchema.safeParse(input.parsedCv);
    if (parsed.success) {
      return parsed.data;
    }

    return {
      schemaVersion: 1,
      summary: null,
      skills: [],
      experiences: [],
      education: [],
      projects: [],
      certifications: [],
      languages: [],
      totalYearsExperience: 0,
    };
  }
}

@Injectable()
export class FallbackQuestionPlannerService implements QuestionPlanner {
  async generateQuestionPlan(input: QuestionPlanInput): Promise<PlannedQuestion[]> {
    const count = Math.min(Math.max(input.questionCount || 3, 1), 5);
    const primarySkill = input.requiredSkills[0] ?? input.jobTitle;
    const secondarySkill = input.missingSkills[0] ?? input.requiredSkills[1] ?? null;
    const preferredSkill = input.preferredSkills[0] ?? input.requiredSkills[2] ?? null;

    const pool: PlannedQuestion[] = [
      {
        question: `Hãy giới thiệu ngắn gọn về dự án gần nhất bạn trực tiếp tham gia có liên quan đến vị trí ${input.jobTitle} và vai trò cụ thể của bạn trong dự án đó.`,
        questionType: 'EXPERIENCE',
        targetSkill: primarySkill,
      },
      {
        question: secondarySkill
          ? `Trong vị trí ${input.jobTitle}, kỹ năng ${secondarySkill} rất quan trọng. Bạn đã từng áp dụng hoặc tìm hiểu về ${secondarySkill} trong thực tế như thế nào?`
          : `Hãy mô tả một thách thức kỹ thuật khó nhất bạn từng giải quyết khi làm việc với ${primarySkill}.`,
        questionType: 'TECHNICAL',
        targetSkill: secondarySkill ?? primarySkill,
      },
      {
        question: `Khi hệ thống gặp sự cố bất ngờ sát hạn bàn giao ở vai trò ${input.jobTitle}, bạn ưu tiên khoanh vùng nguyên nhân và phối hợp với nhóm như thế nào?`,
        questionType: 'SITUATIONAL',
        targetSkill: null,
      },
      {
        question: preferredSkill
          ? `Bạn đánh giá vai trò của ${preferredSkill} trong việc tối ưu hiệu năng hoặc chất lượng công việc ở vị trí ${input.jobTitle} như thế nào?`
          : `Nếu được cải tiến lại kiến trúc hoặc quy trình ở dự án gần nhất của bạn, bạn sẽ thay đổi điều gì đầu tiên?`,
        questionType: 'TECHNICAL',
        targetSkill: preferredSkill,
      },
      {
        question: `Bạn kỳ vọng học hỏi hoặc đóng góp điều gì trong 6 tháng đầu tiên nếu đồng hành cùng đội ngũ ở vị trí ${input.jobTitle}?`,
        questionType: 'SITUATIONAL',
        targetSkill: null,
      },
    ];

    return pool.slice(0, count);
  }
}
