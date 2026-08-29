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
        overall_status=deviation_service.overall_status(snapshots),
        active_alert_count=alert_repo.count_active_alerts(db, process.id),
        data_source=process.data_source,
        server_time=datetime.now(timezone.utc),
    )


COLUMN_ALIASES: dict[str, str] = {
    "naclo3_feed": "flow_rate",
    "naclo3_feed_m3h": "flow_rate",
    "naclo3_concentration": "reaction_efficiency",
    "naclo3_concentration_gpl": "reaction_efficiency",
    "nacl_concentration": "orp",
    "nacl_concentration_gpl": "orp",
    "hcl_feed": "so2_dosage",
    "hcl_feed_m3h": "so2_dosage",
    "hcl_concentration": "ph",
    "hcl_concentration_pct": "ph",
    "generator_temperature": "pressure",
    "generator_temperature_c": "pressure",
    "absorber_water_temperature": "temperature",
    "absorber_water_temperature_c": "temperature",
    "absorber_water_rate": "production_capacity",
    "absorber_water_rate_m3h": "production_capacity",
}


def build_history(
    db: Session, process_id: int, range_key: str, parameters: list[str] | None = None
) -> HistoryResponse:
    since = reading_repo.resolve_range(range_key)
    rows = reading_repo.get_readings_since(db, process_id, since)
    req_params = parameters or list(SensorReading.PARAMETER_COLUMNS)

    points = []
    for row in rows:
        val_map: dict[str, float | None] = {}
        for p in req_params:
            col_name = COLUMN_ALIASES.get(p, p)
            val = getattr(row, col_name, None) if hasattr(row, col_name) else None
            val_map[p] = val
            val_map[col_name] = val
        points.append(HistoryPoint(timestamp=row.timestamp, values=val_map))

    return HistoryResponse(
        process_id=process_id, range=range_key, parameters=req_params, points=points
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
    mapped_values = {}
    for k, v in values.items():
        if v is not None:
            col = COLUMN_ALIASES.get(k, k)
            if col in SensorReading.PARAMETER_COLUMNS:
                mapped_values[col] = v
            elif k in SensorReading.PARAMETER_COLUMNS:
                mapped_values[k] = v

    reading = SensorReading(
        process_id=process_id,
        timestamp=timestamp or datetime.now(timezone.utc),
        source=source,
        **{key: mapped_values.get(key) for key in SensorReading.PARAMETER_COLUMNS},
    )
    db.add(reading)
    db.commit()
    db.refresh(reading)

    parameters = reading_repo.get_parameters(db, process_id)
    deviations = deviation_service.detect_deviations(parameters, reading)
    created = sync_alerts(db, process_id, deviations, reading)
    return reading, deviations, created
