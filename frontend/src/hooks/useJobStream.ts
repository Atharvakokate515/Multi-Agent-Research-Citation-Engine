import { useState, useEffect, useRef } from 'react';

export type AgentName = 'Planner' | 'Search' | 'Validator' | 'Extractor' | 'Synthesizer';

export interface AgentState {
  name: AgentName;
  status: 'waiting' | 'running' | 'done';
  message: string;
}

const AGENT_NAMES: AgentName[] = ['Planner', 'Search', 'Validator', 'Extractor', 'Synthesizer'];

const initialAgents = (): AgentState[] =>
  AGENT_NAMES.map((name) => ({ name, status: 'waiting', message: '' }));

export function useJobStream(jobId: string) {
  const [agents, setAgents] = useState<AgentState[]>(initialAgents);
  const [report, setReport] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isDone, setIsDone] = useState(false);
  const sseRef = useRef<EventSource | null>(null);

  useEffect(() => {
    setAgents(initialAgents());
    setReport(null);
    setError(null);
    setIsDone(false);

    const sse = new EventSource(`/api/research/${jobId}/stream`);
    sseRef.current = sse;

    sse.addEventListener('agent_start', (e) => {
      try {
        const data = JSON.parse(e.data);
        setAgents((prev) =>
          prev.map((a) =>
            a.name.toLowerCase() === data.agent?.toLowerCase()
              ? { ...a, status: 'running', message: data.message || 'Processing...' }
              : a
          )
        );
      } catch {}
    });

    sse.addEventListener('agent_done', (e) => {
      try {
        const data = JSON.parse(e.data);
        setAgents((prev) =>
          prev.map((a) =>
            a.name.toLowerCase() === data.agent?.toLowerCase()
              ? { ...a, status: 'done', message: data.message || 'Complete' }
              : a
          )
        );
      } catch {}
    });

    sse.addEventListener('done', (e) => {
      try {
        const data = JSON.parse(e.data);
        setReport(data.report || '');
        setAgents((prev) => prev.map((a) => ({ ...a, status: 'done' })));
        setIsDone(true);
      } catch {}
      sse.close();
    });

    sse.addEventListener('error', (e) => {
      if (e instanceof MessageEvent) {
        try {
          const data = JSON.parse(e.data);
          setError(data.message || 'An error occurred');
        } catch {
          setError('Connection lost');
        }
      } else {
        setError('Connection lost');
      }
      setIsDone(true);
      sse.close();
    });

    return () => {
      sse.close();
    };
  }, [jobId]);

  return { agents, report, error, isDone };
}
