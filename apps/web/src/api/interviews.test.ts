import { afterEach, describe, expect, it, vi } from 'vitest';
import { apiClient } from '@/lib/axios';
import { ApiError } from '@/types/api';
import { getInterviewTranscript, mapInterviewTranscript } from './interviews';

const transcript = {
  transcriptStatus: 'COMPLETED',
  turns: [
    {
      turnId: 'turn-2',
      order: 2,
      question: 'Câu hỏi hai',
      answerText: null,
      transcriptStatus: 'COMPLETED',
    },
    {
      turnId: 'turn-1',
      order: 1,
      question: 'Câu hỏi một',
      answerText: 'Trả lời chữ',
      transcriptStatus: 'COMPLETED',
    },
  ],
};

afterEach(() => vi.restoreAllMocks());

describe('interview transcript API', () => {
  it('maps and orders transcript turns by question order', () => {
    expect(mapInterviewTranscript(transcript).turns.map((turn) => turn.order)).toEqual([1, 2]);
  });

  it('rejects malformed transcript data as an API contract error', () => {
    expect(() => mapInterviewTranscript({ transcriptStatus: 'UNKNOWN', turns: [] })).toThrow(
      ApiError,
    );
  });

  it('calls the candidate transcript endpoint and maps its data envelope', async () => {
    const get = vi.spyOn(apiClient, 'get').mockResolvedValue({
      data: { data: transcript },
    } as never);
    const controller = new AbortController();

    await expect(getInterviewTranscript('interview-1', controller.signal)).resolves.toEqual(
      mapInterviewTranscript(transcript),
    );
    expect(get).toHaveBeenCalledWith('/me/interviews/interview-1/transcript', {
      signal: controller.signal,
    });
  });
});
