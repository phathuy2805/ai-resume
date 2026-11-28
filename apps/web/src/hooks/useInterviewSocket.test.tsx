import { act, cleanup, renderHook, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useInterviewSocket } from './useInterviewSocket';

const socketMocks = vi.hoisted(() => {
  const handlers = new Map<string, (...args: unknown[]) => void>();
  const socket = {
    auth: {},
    connected: false,
    on: vi.fn((event: string, handler: (...args: unknown[]) => void) => {
      handlers.set(event, handler);
      return socket;
    }),
    emit: vi.fn(),
    connect: vi.fn(),
    disconnect: vi.fn(),
    removeAllListeners: vi.fn(() => handlers.clear()),
  };
  return { handlers, socket, io: vi.fn() };
});

vi.mock('socket.io-client', () => ({ io: socketMocks.io }));
vi.mock('@/lib/tokenStore', () => ({
  getAccessToken: vi.fn(() => 'initial-token'),
  clearAccessToken: vi.fn(),
}));

describe('useInterviewSocket', () => {
  beforeEach(() => {
    socketMocks.handlers.clear();
    socketMocks.socket.auth = {};
    socketMocks.socket.connected = false;
    socketMocks.socket.on.mockClear();
    socketMocks.socket.emit.mockClear();
    socketMocks.socket.connect.mockClear();
    socketMocks.io.mockReturnValue(socketMocks.socket);
  });

  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  it('joins on every successful connection, including reconnects', () => {
    const { unmount } = renderHook(() => useInterviewSocket({ interviewId: 'iv-1' }));
    const onConnect = socketMocks.handlers.get('connect');
    expect(onConnect).toBeDefined();

    act(() => {
      socketMocks.socket.connected = true;
      onConnect?.();
    });
    act(() => onConnect?.());

    expect(socketMocks.socket.emit).toHaveBeenNthCalledWith(1, 'interview:join', {
      interviewId: 'iv-1',
    });
    expect(socketMocks.socket.emit).toHaveBeenNthCalledWith(2, 'interview:join', {
      interviewId: 'iv-1',
    });
    unmount();
  });

  it('refreshes an expired access token and reconnects with the replacement token', async () => {
    const refresh = vi.spyOn(await import('@/api/auth'), 'refreshSession').mockResolvedValue({
      accessToken: 'fresh-token',
      user: {
        id: 'candidate-1',
        email: 'candidate@example.com',
        fullName: 'Candidate',
        role: 'CANDIDATE',
        createdAt: '2026-01-01',
      },
    });
    const { unmount } = renderHook(() => useInterviewSocket({ interviewId: 'iv-1' }));
    const onConnectError = socketMocks.handlers.get('connect_error');

    act(() =>
      onConnectError?.(
        Object.assign(new Error('Unauthorized'), { data: { code: 'AUTH_EXPIRED' } }),
      ),
    );

    await waitFor(() => {
      expect(refresh).toHaveBeenCalledOnce();
      expect(socketMocks.socket.auth).toEqual({ token: 'fresh-token' });
      expect(socketMocks.socket.connect).toHaveBeenCalledTimes(2);
    });
    unmount();
  });

  it('updates phase from interview state and submits the current answer as TEXT', () => {
    const { result, unmount } = renderHook(() => useInterviewSocket({ interviewId: 'iv-1' }));
    const onConnect = socketMocks.handlers.get('connect');
    act(() => {
      socketMocks.socket.connected = true;
      onConnect?.();
    });

    const onState = socketMocks.handlers.get('interview:state');
    act(() =>
      onState?.({
        interviewId: 'iv-1',
        status: 'INTERVIEWING',
        phase: 'IN_PROGRESS',
        inviteExpiresAt: '2026-12-01',
        sessionExpiresAt: '2026-12-02',
        expiresAt: '2026-12-01',
        isExpired: false,
        recordingConsentAt: '2026-11-28',
        startedAt: '2026-11-28',
        completedAt: null,
        transcriptStatus: 'NONE',
        processingDelayed: false,
        totalQuestions: 1,
        currentQuestion: { turnId: 'turn-1', order: 1, total: 1, text: 'Question?' },
        answeredTurns: [],
      }),
    );

    expect(result.current.state?.phase).toBe('IN_PROGRESS');
    act(() => {
      expect(result.current.submitTextAnswer(' Answer ')).toBe(true);
    });
    expect(socketMocks.socket.emit).toHaveBeenLastCalledWith('interview:answer', {
      turnId: 'turn-1',
      source: 'TEXT',
      text: 'Answer',
    });
    unmount();
  });
});
