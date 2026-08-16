from pydantic import BaseModel
from typing import Optional

class FaceDetectionResult(BaseModel):
    member_id: Optional[str]
    member_name: Optional[str]
    confidence: float
    box: list[int]  # [top, right, bottom, left]

class AttendanceEvent(BaseModel):
    member_id: str
    member_name: str
    photo_url: Optional[str]
    confidence: float
    camera_id: str
    snapshot_url: str
    timestamp: str

class UnknownFaceEvent(BaseModel):
    camera_id: str
    snapshot_url: str
    timestamp: str
