"""
Pydantic schemas for API request/response models.
Defines the data contracts for the PM Standards Agentic RAG API.
"""

from __future__ import annotations
from typing import Optional
from pydantic import BaseModel, Field


# ── Shared Models ──────────────────────────────────────────────────────────────

class ChunkMetadata(BaseModel):
    """Metadata attached to each text chunk in the vector store."""
    chunk_id: str
    standard: str
    source_file: str
    section_id: str = ""
    title: str = ""
    text: str = ""
    deep_link: str = ""


class SourceResult(BaseModel):
    """A single retrieval result with score and metadata."""
    standard: str
    chunk_id: str
    section_id: str = ""
    title: str = ""
    page: int | None = None
    text: str = ""
    score: float = 0.0
    deep_link: str = ""


# ── Search Endpoint ────────────────────────────────────────────────────────────

class SearchRequest(BaseModel):
    """Request body for POST /api/search."""
    query: str
    standards: list[str] = Field(
        default=["PMBOK7", "PRINCE2", "ISO 21502"],
        description="Which standards to search",
    )
    top_k: int = Field(default=5, ge=1, le=20)


class SearchResponse(BaseModel):
    """Response body for POST /api/search."""
    results: list[SourceResult]


# ── Agent Endpoint ─────────────────────────────────────────────────────────────

class CoverageResult(BaseModel):
    """Evidence coverage assessment from the coverage checker."""
    is_sufficient: bool = True
    missing_standards: list[str] = Field(default_factory=list)
    weak_standards: list[str] = Field(default_factory=list)
    reason: str = ""


class AgentRequest(BaseModel):
    """Request body for POST /api/agent/query."""
    question: str = Field(..., min_length=1, max_length=2000)
    top_k: int = Field(default=5, ge=1, le=20)
    show_trace: bool = True


class AgentResponse(BaseModel):
    """Response body for POST /api/agent/query."""
    answer: str
    intent: str
    required_standards: list[str]
    sources: list[SourceResult]
    trace: list[str] = Field(default_factory=list)
    coverage: CoverageResult = Field(default_factory=CoverageResult)


# ── Health Endpoint ────────────────────────────────────────────────────────────

class HealthResponse(BaseModel):
    """Response body for GET /api/health."""
    status: str = "ok"
    chunks_loaded: int = 0
    standards_available: list[str] = Field(default_factory=list)
