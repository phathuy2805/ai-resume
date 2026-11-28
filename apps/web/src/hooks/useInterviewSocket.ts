import { useCallback, useEffect, useRef, useState } from 'react';
import { io, type Socket } from 'socket.io-client';
import { refreshSession } from '@/api/auth';
import { clearAccessToken, getAccessToken } from '@/lib/tokenStore';
import type { ApplicationStatus } from '@/types/applications';

const EVENTS = {
  join: 'interview:join',
  start: 'interview:start',
  answer: 'interview:answer',
  state: 'interview:state',
  preparing: 'interview:preparing',
  question: 'interview:question',
  completed: 'interview:completed',
  error: 'interview:error',
} as const;

export type InterviewPhase = 'NOT_STARTED' | 'IN_PROGRESS' | 'SUBMITTED' | 'EXPIRED';
export type InterviewTranscriptStatus = 'NONE' | 'TRANSCRIBING' | 'READY' | 'DELAYED';
export type TurnTranscriptStatus = 'PENDING' | 'DONE' | 'NO_SPEECH' | 'FAILED';

export interface InterviewQuestion {
  turnId: string;
  order: number;
  total: number;
  text: string;
}

export interface InterviewTurn {
  turnId: string;
  order: number;
  question: string;
  answerText: string | null;
  source: 'VOICE' | 'TEXT';
  transcriptStatus: TurnTranscriptStatus | null;
  askedAt: string | null;
  answeredAt: string;
}

export interface InterviewState {
  interviewId: string;
  status: ApplicationStatus;
  phase: InterviewPhase;
  inviteExpiresAt: string;
  sessionExpiresAt: string | null;
  expiresAt: string | null;
  isExpired: boolean;
  recordingConsentAt: string | null;
  startedAt: string | null;
  completedAt: string | null;
  transcriptStatus: InterviewTranscriptStatus;
  processingDelayed: boolean;
  totalQuestions: number;
  currentQuestion: InterviewQuestion | null;
  answeredTurns: InterviewTurn[];
}

interface InterviewError {
  code: string;
  message: string;
}

interface InterviewSocketOptions {
  interviewId: string;
  onAuthInvalid?: () => void;
}

