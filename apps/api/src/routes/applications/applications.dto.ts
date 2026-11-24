import { createZodDto } from 'nestjs-zod';
import { ApplicationSchema } from '../../shared/models/application.model.js';
import {
  ApplicationIdParamSchema,
  DecisionBodySchema,
  DecisionResSchema,
  GetApplicationCvUrlResSchema,
  GetApplicationDetailResSchema,
  GetJobApplicationsQuerySchema,
  GetJobApplicationsResSchema,
  GetJobStatsResSchema,
  JobApplicationsParamSchema,
  MyApplicationResSchema,
  RescreenResSchema,
  UploadCvFileSchema,
} from './applications.schema.js';

export class ApplicationDto extends createZodDto(ApplicationSchema) {}
export class MyApplicationResDto extends createZodDto(MyApplicationResSchema) {}

export class UploadCvFileDto extends createZodDto(UploadCvFileSchema) {}

export class JobApplicationsParamDto extends createZodDto(JobApplicationsParamSchema) {}
export class ApplicationIdParamDto extends createZodDto(ApplicationIdParamSchema) {}
export class GetJobApplicationsQueryDto extends createZodDto(GetJobApplicationsQuerySchema) {}
export class GetJobApplicationsResDto extends createZodDto(GetJobApplicationsResSchema) {}
export class GetApplicationDetailResDto extends createZodDto(GetApplicationDetailResSchema) {}
export class DecisionBodyDto extends createZodDto(DecisionBodySchema) {}
export class DecisionResDto extends createZodDto(DecisionResSchema) {}
export class RescreenResDto extends createZodDto(RescreenResSchema) {}
export class GetJobStatsResDto extends createZodDto(GetJobStatsResSchema) {}
export class GetApplicationCvUrlResDto extends createZodDto(GetApplicationCvUrlResSchema) {}
