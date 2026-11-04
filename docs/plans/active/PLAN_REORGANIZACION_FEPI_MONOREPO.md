# Plan de reorganización del repositorio FEPI

**Fecha:** 31 de octubre de 2026.  
**Estado:** propuesta anterior. El 1 de noviembre de 2026 el trámite se separó en procesos, como muestra el diagrama de arquitectura. La estructura vigente está en `plan-inicial/FASE_0_ESTRUCTURA.md` y en `services/`. La frase de este documento que dice que no se despliegan cinco microservicios quedó superada.  
**Base:** `FEPI_PROJECT_STRUCTURE.md` y las tres respuestas de alcance del propietario.

## 1. Resultado que se busca

FEPI será la plataforma principal para gestionar programas, trámites y operación de campo. PROBOSQUE será uno de sus subsistemas. Se conservará todo el sistema actual descrito en el documento: frontend, backend, visor, predios, auditorías, evidencias, sincronización, carbono y procesamiento satelital.

La entrega de la reorganización será un repositorio que permita trabajar al equipo sobre la plataforma principal, ejecutar PROBOSQUE de manera independiente en desarrollo y utilizarlo desde una interfaz y una sesión comunes.

La separación propuesta es:

| Unidad | Responsabilidad | Forma de integración |
|---|---|---|
| Aplicación web principal | Navegación, acceso, sesión y pantallas de los módulos del equipo | Incorpora el paquete de interfaz PROBOSQUE |
| API principal | Convocatorias, expedientes administrativos, dictaminación, seguimiento, cierre y coordinación de operación de campo | Consume la API PROBOSQUE mediante un cliente definido |
| Subsistema PROBOSQUE | Todas las capacidades actuales descritas en el MD | API propia y frontend modular reutilizable |
| Infraestructura | Entrada HTTP, bases de datos, almacenamiento y ejecución local | Configuración conjunta, con credenciales separadas |

El backend principal empezará como una aplicación FastAPI organizada por dominios. La reorganización no incluye desplegar cinco microservicios administrativos independientes. Aquellos cinco bloques del diagrama anterior se conservan como responsabilidades funcionales; su separación en procesos podrá evaluarse cuando exista una necesidad concreta.

**Límite de evidencia:** se revisó la documentación de estructura, no el código, las bases ni un despliegue. Los archivos documentados se consideran existentes por verificar. Una función descrita no se considerará operativa hasta comprobar su implementación y sus pruebas. Las rutas y nombres nuevos de este plan son propuestas, no endpoints ya disponibles.

## 2. Límites funcionales y propiedad de los datos

La plataforma también incluye operación de campo, pero PROBOSQUE ya contiene predios, auditorías, evidencias y decisiones. El equipo debe reutilizar esas capacidades. Crear otros modelos equivalentes y permitir que ambos servicios los actualicen produciría inconsistencias.

| Información o función | Propietario inicial | Trabajo de la plataforma principal |
|---|---|---|
| Usuarios, contraseñas y dispositivos existentes | Identidad actual de PROBOSQUE, temporalmente usada por toda FEPI | Usar la misma identidad y sus permisos; no crear otra cuenta para la misma persona |
| Convocatorias y reglas del programa | API principal | Implementar publicación, vigencias y requisitos |
| Expediente administrativo y folio | API principal | Asociar documentos y referencias de predio, auditoría y resultados |
| Geometría e información del predio actual | PROBOSQUE | Guardar una referencia estable y consultar su API |
| Auditoría, muestreo, evidencia, geocerca y sincronización | PROBOSQUE | Coordinar el proceso de campo y presentar sus resultados |
| Asignación de brigadas | PROBOSQUE si la función existe; en caso contrario, ampliación de ese mismo dominio | Administrar la agenda y solicitar asignaciones por API, sin una segunda tabla de asignaciones |
| Visor, estadísticas, triaje satelital y carbono | PROBOSQUE | Integrar pantallas y consumir resultados |
| `SubsidyDecision` y cálculo existente | PROBOSQUE | Consultar el resultado con su versión y evidencia |
| Resolución administrativa, contratos, pagos y cierre | API principal | Implementar estados y atribuciones explícitas |
| Informes conjuntos | API principal | Combinar respuestas de servicios; las copias de lectura deben identificar su origen y fecha |

El documento actual describe decisiones automáticas de subsidio, mientras la arquitectura previa incluye dictaminación manual. Antes de conectar pagos, se debe documentar qué significa cada estado actual de `SubsidyDecision` y qué acto administrativo habilita. La reorganización preservará la lógica existente; un resultado de cálculo no se conectará automáticamente a una nueva orden de pago. Esta distinción se resolverá en el contrato de integración y en pruebas de negocio.

