"""Monitoring service: snapshots, history and reading ingestion."""

from datetime import datetime, timezone

from sqlalchemy.orm import Session

from app.models import Process, SensorReading
from app.repositories import alerts as alert_repo
from app.repositories import readings as reading_repo
from app.schemas import (
    Deviation,
    HistoryPoint,
    HistoryResponse,
    LatestSnapshot,
    ProcessOut,
    SensorReadingOut,
)
from app.services import deviation as deviation_service
from app.services.alerts import sync_alerts


def build_latest_snapshot(db: Session, process: Process) -> LatestSnapshot:
    parameters = reading_repo.get_parameters(db, process.id)
    reading = reading_repo.get_latest_reading(db, process.id)
    snapshots = deviation_service.build_snapshots(parameters, reading)

    return LatestSnapshot(
        process=ProcessOut.model_validate(process),
        reading=SensorReadingOut.model_validate(reading) if reading else None,
        parameters=snapshots,
        overall_status=deviation_service.overall_status(snapshots),  # type: ignore[arg-type]
        active_alert_count=alert_repo.count_active_alerts(db, process.id),
        data_source=process.data_source,
        server_time=datetime.now(timezone.utc),
    )


def build_history(
    db: Session, process_id: int, range_key: str, parameters: list[str] | None = None
) -> HistoryResponse:
    since = reading_repo.resolve_range(range_key)
    rows = reading_repo.get_readings_since(db, process_id, since)
    selected = parameters or list(SensorReading.PARAMETER_COLUMNS)
    selected = [name for name in selected if name in SensorReading.PARAMETER_COLUMNS]

    points = [
        HistoryPoint(
            timestamp=row.timestamp,
            values={name: getattr(row, name) for name in selected},
        )
        for row in rows
    ]
    return HistoryResponse(
        process_id=process_id, range=range_key, parameters=selected, points=points
    )


def current_deviations(db: Session, process_id: int) -> list[Deviation]:
    parameters = reading_repo.get_parameters(db, process_id)
    reading = reading_repo.get_latest_reading(db, process_id)
    return deviation_service.detect_deviations(parameters, reading)


def record_reading(
    db: Session,
    process_id: int,
    values: dict[str, float | None],
    timestamp: datetime | None = None,
    source: str = "external",
) -> tuple[SensorReading, list[Deviation], list]:
    """Persist a reading, evaluate it and reconcile alerts.

    Returns ``(reading, deviations, created_alerts)``.
    """
    reading = SensorReading(
        process_id=process_id,
        timestamp=timestamp or datetime.now(timezone.utc),
        source=source,
        **{key: values.get(key) for key in SensorReading.PARAMETER_COLUMNS},
    )
    db.add(reading)
    db.commit()
    db.refresh(reading)

    parameters = reading_repo.get_parameters(db, process_id)
    deviations = deviation_service.detect_deviations(parameters, reading)
    created = sync_alerts(db, process_id, deviations, reading)
    return reading, deviations, created
