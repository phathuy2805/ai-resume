import type { Explanation, ScoreBreakdown, ScreeningTimings } from '@hireflow/ai';
import {
  AiRecommendation,
  ApplicationStatus,
} from '../../shared/constants/application-status.enum.js';
import type { ApplicationModel } from '../../shared/models/application.model.js';
import type {
  ApplicationSummary,
  ApplyDecisionResult,
  HrApplicationDetail,
  HrApplicationListItem,
  JobStatsRow,
  MyApplicationRow,
} from './applications.repository.js';
import type {
  DecisionResType,
  GetApplicationDetailResType,
  GetJobStatsResType,
  JobApplicationListItemType,
  MyApplicationResType,
} from './applications.schema.js';

// ==================== Candidate Mappers ====================

type CandidateApplicationRow = Omit<MyApplicationRow, 'interview'> & {
  interview?: { id: string } | null;
};

/**
 * Hồ sơ trả cho ứng viên. Chọn từng trường để không bao giờ lộ cvText, cvS3Key, parsedCv,
 * ghi chú của HR...
 */
export function toApplicationDto(app: ApplicationSummary): ApplicationModel {
  return {
    id: app.id,
    status: app.status as ApplicationStatus,
    job: { id: app.job.id, title: app.job.title },
    cvFileName: app.cvFileName,
    cvSizeBytes: app.cvSizeBytes,
    cvMimeType: app.cvMimeType,
    aiRecommendation: (app.aiRecommendation as AiRecommendation | null) ?? null,
    createdAt: app.createdAt.toISOString(),
    updatedAt: app.updatedAt.toISOString(),
  };
}

export function toMyApplicationDto(app: CandidateApplicationRow): MyApplicationResType {
  return {
    ...toApplicationDto(app),
    interviewId: app.interview?.id ?? null,
  };
}

// ==================== HR Application List & Detail Mappers ====================

export function toJobApplicationListItem(item: HrApplicationListItem): JobApplicationListItemType {
  return {
    id: item.id,
    candidateName: item.candidate.fullName,
    totalScore: item.screeningResult?.totalScore ?? null,
    aiRecommendation: (item.aiRecommendation as AiRecommendation | null) ?? null,
    status: item.status as ApplicationStatus,
    createdAt: item.createdAt.toISOString(),
  };
}

export function toApplicationDetailDto(app: HrApplicationDetail): GetApplicationDetailResType {
  return {
    id: app.id,
    status: app.status as ApplicationStatus,
    cvFileName: app.cvFileName,
    cvSizeBytes: app.cvSizeBytes,
    cvMimeType: app.cvMimeType,
    aiRecommendation: (app.aiRecommendation as AiRecommendation | null) ?? null,
    screeningError: app.screeningError ?? null,
    candidate: app.candidate,
    job: {
      id: app.job.id,
      title: app.job.title,
      cvPassThreshold: app.job.cvPassThreshold,
    },
    screeningResult: app.screeningResult
      ? {
          totalScore: app.screeningResult.totalScore,
          breakdown: app.screeningResult.breakdown as unknown as ScoreBreakdown,
          explanation: app.screeningResult.explanation as unknown as Explanation,
          timings: app.screeningResult.timings as unknown as ScreeningTimings,
          processingDurationMs: app.screeningResult.processingDurationMs,
          createdAt: app.screeningResult.createdAt.toISOString(),
          updatedAt: app.screeningResult.updatedAt.toISOString(),
        }
      : null,
    hrDecisionBy: app.hrDecisionBy ?? null,
    hrDecisionAt: app.hrDecisionAt ? app.hrDecisionAt.toISOString() : null,
    hrNote: app.hrNote ?? null,
    interviewId: app.interview?.id ?? null,
    statusHistories: app.statusHistories.map((history) => ({
      id: history.id,
      fromStatus: (history.fromStatus as ApplicationStatus | null) ?? null,
      toStatus: history.toStatus as ApplicationStatus,
      changedById: history.changedById ?? null,
      reason: history.reason ?? null,
      changedAt: history.changedAt.toISOString(),
    })),
    createdAt: app.createdAt.toISOString(),
    updatedAt: app.updatedAt.toISOString(),
  };
}

