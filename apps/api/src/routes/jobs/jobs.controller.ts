import { Body, Controller, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { Role } from '../../shared/constants/auth.constant.js';
import { CurrentUser } from '../../shared/decorators/current-user.decorator.js';
import { Public } from '../../shared/decorators/public.decorator.js';
import { Roles } from '../../shared/decorators/roles.decorator.js';
import {
  ApiCloseJobDoc,
  ApiCreateJobDoc,
  ApiFindAllJobsDoc,
  ApiFindMyJobsDoc,
  ApiFindOneJobDoc,
  ApiJobsController,
  ApiUpdateJobDoc,
} from './jobs.docs.js';
import {
  CloseJobResDto,
  CreateJobBodyDto,
  CreateJobResDto,
  GetJobResDto,
  GetJobsQueryDto,
  GetJobsResDto,
  GetMyJobsQueryDto,
  GetMyJobsResDto,
  JobIdParamDto,
  UpdateJobBodyDto,
  UpdateJobResDto,
} from './jobs.dto.js';
import { JobsService } from './jobs.service.js';

@ApiJobsController()
@Controller('jobs')
export class JobsController {
  constructor(private readonly jobsService: JobsService) {}

  @Public()
  @Get()
  @ApiFindAllJobsDoc()
  async findAll(@Query() query: GetJobsQueryDto): Promise<GetJobsResDto> {
    return this.jobsService.findAll(query);
  }

  @Roles(Role.HR)
  @Get('mine')
  @ApiFindMyJobsDoc()
  async findMine(
    @CurrentUser('id') userId: string,
    @Query() query: GetMyJobsQueryDto,
  ): Promise<GetMyJobsResDto> {
    return this.jobsService.findMine(userId, query);
  }

  @Public()
  @Get(':id')
  @ApiFindOneJobDoc()
  async findOne(@Param() params: JobIdParamDto): Promise<GetJobResDto> {
    return this.jobsService.findJob(params.id);
  }

  @Roles(Role.HR)
  @Post()
  @ApiCreateJobDoc()
  async create(
    @CurrentUser('id') userId: string,
    @Body() body: CreateJobBodyDto,
  ): Promise<CreateJobResDto> {
    return this.jobsService.create(userId, body);
  }

  @Roles(Role.HR)
  @Patch(':id')
  @ApiUpdateJobDoc()
  async update(
    @CurrentUser('id') userId: string,
    @Param() params: JobIdParamDto,
    @Body() body: UpdateJobBodyDto,
  ): Promise<UpdateJobResDto> {
    return this.jobsService.update(userId, params.id, body);
  }

  @Roles(Role.HR)
  @Patch(':id/close')
  @ApiCloseJobDoc()
  async close(
    @CurrentUser('id') userId: string,
    @Param() params: JobIdParamDto,
  ): Promise<CloseJobResDto> {
    return this.jobsService.close(userId, params.id);
  }
}
