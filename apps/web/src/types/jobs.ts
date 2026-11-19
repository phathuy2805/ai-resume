export type JobStatus = 'OPEN' | 'CLOSED';
export type JobLevel = 'INTERN' | 'JUNIOR' | 'MIDDLE' | 'SENIOR';
export interface RubricWeights {
  technical: number;
  communication: number;
  relevance: number;
  evidence: number;
}
export interface JobsParams {
  page?: number;
  limit?: number;
  search?: string;
  status?: JobStatus;
}
export interface CreateJobRequest {
  title: string;
  description: string;
  requiredSkills: string[];
  preferredSkills?: string[];
  minYearsExperience: number;
  requirements?: string | null;
  level?: JobLevel | null;
  cvPassThreshold?: number;
  interviewQuestionCount?: number;
  rubricWeights?: RubricWeights;
}
export type UpdateJobRequest = Partial<CreateJobRequest>;
export interface Job {
  id: string;
  title: string;
  description: string;
  requiredSkills: string[];
  preferredSkills: string[];
  minYearsExperience: number;
  requirements?: string | null;
  level?: JobLevel | null;
  status: JobStatus;
  cvPassThreshold: number;
  interviewQuestionCount: number;
  rubricWeights?: RubricWeights;
  createdById: string;
  createdAt: string;
  updatedAt: string;
  applicationCount?: number;
  isAnalyzed?: boolean;
}
