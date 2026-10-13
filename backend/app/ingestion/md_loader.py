"""
Markdown document loader.
Parses markdown files and extracts structured sections with headings hierarchy.
"""

from __future__ import annotations
import re
from pathlib import Path
from dataclasses import dataclass, field


@dataclass
class Section:
    """A section extracted from a markdown document."""
    heading: str
    level: int
    section_id: str
    content: str
    line_start: int
    line_end: int


def _slugify(text: str) -> str:
    """Convert heading text to a URL-friendly slug."""
    text = text.strip().lower()
    text = re.sub(r"[^\w\s-]", "", text)
    text = re.sub(r"[\s_]+", "_", text)
    return text.strip("_")


def _make_section_id(heading: str) -> str:
    """
    Create a section ID from a heading.
    Extracts numbered sections like '3.10' from '3.10 OPTIMIZE RISK RESPONSES'
    and creates IDs like 'section_3_10'.
    """
    # Try to extract numbered section patterns (e.g., "3.10", "4.2.1", "7.5")
    num_match = re.match(r"^(\d+(?:\.\d+)*)\s", heading.strip())
    if num_match:
        num = num_match.group(1).replace(".", "_")
        return f"section_{num}"
    return _slugify(heading)


def parse_markdown(filepath: Path) -> list[Section]:
    """
    Parse a markdown file into structured sections.

    Splits on heading lines (# Level) and captures:
    - Heading text
    - Heading level (1-6)
    - Section ID derived from heading
    - Full text content under that heading
    """
    text = filepath.read_text(encoding="utf-8")
    lines = text.split("\n")

    sections: list[Section] = []
    heading_pattern = re.compile(r"^(#{1,6})\s+(.+)$")

    # Find all heading positions
    heading_positions: list[tuple[int, int, str]] = []  # (line_idx, level, heading_text)
    for i, line in enumerate(lines):
        m = heading_pattern.match(line.strip())
        if m:
            level = len(m.group(1))
            heading_text = m.group(2).strip()
            heading_positions.append((i, level, heading_text))

    if not heading_positions:
        # No headings — treat entire file as one section
        content = text.strip()
        if content:
            sections.append(Section(
                heading="Document",
                level=1,
                section_id="document",
                content=content,
                line_start=0,
                line_end=len(lines) - 1,
            ))
        return sections

    # Extract content between headings
    seen_ids: dict[str, int] = {}  # Track duplicates
    for idx, (line_idx, level, heading_text) in enumerate(heading_positions):
        # Content starts after the heading line
        content_start = line_idx + 1

        # Content ends at the next heading or end of file
        if idx + 1 < len(heading_positions):
            content_end = heading_positions[idx + 1][0]
        else:
            content_end = len(lines)

        content_lines = lines[content_start:content_end]
        content = "\n".join(content_lines).strip()

        # Skip empty sections
        if not content and not heading_text:
            continue

        section_id = _make_section_id(heading_text)

        # Disambiguate duplicate section IDs
        if section_id in seen_ids:
            seen_ids[section_id] += 1
            section_id = f"{section_id}_dup{seen_ids[section_id]}"
        else:
            seen_ids[section_id] = 1

        sections.append(Section(
            heading=heading_text,
            level=level,
            section_id=section_id,
            content=content,
            line_start=line_idx,
            line_end=content_end - 1,
        ))

    return sections


def load_standard(filepath: Path, standard_key: str) -> list[dict]:
    """
    Load a PM standard markdown file and return structured section data.

    Args:
        filepath: Path to the markdown file.
        standard_key: Standard identifier (e.g., 'PMBOK7').

    Returns:
        List of section dicts with metadata.
    """
    sections = parse_markdown(filepath)
    result = []

    for section in sections:
        # Skip image-only sections and index/reference sections
        if not section.content:
            continue

        # Clean content: remove image markdown references
        clean_content = re.sub(r"!\[.*?\]\(.*?\)", "", section.content)
        clean_content = re.sub(r"Figure \d+[-–:].*", "", clean_content)
        clean_content = re.sub(r"\n{3,}", "\n\n", clean_content).strip()

        if len(clean_content) < 20:
            continue

        result.append({
            "standard": standard_key,
            "source_file": filepath.name,
            "section_id": section.section_id,
            "title": section.heading,
            "content": clean_content,
            "line_start": section.line_start,
            "line_end": section.line_end,
        })

    return result