Los identificadores actuales se conservarán. Las referencias entre servicios usarán el tipo real encontrado en los contratos. No se convertirán de manera general a UUID ni se renumerarán registros como parte de mover carpetas.

## 3. Estructura propuesta

Se conservan nombres de archivos y tecnologías existentes para reducir cambios. Los nombres técnicos de carpetas mantienen la convención del repositorio; la documentación será en español.

| Ruta objetivo | Contenido y responsabilidad |
|---|---|
| `apps/web/` | Aplicación React principal, Vite, punto de entrada, router y configuración PWA |
| `apps/web/src/app/` | Navegación general, proveedor de sesión y registro de módulos |
| `apps/web/src/features/` | Pantallas del equipo: convocatorias, expedientes, dictaminación, seguimiento, cierre y operación |
| `modules/probosque/frontend/` | Interfaz actual como paquete `@fepi/probosque-ui`, con componentes, páginas y rutas exportadas |
| `modules/probosque/frontend/dev/` | Aplicación mínima de desarrollo que monta el mismo paquete, sin copiar las pantallas |
| `modules/probosque/backend/` | Backend actual, sus pruebas, dependencias, Dockerfile y migraciones |
| `modules/probosque/satellite/` | Paquete científico actual; no se transforma en una API adicional |
| `modules/probosque/pipelines/` | Configuraciones, scripts de ingesta y tareas de datos actuales |
| `modules/probosque/docs/` | Metodologías, reglas, diccionarios y documentación específica actual |
| `services/platform-api/` | Backend nuevo de la plataforma principal |
| `services/platform-api/app/modules/` | Dominios administrativos y coordinación de operación |
| `services/platform-api/app/integrations/probosque/` | Cliente HTTP de PROBOSQUE, transformaciones y manejo de fallos |
| `services/platform-api/app/security/` | Verificación de sesión y autorización en el servicio principal |
| `packages/session/` | Tipos, proveedor y acceso a sesión usados por ambas interfaces |
| `packages/probosque-client/` | Cliente TypeScript público de PROBOSQUE; sin importar detalles internos de sus páginas |
| `contracts/probosque/` | OpenAPI exportado del servicio, ejemplos y reglas de compatibilidad |
| `contracts/platform/` | Contratos del backend principal y ejemplos de funciones pendientes |
| `contracts/session/` | Identidad, permisos, validación y caducidad de sesión |
| `infra/docker-compose.yml` | Punto de entrada local conservado; incorpora perfiles y servicios de aplicación |
| `infra/nginx/` | Enrutamiento a las APIs y publicación de la aplicación común |
| `data/probosque/` | Insumos y manifiestos de datos del módulo; datos grandes fuera de Git |
| `docs/architecture/` | Límites, responsables y decisiones de arquitectura de toda FEPI |
| `docs/onboarding/` | Preparación de entorno y guía para contribuir |
| `docs/plans/active/` | Plan vigente y tareas verificables |
| `docs/plans/archive/` | Planes anteriores conservados como antecedentes |
| `docs/walkthroughs/` | Evidencia de comprobaciones e integración |
| `tests/integration/` | Pruebas HTTP entre servicios |
| `tests/e2e/` | Pruebas de usuario con la interfaz completa |
| `scripts/` | Comandos del repositorio, preparación de recursos y comprobaciones |
| `.agents/` | Automatizaciones actuales, conservadas y con rutas actualizadas |

La raíz tendrá `README.md`, `AGENTS.md`, `CONTRIBUTING.md`, `package.json`, `package-lock.json`, `.env.example`, `.gitignore` y `mkdocs.yml`. Si el proveedor es GitHub, se añadirá `.github/CODEOWNERS` y el flujo de integración continua correspondiente; en otro proveedor se usará su mecanismo equivalente.

### Dependencias y ejecución

El frontend usará npm workspaces para la aplicación y los paquetes locales, con un solo lockfile de npm. React y React DOM serán dependencias pares del paquete PROBOSQUE para evitar cargar dos copias. Esto utiliza el enlace de paquetes locales que documenta npm [R1].

Los servicios Python mantendrán proyectos `uv` independientes, cada uno con su `pyproject.toml`, `uv.lock` y entorno. No se creará un workspace Python global: esta propuesta busca independencia de entornos y de dependencias científicas; la documentación de uv recomienda proyectos separados con dependencias por ruta para ese caso [R2].

`satellite` se instalará como dependencia local declarada cuando un consumidor lo necesite. Se revisará el empaquetado real de `src/carbon`, `src/sentinel` y `src/satellite`, así como el puente `backend/src/backend`. No se corregirán imports agregando arbitrariamente carpetas a `sys.path`.

## 4. Traslado del código actual

