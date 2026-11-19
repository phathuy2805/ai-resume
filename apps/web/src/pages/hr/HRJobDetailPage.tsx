import { useState, type ReactNode } from 'react';
import {
  Ban,
  Bot,
  CalendarDays,
  FileQuestion,
  FileText,
  Filter,
  Pencil,
  RotateCcw,
  Sparkles,
  Users,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { Link, useParams } from 'react-router-dom';
import EmptyState from '@/components/common/EmptyState';
import PageHeader from '@/components/common/PageHeader';
import SkillChip from '@/components/common/SkillChip';
import StatCard from '@/components/common/StatCard';
import { JobStatusBadge } from '@/components/common/StatusBadges';
import JobStatusDialog from '@/components/hr/JobStatusDialog';
import { emptyJobForm } from '@/components/hr/jobFormValues';
import { buttonVariants } from '@/components/ui/button-variants';
import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { useMyJob } from '@/hooks/useJobs';
import { toApiError } from '@/lib/apiError';
import { formatDate, formatExperience } from '@/lib/format';
import type { Job, JobLevel, RubricWeights } from '@/types/jobs';

const LEVEL_LABEL: Record<JobLevel, string> = {
  INTERN: 'Intern',
  JUNIOR: 'Junior',
  MIDDLE: 'Middle',
  SENIOR: 'Senior',
};

const RUBRIC_LABEL: Record<keyof RubricWeights, string> = {
  technical: 'Chuyên môn',
  communication: 'Giao tiếp',
  relevance: 'Mức độ phù hợp',
  evidence: 'Bằng chứng',
};

function Section({
  icon: Icon,
  title,
  children,
}: {
  icon: LucideIcon;
  title: string;
  children: ReactNode;
}) {
  return (
    <Card className="p-6">
      <h2 className="mb-4 flex items-center gap-2 text-card-title text-foreground">
        <Icon className="h-5 w-5 text-primary" />
        {title}
      </h2>
      {children}
    </Card>
  );
}

function InfoRow({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-4 py-2.5 text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span className="text-right font-medium text-foreground">{children}</span>
    </div>
  );
}

function TextBlock({ text }: { text: string }) {
  return <p className="whitespace-pre-line leading-relaxed text-foreground">{text}</p>;
}

export default function HRJobDetailPage() {
  const { id = '' } = useParams();
  const jobQuery = useMyJob(id);
  const [statusJob, setStatusJob] = useState<Job | null>(null);

  if (jobQuery.isLoading) {
    return (
      <div className="flex flex-col gap-6">
        <Skeleton className="h-12 w-80" />
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          {[1, 2, 3].map((item) => (
            <Skeleton key={item} className="h-24" />
          ))}
        </div>
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  const job = jobQuery.data;
  if (!job) {
    const forbidden = toApiError(jobQuery.error).status === 403;
    return (
      <EmptyState
        icon={FileQuestion}
        title={forbidden ? 'Bạn không có quyền xem tin này' : 'Không tìm thấy tin tuyển dụng'}
        description={
          forbidden
            ? 'Tin tuyển dụng này do HR khác tạo.'
            : 'Tin có thể đã bị xoá hoặc đường dẫn không đúng.'
        }
        action={
          <Link to="/hr/jobs" className={buttonVariants({ variant: 'outline' })}>
            Về danh sách tin
          </Link>
        }
      />
    );
  }

  const isOpen = job.status === 'OPEN';
  // The HR endpoint always returns rubricWeights; the fallback only satisfies the shared Job type.
  const rubricEntries = Object.entries(job.rubricWeights ?? emptyJobForm.rubricWeights) as [
    keyof RubricWeights,
    number,
  ][];

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        back={{ to: '/hr/jobs', label: 'Tin tuyển dụng' }}
        title={
          <span className="flex flex-wrap items-center gap-3">
            {job.title}
            <JobStatusBadge status={job.status} />
          </span>
        }
        description={
          <span className="inline-flex items-center gap-1.5">
            <CalendarDays className="h-4 w-4" />
            Đăng ngày {formatDate(job.createdAt)} · Cập nhật {formatDate(job.updatedAt)}
          </span>
        }
        actions={
          <>
            <Link
              to={`/hr/candidates?jobId=${job.id}`}
              className={buttonVariants({ variant: 'outline' })}
            >
              <Users />
              Xem ứng viên
            </Link>
            {isOpen ? (
              <>
                <Link
                  to={`/hr/jobs/${job.id}/edit`}
                  className={buttonVariants({ variant: 'outline' })}
                >
                  <Pencil />
                  Sửa
                </Link>
                <button
                  type="button"
                  className={buttonVariants({ variant: 'destructive-outline' })}
                  onClick={() => setStatusJob(job)}
                >
                  <Ban />
                  Đóng tin
                </button>
              </>
            ) : (
              <button type="button" className={buttonVariants()} onClick={() => setStatusJob(job)}>
                <RotateCcw />
                Mở lại tin
              </button>
            )}
          </>
        }
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard label="Hồ sơ đã nộp" value={job.applicationCount ?? 0} icon={Users} />
        <StatCard label="Ngưỡng điểm CV" value={`${job.cvPassThreshold}/100`} icon={Filter} />
        <StatCard
          label="Phân tích JD bằng AI"
          value={job.isAnalyzed ? 'Đã xong' : 'Đang chờ'}
          icon={Sparkles}
          iconClassName={job.isAnalyzed ? 'text-emerald-600' : undefined}
        />
      </div>

      <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-12">
        <div className="flex flex-col gap-6 lg:col-span-7">
          <Section icon={FileText} title="Mô tả công việc">
            <TextBlock text={job.description} />
          </Section>
          {job.requirements && (
            <Section icon={FileText} title="Yêu cầu ứng viên">
              <TextBlock text={job.requirements} />
            </Section>
          )}
        </div>

        <div className="flex flex-col gap-6 lg:col-span-5">
          <Section icon={Filter} title="Tiêu chí sàng lọc">
            <div className="divide-y divide-border">
              <InfoRow label="Cấp độ">
                {job.level ? LEVEL_LABEL[job.level] : 'Không yêu cầu'}
              </InfoRow>
              <InfoRow label="Kinh nghiệm tối thiểu">
                {formatExperience(job.minYearsExperience)}
              </InfoRow>
              <InfoRow label="Ngưỡng điểm đạt CV">{job.cvPassThreshold}/100</InfoRow>
            </div>
            <div className="mt-4 flex flex-col gap-3">
              <div>
                <p className="mb-2 text-xs font-medium text-muted-foreground">Kỹ năng bắt buộc</p>
                <div className="flex flex-wrap gap-1.5">
                  {job.requiredSkills.map((skill) => (
                    <SkillChip key={skill} variant="required">
                      {skill}
                    </SkillChip>
                  ))}
                </div>
              </div>
              {job.preferredSkills.length > 0 && (
                <div>
                  <p className="mb-2 text-xs font-medium text-muted-foreground">Kỹ năng ưu tiên</p>
                  <div className="flex flex-wrap gap-1.5">
                    {job.preferredSkills.map((skill) => (
                      <SkillChip key={skill} variant="preferred">
                        {skill}
                      </SkillChip>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </Section>

          <Section icon={Bot} title="Phỏng vấn AI">
            <InfoRow label="Số câu hỏi phỏng vấn">{job.interviewQuestionCount} câu</InfoRow>
            <div className="mt-3 flex flex-col gap-3">
              <p className="text-xs font-medium text-muted-foreground">Trọng số chấm điểm</p>
              {rubricEntries.map(([key, weight]) => (
                <div key={key} className="flex flex-col gap-1">
                  <div className="flex justify-between text-sm">
                    <span className="text-foreground">{RUBRIC_LABEL[key]}</span>
                    <span className="font-medium text-foreground">{weight}%</span>
                  </div>
                  <div className="h-1.5 overflow-hidden rounded-full bg-indigo-100">
                    <div
                      className="h-full rounded-full bg-primary"
                      style={{ width: `${weight}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </Section>
        </div>
      </div>

      <JobStatusDialog
        job={statusJob}
        onOpenChange={(open) => {
          if (!open) setStatusJob(null);
        }}
      />
    </div>
  );
}
