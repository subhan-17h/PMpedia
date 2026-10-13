"""
Configuration module for PM Standards Agentic RAG.
Loads settings from environment variables with sensible defaults.
"""

import os
from pathlib import Path
from pydantic_settings import BaseSettings
from dotenv import load_dotenv

load_dotenv()

# Resolve paths relative to the backend directory
BACKEND_DIR = Path(__file__).resolve().parent.parent
PROJECT_ROOT = BACKEND_DIR.parent


class Settings(BaseSettings):
    """Application settings loaded from environment variables."""

    # Embedding
    embedding_model: str = "all-MiniLM-L6-v2"

    # Vector store
    chroma_persist_dir: str = str(BACKEND_DIR / "app" / "data" / "vector_store")

    # Source documents
    sources_dir: str = str(PROJECT_ROOT / "input")

    # LLM
    openai_api_key: str = ""
    gemini_api_key: str = ""
    llm_model: str = "gpt-4o-mini"

    # Server
    host: str = "0.0.0.0"
    port: int = 8000

    # Retrieval defaults
    default_top_k: int = 5
    chunk_size: int = 600
    chunk_overlap: int = 100
    relevance_threshold: float = 0.45

    # Standards configuration
    standards: dict = {
        "PMBOK7": {
            "source_file": "pmbok7.md",
            "display_name": "PMBOK 7th Edition",
        },
        "PRINCE2": {
            "source_file": "prince2.md",
            "display_name": "PRINCE2",
        },
        "ISO 21502": {
            "source_file": "iso21502.md",
            "display_name": "ISO 21502:2020",
        },
    }

    @property
    def has_llm(self) -> bool:
        """Check if any LLM API key is configured."""
        return bool(self.openai_api_key or self.gemini_api_key)

    class Config:
        env_file = ".env"
        extra = "ignore"


settings = Settings()
