import time

from fastapi import APIRouter, HTTPException, status

from app.api.deps import DbSession
from app.integrations.agent.base import AgentUnavailableError
from app.schemas import ChatRequest, ChatResponse
from app.services import ai as ai_service

router = APIRouter(prefix="/agent", tags=["agent"])


@router.post("/chat", response_model=ChatResponse)
def chat(payload: ChatRequest, db: DbSession) -> ChatResponse:
    t0 = time.perf_counter()
    try:
        reply, source, related = ai_service.chat(
            db,
            payload.process_id,
            payload.message,
            [message.model_dump() for message in payload.history[-10:]],
        )
    except Exception as exc:
        latency_ms = int((time.perf_counter() - t0) * 1000)
        return ChatResponse(
            reply=f"**[Pemberitahuan Sistem AI Agent]**\n\nTerjadi kendala koneksi ke model LLM:\n`{exc}`\n\nSilakan periksa apakah service 9Router/OpenClaw aktif di VPS (port 2026).",
            source="system-diagnostic",
            related_parameters=None,
            timestamp=datetime.now(timezone.utc),
            latency_ms=latency_ms,
        )

    latency_ms = int((time.perf_counter() - t0) * 1000)

    return ChatResponse(
        reply=reply,
        source=source,
        related_parameters=related or None,
        timestamp=datetime.now(timezone.utc),
        latency_ms=latency_ms,
    )
