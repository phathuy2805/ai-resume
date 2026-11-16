import type { GetJobsQueryType, GetMyJobsQueryType } from './jobs.schema.js';

export type FindOpenJobsParams = GetJobsQueryType;

export type FindMyJobsParams = GetMyJobsQueryType & {
  userId: string;
};
