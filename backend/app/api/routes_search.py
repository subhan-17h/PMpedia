"""
Semantic search endpoint.
"""

from fastapi import APIRouter, HTTPException
from app.models.schemas import SearchRequest, SearchResponse, SourceResult

router = APIRouter()


@router.post("/search", response_model=SearchResponse)
async def search(request: SearchRequest):
    """Semantic search across PM standards."""
    from app.main import get_retriever

    retriever = get_retriever()
    if retriever is None:
        raise HTTPException(
            status_code=503,
            detail="Vector store not initialized. Run ingestion first.",
        )

    # Search across requested standards
    if len(request.standards) == 3:
        results = retriever.search_all_standards(request.query, request.top_k)
    else:
        results = retriever.search_standards(
            request.standards, request.query, request.top_k
        )

    source_results = [
        SourceResult(
            standard=r.get("standard", ""),
            chunk_id=r.get("chunk_id", ""),
            section_id=r.get("section_id", ""),
            title=r.get("title", ""),
            text=r.get("text", "")[:500],
            score=r.get("score", 0),
            deep_link=r.get("deep_link", ""),
        )
        for r in results
    ]

    return SearchResponse(results=source_results)
