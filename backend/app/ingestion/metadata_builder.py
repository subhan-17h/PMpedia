"""
Metadata builder for chunks.
Enriches chunk metadata with additional fields for retrieval and citation.
"""

from __future__ import annotations


def build_chunk_metadata(chunk: dict) -> dict:
    """
    Build the final metadata dict for a chunk to be stored in the vector database.

    Ensures all required fields are present and properly formatted.
    """
    standard = chunk.get("standard", "UNKNOWN")
    section_id = chunk.get("section_id", "")
    source_file = chunk.get("source_file", "")
    title = chunk.get("title", "")

    # Build a deep link to the section
    deep_link = f"/docs/{source_file}#{section_id}" if section_id else f"/docs/{source_file}"

    return {
        "chunk_id": chunk.get("chunk_id", ""),
        "standard": standard,
        "source_file": source_file,
        "section_id": section_id,
        "title": title,
        "deep_link": deep_link,
    }


def build_display_title(chunk: dict) -> str:
    """Build a human-readable title for display in search results."""
    standard = chunk.get("standard", "")
    title = chunk.get("title", "")
    section_id = chunk.get("section_id", "")

    if title:
        return f"{standard} — {title}"
    elif section_id:
        return f"{standard} — {section_id}"
    else:
        return standard
