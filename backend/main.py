"""
main.py
-------
Entry point for the Multi-Agent Research Citation Engine.

Usage
-----
    python -m research_crew.main --topic "attention mechanisms in transformers"
    python -m research_crew.main   # will prompt for a topic interactively

Pipeline
--------
    User Topic
        → Planner Agent   (generate queries)
        → Search Agent    (retrieve sources via Exa / Tavily)
        → Validator Agent (score & filter to top 5)
        → Extractor Agent (fetch content & extract evidence)
        → Synthesizer Agent (produce final Markdown report)

LLM Provider (auto-detected from env vars)
------------------------------------------
    Priority order:
      1. LLM_PROVIDER env var  ("openai" | "huggingface") — explicit override
      2. OPENAI_API_KEY present → OpenAI
      3. HF_TOKEN present       → HuggingFace

    OpenAI env vars:
      OPENAI_API_KEY   – required
      OPENAI_MODEL     – model name (default: gpt-4o)

    HuggingFace env vars:
      HF_TOKEN         – required
      HF_MODEL         – model name (default: meta-llama/Meta-Llama-3.1-70B-Instruct)

    Shared:
      LLM_TEMPERATURE  – temperature (default: 0.3)

Other required env vars
-----------------------
    EXA_API_KEY      – Exa neural search API key

Optional
--------
    TAVILY_API_KEY   – Tavily search API key (fallback)
    OUTPUT_FILE      – Path to save the final report (default: research_report.md)
"""

import argparse, asyncio, json, logging, os, sys, time
from datetime import datetime
from pathlib import Path
from typing import Callable, Optional
from dotenv import load_dotenv
load_dotenv()

from crewai import Crew, LLM, Process
from research_crew.agents.planner_agent     import build_planner_agent
from research_crew.agents.search_agent      import build_search_agent
from research_crew.agents.validator_agent   import build_validator_agent
from research_crew.agents.extractor_agent   import build_extractor_agent
from research_crew.agents.synthesizer_agent import build_synthesizer_agent
from research_crew.tasks.planning_task    import build_planning_task
from research_crew.tasks.search_task      import build_search_task
from research_crew.tasks.validation_task  import build_validation_task
from research_crew.tasks.extraction_task  import build_extraction_task
from research_crew.tasks.summary_task     import build_summary_task

LOG_FORMAT = "%(asctime)s | %(levelname)-8s | %(name)s | %(message)s"
logging.basicConfig(level=logging.INFO, format=LOG_FORMAT,
    handlers=[logging.StreamHandler(sys.stdout),
              logging.FileHandler("research_crew.log", mode="a")])
logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Provider detection
# ---------------------------------------------------------------------------

def _detect_provider() -> str:
    """Return 'openai' or 'huggingface' based on env vars.

    Priority:
      1. LLM_PROVIDER env var (explicit override)
      2. OPENAI_API_KEY present  → openai
      3. HF_TOKEN present        → huggingface
    """
    explicit = os.getenv("LLM_PROVIDER", "").strip().lower()
    if explicit in ("openai", "huggingface"):
        return explicit

    if os.getenv("OPENAI_API_KEY"):
        return "openai"
    if os.getenv("HF_TOKEN"):
        return "huggingface"

    # Neither found — return unknown so _check_env can give a clear error
    return "unknown"


def _check_env():
    provider = _detect_provider()

    if provider == "unknown":
        logger.error(
            "No LLM credentials found. "
            "Set OPENAI_API_KEY (for OpenAI) or HF_TOKEN (for HuggingFace)."
        )
        sys.exit(1)

    if provider == "openai" and not os.getenv("OPENAI_API_KEY"):
        logger.error("LLM_PROVIDER=openai but OPENAI_API_KEY is not set.")
        sys.exit(1)

    if provider == "huggingface" and not os.getenv("HF_TOKEN"):
        logger.error("LLM_PROVIDER=huggingface but HF_TOKEN is not set.")
        sys.exit(1)

    if not os.getenv("EXA_API_KEY"):
        logger.error("EXA_API_KEY is required but not set.")
        sys.exit(1)

    if not os.getenv("TAVILY_API_KEY"):
        logger.warning("TAVILY_API_KEY not set — fallback search unavailable.")

    logger.info("LLM provider: %s", provider)


def _build_llm() -> LLM:
    provider = _detect_provider()
    temp = float(os.getenv("LLM_TEMPERATURE", "0.3"))

    if provider == "openai":
        model = os.getenv("OPENAI_MODEL", "gpt-4o")
        logger.info("LLM: OpenAI | model: %s | temp: %.1f", model, temp)
        return LLM(
            model=model,
            api_key=os.getenv("OPENAI_API_KEY"),
            temperature=temp,
        )

    # huggingface
    model = os.getenv("HF_MODEL", "meta-llama/Meta-Llama-3.1-70B-Instruct")
    logger.info("LLM: HuggingFace Inference API | model: %s | temp: %.1f", model, temp)
    return LLM(
        model=f"openai/{model}",
        api_key=os.getenv("HF_TOKEN"),
        base_url="https://api-inference.huggingface.co/v1/",
        temperature=temp,
    )

