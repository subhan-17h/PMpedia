"""
Text chunking module.
Splits section content into overlapping chunks suitable for embedding and retrieval.
"""

from __future__ import annotations
from dataclasses import dataclass


@dataclass
class Chunk:
    """A text chunk with position metadata."""
    text: str
    chunk_index: int
    char_start: int
    char_end: int


def chunk_text(
    text: str,
    chunk_size: int = 600,
    chunk_overlap: int = 100,
) -> list[Chunk]:
    """
    Split text into overlapping chunks by paragraph boundaries.

    Strategy:
    1. Split by paragraphs (double newline).
    2. Accumulate paragraphs until chunk_size is reached.
    3. Create chunk and slide window back by overlap amount.

    This preserves paragraph integrity when possible.
    """
    if not text or not text.strip():
        return []

    # Split into paragraphs
    paragraphs = [p.strip() for p in text.split("\n\n") if p.strip()]

    if not paragraphs:
        return []

    chunks: list[Chunk] = []
    current_text = ""
    current_start = 0
    char_pos = 0
    chunk_idx = 0

    for para in paragraphs:
        if current_text and len(current_text) + len(para) + 2 > chunk_size:
            # Save current chunk
            chunks.append(Chunk(
                text=current_text.strip(),
                chunk_index=chunk_idx,
                char_start=current_start,
                char_end=current_start + len(current_text),
            ))
            chunk_idx += 1

            # Create overlap: keep the tail of current text
            if chunk_overlap > 0 and len(current_text) > chunk_overlap:
                # Find a paragraph boundary within the overlap zone
                overlap_text = current_text[-chunk_overlap:]
                # Try to start at a sentence or paragraph boundary
                newline_pos = overlap_text.find("\n")
                if newline_pos > 0:
                    overlap_text = overlap_text[newline_pos:].strip()
                current_text = overlap_text + "\n\n" + para
                current_start = char_pos - len(overlap_text)
            else:
                current_text = para
                current_start = char_pos
        else:
            if current_text:
                current_text += "\n\n" + para
            else:
                current_text = para
                current_start = char_pos

        char_pos += len(para) + 2  # +2 for \n\n

    # Don't forget the last chunk
    if current_text.strip():
        chunks.append(Chunk(
            text=current_text.strip(),
            chunk_index=chunk_idx,
            char_start=current_start,
            char_end=current_start + len(current_text),
        ))

    return chunks


def chunk_section(
    section: dict,
    chunk_size: int = 600,
    chunk_overlap: int = 100,
) -> list[dict]:
    """
    Chunk a section dict and return chunk dicts with full metadata.

    Each chunk inherits the section's metadata (standard, section_id, title)
    and adds chunk-specific fields (chunk_id, chunk_index).
    """
    content = section.get("content", "")
    if not content:
        return []

    text_chunks = chunk_text(content, chunk_size, chunk_overlap)
    result = []

    standard = section.get("standard", "")
    section_id = section.get("section_id", "")
    std_prefix = standard.lower().replace(" ", "")

    for chunk in text_chunks:
        chunk_id = f"{std_prefix}_{section_id}_c{chunk.chunk_index}"

        result.append({
            "chunk_id": chunk_id,
            "standard": standard,
            "source_file": section.get("source_file", ""),
            "section_id": section_id,
            "title": section.get("title", ""),
            "text": chunk.text,
            "deep_link": f"/docs/{section.get('source_file', '')}#{section_id}",
            "chunk_index": chunk.chunk_index,
        })

    return result
