import { AgentState } from '@/hooks/useJobStream';
import { useElapsedTime } from '@/hooks/useElapsedTime';
import { Check, Loader2 } from 'lucide-react';

interface Props {
  agents: AgentState[];
  isDone: boolean;
}

function AgentRow({ agent, index }: { agent: AgentState; index: number }) {
  const isWaiting = agent.status === 'waiting';
  const isRunning = agent.status === 'running';
  const isDone = agent.status === 'done';

  return (
    <div
      className={`flex items-start gap-3 px-3 py-2.5 transition-opacity duration-200 ${
        isWaiting ? 'opacity-30' : 'opacity-100'
      }`}
    >
      <div className="mt-0.5 flex-shrink-0">
        {isWaiting && (
          <span className="w-5 h-5 rounded-full border border-border flex items-center justify-center text-[10px] font-mono text-text-3">
            {index + 1}
          </span>
        )}
        {isRunning && (
          <Loader2 size={16} className="text-amber animate-spin" />
        )}
        {isDone && (
          <Check size={16} className="text-green" />
        )}
      </div>
      <div className="min-w-0 flex-1">
        <p
          className={`text-[13px] font-medium ${
            isRunning ? 'text-amber' : isDone ? 'text-green' : 'text-text-3'
          }`}
        >
          {agent.name}
        </p>
        {agent.message && (
          <p className="text-[11px] text-text-3 truncate mt-0.5">
            {agent.message}
          </p>
        )}
      </div>
    </div>
  );
}

function parseSourcesCount(agents: AgentState[]): number {
  const search = agents.find((a) => a.name === 'Search');
  if (!search?.message) return 0;
  const match = search.message.match(/(\d+)\s*source/i);
  return match ? parseInt(match[1], 10) : 0;
}

export default function PipelineSidebar({ agents, isDone }: Props) {
  const doneCount = agents.filter((a) => a.status === 'done').length;
  const isRunning = !isDone;
  const elapsed = useElapsedTime(isRunning);
  const sources = parseSourcesCount(agents);

  return (
    <div className="w-[220px] flex-shrink-0 border-r border-border bg-bg-2 h-full flex flex-col">
      {/* Header */}
      <div className="px-4 py-4 border-b border-border">
        <div className="flex items-center justify-between mb-3">
          <span className="text-[11px] font-mono text-text-2 uppercase tracking-wider">
            Pipeline
          </span>
          <span className="text-[11px] font-mono text-text-3">
            {doneCount}/5 agents
          </span>
        </div>
        {/* Progress bar */}
        <div className="h-1 bg-bg-3 rounded-full overflow-hidden">
          <div
            className="h-full bg-amber rounded-full transition-all duration-300"
            style={{ width: `${(doneCount / 5) * 100}%` }}
          />
        </div>
        <p className="text-[11px] font-mono text-text-3 mt-2">
          {elapsed.toFixed(1)}s
        </p>
      </div>

      {/* Agent list */}
      <div className="flex-1 py-2 overflow-y-auto scrollbar-hide">
        {agents.map((agent, i) => (
          <AgentRow key={agent.name} agent={agent} index={i} />
        ))}
      </div>

      {/* Stats */}
      {isDone && (
        <div className="p-3 border-t border-border space-y-2">
          <div className="bg-bg-3 rounded-md p-3">
            <p className="text-[10px] font-mono text-text-3 uppercase tracking-wider mb-1">
              Sources
            </p>
            <p className="text-[18px] font-display font-bold text-text">
              {sources}
            </p>
          </div>
          <div className="bg-bg-3 rounded-md p-3">
            <p className="text-[10px] font-mono text-text-3 uppercase tracking-wider mb-1">
              Time
            </p>
            <p className="text-[18px] font-display font-bold text-text">
              {elapsed.toFixed(1)}s
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
