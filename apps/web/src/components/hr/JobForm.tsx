import type { LucideIcon } from 'lucide-react';
import type { ReactNode } from 'react';
import { Bot, Check, ClipboardList, Filter, Info } from 'lucide-react';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Controller, useForm, useWatch } from 'react-hook-form';
import { useNavigate } from 'react-router-dom';
import { Field } from '@/components/common/FormField';
import SegmentedControl from '@/components/common/SegmentedControl';
import TagInput from '@/components/common/TagInput';
import { emptyJobForm, type JobFormValues } from '@/components/hr/jobFormValues';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input, Textarea } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { handleFormError } from '@/lib/errorUtils';

// Messages mirror the backend rules in apps/api/src/routes/jobs/jobs.schema.ts (W1-BE-04).
const weightSchema = (label: string) =>
  z
    .number({ error: `Vui lòng nhập trọng số ${label}` })
    .int(`Trọng số ${label} phải là số nguyên`)
    .min(0, `Trọng số ${label} tối thiểu là 0`)
    .max(100, `Trọng số ${label} tối đa là 100`);

const rubricWeightsSchema = z
  .object({
    technical: weightSchema('chuyên môn'),
    communication: weightSchema('giao tiếp'),
    relevance: weightSchema('mức độ phù hợp'),
    evidence: weightSchema('bằng chứng'),
  })
  .superRefine((weights, ctx) => {
    const sum = weights.technical + weights.communication + weights.relevance + weights.evidence;
    if (sum !== 100) {
      // No `path`: the issue lands on `rubricWeights` itself (errors.rubricWeights.message).
      ctx.addIssue({
        code: 'custom',
        message: `Tổng trọng số phải bằng 100 (hiện tại: ${sum})`,
      });
    }
  });

/** Error text for an array field: the list-level message, or the first invalid item's message. */
function listError(error: unknown): string | undefined {
  if (!error || typeof error !== 'object') return undefined;
  const { message, root } = error as { message?: unknown; root?: { message?: unknown } };
  if (typeof message === 'string') return message;
  if (typeof root?.message === 'string') return root.message;
  if (!Array.isArray(error)) return undefined;
  const item = (error as ({ message?: unknown } | undefined)[]).find(
    (entry) => typeof entry?.message === 'string',
  );
  return item?.message as string | undefined;
}

const skillSchema = z
  .string()
  .trim()
  .min(1, 'Tên kỹ năng không được để trống')
  .max(50, 'Tên kỹ năng tối đa 50 ký tự');

