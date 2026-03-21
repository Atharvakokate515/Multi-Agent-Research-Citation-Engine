"""
app.py  —  FastAPI server with SSE streaming
Start: uvicorn app:app --reload --port 8000
"""
import asyncio, json, logging, os, uuid
from datetime import datetime
from typing import Any, AsyncGenerator, Dict, Optional
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from pydantic import BaseModel, field_validator

logger = logging.getLogger(__name__)
app    = FastAPI(title="Research Citation Engine", version="2.0.0")

# Only change from original: ALLOWED_ORIGINS env var lets you add your
# Render frontend URL without touching code. Falls back to the original
# three localhost origins so local dev is completely unchanged.
_origins = [
    "http://localhost:5173",
    "http://localhost:4173",
    "http://localhost:3000",
]
_extra = os.getenv("ALLOWED_ORIGINS", "")
if _extra:
    _origins += [o.strip() for o in _extra.split(",") if o.strip()]

app.add_middleware(CORSMiddleware,
    allow_origins=_origins,
    allow_methods=["*"], allow_headers=["*"])

JOBS: Dict[str, Dict[str, Any]] = {}

class StartResearchRequest(BaseModel):
    topic: str
    @field_validator("topic")
    @classmethod
    def validate(cls, v):
        v = v.strip()
        if not v:            raise ValueError("topic must not be empty")
        if len(v) > 500:     raise ValueError("topic too long (max 500 chars)")
        return v

def _summary(j): return {"id":j["id"],"topic":j["topic"],"status":j["status"],
                          "created_at":j["created_at"],"completed_at":j["completed_at"]}
def _get404(job_id):
    if job_id not in JOBS: raise HTTPException(404, f"Job '{job_id}' not found.")
    return JOBS[job_id]
def _sse(d): return f"data: {json.dumps(d)}\n\n"

@app.post("/api/research", status_code=202)
async def start_research(body: StartResearchRequest):
    jid   = str(uuid.uuid4())
    queue = asyncio.Queue()
    JOBS[jid] = {"id":jid,"topic":body.topic,"status":"running",
                 "created_at":datetime.utcnow().isoformat(),"completed_at":None,
                 "report":None,"events":[],"queue":queue,"task":None}
    task = asyncio.create_task(_run_pipeline(jid, body.topic, queue))
    JOBS[jid]["task"] = task
    logger.info("Job %s started | %s", jid, body.topic)
    return _summary(JOBS[jid])

@app.get("/api/research")
async def list_jobs():
    return [_summary(j) for j in sorted(JOBS.values(),key=lambda x:x["created_at"],reverse=True)]

@app.get("/api/research/{job_id}")
async def get_job(job_id: str):
    j = _get404(job_id)
    return {**_summary(j), "report":j["report"], "events":j["events"]}

@app.delete("/api/research/{job_id}", status_code=204)
async def cancel_job(job_id: str):
    j = _get404(job_id)
    t = j.get("task")
    if t and not t.done(): t.cancel()
    j["status"] = "error"; j["completed_at"] = datetime.utcnow().isoformat()
    JOBS.pop(job_id, None)

@app.get("/api/research/{job_id}/stream")
async def stream_job(job_id: str):
    _get404(job_id)
    return StreamingResponse(_event_generator(job_id),
        media_type="text/event-stream",
        headers={"Cache-Control":"no-cache","X-Accel-Buffering":"no","Connection":"keep-alive"})

async def _run_pipeline(job_id, topic, queue):
    from research_crew.main import run_research_with_events
    try:
        await run_research_with_events(topic, queue)
    except asyncio.CancelledError:
        queue.put_nowait({"type":"error","message":"Job cancelled."})
    except Exception as exc:
        logger.exception("Job %s failed", job_id)
        queue.put_nowait({"type":"error","message":str(exc)})

async def _event_generator(job_id) -> AsyncGenerator[str, None]:
    job = JOBS.get(job_id)
    if not job: yield _sse({"type":"error","message":"Job not found."}); return
    for e in job["events"]: yield _sse(e)
    if job["status"] in ("done","error"): return
    queue = job["queue"]
    while True:
        try:
            event = await asyncio.wait_for(queue.get(), timeout=29.0)
        except asyncio.TimeoutError:
            yield ": heartbeat\n\n"; continue
        job["events"].append(event)
        if event["type"] == "done":
            job["status"]="done"; job["report"]=event.get("report")
            job["completed_at"]=datetime.utcnow().isoformat()
            yield _sse(event); break
        if event["type"] == "error":
            job["status"]="error"; job["completed_at"]=datetime.utcnow().isoformat()
            yield _sse(event); break
        yield _sse(event)