| Origen documentado | Destino | Tratamiento |
|---|---|---|
| `backend/` completo | `modules/probosque/backend/` | Mover con Git, conservar `app/`, contratos, pruebas y lockfile |
| `frontend/src/features/`, `layouts/`, `components/`, `db/`, `utils/` | `modules/probosque/frontend/src/` | Conservar las funciones; adaptar su montaje y dependencias externas |
| `frontend/src/App.tsx` | Rutas del paquete y montaje de desarrollo | Exportar rutas; retirar la creación de un segundo router dentro de la aplicación principal |
| `frontend/src/main.tsx` | `apps/web/src/main.tsx` y montaje mínimo de desarrollo | Un único punto de entrada en producción |
| `frontend/src/context/AuthContext.tsx` | `packages/session/` | Extraer la sesión; mantener un adaptador compatible para los componentes actuales |
| `frontend/src/services/api.ts` | Adaptador HTTP del módulo y cliente público | Quitar direcciones fijas; recibir base URL y proveedor de credenciales |
| `frontend/src/features/forest-viewer/services/forestApi.ts` | Módulo PROBOSQUE, usando el cliente configurado | Conservar las consultas existentes |
| `frontend/src/types/` | Módulo PROBOSQUE | Compartir solo los tipos de contrato que realmente necesitan otros consumidores |
| `frontend/public/` | Recursos fuente del paquete PROBOSQUE y recursos generales del host | Publicación explícita durante desarrollo y compilación |
| Configuración Vite, Tailwind y TypeScript | Configuración del host y del paquete | Mantener versiones; separar migración de estructura y actualización de dependencias |
| `satellite/` | `modules/probosque/satellite/` | Conservar código, pruebas y proyecto uv |
| `pipelines/` | `modules/probosque/pipelines/` | Configurar rutas de insumos y dependencias sin depender del directorio desde el que se ejecuta |
| `data/inegi/` | `data/probosque/inegi/` | Actualizar referencias; verificar archivos y montajes antes de mover insumos grandes |
| Documentación de muestreo, carbono, sincronización y fuentes | `modules/probosque/docs/` | Preservar contenido y enlaces |
| Documentación general | `docs/` | Reescribir la portada para distinguir FEPI de PROBOSQUE |
| `implementation_plans/` y `plans/` | `docs/plans/active/` y `archive/` | Elegir un plan vigente y conservar los demás con su estado |
| `walkthroughs/` | `docs/walkthroughs/` | Mantener evidencia y corregir referencias |

El primer traslado será mecánico. Se usarán commits de movimientos separados de los cambios de comportamiento. No se eliminarán carpetas porque parezcan antiguas sin revisar imports, configuración, documentación y tareas de ejecución.

## 5. Una sola interfaz y una sola sesión

### Composición de interfaz

`apps/web` será la aplicación que usa la persona. Mostrará el menú general y montará las rutas exportadas por `@fepi/probosque-ui`. El paquete conservará las pantallas de administración, técnicos, carbono, predios y visor.

| Contrato del paquete | Función |
|---|---|
| `createProbosqueRoutes(dependencies)` | Crear las rutas con acceso al cliente API y a la sesión compartida |
| `probosqueNavigation` | Declarar entradas de navegación y permisos requeridos |
| Adaptador de sesión | Mantener la forma de uso que esperan los componentes actuales |
| Configuración de recursos | Resolver mapas, imágenes y datos públicos desde una base configurable |

El host será dueño del router, la sesión, el menú global y los errores generales. El módulo podrá conservar sus menús internos sin duplicar cabeceras. Los componentes del módulo no importarán archivos internos de `apps/web`; recibirán dependencias o usarán paquetes públicos.

Se propone `/probosque/*` para las vistas del subsistema y conservar `/visor` como acceso público compatible. Las rutas nuevas administrativas se agruparán bajo `/gestion/*`; la coordinación general de campo, bajo `/operacion/*`. Todas son rutas objetivo: el inventario inicial debe registrar los enlaces actuales y definir alias antes del cambio.

Los estilos globales se revisarán para que `App.css` y `index.css` no alteren pantallas nuevas sin intención. Tailwind debe detectar también las clases del paquete local. Los recursos de `frontend/public/data` tendrán una fuente única dentro del módulo; un script del host los publicará en `/modules/probosque/`. Se conservarán alias de `/data/*` cuando existan consumidores antiguos. Las copias de compilación no serán una segunda fuente versionada.

### Identidad común sin duplicar cuentas

Para la primera integración se reutilizará la autenticación actual de PROBOSQUE como proveedor temporal de identidad de FEPI. Se conserva su base de usuarios, contraseñas, IDs y dispositivos. La interfaz principal usará un solo proveedor de sesión, incluido el acceso al módulo.

La API principal debe verificar las credenciales recibidas. Como mecanismo inicial se propone un adaptador que consulte una operación interna de validación en PROBOSQUE; si ya existe una operación adecuada, se reutilizará. Si debe crearse, será un contrato explícito y no una ruta pública sin protección. Su respuesta solo contendrá identidad, estado y permisos necesarios, nunca secretos o claves de dispositivos.

