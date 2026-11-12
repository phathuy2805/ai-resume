import {
  Controller,
  Get,
  Param,
  Post,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import 'multer';
import {
  AiRecommendation,
  ApplicationStatus,
} from '../../shared/constants/application-status.enum.js';
import {
  ApiApplicationsController,
  ApiApplyJobDoc,
  ApiGetMyApplicationsDoc,
} from './applications.docs.js';
import { ApplicationDto } from './dto/application.dto.js';

@ApiApplicationsController()
@Controller()
export class ApplicationsController {
  @Post('jobs/:id/applications')
  @UseInterceptors(FileInterceptor('file'))
  @ApiApplyJobDoc()
  async apply(
    @Param('id') jobId: string,
    @UploadedFile() file?: Express.Multer.File,
  ): Promise<ApplicationDto> {
    return {
      id: '7c9e6679-7425-40de-944b-e07fc1f90ae7',
      status: ApplicationStatus.SUBMITTED,
      job: {
        id: jobId,
        title: 'Senior Backend NodeJS / NestJS Developer',
      },
      cvFileName: file?.originalname ?? 'candidate_cv.pdf',
      cvSizeBytes: file?.size ?? 245760,
      cvMimeType: file?.mimetype ?? 'application/pdf',
      aiRecommendation: null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
  }

  @Get('me/applications')
  @ApiGetMyApplicationsDoc()
  async getMyApplications(): Promise<ApplicationDto[]> {
    return [
      {
        id: '7c9e6679-7425-40de-944b-e07fc1f90ae7',
        status: ApplicationStatus.SHORTLISTED,
        job: {
          id: 'd19e9185-1715-46a2-94b2-e1e779a1d123',
          title: 'Senior Backend NodeJS / NestJS Developer',
        },
        cvFileName: 'Nguyen_Van_A_CV.pdf',
        cvSizeBytes: 245760,
        cvMimeType: 'application/pdf',
        cvUrl: 'https://example-bucket.s3.amazonaws.com/cvs/Nguyen_Van_A_CV.pdf',
        aiRecommendation: AiRecommendation.PASS,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
    ];
  }
}
