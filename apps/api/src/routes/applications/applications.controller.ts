import {
  Controller,
  Get,
  Param,
  Post,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import 'multer';
import {
  AiRecommendation,
  ApplicationStatus,
} from '../../shared/constants/application-status.enum.js';
import { Role } from '../../shared/constants/auth.constant.js';
import { CurrentUser } from '../../shared/decorators/current-user.decorator.js';
import { Roles } from '../../shared/decorators/roles.decorator.js';
import { JobIdParamDto } from '../jobs/jobs.dto.js';
import {
  ApiApplicationsController,
  ApiApplyJobDoc,
  ApiGetMyApplicationsDoc,
} from './applications.docs.js';
import { ApplicationDto } from './applications.dto.js';
import { ApplicationsService } from './applications.service.js';
import { assertValidCvFile } from './cv-file.validator.js';
import { CvUploadInterceptor } from './cv-upload.interceptor.js';

@ApiApplicationsController()
@Controller()
export class ApplicationsController {
  constructor(private readonly applicationsService: ApplicationsService) {}

  @Roles(Role.CANDIDATE)
  @Post('jobs/:id/applications')
  @UseInterceptors(CvUploadInterceptor)
  @ApiApplyJobDoc()
  async apply(
    @CurrentUser('id') candidateId: string,
    @Param() params: JobIdParamDto,
    @UploadedFile() file?: Express.Multer.File,
  ): Promise<ApplicationDto> {
    assertValidCvFile(file);
    return this.applicationsService.apply(candidateId, params.id, file);
  }

  @Roles(Role.CANDIDATE)
  @Get('me/applications')
  @ApiGetMyApplicationsDoc()
  async getMyApplications(): Promise<ApplicationDto[]> {
    // TODO(W1-BE-05 giai đoạn 5): thay dữ liệu mock bằng ApplicationsService.findMine.
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
        cvUrl:
          'https://example-bucket.s3.amazonaws.com/cvs/Nguyen_Van_A_CV.pdf',
        aiRecommendation: AiRecommendation.PASS,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
    ];
  }
}
