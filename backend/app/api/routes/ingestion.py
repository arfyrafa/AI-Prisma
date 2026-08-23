"""Ingestion endpoint for external sensors, DCS gateways, CSV batch upload or the AI agent."""

import asyncio
from datetime import datetime

from fastapi import APIRouter, HTTPException, status

from app.api.deps import DbSession
from app.realtime import connection_manager
from app.repositories import readings as reading_repo
from app.schemas import (
    AlertOut,
    BatchIngestionPayload,
    BatchIngestionResponse,
    Deviation,
    IngestionResponse,
    SensorIngestionPayload,
    SensorReadingOut,
)
from app.services.monitoring import record_reading

router = APIRouter(prefix="/ingestion", tags=["ingestion"])


@router.post("/sensor", response_model=IngestionResponse, status_code=status.HTTP_201_CREATED)
async def ingest_sensor_reading(payload: SensorIngestionPayload, db: DbSession) -> IngestionResponse:
    process = reading_repo.get_process(db, payload.process_id)
    if process is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Proses tidak ditemukan.")

    reading, deviations, created = await asyncio.to_thread(
        record_reading,
        db,
        payload.process_id,
        payload.parameters,
        payload.timestamp,
        payload.source,
    )

    reading_out = SensorReadingOut.model_validate(reading)
    alerts_out = [AlertOut.model_validate(alert) for alert in created]
    deviations_out = [Deviation.model_validate(item) for item in deviations]

    await connection_manager.broadcast(
        "reading",
        {
            "reading": reading_out.model_dump(),
            "deviations": [item.model_dump() for item in deviations_out],
            "alerts": [alert.model_dump() for alert in alerts_out],
            "phase": "external",
        },
    )
    for alert in alerts_out:
        await connection_manager.broadcast("alert", alert.model_dump())

    return IngestionResponse(
        reading=reading_out, deviations=deviations_out, alerts_created=alerts_out
    )


@router.post("/batch", response_model=BatchIngestionResponse, status_code=status.HTTP_201_CREATED)
async def ingest_batch_readings(payload: BatchIngestionPayload, db: DbSession) -> BatchIngestionResponse:
    process = reading_repo.get_process(db, payload.process_id)
    if process is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Proses tidak ditemukan.")

    total_alerts = 0
    latest_reading_obj = None

    for item in payload.items:
        ts = item.get("timestamp")
        ts_parsed = datetime.fromisoformat(ts) if isinstance(ts, str) and ts else None
        vals = {k: float(v) for k, v in item.items() if k != "timestamp" and v is not None and v != ""}
        if vals:
            reading, deviations, created = await asyncio.to_thread(
                record_reading,
                db,
                payload.process_id,
                vals,
                ts_parsed,
                payload.source,
            )
            total_alerts += len(created)
            latest_reading_obj = reading

    latest_out = SensorReadingOut.model_validate(latest_reading_obj) if latest_reading_obj else None

    return BatchIngestionResponse(
        processed_count=len(payload.items),
        alerts_created_count=total_alerts,
        latest_reading=latest_out,
    )
