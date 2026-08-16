from pydantic import BaseModel
from typing import Optional

class CameraConfig(BaseModel):
    id: str
    name: str
    location: str
    rtsp_url: str

class CameraStatus(BaseModel):
    camera_id: str
    name: str
    is_streaming: bool
    fps: float
    error: Optional[str] = None

class DiscoveredCamera(BaseModel):
    ip: str
    rtsp_url: str
    model: str
    name: str
    onvif_url: str

class CameraStream(BaseModel):
    camera_id: str
    rtsp_url: str
    is_active: bool
