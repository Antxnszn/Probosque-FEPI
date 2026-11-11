# Postulación, registro de solicitud y expediente digital

Servicio del macrorequerimiento **REQ-02**.

No importa código de la calculadora ni de los otros servicios del trámite. Su base es `fepi_expediente_digital` y su usuario de ejecución es `fepi_expediente_digital`.

## Rutas

| Método | Ruta | Respuesta |
|---|---|---|
| GET | `/health` | El servicio está arriba. Incluye si el bus Redis respondió. |
| cualquiera | `/api/expediente-digital/v1/pendiente` | 501. No devuelve solicitudes ni dictámenes de ejemplo. |
| POST | `/interno/v1/bus/eco` | Publica un mensaje de prueba en Redis y lo lee de regreso. No está publicada en Nginx. |

## Arranque local

```bash
uv sync --directory services/expediente-digital
uv run --directory services/expediente-digital alembic upgrade head
uv run --directory services/expediente-digital uvicorn app.main:app --reload --port 8012
uv run --directory services/expediente-digital pytest
```

La migración crea solo `metadato_servicio`. No carga convocatorias, personas ni polígonos.
