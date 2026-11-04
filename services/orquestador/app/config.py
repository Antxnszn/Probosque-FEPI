from datetime import date

from pydantic import field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    servicio: str = "orquestador"
    nombre: str = "Orquestador del trámite"
    database_url: str = "postgresql+asyncpg://fepi_orquestador:fepi_dev_2026@localhost:5432/fepi_orquestador"
    sync_database_url: str = "postgresql+psycopg://fepi_orquestador:fepi_dev_2026@localhost:5432/fepi_orquestador"
    redis_url: str = "redis://localhost:6379/0"
    secreto: str = "fepi_tramite_dev"
    interno_token: str = "fepi_interno_dev"
    visor_url: str = "http://127.0.0.1:8000"
    fecha_operacion: date | None = None
    convocatorias_url: str = "http://127.0.0.1:8011"
    expediente_digital_url: str = "http://127.0.0.1:8012"
    dictaminacion_url: str = "http://127.0.0.1:8013"
    formalizacion_seguimiento_url: str = "http://127.0.0.1:8014"
    metricas_cierre_url: str = "http://127.0.0.1:8015"

    @field_validator("fecha_operacion", mode="before")
    @classmethod
    def fecha_vacia(cls, value: object) -> object:
        if value is None or value == "":
            return None
        return value


settings = Settings()
