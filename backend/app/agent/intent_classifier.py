"""
Rule-based intent classifier.
Classifies user questions into intent categories to guide the agent workflow.
"""

from __future__ import annotations
import re

# Intent types
INTENT_SINGLE_STANDARD = "single_standard_question"
INTENT_CROSS_COMPARISON = "cross_standard_comparison"
INTENT_TOPIC_MAPPING = "topic_mapping"
INTENT_RECOMMENDATION = "recommendation"
INTENT_GAP_ANALYSIS = "gap_analysis"
INTENT_DEFINITION = "definition_or_explanation"
INTENT_SOURCE_LOOKUP = "source_lookup"


# Pattern definitions for each intent
_COMPARISON_PATTERNS = [
    r"\bcompar[ei]",
    r"\bdifference[s]?\b",
    r"\bdiffer\b",
    r"\bvs\.?\b",
    r"\bversus\b",
    r"\bcontrast\b",
    r"\bhow do .+ (and|,) .+ (handle|approach|address|manage|define|treat)",
    r"\bacross.*(standard|all|three)",
    r"\b(all three|all 3|between.*(standard|pmbok|prince|iso))",
    r"\bsimilarit",
]

_DEFINITION_PATTERNS = [
    r"\bwhat is\b",
    r"\bwhat are\b",
    r"\bdefin[ei]",
    r"\bexplain\b",
    r"\bmeaning of\b",
    r"\bdescribe\b",
    r"\bwhat does .+ mean\b",
]

_SOURCE_LOOKUP_PATTERNS = [
    r"\bwhere does\b",
    r"\bwhere do\b",
    r"\bwhere is\b",
    r"\bwhere are\b",
    r"\bin which (section|chapter|part|clause)\b",
    r"\bfind .+ in\b",
    r"\blocate\b",
    r"\bwhich (section|chapter|part|clause)\b",
]

_RECOMMENDATION_PATTERNS = [
    r"\bwhich (standard|one|framework) (is|would be) (best|better|most suitable|recommended)\b",
    r"\bwhich .+ should (i|we) use\b",
    r"\brecommend\b",
    r"\bsuitable for\b",
    r"\bbest for\b",
    r"\bmost appropriate\b",
]

_GAP_ANALYSIS_PATTERNS = [
    r"\bgap\b",
    r"\bmissing\b",
    r"\bnot (cover|address|include|mention)\b",
    r"\bdoes(n't| not) .+ (cover|address|include|mention)\b",
    r"\black\b",
    r"\bomit\b",
]

_TOPIC_MAPPING_PATTERNS = [
    r"\bmap\b",
    r"\bcorrespond\b",
    r"\bequivalent\b",
    r"\balign\b",
    r"\btopic .+ (across|between|in)\b",
    r"\bhow .+ relate\b",
]

# Standard name detection
_STANDARD_NAMES = {
    "PMBOK7": [r"pmbok\s*7?", r"pmbok", r"project management body of knowledge"],
    "PRINCE2": [r"prince\s*2?", r"prince"],
    "ISO 21502": [r"iso\s*21502", r"iso 21502"],
}


def _matches_any(text: str, patterns: list[str]) -> bool:
    """Check if text matches any of the regex patterns."""
    for pattern in patterns:
        if re.search(pattern, text, re.IGNORECASE):
            return True
    return False


def _count_standards_mentioned(text: str) -> int:
    """Count how many distinct standards are mentioned in the text."""
    count = 0
    for std_key, patterns in _STANDARD_NAMES.items():
        for pattern in patterns:
            if re.search(pattern, text, re.IGNORECASE):
                count += 1
                break
    return count


def classify_intent(question: str) -> str:
    """
    Classify the user's question into an intent category.

    Args:
        question: The user's natural language question.

    Returns:
        One of the INTENT_* constants.
    """
    q = question.strip().lower()
    standards_mentioned = _count_standards_mentioned(q)

    # Topic mapping takes priority: explicit "map/align/equivalent" keywords
    if _matches_any(q, _TOPIC_MAPPING_PATTERNS):
        return INTENT_TOPIC_MAPPING

    # Check for comparison intent (high priority)
    if _matches_any(q, _COMPARISON_PATTERNS):
        return INTENT_CROSS_COMPARISON

    # Multiple standards mentioned suggests comparison even without comparison keywords
    if standards_mentioned >= 2:
        return INTENT_CROSS_COMPARISON

    # Check for recommendation
    if _matches_any(q, _RECOMMENDATION_PATTERNS):
        return INTENT_RECOMMENDATION

    # Check for gap analysis
    if _matches_any(q, _GAP_ANALYSIS_PATTERNS):
        return INTENT_GAP_ANALYSIS

    # Check for source lookup
    if _matches_any(q, _SOURCE_LOOKUP_PATTERNS):
        return INTENT_SOURCE_LOOKUP

    # Check for definition
    if _matches_any(q, _DEFINITION_PATTERNS):
        return INTENT_DEFINITION

    # Default: if one standard mentioned, single; otherwise, general question
    if standards_mentioned == 1:
        return INTENT_SINGLE_STANDARD

    # Broad questions default to cross-comparison
    return INTENT_SINGLE_STANDARD
