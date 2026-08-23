"""Alert lifecycle: create on deviation, auto-resolve on recovery, acknowledge."""

from datetime import datetime, timezone

from sqlalchemy.orm import Session

from app.models import Alert, SensorReading
from app.repositories import alerts as alert_repo
from app.schemas import Deviation
from app.services.audit import log_event


def sync_alerts(
    db: Session,
    process_id: int,
    deviations: list[Deviation],
    reading: SensorReading | None = None,
) -> list[Alert]:
    """Reconcile active alerts with the deviations of the latest reading.

    - A parameter that deviates and has no matching active alert gets one.
    - An existing active alert whose severity changed is updated.
    - An active alert whose parameter is back in range is resolved.
    """
    active = {alert.parameter_name: alert for alert in alert_repo.get_active_alerts(db, process_id)}
    deviating = {deviation.parameter_name: deviation for deviation in deviations}
    created: list[Alert] = []
    now = datetime.now(timezone.utc)

    for name, deviation in deviating.items():
        existing = active.get(name)
        if existing is None:
            alert = Alert(
                process_id=process_id,
                sensor_reading_id=reading.id if reading else None,
                parameter_name=name,
                severity=deviation.severity,
                message=deviation.message,
                current_value=deviation.current_value,
                expected_min=deviation.expected_min,
                expected_max=deviation.expected_max,
                deviation=deviation.deviation,
                status="active",
            )
            db.add(alert)
            db.flush()
            created.append(alert)
            log_event(
                db,
                action="alert_created",
                entity_type="alert",
                entity_id=alert.id,
                description=deviation.message,
                metadata={"severity": deviation.severity, "parameter": name},
                commit=False,
            )
        else:
            existing.current_value = deviation.current_value
            existing.deviation = deviation.deviation
            if existing.severity != deviation.severity:
                existing.severity = deviation.severity
                existing.message = deviation.message

    for name, alert in active.items():
        if name not in deviating:
            alert.status = "resolved"
            alert.resolved_at = now
            log_event(
                db,
                action="alert_resolved",
                entity_type="alert",
                entity_id=alert.id,
                description=f"{alert.parameter_name} kembali ke rentang operasi.",
                commit=False,
            )

    db.commit()
    for alert in created:
        db.refresh(alert)
    return created


def acknowledge(db: Session, alert: Alert, acknowledged_by: str, notes: str | None = None) -> Alert:
    alert.acknowledged_by = acknowledged_by
    alert.acknowledged_at = datetime.now(timezone.utc)
    if alert.status == "active":
        alert.status = "acknowledged"
    log_event(
        db,
        action="alert_acknowledged",
        user_id=acknowledged_by,
        entity_type="alert",
        entity_id=alert.id,
        description=notes or f"Alert {alert.parameter_name} diakui oleh {acknowledged_by}.",
        commit=False,
    )
    db.commit()
    db.refresh(alert)
    return alert
