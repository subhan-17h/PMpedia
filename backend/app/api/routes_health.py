"""
Health check endpoint.
"""

from fastapi import APIRouter
from app.models.schemas import HealthResponse

router = APIRouter()


@router.get("/health", response_model=HealthResponse)
async def health_check():
    """Health check returning status and vector store info."""
    from app.main import get_vector_store

    vs = get_vector_store()
    count = vs.count if vs else 0
    standards = vs.get_standards() if vs else []

    return HealthResponse(
        status="ok",
        chunks_loaded=count,
        standards_available=standards,
    )
