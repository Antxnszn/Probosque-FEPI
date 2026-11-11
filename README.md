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
│   ├── orquestador/              # Puerta del trámite
│   ├── convocatorias/            # REQ-01 Publicación y consulta de convocatorias
│   ├── expediente-digital/       # REQ-02 Postulación, solicitud y expediente digital
│   ├── dictaminacion/            # REQ-03 Evaluación, dictaminación y asignación colegiada
│   ├── formalizacion-seguimiento/# REQ-04 Formalización, insumos, dispersión y seguimiento
│   ├── metricas-cierre/          # REQ-05 Métricas de desempeño y cierre
│   └── platform-api/             # Esqueleto anterior, ya no es el trámite
├── packages/
│   ├── session/                  # Gestión y provisión de identidad compartida
│   └── probosque-client/         # Cliente TypeScript para PROBOSQUE
├── contracts/
│   ├── probosque/                # Especificación OpenAPI del visor
│   ├── orquestador/              # Contrato del trámite
│   ├── convocatorias/            # Contrato REQ-01
│   ├── expediente-digital/       # Contrato REQ-02
│   ├── dictaminacion/            # Contrato REQ-03
│   ├── formalizacion-seguimiento/# Contrato REQ-04
│   ├── metricas-cierre/          # Contrato REQ-05
│   ├── platform/                 # Lugar del esqueleto anterior
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

### 4. Trámite administrativo

El trámite son seis procesos Python. Compose los construye junto con Nginx y las bases separadas:

```bash
docker compose -f infra/docker-compose.yml up -d --build
```

La pantalla que dice si cada servicio responde está en `http://localhost:5173/gestion`. Nginx publica la misma interfaz y las dos APIs en `http://localhost:8080`.

Una operación de negocio del trámite responde pendiente. No hay solicitudes de ejemplo.

### 5. Portal de Documentación (MkDocs)
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
