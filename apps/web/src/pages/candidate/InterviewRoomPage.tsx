import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import {
  AlertCircle,
  ArrowLeft,
  CheckCircle2,
  Clock3,
  Loader2,
  Mic,
  Radio,
  Send,
  Sparkles,
} from 'lucide-react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { toast } from 'sonner';
import { useInterviewTranscript } from '@/hooks/useInterviewTranscript';
import { useInterviewSocket } from '@/hooks/useInterviewSocket';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { useJob } from '@/hooks/useJobs';
import { useMyApplications } from '@/hooks/useMyApplications';
import { buttonVariants } from '@/components/ui/button-variants';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Textarea } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';

type PreparationStep = 1 | 2;
type AnswerMode = 'VOICE' | 'TEXT';

function formatDeadline(value: string | null | undefined): string {
  if (!value) return 'Chưa xác định';
  return new Date(value).toLocaleString('vi-VN', { dateStyle: 'medium', timeStyle: 'short' });
}

function InterviewHeader({ interviewId }: { interviewId: string }) {
  return (
    <Link
      to="/candidate/applications"
      className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-600 hover:text-foreground"
    >
      <ArrowLeft className="h-4 w-4" />
      Hồ sơ của tôi
      <span className="sr-only">({interviewId})</span>
    </Link>
  );
}

