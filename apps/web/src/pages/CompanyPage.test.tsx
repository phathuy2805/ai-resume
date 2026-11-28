import { afterEach, describe, expect, it, vi } from 'vitest';
import type { InternalAxiosRequestConfig } from 'axios';
import { QueryClientProvider } from '@tanstack/react-query';
import { cleanup, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { toast } from 'sonner';
import { apiClient } from '@/lib/axios';
import { createQueryClient } from '@/lib/queryClient';
import type { Company } from '@/types/company';
import CompanyPage from './CompanyPage';

vi.mock('sonner', () => ({ toast: { error: vi.fn(), success: vi.fn() } }));

const company: Company = {
  id: 'company-1',
  name: 'Công ty Cổ phần Công nghệ Lumora',
  shortName: 'Lumora Tech',
  tagline: 'Kiến tạo sản phẩm số',
  logoUrl: null,
  industry: 'Phần mềm',
  companySize: '200-500 nhân viên',
  foundedYear: 2016,
  address: 'Tầng 12, Khu Công nghệ cao, TP. Hồ Chí Minh',
  website: 'https://www.lumora.example/',
  contactEmail: 'tuyendung@lumora.example',
  phone: '(028) 3800 0000',
  description: 'Đoạn giới thiệu thứ nhất.\nĐoạn giới thiệu thứ hai.',
  culture: null,
  benefits: ['Lương tháng 13', 'Làm việc hybrid'],
  createdAt: '2026-11-28T00:00:00.000Z',
  updatedAt: '2026-11-28T00:00:00.000Z',
};

const job = {
  id: 'job-1',
  title: 'Backend NestJS',
  description: 'Build APIs',
  requirements: null,
  requiredSkills: ['NestJS'],
  preferredSkills: [],
  minYearsExperience: 2,
  level: 'MIDDLE',
  status: 'OPEN',
  interviewQuestionCount: 3,
  createdAt: '2026-11-28T00:00:00.000Z',
  updatedAt: '2026-11-28T00:00:00.000Z',
};

const originalAdapter = apiClient.defaults.adapter;
afterEach(() => {
  cleanup();
  vi.clearAllMocks();
  apiClient.defaults.adapter = originalAdapter;
});

function mount(companyStatus = 200) {
  apiClient.defaults.adapter = async (config: InternalAxiosRequestConfig) => {
    if (config.url === '/company' && companyStatus !== 200) {
      throw Object.assign(new Error('Request failed'), {
        isAxiosError: true,
        config,
        response: {
          status: companyStatus,
          data: { statusCode: companyStatus, message: 'Lỗi' },
          config,
          statusText: 'Error',
          headers: {},
        },
      });
    }
    const data =
      config.url === '/company'
        ? { data: company }
        : { data: [job], meta: { page: 1, limit: 5, total: 7 } };
    return { config, data, status: 200, statusText: 'OK', headers: {} };
  };
  render(
    <QueryClientProvider client={createQueryClient()}>
      <MemoryRouter>
        <CompanyPage />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe('CompanyPage', () => {
  it('hiển thị banner, giới thiệu, phúc lợi, liên hệ và vị trí đang tuyển', async () => {
    mount();

    expect(
      await screen.findByRole('heading', { level: 1, name: 'Công ty Cổ phần Công nghệ Lumora' }),
    ).toBeTruthy();
    expect(await screen.findByText('7')).toBeTruthy(); // meta.total -> "7 vị trí đang mở"
    expect(screen.getByText('Đoạn giới thiệu thứ hai.')).toBeTruthy();
    expect(screen.getByText('Làm việc hybrid')).toBeTruthy();
    expect(screen.getByText('TP. Hồ Chí Minh')).toBeTruthy();
    // Không có văn hoá -> không render khối rỗng
    expect(screen.queryByRole('heading', { name: 'Văn hoá & giá trị' })).toBeNull();

    const website = screen.getByRole('link', { name: 'lumora.example' });
    expect(website.getAttribute('href')).toBe('https://www.lumora.example/');
    expect(website.getAttribute('rel')).toBe('noopener noreferrer');
    expect(screen.getByRole('link', { name: '(028) 3800 0000' }).getAttribute('href')).toBe(
      'tel:02838000000',
    );
    expect(screen.getByRole('link', { name: 'Backend NestJS' }).getAttribute('href')).toBe(
      '/candidate/jobs/job-1',
    );
  });

  it('báo lỗi kèm nút thử lại khi không tải được công ty, không bật toast', async () => {
    mount(500);

    // useCompany thử lại 1 lần (~1s) trước khi báo lỗi.
    expect(
      await screen.findByText('Không tải được thông tin công ty.', {}, { timeout: 4000 }),
    ).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Thử lại' })).toBeTruthy();
    expect(toast.error).not.toHaveBeenCalled();
  });
});
