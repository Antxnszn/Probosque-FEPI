# Guia de Referencia: CLI y Combinaciones de Comandos

Este documento recopila la referencia completa de comandos de terminal (CLI) utilizados en el ecosistema del proyecto Probosque FEPI. Incluye la sintaxis detallada, parametros, variables de entorno y todas las combinaciones practicas para desarrollo, pruebas, contenedores y despliegue en produccion.

---

## 1. FastAPI CLI (fastapi)

FastAPI incluye su propia interfaz de linea de comandos oficial (`fastapi-cli`). En este proyecto, debe ejecutarse siempre a traves de `uv run` para garantizar el aislamiento y la consistencia del entorno virtual.

### 1.1 Comando: fastapi dev

Inicia el servidor en modo desarrollo. Por defecto, activa la recarga automatica (`reload`) y escucha exclusivamente en la direccion de bucle local (`127.0.0.1`).

#### Sintaxis
```bash
uv run fastapi dev [PATH] [OPTIONS]
```

#### Argumento Posicional
- `PATH` (opcional): Ruta al archivo Python o directorio del modulo. Si se omite, auto-detecta: `main.py`, `app.py`, `api.py`, `app/main.py`, `app/app.py`, `app/api.py`. En este proyecto, la ruta estandar es `app/main.py`.

#### Opciones y Parametros
| Opcion | Tipo | Valor por Defecto | Descripcion |
| :--- | :--- | :--- | :--- |
| `--host TEXT` | String | `127.0.0.1` | Direccion IP en la que escuchara el servidor. |
| `--port INTEGER` | Entero | `8000` | Puerto TCP de escucha. |
| `--reload / --no-reload` | Booleano | `True` | Activa o desactiva la recarga automatica ante cambios en el codigo. |
| `--reload-dir PATH` | Directorio | `None` | Directorio especifico a observar para recargas. Puede repetirse. |
| `--root-path TEXT` | String | `""` | Prefijo de ruta base ASGI cuando se opera detras de un reverse proxy. |
| `--app TEXT` | String | `None` | Nombre explicito del objeto FastAPI dentro del modulo (ej. `app`). |
| `--entrypoint TEXT` | String | `None` | Punto de entrada personalizado. |
| `--proxy-headers / --no-proxy-headers` | Booleano | `True` | Habilita lectura de cabeceras de proxy (`X-Forwarded-*`). |
| `--forwarded-allow-ips TEXT` | String | `None` | IPs permitidas para confiar en cabeceras de reenvio de proxy. |
| `--verbose / --no-verbose` | Booleano | `False` | Muestra salida detallada del proceso de importacion y ejecucion. |

---

### 1.2 Comando: fastapi run

Inicia el servidor en modo produccion. Por defecto, desactiva la recarga automatica (`reload`), escucha en todas las interfaces de red (`0.0.0.0`) y admite ejecucion multiproceso (`workers`).

#### Sintaxis
```bash
uv run fastapi run [PATH] [OPTIONS]
```

#### Opciones y Parametros
| Opcion | Tipo | Valor por Defecto | Descripcion |
| :--- | :--- | :--- | :--- |
| `--host TEXT` | String | `0.0.0.0` | Direccion IP en la que escuchara el servidor. |
| `--port INTEGER` | Entero | `8000` | Puerto TCP de escucha. |
| `--reload / --no-reload` | Booleano | `False` | Desactivado por defecto en modo run. |
| `--workers INTEGER` | Entero | `None` (1) | Cantidad de procesos trabajadores paralelos (incompatible con reload). |
| `--root-path TEXT` | String | `""` | Prefijo de ruta base ASGI cuando se opera detras de un reverse proxy. |
| `--app TEXT` | String | `None` | Nombre explicito del objeto FastAPI dentro del modulo. |
| `--entrypoint TEXT` | String | `None` | Punto de entrada personalizado. |
| `--proxy-headers / --no-proxy-headers` | Booleano | `True` | Habilita lectura de cabeceras de proxy (`X-Forwarded-*`). |
| `--forwarded-allow-ips TEXT` | String | `None` | IPs permitidas para confiar en cabeceras de proxy. |
| `--verbose / --no-verbose` | Booleano | `False` | Muestra salida detallada del proceso de importacion y ejecucion. |

---

### 1.3 Comparativa: fastapi dev vs fastapi run