export default function InterviewRoomPage() {
  const { interviewId = '' } = useParams<{ interviewId: string }>();
  const navigate = useNavigate();
  const session = useCurrentUser();
  const applicationsQuery = useMyApplications(
    session.user?.role === 'CANDIDATE' ? session.user.id : undefined,
  );
  const application = applicationsQuery.data?.find(
    (item) => (item.interview?.id ?? item.interviewId) === interviewId,
  );
  const jobQuery = useJob(application?.job.id ?? '');
  const onAuthInvalid = useCallback(() => navigate('/login', { replace: true }), [navigate]);
  const {
    state,
    error,
    isConnected,
    isReconnecting,
    isPreparing,
    isSubmitting,
    startInterview,
    submitTextAnswer,
  } = useInterviewSocket({ interviewId, onAuthInvalid });
  const transcriptQuery = useInterviewTranscript(interviewId, state?.phase === 'SUBMITTED');

  const [step, setStep] = useState<PreparationStep>(1);
  const [consent, setConsent] = useState(false);
  const [answer, setAnswer] = useState('');
  const [answerMode, setAnswerMode] = useState<AnswerMode>('TEXT');
  const [micMessage, setMicMessage] = useState('Đang kiểm tra micro…');
  const [micLevel, setMicLevel] = useState(0);

  useEffect(() => {
    if (step !== 2) return;
    let active = true;
    let stream: MediaStream | null = null;
    let audioContext: AudioContext | null = null;
    let animationFrame = 0;

    const checkMicrophone = async () => {
      try {
        if (!navigator.mediaDevices?.getUserMedia) {
          throw new Error('Trình duyệt không hỗ trợ truy cập micro.');
        }
        stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        if (!active) {
          stream.getTracks().forEach((track) => track.stop());
          return;
        }
        audioContext = new AudioContext();
        const analyser = audioContext.createAnalyser();
        analyser.fftSize = 256;
        audioContext.createMediaStreamSource(stream).connect(analyser);
        const samples = new Uint8Array(analyser.frequencyBinCount);
        setMicMessage('Micro hoạt động. Bạn có thể tiếp tục ở chế độ trả lời bằng chữ.');

        const sampleLevel = () => {
          if (!active) return;
          analyser.getByteTimeDomainData(samples);
          let sum = 0;
          for (const sample of samples) {
            const normalized = (sample - 128) / 128;
            sum += normalized * normalized;
          }
          setMicLevel(Math.min(100, Math.round(Math.sqrt(sum / samples.length) * 300)));
          animationFrame = requestAnimationFrame(sampleLevel);
        };
        sampleLevel();
      } catch {
        if (!active) return;
        stream?.getTracks().forEach((track) => track.stop());
        if (audioContext && audioContext.state !== 'closed') void audioContext.close();
        stream = null;
        audioContext = null;
        setAnswerMode('TEXT');
        setMicMessage('Không truy cập được micro. Bạn sẽ trả lời bằng chữ.');
      }
    };

    void checkMicrophone();
    return () => {
      active = false;
      cancelAnimationFrame(animationFrame);
      stream?.getTracks().forEach((track) => track.stop());
      if (audioContext && audioContext.state !== 'closed') void audioContext.close();
      setMicLevel(0);
    };
  }, [step]);

  useEffect(() => {
    if (state?.phase !== 'IN_PROGRESS') return;
    const warnBeforeLeaving = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = '';
    };
    window.addEventListener('beforeunload', warnBeforeLeaving);
    return () => window.removeEventListener('beforeunload', warnBeforeLeaving);
  }, [state?.phase]);

  const transcriptTurns = useMemo(() => {
    if (transcriptQuery.data?.transcriptStatus === 'COMPLETED') {
      return transcriptQuery.data.turns;
    }
    return (
      state?.answeredTurns.map((turn) => ({
        turnId: turn.turnId,
        order: turn.order,
        question: turn.question,
        answerText: turn.answerText,
        transcriptStatus:
          turn.transcriptStatus === 'NO_SPEECH'
            ? ('COMPLETED' as const)
            : turn.transcriptStatus === 'DONE'
              ? ('COMPLETED' as const)
              : ('PENDING' as const),
      })) ?? []
    );
  }, [state?.answeredTurns, transcriptQuery.data]);

  const handleSubmitAnswer = () => {
    if (answerMode !== 'TEXT') {
      toast.info('Hãy chuyển sang trả lời bằng chữ để gửi câu trả lời.');
      return;
    }
    if (submitTextAnswer(answer)) setAnswer('');
  };

  const handleStart = () => {
    if (!consent) {
      toast.error('Bạn cần đồng ý để AI xử lý và lưu câu trả lời trước khi bắt đầu.');
      return;
    }
    startInterview();
  };

  if (!interviewId) {
    return <InvalidInterview message="Không tìm thấy mã phiên phỏng vấn hợp lệ." />;
  }

  if (state?.phase === 'EXPIRED' || error?.code === 'INTERVIEW_EXPIRED') {
    return (
      <RoomShell interviewId={interviewId}>
        <StatusCard
          icon={<Clock3 className="h-8 w-8 text-amber-600" />}
          title="Đã quá hạn phỏng vấn"
          description="Hạn tham gia phiên phỏng vấn đã kết thúc. Vui lòng quay lại hồ sơ của bạn."
        />
      </RoomShell>
    );
  }

  if (error?.code === 'INTERVIEW_NOT_FOUND' || error?.code === 'FORBIDDEN') {
    return (
      <InvalidInterview
        message={error.message || 'Phiên phỏng vấn không tồn tại hoặc bạn không có quyền truy cập.'}
      />
    );
  }

  if (!state) {
    return (
      <RoomShell interviewId={interviewId}>
        {isReconnecting && <ConnectionBanner />}
        {error ? (
          <StatusCard
            icon={<AlertCircle className="h-8 w-8 text-destructive" />}
            title="Không thể kết nối phòng phỏng vấn"
            description={error.message}
          />
        ) : (
          <div className="space-y-4">
            <Skeleton className="h-10 w-64" />
            <Skeleton className="h-80 w-full" />
          </div>
        )}
      </RoomShell>
    );
  }

  const title = jobQuery.data?.title ?? application?.job.title ?? 'Phỏng vấn AI';
  const questionCount = jobQuery.data?.interviewQuestionCount ?? state.totalQuestions;
  const currentQuestion = state.currentQuestion;

  if (state.phase === 'SUBMITTED') {
    const transcriptReady = transcriptQuery.data?.transcriptStatus === 'COMPLETED';
    const isConverting =
      !transcriptQuery.isNotFound &&
      !transcriptReady &&
      !transcriptQuery.isError &&
      (transcriptQuery.isPending ||
        transcriptQuery.data?.transcriptStatus === 'PENDING' ||
        transcriptQuery.data?.transcriptStatus === 'PROCESSING' ||
        state.transcriptStatus === 'TRANSCRIBING');
    return (
      <RoomShell interviewId={interviewId}>
        {isReconnecting && <ConnectionBanner />}
        <Card className="space-y-6 p-6 sm:p-8">
          <div className="mx-auto flex max-w-xl flex-col items-center gap-3 text-center">
            <span className="flex h-14 w-14 items-center justify-center rounded-full bg-green-50">
              <CheckCircle2 className="h-8 w-8 text-green-600" />
            </span>
            <h1 className="text-page-title text-foreground">Bạn đã hoàn thành phỏng vấn</h1>
            <p className="text-sm text-muted-foreground">
              Cảm ơn bạn đã hoàn thành. Kết quả sẽ được thông báo trên trang Hồ sơ của tôi.
            </p>
          </div>

          {isConverting && (
            <div className="flex items-center justify-center gap-2 rounded-lg bg-indigo-50 p-4 text-sm text-indigo-800">
              <Loader2 className="h-4 w-4 animate-spin" />
              Đang chuyển câu trả lời thành chữ…
            </div>
          )}
          {transcriptQuery.isNotFound && (
            <p className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900">
              API transcript chưa khả dụng; đang hiển thị dữ liệu đã nhận từ phiên phỏng vấn.
            </p>
          )}
          {transcriptQuery.isError && !transcriptQuery.isNotFound && (
            <p
              role="alert"
              className="rounded-lg border border-red-200 bg-red-50 p-3 text-xs text-red-800"
            >
              Không tải được transcript. Đang hiển thị dữ liệu dự phòng từ phiên phỏng vấn.
            </p>
          )}
          {transcriptQuery.data?.transcriptStatus === 'FAILED' && (
            <p className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900">
              Chưa thể chuyển một số câu trả lời thành chữ; đang hiển thị dữ liệu đã nhận từ phiên.
            </p>
          )}

          <div className="space-y-3">
            {transcriptTurns.map((turn) => {
              const answerText =
                turn.transcriptStatus === 'COMPLETED' && !turn.answerText?.trim()
                  ? 'Không nghe thấy lời nói'
                  : turn.answerText?.trim() || 'Bản chép lời chưa có sẵn.';
              return (
                <article key={turn.turnId} className="rounded-lg border border-slate-200 p-4">
                  <h2 className="text-sm font-semibold text-foreground">
                    Câu {turn.order}: {turn.question}
                  </h2>
                  <p className="mt-2 whitespace-pre-wrap text-sm text-slate-700">{answerText}</p>
                </article>
              );
            })}
            {transcriptTurns.length === 0 && !isConverting && (
              <p className="text-center text-sm text-muted-foreground">
                Chưa có lượt trả lời để hiển thị.
              </p>
            )}
          </div>
        </Card>
      </RoomShell>
    );
  }

  if (state.phase === 'IN_PROGRESS') {
    return (
      <RoomShell interviewId={interviewId}>
        {isReconnecting && <ConnectionBanner />}
        {error && <InlineError message={error.message} />}
        <Card className="space-y-6 p-5 sm:p-8">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-primary">{title}</p>
              <h1 className="mt-1 text-xl font-bold text-foreground">Phỏng vấn AI</h1>
            </div>
            <span className="rounded-full bg-indigo-50 px-3 py-1 text-xs font-semibold text-indigo-700">
              {currentQuestion
                ? `Câu ${currentQuestion.order}/${currentQuestion.total}`
                : `Đã trả lời ${state.answeredTurns.length}/${state.totalQuestions}`}
            </span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-slate-100">
            <div
              className="h-full rounded-full bg-primary transition-all"
              style={{
                width: `${Math.min(100, (state.answeredTurns.length / Math.max(state.totalQuestions, 1)) * 100)}%`,
              }}
            />
          </div>

          {state.answeredTurns.length > 0 && (
            <div className="space-y-3">
              <h2 className="text-sm font-semibold text-foreground">Các câu đã trả lời</h2>
              {state.answeredTurns.map((turn) => (
                <div key={turn.turnId} className="rounded-lg bg-slate-50 p-3">
                  <p className="text-xs font-semibold text-slate-700">
                    Câu {turn.order}: {turn.question}
                  </p>
                  <p className="mt-1 whitespace-pre-wrap text-sm text-slate-600">
                    {turn.answerText || 'Câu trả lời bằng giọng nói đang được xử lý.'}
                  </p>
                </div>
              ))}
            </div>
          )}

          {isPreparing || !currentQuestion ? (
            <div className="flex items-center gap-3 rounded-lg border border-indigo-100 bg-indigo-50 p-6 text-sm text-indigo-900">
              <Loader2 className="h-5 w-5 animate-spin" />
              Đang chuẩn bị câu hỏi…
            </div>
          ) : (
            <section className="space-y-4">
              <div className="rounded-xl border border-indigo-100 bg-indigo-50/60 p-5">
                <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-indigo-700">
                  Câu hỏi phỏng vấn
                </p>
                <p className="text-base font-medium leading-relaxed text-slate-900">
                  {currentQuestion.text}
                </p>
              </div>
              <div className="flex flex-wrap items-center justify-between gap-2">
                <label htmlFor="interview-answer" className="text-sm font-semibold text-foreground">
                  Câu trả lời của bạn
                </label>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  disabled={answerMode === 'TEXT'}
                  onClick={() => setAnswerMode('TEXT')}
                >
                  Chuyển sang trả lời bằng chữ
                </Button>
              </div>
              <Textarea
                id="interview-answer"
                value={answer}
                maxLength={3000}
                disabled={isSubmitting || !isConnected}
                placeholder="Nhập câu trả lời của bạn…"
                onChange={(event) => setAnswer(event.target.value)}
                onPaste={(event) => {
                  event.preventDefault();
                  toast.info('Vui lòng tự nhập câu trả lời, không dán nội dung.');
                }}
              />
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span>Vui lòng tự nhập câu trả lời; thao tác dán bị tắt.</span>
                <span>{answer.length}/3000</span>
              </div>
              <Button
                className="w-full gap-2 sm:w-auto"
                disabled={
                  !answer.trim() ||
                  answer.length > 3000 ||
                  isSubmitting ||
                  isPreparing ||
                  !isConnected ||
                  answerMode !== 'TEXT'
                }
                onClick={handleSubmitAnswer}
              >
                {isSubmitting ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Send className="h-4 w-4" />
                )}
                Gửi câu trả lời
              </Button>
            </section>
          )}
        </Card>
      </RoomShell>
    );
  }

  return (
    <RoomShell interviewId={interviewId}>
      {!isConnected && <ConnectionBanner />}
      {error && <InlineError message={error.message} />}
      <Card className="space-y-6 p-6 sm:p-8">
        <div className="flex items-start gap-4">
          <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-indigo-50 text-primary">
            <Sparkles className="h-6 w-6" />
          </span>
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-primary">
              Phỏng vấn AI
            </p>
            <h1 className="mt-1 text-2xl font-bold text-foreground">
              {step === 1 ? 'Chào mừng bạn đến phòng phỏng vấn' : 'Chuẩn bị trước khi bắt đầu'}
            </h1>
            <p className="mt-2 text-sm text-muted-foreground">{title}</p>
          </div>
        </div>

        {step === 1 ? (
          <>
            <div className="grid gap-3 sm:grid-cols-2">
              <InfoTile label="Số câu hỏi" value={`${questionCount} câu`} />
              <InfoTile
                label="Thời lượng dự kiến"
                value={`${Math.max(3, questionCount * 2)}–${Math.max(5, questionCount * 3)} phút`}
              />
              <InfoTile label="Hình thức trả lời" value="Nhập câu trả lời bằng chữ" />
              <InfoTile
                label="Hạn tham gia (7 ngày từ khi mời)"
                value={formatDeadline(state.inviteExpiresAt)}
              />
              <InfoTile label="Hạn hoàn thành" value="Trong vòng 24 giờ kể từ khi bắt đầu" />
            </div>
            <p className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm font-medium leading-relaxed text-amber-900">
              Mỗi hồ sơ chỉ phỏng vấn 1 lần; mỗi câu được nghe lại và ghi âm lại tối đa 3 lần trước
              khi gửi.
            </p>
            <Button className="w-full sm:w-auto" onClick={() => setStep(2)}>
              Tiếp tục
            </Button>
          </>
        ) : (
          <>
            <label className="flex cursor-pointer items-start gap-3 rounded-lg border border-slate-200 p-4 text-sm leading-relaxed">
              <input
                type="checkbox"
                className="mt-1 h-4 w-4 accent-indigo-600"
                checked={consent}
                onChange={(event) => setConsent(event.target.checked)}
              />
              <span>
                Tôi đồng ý cho AI xử lý và lưu câu trả lời phỏng vấn
                <span className="ml-1 text-destructive">*</span>
              </span>
            </label>

            <div className="rounded-lg border border-slate-200 p-4">
              <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-2 text-sm font-semibold">
                  <Mic className="h-4 w-4 text-primary" />
                  Kiểm tra micro
                </div>
                <span className="text-xs text-muted-foreground">{micMessage}</span>
              </div>
              <div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-100">
                <div
                  className="h-full rounded-full bg-emerald-500 transition-[width]"
                  style={{ width: `${micLevel}%` }}
                />
              </div>
              <p className="mt-3 text-xs text-muted-foreground">
                Phòng phỏng vấn hiện hỗ trợ trả lời bằng chữ. Bạn có thể tiếp tục nếu không có micro
                hoặc không muốn cấp quyền.
              </p>
            </div>

            <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-between">
              <Button variant="outline" onClick={() => setStep(1)}>
                Quay lại
              </Button>
              <Button disabled={!consent || !isConnected || isPreparing} onClick={handleStart}>
                {isPreparing ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Radio className="mr-2 h-4 w-4" />
                )}
                Bắt đầu phỏng vấn
              </Button>
            </div>
          </>
        )}
      </Card>
    </RoomShell>
  );
}

