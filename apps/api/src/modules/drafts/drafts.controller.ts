import { Controller, Get, Param, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';

@ApiTags('Draft - Screening (Week 2)')
@ApiBearerAuth('JWT-auth')
@Controller('screening')
export class ScreeningDraftController {
  @Post('trigger/:applicationId')
  @ApiOperation({
    summary:
      '[Phác thảo Tuần 2] Kích hoạt phân tích và chấm điểm CV ứng viên bằng AI',
  })
  triggerScreening(@Param('applicationId') applicationId: string) {
    return { message: 'Screening task triggered', applicationId };
  }

  @Get('result/:applicationId')
  @ApiOperation({
    summary:
      '[Phác thảo Tuần 2] Lấy kết quả chấm điểm sàng lọc, điểm mạnh và lỗ hổng kỹ năng',
  })
  getScreeningResult(@Param('applicationId') applicationId: string) {
    return { message: 'Screening result details', applicationId };
  }
}

@ApiTags('Draft - Interview (Week 3)')
@ApiBearerAuth('JWT-auth')
@Controller('interviews')
export class InterviewDraftController {
  @Post('session/:applicationId')
  @ApiOperation({
    summary:
      '[Phác thảo Tuần 3] Khởi tạo phiên phỏng vấn giọng nói hai chiều với AI',
  })
  createSession(@Param('applicationId') applicationId: string) {
    return { message: 'Interview session created', applicationId };
  }

  @Get('session/:interviewId/turn')
  @ApiOperation({
    summary:
      '[Phác thảo Tuần 3] Nhận câu hỏi phỏng vấn tiếp theo từ AI thích ứng',
  })
  getNextTurn(@Param('interviewId') interviewId: string) {
    return { message: 'Next interview turn question', interviewId };
  }

  @Post('complete/:interviewId')
  @ApiOperation({
    summary:
      '[Phác thảo Tuần 3] Kết thúc phỏng vấn và kích hoạt đánh giá transcript',
  })
  completeInterview(@Param('interviewId') interviewId: string) {
    return { message: 'Interview completed and evaluating', interviewId };
  }

  @Get('report/:interviewId')
  @ApiOperation({
    summary:
      '[Phác thảo Tuần 3] Xem báo cáo 4 cột điểm phỏng vấn cho HR và ứng viên',
  })
  getInterviewReport(@Param('interviewId') interviewId: string) {
    return { message: 'Interview evaluation report', interviewId };
  }
}

@ApiTags('Draft - Dashboard (Week 2 & 3)')
@ApiBearerAuth('JWT-auth')
@Controller('dashboard')
export class DashboardDraftController {
  @Get('overview')
  @ApiOperation({
    summary:
      '[Phác thảo] Lấy thống kê số lượng hồ sơ, tỉ lệ đạt sơ tuyển cho HR',
  })
  getOverview() {
    return { message: 'Dashboard overview statistics' };
  }

  @Get('candidates-ranking/:jobId')
  @ApiOperation({
    summary:
      '[Phác thảo] Bảng xếp hạng ứng viên theo độ phù hợp ngữ nghĩa vector và điểm AI',
  })
  getCandidatesRanking(@Param('jobId') jobId: string) {
    return { message: 'Candidates ranking for job', jobId };
  }
}
