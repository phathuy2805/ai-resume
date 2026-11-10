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