Si la implementación real ya permite verificar tokens mediante claves públicas, se podrá usar esa capacidad sin la consulta por petición, documentando emisor, destinatario, algoritmo y caducidad. La implementación elegida se fijará en la fase 0. No basta decodificar el JWT: la documentación de FastAPI muestra la verificación de firma, caducidad e identidad como parte de la autenticación [R3].

La dependencia temporal quedará explícita: si la validación remota de identidad deja de estar disponible, la API principal rechazará las operaciones protegidas; no concederá acceso por defecto. Se distinguirá un fallo del proveedor de una credencial inválida. Una extracción posterior hacia un servicio de identidad propio será una tarea separada, conservando IDs y compatibilidad de sesión.

Se definirán permisos por dominio. El rol de administrador PROBOSQUE no recibirá automáticamente permisos de pagos, convocatorias o administración global. Ocultar enlaces será una ayuda visual; cada API verificará sus propios permisos.

El plan requiere probar expiración, renovación si existe, cierre de sesión y cambio de usuario. Al cerrar sesión se eliminarán credenciales del navegador; los datos de campo sin enviar se conservarán protegidos y asociados a su propietario. La política de revocación del servidor debe documentarse: si hoy un JWT sigue válido hasta su caducidad, no se afirmará que hay revocación inmediata. Las credenciales no se transferirán mediante URLs.

## 6. API, contratos y comunicación

### Enrutamiento público propuesto

| Ruta pública | Destino | Compatibilidad |
|---|---|---|
| `/api/platform/v1/*` | API principal | Espacio nuevo para la plataforma |
| `/api/probosque/v1/*` | API PROBOSQUE | El proxy traduce hacia `/api/v1/*` si esa es su ruta interna actual |
| `/api/v1/*` | API PROBOSQUE actual | Alias temporal para clientes existentes, especialmente sincronización |
| Rutas de autenticación ya existentes | Proveedor actual de identidad | Conservar payloads y URLs al iniciar la integración |
| `/health` de cada servicio, en red interna | Servicio correspondiente | Mantener la comprobación existente y añadir disponibilidad cuando proceda |

La regla compatible de `/api/v1/*` será exclusiva del backend actual mientras se use. El backend principal no publicará rutas que colisionen con ese prefijo. Deben verificarse también URLs de OpenAPI, enlaces de Swagger, redirecciones, archivos y terminación TLS detrás del proxy.

Se exportará el OpenAPI real de PROBOSQUE antes de reorganizar y se comparará después. Las pruebas cubrirán métodos, rutas, esquemas y códigos de respuesta, no solo que `/health` responda.

### Contratos mínimos que debe recibir el equipo

| Contrato | Información necesaria |
|---|---|
| Sesión | Identidad estable, permisos, caducidad y mecanismo de verificación |
| Predio | Identificador, geometría y sistema de coordenadas, superficie y reglas de acceso |
| Auditoría | Identificador, predio, estado, técnico y resultados disponibles |
| Evidencia | Identificador y acceso autorizado a metadatos y archivos |
| Resultado técnico | Valor, unidad, fecha, método y versión; semántica del estado actual de decisión |
| Visor | Regiones, clases, fuentes, versiones, cobertura, estadísticas y recursos visuales |
| Sincronización | Reto, firma, dispositivo, identificador de operación y confirmación idempotente |
| Fallos | Autenticación, permisos, dato ausente, conflicto, tiempo agotado y dependencia no disponible |

Se preservarán los formatos actuales. Los datos adicionales que falten se incorporarán de manera compatible o mediante una versión nueva. El equipo consumirá la API mediante un cliente con configuración de URL, límites de tiempo y manejo explícito de errores.

Las peticiones realizadas en nombre de una persona deben conservar su identidad y sus permisos. Los procesos automáticos tendrán credenciales y permisos propios; no se usará una cuenta administrativa global para todas las llamadas. Un identificador de petición permitirá seguir las operaciones entre ambos servicios.

Las escrituras reintentables tendrán una clave de idempotencia y una respuesta estable. No se reintentará indiscriminadamente un alta, un pago o una sincronización. Las operaciones entre bases no se presentarán como una transacción atómica: el backend principal conservará estados pendientes y reconciliará el resultado si el servicio remoto no responde.

En la primera entrega se usará HTTP para las integraciones necesarias. Redis ya aparece en la infraestructura, pero el documento no demuestra que exista un bus de eventos operativo. No se añadirá un nuevo sistema de mensajería solo para completar el esqueleto. Si posteriormente hay eventos, deberán definirse persistencia, reintentos, deduplicación y consumidor antes de conectarlos a estados administrativos.

