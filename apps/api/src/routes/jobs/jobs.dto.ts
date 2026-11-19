import { createZodDto } from 'nestjs-zod';
import {
  CloseJobResSchema,
  CreateJobBodySchema,
  CreateJobResSchema,
  GetJobResSchema,
  GetJobsQuerySchema,
  GetJobsResSchema,
  GetMyJobResSchema,
  GetMyJobsQuerySchema,
  GetMyJobsResSchema,
  JobIdParamSchema,
  ReopenJobResSchema,
  UpdateJobBodySchema,
  UpdateJobResSchema,
} from './jobs.schema.js';

export class JobIdParamDto extends createZodDto(JobIdParamSchema) {}
export class GetJobsQueryDto extends createZodDto(GetJobsQuerySchema) {}
export class GetMyJobsQueryDto extends createZodDto(GetMyJobsQuerySchema) {}

export class CreateJobBodyDto extends createZodDto(CreateJobBodySchema) {}
export class UpdateJobBodyDto extends createZodDto(UpdateJobBodySchema) {}

export class GetJobsResDto extends createZodDto(GetJobsResSchema) {}
export class GetJobResDto extends createZodDto(GetJobResSchema) {}
export class GetMyJobsResDto extends createZodDto(GetMyJobsResSchema) {}
export class GetMyJobResDto extends createZodDto(GetMyJobResSchema) {}
export class CreateJobResDto extends createZodDto(CreateJobResSchema) {}
export class UpdateJobResDto extends createZodDto(UpdateJobResSchema) {}
export class CloseJobResDto extends createZodDto(CloseJobResSchema) {}
export class ReopenJobResDto extends createZodDto(ReopenJobResSchema) {}
