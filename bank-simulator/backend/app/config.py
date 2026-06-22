from pydantic_settings import BaseSettings
from typing import List
import os


class Settings(BaseSettings):
    # App
    app_name: str = "Bank Simulator API"
    version: str = "1.0.0"
    debug: bool = True
    environment: str = "development"
    log_level: str = "INFO"

    # MongoDB
    bank_mongo_uri: str
    bank_db_name: str

    # Redis
    redis_host: str
    redis_port: int
    redis_password: str
    bank_event_channel: str
    bank_transaction_channel: str
    bank_loan_channel: str
    bank_investment_channel: str

    # JWT
    jwt_secret_key: str
    jwt_algorithm: str
    jwt_access_token_expire_minutes: int
    jwt_refresh_token_expire_days: int

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
