import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { InternalAxiosRequestConfig } from 'axios';
import { QueryClientProvider } from '@tanstack/react-query';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { toast } from 'sonner';
import { apiClient } from '@/lib/axios';
import { createQueryClient } from '@/lib/queryClient';
import type { Company } from '@/types/company';
import HRCompanySettingsPage from './HRCompanySettingsPage';

vi.mock('sonner', () => ({ toast: { error: vi.fn(), success: vi.fn() } }));

const company: Company = {
  id: 'company-1',
  name: 'Công ty Cổ phần Công nghệ Lumora',
  shortName: 'Lumora Tech',
  tagline: 'Slogan cũ',
  logoUrl: null,
  industry: 'Phần mềm',
  companySize: '200-500 nhân viên',
  foundedYear: 2016,
  address: 'TP. Hồ Chí Minh',
  website: 'https://lumora.example',
  contactEmail: 'tuyendung@lumora.example',
  phone: '(028) 3800 0000',
  description: 'Giới thiệu',
  culture: null,
  benefits: ['Lương tháng 13'],
  createdAt: '2026-11-28T00:00:00.000Z',
  updatedAt: '2026-11-28T00:00:00.000Z',
};

type Call = { method?: string; url?: string; body?: unknown };
let calls: Call[];
let patchResponse: (body: Record<string, unknown>) => {
  status: number;
  data: unknown;
};

const originalAdapter = apiClient.defaults.adapter;
beforeEach(() => {
  calls = [];
  patchResponse = (body) => ({ status: 200, data: { data: { ...company, ...body } } });
  apiClient.defaults.adapter = async (config: InternalAxiosRequestConfig) => {
    const body =
      config.data instanceof FormData
        ? config.data
        : config.data
          ? JSON.parse(config.data as string)
          : undefined;
    calls.push({ method: config.method, url: config.url, body });
    const response =
      config.method === 'patch'
        ? patchResponse(body)
        : config.method === 'post'
          ? { status: 200, data: { data: { ...company, logoUrl: '/api/company/logo?v=1' } } }
          : { status: 200, data: { data: company } };
    if (response.status >= 400) {
      const error = Object.assign(new Error('Request failed'), {
        isAxiosError: true,
        config,
        response: { ...response, config, statusText: 'Bad Request', headers: {} },
      });
      throw error;
    }
    return { config, ...response, statusText: 'OK', headers: {} };
  };
});
afterEach(() => {
  cleanup();
  vi.clearAllMocks();
  apiClient.defaults.adapter = originalAdapter;
});

function mount() {
  render(
    <QueryClientProvider client={createQueryClient()}>
      <MemoryRouter>
        <HRCompanySettingsPage />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

const saveButton = () => screen.getByRole('button', { name: /Lưu thay đổi/ }) as HTMLButtonElement;
const change = (label: string | RegExp, value: string) =>
  fireEvent.change(screen.getByLabelText(label), { target: { value } });

describe('HRCompanySettingsPage', () => {
  it('chỉ gửi các field đã sửa, chuỗi rỗng thành null', async () => {
    mount();
    await screen.findByDisplayValue('Slogan cũ');
    expect(saveButton().disabled).toBe(true);

    change('Khẩu hiệu', 'Slogan mới');
    change('Số điện thoại', '');
    await waitFor(() => expect(saveButton().disabled).toBe(false));
    fireEvent.click(saveButton());

    await waitFor(() => expect(toast.success).toHaveBeenCalledWith('Đã lưu thông tin công ty'));
    expect(calls.find((call) => call.method === 'patch')).toMatchObject({
      url: '/company',
      body: { tagline: 'Slogan mới', phone: null },
    });
    expect(Object.keys(calls.find((call) => call.method === 'patch')!.body as object)).toHaveLength(
      2,
    );
    await waitFor(() => expect(saveButton().disabled).toBe(true));
  });

  it('chặn website sai định dạng ngay trên trình duyệt', async () => {
    mount();
    await screen.findByDisplayValue('Slogan cũ');

    change('Website', 'lumora.example');
    fireEvent.click(saveButton());

    await screen.findByText('Website phải bắt đầu bằng http:// hoặc https://');
    expect(calls.some((call) => call.method === 'patch')).toBe(false);
  });

  it('gắn lỗi 400 từ server vào đúng field, không bật toast lỗi', async () => {
    patchResponse = () => ({
      status: 400,
      data: {
        statusCode: 400,
        message: 'Validation failed',
        errors: ['tagline: Khẩu hiệu bị từ chối bởi server'],
      },
    });
    mount();
    await screen.findByDisplayValue('Slogan cũ');

    change('Khẩu hiệu', 'Slogan mới');
    await waitFor(() => expect(saveButton().disabled).toBe(false));
    fireEvent.click(saveButton());

    await screen.findByText('Khẩu hiệu bị từ chối bởi server');
    expect(toast.error).not.toHaveBeenCalled();
  });

  it('kiểm tra loại file logo trước khi tải lên, ảnh hợp lệ thì gửi multipart', async () => {
    mount();
    await screen.findByRole('button', { name: /Tải logo lên/ });
    const input = screen.getByLabelText('Chọn ảnh logo');

    fireEvent.change(input, {
      target: { files: [new File(['<svg/>'], 'logo.svg', { type: 'image/svg+xml' })] },
    });
    expect(toast.error).toHaveBeenCalledWith('Logo chỉ hỗ trợ định dạng JPG, PNG hoặc WebP');
    expect(calls.some((call) => call.method === 'post')).toBe(false);

    fireEvent.change(input, {
      target: { files: [new File(['png'], 'logo.png', { type: 'image/png' })] },
    });
    await waitFor(() => expect(toast.success).toHaveBeenCalledWith('Đã cập nhật logo công ty'));
    const post = calls.find((call) => call.method === 'post');
    expect(post?.url).toBe('/company/logo');
    expect((post?.body as FormData).get('file')).toBeInstanceOf(File);
    await screen.findByRole('button', { name: /Đổi logo/ });
  });
});
