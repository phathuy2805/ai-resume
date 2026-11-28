import { afterEach, describe, expect, it } from 'vitest';
import { QueryClientProvider } from '@tanstack/react-query';
import { cleanup, render, waitFor } from '@testing-library/react';
import { createQueryClient } from '@/lib/queryClient';
import type { Company } from '@/types/company';
import DocumentBranding from './DocumentBranding';

const company = {
  name: 'Công ty Cổ phần Công nghệ Lumora',
  shortName: 'Lumora Tech',
  logoUrl: '/api/company/logo?v=1',
} as Company;

function mount(data?: Partial<Company>) {
  const client = createQueryClient();
  if (data) client.setQueryData(['company'], { ...company, ...data });
  render(
    <QueryClientProvider client={client}>
      <DocumentBranding />
    </QueryClientProvider>,
  );
}

afterEach(() => {
  cleanup();
  document.head.querySelectorAll('link[rel="icon"]').forEach((link) => link.remove());
});

describe('DocumentBranding', () => {
  it('đặt tiêu đề tab và favicon theo công ty', async () => {
    mount({});
    await waitFor(() => expect(document.title).toBe('Lumora Tech – Cổng tuyển dụng'));
    const icon = document.querySelector<HTMLLinkElement>('link[rel="icon"]')!;
    expect(icon.getAttribute('href')).toBe('/api/company/logo?v=1');
    expect(icon.hasAttribute('type')).toBe(false);
  });

  it('chưa có logo thì giữ favicon mặc định, thiếu tên ngắn thì dùng tên đầy đủ', async () => {
    mount({ shortName: null, logoUrl: null });
    await waitFor(() =>
      expect(document.title).toBe('Công ty Cổ phần Công nghệ Lumora – Cổng tuyển dụng'),
    );
    const icon = document.querySelector<HTMLLinkElement>('link[rel="icon"]')!;
    expect(icon.getAttribute('href')).toBe('/favicon.svg');
    expect(icon.type).toBe('image/svg+xml');
  });
});
