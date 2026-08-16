from fastapi import WebSocket
import logging
import json

logger = logging.getLogger(__name__)

class WebSocketManager:
    def __init__(self):
        self.active_connections: list[WebSocket] = []
    
    async def connect(self, websocket: WebSocket) -> None:
        await websocket.accept()
        self.active_connections.append(websocket)
        logger.info(f"WebSocket connected. Total connections: {len(self.active_connections)}")
        
    async def disconnect(self, websocket: WebSocket) -> None:
        if websocket in self.active_connections:
            self.active_connections.remove(websocket)
        logger.info(f"WebSocket disconnected. Total connections: {len(self.active_connections)}")
            
    async def broadcast(self, event: dict) -> None:
        # Convert dict to string to avoid serialization issues
        message = json.dumps(event)
        disconnected = []
        for connection in self.active_connections:
            try:
                await connection.send_text(message)
            except Exception as e:
                logger.error(f"Error sending message to ws: {e}")
                disconnected.append(connection)
                
        for conn in disconnected:
            await self.disconnect(conn)
            
    async def emit_attendance(self, member_id: str, member_name: str, photo_url: str, confidence: float, camera_id: str, snapshot_url: str) -> None:
        event = {
            "type": "attendance",
            "data": {
                "member_id": member_id,
                "member_name": member_name,
                "photo_url": photo_url,
                "confidence": confidence,
                "camera_id": camera_id,
                "snapshot_url": snapshot_url
            }
        }
        await self.broadcast(event)
        
    async def emit_unknown_face(self, camera_id: str, snapshot_url: str) -> None:
        event = {
            "type": "unknown_face",
            "data": {
                "camera_id": camera_id,
                "snapshot_url": snapshot_url
            }
        }
        await self.broadcast(event)
        
    async def emit_camera_status(self, camera_id: str, is_streaming: bool, fps: float) -> None:
        event = {
            "type": "camera_status",
            "data": {
                "camera_id": camera_id,
                "is_streaming": is_streaming,
                "fps": fps
            }
        }
        await self.broadcast(event)

ws_manager = WebSocketManager()
