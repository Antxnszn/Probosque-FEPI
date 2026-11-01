from pydantic_settings import BaseSettings, SettingsConfigDict
from typing import Optional


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=("../../../.env", "../../.env", "../.env", ".env"),
        env_file_encoding="utf-8",
        extra="ignore"
    )

    # Project metadata
    PROJECT_NAME: str = "Probosque Forest Audit & Subsidy System"
    API_V1_STR: str = "/api/v1"

    # Database
    POSTGRES_USER: str = "probosque"
    POSTGRES_PASSWORD: str = "probosque_secret_2026"
    POSTGRES_DB: str = "probosque_db"
    POSTGRES_HOST: str = "localhost"
    POSTGRES_PORT: int = 5432
    DATABASE_URL: str = "postgresql+asyncpg://probosque:probosque_secret_2026@localhost:5432/probosque_db"
    SYNC_DATABASE_URL: str = "postgresql+psycopg2://probosque:probosque_secret_2026@localhost:5432/probosque_db"

    # Redis & Celery
    REDIS_HOST: str = "localhost"
    REDIS_PORT: int = 6379
    REDIS_URL: str = "redis://localhost:6379/0"
    CELERY_BROKER_URL: str = "redis://localhost:6379/0"
    CELERY_RESULT_BACKEND: str = "redis://localhost:6379/0"

    # MinIO / Object Storage
    MINIO_ENDPOINT: str = "localhost:9000"
    MINIO_PORT: int = 9000
    MINIO_CONSOLE_PORT: int = 9001
    MINIO_ROOT_USER: str = "probosque_admin"
    MINIO_ROOT_PASSWORD: str = "probosque_minio_pass_2026"
    MINIO_BUCKET_NAME: str = "probosque-evidence"
    MINIO_USE_SSL: bool = False

    # Security
    SECRET_KEY: str = "probosque_super_secret_jwt_key_development_only_change_in_production_2026"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24  # 24 hours

    # Methodologies
    METHODOLOGY_VERSION: str = "SAMPLING-1.0"
    CALCULATOR_VERSION: str = "CALC-1.0"
    RULES_VERSION: str = "RULES-1.0"
    TRIAGE_METHODOLOGY_VERSION: str = "TRIAGE-1.0"
    CARBON_METHODOLOGY_VERSION: str = "CARBON-1.0"


settings = Settings()
