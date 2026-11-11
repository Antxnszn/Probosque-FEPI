# Orquestador del trámite

Puerta del trámite para el navegador. Identifica el paso y llama al servicio dueño. No guarda convocatorias, expedientes, dictámenes, polígonos ni pagos.

Su base `fepi_orquestador` está reservada para la identidad y los avisos. En esta fase la migración solo crea `metadato_servicio`. Crear una cuenta responde 501.

## Rutas

| Método | Ruta | Respuesta |
|---|---|---|
| GET | `/health` | El orquestador está arriba. |
| GET | `/api/tramite/v1/salud` | Pregunta `/health` a los cinco servicios y al visor. Si uno no responde, lo marca no disponible. |
| GET | `/api/tramite/v1/fecha-operacion` | Fecha configurada o, si no hay, la del reloj. |
| POST | `/api/tramite/v1/bus/prueba` | Publica y lee un mensaje en Redis, y pide el mismo eco a cada servicio del trámite. |
| cualquiera | `/api/tramite/v1/cuentas` y el resto | 501. |

## Arranque local

```bash
uv sync --directory services/orquestador
uv run --directory services/orquestador alembic upgrade head
uv run --directory services/orquestador uvicorn app.main:app --reload --port 8010
uv run --directory services/orquestador pytest
```
