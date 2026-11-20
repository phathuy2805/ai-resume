import { Controller, Get, Param, Post, UploadedFile, UseInterceptors } from '@nestjs/common';
import 'multer';
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
  async getMyApplications(@CurrentUser('id') candidateId: string): Promise<ApplicationDto[]> {
    return this.applicationsService.findMine(candidateId);
  }
}
