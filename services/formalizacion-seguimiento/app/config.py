from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    servicio: str = "formalizacion-seguimiento"
    requisito: str = "REQ-04"
    nombre: str = "Formalización contractual, asignación de insumos, dispersión financiera y seguimiento"
    database_url: str = "postgresql+asyncpg://fepi_formalizacion_seguimiento:fepi_dev_2026@localhost:5432/fepi_formalizacion_seguimiento"
    sync_database_url: str = "postgresql+psycopg://fepi_formalizacion_seguimiento:fepi_dev_2026@localhost:5432/fepi_formalizacion_seguimiento"
    redis_url: str = "redis://localhost:6379/0"
    interno_token: str = "fepi_interno_dev"


settings = Settings()
