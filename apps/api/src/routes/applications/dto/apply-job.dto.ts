import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

export const UploadCvFileSchema = z.object({
  file: z.any().describe('Tệp CV định dạng PDF (dung lượng tối đa 5MB)'),
});

export class UploadCvFileDto extends createZodDto(UploadCvFileSchema) {}

export const ApplyJobSchema = UploadCvFileSchema;
export class ApplyJobDto extends UploadCvFileDto {}