| Caracteristica | fastapi dev | fastapi run |
| :--- | :--- | :--- |
| Entorno destino | Desarrollo local | Produccion / Staging / Contenedores |
| Host por defecto | `127.0.0.1` (solo local) | `0.0.0.0` (todas las interfaces) |
| Recarga en caliente | Activada (`--reload`) | Desactivada (`--no-reload`) |
| Soporte de Workers | Unico proceso | Multiproceso con `--workers N` |
| Rendimiento | Optimizado para feedback rapido | Optimizado para concurrencia y estabilidad |

---

### 1.4 Otros Comandos y Subcomandos de FastAPI CLI

| Comando | Descripcion |
| :--- | :--- |
| `uv run fastapi --help` | Muestra la ayuda general del CLI y lista de subcomandos. |
| `uv run fastapi dev --help` | Muestra todos los flags y opciones del comando `dev`. |
| `uv run fastapi run --help` | Muestra todos los flags y opciones del comando `run`. |
| `uv run fastapi --version` | Muestra la version instalada de FastAPI y FastAPI CLI. |
| `uv run fastapi login` | Inicio de sesion en el servicio FastAPI Cloud. |
| `uv run fastapi deploy` | Despliegue guiado al servicio FastAPI Cloud. |

---

## 2. Matriz de Combinaciones Practicas de FastAPI CLI

A continuacion se presentan las combinaciones mas utilizadas organizadas por caso de uso. Todas las instrucciones se ejecutan dentro del directorio `backend/`.

### 2.1 Casos de Desarrollo (fastapi dev)

#### 1. Desarrollo basico estandar (auto-deteccion)
```bash
uv run fastapi dev app/main.py
```
> Inicia el servidor en `http://127.0.0.1:8000` con recarga automatica al modificar archivos.

#### 2. Desarrollo accesible desde la red local (para pruebas con PWA movil)
```bash
uv run fastapi dev app/main.py --host 0.0.0.0
```
> Permite que telefonos, tablets u otros equipos en la misma red Wi-Fi accedan a la API usando la IP de la maquina de desarrollo (ej. `http://192.168.1.50:8000`).

#### 3. Desarrollo en un puerto alternativo
```bash
uv run fastapi dev app/main.py --port 8080
```
> Evita conflictos si el puerto 8000 ya esta ocupado por otro servicio.

#### 4. Desarrollo con combinacion de Host y Puerto
```bash
uv run fastapi dev app/main.py --host 0.0.0.0 --port 8080
```

#### 5. Desarrollo observando carpetas especificas para recargas
```bash
uv run fastapi dev app/main.py --reload-dir app
```
> Limita la observacion a `app/`, evitando recargas innecesarias provocadas por logs, caches o temporales.

#### 6. Desarrollo observando multiples carpetas
```bash
uv run fastapi dev app/main.py --reload-dir app --reload-dir ../docs
```

#### 7. Desarrollo con especificacion explicita de instancia de app
```bash
uv run fastapi dev app/main.py --app app
```
> Util cuando el archivo contiene multiples instancias o submodulos y se desea especificar `app`.

#### 8. Desarrollo en modo verbose (depuracion profunda de inicio)
```bash
uv run fastapi dev app/main.py --verbose
```
> Imprime trazas completas de imports, resolucion de dependencias y configuracion ASGI.

#### 9. Desarrollo con desactivacion temporal de reload
```bash
uv run fastapi dev app/main.py --no-reload
```
> Mantiene el host `127.0.0.1` pero no reinicia ante cambios (util para sesiones fijas de profiling o depuracion con debugger adjunto).

---

### 2.2 Casos de Produccion (fastapi run)

#### 1. Produccion monoproceso estandar
```bash
uv run fastapi run app/main.py
```
> Escucha en `0.0.0.0:8000` sin recarga automatica. Ideal para contenedores Docker donde el orquestador maneja las replicas.

#### 2. Produccion con multiples trabajadores (Multi-Worker)
```bash
uv run fastapi run app/main.py --workers 4
```
> Lanza 4 procesos trabajadores paralelos para maximizar el uso de nucleos de CPU.

#### 3. Produccion en puerto especifico con 4 workers
```bash
uv run fastapi run app/main.py --host 0.0.0.0 --port 8000 --workers 4
```

