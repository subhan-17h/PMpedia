# PM Standards Agentic RAG Assistant

An intelligent RAG (Retrieval-Augmented Generation) web application that compares, searches, and answers questions across three major project management standards:

- **PMBOK 7th Edition** — PMI's guide to the Project Management Body of Knowledge
- **PRINCE2** — Projects IN Controlled Environments methodology
- **ISO 21502:2020** — International standard for project management

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    React Frontend                        │
│  ┌──────────────┐  ┌──────────────────────────────────┐ │
│  │  Search Mode  │  │          Agent Mode              │ │
│  │  • Query      │  │  • Question → Answer             │ │
│  │  • Filters    │  │  • Coverage badge                │ │
│  │  • Results    │  │  • Source citations               │ │
│  │              │  │  • Agent trace visualization      │ │
│  └──────────────┘  └──────────────────────────────────┘ │
└────────────────────────┬────────────────────────────────┘
                         │ HTTP (Vite proxy)
┌────────────────────────▼────────────────────────────────┐
│                  FastAPI Backend                         │
│  ┌──────────┐ ┌──────────┐ ┌──────────────────────────┐│
│  │  /health │ │ /search  │ │    /agent/query           ││
│  └──────────┘ └──────────┘ └──────────┬───────────────┘│
│                                        │                │
│  ┌─────────────────────────────────────▼──────────────┐ │
│  │             Agentic RAG Orchestrator               │ │
│  │  Intent → Router → Query Gen → Retrieve →          │ │
│  │  Coverage Check → Rewrite → Answer → Trace         │ │
│  └──────────────────────┬─────────────────────────────┘ │
│                         │                               │
│  ┌──────────────────────▼─────────────────────────────┐ │
│  │              Retrieval Layer                        │ │
│  │  sentence-transformers → ChromaDB → Results         │ │
│  └─────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────┘
```

## RAG Techniques Demonstrated

| Technique | Implementation |
|-----------|---------------|
| **Agentic RAG** | Multi-step autonomous workflow with 8 agent components |
| **Router RAG** | Routes queries to relevant standards based on intent |
| **Corrective RAG** | Rewrites queries when evidence coverage is insufficient |
| **Multi-query RAG** | Generates standard-specific queries with domain vocabulary |
| **Metadata-aware RAG** | Uses section headings, standard tags, and deep links |

## Tech Stack

- **Frontend:** React 18, Vite, react-markdown
- **Backend:** Python, FastAPI, Pydantic
- **Embeddings:** sentence-transformers (`all-MiniLM-L6-v2`)
- **Vector DB:** ChromaDB (persistent, local)
- **Styling:** Custom CSS with glassmorphism dark theme

## Quick Start

### 1. Backend Setup

```bash
cd backend
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
```

### 2. Run Ingestion

This parses the PM standard documents, chunks them, generates embeddings, and stores them in ChromaDB:

```bash
cd backend
source venv/bin/activate
python -m app.ingestion.ingest
```

### 3. Start Backend Server

```bash
cd backend
source venv/bin/activate
uvicorn app.main:app --reload --port 8000
```

### 4. Start Frontend

```bash
cd frontend
npm install
npm run dev
```

Open **http://localhost:5173** in your browser.

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/health` | Health check with chunk count |
| `POST` | `/api/search` | Semantic search with standard filtering |
| `POST` | `/api/agent/query` | Full agentic RAG workflow |

### Example: Agent Query

```bash
curl -X POST http://localhost:8000/api/agent/query \
  -H "Content-Type: application/json" \
  -d '{"question": "Compare risk management across all three standards"}'
```

## Demo Questions

1. *"Compare how PMBOK7, PRINCE2, and ISO 21502 handle risk management"*
2. *"What is the role of a project sponsor in ISO 21502?"*
3. *"How does PRINCE2 define project governance?"*
4. *"Explain stakeholder engagement across all three standards"*
5. *"What quality management practices does PMBOK7 recommend?"*
6. *"Where does PRINCE2 discuss change control?"*
7. *"Compare planning approaches in all three standards"*

## Agent Workflow

```
User Question
    │
    ▼
┌─ Intent Classification ─┐  (rule-based: 7 intent types)
    │
    ▼
┌─ Standards Routing ──────┐  (detects mentioned standards)
    │
    ▼
┌─ Query Generation ───────┐  (standard-specific vocabulary)
    │
    ▼
┌─ Semantic Retrieval ─────┐  (ChromaDB cosine similarity)
    │
    ▼
┌─ Coverage Check ─────────┐  (scores, counts per standard)
    │
    ├── Sufficient? → Generate Answer
    │
    └── Insufficient? → Rewrite Queries → Re-retrieve → Generate Answer
                                                            │
                                                            ▼
                                                    Final Answer + Sources + Trace
```

## Project Structure

```
pmpedia/
├── backend/
│   ├── app/
│   │   ├── agent/         # 8 agent components
│   │   ├── api/           # FastAPI routes
│   │   ├── ingestion/     # Document loading, chunking, embedding
│   │   ├── models/        # Pydantic schemas
│   │   ├── retrieval/     # Embeddings, vector store, retriever
│   │   └── main.py        # FastAPI application
│   └── requirements.txt
├── frontend/
│   ├── src/
│   │   ├── api/           # Backend API client
│   │   ├── components/    # React components
│   │   ├── App.jsx
│   │   └── index.css      # Design system
│   └── package.json
├── input/                 # Source PM standard documents
│   ├── pmbok7.md
│   ├── prince2.md
│   └── iso21502.md
└── README.md
```

## License

This project is for educational and demonstration purposes.
