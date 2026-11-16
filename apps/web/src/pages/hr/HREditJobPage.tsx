import { FileQuestion } from 'lucide-react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { toast } from 'sonner';
import EmptyState from '@/components/common/EmptyState';
import PageHeader from '@/components/common/PageHeader';
import JobForm from '@/components/hr/JobForm';
import type { JobFormValues } from '@/components/hr/jobFormValues';
import { buttonVariants } from '@/components/ui/button-variants';
import { mockJobs } from '@/lib/mockData';

export default function HREditJobPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  // TODO(W1-FE-04): load with getJob(id) and save with updateJob()/closeJob().
  const job = mockJobs.find((item) => item.id === id);

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

  const handleSubmit = (values: JobFormValues) => {
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
          cvPassThreshold: job.cvPassThreshold,
          interviewQuestionCount: job.interviewQuestionCount,
          status: job.status,
        }}
      />
    </div>
  );
}
