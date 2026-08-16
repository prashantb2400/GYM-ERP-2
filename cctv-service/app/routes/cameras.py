from fastapi import APIRouter, HTTPException, Depends, Request
from fastapi.responses import Response
from app.supabase_client import get_camera_configs
from app.onvif_discovery import discover_onvif_cameras
from app.camera_manager import CameraManager
import logging

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/cameras", tags=["cameras"])

def get_camera_manager(request: Request) -> CameraManager:
    return request.app.state.camera_manager

@router.get("")
def list_cameras():
    return get_camera_configs()

@router.post("/{camera_id}/start")
async def start_camera_stream(camera_id: str, request: Request, camera_manager: CameraManager = Depends(get_camera_manager)):
    configs = get_camera_configs()
    config = next((c for c in configs if str(c.get('id')) == camera_id), None)
    
    if not config:
        raise HTTPException(status_code=404, detail="Camera config not found")
        
    success = await camera_manager.start_camera(
        camera_id=str(config['id']),
        rtsp_url=config['rtsp_url'],
        camera_name=config.get('name', f"Camera {camera_id}"),
        location=config.get('location', 'Unknown')
    )
    
    if not success:
        raise HTTPException(status_code=500, detail="Failed to start camera")
        
    return {"status": "started", "camera_id": camera_id}

@router.post("/{camera_id}/stop")
async def stop_camera_stream(camera_id: str, camera_manager: CameraManager = Depends(get_camera_manager)):
    await camera_manager.stop_camera(camera_id)
    return {"status": "stopped", "camera_id": camera_id}

@router.get("/{camera_id}/snapshot")
async def get_camera_snapshot(camera_id: str, camera_manager: CameraManager = Depends(get_camera_manager)):
    snapshot_bytes = await camera_manager.get_snapshot(camera_id)
    if not snapshot_bytes:
        raise HTTPException(status_code=404, detail="Snapshot not available")
    return Response(content=snapshot_bytes, media_type="image/jpeg")

@router.post("/discover")
async def discover_cameras():
    cameras = await discover_onvif_cameras()
    return {"discovered": cameras}
