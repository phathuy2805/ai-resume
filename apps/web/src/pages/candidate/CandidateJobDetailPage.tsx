import {
  ArrowLeft,
  BrainCircuit,
  BriefcaseBusiness,
  CalendarDays,
  FileQuestion,
  FileText,
} from 'lucide-react';
import { Link, useParams } from 'react-router-dom';
import ApplyCard from '@/components/candidate/ApplyCard';
import EmptyState from '@/components/common/EmptyState';
import SkillChip from '@/components/common/SkillChip';
import { buttonVariants } from '@/components/ui/button-variants';
import { Card } from '@/components/ui/card';
import { formatDate, formatExperience } from '@/lib/format';
import { mockJobs, mockMyApplications } from '@/lib/mockData';

export default function CandidateJobDetailPage() {
  const { id } = useParams();
  // TODO(W1-FE-05): load with getJob(id).
  const job = mockJobs.find((item) => item.id === id);

  if (!job) {
    return (
      <EmptyState
        icon={FileQuestion}
        title="Không tìm thấy việc làm"
        description="Tin tuyển dụng có thể đã đóng hoặc đường dẫn không đúng."
        action={
          <Link to="/candidate/jobs" className={buttonVariants({ variant: 'outline' })}>
            Xem việc làm khác
          </Link>
        }
      />
    );
  }

  const alreadyApplied = mockMyApplications.some((app) => app.job.id === job.id);
  const paragraphs = job.description.split('\n').filter((line) => line.trim());

  return (
    <div className="flex flex-col gap-6">
      <Link
        to="/candidate/jobs"
        className="inline-flex w-fit items-center gap-1 font-medium text-slate-600 transition-colors hover:text-foreground"
      >
        <ArrowLeft className="h-[18px] w-[18px]" />
        Quay lại danh sách việc làm
      </Link>

      <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-12">
        <div className="flex flex-col gap-6 lg:col-span-7">
          <Card className="p-6">
            <span className="mb-2 inline-flex items-center gap-1 rounded-full bg-indigo-50 px-2 py-0.5 text-xs font-medium text-primary">
              <span className="h-1.5 w-1.5 rounded-full bg-primary" />
              {job.status === 'OPEN' ? 'Đang nhận hồ sơ' : 'Đã đóng'}
            </span>
            <h1 className="mb-2 text-page-title text-foreground">{job.title}</h1>
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-600">
              <span className="flex items-center gap-1">
                <BriefcaseBusiness className="h-4 w-4 text-muted-foreground" />
                {formatExperience(job.minYearsExperience)}
              </span>
              <span className="text-slate-300">·</span>
              <span className="flex items-center gap-1">
                <CalendarDays className="h-4 w-4 text-muted-foreground" />
                Đăng ngày {formatDate(job.createdAt)}
              </span>
            </div>
          </Card>

          <Card className="p-6">
            <h2 className="mb-3 flex items-center gap-1.5 text-card-title text-foreground">
              <FileText className="h-5 w-5 text-primary" />
              Mô tả công việc
            </h2>
            <ul className="space-y-2 leading-relaxed text-foreground">
              {paragraphs.map((line) => (
                <li key={line} className="flex items-start gap-2">
                  <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />
                  <span>{line.replace(/^[-•]\s*/, '')}</span>
                </li>
              ))}
            </ul>
          </Card>

          <Card className="flex flex-col gap-4 p-6">
            <h2 className="flex items-center gap-1.5 text-card-title text-foreground">
              <BrainCircuit className="h-5 w-5 text-primary" />
              Kỹ năng yêu cầu
            </h2>
            <div>
              <span className="mb-2 block text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
                Kỹ năng bắt buộc
              </span>
              <div className="flex flex-wrap gap-2">
                {job.requiredSkills.map((skill) => (
                  <SkillChip key={skill} variant="required">
                    {skill}
                  </SkillChip>
                ))}
              </div>
            </div>
            {job.preferredSkills.length > 0 && (
              <div className="border-t border-border pt-3">
                <span className="mb-2 block text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
                  Kỹ năng ưu tiên
                </span>
                <div className="flex flex-wrap gap-2">
                  {job.preferredSkills.map((skill) => (
                    <SkillChip key={skill} variant="preferred">
                      {skill}
                    </SkillChip>
                  ))}
                </div>
              </div>
            )}
          </Card>
        </div>

        <div className="lg:sticky lg:top-24 lg:col-span-5">
          <ApplyCard key={job.id} alreadyApplied={alreadyApplied} />
        </div>
      </div>
    </div>
  );
}