#### 4. Produccion detras de Reverse Proxy con prefijo de ruta (Path Prefix)
```bash
uv run fastapi run app/main.py --root-path /api/v1
```
> Le indica a FastAPI que su ruta publica base es `/api/v1` (ej. `https://dominio.gob.mx/api/v1/docs`), corrigiendo las URLs generadas en OpenAPI/Swagger.

#### 5. Produccion detras de Nginx/Traefik con proxy headers y workers
```bash
uv run fastapi run app/main.py --proxy-headers --forwarded-allow-ips "10.0.0.1,127.0.0.1" --workers 4
```
> Acepta cabeceras `X-Forwarded-For` y `X-Forwarded-Proto` unicamente de los balanceadores autorizados.

#### 6. Produccion sin proxy headers (acceso directo a internet sin reverse proxy)
```bash
uv run fastapi run app/main.py --no-proxy-headers
```

---

## 3. Gestor de Entornos y Paquetes: uv CLI

De acuerdo con el protocolo de desarrollo del proyecto, `uv` es el unico gestor autorizado para Python. No se utiliza `pip`, `poetry`, `conda` ni `python -m venv`.

### 3.1 Comandos Fundamentales de uv

| Comando | Descripcion |
| :--- | :--- |
| `uv venv` | Inicializa el entorno virtual `.venv` en el directorio actual. |
| `uv sync` | Sincroniza e instala las dependencias bloqueadas en `uv.lock`. |
| `uv run <comando>` | Ejecuta cualquier ejecutable, script o herramienta dentro del entorno virtual. |
| `uv add <paquete>` | Agrega una nueva dependencia a `pyproject.toml` y actualiza `uv.lock`. |
| `uv add --dev <paquete>` | Agrega una dependencia al grupo de desarrollo (`dev`). |
| `uv remove <paquete>` | Remueve una dependencia de `pyproject.toml` y actualiza `uv.lock`. |
| `uv lock` | Actualiza o regenera el archivo `uv.lock` sin modificar `pyproject.toml`. |
| `uv cache clean` | Limpia la cache global de paquetes de `uv`. |

### 3.2 Combinaciones Utiles con uv run

#### 1. Inyectar archivo de variables de entorno explicitamente
```bash
uv run --env-file ../.env fastapi dev app/main.py
```
> Carga las variables de `.env` antes de inicializar la aplicacion.

#### 2. Ejecutar comandos del backend desde la raiz del monorepo
```bash
uv run --directory backend fastapi dev app/main.py
```
> Permite ejecutar el backend sin necesidad de hacer `cd backend`.

#### 3. Ejecutar pruebas unitarias desde la raiz del monorepo
```bash
uv run --directory backend pytest -v
```

#### 4. Pasar argumentos literales usando el separador `--`
```bash
uv run -- fastapi dev app/main.py --port 9000
```

---

## 4. Comandos de Migraciones de Base de Datos: Alembic CLI

Las migraciones de esquemas PostGIS se gestionan con Alembic, ejecutado siempre con `uv run alembic`.

| Comando | Combinacion / Opciones | Proposito |
| :--- | :--- | :--- |
| `uv run alembic upgrade head` | Estandar | Aplica todas las migraciones pendientes hasta la ultima version. |
| `uv run alembic downgrade -1` | Reversion de 1 paso | Revierte la migracion mas reciente. |
| `uv run alembic downgrade base` | Reversion completa | Revierte todas las migraciones hasta el estado inicial. |
| `uv run alembic revision -m "msg"` | `--autogenerate` | `uv run alembic revision --autogenerate -m "crear_tabla_auditorias"` (detecta cambios en modelos). |
| `uv run alembic current` | Solo lectura | Muestra la version de migracion actualmente aplicada en la base de datos. |
| `uv run alembic history` | `--verbose` | Muestra el historial completo de revisiones y dependencias. |
| `uv run alembic heads` | Solo lectura | Muestra los identificadores tope (heads) activos. |

---

## 5. Comandos de Pruebas Automatizadas: Pytest CLI

Ejecucion de pruebas con `uv run pytest` dentro de `backend/` o `satellite/`.

### 5.1 Combinaciones de Pytest

#### 1. Ejecucion estandar
```bash
uv run pytest
```

#### 2. Modo detallado con nombres de pruebas
```bash
uv run pytest -v
```

#### 3. Filtrar pruebas por expresion o palabra clave
```bash
uv run pytest -k "audit"
uv run pytest -k "geofence or ratio"
```

#### 4. Ejecutar un archivo de prueba especifico
```bash
uv run pytest tests/test_audit_service.py
uv run pytest tests/test_geofence_service.py
```

