import {
  Controller,
  Get,
  HttpStatus,
  Param,
  Post,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiBearerAuth,
  ApiBody,
  ApiConsumes,
  ApiExtraModels,
  ApiOperation,
  ApiParam,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import 'multer';
import { ApplicationStatus } from '../../shared/constants/application-status.enum.js';
import { ApplicationDto, JobSummaryDto } from './dto/application.dto.js';

@ApiTags('Applications')
@ApiExtraModels(ApplicationDto, JobSummaryDto)
@Controller()
export class ApplicationsController {
  @Post('jobs/:id/applications')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: 'Nộp CV ứng tuyển công việc (Multipart form-data, field: file)',
  })
  @ApiParam({
    name: 'id',
    description: 'Mã định danh công việc (Job UUID)',
    example: 'd19e9185-1715-46a2-94b2-e1e779a1d123',
  })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    description: 'Tệp CV định dạng PDF (dung lượng tối đa 5MB)',
    schema: {
      type: 'object',
      required: ['file'],
      properties: {
        file: {
          type: 'string',
          format: 'binary',
          description: 'Tệp CV PDF tải lên (dung lượng tối đa 5MB)',
        },
      },
    },
  })
  @UseInterceptors(FileInterceptor('file'))
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'Nộp hồ sơ thành công, đưa vào hàng đợi AI Screening',
    type: ApplicationDto,
  })
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
      cvUrl: 'https://res.cloudinary.com/demo/raw/upload/cvs/candidate_cv.pdf',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
  }

  @Get('me/applications')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: 'Lấy danh sách các đơn ứng tuyển của chính ứng viên đăng nhập',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description:
      'Danh sách hồ sơ ứng tuyển của ứng viên (không trả cvText, cvKey)',
    type: [ApplicationDto],
  })
  async getMyApplications(): Promise<ApplicationDto[]> {
    return [
      {
        id: '7c9e6679-7425-40de-944b-e07fc1f90ae7',
        status: ApplicationStatus.QUALIFIED,
        job: {
          id: 'd19e9185-1715-46a2-94b2-e1e779a1d123',
          title: 'Senior Backend NodeJS / NestJS Developer',
        },
        cvUrl:
          'https://res.cloudinary.com/demo/raw/upload/cvs/candidate_cv.pdf',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
    ];
  }
}
