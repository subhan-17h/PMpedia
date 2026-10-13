"""
ChromaDB vector store wrapper.
Provides persistent storage and retrieval of embedded text chunks.
"""

from __future__ import annotations
from pathlib import Path
import chromadb


COLLECTION_NAME = "pm_standards"


class VectorStore:
    """
    Wrapper around ChromaDB for storing and querying PM standard chunks.
    Uses a single collection with metadata filtering for per-standard queries.
    """

    def __init__(self, persist_dir: str = "app/data/vector_store"):
        self.persist_dir = persist_dir
        Path(persist_dir).mkdir(parents=True, exist_ok=True)

        self._client = chromadb.PersistentClient(path=persist_dir)
        self._collection = self._client.get_or_create_collection(
            name=COLLECTION_NAME,
            metadata={"hnsw:space": "cosine"},
        )

    @property
    def count(self) -> int:
        """Number of chunks stored."""
        return self._collection.count()

    def reset(self):
        """Delete and recreate the collection."""
        try:
            self._client.delete_collection(COLLECTION_NAME)
        except Exception:
            pass
        self._collection = self._client.get_or_create_collection(
            name=COLLECTION_NAME,
            metadata={"hnsw:space": "cosine"},
        )

    def add_chunks(
        self,
        ids: list[str],
        embeddings: list[list[float]],
        metadatas: list[dict],
        documents: list[str],
    ):
        """Add chunks with embeddings and metadata to the store."""
        # ChromaDB has a batch limit, process in chunks
        batch_size = 500
        for i in range(0, len(ids), batch_size):
            end = min(i + batch_size, len(ids))
            self._collection.add(
                ids=ids[i:end],
                embeddings=embeddings[i:end],
                metadatas=metadatas[i:end],
                documents=documents[i:end],
            )

    def search(
        self,
        query_embedding: list[float],
        top_k: int = 5,
        standard: str | None = None,
        standards: list[str] | None = None,
    ) -> list[dict]:
        """
        Search for similar chunks.

        Args:
            query_embedding: Query vector.
            top_k: Number of results.
            standard: Filter to a single standard.
            standards: Filter to multiple standards.

        Returns:
            List of result dicts with text, metadata, and score.
        """
        where_filter = None
        if standard:
            where_filter = {"standard": standard}
        elif standards and len(standards) < 3:
            where_filter = {"standard": {"$in": standards}}

        results = self._collection.query(
            query_embeddings=[query_embedding],
            n_results=top_k,
            where=where_filter,
            include=["documents", "metadatas", "distances"],
        )

        # Convert to list of dicts
        output = []
        if results["ids"] and results["ids"][0]:
            for i, chunk_id in enumerate(results["ids"][0]):
                # ChromaDB returns cosine distance; convert to similarity
                distance = results["distances"][0][i] if results["distances"] else 0
                similarity = 1.0 - distance  # cosine distance → similarity

                metadata = results["metadatas"][0][i] if results["metadatas"] else {}
                document = results["documents"][0][i] if results["documents"] else ""

                output.append({
                    "chunk_id": chunk_id,
                    "text": document,
                    "score": round(similarity, 4),
                    **metadata,
                })

        return output

    def get_chunk(self, chunk_id: str) -> dict | None:
        """Retrieve a specific chunk by ID."""
        try:
            result = self._collection.get(
                ids=[chunk_id],
                include=["documents", "metadatas"],
            )
            if result["ids"]:
                return {
                    "chunk_id": result["ids"][0],
                    "text": result["documents"][0] if result["documents"] else "",
                    **(result["metadatas"][0] if result["metadatas"] else {}),
                }
        except Exception:
            pass
        return None

    def get_standards(self) -> list[str]:
        """Get list of standards that have chunks in the store."""
        try:
            total = self.count
            standards: set[str] = set()
            batch = 500
            offset = 0
            while offset < total:
                result = self._collection.get(
                    limit=batch,
                    offset=offset,
                    include=["metadatas"],
                )
                if result["metadatas"]:
                    for m in result["metadatas"]:
                        s = m.get("standard", "")
                        if s:
                            standards.add(s)
                offset += batch
            return sorted(standards)
        except Exception:
            pass
        return []
