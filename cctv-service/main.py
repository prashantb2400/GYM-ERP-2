import logging
from fastapi import FastAPI, Request, WebSocket, WebSocketDisconnect, Depends
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
import asyncio

from app.config import settings
from app.face_engine import FaceEngine
from app.supabase_client import load_face_encodings, get_camera_configs
from app.websocket_manager import ws_manager
from app.camera_manager import CameraManager
from app.routes import cameras, detection, enrolment

# Configure logging
logging.basicConfig(
    level=settings.LOG_LEVEL,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("Initializing CCTV Service...")
    
    # Initialize Face Engine and load encodings
    face_engine = FaceEngine(tolerance=settings.FACE_TOLERANCE)
    encodings = load_face_encodings()
    face_engine.load_encodings_from_dict(encodings)
    app.state.face_engine = face_engine
    
    # Initialize Camera Manager
    camera_manager = CameraManager(face_engine, ws_manager)
    app.state.camera_manager = camera_manager
    
    # Load and start cameras
    configs = get_camera_configs()
    for config in configs:
        await camera_manager.start_camera(
            camera_id=str(config['id']),
            rtsp_url=config['rtsp_url'],
            camera_name=config.get('name', f"Camera {config['id']}"),
            location=config.get('location', 'Unknown')
        )
        
    yield
    
    logger.info("Shutting down CCTV Service...")
    # Stop all cameras
    for camera_id in list(camera_manager.cameras.keys()):
        await camera_manager.stop_camera(camera_id)

app = FastAPI(title="GymERP CCTV Face Recognition Service", lifespan=lifespan)

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Authentication middleware for HTTP routes
@app.middleware("http")
async def auth_middleware(request: Request, call_next):
    # Allow docs, health, websocket without auth
    if request.url.path in ["/docs", "/openapi.json", "/health", "/ws"]:
        return await call_next(request)
        
    token = request.headers.get("Authorization")
    expected_token = f"Bearer {settings.CCTV_AUTH_TOKEN}"
    
    if token != expected_token and settings.CCTV_AUTH_TOKEN:
        from fastapi.responses import JSONResponse
        return JSONResponse(status_code=401, content={"detail": "Unauthorized"})
        
    response = await call_next(request)
    return response

# Include Routers
app.include_router(cameras.router)
app.include_router(detection.router)
app.include_router(enrolment.router)

@app.get("/health")
def health_check():
    return {"status": "ok"}

@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    await ws_manager.connect(websocket)
    try:
        while True:
            # We don't expect messages from client, just keep connection open
            await websocket.receive_text()
    except WebSocketDisconnect:
        await ws_manager.disconnect(websocket)

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=settings.PORT, reload=True)
