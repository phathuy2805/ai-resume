import { afterEach, describe, expect, it, vi } from 'vitest';
import type { InternalAxiosRequestConfig } from 'axios';
import { QueryClientProvider } from '@tanstack/react-query';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import JobForm from '@/components/hr/JobForm';
import { apiClient } from '@/lib/axios';
import { createQueryClient } from '@/lib/queryClient';
import type { Job } from '@/types/jobs';
import HREditJobPage from './HREditJobPage';

vi.mock('sonner', () => ({ toast: { error: vi.fn(), success: vi.fn() } }));

const originalAdapter = apiClient.defaults.adapter;
afterEach(() => {
  cleanup();
  apiClient.defaults.adapter = originalAdapter;
});

const job: Job = {
  id: 'job-1',
  title: 'Frontend React',
  description: 'Build UI',
  requirements: null,
  requiredSkills: ['React.js'],
  preferredSkills: ['Next.js'],
  minYearsExperience: 1,
  level: 'JUNIOR',
  status: 'OPEN',
  cvPassThreshold: 80,
  interviewQuestionCount: 4,
  rubricWeights: { technical: 50, communication: 20, relevance: 20, evidence: 10 },
  createdById: 'hr-1',
  createdAt: '2026-11-19',
  updatedAt: '2026-11-19',
  applicationCount: 0,
};

const valueOf = (label: string) => screen.getByLabelText<HTMLInputElement>(label).value;

describe('HR job form defaults', () => {
  it('edit page loads the saved AI config and saves it back unchanged', async () => {
    const calls: { method?: string; url?: string; body?: unknown }[] = [];
    apiClient.defaults.adapter = async (config: InternalAxiosRequestConfig) => {
      calls.push({
        method: config.method,
        url: config.url,
        body: config.data ? JSON.parse(config.data as string) : undefined,
      });
      return { config, data: { data: job }, status: 200, statusText: 'OK', headers: {} };
    };

    render(
      <QueryClientProvider client={createQueryClient()}>
        <MemoryRouter initialEntries={['/hr/jobs/job-1/edit']}>
          <Routes>
            <Route path="/hr/jobs/:id/edit" element={<HREditJobPage />} />
            <Route path="/hr/jobs" element={<p>list</p>} />
          </Routes>
        </MemoryRouter>
      </QueryClientProvider>,
    );

    await screen.findByLabelText('Ngưỡng điểm đạt CV');
    expect(calls[0]).toMatchObject({ method: 'get', url: '/jobs/mine/job-1' });
    // Regression: the range input used to show its midpoint (50) instead of the saved 80.
    expect(valueOf('Ngưỡng điểm đạt CV')).toBe('80');
    expect(screen.getByText('80/100')).toBeTruthy();
    expect(valueOf('Chuyên môn')).toBe('50');
    expect(valueOf('Bằng chứng')).toBe('10');

    fireEvent.click(screen.getByRole('button', { name: /Lưu tin tuyển dụng/ }));
    await waitFor(() => expect(calls.some((call) => call.method === 'patch')).toBe(true));
    expect(calls.find((call) => call.method === 'patch')).toMatchObject({
      url: '/jobs/job-1',
      body: {
        cvPassThreshold: 80,
        rubricWeights: { technical: 50, communication: 20, relevance: 20, evidence: 10 },
      },
    });
  });

  it('create form shows the default threshold (70), not the range midpoint', () => {
    render(
      <MemoryRouter>
        <JobForm mode="create" onSubmit={vi.fn()} />
      </MemoryRouter>,
    );
    expect(valueOf('Ngưỡng điểm đạt CV')).toBe('70');
    expect(screen.getByText('70/100')).toBeTruthy();
  });
});
