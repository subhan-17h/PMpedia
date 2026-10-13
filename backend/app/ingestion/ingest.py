"""
Ingestion orchestrator.
Loads all PM standard documents, chunks them, generates embeddings,
and stores everything in the ChromaDB vector database.

Usage:
    cd backend
    python -m app.ingestion.ingest
"""

from __future__ import annotations

import sys
import time
from pathlib import Path

# Add parent to path for module imports
sys.path.insert(0, str(Path(__file__).resolve().parent.parent.parent))

from app.config import settings
from app.ingestion.md_loader import load_standard
from app.ingestion.chunker import chunk_section
from app.ingestion.metadata_builder import build_chunk_metadata
from app.retrieval.embeddings import EmbeddingService
from app.retrieval.vector_store import VectorStore


def run_ingestion():
    """Run the full ingestion pipeline."""
    print("=" * 60)
    print("PM Standards Agentic RAG — Ingestion Pipeline")
    print("=" * 60)

    sources_dir = Path(settings.sources_dir)
    if not sources_dir.exists():
        print(f"ERROR: Sources directory not found: {sources_dir}")
        sys.exit(1)

    # Initialize services
    print("\n[1/5] Initializing embedding model...")
    t0 = time.time()
    embedding_service = EmbeddingService()
    print(f"       Model loaded in {time.time() - t0:.1f}s")

    print("\n[2/5] Initializing vector store...")
    vector_store = VectorStore(persist_dir=settings.chroma_persist_dir)
    vector_store.reset()  # Clear existing data for fresh ingestion
    print(f"       ChromaDB at: {settings.chroma_persist_dir}")

    # Load and chunk all standards
    all_chunks: list[dict] = []

    print("\n[3/5] Loading and chunking documents...")
    for std_key, std_config in settings.standards.items():
        filepath = sources_dir / std_config["source_file"]
        if not filepath.exists():
            print(f"  WARNING: {filepath} not found, skipping {std_key}")
            continue

        print(f"\n  Loading {std_key} from {filepath.name}...")
        sections = load_standard(filepath, std_key)
        print(f"    Extracted {len(sections)} sections")

        std_chunks = []
        for section in sections:
            chunks = chunk_section(
                section,
                chunk_size=settings.chunk_size,
                chunk_overlap=settings.chunk_overlap,
            )
            std_chunks.extend(chunks)

        print(f"    Created {len(std_chunks)} chunks")
        all_chunks.extend(std_chunks)

    if not all_chunks:
        print("\nERROR: No chunks created. Check source files.")
        sys.exit(1)

    print(f"\n  Total chunks across all standards: {len(all_chunks)}")

    # Generate embeddings
    print("\n[4/5] Generating embeddings...")
    t0 = time.time()
    texts = [c["text"] for c in all_chunks]
    embeddings = embedding_service.embed_batch(texts)
    print(f"       Generated {len(embeddings)} embeddings in {time.time() - t0:.1f}s")

    # Store in vector database
    print("\n[5/5] Storing in vector database...")
    t0 = time.time()

    ids = [c["chunk_id"] for c in all_chunks]
    metadatas = [build_chunk_metadata(c) for c in all_chunks]
    documents = [c["text"] for c in all_chunks]

    vector_store.add_chunks(
        ids=ids,
        embeddings=embeddings,
        metadatas=metadatas,
        documents=documents,
    )

    print(f"       Stored {len(ids)} chunks in {time.time() - t0:.1f}s")

    # Summary
    print("\n" + "=" * 60)
    print("Ingestion complete!")
    print("=" * 60)

    # Print per-standard stats
    for std_key in settings.standards:
        count = sum(1 for c in all_chunks if c["standard"] == std_key)
        print(f"  {std_key}: {count} chunks")

    print(f"\n  Vector store: {settings.chroma_persist_dir}")
    print(f"  Total chunks: {len(all_chunks)}")


if __name__ == "__main__":
    run_ingestion()