const jobSchema = z.object({
  title: z
    .string()
    .trim()
    .min(1, 'Vui lòng nhập tên vị trí tuyển dụng')
    .max(200, 'Tên vị trí tuyển dụng tối đa 200 ký tự'),
  description: z
    .string()
    .trim()
    .min(1, 'Vui lòng nhập mô tả công việc')
    .max(20000, 'Mô tả công việc tối đa 20.000 ký tự'),
  requirements: z.string().trim().max(10000, 'Yêu cầu ứng viên tối đa 10.000 ký tự').nullable(),
  requiredSkills: z
    .array(skillSchema)
    .min(1, 'Cần ít nhất 1 kỹ năng bắt buộc')
    .max(30, 'Tối đa 30 kỹ năng bắt buộc'),
  preferredSkills: z.array(skillSchema).max(30, 'Tối đa 30 kỹ năng ưu tiên'),
  minYearsExperience: z
    .number({ error: 'Vui lòng nhập số năm kinh nghiệm' })
    .int('Số năm kinh nghiệm phải là số nguyên')
    .min(0, 'Số năm kinh nghiệm tối thiểu là 0')
    .max(50, 'Số năm kinh nghiệm tối đa là 50'),
  level: z
    .enum(['INTERN', 'JUNIOR', 'MIDDLE', 'SENIOR'], { error: 'Cấp độ không hợp lệ' })
    .nullable(),
  cvPassThreshold: z
    .number({ error: 'Vui lòng chọn ngưỡng điểm CV' })
    .int('Ngưỡng điểm CV phải là số nguyên')
    .min(0, 'Ngưỡng điểm CV tối thiểu là 0')
    .max(100, 'Ngưỡng điểm CV tối đa là 100'),
  interviewQuestionCount: z
    .number({ error: 'Vui lòng chọn số câu hỏi phỏng vấn' })
    .int('Số câu hỏi phỏng vấn phải là số nguyên')
    .min(3, 'Số câu hỏi phỏng vấn tối thiểu là 3')
    .max(5, 'Số câu hỏi phỏng vấn tối đa là 5'),
  rubricWeights: rubricWeightsSchema,
  status: z.enum(['OPEN', 'CLOSED']),
});

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
    setError,
    formState: { errors, isSubmitting },
  } = useForm<JobFormValues>({ defaultValues, resolver: zodResolver(jobSchema) });
  const threshold = useWatch({ control, name: 'cvPassThreshold' });
  const rubric = useWatch({ control, name: 'rubricWeights' });
  const rubricTotal =
    (rubric?.technical ?? 0) +
    (rubric?.communication ?? 0) +
    (rubric?.relevance ?? 0) +
    (rubric?.evidence ?? 0);

  return (
    <form
      onSubmit={handleSubmit(async (values) => {
        try {
          await onSubmit(values);
        } catch (error) {
          handleFormError(error, setError, [
            'title',
            'description',
            'requirements',
            'requiredSkills',
            'preferredSkills',
            'minYearsExperience',
            'level',
            'cvPassThreshold',
            'interviewQuestionCount',
            'rubricWeights',
          ]);
        }
      })}
      noValidate
      className="flex flex-col gap-6 pb-24"
    >
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
        <Field id="requirements" label="Yêu cầu ứng viên" error={errors.requirements?.message}>
          <Textarea
            id="requirements"
            rows={4}
            placeholder="Trình độ, bằng cấp, portfolio hoặc yêu cầu khác..."
            {...register('requirements', { setValueAs: (value) => value?.trim() || null })}
          />
        </Field>
        <Field id="level" label="Cấp độ" error={errors.level?.message}>
          <Controller
            name="level"
            control={control}
            render={({ field }) => (
              <Select
                value={field.value ?? ''}
                onValueChange={(value) => field.onChange(value || null)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Chọn cấp độ" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="INTERN">Intern</SelectItem>
                  <SelectItem value="JUNIOR">Junior</SelectItem>
                  <SelectItem value="MIDDLE">Middle</SelectItem>
                  <SelectItem value="SENIOR">Senior</SelectItem>
                </SelectContent>
              </Select>
            )}
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
          error={listError(errors.requiredSkills)}
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
        <Field
          id="preferredSkills"
          label="Kỹ năng ưu tiên (Nice-to-have)"
          error={listError(errors.preferredSkills)}
        >
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
                max={50}
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
            error={errors.cvPassThreshold?.message}
          >
            <div className="flex h-[38px] items-center">
              {/* Controlled on purpose: with register(), RHF never pushes the default value into a
                  range input, so it showed the midpoint (50) and saved 50 over the real value. */}
              <Controller
                name="cvPassThreshold"
                control={control}
                render={({ field }) => (
                  <input
                    id="cvPassThreshold"
                    type="range"
                    min={0}
                    max={100}
                    step={5}
                    className="h-1.5 w-full cursor-pointer appearance-none rounded-lg bg-indigo-100 accent-primary"
                    ref={field.ref}
                    name={field.name}
                    onBlur={field.onBlur}
                    value={Number.isFinite(field.value) ? field.value : 0}
                    onChange={(event) => field.onChange(event.target.valueAsNumber)}
                  />
                )}
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
        <Field
          id="interviewQuestionCount"
          label="Số lượng câu hỏi phỏng vấn"
          error={errors.interviewQuestionCount?.message}
        >
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
        <div className="grid gap-4 sm:grid-cols-2">
          {(
            [
              ['technical', 'Chuyên môn'],
              ['communication', 'Giao tiếp'],
              ['relevance', 'Mức độ phù hợp'],
              ['evidence', 'Bằng chứng'],
            ] as const
          ).map(([name, label]) => (
            <Field
              key={name}
              id={`rubricWeights.${name}`}
              label={label}
              error={errors.rubricWeights?.[name]?.message}
            >
              <Input
                id={`rubricWeights.${name}`}
                type="number"
                min={0}
                max={100}
                {...register(`rubricWeights.${name}` as const, { valueAsNumber: true })}
              />
              <p className="text-xs text-muted-foreground">Trọng số {label.toLowerCase()} (%)</p>
            </Field>
          ))}
        </div>
        <div
          className={
            rubricTotal === 100
              ? 'rounded-lg bg-emerald-50 p-3 text-sm font-medium text-emerald-700'
              : 'rounded-lg bg-red-50 p-3 text-sm font-medium text-red-700'
          }
        >
          Tổng trọng số: {rubricTotal}% {rubricTotal === 100 ? '— Hợp lệ' : '— Cần bằng 100%'}
        </div>
        {errors.rubricWeights?.message && (
          <p role="alert" className="text-xs text-destructive">
            {errors.rubricWeights.message}
          </p>
        )}
        {errors.root?.server?.message && (
          <p
            role="alert"
            className="whitespace-pre-line rounded-lg bg-red-50 p-3 text-sm text-red-700"
          >
            {errors.root.server.message}
          </p>
        )}
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
