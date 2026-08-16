from fastapi import APIRouter, HTTPException, Request, Depends
from pydantic import BaseModel
import base64
from app.supabase_client import save_face_encoding, delete_face_encoding, get_supabase
from app.face_engine import FaceEngine
import logging

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/enrol", tags=["enrolment"])

class EnrolmentRequest(BaseModel):
    member_id: str
    member_name: str
    images: list[str]  # list of base64 encoded strings

def get_face_engine(request: Request) -> FaceEngine:
    return request.app.state.face_engine

@router.post("")
async def enrol_member(req: EnrolmentRequest, face_engine: FaceEngine = Depends(get_face_engine)):
    if len(req.images) < 1:
        raise HTTPException(status_code=400, detail="At least one image is required")
        
    encodings = []
    for img_str in req.images:
        try:
            # handle 'data:image/jpeg;base64,' prefix if present
            if "," in img_str:
                img_str = img_str.split(",")[1]
            img_bytes = base64.b64decode(img_str)
            encoding = face_engine.encode_image(img_bytes)
            if encoding is not None:
                encodings.append(encoding)
        except Exception as e:
            logger.error(f"Failed to process image for enrolment: {e}")
            
    if not encodings:
        raise HTTPException(status_code=400, detail="No faces found in provided images")
        
    avg_encoding = face_engine.average_encodings(encodings)
    
    # Save to Supabase Storage
    success = save_face_encoding(req.member_id, avg_encoding)
    if not success:
        raise HTTPException(status_code=500, detail="Failed to save encoding to storage")
        
    # Update local memory
    face_engine.add_encoding(req.member_id, req.member_name, avg_encoding)
    
    return {"status": "success", "message": f"Successfully enrolled {req.member_name} with {len(encodings)} valid faces."}

@router.delete("/{member_id}")
async def delete_enrolment(member_id: str, face_engine: FaceEngine = Depends(get_face_engine)):
    success = delete_face_encoding(member_id)
    if success:
        face_engine.remove_encoding(member_id)
        return {"status": "success", "message": f"Removed encoding for {member_id}"}
    raise HTTPException(status_code=500, detail="Failed to delete encoding")

@router.get("/{member_id}/status")
def get_enrolment_status(member_id: str, request: Request):
    face_engine: FaceEngine = request.app.state.face_engine
    is_enrolled = member_id in face_engine.known_encodings
    return {"member_id": member_id, "is_enrolled": is_enrolled}
