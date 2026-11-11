# Publicación y consulta de convocatorias

Servicio del macrorequerimiento **REQ-01**.

No importa código de la calculadora ni de los otros servicios del trámite. Su base es `fepi_convocatorias` y su usuario de ejecución es `fepi_convocatorias`.

## Rutas

| Método | Ruta | Respuesta |
|---|---|---|
| GET | `/health` | El servicio está arriba. Incluye si el bus Redis respondió. |
| cualquiera | `/api/convocatorias/v1/pendiente` | 501. No devuelve solicitudes ni dictámenes de ejemplo. |
| POST | `/interno/v1/bus/eco` | Publica un mensaje de prueba en Redis y lo lee de regreso. No está publicada en Nginx. |

## Arranque local

```bash
uv sync --directory services/convocatorias
uv run --directory services/convocatorias alembic upgrade head
uv run --directory services/convocatorias uvicorn app.main:app --reload --port 8011
uv run --directory services/convocatorias pytest
```

La migración crea solo `metadato_servicio`. No carga convocatorias, personas ni polígonos.
