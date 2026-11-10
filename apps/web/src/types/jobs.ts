export type JobStatus = 'OPEN' | 'CLOSED';
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
  cvPassThreshold?: number;
  interviewQuestionCount?: number;
  rubricWeights?: Partial<RubricWeights>;
}
export type UpdateJobRequest = Partial<CreateJobRequest>;
export interface Job {
  id: string;
  title: string;
  description: string;
  requiredSkills: string[];
  preferredSkills: string[];
  minYearsExperience: number;
  status: JobStatus;
  cvPassThreshold: number;
  interviewQuestionCount: number;
  rubricWeights?: RubricWeights;
  createdById: string;
  createdAt: string;
  updatedAt: string;
}
