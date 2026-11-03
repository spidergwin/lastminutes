from typing import Optional
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    # Backing Services URLs
    database_url: str
    redis_addr: str = "redis:6379"
    redis_password: str = ""

    # AI Provider keys
    deepgram_api_key: Optional[str] = None
    assemblyai_api_key: Optional[str] = None
    deepseek_api_key: Optional[str] = None
    openai_api_key: Optional[str] = None

    # Model configuration
    whisper_model: str = "base"
    vad_threshold: float = 0.3

    # Load configuration from environment variables first, then fallback to env files
    model_config = SettingsConfigDict(
        env_file=".env", env_file_encoding="utf-8", extra="ignore"
    )


# Singleton configuration instance loaded and validated at startup
settings = Settings()
