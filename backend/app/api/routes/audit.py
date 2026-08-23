"""Audit trail endpoints."""

from typing import Annotated

from fastapi import APIRouter, Query

from app.api.deps import DbSession
from app.repositories import audit as audit_repo
from app.schemas import AuditLogOut

router = APIRouter(prefix="/audit-logs", tags=["audit"])


@router.get("", response_model=list[AuditLogOut])
def list_audit_logs(
    db: DbSession,
    action: str | None = None,
    entity_type: str | None = None,
    limit: Annotated[int, Query(ge=1, le=500)] = 100,
) -> list[AuditLogOut]:
    rows = audit_repo.list_audit_logs(db, action, entity_type, limit)
    return [AuditLogOut.model_validate(row) for row in rows]
