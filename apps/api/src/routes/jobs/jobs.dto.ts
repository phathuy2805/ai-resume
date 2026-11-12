import { createZodDto } from 'nestjs-zod';
import {
  CreateJobSchema,
  JobListQuerySchema,
  JobListResponseSchema,
  JobSchema,
  RubricWeightsSchema,
  UpdateJobSchema,
} from './jobs.schema.js';

export class RubricWeightsDto extends createZodDto(RubricWeightsSchema) {}
export class CreateJobDto extends createZodDto(CreateJobSchema) {}
export class UpdateJobDto extends createZodDto(UpdateJobSchema) {}

export class JobListQueryDto extends createZodDto(JobListQuerySchema) {}
export const QueryJobsDto = JobListQueryDto;
export type QueryJobsDto = JobListQueryDto;

export class JobDto extends createZodDto(JobSchema) {}
export const JobResponseDto = JobDto;
export type JobResponseDto = JobDto;

export class JobListResponseDto extends createZodDto(JobListResponseSchema) {}

