import type { CreateJobRequest, JobStatus } from '@/types/jobs';

export type JobFormValues = Required<
  Pick<
    CreateJobRequest,
    | 'title'
    | 'description'
    | 'requiredSkills'
    | 'preferredSkills'
    | 'minYearsExperience'
    | 'cvPassThreshold'
    | 'interviewQuestionCount'
  >
> & { status: JobStatus };

export const emptyJobForm: JobFormValues = {
  title: '',
  description: '',
  requiredSkills: [],
  preferredSkills: [],
  minYearsExperience: 0,
  cvPassThreshold: 70,
  interviewQuestionCount: 3,
  status: 'OPEN',
};
