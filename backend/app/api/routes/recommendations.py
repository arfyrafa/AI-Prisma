"""Recommendation and engineer verification endpoints."""

from typing import Annotated

from fastapi import APIRouter, HTTPException, Query, status
from sqlalchemy.orm import selectinload

from app.api.deps import CurrentUser, DbSession
from app.models import Recommendation
from app.schemas import RecommendationOut, VerificationOut, VerificationRequest
from app.services import ai as ai_service

router = APIRouter(prefix="/recommendations", tags=["recommendation"])


@router.get("", response_model=list[RecommendationOut])
def list_recommendations(
    db: DbSession,
    process_id: int | None = None,
    status_filter: Annotated[str | None, Query(alias="status")] = None,
    limit: Annotated[int, Query(ge=1, le=200)] = 50,
) -> list[RecommendationOut]:
    rows = ai_service.list_recommendations(db, process_id, status_filter, limit)
    return [RecommendationOut.model_validate(row) for row in rows]


@router.post(
    "/{recommendation_id}/verify",
    response_model=VerificationOut,
    status_code=status.HTTP_201_CREATED,
)
def verify(
    recommendation_id: int,
    payload: VerificationRequest,
    db: DbSession,
    user: CurrentUser,
) -> VerificationOut:
    """Record the engineer's decision.

    The platform stores the decision and stops there: no process parameter is
    ever changed by this endpoint.
    """
    recommendation = db.get(Recommendation, recommendation_id)
    if recommendation is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Rekomendasi tidak ditemukan."
        )
    if not payload.reviewed:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Rekomendasi harus ditandai sudah ditinjau sebelum diverifikasi.",
        )

    verification = ai_service.verify_recommendation(
        db, recommendation, payload.decision, payload.verified_by or user, payload.notes
    )
    return VerificationOut.model_validate(verification)
