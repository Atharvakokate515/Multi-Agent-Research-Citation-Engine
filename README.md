# Multi-Agent Research Citation Engine

A production-grade AI research assistant built with **CrewAI** (Python) and a **React + Vite** frontend.  
Enter any research topic and receive a structured Markdown report with accurate citations, extracted evidence, and verified references — similar to Perplexity Deep Research or Elicit, but fully open and customisable.

---

## What It Does

1. **Planner Agent** decomposes your topic into 4–6 targeted search queries
2. **Search Agent** retrieves up to 8 sources per query from arXiv, IEEE, ACL, GitHub, and official docs via Exa and Tavily APIs
3. **Validator Agent** scores every source (1–10) on credibility, recency, and technical depth — keeps only the top 5
4. **Extractor Agent** fetches each source (PDF or webpage), chunks the text, and extracts metrics, datasets, findings, and verbatim quotes
5. **Synthesizer Agent** merges all evidence into a structured Markdown report with inline citations — no hallucination, every claim is grounded

---

## Architecture

```
User Topic
    ↓
Planner Agent      → { "queries": [...] }
    ↓
Search Agent       → [ { title, url, source_type, snippet, ... } ]
    ↓
Validator Agent    → { "validated_sources": [ top 5 scored ] }
    ↓
Extractor Agent    → [ { metrics, datasets, key_findings, quotes } ]
    ↓
Synthesizer Agent  → Final Markdown Report
```

All agents communicate via **structured JSON only** — never raw documents.  
The FastAPI backend streams agent progress to the React frontend via **Server-Sent Events (SSE)**.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Backend API | FastAPI + Uvicorn |
| AI Agents | CrewAI (sequential pipeline) |
| LLM | OpenAI GPT-4o **or** HuggingFace Inference API |
| Search | Exa neural search (primary) + Tavily (fallback) |
| PDF parsing | PyMuPDF (`fitz`) |
| Web parsing | BeautifulSoup4 |
| Frontend | React 18 + Vite + TypeScript |
| UI | shadcn/ui + Tailwind CSS |
| Streaming | Server-Sent Events (SSE) |
| Deployment | Render (backend web service + static frontend) |

---

## Quick Start

### 1. Clone & install

```bash
git clone <repo-url>
cd multi-agent-researcher-2

# Backend
python -m venv .venv && source .venv/bin/activate
pip install -r backend/requirements.txt

# Frontend
cd frontend && npm install
```

### 2. Configure environment

```bash
cp "env (1).example" .env
# Edit .env and fill in your keys
```

### 3. Run locally

```bash
# Terminal 1 — Backend (from repo root)
cd backend
uvicorn app:app --reload --port 8000

# Terminal 2 — Frontend
cd frontend
npm run dev
```