function RoomShell({ interviewId, children }: { interviewId: string; children: ReactNode }) {
  return (
    <main className="mx-auto flex w-full max-w-[900px] flex-col gap-5 py-5">
      <InterviewHeader interviewId={interviewId} />
      {children}
    </main>
  );
}

function StatusCard({
  icon,
  title,
  description,
}: {
  icon: ReactNode;
  title: string;
  description: string;
}) {
  return (
    <Card className="flex flex-col items-center gap-3 p-8 text-center">
      {icon}
      <h1 className="text-xl font-bold text-foreground">{title}</h1>
      <p className="max-w-lg text-sm text-muted-foreground">{description}</p>
      <Link
        to="/candidate/applications"
        className={buttonVariants({ variant: 'outline', size: 'sm', className: 'mt-2' })}
      >
        Quay về Hồ sơ của tôi
      </Link>
    </Card>
  );
}

function InvalidInterview({ message }: { message: string }) {
  return (
    <main className="mx-auto flex w-full max-w-[900px] flex-col gap-5 py-5">
      <StatusCard
        icon={<AlertCircle className="h-8 w-8 text-destructive" />}
        title="Không thể mở phiên phỏng vấn"
        description={message}
      />
    </main>
  );
}

function ConnectionBanner() {
  return (
    <div
      role="status"
      className="flex items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900"
    >
      <Loader2 className="h-4 w-4 animate-spin" />
      Đang kết nối lại…
    </div>
  );
}

function InlineError({ message }: { message: string }) {
  return (
    <p
      role="alert"
      className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800"
    >
      {message}
    </p>
  );
}

function InfoTile({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg bg-slate-50 p-4">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="mt-1 text-sm font-semibold text-foreground">{value}</p>
    </div>
  );
}
