"""Prediction service: run the replaceable model and persist its output."""

from datetime import datetime, timezone

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.config import settings
from app.integrations.factory import get_predictive_model
from app.integrations.predictive.base import PredictionUnavailableError
from app.models import Prediction
from app.repositories import readings as reading_repo
from app.services.audit import log_event

HISTORY_LIMIT = 720


def generate_prediction(
    db: Session,
    process_id: int,
    target_parameter: str = "clo2_concentration",
    horizon_minutes: int | None = None,
) -> Prediction:
    model = get_predictive_model()
    horizon = horizon_minutes or settings.PREDICTION_HORIZON_MINUTES

    rows = reading_repo.get_recent_readings(db, process_id, limit=HISTORY_LIMIT)
    history = [{"timestamp": row.timestamp, **row.as_parameter_map()} for row in rows]

    result = model.predict(history, target_parameter, horizon)  # may raise

    parameter = reading_repo.get_parameter(db, process_id, target_parameter)
    prediction = Prediction(
        process_id=process_id,
        timestamp=datetime.now(timezone.utc),
        target_parameter=result.target_parameter,
        actual_value=result.actual_value,
        predicted_value=result.predicted_value,
        unit=parameter.unit if parameter else "",
        model_name=result.model_name,
        model_metadata=result.metadata,
        prediction_horizon=result.horizon_minutes,
        is_simulated=result.is_simulated,
    )
    db.add(prediction)
    db.flush()
    log_event(
        db,
        action="prediction_generated",
        entity_type="prediction",
        entity_id=prediction.id,
        description=(
            f"Prediksi {result.target_parameter} {result.predicted_value} "
            f"untuk horizon {result.horizon_minutes} menit."
        ),
        metadata={"model": result.model_name},
        commit=False,
    )
    db.commit()
    db.refresh(prediction)
    return prediction


def list_predictions(
    db: Session, process_id: int | None = None, target_parameter: str | None = None, limit: int = 50
) -> list[Prediction]:
    stmt = select(Prediction)
    if process_id:
        stmt = stmt.where(Prediction.process_id == process_id)
    if target_parameter:
        stmt = stmt.where(Prediction.target_parameter == target_parameter)
    return list(db.scalars(stmt.order_by(Prediction.timestamp.desc()).limit(limit)))


def latest_prediction(
    db: Session, process_id: int, target_parameter: str = "clo2_concentration"
) -> Prediction | None:
    results = list_predictions(db, process_id, target_parameter, limit=1)
    return results[0] if results else None


__all__ = [
    "PredictionUnavailableError",
    "generate_prediction",
    "latest_prediction",
    "list_predictions",
]
