# Walkthrough: Reorganización FEPI Monorepo (Fases 0 y 1)

**Fecha:** 31 de octubre de 2026  
**Rama:** `epic/fepi-platform`  
**Referencia:** `docs/plans/active/PLAN_REORGANIZACION_FEPI_MONOREPO.md`

## 1. Objetivo y Alcance Ejecutado

Este walkthrough certifica la ejecución exitosa de la **Fase 0 (Línea Base e Inventario)** y la **Fase 1 (Reubicación de PROBOSQUE como Módulo)** en la nueva rama principal de la épica: `epic/fepi-platform`.

## 2. Preparación y Limpieza del Repositorio

Antes de la reestructuración, se completó la consolidación higiénica de ramas mediante la skill `commit-and-pr`:
1. Los cambios pendientes del Visor Forestal (Fase 2, ingesta municipal y servidor de documentación) se validaron sin secretos mediante `check-secrets.sh` y se registraron bajo Conventional Commits.
2. La Pull Request #2 (`feature/forest-viewer-phase-0-1`) se integró exitosamente en `develop` vía GitHub CLI (`gh pr merge 2 --merge`).
3. La rama local y remota `feature/forest-viewer-phase-0-1` fue depurada de forma segura mediante `post-merge-cleanup.sh`.
4. Los cambios de la Fase 2 se fusionaron limpiamente en `develop` y se sincronizaron con `origin/develop`.
5. Se eliminó la rama `feature/forest-viewer-phase-2`, dejando el árbol de Git limpio y sincronizado.
6. Se creó la nueva rama de trabajo para el equipo: `epic/fepi-platform`.

## 3. Línea Base y Exportación de Contratos (Fase 0)

1. **Exportación de Contrato OpenAPI:**
   Se generó y versionó la especificación OpenAPI real de la API PROBOSQUE en:
   `contracts/probosque/openapi.json` (102 KB, OpenAPI 3.1.0).
2. **Matriz de Límites y Responsabilidades:**
   Se documentó la propiedad funcional y separación de datos en:
   `docs/architecture/module-boundaries.md`.
3. **Organización de Planes y Antecedentes:**
   - Plan activo: `docs/plans/active/PLAN_REORGANIZACION_FEPI_MONOREPO.md`.
   - Planes históricos: archivados en `docs/plans/archive/`.

## 4. Reubicación del Subsistema PROBOSQUE (Fase 1)

Se preservó el historial de Git utilizando `git mv` para reubicar los componentes especializados:

| Ubicación Anterior | Nueva Ubicación en Monorepo | Verificación |
|---|---|---|
| `backend/` | `modules/probosque/backend/` | 69 tests pasando (`uv run pytest`) |
| `satellite/` | `modules/probosque/satellite/` | 6 tests pasando (`uv run pytest`) |
| `pipelines/` | `modules/probosque/pipelines/` | Configuraciones e ingestas preservadas |
| Documentación metodológica | `modules/probosque/docs/` | Preservada para autonomía del módulo |

### Ajustes de Contexto y Rutas
- En `modules/probosque/backend/app/config.py`: se amplió la detección de variables de entorno hacia `env_file=("../../../.env", "../../.env", "../.env", ".env")`.
- En `modules/probosque/backend/app/services/forest_service.py`: se parametrizó la resolución de `config_dir` y `data_dir` para localizar los catálogos tanto en la nueva estructura modular como en la raíz.
- Se regeneraron los entornos virtuales de `uv` asegurando compatibilidad completa en Windows.

## 5. Resultados de Validación

### Backend PROBOSQUE
```bash
uv run --directory modules/probosque/backend pytest
# Resultado: 69 passed in 19.52s
```

### Paquete Satelital
```bash
uv run --directory modules/probosque/satellite pytest
# Resultado: 6 passed in 0.05s
```

### Compilación Frontend
```bash
npm --prefix frontend run build
# Resultado: built in 3.11s (sin errores de tipos ni empaquetado)
```
