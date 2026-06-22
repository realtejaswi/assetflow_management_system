from pydantic_settings import BaseSettings
from typing import List
import os


class Settings(BaseSettings):
    app_name: str = "AssetFlow Consumer Service"
    version: str = "1.0.0"

    # MongoDB
    assetflow_mongo_uri: str
    assetflow_db_name: str

    # Redis
    redis_host: str
    redis_port: int
    redis_password: str

    # Channels to subscribe
    bank_event_channel: str
    bank_transaction_channel: str
    bank_loan_channel: str
    bank_investment_channel: str

    # AssetFlow services
    ml_service_url: str = "http://localhost:8005"
    ai_service_url: str = "http://localhost:8006"

    class Config:
        # Load .env from the root of the project
        env_file = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(__file__)))), ".env")
        extra = "ignore"


settings = Settings()
