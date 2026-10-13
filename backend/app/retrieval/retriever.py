"""
High-level retrieval interface.
Provides semantic search methods used by both the search API and agent tools.
"""

from __future__ import annotations
from app.retrieval.embeddings import EmbeddingService
from app.retrieval.vector_store import VectorStore
from app.config import settings


class Retriever:
    """
    Semantic retrieval interface that combines embedding + vector store.
    Used by both the search API endpoint and agent tools.
    """

    def __init__(
        self,
        embedding_service: EmbeddingService,
        vector_store: VectorStore,
    ):
        self.embedding_service = embedding_service
        self.vector_store = vector_store

    def search_standard(
        self,
        standard: str,
        query: str,
        top_k: int = 5,
    ) -> list[dict]:
        """Search within a specific standard."""
        query_embedding = self.embedding_service.embed(query)
        return self.vector_store.search(
            query_embedding=query_embedding,
            top_k=top_k,
            standard=standard,
        )

    def search_all_standards(
        self,
        query: str,
        top_k: int = 5,
    ) -> list[dict]:
        """Search across all standards."""
        query_embedding = self.embedding_service.embed(query)
        return self.vector_store.search(
            query_embedding=query_embedding,
            top_k=top_k,
        )

    def search_standards(
        self,
        standards: list[str],
        query: str,
        top_k: int = 5,
    ) -> list[dict]:
        """Search across specified standards."""
        query_embedding = self.embedding_service.embed(query)
        return self.vector_store.search(
            query_embedding=query_embedding,
            top_k=top_k,
            standards=standards,
        )

    def search_per_standard(
        self,
        standards: list[str],
        queries: dict[str, str],
        top_k: int = 5,
    ) -> dict[str, list[dict]]:
        """
        Search each standard with its own optimized query.

        Args:
            standards: List of standard keys to search.
            queries: Dict mapping standard → query text.
            top_k: Results per standard.

        Returns:
            Dict mapping standard → list of results.
        """
        results = {}
        for std in standards:
            query = queries.get(std, list(queries.values())[0] if queries else "")
            results[std] = self.search_standard(std, query, top_k)
        return results

    def get_chunk(self, chunk_id: str) -> dict | None:
        """Get a specific chunk by ID."""
        return self.vector_store.get_chunk(chunk_id)

    def get_deep_link(self, standard: str, section_id: str) -> str:
        """Generate a deep link to a section."""
        std_config = settings.standards.get(standard, {})
        source_file = std_config.get("source_file", "")
        return f"/docs/{source_file}#{section_id}"