## 7. Datos, migraciones y archivos

Se mantendrá inicialmente la base actual de PROBOSQUE sin renombrar sus tablas ni mover sus registros. La API principal dispondrá de una base lógica nueva y credenciales propias. Ambas pueden residir en la misma instancia PostgreSQL del entorno local.

Cada servicio será el único escritor de sus datos. No se compartirán modelos SQLAlchemy, sesiones ni consultas directas entre servicios. La plataforma almacenará referencias a predios y auditorías; los estados obtenidos por consulta conservarán origen y fecha cuando se guarden como copia de lectura.

El MD muestra `init_db_tables.py`, pero no un árbol de Alembic. Se comprobará si existe fuera del inventario. Si falta, se introducirá por separado en cada API:

1. Registrar el esquema real y las extensiones PostGIS usadas; preparar un respaldo y comprobar restauración en una base desechable.
2. Crear una revisión inicial reproducible para una base vacía y compararla con el esquema existente, incluidos índices y restricciones espaciales.
3. En una copia de la base existente, comprobar equivalencia con la revisión inicial. Solo entonces se marcará esa revisión como aplicada.
4. Corregir diferencias mediante migraciones explícitas, sin ocultarlas con `stamp head`.
5. Probar creación desde cero y actualización de una copia con datos, conservando IDs y relaciones.

`stamp` registra una revisión y no ejecuta las migraciones [R4]. Se distinguirá la cuenta que aplica migraciones de la cuenta normal de ejecución. Las extensiones y permisos requeridos se provisionarán explícitamente. La API no creará tablas automáticamente al arrancar como sustituto de las migraciones.

Las ingestas escribirán únicamente en datos de PROBOSQUE, mediante su código propietario y un entorno declarado. Los trabajos de larga duración se ejecutarán como procesos separados de las peticiones web. Los scripts de semillas quedarán limitados a desarrollo y pruebas; nunca se activarán como efecto del arranque normal.

MinIO podrá ser compartido físicamente, con permisos y destinos separados para evidencia PROBOSQUE y documentos administrativos. Se conservarán los nombres actuales de objetos y sus referencias. Cambiar `docker-compose.yml`, el directorio del proyecto o sus perfiles no deberá crear por accidente volúmenes vacíos con nombres nuevos. Se documentarán nombres reales de proyecto, volúmenes, buckets y montajes antes de tocar la configuración. No se usará `down -v` en esta migración.

Los datos grandes tendrán manifiestos de origen, versión, licencia y verificación de integridad. Se versionarán muestras pequeñas para pruebas y catálogos necesarios. La limpieza de insumos se hará después de comprobar que pueden recuperarse y no son los únicos ejemplares disponibles.

## 8. Conservación del funcionamiento sin conexión

Esta es una condición de aceptación de la integración, no una mejora futura: se conservarán las auditorías, fotografías, claves locales y paquetes pendientes documentados en Dexie.

El host será dueño de un solo registro de service worker para la aplicación común. Se revisará primero si el registro existe realmente; el MD menciona manifiesto e IndexedDB, pero no lista su implementación. El alcance del service worker determina qué clientes controla [R5]; moverlo de carpeta requiere comprobar ese alcance, sus cachés y el comportamiento de las pestañas abiertas.

Se preservará inicialmente el origen del despliegue, el nombre de la base IndexedDB y su esquema. Si cambia el origen, los datos locales no se trasladan por mover el código: será necesario sincronizarlos o proporcionar un procedimiento de migración previo. No se cambiará el origen y el esquema local en la misma entrega.

| Riesgo concreto | Tratamiento y prueba |
|---|---|
| Capturas pendientes antes de actualizar | Abrir una versión anterior, capturar sin conexión, actualizar y confirmar que siguen disponibles |
| Cambio de estructura Dexie | Migración versionada que preserve datos; nunca borrar y recrear como solución |
| Usuario distinto en el mismo navegador | Evitar visualizar o enviar capturas ajenas; conservar la asociación al propietario y al dispositivo |
| Cola con URLs antiguas | Conservar alias de API y validar la migración del destino sin alterar payloads firmados |
| Repetición de envío | Confirmar que se conserva el identificador y la respuesta idempotente |
| Nueva autenticación | Separar sesión web de credenciales de firma del dispositivo; no regenerar claves durante el traslado |
| Caché de la aplicación anterior | Actualizar el registro y los recursos sin eliminar IndexedDB ni colas pendientes |
| Pérdida de conectividad | Mantener las pantallas y capturas necesarias de campo; operaciones administrativas nuevas seguirán indicando que requieren conexión |

Las pantallas del subsistema deben estar disponibles en la caché cuando se promete trabajar sin conexión. La carga diferida de sus componentes no debe dejarlas sin descargar. Las APIs de pagos, credenciales y datos privados de otros usuarios no se incorporarán a una caché general. Al reconectar, el servidor volverá a validar autorización, dispositivo y operaciones.

