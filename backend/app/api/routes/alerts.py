"""Alert center endpoints."""

from typing import Annotated

from fastapi import APIRouter, HTTPException, Query, status

from app.api.deps import CurrentUser, DbSession
from app.repositories import alerts as alert_repo
from app.schemas import AlertAcknowledge, AlertOut
from app.services.alerts import acknowledge

router = APIRouter(prefix="/alerts", tags=["alert"])


@router.get("", response_model=list[AlertOut])
def list_alerts(
    db: DbSession,
    process_id: int | None = None,
    status_filter: Annotated[str | None, Query(alias="status")] = None,
    severity: Annotated[str | None, Query(pattern="^(INFO|WARNING|CRITICAL)$")] = None,
    parameter_name: str | None = None,
    hours: Annotated[int | None, Query(ge=1, le=720)] = None,
    limit: Annotated[int, Query(ge=1, le=500)] = 100,
) -> list[AlertOut]:
    rows = alert_repo.list_alerts(
        db,
        process_id=process_id,
        status=status_filter,
        severity=severity,
        parameter_name=parameter_name,
        hours=hours,
        limit=limit,
    )
    return [AlertOut.model_validate(row) for row in rows]


@router.get("/{alert_id}", response_model=AlertOut)
def get_alert(alert_id: int, db: DbSession) -> AlertOut:
    alert = alert_repo.get_alert(db, alert_id)
    if alert is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Alert tidak ditemukan.")
    return AlertOut.model_validate(alert)


@router.patch("/{alert_id}/acknowledge", response_model=AlertOut)
def acknowledge_alert(
    alert_id: int, payload: AlertAcknowledge, db: DbSession, user: CurrentUser
) -> AlertOut:
    alert = alert_repo.get_alert(db, alert_id)
    if alert is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Alert tidak ditemukan.")
    updated = acknowledge(db, alert, payload.acknowledged_by or user, payload.notes)
    return AlertOut.model_validate(updated)
