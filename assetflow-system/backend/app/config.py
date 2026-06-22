from pydantic_settings import BaseSettings
from typing import List
import os


class Settings(BaseSettings):
    app_name: str = "AssetFlow Management System API"
    version: str = "1.0.0"
    debug: bool = True

    # MongoDB
    assetflow_mongo_uri: str
    assetflow_db_name: str

    # JWT
    jwt_secret_key: str
    jwt_algorithm: str
    jwt_access_token_expire_minutes: int
    jwt_refresh_token_expire_days: int

    # Service URLs
    ml_service_url: str = "http://localhost:8005"
    ai_service_url: str = "http://localhost:8006"
    tax_service_url: str = "http://localhost:8007"
    notification_service_url: str = "http://localhost:8008"

    # Redis
    redis_host: str
    redis_port: int
    redis_password: str

    # CORS
    allowed_origins: str

    @property
    def cors_origins(self) -> List[str]:
        return [o.strip() for o in self.allowed_origins.split(",")]

    class Config:
        # Load .env from the root of the project
        env_file = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(__file__)))), ".env")
        extra = "ignore"


settings = Settings()