## 9. Esqueleto que se entregará al equipo

Se crearán los dominios `convocatorias`, `expedientes`, `dictaminacion`, `seguimiento`, `cierre` y `operacion` en `services/platform-api/app/modules/`, con las vistas correspondientes en `apps/web/src/features/`.

| Elemento por dominio | Contenido mínimo |
|---|---|
| `README.md` | Alcance, propietario, dependencias y pendientes concretos |
| `router.py` | Rutas registradas y validación de acceso |
| `schemas.py` | Contratos iniciales explícitos |
| `service.py` | Casos de uso y puntos de integración, sin simular resoluciones |
| `tests/` | Comprobaciones de permisos, contrato y comportamiento pendiente |
| Pantalla inicial | Ruta accesible para quien corresponde y estado de disponibilidad visible |
| Registro del módulo | Identificador, navegación, permisos y activación configurable |

Las operaciones de negocio pendientes responderán de manera explícita como no implementadas, por ejemplo HTTP 501 con un código de error definido, o permanecerán desactivadas. No devolverán éxitos falsos, pagos ficticios ni listas simuladas como si fueran datos reales. Los datos de demostración tendrán un modo separado y visible de desarrollo.

Se incluirá una integración mínima real: iniciar sesión, abrir una pantalla de operación del host, consultar un predio o resultado existente mediante el cliente PROBOSQUE y entrar a su ficha en el módulo con la misma sesión. Si alguna capacidad no existe, se registrará el pendiente y se usará una consulta existente para demostrar la conexión; los dobles de prueba solo se usarán en pruebas o desarrollo.

La integración no debe requerir imports como `modules.probosque.backend.app.models` desde el servicio principal. Los contratos y clientes serán la frontera entre equipos. El frontend tampoco dependerá de rutas internas de componentes del módulo salvo sus exportaciones públicas.

## 10. Plan por entregas y criterios de salida

Las fases están ordenadas por dependencia. Los responsables son funciones propuestas; se asignarán nombres del equipo al comenzar. No se fijan fechas porque no se conoce la disponibilidad ni el estado real de cada función.

| Fase | Trabajo | Responsable propuesto | Salida verificable |
|---|---|---|---|
| 0. Inventario y línea base | Revisar código, imports, contratos, rutas, datos, sesión, PWA, volúmenes y pruebas actuales | Antonio y responsable de integración | Matriz implementado/parcial/pendiente, evidencia de arranque y contrato exportado |
| 1. Reubicación de PROBOSQUE | Mover backend, satellite, pipelines y documentación; ajustar referencias y contextos de compilación | Antonio | Sistema actual ejecutable desde las nuevas rutas con comportamiento equivalente |
| 2. Host y paquete de interfaz | Configurar npm workspaces, montar el frontend actual, trasladar sesión común, recursos y rutas compatibles | Frontend del equipo con Antonio | Interfaz única, un router y acceso a todas las pantallas actuales |
| 3. API principal y contratos | Crear backend modular, cliente PROBOSQUE, validación de sesión, enrutamiento y esqueletos | Backend del equipo y Antonio | Primera consulta integrada, permisos efectivos y pendientes explícitos |
| 4. Persistencia y entornos | Separar credenciales y base principal, establecer migraciones y perfiles Compose sin perder volúmenes | Responsable backend/infraestructura | Arranque reproducible y migraciones comprobadas en bases nuevas y existentes |
| 5. Compatibilidad y entrega | Probar actualizaciones PWA, colas, rutas, usuarios, fallos y compilación limpia; completar guías y CI | Equipo con responsable de integración | Un integrante nuevo levanta el sistema e implementa un caso sin alterar internals de PROBOSQUE |

En la fase 0 se elaborará también una matriz de funcionalidades. Debe distinguir lo que el MD describe, lo que realmente está conectado, lo que usa datos simulados y lo que falla. Esta matriz impedirá que una carpeta existente se dé por terminada o que un trabajo ya hecho se vuelva a implementar.

### Pull requests sugeridos

| PR | Contenido | Validación central |
|---|---|---|
| PR-01 | Inventario, contrato real, decisiones y matriz de propiedad | Revisión de límites y reproducción del estado inicial |
| PR-02 | Traslado del backend, satélite y pipelines | Imports, pruebas existentes, ejecución de muestra y API sin cambios incompatibles |
| PR-03 | Paquete de interfaz y host | Compilación, navegación, recursos y montajes integrado/aislado |
| PR-04 | Sesión compartida y cliente entre APIs | Credencial válida, expirada, permisos insuficientes y caída del proveedor |
| PR-05 | Dominios pendientes y recorrido mínimo integrado | Contratos, estados pendientes y consulta real desde el host |
| PR-06 | Migraciones, aislamiento de datos y Compose | Base vacía, copia con datos, acceso denegado a base ajena y volúmenes conservados |
| PR-07 | Compatibilidad PWA, automatización y documentación final | Captura antes de actualizar, envío posterior y guía desde clon limpio |

