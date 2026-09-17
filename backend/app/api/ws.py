import jwt
from fastapi import (
    APIRouter,
    Depends,
    HTTPException,
    Query,
    WebSocket,
    WebSocketDisconnect,
)
from fastapi.concurrency import run_in_threadpool
from sqlalchemy.orm import Session

from app.api.auth import jwks_client, settings
from app.api.nodes import check_graph_access
from app.core.websockets import manager
from app.db.database import get_db

router = APIRouter()


@router.websocket("/ws/{graph_id}")
async def websocket_endpoint(
    websocket: WebSocket,
    graph_id: int,
    token: str = Query(..., description="JWT token for Auth"),
    db: Session = Depends(get_db),
):
    try:
        signing_key = await run_in_threadpool(
            jwks_client.get_signing_key_from_jwt, token
        )
        payload = jwt.decode(
            token,
            signing_key.key,
            algorithms=["RS256"],
            audience=settings.kinde_client_id,
        )
        user_id = payload["sub"]
    except Exception:
        await websocket.close(code=1008)
        return

    try:
        await run_in_threadpool(check_graph_access, db, graph_id, user_id)
    except HTTPException:
        await websocket.close(code=1008)
        return

    await manager.connect(websocket, graph_id)
    try:
        while True:
            await websocket.receive_text()
    except WebSocketDisconnect:
        manager.disconnect(websocket, graph_id)
