"""
Coverage / sufficiency checker.
Evaluates whether retrieved evidence is sufficient to answer the question.
"""

from __future__ import annotations
from app.models.schemas import CoverageResult
from app.config import settings


def check_coverage(
    results_by_standard: dict[str, list[dict]],
    required_standards: list[str],
    intent: str = "",
    min_chunks: int = 1,
    min_score: float | None = None,
) -> CoverageResult:
    """
    Check whether retrieved evidence is sufficient.

    Checks:
    1. Did we get results for every required standard?
    2. Are similarity scores above the threshold?
    3. For comparisons, do we have at least one chunk per standard?

    Args:
        results_by_standard: Dict of standard → list of result dicts.
        required_standards: Standards we need evidence from.
        intent: Question intent (comparison needs all standards covered).
        min_chunks: Minimum chunks needed per standard.
        min_score: Minimum similarity score threshold.

    Returns:
        CoverageResult with sufficiency assessment.
    """
    if min_score is None:
        min_score = settings.relevance_threshold

    missing_standards = []
    weak_standards = []
    reasons = []

    for std in required_standards:
        chunks = results_by_standard.get(std, [])

        if not chunks:
            missing_standards.append(std)
            reasons.append(f"No results found for {std}")
            continue

        # Check if we have enough chunks
        if len(chunks) < min_chunks:
            weak_standards.append(std)
            reasons.append(f"Only {len(chunks)} chunk(s) found for {std} (need {min_chunks})")
            continue

        # Check score quality
        top_score = max(c.get("score", 0) for c in chunks)
        avg_score = sum(c.get("score", 0) for c in chunks) / len(chunks)

        if top_score < min_score:
            weak_standards.append(std)
            reasons.append(
                f"{std} top score {top_score:.2f} below threshold {min_score:.2f}"
            )
        elif avg_score < min_score * 0.7:
            weak_standards.append(std)
            reasons.append(
                f"{std} average score {avg_score:.2f} is weak"
            )

    is_sufficient = len(missing_standards) == 0 and len(weak_standards) == 0

    if is_sufficient:
        reason = "Relevant evidence found for all selected standards."
    else:
        reason = " | ".join(reasons)

    return CoverageResult(
        is_sufficient=is_sufficient,
        missing_standards=missing_standards,
        weak_standards=weak_standards,
        reason=reason,
    )
