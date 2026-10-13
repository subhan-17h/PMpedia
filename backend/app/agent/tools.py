"""
Agent tools.
Defines tool functions used by the agentic RAG workflow.
These wrap the retrieval layer for use in the agent orchestrator.
"""

from __future__ import annotations
from app.retrieval.retriever import Retriever


class AgentTools:
    """Collection of tools available to the agent."""

    def __init__(self, retriever: Retriever):
        self.retriever = retriever

    def search_standard(self, standard: str, query: str, top_k: int = 5) -> list[dict]:
        """Search within a specific PM standard."""
        return self.retriever.search_standard(standard, query, top_k)

    def search_all_standards(self, query: str, top_k: int = 5) -> list[dict]:
        """Search across all PM standards."""
        return self.retriever.search_all_standards(query, top_k)

    def get_chunk(self, chunk_id: str) -> dict | None:
        """Retrieve a specific chunk by its ID."""
        return self.retriever.get_chunk(chunk_id)

    def get_deep_link(self, standard: str, section_id: str) -> str:
        """Generate a deep link to a specific section."""
        return self.retriever.get_deep_link(standard, section_id)

    def compare_topic(self, topic: str, top_k: int = 3) -> dict[str, list[dict]]:
        """
        Compare a topic across all standards.
        Returns results grouped by standard.
        """
        from app.agent.query_generator import generate_queries
        from app.agent.standard_router import ALL_STANDARDS

        queries = generate_queries(topic, ALL_STANDARDS)
        return self.retriever.search_per_standard(ALL_STANDARDS, queries, top_k)
