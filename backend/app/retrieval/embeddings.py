"""
Embedding service.
Provides text embedding using sentence-transformers (local) or OpenAI (optional).
"""

from __future__ import annotations
from typing import Optional
import numpy as np


class EmbeddingService:
    """
    Generates text embeddings using sentence-transformers locally.
    Falls back to OpenAI embeddings if configured.
    """

    def __init__(self, model_name: str = "all-MiniLM-L6-v2", openai_key: str = ""):
        self.model_name = model_name
        self.openai_key = openai_key
        self._model = None
        # Always use local embeddings for retrieval — the vector store was indexed
        # with sentence-transformers (384d). OpenAI embeddings (1536d) would
        # produce a dimension mismatch. The openai_key is kept for the LLM service.
        self._mode = "local"
        self._load_local_model()

    def _load_local_model(self):
        """Load the sentence-transformers model."""
        from sentence_transformers import SentenceTransformer
        self._model = SentenceTransformer(self.model_name)

    def embed(self, text: str) -> list[float]:
        """Embed a single text string."""
        return self.embed_batch([text])[0]

    def embed_batch(self, texts: list[str], batch_size: int = 64) -> list[list[float]]:
        """
        Embed a batch of texts.

        Args:
            texts: List of strings to embed.
            batch_size: Batch size for local model processing.

        Returns:
            List of embedding vectors.
        """
        if self._mode == "openai":
            return self._embed_openai(texts)
        else:
            return self._embed_local(texts, batch_size)

    def _embed_local(self, texts: list[str], batch_size: int) -> list[list[float]]:
        """Embed using sentence-transformers."""
        embeddings = self._model.encode(
            texts,
            batch_size=batch_size,
            show_progress_bar=len(texts) > 100,
            normalize_embeddings=True,
        )
        return embeddings.tolist()

    def _embed_openai(self, texts: list[str]) -> list[list[float]]:
        """Embed using OpenAI API."""
        from openai import OpenAI
        client = OpenAI(api_key=self.openai_key)

        # OpenAI has a limit per request, batch if needed
        all_embeddings = []
        for i in range(0, len(texts), 100):
            batch = texts[i:i + 100]
            response = client.embeddings.create(
                model="text-embedding-3-small",
                input=batch,
            )
            batch_embeddings = [item.embedding for item in response.data]
            all_embeddings.extend(batch_embeddings)

        return all_embeddings
