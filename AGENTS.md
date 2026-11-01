# Reglas de Agentes y Protocolo del Repositorio FEPI

## 1. Convenciones de Desarrollo y Código
- **Estilo de Mensajes y Documentación:** No utilizar emojis en ningún archivo de código, documentación, mensajes de commit o interfaz, a menos que el usuario lo solicite expresamente para un icono SVG.
- **Commits:** Seguir estrictamente la convención de Conventional Commits 1.0 (`feat`, `fix`, `docs`, `refactor`, `test`, `chore`).
- **Ramas:**
  - `main`: Reservada exclusivamente para producción.
  - `develop`: Rama principal de integración y desarrollo activo.
  - Las nuevas implementaciones parten siempre de `develop` mediante ramas de feature o epic (`epic/<nombre>`, `feature/<nombre>`).

## 2. Entorno y Herramientas Python
- **Gestión de Paquetes y Entornos:** Utilizar exclusivamente `uv`. Queda prohibido el uso de `pip`, `poetry`, `conda` o `python -m venv`.
- **Ejecución:** Siempre ejecutar scripts, pruebas y CLIs mediante `uv run` apuntando explícitamente al proyecto correspondiente:
  - Backend PROBOSQUE: `uv run --directory modules/probosque/backend pytest`
  - Paquete Satelital: `uv run --directory modules/probosque/satellite pytest`
- **Dependencias:** Gestionar paquetes con `uv add <pkg>` y `uv remove <pkg>`. Mantener los archivos de bloqueo actualizados con `uv sync`.

## 3. Límites de Módulos y Arquitectura
- **Aislamiento de Persistencia:** Cada servicio es el único dueño y escritor de su propia base de datos. Está estrictamente prohibido importar modelos SQLAlchemy o sesiones de base de datos directas entre `services/platform-api` y `modules/probosque`.
- **Contratos:** Toda comunicación entre la plataforma principal y los subsistemas debe efectuarse mediante contratos REST/OpenAPI (`contracts/probosque/openapi.json`).
- **Frontend:** La aplicación web integrará paquetes modulares reutilizables sin acoplarse a rutas internas ni redefinir la sesión compartida.
