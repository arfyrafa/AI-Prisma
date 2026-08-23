"""Audit trail writer."""

from typing import Any

from sqlalchemy.orm import Session

from app.models import AuditLog


def log_event(
    db: Session,
    action: str,
    *,
    user_id: str | None = None,
    entity_type: str | None = None,
    entity_id: int | None = None,
    description: str | None = None,
    metadata: dict[str, Any] | None = None,
    commit: bool = True,
) -> AuditLog:
    entry = AuditLog(
        user_id=user_id,
        action=action,
        entity_type=entity_type,
        entity_id=entity_id,
        description=description,
        log_metadata=metadata,
    )
    db.add(entry)
    if commit:
        db.commit()
        db.refresh(entry)
    else:
        db.flush()
    return entry
