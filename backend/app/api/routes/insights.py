"""AI insight endpoints."""

from typing import Annotated

from fastapi import APIRouter, HTTPException, Query, status

from app.api.deps import DbSession
from app.integrations.agent.base import AgentUnavailableError
from app.schemas import AnalyzeRequest, AnalyzeResponse, InsightOut, RecommendationOut
from app.services import ai as ai_service

router = APIRouter(prefix="/insights", tags=["insight"])

AGENT_UNAVAILABLE = "AI Agent sedang tidak tersedia. Pemantauan tetap berjalan normal."


@router.get("", response_model=list[InsightOut])
def list_insights(
    db: DbSession,
    process_id: int | None = None,
    limit: Annotated[int, Query(ge=1, le=200)] = 50,
) -> list[InsightOut]:
    return [InsightOut.model_validate(row) for row in ai_service.list_insights(db, process_id, limit)]


@router.post("/analyze", response_model=AnalyzeResponse, status_code=status.HTTP_201_CREATED)
def analyze(payload: AnalyzeRequest, db: DbSession) -> AnalyzeResponse:
    try:
        insight, recommendations = ai_service.run_analysis(
            db, payload.process_id, payload.requested_by
        )
    except AgentUnavailableError as exc:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail=AGENT_UNAVAILABLE
        ) from exc
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc)) from exc

    return AnalyzeResponse(
        insight=InsightOut.model_validate(insight),
        recommendations=[RecommendationOut.model_validate(r) for r in recommendations],
    )
