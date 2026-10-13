"""
Query rewriter.
Uses LLM when available for intelligent query rewriting; falls back to synonym expansion.
"""

from __future__ import annotations
from app.agent.query_generator import generate_rewrite_queries


def rewrite_queries(
    original_question: str,
    weak_standards: list[str],
    missing_standards: list[str],
    attempt: int = 1,
    llm_service=None,
) -> dict[str, str]:
    standards_to_rewrite = list(set(missing_standards + weak_standards))
    rewritten: dict[str, str] = {}

    for std in standards_to_rewrite:
        if llm_service is not None:
            try:
                failed_query = generate_rewrite_queries(original_question, std, attempt)
                rewritten[std] = llm_service.rewrite_query(
                    question=original_question,
                    standard=std,
                    failed_query=failed_query,
                )
                continue
            except Exception as exc:
                print(f"  [LLM] query rewrite failed for {std} ({exc}), using fallback")

        rewritten[std] = generate_rewrite_queries(
            original_query=original_question,
            standard=std,
            attempt=attempt,
        )

    return rewritten
