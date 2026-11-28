import { useEffect, type ReactNode } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  Building2,
  Check,
  Contact,
  FileText,
  Loader2,
  RotateCcw,
  type LucideIcon,
} from 'lucide-react';
import { Controller, useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { Field } from '@/components/common/FormField';
import PageHeader from '@/components/common/PageHeader';
import QueryError from '@/components/common/QueryError';
import TagInput from '@/components/common/TagInput';
import CompanyLogoCard from '@/components/hr/CompanyLogoCard';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input, Textarea } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { useCompany, useUpdateCompany } from '@/hooks/useCompany';
import { getErrorMessage, handleFormError } from '@/lib/errorUtils';
import {
  companyFormSchema,
  toCompanyFormValues,
  toUpdateCompanyRequest,
  type CompanyFormValues,
} from '@/lib/schemas/company.schema';
import type { Company } from '@/types/company';

const FORM_FIELDS = [
  'name',
  'shortName',
  'tagline',
  'industry',
  'companySize',
  'foundedYear',
  'address',
  'website',
  'contactEmail',
  'phone',
  'description',
  'culture',
  'benefits',
] as const;

function Section({
  icon: Icon,
  title,
  description,
  children,
}: {
  icon: LucideIcon;
  title: string;
  description: string;
  children: ReactNode;
}) {
  return (
    <Card className="flex flex-col gap-5 p-6">
      <div className="flex flex-col gap-1 border-b border-border pb-3">
        <div className="flex items-center gap-2">
          <Icon className="h-5 w-5 text-muted-foreground" />
          <h2 className="text-card-title text-foreground">{title}</h2>
        </div>
        <p className="text-xs text-muted-foreground">{description}</p>
      </div>
      {children}
    </Card>
  );
}

