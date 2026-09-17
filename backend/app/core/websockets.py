import json

from fastapi import WebSocket


class ConnectionManager:
    def __init__(self):
        self.active_connections: dict[int, list[WebSocket]] = {}

    async def connect(self, websocket: WebSocket, graph_id: int):
        await websocket.accept()
        if graph_id not in self.active_connections:
            self.active_connections[graph_id] = []
        self.active_connections[graph_id].append(websocket)

    def disconnect(self, websocket: WebSocket, graph_id: int):
        if graph_id in self.active_connections and websocket in self.active_connections[graph_id]:
            self.active_connections[graph_id].remove(websocket)
            if not self.active_connections[graph_id]:
                del self.active_connections[graph_id]

    async def broadcast(self, message: dict, graph_id: int):
        if graph_id in self.active_connections:
            text = json.dumps(message)
            for connection in list(self.active_connections[graph_id]):
                try:
                    await connection.send_text(text)
                except Exception:
                    self.disconnect(connection, graph_id)

manager = ConnectionManager()
