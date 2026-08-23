"""Queries against the audit log."""

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models import AuditLog


def list_audit_logs(
    db: Session, action: str | None = None, entity_type: str | None = None, limit: int = 200
) -> list[AuditLog]:
    stmt = select(AuditLog)
    if action:
        stmt = stmt.where(AuditLog.action == action)
    if entity_type:
        stmt = stmt.where(AuditLog.entity_type == entity_type)
    stmt = stmt.order_by(AuditLog.created_at.desc(), AuditLog.id.desc()).limit(limit)
    return list(db.scalars(stmt))
