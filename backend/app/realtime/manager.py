"""WebSocket fan-out.

The dashboard subscribes once and receives an event per new reading. If the
socket is unavailable the frontend falls back to polling, so this layer is an
optimisation, never a requirement.
"""

import asyncio
import json
import logging
from datetime import datetime
from typing import Any

from fastapi import WebSocket

logger = logging.getLogger(__name__)


def _default(value: Any) -> Any:
    if isinstance(value, datetime):
        return value.isoformat()
    raise TypeError(f"Tidak bisa serialisasi {type(value)}")


class ConnectionManager:
    def __init__(self) -> None:
        self._connections: set[WebSocket] = set()
        self._lock = asyncio.Lock()

    async def connect(self, websocket: WebSocket) -> None:
        await websocket.accept()
        async with self._lock:
            self._connections.add(websocket)
        logger.info("WebSocket terhubung (total=%s)", len(self._connections))

    async def disconnect(self, websocket: WebSocket) -> None:
        async with self._lock:
            self._connections.discard(websocket)

    @property
    def connection_count(self) -> int:
        return len(self._connections)

    async def broadcast(self, event: str, payload: dict[str, Any]) -> None:
        if not self._connections:
            return
        message = json.dumps({"event": event, "payload": payload}, default=_default)
        async with self._lock:
            targets = list(self._connections)
        stale: list[WebSocket] = []
        for websocket in targets:
            try:
                await websocket.send_text(message)
            except Exception:  # noqa: BLE001 - a dead socket must never break ingestion
                stale.append(websocket)
        if stale:
            async with self._lock:
                for websocket in stale:
                    self._connections.discard(websocket)


connection_manager = ConnectionManager()