# ---------------------------------------------------------------------------
# Everything below is identical to the original
# ---------------------------------------------------------------------------

def _summarise(agent_id, raw):
    try:
        d = json.loads(raw)
        if agent_id == "planner":   return f"{len(d.get('queries',[]))} queries generated"
        if agent_id == "search":    return f"{len(d)} sources retrieved"
        if agent_id == "validator": return f"Top {len(d.get('validated_sources',[]))} sources selected"
        if agent_id == "extractor": return f"Evidence from {len(d)} sources extracted"
        if agent_id == "synthesizer": return "Research report written"
    except Exception: pass
    return None

def run_research_pipeline(topic: str, on_event: Optional[Callable[[dict],None]]=None) -> str:
    def emit(e):
        if on_event:
            try: on_event(e)
            except Exception as ex: logger.warning("on_event error: %s", ex)

    logger.info("="*60); logger.info("Pipeline start | %s", topic); logger.info("="*60)
    t0  = time.time()
    llm = _build_llm()

    emit({"type":"agent_start","agent":"planner",    "message":"Decomposing topic into queries…"})
    planner    = build_planner_agent(llm)
    emit({"type":"agent_start","agent":"search",     "message":"Setting up academic search…"})
    search     = build_search_agent(llm)
    emit({"type":"agent_start","agent":"validator",  "message":"Setting up source validator…"})
    validator  = build_validator_agent(llm)
    emit({"type":"agent_start","agent":"extractor",  "message":"Setting up evidence extractor…"})
    extractor  = build_extractor_agent(llm)
    emit({"type":"agent_start","agent":"synthesizer","message":"Setting up research writer…"})
    synth      = build_synthesizer_agent(llm)

    pt = build_planning_task(planner, topic)
    st = build_search_task(search, pt)
    vt = build_validation_task(validator, st)
    et = build_extraction_task(extractor, vt)
    rt = build_summary_task(synth, et, topic)

    reg = {id(pt):("planner",_summarise), 
           id(st):("search",_summarise),
           id(vt):("validator",_summarise), 
           id(et):("extractor",_summarise),
           id(rt):("synthesizer",_summarise)}

    def cb(out):
        tid = id(getattr(out,"task",None))
        aid,fn = reg.get(tid, ("unknown", lambda a,r: None))
        raw = str(getattr(out,"raw",out))
        emit({"type":"agent_done","agent":aid,"message":fn(aid,raw) or "Done"})

    crew = Crew(
        agents=[planner,search,validator,extractor,synth],
        tasks=[pt,st,vt,et,rt],
        process=Process.sequential, verbose=True, memory=False,
        task_callback=cb,
    )
    result  = crew.kickoff()
    elapsed = time.time()-t0
    logger.info("Done in %.1fs", elapsed)

    provider = _detect_provider()
    if provider == "openai":
        model = os.getenv("OPENAI_MODEL", "gpt-4o")
    else:
        model = os.getenv("HF_MODEL", "Meta-Llama-3.1-70B-Instruct")

    return str(result) + (
        f"\n\n---\n*Generated {datetime.utcnow().strftime('%Y-%m-%d %H:%M UTC')} "
        f"· {elapsed:.0f}s · model: `{model}`*\n"
    )

async def run_research_with_events(topic: str, event_queue: asyncio.Queue) -> None:
    loop = asyncio.get_event_loop()
    def on_event(e): loop.call_soon_threadsafe(event_queue.put_nowait, e)
    try:
        report = await loop.run_in_executor(
            None, lambda: run_research_pipeline(topic, on_event=on_event))
        loop.call_soon_threadsafe(event_queue.put_nowait, {"type":"done","report":report})
    except asyncio.CancelledError:
        loop.call_soon_threadsafe(event_queue.put_nowait, {"type":"error","message":"Cancelled."})
    except Exception as exc:
        logger.exception("Pipeline error")
        loop.call_soon_threadsafe(event_queue.put_nowait, {"type":"error","message":str(exc)})

def _save_report(report):
    p = Path(os.getenv("OUTPUT_FILE","research_report.md"))
    p.write_text(report, encoding="utf-8")
    logger.info("Saved → %s", p.resolve()); return p

def main():
    _check_env()
    parser = argparse.ArgumentParser(description="Research Engine")
    parser.add_argument("--topic",  type=str, default=None)
    parser.add_argument("--output", type=str, default=None)
    args = parser.parse_args()
    if args.output: os.environ["OUTPUT_FILE"] = args.output
    topic = args.topic or input("\nEnter research topic: ").strip()
    if not topic: logger.error("No topic."); sys.exit(1)
    report = run_research_pipeline(topic)
    path   = _save_report(report)
    print("\n"+"="*60+"\n"+report+"\n"+"="*60)
    print(f"\nSaved: {path.resolve()}")

if __name__ == "__main__":
    main()