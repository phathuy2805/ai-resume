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

// ==================== W2-FE-01 Types ====================

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

// ==================== W2-FE-02 Types ====================

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
    comment?: string;
  };
  similarity: {
    score: number;
    weight: number;
    cosine?: number;
  };
  capped: boolean;
}

export interface StrengthItem {
  text: string;
  quote?: string;
}

export interface GapItem {
  skill?: string;
  note?: string;
}

export interface ApplicationExplanation {
  summary?: string;
  strengths?: StrengthItem[];
  gaps?: GapItem[];
}

export interface ApplicationScreeningResult {
  totalScore: number;
  breakdown: ApplicationScoreBreakdown;
  explanation?: ApplicationExplanation | null;
  timings?: unknown;
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
  statusHistories?: ApplicationStatusHistory[];
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
  hrDecisionById: string;
  hrDecisionAt: string;
  hrNote: string | null;
}

export interface CvUrlResult {
  url: string;
  expiresInSec?: number;
}
