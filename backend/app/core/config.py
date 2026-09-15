from pathlib import Path
import os
from pydantic_settings import BaseSettings, SettingsConfigDict

class Settings(BaseSettings):
    database_url: str = os.getenv("DATABASE_URL", "sqlite:///./graph2do.db")
    kinde_domain: str = os.getenv("KINDE_DOMAIN", "https://example.kinde.com")
    kinde_client_id: str = os.getenv("KINDE_CLIENT_ID", "mock_client_id")
    kinde_client_secret: str = os.getenv("KINDE_CLIENT_SECRET", "mock_client_secret")
    kinde_callback_url: str = os.getenv("KINDE_CALLBACK_URL", "http://localhost:8000/auth/callback")
    frontend_url: str = os.getenv("FRONTEND_URL", "http://localhost:3000")

    model_config = SettingsConfigDict(
        env_file=str(Path(__file__).parent.parent.parent / ".env"),
        env_file_encoding="utf-8",
        extra="ignore",
    )

settings = Settings()
