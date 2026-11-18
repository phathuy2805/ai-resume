import { FileQuestion } from 'lucide-react';
import { Link, Navigate, useNavigate, useParams } from 'react-router-dom';
import { toast } from 'sonner';
import EmptyState from '@/components/common/EmptyState';
import PageHeader from '@/components/common/PageHeader';
import JobForm from '@/components/hr/JobForm';
import type { JobFormValues } from '@/components/hr/jobFormValues';
import { buttonVariants } from '@/components/ui/button-variants';
import { useJob, useUpdateJob } from '@/hooks/useJobs';
import { Skeleton } from '@/components/ui/skeleton';

export default function HREditJobPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const jobQuery = useJob(id ?? '');
  const updateJob = useUpdateJob();

  if (jobQuery.isLoading) {
    return (
      <div className="mx-auto flex w-full max-w-[760px] flex-col gap-4">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }
  const job = jobQuery.data;

  if (!job) {
    return (
      <EmptyState
        icon={FileQuestion}
        title="Không tìm thấy tin tuyển dụng"
        description="Tin có thể đã bị xoá hoặc đường dẫn không đúng."
        action={
          <Link to="/hr/jobs" className={buttonVariants({ variant: 'outline' })}>
            Về danh sách tin
          </Link>
        }
      />
    );
  }
  if (job.status === 'CLOSED') {
    return <Navigate to="/hr/jobs" replace />;
  }

  const handleSubmit = async (values: JobFormValues) => {
    await updateJob.mutateAsync({
      id: job.id,
      body: {
        title: values.title,
        description: values.description,
        requirements: values.requirements,
        requiredSkills: values.requiredSkills,
        preferredSkills: values.preferredSkills,
        minYearsExperience: values.minYearsExperience,
        level: values.level,
        cvPassThreshold: values.cvPassThreshold,
        interviewQuestionCount: values.interviewQuestionCount,
        rubricWeights: values.rubricWeights,
      },
    });
    toast.success(`Đã lưu thay đổi cho "${values.title}"`);
    navigate('/hr/jobs');
  };

  return (
    <div className="mx-auto flex w-full max-w-[760px] flex-col gap-6">
      <PageHeader
        back={{ to: '/hr/jobs', label: 'Tin tuyển dụng' }}
        title="Sửa tin tuyển dụng"
        description={job.title}
      />
      <JobForm
        mode="edit"
        onSubmit={handleSubmit}
        defaultValues={{
          title: job.title,
          description: job.description,
          requiredSkills: job.requiredSkills,
          preferredSkills: job.preferredSkills,
          minYearsExperience: job.minYearsExperience,
          requirements: job.requirements ?? null,
          level: job.level ?? null,
          cvPassThreshold: job.cvPassThreshold,
          interviewQuestionCount: job.interviewQuestionCount,
          rubricWeights: job.rubricWeights ?? {
            technical: 40,
            communication: 20,
            relevance: 20,
            evidence: 20,
          },
          status: job.status,
        }}
      />
    </div>
  );
}
