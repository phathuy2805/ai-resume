import { applyDecorators } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';

export const ApiScreeningDraftController = () =>
  applyDecorators(ApiTags('Draft - Screening (Week 2)'), ApiBearerAuth('JWT-auth'));

export const ApiTriggerScreeningDoc = () =>
  applyDecorators(
    ApiOperation({
      summary: '[Phác thảo Tuần 2] Kích hoạt phân tích và chấm điểm CV ứng viên bằng AI',
    }),
  );

export const ApiGetScreeningResultDoc = () =>
  applyDecorators(
    ApiOperation({
      summary: '[Phác thảo Tuần 2] Lấy kết quả chấm điểm sàng lọc, điểm mạnh và lỗ hổng kỹ năng',
    }),
  );

export const ApiDashboardDraftController = () =>
  applyDecorators(ApiTags('Draft - Dashboard (Week 2 & 3)'), ApiBearerAuth('JWT-auth'));

export const ApiGetDashboardOverviewDoc = () =>
  applyDecorators(
    ApiOperation({
      summary: '[Phác thảo] Lấy thống kê số lượng hồ sơ, tỉ lệ đạt sơ tuyển cho HR',
    }),
  );

export const ApiGetCandidatesRankingDoc = () =>
  applyDecorators(
    ApiOperation({
      summary: '[Phác thảo] Bảng xếp hạng ứng viên theo độ phù hợp ngữ nghĩa vector và điểm AI',
    }),
  );
