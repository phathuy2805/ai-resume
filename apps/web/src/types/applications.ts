export type ApplicationStatus =
  | 'SUBMITTED'
  | 'SCREENING'
  | 'SCREENING_FAILED'
  | 'SCREENED'
  | 'SHORTLISTED'
  | 'REJECTED'
  | 'INTERVIEW_INVITED'
  | 'INTERVIEWING'
  | 'EVALUATED'
  | 'PASSED'
  | 'FAILED';

export interface Application {
  id: string;
  status: ApplicationStatus;
  job: { id: string; title: string };
  cvFileName: string;
  cvSizeBytes: number;
  cvMimeType: string;
  cvUrl?: string;
  aiRecommendation?: 'PASS' | 'CONSIDER' | 'REJECT' | null;
  interviewId?: string | null;
  interviewExpiresAt?: string | null;
  interview?: {
    id: string;
    phase: 'NOT_STARTED' | 'IN_PROGRESS' | 'SUBMITTED' | 'EXPIRED';
    inviteExpiresAt: string;
  } | null;
  createdAt: string;
  updatedAt: string;
}

export interface UploadProgress {
  loaded: number;
  total?: number;
  percent?: number;
}

export interface ApplyJobOptions {
  signal?: AbortSignal;
  onUploadProgress?: (progress: UploadProgress) => void;
}

export interface JobApplicationListItem {
  id: string;
  candidateName: string;
  candidateEmail?: string | null;
  totalScore: number | null;
  aiRecommendation: 'PASS' | 'CONSIDER' | 'REJECT' | null;
  status: ApplicationStatus;
  createdAt: string;
}

export interface GetJobApplicationsParams {
  status?: ApplicationStatus;
  minScore?: number;
  maxScore?: number;
  sort?: 'score' | 'createdAt';
  order?: 'asc' | 'desc';
  page?: number;
  limit?: number;
}
export interface ApplicationDetailCandidate {
  id: string;
  fullName: string;
  email: string;
}

export interface ApplicationDetailJob {
  id: string;
  title: string;
  cvPassThreshold: number;
}

export interface SkillBreakdownItem {
  score: number;
  weight: number;
  matched: string[];
  missing: string[];
}

export interface ApplicationScoreBreakdown {
  requiredSkills: SkillBreakdownItem;
  preferredSkills: SkillBreakdownItem;
  experienceYears: {
    score: number;
    weight: number;
    candidateYears: number;
    requiredYears: number | null;
  };
  relevance: {
    score: number;
    weight: number;
    comment: string;
  };
  similarity: {
    score: number;
    weight: number;
    cosine: number;
  };
  capped: boolean;
}

export interface StrengthItem {
  point: string;
  quote: string | null;
}

export interface GapItem {
  skill: string;
  note: string;
}

export interface ApplicationExplanation {
  summary: string;
  strengths: StrengthItem[];
  gaps: GapItem[];
}

export interface ApplicationScreeningResult {
  totalScore: number;
  breakdown: ApplicationScoreBreakdown;
  explanation: ApplicationExplanation;
  timings: {
    parseCvMs: number;
    embedMs: number;
    scoreMs: number;
    explainMs: number;
    totalMs: number;
  };
  processingDurationMs: number;
  createdAt: string;
  updatedAt: string;
}

export interface ApplicationStatusHistory {
  id: string;
  fromStatus: ApplicationStatus | null;
  toStatus: ApplicationStatus;
  changedById: string | null;
  reason: string | null;
  changedAt: string;
}

export interface ApplicationDetail {
  id: string;
  status: ApplicationStatus;
  cvFileName: string;
  cvSizeBytes: number;
  cvMimeType: string;
  aiRecommendation: 'PASS' | 'CONSIDER' | 'REJECT' | null;
  screeningError: string | null;
  candidate: ApplicationDetailCandidate;
  job: ApplicationDetailJob;
  screeningResult: ApplicationScreeningResult | null;
  hrDecisionBy: { id: string; fullName: string } | null;
  hrDecisionAt: string | null;
  hrNote: string | null;
  interviewId: string | null;
  statusHistories: ApplicationStatusHistory[];
  createdAt: string;
  updatedAt: string;
}

export interface DecideApplicationPayload {
  decision: 'APPROVE' | 'REJECT';
  note?: string;
}

export interface DecisionResult {
  id: string;
  status: ApplicationStatus;
  interviewId: string | null;
  hrDecisionById: string | null;
  hrDecisionAt: string | null;
  hrNote: string | null;
}

export interface CvUrlResult {
  url: string;
  expiresInSec: number;
}

/** GET /jobs/:jobId/stats — tổng hợp hồ sơ của một job (W2-BE-04). */
export interface JobStats {
  totalApplications: number;
  byStatus: Record<ApplicationStatus, number>;
  /** 10 khoảng điểm cố định: "0-9", "10-19", …, "90-100". */
  scoreDistribution: { range: string; count: number }[];
  /** `unrated`: hồ sơ chưa có đề xuất AI (chưa chấm xong hoặc chấm lỗi). */
  byRecommendation: { PASS: number; CONSIDER: number; REJECT: number; unrated: number };
  /** PASS / số hồ sơ đã chấm, dạng 0–1. */
  aiPassRate: number;
  /** Tỷ lệ HR đồng ý với AI (chỉ tính PASS/REJECT đã có quyết định), dạng 0–1; null khi chưa có. */
  hrAgreementRate: number | null;
}
