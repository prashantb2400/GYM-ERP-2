import json
import logging
from datetime import datetime, timezone
import numpy as np
from supabase import create_client, Client
from app.config import settings
import traceback

logger = logging.getLogger(__name__)

def get_supabase() -> Client:
    return create_client(settings.SUPABASE_URL, settings.SUPABASE_SERVICE_ROLE_KEY)

def save_attendance(member_id: str, camera_id: str, confidence: float, snapshot_url: str) -> bool:
    try:
        sb = get_supabase()
        today = datetime.now(timezone.utc).date().isoformat()
        
        # 1. Fetch member details
        mem_res = sb.table("members").select("id, gym_id, branch_id, name, status, expiry_date, phone").eq("id", member_id).maybe_single().execute()
        member = mem_res.data if mem_res else None
        if not member:
            return False
            
        gym_id = member.get("gym_id")
        member_name = member.get("name", "Member")
        branch_id = member.get("branch_id")
        
        # 2. Deduplication check
        existing = sb.table("attendance").select("id").eq("gym_id", gym_id).eq("member_id", member_id).eq("date", today).execute()
        if not (existing.data and len(existing.data) > 0):
            # Insert attendance
            sb.table("attendance").insert({
                "gym_id": gym_id,
                "member_id": member_id,
                "member_name": member_name,
                "date": today,
                "confidence": confidence,
                "snapshot_url": snapshot_url,
                "device_id": camera_id,
                "method": "cctv"
            }).execute()
            
        # 3. Check if member plan is expired -> log vigilance alert
        status = member.get("status")
        exp_date = member.get("expiry_date")
        is_expired = status == "expired" or (exp_date and exp_date < today)
        if is_expired:
            sb.table("vigilance_events").insert({
                "gym_id": gym_id,
                "branch_id": branch_id,
                "camera_id": camera_id,
                "event_type": "expired_member",
                "member_id": member_id,
                "member_name": member_name,
                "confidence": confidence,
                "snapshot_url": snapshot_url,
                "status": "unresolved",
                "metadata": {"phone": member.get("phone"), "expiry_date": exp_date}
            }).execute()
            
        return True
    except Exception as e:
        logger.error(f"Error saving attendance: {e}")
        return False

def save_unknown_visitor(camera_id: str, snapshot_url: str) -> bool:
    try:
        sb = get_supabase()
        cam_res = sb.table("cctv_cameras").select("id, gym_id, branch_id").eq("id", camera_id).maybe_single().execute()
        if not cam_res or not cam_res.data:
            return False
        cam = cam_res.data
        sb.table("vigilance_events").insert({
            "gym_id": cam.get("gym_id"),
            "branch_id": cam.get("branch_id"),
            "camera_id": camera_id,
            "event_type": "unknown_visitor",
            "snapshot_url": snapshot_url,
            "status": "unresolved"
        }).execute()
        return True
    except Exception as e:
        logger.error(f"Error saving unknown visitor: {e}")
        return False

def load_face_encodings() -> dict[str, np.ndarray]:
    sb = get_supabase()
    encodings = {}
    try:
        res = sb.storage.from_(settings.SUPABASE_STORAGE_BUCKET).list("encodings")
        for file in res:
            if file["name"].endswith(".json"):
                member_id = file["name"].replace(".json", "")
                data = sb.storage.from_(settings.SUPABASE_STORAGE_BUCKET).download(f"encodings/{file['name']}")
                encoding_list = json.loads(data)
                encodings[member_id] = np.array(encoding_list)
    except Exception as e:
        logger.error(f"Failed to load encodings: {e}")
    return encodings

def save_face_encoding(member_id: str, encoding: np.ndarray) -> bool:
    try:
        sb = get_supabase()
        encoding_list = encoding.tolist()
        data = json.dumps(encoding_list).encode('utf-8')
        path = f"encodings/{member_id}.json"
        
        # Check if exists to update or upload
        files = sb.storage.from_(settings.SUPABASE_STORAGE_BUCKET).list("encodings")
        exists = any(f["name"] == f"{member_id}.json" for f in files)
        
        if exists:
            sb.storage.from_(settings.SUPABASE_STORAGE_BUCKET).update(path, data, {"content-type": "application/json"})
        else:
            sb.storage.from_(settings.SUPABASE_STORAGE_BUCKET).upload(path, data, {"content-type": "application/json"})
        return True
    except Exception as e:
        logger.error(f"Error saving face encoding: {e}")
        traceback.print_exc()
        return False

def delete_face_encoding(member_id: str) -> bool:
    try:
        sb = get_supabase()
        sb.storage.from_(settings.SUPABASE_STORAGE_BUCKET).remove([f"encodings/{member_id}.json"])
        return True
    except Exception as e:
        logger.error(f"Error deleting encoding: {e}")
        return False

def get_camera_configs() -> list[dict]:
    try:
        sb = get_supabase()
        res = sb.table("cctv_cameras").select("*").execute()
        return res.data
    except Exception as e:
        logger.error(f"Failed to get camera configs: {e}")
        return []
