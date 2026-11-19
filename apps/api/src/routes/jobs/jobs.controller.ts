import { Body, Controller, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { Role } from '../../shared/constants/auth.constant.js';
import { CurrentUser } from '../../shared/decorators/current-user.decorator.js';
import { Public } from '../../shared/decorators/public.decorator.js';
import { Roles } from '../../shared/decorators/roles.decorator.js';
import {
  ApiCloseJobDoc,
  ApiCreateJobDoc,
  ApiFindAllJobsDoc,
  ApiFindMyJobDoc,
  ApiFindMyJobsDoc,
  ApiFindOneJobDoc,
  ApiJobsController,
  ApiReopenJobDoc,
  ApiUpdateJobDoc,
} from './jobs.docs.js';
import {
  CloseJobResDto,
  CreateJobBodyDto,
  CreateJobResDto,
  GetJobResDto,
  GetJobsQueryDto,
  GetJobsResDto,
  GetMyJobResDto,
  GetMyJobsQueryDto,
  GetMyJobsResDto,
  JobIdParamDto,
  ReopenJobResDto,
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

  @Roles(Role.HR)
  @Get('mine/:id')
  @ApiFindMyJobDoc()
  async findMineById(
    @CurrentUser('id') userId: string,
    @Param() params: JobIdParamDto,
  ): Promise<GetMyJobResDto> {
    return this.jobsService.findMineById(userId, params.id);
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

  @Roles(Role.HR)
  @Patch(':id/reopen')
  @ApiReopenJobDoc()
  async reopen(
    @CurrentUser('id') userId: string,
    @Param() params: JobIdParamDto,
  ): Promise<ReopenJobResDto> {
    return this.jobsService.reopen(userId, params.id);
  }
}
