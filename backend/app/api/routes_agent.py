"""
Agent query endpoint.
Runs the full agentic RAG workflow.
"""

from fastapi import APIRouter, HTTPException
from app.models.schemas import AgentRequest, AgentResponse

router = APIRouter()


@router.post("/agent/query", response_model=AgentResponse)
async def agent_query(request: AgentRequest):
    """Process a question through the agentic RAG workflow."""
    from app.main import get_agent

    agent = get_agent()
    if agent is None:
        raise HTTPException(
            status_code=503,
            detail="Agent not initialized. Run ingestion first.",
        )

    try:
        response = agent.process_query(
            question=request.question,
            top_k=request.top_k,
            show_trace=request.show_trace,
        )
        return response
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Agent error: {str(e)}")
