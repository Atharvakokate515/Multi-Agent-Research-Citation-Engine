import { useParams, useNavigate } from 'react-router-dom';
import { useJobStream } from '@/hooks/useJobStream';
import PipelineSidebar from '@/components/PipelineSidebar';
import ReportViewer from '@/components/ReportViewer';
import { ArrowLeft, Check, X, Loader2 } from 'lucide-react';

function SkeletonLines() {
  const widths = [100, 92, 85, 96, 78, 88, 60];
  return (
    <div className="space-y-3">
      {widths.map((w, i) => (
        <div
          key={i}
          className="h-3 bg-bg-3 rounded animate-pulse"
          style={{ width: `${w}%` }}
        />
      ))}
    </div>
  );
}

export default function ResearchPage() {
  const { jobId } = useParams<{ jobId: string }>();
  const navigate = useNavigate();
  const { agents, report, error, isDone } = useJobStream(jobId!);

  const isRunning = !isDone;
  const isError = !!error;
  const isComplete = isDone && !error && !!report;

  return (
    <div className="min-h-screen bg-bg flex flex-col">
      {/* Sticky Header */}
      <header className="sticky top-0 z-10 flex items-center justify-between px-4 h-12 border-b border-border bg-bg/95 backdrop-blur-sm">
        <div className="flex items-center gap-3 min-w-0">
          <button
            onClick={() => navigate('/')}
            className="flex items-center gap-1.5 text-[13px] text-text-2 hover:text-text transition-colors duration-[40ms] flex-shrink-0"
          >
            <ArrowLeft size={14} />
            Home
          </button>
          <span className="text-border-hi">/</span>
          <span className="text-[13px] text-text truncate max-w-[400px]">
            {/* Topic will show from the stream context */}
            Research #{jobId?.slice(0, 8)}
          </span>
        </div>
        <div className="flex items-center gap-2">
          {isRunning && (
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-amber animate-pulse-amber" />
              <span className="text-[11px] font-mono text-amber">Running</span>
            </div>
          )}
          {isComplete && (
            <div className="flex items-center gap-2">
              <Check size={14} className="text-green" />
              <span className="text-[11px] font-mono text-green">Complete</span>
            </div>
          )}
          {isError && (
            <div className="flex items-center gap-2">
              <X size={14} className="text-red" />
              <span className="text-[11px] font-mono text-red">Error</span>
            </div>
          )}
        </div>
      </header>

      {/* Body */}
      <div className="flex flex-1 overflow-hidden">
        <PipelineSidebar agents={agents} isDone={isDone} />

        {/* Main Content */}
        <main className="flex-1 overflow-y-auto scrollbar-hide p-6 md:p-8">
          {isRunning && (
            <div className="max-w-[720px]">
              <div className="border border-border rounded-lg p-6 bg-bg-2 mb-6">
                <div className="flex items-center gap-3 mb-4">
                  <Loader2 size={16} className="text-amber animate-spin" />
                  <span className="text-[14px] text-amber font-medium">
                    Researching…
                  </span>
                </div>
                <SkeletonLines />
              </div>
            </div>
          )}

          {isError && (
            <div className="max-w-[720px]">
              <div className="border border-red/30 rounded-lg p-6 bg-red-dim">
                <p className="text-red font-medium text-[14px] mb-2">
                  Research failed
                </p>
                <p className="text-text-2 text-[13px] mb-4">{error}</p>
                <button
                  onClick={() => navigate('/')}
                  className="px-3.5 py-1.5 rounded-md bg-bg-3 text-text text-[13px] hover:bg-border transition-colors duration-[40ms]"
                >
                  ← Back to Home
                </button>
              </div>
            </div>
          )}

          {isComplete && report && (
            <div className="max-w-[720px]">
              <ReportViewer report={report} />
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
