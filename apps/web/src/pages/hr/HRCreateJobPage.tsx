import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import PageHeader from '@/components/common/PageHeader';
import JobForm from '@/components/hr/JobForm';
import type { JobFormValues } from '@/components/hr/jobFormValues';

export default function HRCreateJobPage() {
  const navigate = useNavigate();

  // TODO(W1-FE-04): submit through useCreateJob() from '@/hooks/useJobs'.
  const handleSubmit = (values: JobFormValues) => {
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
