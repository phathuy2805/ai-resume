import { Injectable } from '@nestjs/common';
import type { PlannedQuestion, QuestionPlanInput, QuestionPlanner } from './interviews.type.js';

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