export function useInterviewSocket({ interviewId, onAuthInvalid }: InterviewSocketOptions) {
  const hasAccessToken = Boolean(getAccessToken());
  const socketRef = useRef<Socket | null>(null);
  const stateRef = useRef<InterviewState | null>(null);
  const hasConnectedRef = useRef(false);
  const refreshInProgressRef = useRef(false);
  const [state, setState] = useState<InterviewState | null>(null);
  const [error, setError] = useState<InterviewError | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [isReconnecting, setIsReconnecting] = useState(false);
  const [isPreparing, setIsPreparing] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const updateState = useCallback((next: InterviewState | null) => {
    stateRef.current = next;
    setState(next);
  }, []);

  const requestState = useCallback(() => {
    socketRef.current?.emit(EVENTS.join, { interviewId });
  }, [interviewId]);

  useEffect(() => {
    const token = getAccessToken();
    if (!token) {
      onAuthInvalid?.();
      return;
    }

    let active = true;
    const socket = io('/interview', {
      path: '/socket.io',
      auth: { token },
      autoConnect: false,
      reconnection: true,
    });
    socketRef.current = socket;

    socket.on('connect', () => {
      if (!active) return;
      hasConnectedRef.current = true;
      setIsConnected(true);
      setIsReconnecting(false);
      setIsSubmitting(false);
      setError(null);
      socket.emit(EVENTS.join, { interviewId });
    });

    socket.on('disconnect', () => {
      if (!active) return;
      setIsConnected(false);
      setIsReconnecting(hasConnectedRef.current);
    });

    socket.on('connect_error', (cause: Error & { data?: { code?: string } }) => {
      if (!active) return;
      const code = cause.data?.code ?? cause.message;
      if (code === 'AUTH_EXPIRED' && !refreshInProgressRef.current) {
        refreshInProgressRef.current = true;
        void refreshSession()
          .then(({ accessToken }) => {
            if (!active) return;
            socket.auth = { token: accessToken };
            socket.connect();
          })
          .catch(() => {
            if (!active) return;
            clearAccessToken();
            setError({
              code: 'AUTH_INVALID',
              message: 'Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.',
            });
            onAuthInvalid?.();
          })
          .finally(() => {
            refreshInProgressRef.current = false;
          });
        return;
      }

      if (code === 'AUTH_INVALID') {
        clearAccessToken();
        setError({ code, message: 'Phiên đăng nhập không hợp lệ. Vui lòng đăng nhập lại.' });
        onAuthInvalid?.();
        return;
      }
      setError({ code, message: cause.message || 'Không thể kết nối phòng phỏng vấn.' });
    });

    socket.on('interview:state', (next: InterviewState) => {
      if (!active || next.interviewId !== interviewId) return;
      updateState(next);
      setIsPreparing(false);
      setIsSubmitting(false);
      setError(null);
    });

    socket.on('interview:preparing', (payload: { interviewId: string; message: string }) => {
      if (!active || payload.interviewId !== interviewId) return;
      setIsPreparing(true);
      setError(null);
    });

    socket.on('interview:question', (question: InterviewQuestion) => {
      if (!active) return;
      const previous = stateRef.current;
      if (!previous) return;
      updateState({
        ...previous,
        status: 'INTERVIEWING',
        phase: 'IN_PROGRESS',
        currentQuestion: question,
        totalQuestions: question.total,
      });
      setIsPreparing(false);
      setIsSubmitting(false);
      setError(null);
    });

    socket.on(
      'interview:completed',
      (payload: {
        interviewId: string;
        completedAt: string;
        transcriptStatus: InterviewTranscriptStatus;
      }) => {
        if (!active || payload.interviewId !== interviewId) return;
        const previous = stateRef.current;
        if (previous) {
          updateState({
            ...previous,
            phase: 'SUBMITTED',
            completedAt: payload.completedAt,
            transcriptStatus: payload.transcriptStatus,
            currentQuestion: null,
          });
        }
        setIsPreparing(false);
        setIsSubmitting(false);
        socket.emit(EVENTS.join, { interviewId });
      },
    );

    socket.on('interview:error', (payload: InterviewError) => {
      if (!active) return;
      setIsPreparing(false);
      setIsSubmitting(false);
      setError(payload);
      if (payload.code === 'INTERVIEW_EXPIRED') {
        const previous = stateRef.current;
        if (previous) updateState({ ...previous, phase: 'EXPIRED', isExpired: true });
      } else if (payload.code === 'INVALID_STATE') {
        socket.emit(EVENTS.join, { interviewId });
      }
    });

    socket.connect();
    return () => {
      active = false;
      socket.removeAllListeners();
      socket.disconnect();
      if (socketRef.current === socket) socketRef.current = null;
      stateRef.current = null;
    };
  }, [interviewId, onAuthInvalid, updateState]);

  useEffect(() => {
    if (!isConnected || state?.phase !== 'SUBMITTED' || state.transcriptStatus !== 'TRANSCRIBING') {
      return;
    }
    const intervalId = window.setInterval(requestState, 5000);
    return () => window.clearInterval(intervalId);
  }, [isConnected, requestState, state?.phase, state?.transcriptStatus]);

  const startInterview = useCallback(() => {
    const socket = socketRef.current;
    if (!socket?.connected) return false;
    setError(null);
    setIsPreparing(true);
    socket.emit(EVENTS.start, { consent: true });
    return true;
  }, []);

  const submitTextAnswer = useCallback(
    (text: string) => {
      const socket = socketRef.current;
      const current = stateRef.current?.currentQuestion;
      const answerText = text.trim();
      if (!socket?.connected || !current || !answerText || answerText.length > 3000) return false;

      setIsSubmitting(true);
      setError(null);
      const previous = stateRef.current;
      if (previous) {
        const optimisticTurn: InterviewTurn = {
          turnId: current.turnId,
          order: current.order,
          question: current.text,
          answerText,
          source: 'TEXT',
          transcriptStatus: null,
          askedAt: null,
          answeredAt: new Date().toISOString(),
        };
        updateState({
          ...previous,
          answeredTurns: [
            ...previous.answeredTurns.filter((turn) => turn.turnId !== current.turnId),
            optimisticTurn,
          ].sort((a, b) => a.order - b.order),
          currentQuestion: null,
        });
      }
      socket.emit(EVENTS.answer, { turnId: current.turnId, source: 'TEXT', text: answerText });
      return true;
    },
    [updateState],
  );

  return {
    state,
    error:
      error ??
      (!hasAccessToken
        ? { code: 'AUTH_INVALID', message: 'Vui lòng đăng nhập lại để tiếp tục.' }
        : null),
    isConnected,
    isReconnecting,
    isPreparing,
    isSubmitting,
    requestState,
    startInterview,
    submitTextAnswer,
  };
}
