export interface ResearchJob {
  id: string;
  topic: string;
  status: 'running' | 'done' | 'error';
  report?: string;
  error?: string;
  created_at: string;
}

// Only change from original: reads VITE_API_URL in production (Render).
// In dev, falls back to '/api' so Vite's proxy still works unchanged.
const BASE = import.meta.env.VITE_API_URL ?? '/api';

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