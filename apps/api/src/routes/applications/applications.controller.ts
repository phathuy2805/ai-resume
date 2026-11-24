import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Query,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import 'multer';
import { Role } from '../../shared/constants/auth.constant.js';
import { CurrentUser } from '../../shared/decorators/current-user.decorator.js';
import { Roles } from '../../shared/decorators/roles.decorator.js';
import { JobIdParamDto } from '../jobs/jobs.dto.js';
import {
  ApiApplicationsController,
  ApiApplyJobDoc,
  ApiDecideApplicationDoc,
  ApiGetApplicationCvUrlDoc,
  ApiGetApplicationDetailDoc,
  ApiGetJobApplicationsDoc,
  ApiGetJobStatsDoc,
  ApiGetMyApplicationsDoc,
  ApiRescreenApplicationDoc,
} from './applications.docs.js';
import {
  ApplicationDto,
  ApplicationIdParamDto,
  DecisionBodyDto,
  DecisionResDto,
  GetApplicationCvUrlResDto,
  GetApplicationDetailResDto,
  GetJobApplicationsQueryDto,
  GetJobApplicationsResDto,
  GetJobStatsResDto,
  JobApplicationsParamDto,
  MyApplicationResDto,
  RescreenResDto,
} from './applications.dto.js';
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
  async getMyApplications(@CurrentUser('id') candidateId: string): Promise<MyApplicationResDto[]> {
    return this.applicationsService.findMine(candidateId);
  }

  @Roles(Role.HR)
  @Get('jobs/:jobId/applications')
  @ApiGetJobApplicationsDoc()
  async getJobApplications(
    @CurrentUser('id') hrId: string,
    @Param() params: JobApplicationsParamDto,
    @Query() query: GetJobApplicationsQueryDto,
  ): Promise<GetJobApplicationsResDto> {
    return this.applicationsService.findByJobForHr(hrId, params.jobId, query);
  }

  @Roles(Role.HR)
  @Get('jobs/:jobId/stats')
  @ApiGetJobStatsDoc()
  async getJobStats(
    @CurrentUser('id') hrId: string,
    @Param() params: JobApplicationsParamDto,
  ): Promise<GetJobStatsResDto> {
    return this.applicationsService.getJobStats(hrId, params.jobId);
  }

  @Roles(Role.HR)
  @Get('applications/:id')
  @ApiGetApplicationDetailDoc()
  async getApplicationDetail(
    @CurrentUser('id') hrId: string,
    @Param() params: ApplicationIdParamDto,
  ): Promise<GetApplicationDetailResDto> {
    return this.applicationsService.findDetailForHr(hrId, params.id);
  }

  @Roles(Role.HR)
  @Post('applications/:id/decision')
  @HttpCode(HttpStatus.OK)
  @ApiDecideApplicationDoc()
  async decideApplication(
    @CurrentUser('id') hrId: string,
    @Param() params: ApplicationIdParamDto,
    @Body() body: DecisionBodyDto,
  ): Promise<DecisionResDto> {
    return this.applicationsService.decide(hrId, params.id, body);
  }

  @Roles(Role.HR)
  @Post('applications/:id/rescreen')
  @HttpCode(HttpStatus.ACCEPTED)
  @ApiRescreenApplicationDoc()
  async rescreenApplication(
    @CurrentUser('id') hrId: string,
    @Param() params: ApplicationIdParamDto,
  ): Promise<RescreenResDto> {
    return this.applicationsService.rescreen(hrId, params.id);
  }

  @Roles(Role.HR)
  @Get('applications/:id/cv-url')
  @ApiGetApplicationCvUrlDoc()
  async getApplicationCvUrl(
    @CurrentUser('id') hrId: string,
    @Param() params: ApplicationIdParamDto,
  ): Promise<GetApplicationCvUrlResDto> {
    return this.applicationsService.getCvSignedUrl(hrId, params.id);
  }
}
