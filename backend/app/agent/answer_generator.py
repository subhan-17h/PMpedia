"""
Answer generator.
Uses LLM when available; falls back to extractive templates otherwise.
"""

from __future__ import annotations


def generate_answer(
    question: str,
    intent: str,
    results_by_standard: dict[str, list[dict]],
    coverage_is_sufficient: bool,
    llm_service=None,
) -> str:
    if not any(results_by_standard.values()):
        return (
            "I could not find enough evidence in the available PM standards "
            "content to answer this confidently."
        )

    if llm_service is not None:
        try:
            return llm_service.generate_answer(
                question=question,
                intent=intent,
                results_by_standard=results_by_standard,
                coverage_is_sufficient=coverage_is_sufficient,
            )
        except Exception as exc:
            # Fall through to template on any LLM error
            print(f"  [LLM] generation failed ({exc}), using template fallback")

    return _template_answer(question, intent, results_by_standard, coverage_is_sufficient)


# ── Template fallback (no LLM) ──────────────────────────────────────────────

def _template_answer(
    question: str,
    intent: str,
    results_by_standard: dict[str, list[dict]],
    coverage_is_sufficient: bool,
) -> str:
    if intent == "cross_standard_comparison":
        return _comparison(results_by_standard, coverage_is_sufficient)
    if intent == "definition_or_explanation":
        return _definition(results_by_standard)
    if intent == "source_lookup":
        return _source_lookup(results_by_standard)
    if intent == "recommendation":
        return _recommendation(results_by_standard, coverage_is_sufficient)
    return _general(results_by_standard, coverage_is_sufficient)


def _comparison(results_by_standard, sufficient):
    stds = [s for s, r in results_by_standard.items() if r]
    lines = [f"## Comparison across {', '.join(stds)}\n"]
    lines += ["| Standard | Section | Key Content |",
              "|----------|---------|-------------|"]
    for std, chunks in results_by_standard.items():
        if not chunks:
            lines.append(f"| {std} | — | *No evidence found* |")
            continue
        c = chunks[0]
        lines.append(f"| {std} | {c.get('title','')} | {_trunc(c.get('text',''), 120)} |")
    lines.append("")
    for std, chunks in results_by_standard.items():
        if not chunks:
            continue
        lines.append(f"### {std}")
        for c in chunks[:3]:
            lines.append(f"**{c.get('title','')}**\n> {_trunc(c.get('text',''), 280)}\n")
    if not sufficient:
        lines.append("\n> *Evidence limited for some standards.*")
    return "\n".join(lines)


def _definition(results_by_standard):
    lines = ["## Definition\n"]
    for std, chunks in results_by_standard.items():
        if not chunks:
            continue
        c = chunks[0]
        lines.append(f"### {std} — {c.get('title','')}\n> {_trunc(c.get('text',''), 400)}\n")
    return "\n".join(lines)


def _source_lookup(results_by_standard):
    lines = ["## Relevant Sections\n"]
    for std, chunks in results_by_standard.items():
        if not chunks:
            continue
        lines.append(f"### {std}")
        for c in chunks[:5]:
            lines.append(f"- **{c.get('title','')}** ({c.get('section_id','')})")
            lines.append(f"  > {_trunc(c.get('text',''), 180)}\n")
    return "\n".join(lines)


def _recommendation(results_by_standard, sufficient):
    lines = ["## Recommendation\n"]
    if not sufficient:
        lines.append("> *Based on limited evidence.*\n")
    for std, chunks in results_by_standard.items():
        if not chunks:
            continue
        c = chunks[0]
        lines.append(f"### {std} — {c.get('title','')}\n> {_trunc(c.get('text',''), 300)}\n")
    return "\n".join(lines)


def _general(results_by_standard, sufficient):
    all_chunks = sorted(
        [c for chunks in results_by_standard.values() for c in chunks],
        key=lambda c: c.get("score", 0), reverse=True,
    )
    lines = ["## Answer\n"]
    for c in all_chunks[:5]:
        lines.append(f"### {c.get('standard','')} — {c.get('title','')}")
        lines.append(f"> {_trunc(c.get('text',''), 300)}\n")
    return "\n".join(lines)


def _trunc(text: str, n: int) -> str:
    text = text.replace("\n", " ")
    if len(text) <= n:
        return text
    cut = text[:n].rfind(" ")
    return text[:cut if cut > n * 0.6 else n] + "…"
