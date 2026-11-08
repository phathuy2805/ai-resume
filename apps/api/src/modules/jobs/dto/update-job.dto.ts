import { createZodDto } from 'nestjs-zod';
import { CreateJobSchema } from './create-job.dto.js';

export const UpdateJobSchema = CreateJobSchema.partial();
export class UpdateJobDto extends createZodDto(UpdateJobSchema) {}
