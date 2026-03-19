export interface ResearchJob {
  id: string;
  topic: string;
  status: 'running' | 'done' | 'error';
  report?: string;
  error?: string;
  created_at: string;
}

const BASE = '/api';

async function request<T>(path: string, opts?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...opts,
  });
  if (!res.ok) throw new Error(`API error: ${res.status}`);
  return res.json();
}

export const api = {
  createJob: (topic: string) =>
    request<{ id: string }>('/research', {
      method: 'POST',
      body: JSON.stringify({ topic }),
    }),

  getJobs: () => request<ResearchJob[]>('/research'),

  getJob: (id: string) => request<ResearchJob>(`/research/${id}`),

  deleteJob: (id: string) =>
    request<void>(`/research/${id}`, { method: 'DELETE' }),
};
