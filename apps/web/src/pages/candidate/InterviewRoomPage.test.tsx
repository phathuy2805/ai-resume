import { cleanup, createEvent, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import InterviewRoomPage from './InterviewRoomPage';

const pageMocks = vi.hoisted(() => ({ socketResult: {} as Record<string, unknown> }));

vi.mock('@/hooks/useInterviewSocket', () => ({
  useInterviewSocket: () => pageMocks.socketResult,
}));
vi.mock('@/hooks/useInterviewTranscript', () => ({
  useInterviewTranscript: () => pageMocks.socketResult.transcriptResult,
}));
vi.mock('@/hooks/useCurrentUser', () => ({
  useCurrentUser: () => ({
    user: { id: 'candidate-1', role: 'CANDIDATE' },
    isLoading: false,
    error: null,
  }),
}));
vi.mock('@/hooks/useMyApplications', () => ({
  useMyApplications: () => ({
    data: [
      {
        id: 'application-1',
        interviewId: 'interview-1',
        job: { id: 'job-1', title: 'Backend Engineer' },
      },
    ],
  }),
}));
vi.mock('@/hooks/useJobs', () => ({
  useJob: () => ({ data: { title: 'Backend Engineer', interviewQuestionCount: 2 } }),
}));

function renderPage() {
  return render(
    <MemoryRouter initialEntries={['/candidate/interviews/interview-1']}>
      <Routes>
        <Route path="/candidate/interviews/:interviewId" element={<InterviewRoomPage />} />
      </Routes>
    </MemoryRouter>,
  );
}

function makeState(
  phase: 'NOT_STARTED' | 'IN_PROGRESS' | 'SUBMITTED' | 'EXPIRED',
  extra: Record<string, unknown> = {},
) {
  return {
    interviewId: 'interview-1',
    status:
      phase === 'IN_PROGRESS'
        ? 'INTERVIEWING'
        : phase === 'SUBMITTED'
          ? 'EVALUATED'
          : 'INTERVIEW_INVITED',
    phase,
    inviteExpiresAt: '2026-12-05T10:00:00Z',
    sessionExpiresAt: null,
    expiresAt: '2026-12-05T10:00:00Z',
    isExpired: phase === 'EXPIRED',
    recordingConsentAt: null,
    startedAt: null,
    completedAt: null,
    transcriptStatus: 'NONE',
    processingDelayed: false,
    totalQuestions: 2,
    currentQuestion: null,
    answeredTurns: [],
    ...extra,
  };
}

beforeEach(() => {
  pageMocks.socketResult = {
    state: makeState('NOT_STARTED'),
    error: null,
    isConnected: true,
    isReconnecting: false,
    isPreparing: false,
    isSubmitting: false,
    startInterview: vi.fn(),
    submitTextAnswer: vi.fn(() => true),
    transcriptResult: {
      data: undefined,
      isPending: true,
      isError: false,
      isNotFound: false,
    },
  };
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe('InterviewRoomPage', () => {
  it('renders the introduction and moves to consent and microphone preparation', () => {
    renderPage();
    expect(screen.getByText('Backend Engineer')).toBeDefined();
    expect(screen.getByText('Hạn tham gia (7 ngày từ khi mời)')).toBeDefined();
    expect(screen.getByText('Trong vòng 24 giờ kể từ khi bắt đầu')).toBeDefined();

    fireEvent.click(screen.getByRole('button', { name: 'Tiếp tục' }));
    expect(screen.getByLabelText(/Tôi đồng ý cho AI/)).toBeDefined();
    expect(screen.getByRole('button', { name: 'Bắt đầu phỏng vấn' }).hasAttribute('disabled')).toBe(
      true,
    );
    fireEvent.click(screen.getByLabelText(/Tôi đồng ý cho AI/));
    expect(screen.getByRole('button', { name: 'Bắt đầu phỏng vấn' }).hasAttribute('disabled')).toBe(
      false,
    );
  });

  it('shows the active question and submits text without allowing paste', () => {
    const submitTextAnswer = vi.fn(() => true);
    pageMocks.socketResult = {
      ...pageMocks.socketResult,
      state: makeState('IN_PROGRESS', {
        currentQuestion: { turnId: 'turn-1', order: 1, total: 2, text: 'Mô tả một dự án.' },
      }),
      submitTextAnswer,
    };
    renderPage();
    const textarea = screen.getByLabelText('Câu trả lời của bạn');
    const pasteEvent = createEvent.paste(textarea, {
      clipboardData: { getData: () => 'pasted' },
    });
    expect(fireEvent(textarea, pasteEvent)).toBe(false);

    fireEvent.change(textarea, { target: { value: 'Tôi đã xây dựng dịch vụ.' } });
    fireEvent.click(screen.getByRole('button', { name: /Gửi câu trả lời/ }));
    expect(submitTextAnswer).toHaveBeenCalledWith('Tôi đã xây dựng dịch vụ.');
  });

  it('renders submitted interview transcript and no-speech fallback', () => {
    pageMocks.socketResult = {
      ...pageMocks.socketResult,
      state: makeState('SUBMITTED'),
      transcriptResult: {
        data: {
          transcriptStatus: 'COMPLETED',
          turns: [
            {
              turnId: 'turn-1',
              order: 1,
              question: 'Bạn hãy giới thiệu.',
              answerText: null,
              transcriptStatus: 'COMPLETED',
            },
          ],
        },
        isPending: false,
        isError: false,
        isNotFound: false,
      },
    };
    renderPage();
    expect(screen.getByText('Bạn đã hoàn thành phỏng vấn')).toBeDefined();
    expect(screen.getByText('Không nghe thấy lời nói')).toBeDefined();
  });

  it('falls back to answeredTurns when transcript endpoint returns 404', () => {
    pageMocks.socketResult = {
      ...pageMocks.socketResult,
      state: makeState('SUBMITTED', {
        answeredTurns: [
          {
            turnId: 'turn-1',
            order: 1,
            question: 'Bạn hãy giới thiệu.',
            answerText: 'Tôi là ứng viên.',
            source: 'TEXT',
            transcriptStatus: null,
            askedAt: null,
            answeredAt: '2026-11-28T10:00:00Z',
          },
        ],
      }),
      transcriptResult: {
        data: undefined,
        isPending: false,
        isError: true,
        isNotFound: true,
      },
    };
    renderPage();
    expect(screen.getByText(/API transcript chưa khả dụng/)).toBeDefined();
    expect(screen.getByText('Tôi là ứng viên.')).toBeDefined();
  });

  it('shows a clear expired state', () => {
    pageMocks.socketResult = { ...pageMocks.socketResult, state: makeState('EXPIRED') };
    renderPage();
    expect(screen.getByText('Đã quá hạn phỏng vấn')).toBeDefined();
  });
});
