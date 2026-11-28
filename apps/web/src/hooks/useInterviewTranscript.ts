import { useQuery } from '@tanstack/react-query';
import { getInterviewTranscript } from '@/api/interviews';
import { queryKeys } from '@/api/queryKeys';
import { toApiError } from '@/lib/apiError';

export function interviewTranscriptRefetchInterval(
  status: 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED' | undefined,
): number | false {
  return status === 'PENDING' || status === 'PROCESSING' ? 5000 : false;
}

export function useInterviewTranscript(interviewId: string, enabled: boolean) {
  const query = useQuery({
    queryKey: queryKeys.interviews.transcript(interviewId),
    queryFn: ({ signal }) => getInterviewTranscript(interviewId, signal),
    enabled: Boolean(interviewId) && enabled,
    refetchInterval: (current) =>
      interviewTranscriptRefetchInterval(current.state.data?.transcriptStatus),
    meta: { errorMode: 'local' },
  });

  return {
    ...query,
    isNotFound: query.isError && toApiError(query.error).status === 404,
  };
}
