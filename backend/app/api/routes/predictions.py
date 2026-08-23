"""Prediction endpoints."""

from typing import Annotated

from fastapi import APIRouter, HTTPException, Query, status

from app.api.deps import DbSession
from app.integrations.predictive.base import PredictionUnavailableError
from app.schemas import PredictionOut, PredictionRequest
from app.services import prediction as prediction_service

router = APIRouter(prefix="/predictions", tags=["prediction"])


@router.get("", response_model=list[PredictionOut])
def list_predictions(
    db: DbSession,
    process_id: int | None = None,
    target_parameter: str | None = None,
    limit: Annotated[int, Query(ge=1, le=200)] = 50,
) -> list[PredictionOut]:
    rows = prediction_service.list_predictions(db, process_id, target_parameter, limit)
    return [PredictionOut.model_validate(row) for row in rows]


@router.get("/latest", response_model=PredictionOut)
def get_latest(
    db: DbSession,
    process_id: int = 1,
    target_parameter: str = "clo2_concentration",
) -> PredictionOut:
    row = prediction_service.latest_prediction(db, process_id, target_parameter)
    if row is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Belum ada prediksi. Jalankan prediksi terlebih dahulu.",
        )
    return PredictionOut.model_validate(row)


@router.post("/generate", response_model=PredictionOut, status_code=status.HTTP_201_CREATED)
def generate(payload: PredictionRequest, db: DbSession) -> PredictionOut:
    try:
        row = prediction_service.generate_prediction(
            db, payload.process_id, payload.target_parameter, payload.horizon_minutes
        )
    except PredictionUnavailableError as exc:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=str(exc)) from exc
    return PredictionOut.model_validate(row)
