import { createZodDto } from 'nestjs-zod';
import {
  ApplicationSchema,
  JobSummarySchema,
  UploadCvFileSchema,
} from './applications.schema.js';

export class JobSummaryDto extends createZodDto(JobSummarySchema) {}

export class ApplicationDto extends createZodDto(ApplicationSchema) {}
export const ApplicationResponseDto = ApplicationDto;
export type ApplicationResponseDto = ApplicationDto;

export class UploadCvFileDto extends createZodDto(UploadCvFileSchema) {}
export const ApplyJobDto = UploadCvFileDto;
export type ApplyJobDto = UploadCvFileDto;

