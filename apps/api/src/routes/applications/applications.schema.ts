import { z } from 'zod';
import { ApplicationSchema } from '../../shared/models/application.model.js';
import { JobSummarySchema } from '../../shared/models/job.model.js';

export { ApplicationSchema, JobSummarySchema };

export const UploadCvFileSchema = z.object({
  file: z.any().describe('Tệp CV định dạng PDF (dung lượng tối đa 5MB)'),
});

export const ApplyJobSchema = UploadCvFileSchema;

export type UploadCvFileBody = z.infer<typeof UploadCvFileSchema>;
export type ApplyJobBody = z.infer<typeof ApplyJobSchema>;
