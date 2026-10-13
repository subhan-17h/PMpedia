"""
PM Standards Agentic RAG — FastAPI Application
"""

from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import settings
from app.retrieval.embeddings import EmbeddingService
from app.retrieval.vector_store import VectorStore
from app.retrieval.retriever import Retriever
from app.agent.tools import AgentTools
from app.agent.agentic_rag import AgenticRAG
from app.api.routes_health import router as health_router
from app.api.routes_search import router as search_router
from app.api.routes_agent import router as agent_router

_embedding_service: EmbeddingService | None = None
_vector_store: VectorStore | None = None
_retriever: Retriever | None = None
_agent: AgenticRAG | None = None


def get_vector_store() -> VectorStore | None:
    return _vector_store

def get_retriever() -> Retriever | None:
    return _retriever

def get_agent() -> AgenticRAG | None:
    return _agent


@asynccontextmanager
async def lifespan(app: FastAPI):
    global _embedding_service, _vector_store, _retriever, _agent

    print("Starting PM Standards Agentic RAG...")

    # LLM service
    llm_service = None
    if settings.openai_api_key:
        try:
            from app.agent.llm_service import LLMService
            llm_service = LLMService(
                api_key=settings.openai_api_key,
                model=settings.llm_model,
            )
            print(f"  LLM: {settings.llm_model} (OpenAI) ✓")
        except Exception as e:
            print(f"  LLM: failed to initialize ({e}), falling back to templates")
    else:
        print("  LLM: no OPENAI_API_KEY — using template fallback")

    # Embedding service
    print("  Loading embedding model...")
    _embedding_service = EmbeddingService(
        model_name=settings.embedding_model,
        openai_key=settings.openai_api_key,
    )

    # Vector store
    print("  Connecting to vector store...")
    _vector_store = VectorStore(persist_dir=settings.chroma_persist_dir)
    chunk_count = _vector_store.count
    print(f"  Vector store: {chunk_count} chunks")
    if chunk_count == 0:
        print("  WARNING: Vector store empty — run: python -m app.ingestion.ingest")

    # Retriever + agent
    _retriever = Retriever(embedding_service=_embedding_service, vector_store=_vector_store)
    tools = AgentTools(retriever=_retriever)
    _agent = AgenticRAG(tools=tools, llm_service=llm_service)

    print(f"  Ready → http://{settings.host}:{settings.port}")
    yield
    print("Shutting down...")


app = FastAPI(
    title="PM Standards Agentic RAG",
    description="Agentic RAG for PMBOK7, PRINCE2, and ISO 21502.",
    version="1.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:3000", "*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(health_router, prefix="/api", tags=["health"])
app.include_router(search_router, prefix="/api", tags=["search"])
app.include_router(agent_router, prefix="/api", tags=["agent"])
