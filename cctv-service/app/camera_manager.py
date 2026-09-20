import asyncio
import cv2
import logging
import time
from typing import Optional
from app.face_engine import FaceEngine
from app.websocket_manager import WebSocketManager
from app.supabase_client import save_attendance, save_unknown_visitor, get_supabase
from app.config import settings
from models.camera import CameraStatus, CameraStream
import base64

logger = logging.getLogger(__name__)

class CameraManager:
    def __init__(self, face_engine: FaceEngine, ws_manager: WebSocketManager):
        self.face_engine = face_engine
        self.ws_manager = ws_manager
        self.cameras: dict[str, CameraStream] = {}
        self.tasks: dict[str, asyncio.Task] = {}
        self.snapshots: dict[str, bytes] = {}
        self.status: dict[str, CameraStatus] = {}
        self.frame_skip = settings.FRAME_SKIP
    
    async def start_camera(self, camera_id: str, rtsp_url: str, camera_name: str, location: str) -> bool:
        if camera_id in self.cameras:
            logger.warning(f"Camera {camera_id} already running.")
            return True
            
        self.cameras[camera_id] = CameraStream(camera_id=camera_id, rtsp_url=rtsp_url, is_active=True)
        self.status[camera_id] = CameraStatus(camera_id=camera_id, name=camera_name, is_streaming=False, fps=0.0)
        
        task = asyncio.create_task(self._process_stream(camera_id, rtsp_url, camera_name))
        self.tasks[camera_id] = task
        logger.info(f"Started camera task for {camera_id}")
        return True
        
    async def stop_camera(self, camera_id: str) -> None:
        if camera_id in self.cameras:
            self.cameras[camera_id].is_active = False
            task = self.tasks.get(camera_id)
            if task:
                task.cancel()
            del self.cameras[camera_id]
            del self.tasks[camera_id]
            del self.status[camera_id]
            logger.info(f"Stopped camera {camera_id}")
            
    async def get_snapshot(self, camera_id: str) -> Optional[bytes]:
        return self.snapshots.get(camera_id)
        
    async def get_all_status(self) -> list[CameraStatus]:
        return list(self.status.values())
        
    def _upload_snapshot(self, camera_id: str, frame) -> str:
        try:
            _, buffer = cv2.imencode('.jpg', frame, [int(cv2.IMWRITE_JPEG_QUALITY), settings.SNAPSHOT_QUALITY])
            image_bytes = buffer.tobytes()
            
            filename = f"snapshots/{camera_id}_{int(time.time())}.jpg"
            sb = get_supabase()
            sb.storage.from_(settings.SUPABASE_STORAGE_BUCKET).upload(filename, image_bytes, {"content-type": "image/jpeg"})
            
            # Get public url
            res = sb.storage.from_(settings.SUPABASE_STORAGE_BUCKET).get_public_url(filename)
            return res
        except Exception as e:
            logger.error(f"Failed to upload snapshot: {e}")
            return ""
            
    async def _process_stream(self, camera_id: str, rtsp_url: str, camera_name: str):
        cap = None
        while self.cameras.get(camera_id) and self.cameras[camera_id].is_active:
            try:
                cap = cv2.VideoCapture(rtsp_url)
                if not cap.isOpened():
                    self.status[camera_id].error = "Failed to open stream"
                    self.status[camera_id].is_streaming = False
                    await self.ws_manager.emit_camera_status(camera_id, False, 0.0)
                    await asyncio.sleep(10)
                    continue
                    
                self.status[camera_id].error = None
                self.status[camera_id].is_streaming = True
                
                frame_count = 0
                fps_start_time = time.time()
                frames_processed = 0
                
                while cap.isOpened() and self.cameras.get(camera_id) and self.cameras[camera_id].is_active:
                    ret, frame = cap.read()
                    if not ret:
                        logger.warning(f"Stream dropped for {camera_id}, reconnecting...")
                        break
                        
                    frame_count += 1
                    frames_processed += 1
                    
                    # Store latest snapshot periodically
                    if frame_count % 30 == 0:
                        _, buffer = cv2.imencode('.jpg', frame, [int(cv2.IMWRITE_JPEG_QUALITY), 60])
                        self.snapshots[camera_id] = buffer.tobytes()
                    
                    # Update FPS
                    if time.time() - fps_start_time > 5.0:
                        fps = frames_processed / (time.time() - fps_start_time)
                        self.status[camera_id].fps = round(fps, 1)
                        frames_processed = 0
                        fps_start_time = time.time()
                        await self.ws_manager.emit_camera_status(camera_id, True, round(fps, 1))
                        
                    # Process face detection every FRAME_SKIP frames
                    if frame_count % self.frame_skip == 0:
                        results = self.face_engine.process_frame(frame)
                        
                        for res in results:
                            if res.member_id:
                                # Known face
                                snapshot_url = self._upload_snapshot(camera_id, frame)
                                saved = save_attendance(res.member_id, camera_id, res.confidence, snapshot_url)
                                if saved:
                                    await self.ws_manager.emit_attendance(
                                        member_id=res.member_id,
                                        member_name=res.member_name or "Unknown",
                                        photo_url="", # could fetch from db
                                        confidence=res.confidence,
                                        camera_id=camera_id,
                                        snapshot_url=snapshot_url
                                    )
                            else:
                                # Unknown face
                                snapshot_url = self._upload_snapshot(camera_id, frame)
                                save_unknown_visitor(camera_id, snapshot_url)
                                await self.ws_manager.emit_unknown_face(camera_id, snapshot_url)
                                
                    await asyncio.sleep(0.01) # Yield to event loop
                    
            except Exception as e:
                logger.error(f"Error in stream processing {camera_id}: {e}")
            finally:
                if cap:
                    cap.release()
                self.status[camera_id].is_streaming = False
                await self.ws_manager.emit_camera_status(camera_id, False, 0.0)
                await asyncio.sleep(5) # wait before reconnect
