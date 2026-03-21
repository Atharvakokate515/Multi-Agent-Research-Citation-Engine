import { useState, useEffect, useRef } from "react";

export type AgentName = "Planner" | "Search" | "Validator" | "Extractor" | "Synthesizer";

export interface AgentState {
  name: AgentName;
  status: "waiting" | "running" | "done";
  message: string;
}

const AGENT_NAMES: AgentName[] = [
  "Planner",
  "Search",
  "Validator",
  "Extractor",
  "Synthesizer",
];

/** Back-end agent IDs to display names */
const AGENT_ID_MAP: Record<string, AgentName> = {
  planner:     "Planner",
  search:      "Search",
  validator:   "Validator",
  extractor:   "Extractor",
  synthesizer: "Synthesizer",
};

const initialAgents = (): AgentState[] =>
  AGENT_NAMES.map((name) => ({ name, status: "waiting", message: "" }));

export function useJobStream(jobId: string) {
  const [agents, setAgents]   = useState<AgentState[]>(initialAgents);
  const [report, setReport]   = useState<string | null>(null);
  const [error, setError]     = useState<string | null>(null);
  const [isDone, setIsDone]   = useState(false);
  const sseRef = useRef<EventSource | null>(null);

  useEffect(() => {
    // Reset state whenever jobId changes
    setAgents(initialAgents());
    setReport(null);
    setError(null);
    setIsDone(false);

    // The SSE endpoint lives at /api/research/:id/stream.
    // Vite proxy forwards this to http://localhost:8000/api/research/:id/stream
    const sse = new EventSource(`/api/research/${jobId}/stream`);
    sseRef.current = sse;

    // ── Event: agent started ───────────────────────────────────────────────
    sse.addEventListener("message", (e) => {
      // Generic 'message' events shouldn't occur, but handle gracefully
      try {
        const data = JSON.parse(e.data);
        handleEvent(data);
      } catch { /* ignore */ }
    });

    // FastAPI emits all events on the default 'message' event type via
    // `data: {...}\n\n` frames.  The EventSource spec fires these as
    // 'message' events, so we only need one listener.
    // However, keep named listeners for forward compatibility:

    sse.addEventListener("agent_start", (e) => {
      try { handleEvent({ ...JSON.parse((e as MessageEvent).data), type: "agent_start" }); }
      catch { /* ignore */ }
    });

    sse.addEventListener("agent_done", (e) => {
      try { handleEvent({ ...JSON.parse((e as MessageEvent).data), type: "agent_done" }); }
      catch { /* ignore */ }
    });

    sse.addEventListener("done", (e) => {
      try { handleEvent({ ...JSON.parse((e as MessageEvent).data), type: "done" }); }
      catch { /* ignore */ }
    });

    sse.addEventListener("error", (e) => {
      if (e instanceof MessageEvent) {
        try {
          const data = JSON.parse(e.data);
          if (data?.message) {
            handleEvent({ type: "error", message: data.message });
            return;
          }
        } catch { /* ignore */ }
      }
      // Network-level error (connection dropped, etc.)
      setError("Connection to server lost. Please refresh.");
      setIsDone(true);
      sse.close();
    });

    return () => {
      sse.close();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [jobId]);

  /** Central dispatch for all incoming SSE events */
  function handleEvent(data: Record<string, unknown>) {
    switch (data.type) {
      case "agent_start": {
        const agentName = AGENT_ID_MAP[String(data.agent ?? "").toLowerCase()];
        if (!agentName) break;
        setAgents((prev) =>
          prev.map((a) =>
            a.name === agentName
              ? { ...a, status: "running", message: String(data.message ?? "Processing…") }
              : a
          )
        );
        break;
      }

      case "agent_done": {
        const agentName = AGENT_ID_MAP[String(data.agent ?? "").toLowerCase()];
        if (!agentName) break;
        setAgents((prev) =>
          prev.map((a) =>
            a.name === agentName
              ? { ...a, status: "done", message: String(data.message ?? "Complete") }
              : a
          )
        );
        break;
      }

      case "done": {
        setReport(String(data.report ?? ""));
        // Mark all agents as done (catches any that didn't fire agent_done)
        setAgents((prev) => prev.map((a) => ({ ...a, status: "done" })));
        setIsDone(true);
        sseRef.current?.close();
        break;
      }

      case "error": {
        setError(String(data.message ?? "An unknown error occurred."));
        setIsDone(true);
        sseRef.current?.close();
        break;
      }

      default:
        break;
    }
  }

  return { agents, report, error, isDone };
}