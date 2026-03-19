import { useState, useEffect, useRef, KeyboardEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { api, ResearchJob } from '@/api/client';
import { ArrowRight } from 'lucide-react';

const SUGGESTIONS = [
  'Latest advances in quantum computing',
  'Impact of AI on drug discovery',
  'Comparing WebAssembly runtimes in 2024',
  'Climate change mitigation technologies',
];

function StatusPill({ status }: { status: ResearchJob['status'] }) {
  const styles = {
    running: 'bg-amber-dim text-amber',
    done: 'bg-green-dim text-green',
    error: 'bg-red-dim text-red',
  };
  return (
    <span className={`px-2 py-0.5 rounded-md text-[11px] font-mono font-medium uppercase tracking-wider ${styles[status]}`}>
      {status}
    </span>
  );
}

export default function HomePage() {
  const [query, setQuery] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [focused, setFocused] = useState(false);
  const [jobs, setJobs] = useState<ResearchJob[]>([]);
  const navigate = useNavigate();
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    const fetchJobs = () => api.getJobs().then(setJobs).catch(() => {});
    fetchJobs();
    const id = setInterval(fetchJobs, 5000);
    return () => clearInterval(id);
  }, []);

  const submit = async () => {
    if (!query.trim() || submitting) return;
    setSubmitting(true);
    try {
      const { id } = await api.createJob(query.trim());
      navigate(`/research/${id}`);
    } catch {
      setSubmitting(false);
    }
  };

  const handleKeyDown = (e: KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      submit();
    }
  };

  return (
    <div className="min-h-screen bg-bg flex flex-col items-center justify-start pt-[15vh]">
      {/* Header */}
      <div className="w-full max-w-[640px] px-4 mb-10">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-7 h-7 rounded-md bg-amber flex items-center justify-center">
              <div className="w-3.5 h-3.5 bg-bg rounded-sm" />
            </div>
            <span className="text-text font-medium text-[15px]">Research Engine</span>
          </div>
          <span className="text-[11px] font-mono text-text-3 border border-border-hi rounded-md px-2.5 py-1 tracking-wider uppercase">
            HuggingFace · multi-agent
          </span>
        </div>
      </div>

      {/* Hero */}
      <div className="w-full max-w-[640px] px-4 mb-8">
        <p className="font-mono text-[10px] text-amber uppercase tracking-[0.15em] mb-4">
          5-AGENT PIPELINE
        </p>
        <h1 className="font-display text-[40px] leading-[1.1] font-bold mb-4">
          <span className="text-text">Deep research,</span>
          <br />
          <span className="text-amber">grounded in sources.</span>
        </h1>
        <p className="text-text-2 text-[15px] leading-relaxed max-w-[480px]" style={{ textWrap: 'pretty' as any }}>
          Enter a topic and our multi-agent pipeline will plan, search, validate, extract and synthesize a comprehensive research report.
        </p>
      </div>

      {/* Input Box */}
      <div className="w-full max-w-[640px] px-4 mb-6">
        <div
          className={`bg-bg-2 border rounded-lg p-4 transition-colors duration-[40ms] ${
            focused ? 'border-amber' : 'border-border'
          }`}
          onClick={() => textareaRef.current?.focus()}
        >
          <textarea
            ref={textareaRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            onFocus={() => setFocused(true)}
            onBlur={() => setFocused(false)}
            rows={3}
            placeholder="What would you like to research?"
            className="w-full bg-transparent text-text placeholder:text-text-3 resize-none outline-none text-[14px] leading-relaxed font-body"
          />
          <div className="flex items-center justify-between mt-3 pt-3 border-t border-border">
            <span className="text-[10px] font-mono text-text-3 uppercase tracking-wider">
              Enter ↵ to start
            </span>
            <button
              onClick={submit}
              disabled={!query.trim() || submitting}
              className="flex items-center gap-2 px-3.5 py-1.5 rounded-md bg-amber text-bg text-[13px] font-medium disabled:opacity-30 transition-colors duration-[40ms] hover:brightness-110"
            >
              Research
              <ArrowRight size={14} />
            </button>
          </div>
        </div>
      </div>

      {/* Suggestions */}
      <div className="w-full max-w-[640px] px-4 mb-10">
        <div className="flex flex-wrap gap-2">
          {SUGGESTIONS.map((s) => (
            <button
              key={s}
              onClick={() => setQuery(s)}
              className="px-3 py-1.5 rounded-md border border-border text-[12px] text-text-2 hover:border-border-hi hover:text-text transition-colors duration-[40ms] font-body"
            >
              {s}
            </button>
          ))}
        </div>
      </div>

      {/* Recent Jobs */}
      {jobs.length > 0 && (
        <div className="w-full max-w-[640px] px-4 mb-16">
          <p className="text-[10px] font-mono text-text-3 uppercase tracking-wider mb-3">
            Recent Research
          </p>
          <div className="border border-border rounded-lg overflow-hidden divide-y divide-border">
            {jobs.slice(0, 8).map((job) => (
              <button
                key={job.id}
                onClick={() => navigate(`/research/${job.id}`)}
                className="w-full flex items-center justify-between px-4 py-3 hover:bg-bg-3 transition-colors duration-[40ms] text-left"
              >
                <span className="text-text text-[13px] truncate max-w-[400px]">
                  {job.topic}
                </span>
                <StatusPill status={job.status} />
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
