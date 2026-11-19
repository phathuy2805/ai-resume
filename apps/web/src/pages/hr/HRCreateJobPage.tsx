import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import PageHeader from '@/components/common/PageHeader';
import JobForm from '@/components/hr/JobForm';
import type { JobFormValues } from '@/components/hr/jobFormValues';
import { useCreateJob } from '@/hooks/useJobs';

export default function HRCreateJobPage() {
  const navigate = useNavigate();

  const createJob = useCreateJob();
  const handleSubmit = async (values: JobFormValues) => {
    await createJob.mutateAsync({
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
    });
    toast.success(`Đã tạo tin "${values.title}"`);
    navigate('/hr/jobs');
  };

  return (
    <div className="mx-auto flex w-full max-w-[760px] flex-col gap-6">
      <PageHeader
        back={{ to: '/hr/jobs', label: 'Tin tuyển dụng' }}
        title="Tạo tin tuyển dụng"
        description="Thiết lập tiêu chí sàng lọc và phỏng vấn AI cho vị trí mới"
      />
      <JobForm mode="create" onSubmit={handleSubmit} />
    </div>
  );
}
