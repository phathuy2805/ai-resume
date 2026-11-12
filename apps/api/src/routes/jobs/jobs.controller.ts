import {
  Body,
  Controller,
  Get,
  HttpStatus,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiExtraModels,
  ApiOperation,
  ApiParam,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { JobStatus } from '../../shared/constants/job-status.enum.js';
import { CreateJobDto } from './dto/create-job.dto.js';
import { JobListResponseDto, JobResponseDto } from './dto/job-response.dto.js';
import { JobListQueryDto } from './dto/query-jobs.dto.js';
import { UpdateJobDto } from './dto/update-job.dto.js';

@ApiTags('Jobs')
@ApiExtraModels(JobResponseDto, JobListResponseDto)
@Controller('jobs')
export class JobsController {
  @Get()
  @ApiOperation({ summary: 'Lấy danh sách việc làm đang mở (Công khai)' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Danh sách công việc kèm phân trang',
    type: JobListResponseDto,
  })
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
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Lấy danh sách việc làm do HR đang đăng nhập tạo' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Danh sách việc làm của HR',
    type: [JobResponseDto],
  })
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

  @Get(':id')
  @ApiOperation({ summary: 'Xem chi tiết một tin tuyển dụng theo ID' })
  @ApiParam({
    name: 'id',
    description: 'Job UUID',
    example: 'd19e9185-1715-46a2-94b2-e1e779a1d123',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Chi tiết tin tuyển dụng',
    type: JobResponseDto,
  })
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
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Tạo tin tuyển dụng mới (Yêu cầu tài khoản HR)' })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'Tạo việc làm thành công',
    type: JobResponseDto,
  })
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
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Cập nhật tin tuyển dụng theo ID' })
  @ApiParam({
    name: 'id',
    description: 'Job UUID',
    example: 'd19e9185-1715-46a2-94b2-e1e779a1d123',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Cập nhật việc làm thành công',
    type: JobResponseDto,
  })
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
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Đóng tin tuyển dụng (chuyển status sang CLOSED)' })
  @ApiParam({
    name: 'id',
    description: 'Job UUID',
    example: 'd19e9185-1715-46a2-94b2-e1e779a1d123',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Đóng tin tuyển dụng thành công',
    type: JobResponseDto,
  })
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
