"""
Standard router.
Determines which PM standards need to be searched based on the user query.
"""

from __future__ import annotations
import re

ALL_STANDARDS = ["PMBOK7", "PRINCE2", "ISO 21502"]

# Patterns to detect explicit standard mentions
_STANDARD_PATTERNS = {
    "PMBOK7": [r"pmbok\s*7?", r"pmbok", r"project management body of knowledge"],
    "PRINCE2": [r"prince\s*2?", r"prince"],
    "ISO 21502": [r"iso\s*21502", r"iso 21502"],
}

# Patterns that trigger searching all standards
_ALL_STANDARDS_PATTERNS = [
    r"\ball three\b",
    r"\ball 3\b",
    r"\ball standards\b",
    r"\bacross standards\b",
    r"\bbetween standards\b",
    r"\beach standard\b",
    r"\bevery standard\b",
    r"\bthe three\b",
    r"\bthe 3\b",
]


def route_standards(question: str, intent: str = "") -> list[str]:
    """
    Determine which standards should be searched.

    Rules:
    1. If the user explicitly mentions specific standards, search those.
    2. If "all", "compare all", "across standards" etc., search all three.
    3. If intent is cross_standard_comparison, search all three.
    4. If no standard is mentioned, search all three by default.

    Args:
        question: The user's natural language question.
        intent: The classified intent (optional, helps routing).

    Returns:
        List of standard keys to search.
    """
    q = question.strip().lower()

    # Check for explicit "all standards" patterns
    for pattern in _ALL_STANDARDS_PATTERNS:
        if re.search(pattern, q, re.IGNORECASE):
            return ALL_STANDARDS.copy()

    # Check for cross-comparison intent
    if intent == "cross_standard_comparison":
        # Check if specific standards are mentioned for the comparison
        mentioned = _detect_mentioned_standards(q)
        if len(mentioned) >= 2:
            return mentioned
        return ALL_STANDARDS.copy()

    # Check for explicitly mentioned standards
    mentioned = _detect_mentioned_standards(q)
    if mentioned:
        return mentioned

    # Default: search all standards
    return ALL_STANDARDS.copy()


def _detect_mentioned_standards(text: str) -> list[str]:
    """Detect which standards are explicitly mentioned in the text."""
    mentioned = []
    for std_key, patterns in _STANDARD_PATTERNS.items():
        for pattern in patterns:
            if re.search(pattern, text, re.IGNORECASE):
                if std_key not in mentioned:
                    mentioned.append(std_key)
                break
    return mentioned
