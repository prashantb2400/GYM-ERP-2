from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    SUPABASE_URL: str
    SUPABASE_SERVICE_ROLE_KEY: str
    SUPABASE_STORAGE_BUCKET: str = "gymerp"
    CCTV_AUTH_TOKEN: str
    PORT: int = 5001
    FACE_TOLERANCE: float = 0.5
    FRAME_SKIP: int = 3
    MAX_CAMERAS: int = 10
    SNAPSHOT_QUALITY: int = 85
    LOG_LEVEL: str = "INFO"

    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"

settings = Settings()
