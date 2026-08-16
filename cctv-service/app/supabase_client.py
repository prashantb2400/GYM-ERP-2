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
        
        # Deduplication check
        existing = sb.table("attendance").select("id").eq("member_id", member_id).gte("created_at", today).execute()
        if existing.data and len(existing.data) > 0:
            return False  # Already recorded today
            
        # Insert
        sb.table("attendance").insert({
            "member_id": member_id,
            "camera_id": camera_id,
            "confidence": confidence,
            "snapshot_url": snapshot_url,
            "method": "cctv"
        }).execute()
        return True
    except Exception as e:
        logger.error(f"Error saving attendance: {e}")
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
