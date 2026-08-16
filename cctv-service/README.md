# GymERP CCTV Face Recognition Service

Standalone FastAPI microservice for CCTV RTSP streaming, face detection, and member recognition.

## Features
- Real-time RTSP stream processing
- Face recognition powered by `dlib` & `face_recognition`
- Supabase integration for attendance and encodings storage
- WebSocket events for live updates
- ONVIF WS-Discovery support

## Setup

1. Copy `.env.example` to `.env` and fill the variables.
2. Ensure you have CMake and build essentials installed for `dlib`.

### Local Development
```bash
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
uvicorn main:app --reload --port 5001
```

### Docker
```bash
docker build -t gymerp-cctv .
docker run -p 5001:5001 --env-file .env gymerp-cctv
```
