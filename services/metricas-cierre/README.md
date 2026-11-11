# Métricas de desempeño y cierre del programa

Servicio del macrorequerimiento **REQ-05**.

No importa código de la calculadora ni de los otros servicios del trámite. Su base es `fepi_metricas_cierre` y su usuario de ejecución es `fepi_metricas_cierre`.

## Rutas

| Método | Ruta | Respuesta |
|---|---|---|
| GET | `/health` | El servicio está arriba. Incluye si el bus Redis respondió. |
| cualquiera | `/api/metricas-cierre/v1/pendiente` | 501. No devuelve solicitudes ni dictámenes de ejemplo. |
| POST | `/interno/v1/bus/eco` | Publica un mensaje de prueba en Redis y lo lee de regreso. No está publicada en Nginx. |

## Arranque local

```bash
uv sync --directory services/metricas-cierre
uv run --directory services/metricas-cierre alembic upgrade head
uv run --directory services/metricas-cierre uvicorn app.main:app --reload --port 8015
uv run --directory services/metricas-cierre pytest
```

La migración crea solo `metadato_servicio`. No carga convocatorias, personas ni polígonos.
