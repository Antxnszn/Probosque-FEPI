# Formalización contractual, asignación de insumos, dispersión financiera y seguimiento

Servicio del macrorequerimiento **REQ-04**.

No importa código de la calculadora ni de los otros servicios del trámite. Su base es `fepi_formalizacion_seguimiento` y su usuario de ejecución es `fepi_formalizacion_seguimiento`.

## Rutas

| Método | Ruta | Respuesta |
|---|---|---|
| GET | `/health` | El servicio está arriba. Incluye si el bus Redis respondió. |
| cualquiera | `/api/formalizacion-seguimiento/v1/pendiente` | 501. No devuelve solicitudes ni dictámenes de ejemplo. |
| POST | `/interno/v1/bus/eco` | Publica un mensaje de prueba en Redis y lo lee de regreso. No está publicada en Nginx. |

## Arranque local

```bash
uv sync --directory services/formalizacion-seguimiento
uv run --directory services/formalizacion-seguimiento alembic upgrade head
uv run --directory services/formalizacion-seguimiento uvicorn app.main:app --reload --port 8014
uv run --directory services/formalizacion-seguimiento pytest
```

La migración crea solo `metadato_servicio`. No carga convocatorias, personas ni polígonos.
