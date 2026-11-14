import { HelpCircle, ThumbsDown, ThumbsUp } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { AI_RECOMMENDATION, HR_STATUS, type AiRecommendation } from '@/lib/applicationStatus';
import type { ApplicationStatus } from '@/types/applications';
import type { JobStatus } from '@/types/jobs';

export function JobStatusBadge({ status }: { status: JobStatus }) {
  return status === 'OPEN' ? (
    <Badge variant="success">Đang mở</Badge>
  ) : (
    <Badge variant="secondary">Đã đóng</Badge>
  );
}

export function ApplicationStatusBadge({ status }: { status: ApplicationStatus }) {
  const { label, variant } = HR_STATUS[status];
  return (
    <Badge variant={variant}>
      {status === 'SCREENING' && (
        <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-primary" />
      )}
      {label}
    </Badge>
  );
}

const recommendationIcon = { PASS: ThumbsUp, CONSIDER: HelpCircle, REJECT: ThumbsDown };

export function AiRecommendationBadge({ value }: { value: AiRecommendation }) {
  const { label, variant } = AI_RECOMMENDATION[value];
  const Icon = recommendationIcon[value];
  return (
    <Badge variant={variant}>
      <Icon />
      {label}
    </Badge>
  );
}
