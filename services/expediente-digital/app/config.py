from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    servicio: str = "expediente-digital"
    requisito: str = "REQ-02"
    nombre: str = "Postulación, registro de solicitud y expediente digital"
    database_url: str = "postgresql+asyncpg://fepi_expediente_digital:fepi_dev_2026@localhost:5432/fepi_expediente_digital"
    sync_database_url: str = "postgresql+psycopg://fepi_expediente_digital:fepi_dev_2026@localhost:5432/fepi_expediente_digital"
    redis_url: str = "redis://localhost:6379/0"
    interno_token: str = "fepi_interno_dev"
    archivos_dir: str = "/var/probosque/tramite"


settings = Settings()
