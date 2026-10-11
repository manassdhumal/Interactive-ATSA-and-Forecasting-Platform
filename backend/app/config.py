import os
from pydantic import BaseModel

class Settings(BaseModel):
    APP_NAME: str = "Chronos — Interactive Advanced Time Series Analysis & Forecasting Platform"
    API_PREFIX: str = "/api"
    DEBUG: bool = True
    MAX_UPLOAD_SIZE_MB: int = 25
    CORS_ORIGINS: list[str] = ["http://localhost:5173", "http://localhost:3000", "http://127.0.0.1:5173", "*"]

settings = Settings()
