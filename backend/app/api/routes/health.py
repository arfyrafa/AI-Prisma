"""Health and system status."""

from datetime import datetime, timezone

from fastapi import APIRouter
from sqlalchemy import text

from app.api.deps import DbSession
from app.core.config import settings
from app.integrations.factory import get_agent_provider
from app.schemas import HealthResponse

router = APIRouter(tags=["system"])


@router.get("/health", response_model=HealthResponse)
def health(db: DbSession) -> HealthResponse:
    try:
        db.execute(text("SELECT 1"))
        database = "ok"
    except Exception:  # noqa: BLE001
        database = "unavailable"

    provider = get_agent_provider()
    return HealthResponse(
        status="ok" if database == "ok" else "degraded",
        database=database,
        agent_provider=provider.name,
        agent_available=provider.is_available(),
        predictive_provider=settings.PREDICTIVE_PROVIDER,
        simulation_mode=settings.SIMULATION_MODE,
        server_time=datetime.now(timezone.utc),
    )