function CompanyForm({ company }: { company: Company }) {
  const update = useUpdateCompany();
  const {
    register,
    control,
    handleSubmit,
    reset,
    setError,
    formState: { errors, isDirty, dirtyFields, isSubmitting },
  } = useForm<CompanyFormValues>({
    resolver: zodResolver(companyFormSchema),
    defaultValues: toCompanyFormValues(company),
  });

  // Đồng bộ khi dữ liệu thay đổi từ nơi khác (vd. đổi logo làm updatedAt đổi) mà form chưa sửa gì.
  useEffect(() => {
    if (!isDirty) reset(toCompanyFormValues(company));
  }, [company, isDirty, reset]);

  const onSubmit = handleSubmit(async (values) => {
    const body = toUpdateCompanyRequest(values, dirtyFields);
    if (Object.keys(body).length === 0) return;
    try {
      const saved = await update.mutateAsync(body);
      reset(toCompanyFormValues(saved));
      toast.success('Đã lưu thông tin công ty');
    } catch (error) {
      handleFormError(error, setError, FORM_FIELDS);
    }
  });

  const pending = isSubmitting || update.isPending;

  return (
    <form onSubmit={onSubmit} noValidate className="flex flex-col gap-6 pb-24">
      <Section
        icon={Building2}
        title="Thông tin chung"
        description="Tên, khẩu hiệu và các thông tin nổi bật hiển thị trên banner tuyển dụng."
      >
        <Field id="name" label="Tên doanh nghiệp" required error={errors.name?.message}>
          <Input
            id="name"
            placeholder="vd: Công ty Cổ phần Công nghệ Lumora"
            aria-invalid={!!errors.name}
            {...register('name')}
          />
        </Field>
        <div className="grid gap-5 sm:grid-cols-2">
          <Field
            id="shortName"
            label="Tên viết tắt / thương hiệu"
            hint="Ưu tiên hiển thị trên banner, vd: Lumora Tech"
            error={errors.shortName?.message}
          >
            <Input id="shortName" aria-invalid={!!errors.shortName} {...register('shortName')} />
          </Field>
          <Field id="industry" label="Lĩnh vực" error={errors.industry?.message}>
            <Input
              id="industry"
              placeholder="vd: Phần mềm / Công nghệ thông tin"
              aria-invalid={!!errors.industry}
              {...register('industry')}
            />
          </Field>
        </div>
        <Field id="tagline" label="Khẩu hiệu" error={errors.tagline?.message}>
          <Input
            id="tagline"
            placeholder="Một câu ngắn giới thiệu công ty"
            aria-invalid={!!errors.tagline}
            {...register('tagline')}
          />
        </Field>
        <div className="grid gap-5 sm:grid-cols-2">
          <Field id="companySize" label="Quy mô nhân sự" error={errors.companySize?.message}>
            <Input
              id="companySize"
              placeholder="vd: 200-500 nhân viên"
              aria-invalid={!!errors.companySize}
              {...register('companySize')}
            />
          </Field>
          <Field id="foundedYear" label="Năm thành lập" error={errors.foundedYear?.message}>
            <Input
              id="foundedYear"
              type="number"
              inputMode="numeric"
              placeholder="vd: 2016"
              aria-invalid={!!errors.foundedYear}
              {...register('foundedYear', {
                setValueAs: (value) =>
                  value === '' || value === null || value === undefined ? null : Number(value),
              })}
            />
          </Field>
        </div>
      </Section>

      <Section
        icon={Contact}
        title="Liên hệ"
        description="Ứng viên dùng các thông tin này để tìm hiểu và liên hệ với bộ phận tuyển dụng."
      >
        <Field id="address" label="Địa chỉ trụ sở" error={errors.address?.message}>
          <Input id="address" aria-invalid={!!errors.address} {...register('address')} />
        </Field>
        <div className="grid gap-5 sm:grid-cols-2">
          <Field id="website" label="Website" error={errors.website?.message}>
            <Input
              id="website"
              type="url"
              placeholder="https://"
              aria-invalid={!!errors.website}
              {...register('website')}
            />
          </Field>
          <Field id="contactEmail" label="Email tuyển dụng" error={errors.contactEmail?.message}>
            <Input
              id="contactEmail"
              type="email"
              placeholder="tuyendung@congty.vn"
              aria-invalid={!!errors.contactEmail}
              {...register('contactEmail')}
            />
          </Field>
        </div>
        <Field id="phone" label="Số điện thoại" error={errors.phone?.message}>
          <Input id="phone" type="tel" aria-invalid={!!errors.phone} {...register('phone')} />
        </Field>
      </Section>

      <Section
        icon={FileText}
        title="Giới thiệu"
        description="Nội dung hiển thị ở trang giới thiệu công ty và khối “Về công ty” trong tin tuyển dụng."
      >
        <Field id="description" label="Giới thiệu công ty" error={errors.description?.message}>
          <Textarea
            id="description"
            rows={5}
            placeholder="Công ty làm gì, sản phẩm chính, quy mô khách hàng..."
            aria-invalid={!!errors.description}
            {...register('description')}
          />
        </Field>
        <Field id="culture" label="Văn hoá & giá trị" error={errors.culture?.message}>
          <Textarea
            id="culture"
            rows={4}
            placeholder="Môi trường làm việc, giá trị cốt lõi, cách đội ngũ phối hợp..."
            aria-invalid={!!errors.culture}
            {...register('culture')}
          />
        </Field>
        <Field
          id="benefits"
          label="Phúc lợi"
          hint="Nhấn Enter hoặc dấu phẩy để thêm. Tối đa 20 phúc lợi."
          error={errors.benefits?.message ?? errors.benefits?.find?.((item) => item)?.message}
        >
          <Controller
            name="benefits"
            control={control}
            render={({ field }) => (
              <TagInput
                id="benefits"
                value={field.value}
                onChange={field.onChange}
                placeholder="+ Thêm phúc lợi..."
                tone="soft"
                invalid={!!errors.benefits}
              />
            )}
          />
        </Field>
      </Section>

      <div className="fixed inset-x-0 bottom-0 z-30 border-t border-border bg-card/95 backdrop-blur md:left-60">
        <div className="mx-auto flex h-16 w-full max-w-[760px] items-center justify-between gap-3 px-4 md:px-6">
          <span className="text-xs text-muted-foreground">
            {isDirty ? 'Bạn có thay đổi chưa lưu' : 'Mọi thay đổi đã được lưu'}
          </span>
          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              size="sm"
              className="h-9"
              disabled={!isDirty || pending}
              onClick={() => reset(toCompanyFormValues(company))}
            >
              <RotateCcw />
              Huỷ thay đổi
            </Button>
            <Button type="submit" size="sm" className="h-9" disabled={!isDirty || pending}>
              {pending ? <Loader2 className="animate-spin" /> : <Check />}
              Lưu thay đổi
            </Button>
          </div>
        </div>
      </div>
    </form>
  );
}

export default function HRCompanySettingsPage() {
  const companyQuery = useCompany();
  const company = companyQuery.data;

  return (
    <div className="mx-auto flex w-full max-w-[760px] flex-col gap-6">
      <PageHeader
        title="Thông tin công ty"
        description="Thông tin hiển thị cho ứng viên ở trang đăng nhập, danh sách việc làm và trang giới thiệu công ty."
      />
      {companyQuery.isPending ? (
        <>
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-96 w-full" />
        </>
      ) : !company ? (
        <QueryError
          message={getErrorMessage(companyQuery.error)}
          retry={() => void companyQuery.refetch()}
        />
      ) : (
        <>
          <CompanyLogoCard company={company} />
          <CompanyForm company={company} />
        </>
      )}
    </div>
  );
}
