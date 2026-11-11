# Evaluación integral, dictaminación y asignación colegiada

Servicio del macrorequerimiento **REQ-03**.

No importa código de la calculadora ni de los otros servicios del trámite. Su base es `fepi_dictaminacion` y su usuario de ejecución es `fepi_dictaminacion`.

## Rutas

| Método | Ruta | Respuesta |
|---|---|---|
| GET | `/health` | El servicio está arriba. Incluye si el bus Redis respondió. |
| cualquiera | `/api/dictaminacion/v1/pendiente` | 501. No devuelve solicitudes ni dictámenes de ejemplo. |
| POST | `/interno/v1/bus/eco` | Publica un mensaje de prueba en Redis y lo lee de regreso. No está publicada en Nginx. |

## Arranque local

```bash
uv sync --directory services/dictaminacion
uv run --directory services/dictaminacion alembic upgrade head
uv run --directory services/dictaminacion uvicorn app.main:app --reload --port 8013
uv run --directory services/dictaminacion pytest
```

La migración crea solo `metadato_servicio`. No carga convocatorias, personas ni polígonos.
