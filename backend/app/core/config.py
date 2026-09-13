from pathlib import Path
import os
from pydantic_settings import BaseSettings, SettingsConfigDict

class Settings(BaseSettings):
    database_url: str
    kinde_domain: str
    kinde_client_id: str
    kinde_client_secret: str
    kinde_callback_url: str
    frontend_url: str = "http://localhost:3000"

    model_config = SettingsConfigDict(
        env_file=str(Path(__file__).parent.parent.parent / ".env"),
        env_file_encoding="utf-8",
        extra="ignore",
    )

settings = Settings()