#### 5. Ejecutar un test individual dentro de un archivo
```bash
uv run pytest tests/test_audit_service.py::test_create_audit_log_success
```

#### 6. Detener ejecucion en el primer error (Fail-Fast)
```bash
uv run pytest -x
```

#### 7. Mostrar salida estandar de consola (captura deshabilitada)
```bash
uv run pytest -s
```

#### 8. Trazas cortas de error
```bash
uv run pytest --tb=short
```

#### 9. Combinacion completa de inspeccion para depuracion
```bash
uv run pytest -v -s -x --tb=short -k "geofence"
```

---

## 6. Comandos de Infraestructura: Docker Compose CLI

Control de los contenedores de soporte: PostgreSQL con PostGIS, Redis y MinIO. Se ejecutan desde el directorio `infra/`.

| Operacion | Comando | Descripcion |
| :--- | :--- | :--- |
| Iniciar servicios | `docker compose up -d` | Levanta todos los servicios en segundo plano. |
| Iniciar servicio individual | `docker compose up -d db` | Levanta solo la base de datos PostGIS. |
| Detener servicios | `docker compose down` | Apaga los contenedores conservando los volumenes persistentes. |
| Reinicio total (eliminar datos) | `docker compose down -v` | Apaga contenedores y destruye volumenes de datos. |
| Ver estado | `docker compose ps` | Muestra estado y salud (healthcheck) de los contenedores. |
| Ver logs continuos | `docker compose logs -f` | Muestra logs en tiempo real de todos los servicios. |
| Ver logs de un servicio | `docker compose logs -f db` | Logs exclusivos del contenedor `probosque-db`. |
| Reiniciar un servicio | `docker compose restart redis` | Reinicia el contenedor de Redis. |
| Ejecutar ping a Redis | `docker compose exec redis redis-cli ping` | Verifica respuesta `PONG`. |
| Consola interactiva Postgres | `docker compose exec db psql -U probosque -d probosque_db` | Abre la terminal interactiva de PostgreSQL. |

---

## 7. Comandos de Frontend PWA: npm y Vite CLI

Control del cliente web progresivo ubicado en `frontend/`.

| Comando | Opciones / Combinaciones | Proposito |
| :--- | :--- | :--- |
| `npm run dev` | Estandar | Inicia el servidor de desarrollo Vite en `http://localhost:5173`. |
| `npm run dev -- --host` | `--host` | Expone la PWA a la red local (para probar la PWA en smartphones). |
| `npm run dev -- --port 3000` | `--port` | Cambia el puerto de escucha a 3000. |
| `npm run dev -- --host --port 3000` | Ambas opciones | Expone a la red en puerto 3000. |
| `npm run build` | Estandar | Compila TypeScript (`tsc -b`) y genera el bundle de produccion (`vite build`). |
| `npm run preview` | `--host` | Previsualiza localmente el bundle generado en la carpeta `dist/`. |
| `npm run lint` | Estandar | Ejecuta el linter estatico Oxlint sobre el codigo fuente. |

---

## 8. Tabla Resumen de Consulta Rapida (Cheatsheet)

| Tarea Requerida | Comando Exacto | Directorio de Ejecucion |
| :--- | :--- | :--- |
| Backend dev (local) | `uv run fastapi dev app/main.py` | `backend/` |
| Backend dev (red Wi-Fi / PWA) | `uv run fastapi dev app/main.py --host 0.0.0.0` | `backend/` |
| Backend dev (puerto alterno) | `uv run fastapi dev app/main.py --port 8080` | `backend/` |
| Backend produccion (1 worker) | `uv run fastapi run app/main.py` | `backend/` |
| Backend produccion (4 workers) | `uv run fastapi run app/main.py --workers 4` | `backend/` |
| Backend con reverse proxy | `uv run fastapi run app/main.py --root-path /api/v1` | `backend/` |
| Aplicar migraciones | `uv run alembic upgrade head` | `backend/` |
| Correr pruebas unitarias | `uv run pytest -v` | `backend/` |
| Levantar infraestructura | `docker compose up -d` | `infra/` |
| Frontend dev (local) | `npm run dev` | `frontend/` |
| Frontend dev (red Wi-Fi / PWA) | `npm run dev -- --host` | `frontend/` |
| Compilar frontend produccion | `npm run build` | `frontend/` |
