import logging
import time
import traceback
from datetime import datetime, timezone

from fastapi import APIRouter, HTTPException, status

from typing import Any
from sqlalchemy import select
from app.api.deps import DbSession
from app.integrations.agent.base import AgentUnavailableError
from app.models.ai import ChatMessageRecord
from app.schemas import ChatMessageRecordOut, ChatRequest, ChatResponse
from app.services import ai as ai_service

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/agent", tags=["agent"])


@router.get("/chat/history", response_model=list[ChatMessageRecordOut])
def get_chat_history(
    user_id: str = "operator@prisma.ai",
    process_id: int = 1,
    limit: int = 50,
    db: DbSession = None,
) -> list[ChatMessageRecordOut]:
    """Retrieves chat message history stored in database for a specific user account."""
    stmt = (
        select(ChatMessageRecord)
        .where(
            ChatMessageRecord.user_id == user_id,
            ChatMessageRecord.process_id == process_id,
        )
        .order_by(ChatMessageRecord.created_at.asc())
        .limit(limit)
    )
    rows = list(db.scalars(stmt).all())
    return [ChatMessageRecordOut.model_validate(r) for r in rows]


@router.delete("/chat/history")
def clear_chat_history(
    user_id: str = "operator@prisma.ai",
    process_id: int = 1,
    db: DbSession = None,
) -> dict[str, Any]:
    """Clears all chat history for a specific user account."""
    deleted = (
        db.query(ChatMessageRecord)
        .filter(
            ChatMessageRecord.user_id == user_id,
            ChatMessageRecord.process_id == process_id,
        )
        .delete(synchronize_session="fetch")
    )
    db.commit()
    return {"success": True, "deleted_count": deleted}


@router.post("/chat", response_model=ChatResponse)
def chat(payload: ChatRequest, db: DbSession) -> ChatResponse:
    t0 = time.perf_counter()

    # Save user message to database
    try:
        user_msg = ChatMessageRecord(
            user_id=payload.user_id,
            process_id=payload.process_id,
            role="user",
            content=payload.message,
        )
        db.add(user_msg)
        db.commit()
    except Exception as e:
        logger.warning("Failed saving user message to database: %s", e)
        db.rollback()

    try:
        reply, source, related = ai_service.chat(
            db,
            payload.process_id,
            payload.message,
            [message.model_dump() for message in payload.history[-10:]],
        )
    except Exception as exc:
        logger.error("Error during AI chat: %s\n%s", exc, traceback.format_exc())
        latency_ms = int((time.perf_counter() - t0) * 1000)
        err_reply = f"**[Pemberitahuan Sistem AI Agent]**\n\nTerjadi kendala saat memproses jawaban:\n`{exc}`"
        try:
            bot_msg = ChatMessageRecord(
                user_id=payload.user_id,
                process_id=payload.process_id,
                role="assistant",
                content=err_reply,
                source="system-diagnostic",
                latency_ms=latency_ms,
            )
            db.add(bot_msg)
            db.commit()
        except Exception:
            db.rollback()

        return ChatResponse(
            reply=err_reply,
            source="system-diagnostic",
            related_parameters=None,
            timestamp=datetime.now(timezone.utc),
            latency_ms=latency_ms,
        )

    latency_ms = int((time.perf_counter() - t0) * 1000)

    # Save assistant reply to database
    try:
        bot_msg = ChatMessageRecord(
            user_id=payload.user_id,
            process_id=payload.process_id,
            role="assistant",
            content=reply,
            source=source,
            latency_ms=latency_ms,
        )
        db.add(bot_msg)
        db.commit()
    except Exception as e:
        logger.warning("Failed saving assistant reply to database: %s", e)
        db.rollback()

    return ChatResponse(
        reply=reply,
        source=source,
        related_parameters=related or None,
        timestamp=datetime.now(timezone.utc),
        latency_ms=latency_ms,
    )