La comprobación offline se prepara desde la fase 0 y se repite en PR-03 y PR-07. No se posterga su descubrimiento hasta el cierre. PR-04 y PR-06 podrán dividirse en cambios pequeños cuando el alcance real lo requiera. Cada rama partirá de `develop`; `main` mantendrá su uso de producción. Se conservará Conventional Commits.

## 11. Entorno local y automatización

Se mantendrá `infra/docker-compose.yml` como punto de entrada. Tendrá infraestructura común y perfiles propuestos `probosque`, `platform` e `integrated`; cada servicio de aplicación se incluirá en los perfiles que le correspondan. Los procesos de ingesta tendrán un perfil o comando explícito y no arrancarán con cada sesión de desarrollo.

Los dos backends tendrán imágenes y dependencias propias. El host web se compilará desde la raíz del monorepositorio para poder resolver paquetes npm. Si una imagen Python usa paquetes locales, su contexto de construcción incluirá esas dependencias. La verificación de disponibilidad sustituirá las esperas de tiempo fijo durante el arranque.

Las variables de la aplicación web solo contendrán configuración pública. Credenciales de base, MinIO y firma permanecerán en el servidor. Cada servicio tendrá su `.env.example`; la plantilla de raíz documentará cómo levantar el conjunto sin duplicar secretos.

Comandos objetivo desde la raíz, disponibles después de implementar los archivos correspondientes:

```bash
npm ci
npm run dev --workspace @fepi/web
npm run build --workspace @fepi/web

uv sync --locked --project modules/probosque/backend
uv run --directory modules/probosque/backend pytest

uv sync --locked --project modules/probosque/satellite
uv run --directory modules/probosque/satellite pytest

uv sync --locked --project services/platform-api
uv run --directory services/platform-api pytest

docker compose -f infra/docker-compose.yml --profile integrated up --build
```

El entorno de ejecución de pipelines se declarará antes de añadir su comando a la guía. El documento original no lista un `pyproject.toml` dentro de `pipelines`, por lo que no se asumirá que `cd pipelines` seguido de `uv run` ya selecciona las dependencias adecuadas. Se usará inicialmente el entorno propietario de PROBOSQUE o se creará un proyecto uv del pipeline cuando sus dependencias lo justifiquen.

La integración continua ejecutará cada backend en su propio entorno. También compilará el host, comprobará el contrato público y ejecutará el recorrido integrado cuando cambien sesión, proxy, contratos o paquetes compartidos. Los cambios del paquete satelital activarán las pruebas de sus consumidores. Las migraciones se comprobarán con PostgreSQL/PostGIS, no exclusivamente con una base sustitutiva.

Las herramientas de `.agents/skill/commit-and-pr` se conservarán. Antes de usarlas, se revisarán sus rutas y mecanismos de detección de cambios después de la reubicación. No se modificarán ni se instalarán skills como parte de redactar este plan.

## 12. Pruebas de aceptación

| Caso | Resultado requerido |
|---|---|
| Clon limpio | Instalar dependencias bloqueadas y arrancar sin rutas absolutas de una computadora particular |
| Consulta pública | `/visor` funciona sin habilitar acceso a expedientes ni evidencia privada |
| Sesión compartida | Un inicio de sesión permite navegar entre host y PROBOSQUE, sin otra cuenta ni segundo formulario |
| Permisos | Usuario técnico no puede ejecutar una operación de pagos por cambiar la URL o enviar directamente una petición |
| Compatibilidad API | Clientes antiguos siguen usando `/api/v1/*` con los contratos acordados |
| Independencia | La API PROBOSQUE funciona sin arrancar la API principal; el host trata una caída de módulo con un estado explícito |
| Datos separados | La credencial principal no escribe las tablas PROBOSQUE y viceversa |
| Esqueleto honesto | Operaciones pendientes no devuelven resultados de negocio simulados como reales |
| Caso integrado | La plataforma consulta un registro PROBOSQUE por contrato y abre su ficha con la sesión existente |
| Actualización offline | Capturas y fotografías anteriores a la actualización siguen disponibles y se sincronizan una sola vez |
| Renovación de acceso | Sesión caducada, cambio de usuario y dispositivo inválido se manejan sin perder capturas ni autorizarlas indebidamente |
| Persistencia | Bases, objetos, IDs y volúmenes permanecen accesibles tras el cambio de estructura |
| Migraciones | Base vacía y copia de la base existente alcanzan el estado esperado sin pérdidas de datos |
| Recursos cartográficos | GeoJSON, catálogos, mapas y exportaciones resuelven sus URLs desde host y montaje de desarrollo |

