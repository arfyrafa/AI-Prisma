"""Real-time channel.

One event per new reading. The frontend degrades to polling when this socket
is not reachable, so nothing here is on the critical path.
"""

from fastapi import APIRouter, WebSocket, WebSocketDisconnect

from app.realtime import connection_manager

router = APIRouter()


@router.websocket("/ws")
async def process_stream(websocket: WebSocket) -> None:
    await connection_manager.connect(websocket)
    try:
        await websocket.send_json({"event": "connected", "payload": {"status": "ok"}})
        while True:
            # Keeps the connection open; inbound messages are used as pings.
            await websocket.receive_text()
    except WebSocketDisconnect:
        await connection_manager.disconnect(websocket)
    except Exception:  # noqa: BLE001
        await connection_manager.disconnect(websocket)
