import { Body, Controller, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { JobStatus } from '../../shared/constants/job-status.enum.js';
import { Public } from '../../shared/decorators/public.decorator.js';
import {
  CreateJobDto,
  JobListQueryDto,
  JobListResponseDto,
  JobResponseDto,
  UpdateJobDto,
} from './jobs.dto.js';
import {
  ApiCloseJobDoc,
  ApiCreateJobDoc,
  ApiFindAllJobsDoc,
  ApiFindMyJobsDoc,
  ApiFindOneJobDoc,
  ApiJobsController,
  ApiUpdateJobDoc,
} from './jobs.docs.js';

@ApiJobsController()
@Controller('jobs')
export class JobsController {
  @Public()
  @Get()
  @ApiFindAllJobsDoc()
  async findAll(@Query() query: JobListQueryDto): Promise<JobListResponseDto> {
    const mockJob: JobResponseDto = {
      id: 'd19e9185-1715-46a2-94b2-e1e779a1d123',
      title: 'Senior Backend NodeJS / NestJS Developer',
      description: 'Mô tả công việc...',
      requiredSkills: ['NodeJS', 'NestJS', 'PostgreSQL'],
      preferredSkills: ['Redis', 'Docker'],
      minYearsExperience: 3,
      status: JobStatus.OPEN,
      cvPassThreshold: 70,
      interviewQuestionCount: 3,
      rubricWeights: {
        technical: 40,
        communication: 20,
        relevance: 20,
        evidence: 20,
      },
      createdById: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    return {
      data: [mockJob],
      meta: {
        page: query.page ?? 1,
        limit: query.limit ?? 10,
        total: 1,
      },
    };
  }

  @Get('mine')
  @ApiFindMyJobsDoc()
  async findMyJobs(): Promise<JobResponseDto[]> {
    return [
      {
        id: 'd19e9185-1715-46a2-94b2-e1e779a1d123',
        title: 'Senior Backend NodeJS / NestJS Developer',
        description: 'Mô tả công việc...',
        requiredSkills: ['NodeJS', 'NestJS', 'PostgreSQL'],
        preferredSkills: ['Redis', 'Docker'],
        minYearsExperience: 3,
        status: JobStatus.OPEN,
        cvPassThreshold: 70,
        interviewQuestionCount: 3,
        createdById: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
    ];
  }

  @Public()
  @Get(':id')
  @ApiFindOneJobDoc()
  async findOne(@Param('id') id: string): Promise<JobResponseDto> {
    return {
      id,
      title: 'Senior Backend NodeJS / NestJS Developer',
      description: 'Mô tả công việc chi tiết...',
      requiredSkills: ['NodeJS', 'NestJS', 'PostgreSQL'],
      preferredSkills: ['Redis', 'Docker'],
      minYearsExperience: 3,
      status: JobStatus.OPEN,
      cvPassThreshold: 70,
      interviewQuestionCount: 3,
      rubricWeights: {
        technical: 40,
        communication: 20,
        relevance: 20,
        evidence: 20,
      },
      createdById: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
  }

  @Post()
  @ApiCreateJobDoc()
  async create(@Body() dto: CreateJobDto): Promise<JobResponseDto> {
    return {
      id: 'd19e9185-1715-46a2-94b2-e1e779a1d123',
      title: dto.title,
      description: dto.description,
      requiredSkills: dto.requiredSkills,
      preferredSkills: dto.preferredSkills ?? [],
      minYearsExperience: dto.minYearsExperience,
      status: JobStatus.OPEN,
      cvPassThreshold: dto.cvPassThreshold ?? 70,
      interviewQuestionCount: dto.interviewQuestionCount ?? 3,
      rubricWeights: dto.rubricWeights ?? {
        technical: 40,
        communication: 20,
        relevance: 20,
        evidence: 20,
      },
      createdById: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
  }

  @Patch(':id')
  @ApiUpdateJobDoc()
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateJobDto,
  ): Promise<JobResponseDto> {
    return {
      id,
      title: dto.title ?? 'Senior Backend NodeJS Developer',
      description: dto.description ?? 'Mô tả công việc...',
      requiredSkills: dto.requiredSkills ?? ['NodeJS'],
      preferredSkills: dto.preferredSkills ?? [],
      minYearsExperience: dto.minYearsExperience ?? 3,
      status: JobStatus.OPEN,
      cvPassThreshold: dto.cvPassThreshold ?? 70,
      interviewQuestionCount: dto.interviewQuestionCount ?? 3,
      rubricWeights: dto.rubricWeights ?? {
        technical: 40,
        communication: 20,
        relevance: 20,
        evidence: 20,
      },
      createdById: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
  }

  @Patch(':id/close')
  @ApiCloseJobDoc()
  async close(@Param('id') id: string): Promise<JobResponseDto> {
    return {
      id,
      title: 'Senior Backend NodeJS Developer',
      description: 'Mô tả công việc...',
      requiredSkills: ['NodeJS'],
      preferredSkills: [],
      minYearsExperience: 3,
      status: JobStatus.CLOSED,
      cvPassThreshold: 70,
      interviewQuestionCount: 3,
      createdById: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
  }
}
