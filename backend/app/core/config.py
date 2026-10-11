import os
from typing import List, Optional
from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    # MongoDB
    MONGODB_URI: str = "mongodb://localhost:27017/pacebud"
    MONGODB_DB: str = "pacebud"

    # DigitalOcean Gemma LLM
    DIGITALOCEAN_GEMMA_ENDPOINT: Optional[str] = None
    DIGITALOCEAN_API_KEY: Optional[str] = None
    GEMMA_MODEL: str = "gemma-2-9b-it"

    # ElevenLabs TTS
    ELEVENLABS_API_KEY: Optional[str] = None
    ELEVENLABS_VOICE_ID: str = "21m00Tcm4TlvDq8ikWAM"

    # Temporal Settings
    USE_TEMPORAL: bool = False
    TEMPORAL_HOST: str = "localhost:7233"
    TEMPORAL_TASK_QUEUE: str = "pacebud-field-logs"

    # Server & CORS
    CORS_ORIGINS: str = "http://localhost:5173,http://127.0.0.1:5173"
    HOST: str = "0.0.0.0"
    PORT: int = 8000

    # Geolocation Defaults
    DEFAULT_LAT: float = 40.785091
    DEFAULT_LON: float = -73.968285

    # Demo User
    DEMO_USER_ID: str = "john-wick"
    DEMO_USER_NAME: str = "John Wick"

    @property
    def cors_origins_list(self) -> List[str]:
        return [origin.strip() for origin in self.CORS_ORIGINS.split(",") if origin.strip()]

    class Config:
        env_file = ".env"
        extra = "ignore"

settings = Settings()
