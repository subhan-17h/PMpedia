"""
Domain guard — Step 0 of the agentic RAG pipeline.

Rejects queries that are:
  1. Prompt injection attempts (regex, no LLM needed)
  2. Not related to project management / PM standards (LLM or embedding fallback)

Returns (is_relevant: bool, reason: str).
"""

from __future__ import annotations
import re
import numpy as np

_INJECTION_PATTERNS = [
    r"ignore\s+(previous|prior|all)\s+instructions?",
    r"you\s+are\s+now\s+[a-z]",
    r"disregard\s+(your|all|previous)",
    r"forget\s+(your|all|previous|the)\s+(previous\s+)?instructions?",
    r"(system|assistant)\s*:",
    r"<\s*(system|instruction)",
    r"new\s+instructions?\s*:",
    r"override\s+(your|all)",
    r"jailbreak",
    r"pretend\s+(you\s+are|to\s+be)\s+(?!a\s+pm|a\s+project)",
    r"act\s+as\s+(?!a\s+pm|a\s+project\s+manager)",
    r"developer\s+mode",
    r"dan\s+mode",
]

_PM_ANCHORS = [
    "project management methodology process lifecycle",
    "PMBOK risk management stakeholder performance domain",
    "PRINCE2 governance project board theme process",
    "ISO 21502 project control performance management",
    "project planning scheduling scope budget delivery",
    "agile iterative delivery sprint backlog retrospective",
    "project sponsor deliverable milestone change control",
    "risk register issue log lessons learned project closure",
    "earned value management schedule variance cost performance",
    "work breakdown structure resource planning project charter",
    "quality management process improvement project audit",
    "communication plan stakeholder engagement matrix",
]

_ANCHOR_THRESHOLD = 0.28


def _is_injection(question: str) -> bool:
    q = question.lower()
    return any(re.search(p, q) for p in _INJECTION_PATTERNS)


def _embedding_relevance(question: str, embedding_service) -> bool:
    try:
        texts = [question] + _PM_ANCHORS
        vecs = embedding_service.embed_batch(texts)
        query_vec = np.array(vecs[0])
        anchor_vecs = np.array(vecs[1:])
        # embeddings are already L2-normalised by sentence-transformers
        similarities = anchor_vecs @ query_vec
        return float(similarities.max()) >= _ANCHOR_THRESHOLD
    except Exception:
        return True  # fail open — let the pipeline decide


def check_domain_relevance(
    question: str,
    llm_service=None,
    embedding_service=None,
) -> tuple[bool, str]:
    """
    Return (is_relevant, reason).

    reason values:
      "prompt_injection"  — adversarial input detected
      "off_topic"         — question not about PM standards
      "passed"            — question is acceptable
    """
    if _is_injection(question):
        return False, "prompt_injection"

    # LLM classification (fast binary call)
    if llm_service is not None:
        try:
            relevant = llm_service.is_pm_relevant(question)
            return (True, "passed") if relevant else (False, "off_topic")
        except Exception:
            pass  # fall through to embedding fallback

    # Embedding similarity fallback
    if embedding_service is not None:
        relevant = _embedding_relevance(question, embedding_service)
        return (True, "passed") if relevant else (False, "off_topic")

    # No guard available — fail open
    return True, "passed"