## 13. Reversión y control de alcance

Antes de cada corte se registrará el commit base, la configuración y la versión de datos. Los cambios de carpetas y aplicación se podrán revertir mediante Git; esto no revierte una base de datos ni el estado del navegador. Las migraciones se diseñarán para mantener compatibilidad con la versión anterior durante el corte, y los cambios de datos requerirán una estrategia probada de corrección o restauración.

Si se restaura una copia, se deberán preservar y reconciliar las operaciones aceptadas después de esa copia; no se sobrescribirán silenciosamente. En un problema de integración se podrá volver al enrutamiento anterior manteniendo alias, volúmenes y objetos existentes. Para PWA se usará un rollback compatible con el esquema local desplegado: no se indicará a usuarios borrar el almacenamiento para resolver la actualización.

La primera entrega termina cuando el sistema actual funciona integrado, el equipo dispone de módulos ejecutables para sus pendientes y existe un contrato probado entre ambas partes. El desarrollo completo de convocatorias, pagos, comités o nuevas reglas de negocio pertenece al trabajo posterior del equipo.

También quedan para cambios separados las actualizaciones mayores de dependencias, el rediseño visual, la sustitución del motor estadístico, el cambio de protocolo criptográfico, la extracción definitiva de identidad y una posible división de la API principal en microservicios. Estas decisiones no se mezclarán con el traslado inicial.

## 14. Documentación de entrega y responsables

| Entregable | Contenido |
|---|---|
| `README.md` | Qué es FEPI, qué aporta PROBOSQUE y cómo ejecutar cada parte |
| `docs/architecture/module-boundaries.md` | Matriz de propietarios de funciones, datos y contratos |
| `docs/architecture/decisions/` | Decisiones sobre composición UI, identidad temporal, APIs, datos y compatibilidad |
| `modules/probosque/README.md` | Ejecución independiente, dependencias y superficie pública del módulo |
| `docs/onboarding/local-development.md` | Instalación, configuración, semillas explícitas y resolución de problemas |
| `docs/onboarding/adding-a-module.md` | Pasos para añadir un módulo sin modificar el interior de PROBOSQUE |
| `docs/plans/active/backlog.md` | Pendiente, responsable, dependencia y criterio de aceptación por función |
| `docs/walkthroughs/monorepo-migration.md` | Evidencia de contratos, pruebas, datos y recuperación |
| `AGENTS.md` | Reglas vigentes del repositorio, uso de uv, ramas, límites de módulos y comprobaciones |

Antonio será el referente propuesto de PROBOSQUE y revisará sus cambios de contrato. El equipo asignará responsables de frontend principal, backend principal e integración. No se inventan nombres ni se asignan permisos de repositorio en este documento. Los cambios de contratos compartidos requerirán revisión de sus productores y consumidores.

## 15. Primera acción al contar con el repositorio

Comenzar por PR-01: inventariar implementación real, probar el arranque actual, exportar OpenAPI y documentar usuarios, rutas, volúmenes y almacenamiento local. Ese resultado permitirá ejecutar PR-02 sin convertir la reorganización en una reescritura.

El MD es suficiente para proponer los límites y el orden de trabajo. Para ejecutar movimientos y certificar que nada se rompe se necesita el código y un entorno de prueba del repositorio; no se ha realizado esa ejecución en esta entrega.

## Referencias técnicas

Las decisiones de estructura y fases son propuestas para este proyecto. Las siguientes fuentes respaldan las capacidades de herramientas mencionadas, no certifican el estado del repositorio.

| Referencia | Fuente oficial | Uso en el plan |
|---|---|---|
| R1 | [npm: Workspaces](https://docs.npmjs.com/cli/using-npm/workspaces/) | Enlace de paquetes locales para el frontend |
| R2 | [uv: Using workspaces](https://docs.astral.sh/uv/concepts/projects/workspaces/) | Diferencia entre workspace y proyectos con entornos independientes |
| R3 | [FastAPI: OAuth2 y JWT](https://fastapi.tiangolo.com/tutorial/security/oauth2-jwt/) | Verificación de credenciales y obtención de identidad |
| R4 | [Alembic: comandos](https://alembic.sqlalchemy.org/en/latest/api/commands.html#alembic.command.stamp) | Alcance de `stamp` y separación respecto a ejecutar migraciones |
| R5 | [MDN: registro de service workers](https://developer.mozilla.org/en-US/docs/Web/API/ServiceWorkerContainer/register) | Control del alcance del service worker |

Fuente del inventario: `FEPI_PROJECT_STRUCTURE.md`, compartido por el propietario. Alcance acordado: sistema principal con gestión y campo; conservación de todo el sistema actual como módulo; interfaz y sesión comunes.
