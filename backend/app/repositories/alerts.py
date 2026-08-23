"""Queries against the alert table."""

from datetime import datetime, timedelta, timezone

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models import Alert


def list_alerts(
    db: Session,
    process_id: int | None = None,
    status: str | None = None,
    severity: str | None = None,
    parameter_name: str | None = None,
    hours: int | None = None,
    limit: int = 200,
) -> list[Alert]:
    stmt = select(Alert)
    if process_id is not None:
        stmt = stmt.where(Alert.process_id == process_id)
    if status:
        stmt = stmt.where(Alert.status == status)
    if severity:
        stmt = stmt.where(Alert.severity == severity)
    if parameter_name:
        stmt = stmt.where(Alert.parameter_name == parameter_name)
    if hours:
        stmt = stmt.where(Alert.created_at >= datetime.now(timezone.utc) - timedelta(hours=hours))
    stmt = stmt.order_by(Alert.created_at.desc()).limit(limit)
    return list(db.scalars(stmt))


def get_alert(db: Session, alert_id: int) -> Alert | None:
    return db.get(Alert, alert_id)


def get_active_alerts(db: Session, process_id: int) -> list[Alert]:
    stmt = (
        select(Alert)
        .where(Alert.process_id == process_id, Alert.status == "active")
        .order_by(Alert.created_at.desc())
    )
    return list(db.scalars(stmt))


def count_active_alerts(db: Session, process_id: int) -> int:
    return len(get_active_alerts(db, process_id))
