import { applyDecorators } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';

export const ApiScreeningDraftController = () =>
  applyDecorators(
    ApiTags('Draft - Screening (Week 2)'),
    ApiBearerAuth('JWT-auth'),
  );

export const ApiTriggerScreeningDoc = () =>
  applyDecorators(
    ApiOperation({
      summary:
        '[Phác thảo Tuần 2] Kích hoạt phân tích và chấm điểm CV ứng viên bằng AI',
    }),
  );

export const ApiGetScreeningResultDoc = () =>
  applyDecorators(
    ApiOperation({
      summary:
        '[Phác thảo Tuần 2] Lấy kết quả chấm điểm sàng lọc, điểm mạnh và lỗ hổng kỹ năng',
    }),
  );

export const ApiInterviewDraftController = () =>
  applyDecorators(
    ApiTags('Draft - Interview (Week 3)'),
    ApiBearerAuth('JWT-auth'),
  );

export const ApiCreateInterviewSessionDoc = () =>
  applyDecorators(
    ApiOperation({
      summary:
        '[Phác thảo Tuần 3] Khởi tạo phiên phỏng vấn giọng nói hai chiều với AI',
    }),
  );

export const ApiGetNextInterviewTurnDoc = () =>
  applyDecorators(
    ApiOperation({
      summary:
        '[Phác thảo Tuần 3] Nhận câu hỏi phỏng vấn tiếp theo từ AI thích ứng',
    }),
  );

export const ApiCompleteInterviewDoc = () =>
  applyDecorators(
    ApiOperation({
      summary:
        '[Phác thảo Tuần 3] Kết thúc phỏng vấn và kích hoạt đánh giá transcript',
    }),
  );

export const ApiGetInterviewReportDoc = () =>
  applyDecorators(
    ApiOperation({
      summary:
        '[Phác thảo Tuần 3] Xem báo cáo 4 cột điểm phỏng vấn cho HR và ứng viên',
    }),
  );

export const ApiDashboardDraftController = () =>
  applyDecorators(
    ApiTags('Draft - Dashboard (Week 2 & 3)'),
    ApiBearerAuth('JWT-auth'),
  );

export const ApiGetDashboardOverviewDoc = () =>
  applyDecorators(
    ApiOperation({
      summary:
        '[Phác thảo] Lấy thống kê số lượng hồ sơ, tỉ lệ đạt sơ tuyển cho HR',
    }),
  );

export const ApiGetCandidatesRankingDoc = () =>
  applyDecorators(
    ApiOperation({
      summary:
        '[Phác thảo] Bảng xếp hạng ứng viên theo độ phù hợp ngữ nghĩa vector và điểm AI',
    }),
  );
