/**
 * 11 trạng thái vòng đời của một hồ sơ ứng tuyển (`Application`).
 * Mọi chuyển đổi bắt buộc đi qua `ApplicationStateService` theo `ALLOWED_APPLICATION_TRANSITIONS`.
 */
export enum ApplicationStatus {
  /** Ứng viên vừa nộp CV PDF thành công (đã lưu S3 & trích `cvText`), đang chờ hàng đợi AI xử lý. */
  SUBMITTED = 'SUBMITTED',

  /** Worker AI đang chấm điểm CV (parse `parsedCv`, tạo embedding, tính điểm & giải thích). */
  SCREENING = 'SCREENING',

  /** AI chấm CV thất bại do lỗi kỹ thuật sau retry (xem `screeningError`); HR có thể bấm chấm lại (`SCREENING`). */
  SCREENING_FAILED = 'SCREENING_FAILED',

  /** AI đã chấm CV xong (`ScreeningResult` & `aiRecommendation`); đang chờ HR duyệt/loại hoặc bấm chấm lại. */
  SCREENED = 'SCREENED',

  /** HR đã duyệt qua vòng CV (`APPROVE`); trạng thái chuyển tiếp trước khi tạo phiên `Interview`. */
  SHORTLISTED = 'SHORTLISTED',

  /** [Kết thúc] HR loại hồ sơ ngay ở vòng CV (`REJECT`). */
  REJECTED = 'REJECTED',

  /** Đã tạo phòng phỏng vấn `Interview` và mời ứng viên; ứng viên thấy nút vào phỏng vấn (`interviewId`). */
  INTERVIEW_INVITED = 'INTERVIEW_INVITED',

  /** Ứng viên đã đồng ý ghi âm (`recordingConsentAt`) và đang thực hiện hỏi đáp từng lượt (`InterviewTurn`). */
  INTERVIEWING = 'INTERVIEWING',

  /** Ứng viên đã hoàn thành buổi phỏng vấn và AI đã chấm xong 4 tiêu chí (`InterviewResult`), chờ HR chốt cuối. */
  EVALUATED = 'EVALUATED',

  /** [Kết thúc] HR chốt Đạt (Offer) sau vòng phỏng vấn và mở khóa phản hồi kỹ năng cho ứng viên. */
  PASSED = 'PASSED',

  /** [Kết thúc] HR chốt Không đạt sau vòng phỏng vấn và vẫn mở khóa góp ý kỹ năng cho ứng viên. */
  FAILED = 'FAILED',
}

/** Đề xuất đánh giá của AI (HR vẫn có quyền quyết định ngược lại). */
export enum AiRecommendation {
  /** AI đề xuất Đạt (điểm đạt ngưỡng chuẩn). */
  PASS = 'PASS',

  /** AI đề xuất Cân nhắc thêm (điểm sát ngưỡng hoặc cần HR xem kỹ). */
  CONSIDER = 'CONSIDER',

  /** AI đề xuất Loại (điểm thấp hoặc thiếu kỹ năng cốt lõi). */
  REJECT = 'REJECT',
}