Open [http://localhost:8080](http://localhost:8080) — the Vite dev server proxies `/api/*` to the FastAPI backend automatically.

---

## Project Structure

```
multi-agent-researcher-2/
├── backend/
│   ├── agents/
│   │   ├── planner_agent.py       # Research Strategist
│   │   ├── search_agent.py        # Academic Source Finder
│   │   ├── validator_agent.py     # Source Quality Evaluator
│   │   ├── extractor_agent.py     # Technical Evidence Extractor
│   │   └── synthesizer_agent.py   # Research Writer
│   ├── tasks/
│   │   ├── planning_task.py       # Query decomposition task
│   │   ├── search_task.py         # Source retrieval task
│   │   ├── validation_task.py     # Source scoring & filtering task
│   │   ├── extraction_task.py     # Evidence extraction task
│   │   └── summary_task.py        # Final report generation task
│   ├── tools/
│   │   ├── search_tool.py         # Exa + Tavily search tools
│   │   ├── pdf_extractor.py       # PyMuPDF PDF text extractor
│   │   └── web_parser.py          # BeautifulSoup webpage parser
│   ├── utils/
│   │   ├── token_utils.py         # count_tokens, truncate_text
│   │   └── text_chunker.py        # chunk_text with overlap
│   ├── app.py                     # FastAPI server with SSE streaming
│   ├── main.py                    # Pipeline runner & CLI entry point
│   └── requirements.txt
├── frontend/
│   ├── src/
│   │   ├── api/client.ts          # REST API client
│   │   ├── hooks/
│   │   │   ├── useJobStream.ts    # SSE event consumer
│   │   │   └── useElapsedTime.ts  # Timer hook
│   │   ├── pages/
│   │   │   ├── Index.tsx          # Home / topic input page
│   │   │   └── ResearchPage.tsx   # Live pipeline + report view
│   │   └── components/
│   │       ├── PipelineSidebar.tsx # Agent status sidebar
│   │       └── ReportViewer.tsx    # Markdown report renderer
│   ├── package.json
│   └── vite.config.ts
├── render.yaml                    # Render deployment config
└── README.md
```

---

## Environment Variables

### LLM Provider — choose one

The app auto-detects which provider to use:
1. `LLM_PROVIDER` env var (explicit override)
2. `OPENAI_API_KEY` present → OpenAI
3. `HF_TOKEN` present → HuggingFace

**Option A — OpenAI**

```env
OPENAI_API_KEY=sk-...
OPENAI_MODEL=gpt-4o          # optional, default: gpt-4o
```

**Option B — HuggingFace Inference API**

```env
HF_TOKEN=hf_...
HF_MODEL=meta-llama/Meta-Llama-3.1-70B-Instruct   # optional, this is the default
```

### Search APIs (backend)

```env
EXA_API_KEY=your_exa_key_here        # required — get free key at exa.ai
TAVILY_API_KEY=your_tavily_key_here  # optional — fallback search at tavily.com
```

### Shared settings

```env
LLM_TEMPERATURE=0.3
OUTPUT_FILE=research_report.md       # CLI mode only
```

### Frontend

```env
VITE_API_URL=https://your-backend.onrender.com/api   # production only
# Leave unset in dev — Vite proxy handles /api → localhost:8000
```

---

## Render Deployment

> **Quick reference** — full config is in `render.yaml`.

### Backend (Python web service)

| Setting | Value |
|---|---|
| Runtime | Python |
| Root directory | `backend` |
| Build command | `pip install -r requirements.txt` |
| Start command | `uvicorn app:app --host 0.0.0.0 --port $PORT` |
| Health check path | `/api/research` |

**Environment variables to set in the Render dashboard:**

```
OPENAI_API_KEY     or     HF_TOKEN
EXA_API_KEY
TAVILY_API_KEY            (optional)
HF_MODEL                  (if using HuggingFace)
LLM_TEMPERATURE    0.3
ALLOWED_ORIGINS    https://your-frontend.onrender.com
```

### Frontend (Static site)

| Setting | Value |
|---|---|
| Runtime | Static |
| Root directory | `frontend` |
| Build command | `npm install && npm run build` |
| Publish path | `./dist` |

**Environment variables to set in the Render dashboard:**

```
VITE_API_URL       https://your-backend.onrender.com/api
```

> Set `ALLOWED_ORIGINS` on the backend **after** the frontend URL is known, then redeploy the backend.

---

## Token Safety

The system enforces strict limits at every layer:

| Layer | Limit | Mechanism |
|---|---|---|
| Document download | 10 MB | Streaming cap in `pdf_extractor.py` |
| Extracted text per source | 3 000 chars | Hard truncation in tools |
| Text chunks | 800 tokens | `chunk_text()` in `text_chunker.py` |
| Evidence per source | 300 tokens | Agent instruction + task constraint |
| LLM calls | Retried on 429 | `tenacity` exponential backoff |

---

## Output Format

```markdown
# Research Summary: <Topic>

## Key Insights

1. **<Headline>**
   <Supporting evidence, 2–4 sentences.>
   *Source: [1]*

## Methodology Overview
<Concise description drawn from extracted methodology snippets.>

## Benchmarks & Metrics
| Metric | Value | Source |
|--------|-------|--------|
| ...    | ...   | [1]    |

## Sources

[1] <Title>
    <URL>
```

---

## Extending the System

| Goal | Where to change |
|---|---|
| Add a new search backend | `tools/search_tool.py` — create a new `BaseTool` subclass |
| Change number of top sources | `tasks/validation_task.py` — update the "keep TOP N" instruction |
| Support local LLMs (Ollama) | `main.py` `_build_llm()` — swap `LLM(model="ollama/...")` |
| Add memory across sessions | `main.py` Crew constructor — set `memory=True` and configure a vector store |
| Export to PDF | Post-process `research_report.md` with `pandoc` or `weasyprint` |
| Add a new agent | Create agent + task files, wire into `main.py` pipeline |

---

## Requirements

- Python ≥ 3.10
- Node.js ≥ 18
- OpenAI API key **or** HuggingFace token
- Exa API key (free tier at [exa.ai](https://exa.ai))
- Tavily API key (optional, free tier at [tavily.com](https://tavily.com))