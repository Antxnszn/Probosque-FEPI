# Plataforma FEPI - Monorepositorio Institucional

**FEPI** es la plataforma institucional para la gestión integral de programas de subsidios, expedientes administrativos, dictaminación, seguimiento, cierre y coordinación de operación en campo.

El repositorio alberga tanto la plataforma principal como los módulos especializados, entre ellos el subsistema **PROBOSQUE** (auditoría forestal offline-first, cálculo de biomasa y carbono, triaje satelital Sentinel-2 y visor multitemporal de coberturas).

---

## Estructura del Monorepositorio

```
FEPI/
├── apps/                         # Aplicaciones cliente (apps/web)
├── frontend/                     # Interfaz web y PWA actual
├── modules/
│   └── probosque/                # Subsistema especializado PROBOSQUE
│       ├── backend/              # API FastAPI y persistencia PostGIS
│       ├── satellite/            # Modelos científicos de carbono y triaje
│       ├── pipelines/            # Ingestas y procesamiento cartográfico
│       └── docs/                 # Documentación metodológica de campo
├── services/
│   └── platform-api/             # Backend principal de FEPI (FastAPI modular)
├── packages/
│   ├── session/                  # Gestión y provisión de identidad compartida
│   └── probosque-client/         # Cliente TypeScript para PROBOSQUE
├── contracts/
│   ├── probosque/                # Especificación OpenAPI (openapi.json)
│   ├── platform/                 # Contratos de la API principal
│   └── session/                  # Contratos de sesión y tokens
├── docs/                         # Portal de documentación del proyecto (MkDocs)
│   ├── architecture/             # Límites funcionales y decisiones (ADR)
│   ├── plans/
│   │   ├── active/               # Plan de reorganización y backlog vigente
│   │   └── archive/              # Historial de planes concluidos
│   └── walkthroughs/             # Evidencias de integración y verificación
├── infra/                        # Docker Compose y orquestación local
└── AGENTS.md                     # Convenciones de desarrollo y reglas del repo
```

---

## Ejecución Rápida y Pruebas

### 1. Infraestructura Local
Levanta los contenedores de PostgreSQL con PostGIS, Redis, MinIO y MkDocs:
```bash
docker compose -f infra/docker-compose.yml up -d
```

### 2. Subsistema PROBOSQUE (Backend y Satélite)
El módulo gestiona sus proyectos con `uv` de manera aislada:

```bash
# Backend de PROBOSQUE (69 tests unitarios y de integración)
uv run --directory modules/probosque/backend pytest
uv run --directory modules/probosque/backend uvicorn app.main:app --reload --port 8000

# Paquete satelital de carbono y triaje (6 tests)
uv run --directory modules/probosque/satellite pytest
```

### 3. Frontend Web y PWA
```bash
npm --prefix frontend install
npm --prefix frontend run dev
```

### 4. Portal de Documentación (MkDocs)
```bash
uv run --with mkdocs-material mkdocs serve
```
Disponible en: `http://localhost:8000` (o vía Docker en `http://localhost:8008`).

---

## Arquitectura y Límites de Dominio

Para detalles sobre la separación de responsabilidades y la gobernanza de datos entre la plataforma principal y los subsistemas especializados, consulta:
- [Límites Funcionales y Propiedad de Datos](docs/architecture/module-boundaries.md)
- [Plan Maestro de Reorganización](docs/plans/active/PLAN_REORGANIZACION_FEPI_MONOREPO.md)
- [Reglas del Repositorio y Convenciones](AGENTS.md)
