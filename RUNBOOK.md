# PM Standards Agentic RAG — Live Demo Runbook

## Prerequisites
- Python 3.10+
- Node.js 18+
- OpenAI API key

---

## First-Time Setup

### 1. Clone & enter the project
```bash
cd pmpedia
```

### 2. Backend — create virtual environment & install dependencies
```bash
cd backend
python -m venv venv
source venv/bin/activate          # Windows: venv\Scripts\activate
pip install -r requirements.txt
```

### 3. Configure environment
```bash
cp .env.example .env
# Open .env and add your OpenAI key:
# OPENAI_API_KEY=sk-...
```

### 4. Ingest documents into the vector store *(run once)*
```bash
python -m app.ingestion.ingest
```
Expected output:
```
[3/5] Loading and chunking documents...
  PMBOK7:    255 sections → ~900 chunks
  PRINCE2:   ~600 chunks
  ISO 21502: ~650 chunks
Total chunks: 2149
```

### 5. Frontend — install dependencies
```bash
cd ../frontend
npm install
```

---

## Running the Project

### Terminal 1 — Start the backend
```bash
cd backend
source venv/bin/activate
uvicorn app.main:app --host 0.0.0.0 --port 8001 --reload
```
Wait for:
```
LLM: gpt-4o-mini (OpenAI) ✓
Vector store: 2149 chunks
Ready → http://0.0.0.0:8000
```

### Terminal 2 — Start the frontend
```bash
cd frontend
npm run dev
```
Opens at: **http://localhost:5173**

---

## Verify Everything is Working

```bash
curl http://localhost:8000/api/health
```
Expected:
```json
{
  "status": "ok",
  "chunks_loaded": 2149,
  "standards_available": ["ISO 21502", "PMBOK7", "PRINCE2"]
}
```

---

## Demo Script (for interview)

### Search Page — show per-standard results
Try these search terms:
- `risk management`
- `stakeholder engagement`
- `project governance`
- `change control`

Each column (PMBOK7 / PRINCE2 / ISO 21502) shows its own top results independently.

---

### Chat Page — show agentic RAG in action

**Comparison query** *(triggers multi-standard routing + comparison table)*
```
Compare how PMBOK7, PRINCE2, and ISO 21502 handle risk management
```

**Definition query** *(triggers per-standard explanation)*
```
What is project governance and how do all three standards define it?
```

**Recommendation query** *(triggers evidence-based recommendation)*
```
Which standard is best for a construction project?
```

**Topic mapping** *(triggers cross-standard terminology mapping)*
```
Map stakeholder engagement across all three standards
```

**Source lookup** *(triggers section finder)*
```
Where does PRINCE2 discuss change control?
```

**Gap analysis** *(triggers coverage gap detection)*
```
Does ISO 21502 cover earned value management?
```

---

### What to point out during the demo

1. **Agent trace** — expand it to show the 8-step reasoning pipeline
2. **Coverage badge** — green = all standards retrieved, amber/red = corrective RAG fired
3. **Standard badges** — shows which standards were searched for that query
4. **Sources panel** — each source has section title, relevance score, and direct link
5. **Search columns** — 3 parallel API calls, balanced results per standard

---

## API Endpoints (for technical questions)

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/health` | System status, chunk count, available standards |
| POST | `/api/search` | Semantic search with standard filtering |
| POST | `/api/agent/query` | Full 8-step agentic RAG pipeline |

### Example: direct agent API call
```bash
curl -X POST http://localhost:8000/api/agent/query \
  -H "Content-Type: application/json" \
  -d '{
    "question": "Compare risk management across all three standards",
    "top_k": 5,
    "show_trace": true
  }'
```

---

## Project Structure
```
pmpedia/
├── input/                        # Source documents
│   ├── pmbok7.md
│   ├── prince2.md
│   └── iso21502.md
├── backend/
│   ├── .env                      # API keys & config
│   ├── requirements.txt
│   └── app/
│       ├── main.py               # FastAPI app + startup
│       ├── config.py             # Settings
│       ├── ingestion/            # MD loader → chunker → embedder
│       ├── retrieval/            # ChromaDB + sentence-transformers
│       ├── agent/                # 8-step agentic pipeline
│       │   ├── agentic_rag.py    # Orchestrator
│       │   ├── intent_classifier.py
│       │   ├── standard_router.py
│       │   ├── query_generator.py
│       │   ├── coverage_checker.py
│       │   ├── query_rewriter.py
│       │   ├── answer_generator.py
│       │   └── llm_service.py    # OpenAI GPT-4o-mini
│       ├── api/                  # REST routes
│       └── models/               # Pydantic schemas
└── frontend/
    ├── package.json
    └── src/
        ├── App.jsx               # Page router
        ├── pages/
        │   ├── SearchPage.jsx    # 3-column search
        │   └── ChatPage.jsx      # Chat interface
        ├── components/Nav.jsx
        └── api/client.js         # API calls
```

---

## Troubleshooting

| Issue | Fix |
|-------|-----|
| `Vector store empty` | Run `python -m app.ingestion.ingest` from `backend/` |
| `LLM: no OPENAI_API_KEY` | Add key to `backend/.env` — system still works with template fallback |
| `Port 8000 in use` | `pkill -f uvicorn` then restart |
| `Port 5173 in use` | `pkill -f vite` then restart |
| Tables render as raw text | Ensure `remark-gfm` is installed: `npm install remark-gfm` |
