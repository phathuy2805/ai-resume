import type { LucideIcon } from 'lucide-react';
import type { ReactNode } from 'react';
import { Bot, Check, ClipboardList, Filter, Info } from 'lucide-react';
import { Controller, useForm, useWatch } from 'react-hook-form';
import { useNavigate } from 'react-router-dom';
import { Field } from '@/components/common/FormField';
import SegmentedControl from '@/components/common/SegmentedControl';
import TagInput from '@/components/common/TagInput';
import { emptyJobForm, type JobFormValues } from '@/components/hr/jobFormValues';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input, Textarea } from '@/components/ui/input';

function Section({
  icon: Icon,
  title,
  step,
  description,
  children,
}: {
  icon: LucideIcon;
  title: string;
  step: string;
  description?: string;
  children: ReactNode;
}) {
  return (
    <Card className="flex flex-col gap-5 p-6">
      <div className="flex flex-col gap-1 border-b border-border pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Icon className="h-5 w-5 text-muted-foreground" />
            <h2 className="text-card-title text-foreground">{title}</h2>
          </div>
          <span className="text-xs uppercase tracking-wider text-muted-foreground">{step}</span>
        </div>
        {description && <p className="text-xs text-muted-foreground">{description}</p>}
      </div>
      {children}
    </Card>
  );
}

export default function JobForm({
  mode,
  defaultValues = emptyJobForm,
  onSubmit,
}: {
  mode: 'create' | 'edit';
  defaultValues?: JobFormValues;
  onSubmit: (values: JobFormValues) => void | Promise<void>;
}) {
  const navigate = useNavigate();
  const {
    register,
    control,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<JobFormValues>({ defaultValues });
  const threshold = useWatch({ control, name: 'cvPassThreshold' });

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate className="flex flex-col gap-6 pb-24">
      <Section icon={ClipboardList} title="Thông tin chung" step="Phần 1/3">
        <Field
          id="title"
          label={
            <>
              Tên vị trí tuyển dụng <span className="text-destructive">*</span>
            </>
          }
          error={errors.title?.message}
        >
          <Input
            id="title"
            className="h-[38px]"
            placeholder="vd: Senior Backend Developer (Node.js)"
            aria-invalid={!!errors.title}
            {...register('title', { required: 'Vui lòng nhập tên vị trí' })}
          />
        </Field>
        <Field
          id="description"
          label={
            <>
              Mô tả công việc &amp; yêu cầu năng lực <span className="text-destructive">*</span>
            </>
          }
          error={errors.description?.message}
        >
          <Textarea
            id="description"
            rows={7}
            placeholder="Trách nhiệm công việc, yêu cầu kỹ thuật, môi trường làm việc..."
            aria-invalid={!!errors.description}
            {...register('description', { required: 'Vui lòng nhập mô tả công việc' })}
          />
        </Field>
      </Section>

      <Section
        icon={Filter}
        title="Tiêu chí sàng lọc"
        step="Phần 2/3"
        description="AI dùng các tiêu chí này để phân tích và chấm điểm CV ứng viên"
      >
        <Field
          id="requiredSkills"
          label="Kỹ năng bắt buộc (Must-have)"
          error={errors.requiredSkills?.message}
        >
          <Controller
            name="requiredSkills"
            control={control}
            rules={{ validate: (value) => value.length > 0 || 'Cần ít nhất 1 kỹ năng bắt buộc' }}
            render={({ field }) => (
              <TagInput
                id="requiredSkills"
                value={field.value}
                onChange={field.onChange}
                invalid={!!errors.requiredSkills}
              />
            )}
          />
        </Field>
        <Field id="preferredSkills" label="Kỹ năng ưu tiên (Nice-to-have)">
          <Controller
            name="preferredSkills"
            control={control}
            render={({ field }) => (
              <TagInput
                id="preferredSkills"
                tone="soft"
                value={field.value}
                onChange={field.onChange}
              />
            )}
          />
        </Field>
        <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
          <Field
            id="minYearsExperience"
            label="Kinh nghiệm tối thiểu"
            error={errors.minYearsExperience?.message}
          >
            <div className="relative">
              <Input
                id="minYearsExperience"
                type="number"
                min={0}
                max={30}
                className="h-[38px] pr-12"
                {...register('minYearsExperience', {
                  valueAsNumber: true,
                  min: { value: 0, message: 'Không được nhỏ hơn 0' },
                })}
              />
              <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">
                Năm
              </span>
            </div>
          </Field>
          <Field
            id="cvPassThreshold"
            label="Ngưỡng điểm đạt CV"
            aside={<span className="font-semibold text-primary">{threshold}/100</span>}
            hint="Hồ sơ đạt từ ngưỡng này sẽ được mời phỏng vấn AI"
          >
            <div className="flex h-[38px] items-center">
              <input
                id="cvPassThreshold"
                type="range"
                min={0}
                max={100}
                step={5}
                className="h-1.5 w-full cursor-pointer appearance-none rounded-lg bg-indigo-100 accent-primary"
                {...register('cvPassThreshold', { valueAsNumber: true })}
              />
            </div>
          </Field>
        </div>
      </Section>

      <Section
        icon={Bot}
        title="Phỏng vấn AI"
        step="Phần 3/3"
        description="Thiết lập vòng phỏng vấn sơ loại tự động"
      >
        <Field id="interviewQuestionCount" label="Số lượng câu hỏi phỏng vấn">
          <Controller
            name="interviewQuestionCount"
            control={control}
            render={({ field }) => (
              <SegmentedControl
                ariaLabel="Số lượng câu hỏi phỏng vấn"
                tone="primary"
                className="w-full max-w-sm"
                value={String(field.value) as '3' | '4' | '5'}
                onChange={(value) => field.onChange(Number(value))}
                options={[
                  { value: '3', label: '3 câu' },
                  { value: '4', label: '4 câu' },
                  { value: '5', label: '5 câu' },
                ]}
              />
            )}
          />
        </Field>
        <div className="flex items-start gap-2.5 rounded-lg bg-indigo-50/60 p-3">
          <Info className="mt-0.5 h-[18px] w-[18px] shrink-0 text-primary" />
          <p className="text-xs leading-relaxed text-slate-600">
            AI sẽ tự sinh câu hỏi dựa trên mô tả công việc, CV và các kỹ năng còn thiếu của từng ứng
            viên khi họ bắt đầu phỏng vấn.
          </p>
        </div>
      </Section>

      <div className="fixed inset-x-0 bottom-0 z-30 border-t border-border bg-card/95 backdrop-blur md:left-60">
        <div className="mx-auto flex h-16 w-full max-w-[760px] items-center justify-between gap-3 px-4 md:px-6">
          {mode === 'edit' ? (
            <div className="flex items-center gap-3">
              <span className="hidden text-xs font-medium text-muted-foreground sm:inline">
                Trạng thái tin:
              </span>
              <Controller
                name="status"
                control={control}
                render={({ field }) => (
                  <SegmentedControl
                    ariaLabel="Trạng thái tin"
                    value={field.value}
                    onChange={field.onChange}
                    options={[
                      { value: 'OPEN', label: 'Đang mở' },
                      { value: 'CLOSED', label: 'Đã đóng' },
                    ]}
                  />
                )}
              />
            </div>
          ) : (
            <span />
          )}
          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              size="sm"
              className="h-9"
              onClick={() => navigate('/hr/jobs')}
            >
              Huỷ
            </Button>
            <Button type="submit" size="sm" className="h-9" disabled={isSubmitting}>
              <Check />
              Lưu tin tuyển dụng
            </Button>
          </div>
        </div>
      </div>
    </form>
  );
}
