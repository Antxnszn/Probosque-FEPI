from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    servicio: str = "dictaminacion"
    requisito: str = "REQ-03"
    nombre: str = "Evaluación integral, dictaminación y asignación colegiada"
    database_url: str = "postgresql+asyncpg://fepi_dictaminacion:fepi_dev_2026@localhost:5432/fepi_dictaminacion"
    sync_database_url: str = "postgresql+psycopg://fepi_dictaminacion:fepi_dev_2026@localhost:5432/fepi_dictaminacion"
    redis_url: str = "redis://localhost:6379/0"
    interno_token: str = "fepi_interno_dev"


settings = Settings()
