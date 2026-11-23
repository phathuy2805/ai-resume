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
