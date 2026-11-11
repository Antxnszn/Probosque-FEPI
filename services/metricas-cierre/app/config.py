from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    servicio: str = "metricas-cierre"
    requisito: str = "REQ-05"
    nombre: str = "Métricas de desempeño y cierre del programa"
    database_url: str = "postgresql+asyncpg://fepi_metricas_cierre:fepi_dev_2026@localhost:5432/fepi_metricas_cierre"
    sync_database_url: str = "postgresql+psycopg://fepi_metricas_cierre:fepi_dev_2026@localhost:5432/fepi_metricas_cierre"
    redis_url: str = "redis://localhost:6379/0"
    interno_token: str = "fepi_interno_dev"


settings = Settings()
