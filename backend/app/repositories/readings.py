"""Queries against processes, parameters and sensor readings."""

from datetime import datetime, timedelta, timezone

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models import Process, ProcessParameter, SensorReading


def list_processes(db: Session) -> list[Process]:
    return list(db.scalars(select(Process).order_by(Process.id)))


def get_process(db: Session, process_id: int) -> Process | None:
    return db.get(Process, process_id)


def get_parameters(db: Session, process_id: int) -> list[ProcessParameter]:
    stmt = (
        select(ProcessParameter)
        .where(ProcessParameter.process_id == process_id)
        .order_by(ProcessParameter.display_order, ProcessParameter.id)
    )
    return list(db.scalars(stmt))


def get_parameter(db: Session, process_id: int, parameter_name: str) -> ProcessParameter | None:
    stmt = select(ProcessParameter).where(
        ProcessParameter.process_id == process_id,
        ProcessParameter.parameter_name == parameter_name,
    )
    return db.scalars(stmt).first()


def get_latest_reading(db: Session, process_id: int) -> SensorReading | None:
    stmt = (
        select(SensorReading)
        .where(SensorReading.process_id == process_id)
        .order_by(SensorReading.timestamp.desc(), SensorReading.id.desc())
        .limit(1)
    )
    return db.scalars(stmt).first()


def get_readings_since(
    db: Session, process_id: int, since: datetime, limit: int = 5000
) -> list[SensorReading]:
    stmt = (
        select(SensorReading)
        .where(SensorReading.process_id == process_id, SensorReading.timestamp >= since)
        .order_by(SensorReading.timestamp.asc())
        .limit(limit)
    )
    return list(db.scalars(stmt))


def get_recent_readings(db: Session, process_id: int, limit: int = 500) -> list[SensorReading]:
    stmt = (
        select(SensorReading)
        .where(SensorReading.process_id == process_id)
        .order_by(SensorReading.timestamp.desc())
        .limit(limit)
    )
    return list(reversed(list(db.scalars(stmt))))


RANGE_TO_TIMEDELTA = {
    "1h": timedelta(hours=1),
    "6h": timedelta(hours=6),
    "24h": timedelta(hours=24),
    "7d": timedelta(days=7),
    "30d": timedelta(days=30),
    "1m": timedelta(days=30),
}


def resolve_range(range_key: str) -> datetime:
    delta = RANGE_TO_TIMEDELTA.get(range_key, timedelta(hours=6))
    return datetime.now(timezone.utc) - delta
