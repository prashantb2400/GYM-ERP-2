import numpy as np
import face_recognition
import cv2
import base64
import io
from PIL import Image
from models.detection_event import FaceDetectionResult
import logging

logger = logging.getLogger(__name__)

class FaceEngine:
    def __init__(self, tolerance: float = 0.5):
        self.tolerance = tolerance
        self.known_encodings: dict[str, np.ndarray] = {}  # memberId -> encoding
        self.known_names: dict[str, str] = {}  # memberId -> memberName
    
    def load_encodings_from_dict(self, encodings: dict[str, np.ndarray]) -> None:
        self.known_encodings = encodings
        logger.info(f"Loaded {len(encodings)} encodings into memory")
        
    def add_encoding(self, member_id: str, member_name: str, encoding: np.ndarray) -> None:
        self.known_encodings[member_id] = encoding
        self.known_names[member_id] = member_name
        
    def remove_encoding(self, member_id: str) -> None:
        if member_id in self.known_encodings:
            del self.known_encodings[member_id]
        if member_id in self.known_names:
            del self.known_names[member_id]
            
    def process_frame(self, frame: np.ndarray) -> list[FaceDetectionResult]:
        # Resize frame to 1/4 size for faster face recognition processing
        small_frame = cv2.resize(frame, (0, 0), fx=0.25, fy=0.25)
        # Convert the image from BGR color (which OpenCV uses) to RGB color (which face_recognition uses)
        rgb_small_frame = np.ascontiguousarray(small_frame[:, :, ::-1])
        
        face_locations = face_recognition.face_locations(rgb_small_frame, model="hog")
        face_encodings = face_recognition.face_encodings(rgb_small_frame, face_locations)
        
        results = []
        
        known_ids = list(self.known_encodings.keys())
        known_encs = list(self.known_encodings.values())
        
        for (top, right, bottom, left), face_encoding in zip(face_locations, face_encodings):
            member_id = None
            member_name = None
            confidence = 0.0
            
            if known_encs:
                matches = face_recognition.compare_faces(known_encs, face_encoding, tolerance=self.tolerance)
                face_distances = face_recognition.face_distance(known_encs, face_encoding)
                
                best_match_index = np.argmin(face_distances)
                if matches[best_match_index]:
                    member_id = known_ids[best_match_index]
                    member_name = self.known_names.get(member_id, "Unknown")
                    # Convert distance to a confidence percentage
                    distance = face_distances[best_match_index]
                    confidence = max(0.0, 1.0 - distance)
            
            # Scale back up face locations since the frame we detected in was scaled to 1/4 size
            box = [top * 4, right * 4, bottom * 4, left * 4]
            results.append(FaceDetectionResult(
                member_id=member_id,
                member_name=member_name,
                confidence=float(confidence),
                box=box
            ))
            
        return results
    
    def encode_image(self, image_data: bytes) -> np.ndarray | None:
        try:
            image = Image.open(io.BytesIO(image_data))
            image = image.convert("RGB")
            np_img = np.array(image)
            
            face_locations = face_recognition.face_locations(np_img)
            if not face_locations:
                return None
            
            encodings = face_recognition.face_encodings(np_img, face_locations)
            if not encodings:
                return None
                
            return encodings[0]
        except Exception as e:
            logger.error(f"Error encoding image: {e}")
            return None
    
    def average_encodings(self, encodings: list[np.ndarray]) -> np.ndarray:
        return np.mean(encodings, axis=0)
    
    def encode_to_list(self, encoding: np.ndarray) -> list[float]:
        return encoding.tolist()
