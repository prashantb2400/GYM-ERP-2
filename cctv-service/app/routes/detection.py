from fastapi import APIRouter, Depends, Request
from app.supabase_client import get_supabase
from app.camera_manager import CameraManager

router = APIRouter(prefix="/detection", tags=["detection"])

def get_camera_manager(request: Request) -> CameraManager:
    return request.app.state.camera_manager

@router.get("/logs")
def get_detection_logs(limit: int = 50):
    sb = get_supabase()
    res = sb.table("attendance").select("*").eq("method", "cctv").order("created_at", desc=True).limit(limit).execute()
    return {"logs": res.data}

@router.get("/status")
async def get_detection_status(camera_manager: CameraManager = Depends(get_camera_manager)):
    status_list = await camera_manager.get_all_status()
    return {"status": status_list}
