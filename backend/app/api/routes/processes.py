"""Process, parameter, snapshot and history endpoints."""

from typing import Annotated

from fastapi import APIRouter, HTTPException, Query, status

from app.api.deps import CurrentProcess, CurrentUser, DbSession
from app.repositories import readings as reading_repo
from app.schemas import (
    Deviation,
    HistoryResponse,
    LatestSnapshot,
    ProcessOut,
    ProcessParameterOut,
    ProcessParameterUpdate,
)
from app.services.audit import log_event
from app.services.monitoring import build_history, build_latest_snapshot, current_deviations

router = APIRouter(prefix="/processes", tags=["process"])


@router.get("", response_model=list[ProcessOut])
def list_processes(db: DbSession) -> list[ProcessOut]:
    return [ProcessOut.model_validate(p) for p in reading_repo.list_processes(db)]


@router.get("/{process_id}", response_model=ProcessOut)
def get_process(process: CurrentProcess) -> ProcessOut:
    return ProcessOut.model_validate(process)


@router.get("/{process_id}/latest", response_model=LatestSnapshot)
def get_latest(process: CurrentProcess, db: DbSession) -> LatestSnapshot:
    return build_latest_snapshot(db, process)


@router.get("/{process_id}/parameters", response_model=list[ProcessParameterOut])
def get_parameters(process: CurrentProcess, db: DbSession) -> list[ProcessParameterOut]:
    return [
        ProcessParameterOut.model_validate(p) for p in reading_repo.get_parameters(db, process.id)
    ]


@router.patch("/{process_id}/parameters/{parameter_id}", response_model=ProcessParameterOut)
def update_parameter(
    process: CurrentProcess,
    parameter_id: int,
    payload: ProcessParameterUpdate,
    db: DbSession,
    user: CurrentUser,
) -> ProcessParameterOut:
    """Operating ranges are configuration, not code: editing one here changes
    how every deviation, alert and status badge is evaluated."""
    parameters = {p.id: p for p in reading_repo.get_parameters(db, process.id)}
    parameter = parameters.get(parameter_id)
    if parameter is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Parameter tidak ditemukan.")

    changes = payload.model_dump(exclude_unset=True, exclude_none=True)
    minimum = changes.get("minimum_value", parameter.minimum_value)
    maximum = changes.get("maximum_value", parameter.maximum_value)
    if minimum is not None and maximum is not None and minimum > maximum:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Nilai minimum tidak boleh lebih besar dari maksimum.",
        )

    for field, value in changes.items():
        setattr(parameter, field, value)

    log_event(
        db,
        action="configuration_changed",
        user_id=user,
        entity_type="process_parameter",
        entity_id=parameter.id,
        description=f"Rentang operasi {parameter.display_name} diperbarui.",
        metadata=changes,
        commit=False,
    )
    db.commit()
    db.refresh(parameter)
    return ProcessParameterOut.model_validate(parameter)


@router.get("/{process_id}/history", response_model=HistoryResponse)
def get_history(
    process: CurrentProcess,
    db: DbSession,
    range: Annotated[str, Query(pattern="^(1h|6h|24h|7d)$")] = "6h",
    parameters: Annotated[str | None, Query(description="Daftar parameter dipisah koma")] = None,
) -> HistoryResponse:
    selected = [p.strip() for p in parameters.split(",")] if parameters else None
    return build_history(db, process.id, range, selected)


@router.get("/{process_id}/deviations", response_model=list[Deviation])
def get_deviations(process: CurrentProcess, db: DbSession) -> list[Deviation]:
    return current_deviations(db, process.id)
