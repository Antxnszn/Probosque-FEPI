# Subsistema PROBOSQUE (Módulo Especializado)

Este módulo contiene todas las capacidades operativas y científicas de PROBOSQUE dentro del monorepositorio FEPI:
- Auditorías forestales en campo y sincronización idempotente.
- Cálculo de biomasa y captura de carbono.
- Triaje satelital y modelos geoespaciales.
- Visor multitemporal de coberturas y transiciones de suelo (MapBiomas / INEGI).
- Motor de reglas de elegibilidad y decisión de subsidios.

## Estructura Interna del Módulo

- `backend/`: API FastAPI (Python 3.12) con soporte PostGIS, endpoints de auditoría, carbono, visor forestal y sincronización.
- `satellite/`: Paquete científico Python con algoritmos de estimación de carbono y triaje Sentinel-2.
- `pipelines/`: Ingestas de datos cartográficos, procesamiento por lotes de coberturas municipales y scripts de inicialización.
- `docs/`: Documentación metodológica, diccionarios de datos, protocolo de sincronización y reglas de negocio de PROBOSQUE.

## Ejecución Independiente y Pruebas

Cada componente gestiona sus dependencias de manera aislada utilizando `uv`.

### Backend
```bash
# Sincronizar dependencias
uv sync --locked --project modules/probosque/backend

# Ejecutar suite de pruebas (69 tests)
uv run --directory modules/probosque/backend pytest

# Ejecutar servidor de desarrollo local
uv run --directory modules/probosque/backend uvicorn app.main:app --reload --port 8000
```

### Paquete Satelital (satellite)
```bash
# Sincronizar dependencias
uv sync --locked --project modules/probosque/satellite

# Ejecutar suite de pruebas
uv run --directory modules/probosque/satellite pytest
```

### Ingestas y Tareas de Pipelines
```bash
# Inicialización de tablas y catálogos en base de datos
uv run --directory modules/probosque/backend python modules/probosque/pipelines/scripts/init_db_tables.py
```

## Contrato de Integración
El contrato OpenAPI oficial exportado para consumo de la plataforma principal y otros clientes se ubica en:
`contracts/probosque/openapi.json`.
