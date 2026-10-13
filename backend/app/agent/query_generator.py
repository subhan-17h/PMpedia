"""
Query generator.
Generates standard-specific optimized search queries using topic vocabulary mappings.
"""

from __future__ import annotations
import re

# Standard-specific vocabulary for common PM topics
TOPIC_VOCABULARY = {
    "risk management": {
        "PMBOK7": "risk uncertainty risk response project performance domain optimize risk responses threat opportunity",
        "PRINCE2": "risk theme risk management procedure risk response risk register risk owner risk tolerance",
        "ISO 21502": "risk management uncertainty risk treatment project control risk assessment",
    },
    "stakeholder engagement": {
        "PMBOK7": "stakeholder engagement stakeholder performance domain influence power interest communication",
        "PRINCE2": "stakeholder communication strategy stakeholder analysis engagement",
        "ISO 21502": "stakeholder engagement stakeholder management communication project stakeholders",
    },
    "governance": {
        "PMBOK7": "governance organizational governance project governance oversight authority decision",
        "PRINCE2": "project board executive senior user senior supplier direction management by exception",
        "ISO 21502": "project governance governance framework project board project sponsor oversight",
    },
    "planning": {
        "PMBOK7": "planning project planning schedule performance domain measurement planning activities",
        "PRINCE2": "planning product-based planning project plan stage plan team plan exception plan",
        "ISO 21502": "planning developing the plan initial project planning plan baseline schedule management",
    },
    "change control": {
        "PMBOK7": "change control change management project change configuration management enable change",
        "PRINCE2": "change control issue change authority configuration management change budget",
        "ISO 21502": "change control managing change change request controlling scope configuration",
    },
    "quality": {
        "PMBOK7": "quality processes deliverables acceptance criteria build quality conformity reliability",
        "PRINCE2": "quality review quality plan quality management system quality control product description",
        "ISO 21502": "quality management quality requirements quality standards quality plan verification validation",
    },
    "scope": {
        "PMBOK7": "scope requirements deliverables work breakdown structure scope management project scope",
        "PRINCE2": "project scope product breakdown structure product description work packages",
        "ISO 21502": "scope management defining scope controlling scope work breakdown structure",
    },
    "schedule": {
        "PMBOK7": "schedule performance domain schedule management duration estimation project schedule",
        "PRINCE2": "schedule stage plan gantt chart planning activities duration",
        "ISO 21502": "schedule management estimating activity durations developing schedule controlling schedule",
    },
    "cost": {
        "PMBOK7": "cost budget resources financial cost management project budget",
        "PRINCE2": "cost budget project costs stage costs cost tolerance business case financial",
        "ISO 21502": "cost management budget cost estimating cost control financial management",
    },
    "resources": {
        "PMBOK7": "resources team resource management project team human resources",
        "PRINCE2": "resources team manager team plan team management resource allocation",
        "ISO 21502": "resources management project organization team project team members work package leader",
    },
    "communication": {
        "PMBOK7": "communication stakeholder communication engagement information flow",
        "PRINCE2": "communication strategy communication management reporting highlight report checkpoint report",
        "ISO 21502": "communication management reporting project reporting information management",
    },
    "benefits": {
        "PMBOK7": "benefits value delivery outcomes value creation benefits realization",
        "PRINCE2": "business case benefits expected benefits dis-benefits benefits review",
        "ISO 21502": "benefit management benefits realization outcomes value creation business case",
    },
    "issue management": {
        "PMBOK7": "issues problems obstacles impediments resolution issue management",
        "PRINCE2": "issue management issue register issue report escalation exception",
        "ISO 21502": "issue management issues escalation resolution corrective action",
    },
    "project lifecycle": {
        "PMBOK7": "project life cycle development approach predictive adaptive hybrid incremental",
        "PRINCE2": "project life cycle stages initiation stage delivery stage closing process",
        "ISO 21502": "project life cycle phases decision points gates project phases",
    },
    "roles and responsibilities": {
        "PMBOK7": "roles responsibilities project team authority accountability steward coordination oversight",
        "PRINCE2": "project board executive project manager team manager project assurance project support",
        "ISO 21502": "project organization roles project sponsor project manager work package leader project board",
    },
}


def _detect_topic(question: str) -> str | None:
    """Detect which PM topic the question is about."""
    q = question.lower()
    best_topic = None
    best_score = 0

    for topic in TOPIC_VOCABULARY:
        topic_words = topic.split()
        score = sum(1 for word in topic_words if word in q)
        # Require multi-word topics to match at least 2 words to avoid false positives
        if score > best_score and (len(topic_words) == 1 or score >= 2):
            best_score = score
            best_topic = topic

    # Partial match fallback: only use if no scored match found, and topic key is in query verbatim
    if best_score == 0:
        for topic in TOPIC_VOCABULARY:
            if topic in q:
                return topic

    return best_topic if best_score > 0 else None


def generate_queries(
    question: str,
    required_standards: list[str],
) -> dict[str, str]:
    """
    Generate standard-specific search queries optimized with domain vocabulary.

    Args:
        question: The user's original question.
        required_standards: Which standards need queries.

    Returns:
        Dict mapping standard key → optimized query string.
    """
    topic = _detect_topic(question)

    queries = {}
    for std in required_standards:
        if topic and std in TOPIC_VOCABULARY.get(topic, {}):
            # Use topic-specific vocabulary + original question context
            vocab_query = TOPIC_VOCABULARY[topic][std]
            # Combine original question keywords with standard-specific terms
            queries[std] = f"{vocab_query}"
        else:
            # Fallback: use the original question for that standard
            queries[std] = question

    return queries


def generate_rewrite_queries(
    original_query: str,
    standard: str,
    attempt: int = 1,
) -> str:
    """
    Generate a rewritten query for a specific standard when initial retrieval was weak.

    Uses synonym expansion and alternative phrasings.
    """
    topic = _detect_topic(original_query)

    # Synonym expansion mapping
    synonyms = {
        "risk": ["threat", "opportunity", "uncertainty", "risk response", "risk treatment", "risk control"],
        "stakeholder": ["interested party", "participant", "sponsor", "beneficiary", "user", "customer"],
        "governance": ["oversight", "direction", "authority", "control", "decision-making", "board"],
        "planning": ["plan", "schedule", "work breakdown", "estimation", "forecasting"],
        "change": ["modification", "variation", "amendment", "change request", "change control"],
        "quality": ["standards", "acceptance criteria", "verification", "validation", "review"],
        "scope": ["requirements", "deliverables", "work packages", "boundaries", "work breakdown"],
        "cost": ["budget", "financial", "expenditure", "funding", "investment"],
        "resources": ["team", "people", "personnel", "staff", "capacity", "capability"],
    }

    # Start with topic vocabulary if available
    if topic and standard in TOPIC_VOCABULARY.get(topic, {}):
        base = TOPIC_VOCABULARY[topic][standard]
    else:
        base = original_query

    # Add synonyms for keywords in the query
    additions = []
    for keyword, syns in synonyms.items():
        if keyword in original_query.lower():
            # Rotate through synonyms based on attempt number
            idx = (attempt - 1) % len(syns)
            additions.extend(syns[idx:idx + 3])

    if additions:
        return f"{base} {' '.join(additions)}"
    else:
        return f"{base} project management {standard.lower()}"
