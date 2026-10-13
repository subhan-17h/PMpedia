"""
Agentic RAG orchestrator.
  Question -> Intent -> Routing -> Query Gen -> Retrieval ->
  Coverage Check -> Rewrite (if needed) -> LLM Answer -> Trace
"""

from __future__ import annotations
from app.models.schemas import AgentResponse, CoverageResult, SourceResult
from app.agent.intent_classifier import classify_intent
from app.agent.standard_router import route_standards
from app.agent.query_generator import generate_queries
from app.agent.coverage_checker import check_coverage
from app.agent.query_rewriter import rewrite_queries
from app.agent.answer_generator import generate_answer
from app.agent.domain_guard import check_domain_relevance
from app.agent.tools import AgentTools


class AgenticRAG:
    """
    Agentic RAG orchestrator.

    Pipeline:
      1. Intent classification (rule-based)
      2. Standards routing (rule-based)
      3. Multi-query generation (vocab-aware, per standard)
      4. Parallel retrieval (ChromaDB semantic search)
      5. Coverage check (per-standard quality gate)
      6. Corrective RAG: LLM query rewrite + re-retrieve if weak
      7. LLM answer synthesis (with template fallback)
      8. Trace construction
    """

    def __init__(self, tools: AgentTools, llm_service=None):
        self.tools       = tools
        self.llm_service = llm_service

    def process_query(
        self,
        question: str,
        top_k: int = 5,
        show_trace: bool = True,
    ) -> AgentResponse:
        trace: list[str] = []
        using_llm = self.llm_service is not None
        trace.append(f"LLM generation: {'enabled' if using_llm else 'disabled (no API key)'}")

        # ── 0. Domain guard ───────────────────────────────────────
        embedding_service = getattr(
            getattr(self.tools, "retriever", None), "embedding_service", None
        )
        is_relevant, guard_reason = check_domain_relevance(
            question, self.llm_service, embedding_service
        )
        if not is_relevant:
            if guard_reason == "prompt_injection":
                rejection = "I cannot process that request."
            else:
                rejection = (
                    "I can only answer questions about project management standards "
                    "(PMBOK7, PRINCE2, and ISO 21502). "
                    "Please ask something related to those topics."
                )
            return AgentResponse(
                answer=rejection,
                intent="out_of_scope",
                required_standards=[],
                sources=[],
                trace=[f"Domain guard: rejected — {guard_reason}"] if show_trace else [],
                coverage=CoverageResult(is_sufficient=False, reason=guard_reason),
            )
        trace.append("Domain guard: passed")

        # ── 1. Intent ─────────────────────────────────────────────
        intent = classify_intent(question)
        trace.append(f"Intent: {intent}")

        # ── 2. Routing ────────────────────────────────────────────
        required_standards = route_standards(question, intent)
        trace.append(f"Routing to: {', '.join(required_standards)}")

        # ── 3. Query generation ───────────────────────────────────
        queries = generate_queries(question, required_standards)
        for std, q in queries.items():
            trace.append(f"Query [{std}]: {q[:90]}{'…' if len(q) > 90 else ''}")

        # ── 4. Retrieval ──────────────────────────────────────────
        results_by_standard: dict[str, list[dict]] = {}
        for std in required_standards:
            query = queries.get(std, question)
            results = self.tools.search_standard(std, query, top_k)
            results_by_standard[std] = results
            trace.append(f"Retrieved {len(results)} chunks from {std}")

        # ── 5. Coverage check ─────────────────────────────────────
        coverage = check_coverage(results_by_standard, required_standards, intent)
        if coverage.is_sufficient:
            trace.append("Coverage: sufficient")
        else:
            trace.append(f"Coverage: insufficient — {coverage.reason}")

        # ── 6. Corrective RAG ─────────────────────────────────────
        if not coverage.is_sufficient:
            standards_to_retry = list(set(coverage.missing_standards + coverage.weak_standards))
            trace.append(f"Corrective RAG: rewriting queries for {', '.join(standards_to_retry)}")

            rewritten = rewrite_queries(
                original_question=question,
                weak_standards=coverage.weak_standards,
                missing_standards=coverage.missing_standards,
                llm_service=self.llm_service,
            )

            for std, rq in rewritten.items():
                mode = "LLM" if using_llm else "synonym"
                trace.append(f"Rewrite [{std}, {mode}]: {rq[:90]}{'…' if len(rq) > 90 else ''}")
                new_results = self.tools.search_standard(std, rq, top_k)
                trace.append(f"Re-retrieved {len(new_results)} chunks from {std}")
                existing_ids = {c.get("chunk_id") for c in results_by_standard.get(std, [])}
                for nr in new_results:
                    if nr.get("chunk_id") not in existing_ids:
                        results_by_standard.setdefault(std, []).append(nr)

            coverage = check_coverage(results_by_standard, required_standards, intent)
            trace.append(
                "Coverage after rewrite: sufficient" if coverage.is_sufficient
                else f"Coverage after rewrite: still limited — {coverage.reason}"
            )

        # ── 7. Answer generation ──────────────────────────────────
        mode_label = "LLM" if using_llm else "template"
        trace.append(f"Generating answer via {mode_label}…")
        answer = generate_answer(
            question=question,
            intent=intent,
            results_by_standard=results_by_standard,
            coverage_is_sufficient=coverage.is_sufficient,
            llm_service=self.llm_service,
        )
        trace.append("Answer generated")

        # ── Build source list ─────────────────────────────────────
        sources = []
        for std, chunks in results_by_standard.items():
            for chunk in chunks[:top_k]:
                sources.append(SourceResult(
                    standard=chunk.get("standard", std),
                    chunk_id=chunk.get("chunk_id", ""),
                    section_id=chunk.get("section_id", ""),
                    title=chunk.get("title", ""),
                    text=chunk.get("text", "")[:300],
                    score=chunk.get("score", 0),
                    deep_link=chunk.get("deep_link", ""),
                ))
        sources.sort(key=lambda s: s.score, reverse=True)

        return AgentResponse(
            answer=answer,
            intent=intent,
            required_standards=required_standards,
            sources=sources,
            trace=trace if show_trace else [],
            coverage=coverage,
        )
