"""AI assistant chat endpoint."""

from datetime import datetime, timezone

from fastapi import APIRouter, HTTPException, status

from app.api.deps import DbSession
from app.integrations.agent.base import AgentUnavailableError
from app.schemas import ChatRequest, ChatResponse
from app.services import ai as ai_service

router = APIRouter(prefix="/agent", tags=["agent"])


@router.post("/chat", response_model=ChatResponse)
def chat(payload: ChatRequest, db: DbSession) -> ChatResponse:
    try:
        reply, source, related = ai_service.chat(
            db,
            payload.process_id,
            payload.message,
            [message.model_dump() for message in payload.history[-10:]],
        )
    except AgentUnavailableError as exc:
        # No silent fabrication: the UI shows an explicit unavailable state.
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="AI Agent sedang tidak tersedia. Pemantauan tetap berjalan normal.",
        ) from exc
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc)) from exc

    return ChatResponse(
        reply=reply,
        source=source,
        related_parameters=related or None,
        timestamp=datetime.now(timezone.utc),
    )