// ==================== HR Decision Mapper ====================

export function toDecisionDto(result: ApplyDecisionResult): DecisionResType {
  return {
    id: result.id,
    status: result.status,
    interviewId: result.interviewId,
    hrDecisionById: result.hrDecisionById,
    hrDecisionAt: result.hrDecisionAt.toISOString(),
    hrNote: result.hrNote,
  };
}

// ==================== HR Job Stats Mapper ====================

const SCORE_RANGES: ReadonlyArray<{ range: string; min: number; max: number }> = [
  { range: '0-9', min: 0, max: 9 },
  { range: '10-19', min: 10, max: 19 },
  { range: '20-29', min: 20, max: 29 },
  { range: '30-39', min: 30, max: 39 },
  { range: '40-49', min: 40, max: 49 },
  { range: '50-59', min: 50, max: 59 },
  { range: '60-69', min: 60, max: 69 },
  { range: '70-79', min: 70, max: 79 },
  { range: '80-89', min: 80, max: 89 },
  { range: '90-100', min: 90, max: 100 },
];

const APPROVED_POST_SCREENING_STATUSES = new Set<string>([
  ApplicationStatus.SHORTLISTED,
  ApplicationStatus.INTERVIEW_INVITED,
  ApplicationStatus.INTERVIEWING,
  ApplicationStatus.EVALUATED,
  ApplicationStatus.PASSED,
  ApplicationStatus.FAILED,
]);

export function toJobStatsDto(rows: JobStatsRow[]): GetJobStatsResType {
  const byStatus = Object.fromEntries(
    Object.values(ApplicationStatus).map((status) => [status, 0]),
  ) as Record<ApplicationStatus, number>;

  const bucketCounts = SCORE_RANGES.map((bucket) => ({
    range: bucket.range,
    count: 0,
  }));

  const byRecommendation = {
    PASS: 0,
    CONSIDER: 0,
    REJECT: 0,
    unrated: 0,
  };

  let screenedCount = 0;
  // Chỉ đếm các hồ sơ HR đã chốt và AI đề xuất rõ PASS/REJECT (bỏ qua CONSIDER)
  let hrAndAiDecidedCount = 0;
  let hrAgreedCount = 0;

  for (const row of rows) {
    if (row.status in byStatus) {
      byStatus[row.status as ApplicationStatus] += 1;
    }

    const score = row.screeningResult?.totalScore;
    if (typeof score === 'number') {
      screenedCount += 1;
      const bucketIdx = Math.min(Math.floor(score / 10), SCORE_RANGES.length - 1);
      if (bucketIdx >= 0) {
        bucketCounts[bucketIdx].count += 1;
      }
    }

    if (row.aiRecommendation === AiRecommendation.PASS) {
      byRecommendation.PASS += 1;
    } else if (row.aiRecommendation === AiRecommendation.CONSIDER) {
      byRecommendation.CONSIDER += 1;
    } else if (row.aiRecommendation === AiRecommendation.REJECT) {
      byRecommendation.REJECT += 1;
    } else {
      byRecommendation.unrated += 1;
    }

    if (
      row.hrDecisionAt &&
      (row.aiRecommendation === AiRecommendation.PASS ||
        row.aiRecommendation === AiRecommendation.REJECT)
    ) {
      hrAndAiDecidedCount += 1;
      const hrApproved = APPROVED_POST_SCREENING_STATUSES.has(row.status);
      const hrRejected = row.status === ApplicationStatus.REJECTED;
      if (
        (row.aiRecommendation === AiRecommendation.PASS && hrApproved) ||
        (row.aiRecommendation === AiRecommendation.REJECT && hrRejected)
      ) {
        hrAgreedCount += 1;
      }
    }
  }

  return {
    totalApplications: rows.length,
    byStatus,
    scoreDistribution: bucketCounts,
    byRecommendation,
    aiPassRate: screenedCount > 0 ? Number((byRecommendation.PASS / screenedCount).toFixed(4)) : 0,
    hrAgreementRate:
      hrAndAiDecidedCount > 0 ? Number((hrAgreedCount / hrAndAiDecidedCount).toFixed(4)) : null,
  };
}
