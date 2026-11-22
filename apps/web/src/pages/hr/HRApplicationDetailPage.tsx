import { useState } from 'react';
import {
  AlertCircle,
  AlertTriangle,
  ArrowLeft,
  Award,
  Calendar,
  CheckCircle,
  ExternalLink,
  FileText,
  History,
  Layers,
  Loader2,
  Mail,
  RotateCcw,
  Sparkles,
  XCircle,
} from 'lucide-react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { toast } from 'sonner';
import { getCvUrl, rescreenApplication } from '@/api/applications';
import { AiRecommendationBadge, ApplicationStatusBadge } from '@/components/common/StatusBadges';
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import { useApplication, useDecideApplication } from '@/hooks/useApplicationDetail';
import { toApiError } from '@/lib/apiError';
import { HR_STATUS, scoreTone } from '@/lib/applicationStatus';
import { formatDateTime } from '@/lib/format';
import { cn } from '@/lib/utils';

export default function HRApplicationDetailPage() {
  const { id = '' } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const applicationQuery = useApplication(id);
  const application = applicationQuery.data;

  const decideMutation = useDecideApplication(id, application?.job?.id);

  // Decision Modal State
  const [decisionType, setDecisionType] = useState<'APPROVE' | 'REJECT' | null>(null);
  const [decisionNote, setDecisionNote] = useState('');

  // CV URL loading state
  const [loadingCv, setLoadingCv] = useState(false);
  const [isRescreening, setIsRescreening] = useState(false);

  if (applicationQuery.isLoading) {
    return (
      <div className="flex flex-col gap-6">
        <div className="flex items-center gap-2">
          <Skeleton className="h-9 w-32" />
        </div>
        <Skeleton className="h-44 w-full" />
        <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
          <Skeleton className="h-80 md:col-span-2" />
          <Skeleton className="h-80" />
        </div>
      </div>
    );
  }

  if (applicationQuery.isError || !application) {
    return (
      <Card className="flex flex-col items-center justify-center p-12 text-center">
        <AlertCircle className="h-10 w-10 text-destructive mb-3" />
        <h2 className="text-lg font-semibold text-foreground">Không tìm thấy hồ sơ ứng viên</h2>
        <p className="mt-1 text-sm text-muted-foreground mb-4">
          Hồ sơ này không tồn tại hoặc bạn không có quyền xem.
        </p>
        <Button variant="outline" onClick={() => navigate(-1)}>
          <ArrowLeft className="mr-1.5 h-4 w-4" /> Quay lại
        </Button>
      </Card>
    );
  }

  const {
    candidate,
    job,
    status,
    aiRecommendation,
    screeningError,
    screeningResult,
    hrDecisionBy,
    hrDecisionAt,
    hrNote,
    statusHistories = [],
  } = application;

  const totalScore = screeningResult?.totalScore ?? null;

  const cvPassThreshold = job.cvPassThreshold ?? 70;
  const isPendingAi = status === 'SUBMITTED' || status === 'SCREENING';
  const isFailedAi = status === 'SCREENING_FAILED';
  const isScreened = status === 'SCREENED';
  const isDecided =
    Boolean(hrDecisionAt) ||
    [
      'SHORTLISTED',
      'REJECTED',
      'INTERVIEW_INVITED',
      'INTERVIEWING',
      'EVALUATED',
      'PASSED',
      'FAILED',
    ].includes(status);

  const handleOpenCv = async () => {
    try {
      setLoadingCv(true);
      const res = await getCvUrl(id);
      if (res?.url) {
        window.open(res.url, '_blank', 'noopener,noreferrer');
      } else {
        toast.error('Không tìm thấy liên kết tải CV');
      }
    } catch (error) {
      toast.error(toApiError(error).message || 'Không thể lấy liên kết CV gốc');
    } finally {
      setLoadingCv(false);
    }
  };

  const handleRescreen = async () => {
    try {
      setIsRescreening(true);
      await rescreenApplication(id);
      toast.success('Đã gửi yêu cầu chấm lại CV');
      await applicationQuery.refetch();
    } catch (error) {
      toast.error(toApiError(error).message || 'Không thể yêu cầu chấm lại CV');
    } finally {
      setIsRescreening(false);
    }
  };

  const handleConfirmDecision = async () => {
    if (!decisionType) return;
    try {
      await decideMutation.mutateAsync({
        decision: decisionType,
        note: decisionNote.trim() || undefined,
      });
      setDecisionType(null);
      setDecisionNote('');
    } catch {
      // Error handled by mutation hook
    }
  };

  // Check if chosen decision mismatches AI recommendation
  const hasMismatch =
    (decisionType === 'APPROVE' && aiRecommendation === 'REJECT') ||
    (decisionType === 'REJECT' && aiRecommendation === 'PASS');

  const tone = totalScore !== null ? scoreTone(totalScore, cvPassThreshold) : null;

  const breakdown = screeningResult?.breakdown;
  const explanation = screeningResult?.explanation;

  return (
    <div className="flex flex-col gap-6">
      {/* Top Navigation */}
      <div className="flex items-center justify-between">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate(`/hr/jobs/${job.id}/candidates`)}
          className="gap-1.5 text-xs text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" /> Quay lại danh sách ứng viên
        </Button>
      </div>

      {/* KHỐI 1: Tổng quan (Header Card) */}
      <Card className="p-6">
        <div className="flex flex-col gap-6 md:flex-row md:items-start md:justify-between">
          {/* Candidate & Job Info */}
          <div className="space-y-3">
            <div className="flex flex-wrap items-center gap-2.5">
              <h1 className="text-2xl font-bold text-foreground">{candidate.fullName}</h1>
              <ApplicationStatusBadge status={status} />
            </div>

            <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-sm text-muted-foreground">
              <span className="flex items-center gap-1.5">
                <Mail className="h-4 w-4 text-slate-400" />
                {candidate.email}
              </span>
              <span className="text-slate-300">·</span>
              <span className="flex items-center gap-1.5">
                <FileText className="h-4 w-4 text-slate-400" />
                Vị trí:{' '}
                <Link
                  to={`/hr/jobs/${job.id}`}
                  className="font-medium text-foreground hover:text-primary hover:underline"
                >
                  {job.title}
                </Link>
              </span>
              <span className="text-slate-300">·</span>
              <span className="flex items-center gap-1.5">
                <Calendar className="h-4 w-4 text-slate-400" />
                Nộp ngày: {formatDateTime(application.createdAt)}
              </span>
            </div>
          </div>

          {/* Score & AI Recommendation & CV Button */}
          <div className="flex flex-wrap items-center gap-3 md:flex-col md:items-end">
            <div className="flex items-center gap-3">
              {/* Score Display */}
              {!isPendingAi && !isFailedAi && totalScore !== null ? (
                <div className="flex flex-col items-end">
                  <div className="flex items-baseline gap-1">
                    <span
                      className={cn(
                        'text-3xl font-extrabold',
                        tone === 'success' && 'text-green-600',
                        tone === 'warning' && 'text-amber-600',
                        tone === 'danger' && 'text-red-600',
                      )}
                    >
                      {totalScore}
                    </span>
                    <span className="text-sm font-medium text-muted-foreground">/100</span>
                  </div>
                  <span className="text-[11px] text-muted-foreground">
                    Ngưỡng đạt: <strong className="text-foreground">{cvPassThreshold} điểm</strong>
                  </span>
                </div>
              ) : null}

              {/* AI Recommendation Badge */}
              {aiRecommendation && !isPendingAi && !isFailedAi ? (
                <div className="flex flex-col items-end gap-1">
                  <AiRecommendationBadge value={aiRecommendation} />
                </div>
              ) : null}
            </div>

            {/* View Original CV Button */}
            <Button
              variant="outline"
              size="sm"
              disabled={loadingCv}
              onClick={handleOpenCv}
              className="gap-1.5 text-xs"
            >
              {loadingCv ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  Đang mở CV...
                </>
              ) : (
                <>
                  <ExternalLink className="h-3.5 w-3.5" />
                  Xem CV gốc
                </>
              )}
            </Button>
          </div>
        </div>
      </Card>

      {/* KHỐI 2: Trạng thái đặc biệt */}
      {isPendingAi && (
        <Card className="border-indigo-200 bg-indigo-50/50 p-5">
          <div className="flex items-start gap-3">
            <Loader2 className="mt-0.5 h-5 w-5 animate-spin text-primary" />
            <div>
              <h3 className="font-semibold text-foreground">AI đang sàng lọc và chấm điểm hồ sơ</h3>
              <p className="mt-1 text-sm text-muted-foreground">
                Hệ thống đang trích xuất kỹ năng từ CV, đối chiếu với tiêu chí tuyển dụng và tổng
                hợp đánh giá. Trang sẽ tự động làm mới khi có kết quả.
              </p>
            </div>
          </div>
        </Card>
      )}

      {isFailedAi && (
        <Card className="border-red-200 bg-red-50/70 p-5">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-start gap-3">
              <AlertCircle className="mt-0.5 h-5 w-5 text-red-600" />
              <div>
                <h3 className="font-semibold text-red-900">Quá trình chấm CV gặp sự cố</h3>
                <p className="mt-1 text-sm text-red-700">
                  {screeningError
                    ? `Lý do: ${screeningError}`
                    : 'Đã có lỗi xảy ra trong pipeline xử lý CV của AI.'}
                </p>
              </div>
            </div>
            <Button
              variant="destructive"
              size="sm"
              disabled={isRescreening}
              onClick={handleRescreen}
              className="gap-1.5 self-start sm:self-center"
            >
              {isRescreening ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <RotateCcw className="h-4 w-4" />
              )}
              Chấm lại CV
            </Button>
          </div>
        </Card>
      )}

      {/* KHỐI 3 & KHỐI 4: Chi tiết đánh giá AI & Quyết định HR */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Left Column (2 Cols): Breakdown, Skills, Explanations */}
        <div className="space-y-6 lg:col-span-2">
          {screeningResult && breakdown ? (
            <>
              {/* Capped Warning Banner */}
              {breakdown.capped && (
                <div className="flex items-center gap-2.5 rounded-lg border border-amber-300 bg-amber-50 p-4 text-sm font-medium text-amber-800">
                  <AlertTriangle className="h-5 w-5 shrink-0 text-amber-600" />
                  <span>Bị giới hạn 49 điểm do thiếu quá nửa kỹ năng bắt buộc</span>
                </div>
              )}

              {/* 5 Component Progress Bars */}
              <Card className="p-6">
                <h2 className="mb-4 flex items-center gap-2 font-semibold text-foreground">
                  <Layers className="h-4 w-4 text-primary" />
                  Điểm thành phần chi tiết
                </h2>

                <div className="space-y-4">
                  {/* 1. Kỹ năng bắt buộc */}
                  <div className="space-y-1.5">
                    <div className="flex justify-between text-xs">
                      <span className="font-medium text-foreground">
                        Kỹ năng bắt buộc
                        {breakdown.requiredSkills.weight > 0 && (
                          <span className="text-muted-foreground ml-1.5">
                            (Trọng số: {breakdown.requiredSkills.weight}%)
                          </span>
                        )}
                      </span>
                      <span className="font-semibold text-foreground">
                        {breakdown.requiredSkills.score}/100
                      </span>
                    </div>
                    <Progress value={breakdown.requiredSkills.score} className="h-2" />
                  </div>

                  {/* 2. Kỹ năng ưu tiên */}
                  <div className="space-y-1.5">
                    <div className="flex justify-between text-xs">
                      <span className="font-medium text-foreground">
                        Kỹ năng ưu tiên
                        {breakdown.preferredSkills.weight > 0 && (
                          <span className="text-muted-foreground ml-1.5">
                            (Trọng số: {breakdown.preferredSkills.weight}%)
                          </span>
                        )}
                      </span>
                      <span className="font-semibold text-foreground">
                        {breakdown.preferredSkills.score}/100
                      </span>
                    </div>
                    <Progress value={breakdown.preferredSkills.score} className="h-2" />
                  </div>

                  {/* 3. Kinh nghiệm */}
                  <div className="space-y-1.5">
                    <div className="flex justify-between text-xs">
                      <span className="font-medium text-foreground">
                        Kinh nghiệm làm việc
                        {breakdown.experienceYears.weight > 0 && (
                          <span className="text-muted-foreground ml-1.5">
                            (Trọng số: {breakdown.experienceYears.weight}%)
                          </span>
                        )}
                        {breakdown.experienceYears.candidateYears !== undefined && (
                          <span className="text-slate-500 ml-1.5">
                            — Ứng viên: {breakdown.experienceYears.candidateYears} năm
                            {breakdown.experienceYears.requiredYears !== null &&
                              ` / Yêu cầu: ${breakdown.experienceYears.requiredYears} năm`}
                          </span>
                        )}
                      </span>
                      <span className="font-semibold text-foreground">
                        {breakdown.experienceYears.score}/100
                      </span>
                    </div>
                    <Progress value={breakdown.experienceYears.score} className="h-2" />
                  </div>

                  {/* 4. Mức độ phù hợp */}
                  <div className="space-y-1.5">
                    <div className="flex justify-between text-xs">
                      <span className="font-medium text-foreground">
                        Mức độ phù hợp
                        {breakdown.relevance.weight > 0 && (
                          <span className="text-muted-foreground ml-1.5">
                            (Trọng số: {breakdown.relevance.weight}%)
                          </span>
                        )}
                        {breakdown.relevance.comment && (
                          <span className="text-slate-500 ml-1.5 font-normal truncate max-w-[200px] inline-block">
                            ({breakdown.relevance.comment})
                          </span>
                        )}
                      </span>
                      <span className="font-semibold text-foreground">
                        {breakdown.relevance.score}/100
                      </span>
                    </div>
                    <Progress value={breakdown.relevance.score} className="h-2" />
                  </div>

                  {/* 5. Độ tương đồng ngữ nghĩa */}
                  <div className="space-y-1.5">
                    <div className="flex justify-between text-xs">
                      <span className="font-medium text-foreground">
                        Độ tương đồng ngữ nghĩa
                        {breakdown.similarity.weight > 0 && (
                          <span className="text-muted-foreground ml-1.5">
                            (Trọng số: {breakdown.similarity.weight}%)
                          </span>
                        )}
                      </span>
                      <span className="font-semibold text-foreground">
                        {breakdown.similarity.score}/100
                      </span>
                    </div>
                    <Progress value={breakdown.similarity.score} className="h-2" />
                  </div>
                </div>
              </Card>

              {/* Matched & Missing Skills Card */}
              <Card className="p-6">
                <h2 className="mb-4 flex items-center gap-2 font-semibold text-foreground">
                  <CheckCircle className="h-4 w-4 text-primary" />
                  Đối chiếu kỹ năng
                </h2>

                <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                  {/* Kỹ năng bắt buộc */}
                  <div className="rounded-lg border border-slate-200 p-4">
                    <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">
                      Kỹ năng bắt buộc
                    </h3>
                    <div className="space-y-3">
                      <div>
                        <div className="text-xs font-medium text-green-700 mb-1.5 flex items-center gap-1">
                          <CheckCircle className="h-3 w-3" />
                          Khớp ({breakdown.requiredSkills.matched.length})
                        </div>
                        <div className="flex flex-wrap gap-1.5">
                          {breakdown.requiredSkills.matched.length > 0 ? (
                            breakdown.requiredSkills.matched.map((s) => (
                              <Badge key={s} variant="success">
                                {s}
                              </Badge>
                            ))
                          ) : (
                            <span className="text-xs text-muted-foreground italic">
                              Không có kỹ năng khớp
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="border-t border-slate-100 pt-3">
                        <div className="text-xs font-medium text-red-600 mb-1.5 flex items-center gap-1">
                          <XCircle className="h-3 w-3" />
                          Còn thiếu ({breakdown.requiredSkills.missing.length})
                        </div>
                        <div className="flex flex-wrap gap-1.5">
                          {breakdown.requiredSkills.missing.length > 0 ? (
                            breakdown.requiredSkills.missing.map((s) => (
                              <Badge key={s} variant="danger">
                                {s}
                              </Badge>
                            ))
                          ) : (
                            <span className="text-xs text-muted-foreground italic">
                              Đã đáp ứng đủ kỹ năng
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Kỹ năng ưu tiên */}
                  <div className="rounded-lg border border-slate-200 p-4">
                    <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">
                      Kỹ năng ưu tiên
                    </h3>
                    <div className="space-y-3">
                      <div>
                        <div className="text-xs font-medium text-green-700 mb-1.5 flex items-center gap-1">
                          <CheckCircle className="h-3 w-3" />
                          Khớp ({breakdown.preferredSkills.matched.length})
                        </div>
                        <div className="flex flex-wrap gap-1.5">
                          {breakdown.preferredSkills.matched.length > 0 ? (
                            breakdown.preferredSkills.matched.map((s) => (
                              <Badge key={s} variant="success">
                                {s}
                              </Badge>
                            ))
                          ) : (
                            <span className="text-xs text-muted-foreground italic">
                              Không có kỹ năng khớp
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="border-t border-slate-100 pt-3">
                        <div className="text-xs font-medium text-red-600 mb-1.5 flex items-center gap-1">
                          <XCircle className="h-3 w-3" />
                          Còn thiếu ({breakdown.preferredSkills.missing.length})
                        </div>
                        <div className="flex flex-wrap gap-1.5">
                          {breakdown.preferredSkills.missing.length > 0 ? (
                            breakdown.preferredSkills.missing.map((s) => (
                              <Badge key={s} variant="danger">
                                {s}
                              </Badge>
                            ))
                          ) : (
                            <span className="text-xs text-muted-foreground italic">
                              Đã đáp ứng đủ kỹ năng
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </Card>

              {/* Explanations Card */}
              {explanation && (
                <Card className="p-6">
                  <h2 className="mb-4 flex items-center gap-2 font-semibold text-foreground">
                    <Sparkles className="h-4 w-4 text-primary" />
                    Giải thích chi tiết từ AI
                  </h2>

                  <div className="space-y-5">
                    {/* Summary */}
                    {explanation.summary && (
                      <div className="rounded-lg bg-slate-50 p-4 text-sm leading-relaxed text-slate-800">
                        <strong className="text-foreground">Tóm tắt: </strong>
                        {explanation.summary}
                      </div>
                    )}

                    {/* Strengths with Quotes */}
                    {explanation.strengths && explanation.strengths.length > 0 && (
                      <div>
                        <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-1.5">
                          <Award className="h-4 w-4 text-green-600" />
                          Điểm mạnh nổi bật
                        </h3>
                        <div className="space-y-3">
                          {explanation.strengths.map((item, idx) => (
                            <div key={idx} className="text-sm text-foreground space-y-1.5">
                              <div className="font-medium">• {item.text}</div>
                              {item.quote && (
                                <blockquote className="border-l-4 border-indigo-400 bg-indigo-50/60 py-2 px-3 text-xs italic text-slate-700 rounded-r">
                                  &ldquo;{item.quote}&rdquo;
                                </blockquote>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Gaps */}
                    {explanation.gaps && explanation.gaps.length > 0 && (
                      <div className="border-t border-slate-100 pt-4">
                        <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-1.5">
                          <AlertTriangle className="h-4 w-4 text-amber-600" />
                          Điểm hạn chế & Kỹ năng thiếu
                        </h3>
                        <div className="space-y-2">
                          {explanation.gaps.map((gap, idx) => (
                            <div key={idx} className="flex items-start gap-2 text-sm">
                              <span className="text-amber-600 font-bold">•</span>
                              <div>
                                {gap.skill && (
                                  <Badge variant="outline" className="mr-2 text-xs">
                                    {gap.skill}
                                  </Badge>
                                )}
                                <span className="text-slate-700">{gap.note || gap.skill}</span>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </Card>
              )}
            </>
          ) : (
            <Card className="p-8 text-center text-sm text-muted-foreground">
              {isPendingAi
                ? 'Đang chờ AI phân tích kết quả...'
                : 'Chưa có dữ liệu phân tích chi tiết của hồ sơ này.'}
            </Card>
          )}
        </div>

        {/* Right Column (1 Col): HR Decision & Status History Timeline */}
        <div className="space-y-6">
          {/* KHỐI 4: Quyết định của HR */}
          <Card className="p-6">
            <h2 className="mb-4 font-semibold text-foreground">Quyết định của HR</h2>

            {isScreened ? (
              <div className="space-y-4">
                <p className="text-xs text-muted-foreground">
                  Hồ sơ đã hoàn thành sàng lọc CV. Hãy đưa ra quyết định mời phỏng vấn hoặc loại ứng
                  viên.
                </p>

                <div className="flex flex-col gap-2.5">
                  <Button
                    variant="default"
                    className="w-full justify-center gap-2 bg-green-600 hover:bg-green-700 text-white"
                    onClick={() => {
                      setDecisionType('APPROVE');
                      setDecisionNote('');
                    }}
                  >
                    <CheckCircle className="h-4 w-4" />
                    Duyệt (mời phỏng vấn)
                  </Button>

                  <Button
                    variant="outline"
                    className="w-full justify-center gap-2 text-red-600 hover:bg-red-50 hover:text-red-700 border-red-200"
                    onClick={() => {
                      setDecisionType('REJECT');
                      setDecisionNote('');
                    }}
                  >
                    <XCircle className="h-4 w-4" />
                    Loại hồ sơ
                  </Button>
                </div>
              </div>
            ) : isDecided ? (
              <div className="space-y-3.5 text-sm">
                <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
                  <span className="text-muted-foreground">Kết quả quyết định</span>
                  <ApplicationStatusBadge status={status} />
                </div>

                {hrDecisionBy && (
                  <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
                    <span className="text-muted-foreground">Người quyết định</span>
                    <span className="font-medium text-foreground">{hrDecisionBy.fullName}</span>
                  </div>
                )}

                {hrDecisionAt && (
                  <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
                    <span className="text-muted-foreground">Thời gian quyết định</span>
                    <span className="text-foreground">{formatDateTime(hrDecisionAt)}</span>
                  </div>
                )}

                {hrNote && (
                  <div className="pt-1">
                    <span className="text-xs font-medium text-muted-foreground">
                      Ghi chú của HR:
                    </span>
                    <p className="mt-1 rounded-md bg-slate-50 p-2.5 text-xs text-slate-700 whitespace-pre-wrap">
                      {hrNote}
                    </p>
                  </div>
                )}
              </div>
            ) : (
              <p className="text-xs text-muted-foreground">
                Hồ sơ đang ở trạng thái{' '}
                <strong className="text-foreground">{HR_STATUS[status]?.label ?? status}</strong>.
                Bạn chỉ có thể ra quyết định khi hồ sơ ở trạng thái &ldquo;Chờ duyệt&rdquo;.
              </p>
            )}
          </Card>

          {/* Timeline Lịch sử trạng thái */}
          {statusHistories && statusHistories.length > 0 && (
            <Card className="p-6">
              <h2 className="mb-4 flex items-center gap-2 font-semibold text-foreground">
                <History className="h-4 w-4 text-primary" />
                Lịch sử trạng thái
              </h2>

              <div className="relative border-l-2 border-slate-200 pl-4 space-y-4 ml-2">
                {statusHistories.map((hist) => (
                  <div key={hist.id} className="relative">
                    {/* Timeline bullet */}
                    <span className="absolute -left-[21px] top-1.5 h-2.5 w-2.5 rounded-full bg-primary ring-4 ring-background" />

                    <div className="space-y-0.5">
                      <div className="flex flex-wrap items-center gap-1.5 text-xs">
                        {hist.fromStatus && (
                          <>
                            <span className="text-muted-foreground">
                              {HR_STATUS[hist.fromStatus]?.label ?? hist.fromStatus}
                            </span>
                            <span className="text-slate-300">→</span>
                          </>
                        )}
                        <span className="font-semibold text-foreground">
                          {HR_STATUS[hist.toStatus]?.label ?? hist.toStatus}
                        </span>
                      </div>
                      <div className="text-[11px] text-muted-foreground">
                        {formatDateTime(hist.changedAt)}
                      </div>
                      {hist.reason && (
                        <p className="text-[11px] text-slate-600 mt-1 italic">
                          Lý do: {hist.reason}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          )}
        </div>
      </div>

      {/* Decision Confirmation AlertDialog */}
      <AlertDialog
        open={decisionType !== null}
        onOpenChange={(open) => !open && setDecisionType(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {decisionType === 'APPROVE'
                ? 'Xác nhận duyệt hồ sơ ứng viên'
                : 'Xác nhận loại hồ sơ ứng viên'}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {decisionType === 'APPROVE'
                ? `Bạn đang chuẩn bị duyệt hồ sơ của ứng viên "${candidate.fullName}" để mời vào vòng phỏng vấn.`
                : `Bạn đang chuẩn bị loại hồ sơ của ứng viên "${candidate.fullName}". Ứng viên sẽ nhận được thông báo kết quả.`}
            </AlertDialogDescription>
          </AlertDialogHeader>

          {/* AI Mismatch Warning */}
          {hasMismatch && (
            <div className="flex items-center gap-2.5 rounded-md border border-amber-300 bg-amber-50 p-3 text-xs font-medium text-amber-800">
              <AlertTriangle className="h-4 w-4 shrink-0 text-amber-600" />
              <span>Bạn đang chọn khác đề xuất của AI</span>
            </div>
          )}

          {/* HR Note Textarea */}
          <div className="space-y-2 py-2">
            <label htmlFor="hr-note" className="text-xs font-medium text-foreground">
              Ghi chú của HR (tùy chọn)
            </label>
            <textarea
              id="hr-note"
              value={decisionNote}
              onChange={(e) => setDecisionNote(e.target.value)}
              placeholder="Nhập lý do hoặc ghi chú nội bộ cho quyết định này..."
              rows={3}
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-xs placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            />
          </div>

          <AlertDialogFooter>
            <AlertDialogCancel disabled={decideMutation.isPending}>Hủy</AlertDialogCancel>
            <Button
              variant={decisionType === 'APPROVE' ? 'default' : 'destructive'}
              disabled={decideMutation.isPending}
              onClick={handleConfirmDecision}
              className="gap-1.5"
            >
              {decideMutation.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
              {decisionType === 'APPROVE' ? 'Duyệt hồ sơ' : 'Loại hồ sơ'}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
