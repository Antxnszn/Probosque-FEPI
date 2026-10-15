# Protocolo y Lista de Verificación de Limpieza Pre-Lanzamiento (Release Cleanup)

Este documento registra el compromiso formal de higiene y mejores prácticas de código para la entrega final del **Visor Forestal Multitemporal del Estado de México (Probosque)**.

---

## 1. Justificación y Alcance
Durante la fase activa de desarrollo, el equipo utiliza planes de implementación por fases (`implementation_plans/`), registros de flujo de trabajo (`walkthroughs/`), scripts de prototipado rápido y configuraciones temporales en `.gitignore`.

Para el usuario externo, evaluador o personal técnico ajeno que reciba, clone o despliegue este repositorio en producción, estos archivos no deben formar parte del producto final. El repositorio debe cumplir estrictamente con las mejores prácticas de la industria:
- Arquitectura limpia y modular.
- Ausencia de artefactos de andamiaje o borradores internos.
- `.gitignore` estricto, sin reglas sucias o provisionales.
- Documentación concisa y enfocada en operación, despliegue y arquitectura técnica.

---

## 2. Lista de Verificación para el Cierre de Producto (Final Release Checklist)

### 2.1 Archivos y Directorios de Desarrollo a Purgar
- [ ] Retirar el directorio `implementation_plans/` (los acuerdos vigentes quedan consolidados en `docs/`).
- [ ] Retirar el directorio `walkthroughs/` (los flujos de usuario quedan en la documentación oficial de `docs/`).
- [ ] Eliminar scripts de depuración o prototipado en `scratch/` o carpetas temporales.
- [ ] Verificar que no existan archivos `.geojson` redundantes o duplicados en la raíz o en rutas no oficiales.

### 2.2 Auditoría y Limpieza de `.gitignore`
- [ ] Revisar el `.gitignore` raíz y de cada submódulo (`frontend/.gitignore`, `backend/.gitignore`).
- [ ] Eliminar excepciones temporales o parches que se hayan agregado durante el desarrollo activo.
- [ ] Asegurar que contenga únicamente las exclusiones estándar de producción:
  - Entornos virtuales (`.venv/`, `env/`)
  - Dependencias (`node_modules/`)
  - Compilados (`dist/`, `build/`, `__pycache__/`, `.pytest_cache/`)
  - Secretos y variables de entorno (`.env`, `credentials.json`, llaves de servicio)
  - Archivos del sistema operativo (`.DS_Store`, `Thumbs.db`)

### 2.3 Calidad de Código y Estilo
- [ ] Ejecutar suite completa de tests de backend con `uv run pytest -v` (100% de aprobación).
- [ ] Ejecutar linter del frontend (`npm run lint` / Oxlint) sin advertencias pendientes.
- [ ] Ejecutar compilación de producción del frontend (`npm run build`) verificando cero errores tipográficos y optimización de bundle.
- [ ] Formateo consistente de código (Ruff en backend, Prettier en frontend).

### 2.4 Documentación de Entrega
- [ ] `README.md` actualizado con instrucciones directas de instalación y arranque en un solo paso (`docker compose`, `uv`, `npm`).
- [ ] `docs/decisions.md` (ADR) actualizado y consolidado.
- [ ] `docs/data_dictionary.md` y `docs/sources_and_licenses.md` actualizados con las fuentes definitivas (INEGI MG 2023, MapBiomas Col 1.0, Hansen GFC v1.13).
