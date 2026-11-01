# Plan de implementación para AI-IDE
## Visor Forestal Multitemporal del Estado de México — Probosque

**Versión:** 1.0  
**Fecha:** 12 de octubre de 2026  
**Tipo:** Especificación ejecutable por fases para un agente de desarrollo (AI-IDE)  
**Estado:** Listo para inspección del repositorio y validación de acceso a datos  
**Referencia funcional:** [GeoBosques — visor](https://geobosques.minam.gob.pe/geobosque/visor/)

> **Instrucción principal al AI-IDE:** el proyecto cambió de objetivo. Construir un **visor público de cambios de cobertura y uso del suelo, pérdida arbórea y comparación multitemporal del Estado de México**. No invertir tiempo del MVP en las vistas antiguas de técnico/admin, auditorías, subvenciones, calculadora de carbono ni PWA offline. Preservar el código existente mientras se reutiliza lo aprovechable.

---

## 0. Contrato de ejecución del AI-IDE

1. **Inspeccionar antes de modificar.** Revisar `package.json`, estructura de React, rutas, componentes de mapa, endpoints FastAPI, modelos, migraciones, Docker, tests y estado Git. No suponer que los archivos citados en planes anteriores siguen existiendo ni que su contenido sigue igual.
2. **No reescribir el proyecto desde cero** si el stack existente permite cumplir el nuevo objetivo. Reutilizar configuración, componentes genéricos, infraestructura y estilos. Preferir cambios pequeños verificables.
3. **No inventar datos científicos, credenciales ni rutas de assets GEE.** Un dataset inaccesible debe producir un bloqueo documentado o una capa marcada como `unavailable`, nunca estadísticas simuladas presentadas como reales.
4. **Implementar por cortes verticales completos:** fuente de datos → procesamiento → persistencia/API → visualización → test. No generar decenas de componentes desconectados del backend.
5. **Separar los indicadores:** cobertura anual MapBiomas, pérdida bruta anual Hansen, imagen óptica y alertas no representan el mismo fenómeno.
6. **No alterar datos originales.** Conservar identificación de fuente, colección, año, versión, parámetros y fecha de procesamiento en cada producto derivado.
7. **Cada fase termina con pruebas.** Ejecutar lint, build, pruebas automatizadas existentes y smoke tests, reportando qué pasa y qué falla.
8. **Mantener el alcance geográfico** estrictamente en el Estado de México usando la geometría oficial, no una caja rectangular como sustituto de sus límites.
9. **No crear servicios de cobro, despliegues ni cuentas externas automáticamente.** Preparar la integración, pero documentar qué configuración real requiere autorización.
10. **Al final de cada fase:** entregar archivos tocados, cambios de esquema/API, comandos utilizados, evidencia de pruebas, pendientes, riesgos y el siguiente paso. No declarar completada una funcionalidad que depende de un mock.

### Regla de continuidad

Trabajar en ramas por fase o commits reversibles. Evitar eliminaciones masivas de módulos anteriores. Ocultar rutas heredadas con una configuración de producto si interfieren con la nueva navegación; no borrar su implementación sin solicitud explícita.

---

## 1. Objetivo del producto

Construir una aplicación web geoespacial donde cualquier persona pueda:

- Ver un mapa interactivo del Estado de México.
- Seleccionar el estado completo o cualquiera de sus **125 municipios**.
- Visualizar las categorías de **cobertura y uso del suelo** de un año seleccionado.
- Cambiar el año a través de una línea temporal.
- Comparar dos años mediante una cortinilla tipo **swipe** con mapas sincronizados.
- Identificar superficies que **cambiaron de clase** entre dos años.
- Consultar series históricas de cobertura forestal y otras clases definidas por la leyenda oficial.
- Consultar **pérdida bruta anual de cobertura arbórea** como indicador independiente.
- Consultar fuente, fecha, metodología, limitaciones y calidad/validez de cada capa.

**Resultado de producto:** un visor público inspirado en GeoBosques, enfocado solo en el Estado de México, que entregue evidencia visual y estadísticas trazables de cómo ha cambiado su cobertura territorial.

### 1.1 Alcance temporal del MVP

- **Mapas anuales comparables:** 2010–2025, usando una única colección/versionado metodológico homogéneo de MapBiomas México cuando se confirme acceso técnico.
- **Pérdida arbórea histórica:** 2010–2025, derivada de Hansen v1.13.
- **2026:** NO aparece como año definitivo de cobertura ni de pérdida histórica. Puede incorporarse después como **observación satelital provisional**, con etiqueta visible y una metodología separada.
- La cobertura completa de MapBiomas México es **1985–2025**; se podrá ampliar el selector temporal después sin rediseñar la arquitectura.

### 1.2 Fuera del alcance del MVP

- Login, roles de administrador/técnico y panel de administración.
- Registro de beneficiarios, asignación de parcelas, auditorías de campo y subsidios.
- Cálculo de biomasa, carbono, CO₂e o créditos de carbono.
- PWA, instalación obligatoria, sincronización offline y descarga de mapas offline.
- Entrenamiento de un clasificador propio de deforestación.
- Alertas en tiempo real sin fuente validada para Edomex.
- Dibujo de polígonos por usuarios y estadísticas arbitrarias sobre esos polígonos (post-MVP).

---

## 2. Definiciones científicas que no deben confundirse

### 2.1 Cobertura y uso del suelo (MapBiomas)

Mapa de **clases temáticas por año**. Se utiliza para contestar:

- ¿Qué superficie estaba clasificada como cobertura forestal en 2010 y 2025?
- ¿Cómo evolucionó cada clase a lo largo de los años?
- ¿Cuánto territorio pasó de una categoría a otra?

**Importante:** implementar las clases exactas de la **leyenda oficial de la Colección 1**. El agrupamiento `forestal` será una política explícita y versionada: **no asignar automáticamente vegetación secundaria, matorral o pastizal a la categoría bosque sin aprobación del criterio de dominio**.

### 2.2 Pérdida bruta de cobertura arbórea (Hansen)

Evento de pérdida bruta detectado en un píxel, con un año de ocurrencia. **No equivale automáticamente a deforestación permanente, cambio de uso de suelo, pérdida neta de bosque ni pérdida repetida en años subsecuentes**. La banda de ganancia del producto no es una serie anual de regeneración actualizada.

Usar: `UMD/hansen/global_forest_change_2025_v1_13`, bandas `lossyear`, `loss`, `treecover2000`, `datamask`, con año `lossyear + 2000`. Aplicar una definición documentada para los píxeles considerados vegetación arbórea de referencia. Una condición tentativa (`treecover2000 >= 30`) **no es un estándar oficial de bosques templados de México**: es un parámetro de análisis a justificar y validar; mostrarlo en metadatos.

### 2.3 Comparación óptica (Landsat/Sentinel)

Una imagen RGB ayuda a **interpretar visualmente** la zona, pero no demuestra por sí misma el cambio de categoría. Nubes, sombras, estacionalidad, corrección radiométrica y diferencias entre sensores alteran su apariencia.

- 2010–2012: considerar Landsat 5/7 según disponibilidad.
- 2013–2016: incorporar Landsat 8 y armonización con Landsat 7 según necesidad.
- Sentinel-2 SR Harmonized: disponible desde **marzo de 2017**, con cobertura potencialmente parcial en 2017–2018.
- Mosaicos ópticos son **post-MVP** y no condicionan el mapa anual clasificado.

### 2.4 Cambios y métricas

Para un municipio `r`, año `y` y conjunto aprobado de clases forestales `F`:

```text
forest_area_ha(r, y) = Σ área_pixel_ha para píxeles válidos cuya clase ∈ F
net_change_ha(r, y0, y1) = forest_area_ha(r, y1) - forest_area_ha(r, y0)
net_change_pct = net_change_ha / forest_area_ha(r, y0) × 100
```

Si el denominador de 2010 es cero o no existe, el porcentaje es `null` y no `0`.

Para transiciones `from_class -> to_class`, utilizar **el área de píxeles con datos válidos en ambos años** y almacenar el área excluida por `no-data`. Una transición de clase no debe llamarse automáticamente deforestación.

Las estadísticas de Hansen (`gross_tree_cover_loss_ha`) se calculan y publican en un conjunto de indicadores separado.

**Geometría y área:** usar áreas de píxel reales en GEE (`ee.Image.pixelArea().divide(10000)`) o áreas calculadas con proyección adecuada si el producto fue exportado a raster local. Nunca contar celdas × 900 m² asumiendo área geodésica exacta.

---

## 3. Fuentes y requisitos de acceso

| Dominio | Fuente | Alcance real | Estado de integración |
|---|---|---|---|
| Cobertura/uso del suelo anual | MapBiomas México, Colección 1 | 1985–2025, Landsat 30 m | **Validar acceso al asset oficial y leyenda antes de programar el ingestor** |
| Pérdida bruta arbórea | Hansen Global Forest Change v1.13 | 2001–2025, ~30 m | Asset GEE documentado |
| Límites del estado y municipios | INEGI, Marco Geoestadístico (versión fijada) | Edomex y 125 municipios | Descargar y validar geometría y claves |
| Mosaicos RGB históricos | Landsat Collection 2 Level 2 | 2010–2016 | Post-MVP |
| Mosaicos RGB recientes | Sentinel-2 SR Harmonized | 2017 en adelante | Post-MVP |
| Alertas recientes | Fuente a seleccionar con comprobación de cobertura en México | Depende de producto | **No integrar RADD por defecto** |

### Bloqueos que AI-IDE debe resolver explícitamente

**B1 — MapBiomas:** localizar el asset oficial accesible y verificar si es `Image`, `ImageCollection` o bandas anuales; probar 2010 y 2025 para un municipio. Revisar la leyenda, códigos y definiciones oficiales. **No escribir un asset ID supuesto.** Si el acceso no es inmediato, crear `MapBiomasAdapter` más una prueba fallida claramente marcada como dependencia pendiente; no publicar datos calculados desde otra fuente bajo el nombre MapBiomas.

**B2 — Límites INEGI:** elegir una versión y guardar `boundary_version`. Conservar la clave oficial, no unir municipios solo por nombre. Validar exactamente 125 municipios, geometrías válidas y pertenencia estatal. Un municipio podrá tener geometría `MultiPolygon`.

**B3 — GEE:** confirmar el proyecto, credenciales, cuota y elegibilidad de uso antes de ejecutar lotes grandes. Los usos operativos gubernamentales suelen requerir una modalidad de pago; el desarrollo no debe depender de credenciales personales insertadas en código.

**B4 — Fuente de alertas:** ninguna alerta se presenta al usuario hasta verificar espacialmente sus productos en Edomex, su fecha efectiva y su confiabilidad. El RADD tropical no se asume aplicable por defecto.

**B5 — Licencias/atribución:** añadir atribución a fuentes de datos y mapas de fondo. Revisar políticas de proveedores de teselas y la redistribución de productos derivados.

---

## 4. Arquitectura objetivo

```text
                       VISOR WEB PÚBLICO
       React + Vite + TypeScript + Tailwind + MapLibre GL JS
       ----------------------------------------------------
       Mapa | Municipio | Año | Comparador | Capas | Gráficas
                              |
                            HTTPS
                              |
                       FASTAPI /api/v1
             ┌────────────────┼───────────────────┐
             |                |                   |
      Metadata/regions    Estadísticas         Tiles / capas
             |                |                   |
       PostgreSQL/PostGIS ----┘              GEE / COG / PMTiles
             ^                                    ^
             |                                    |
        ETL geoespacial programado: Python + Earth Engine
             ^                                    ^
             |                                    |
     INEGI | MapBiomas México | Hansen GFC | mosaicos opcionales
```

### 4.1 Decisiones de infraestructura

- **Frontend:** conservar React + Vite + TypeScript + Tailwind del proyecto si existe.
- **Mapa:** adoptar **MapLibre GL JS** para raster y vector, cortinilla y capas complejas. Inspeccionar el mapa actual antes de migrar desde Leaflet; no mantener simultáneamente dos motores en la nueva ruta del visor.
- **Estado UI:** React state/context para selección de zona/años/capas; TanStack Query si ya existe o si facilita caché de API.
- **Gráficas:** Recharts o librería existente, sin nueva dependencia si ya hay una adecuada.
- **Backend:** FastAPI + Pydantic + SQLAlchemy + GeoAlchemy2.
- **Base:** PostgreSQL + PostGIS para límites, metadatos, series precalculadas y transiciones.
- **ETL:** Python y Earth Engine para cómputo pesado por lotes, con scripts reejecutables e idempotentes.
- **Tiles:** preferir productos cacheables/estáticos publicados con autorización (COG/PMTiles/tiles) para capas ya generadas. Aceptar GEE `getMapId` en prototipo/adaptador, considerando caducidad y renovación de URL.
- **Asincronía:** scripts CLI primero. Celery/Redis **solo si** hay necesidad demostrada de programación/colas en producción, para evitar complejidad innecesaria en MVP.
- **Deploy:** Docker Compose para desarrollo; producción se decide después de medir costes y carga.

### 4.2 Razón del precálculo

Nunca hacer `reduceRegions` sobre todo Edomex cada vez que un usuario cambie de año. El navegador solicita estadísticas almacenadas en Postgres. Earth Engine sirve para generar/versionar productos, no para resolver cada interacción básica de la UI.

---

## 5. UX: pantalla principal única

```text
┌──────────────────────────────────────────────────────────────────────────────┐
│ PROBOSQUE — Monitor forestal del Estado de México            [Fuentes] [?] │
├───────────────────────┬──────────────────────────────────────────────────────┤
│ EXPLORADOR            │                     MAPA                             │
│                       │                                                      │
│ Área de análisis      │       Límites Edomex / Municipios                    │
│ [Estado de México  v] │       Cobertura anual / Pérdida / Transiciones       │
│ [Municipio       v]   │                                                      │
│                       │       [Cortinilla al comparar dos años]              │
│ Capas                 │                                                      │
│ [x] Cobertura anual   │                                                      │
│ [ ] Pérdida arbórea   │                                                      │
│ [ ] Límite municipal  │                                                      │
│                       │                                                      │
│ Año: [2025     v]     │                                                      │
│ Comparar: [OFF/ON]    │                                                      │
│ A: [2010]  B: [2025]  │                                                      │
├───────────────────────┴──────────────────────────────────────────────────────┤
│ Indicadores del área: cobertura por clase | cambio neto | pérdida bruta     │
│ Gráfico serie temporal (2010–2025)    [ver metodología y fuente]            │
└──────────────────────────────────────────────────────────────────────────────┘
```

### 5.1 Comportamiento del usuario

1. Abre la web y ve el Estado de México (sin login).
2. Selecciona **cobertura y uso del suelo** y mueve el año.
3. Selecciona **Valle de Bravo**, por ejemplo, y el mapa enfoca ese municipio.
4. Activa **Comparar**, fija `2010` (izquierda) y `2025` (derecha), y desplaza la cortinilla.
5. Abre **Cambios** para resaltar píxeles que cambiaron de clase entre los años (fuente homogénea).
6. Lee la serie temporal y la matriz de transiciones del área seleccionada.
7. Activa **pérdida bruta de cobertura arbórea (Hansen)**, sin sustituir ni confundir sus métricas con las anteriores.
8. Consulta fuentes, leyenda, interpretación y limitaciones.

### 5.2 Componentes propuestos

```text
ForestViewerPage
├── ViewerHeader
├── ViewerSidebar
│   ├── RegionSelector
│   ├── LayerCatalog
│   ├── YearSelector
│   ├── CompareControls
│   └── LayerLegend
├── MapViewport
│   ├── BaseMap
│   ├── EdomexBoundaryLayer
│   ├── MunicipalBoundariesLayer
│   ├── AnnualLandCoverLayer
│   ├── HansenLossLayer
│   ├── TransitionLayer
│   └── SwipeCompareMode
├── ForestStatsPanel
│   ├── SummaryMetrics
│   ├── AnnualAreaChart
│   ├── AnnualGrossLossChart
│   └── TransitionMatrix
└── SourceMetadataDrawer
```

### 5.3 Condiciones de UX

- Sin números inventados: si falta un indicador, mostrar `Datos no disponibles`.
- El mapa muestra **año, fuente, colección y leyenda** activos.
- La leyenda visual está ligada al catálogo de códigos oficiales, no a colores inventados.
- El estado y municipio se seleccionan por ID oficial, no por texto libre.
- Cuando se cambia de municipio se actualizan todas las capas, estadísticas y URL compartible.
- La comparación utiliza dos mapas sincronizados; mover uno no desincroniza el otro.
- En móvil el mapa ocupa el área principal, con panel de control plegable y gráficas en drawer inferior.
- Atribución científica y mapa base visibles.
- El modo comparación debe tener manejo correcto de `resize` y liberar instancias al desmontarse (evitar fugas de WebGL).

---

## 6. Esquema de datos mínimo

Usar migraciones Alembic. Los nombres siguientes son orientativos pero el contenido semántico es obligatorio. No duplicar tablas existentes con la misma función.

### 6.1 `geo_regions`

```text
id (UUID o clave estable)
inegi_code UNIQUE
name
type ENUM('state','municipality')
parent_id NULLABLE
geom MULTIPOLYGON SRID 4326
boundary_version
area_ha_geodesic
created_at
```

Índices: GIST(geom), UNIQUE(inegi_code), (type, parent_id). `area_ha_geodesic` derivada de geometría/PostGIS `ST_Area(geom::geography)/10000`, no ingresada manualmente.

### 6.2 `data_sources` y `land_cover_classes`

```text
data_sources:
  id, key, provider, product, collection_version,
  first_year, last_year, resolution_m, license, citation_url,
  methodology_url, ingest_status, created_at

land_cover_classes:
  id, source_id, class_code, class_label, hex_color,
  official_parent_code, forest_grouping_version, is_forest_approved
```

`is_forest_approved` permanece sin configurar hasta aprobar la agrupación con el catálogo/criterio de dominio. No asumir que toda vegetación natural es bosque.

### 6.3 `raster_products`

```text
id, source_id, indicator, year, pair_year NULLABLE,
region_scope, processing_version, legend_version,
asset_ref NULLABLE, storage_uri NULLABLE,
tile_strategy ENUM('gee','pmtiles','xyz','cog'),
status ENUM('pending','ready','failed','unavailable'),
valid_pixel_fraction NULLABLE,
produced_at, metadata JSONB
```

Para una capa de transiciones el `pair_year` debe registrar el segundo año y los parámetros de combinación.

### 6.4 `region_year_stats`

```text
region_id, source_id, year, class_code, area_ha,
valid_area_ha, nodata_area_ha, processing_version, created_at
UNIQUE (region_id, source_id, year, class_code, processing_version)
```

La fuente y versión son parte de la clave analítica, no campos decorativos.

### 6.5 `region_transition_stats`

```text
region_id, source_id, year_from, year_to,
class_from, class_to, area_ha,
valid_common_area_ha, processing_version, created_at
```

Agregar índices para el par de años y municipio. Un cambio de versión exige una nueva ejecución y no sobrescritura silenciosa.

### 6.6 `region_annual_loss_stats`

```text
region_id, source_id, year, gross_tree_cover_loss_ha,
canopy_threshold_pct, analysis_mask_version,
processing_version, created_at
```

**Nunca unir** `gross_tree_cover_loss_ha` con `net_change_ha` como si fuesen equivalentes.

### 6.7 `processing_runs`

```text
id, job_name, source_id, parameters JSONB,
status, started_at, finished_at,
output_version, counts JSONB, error_detail,
source_asset_hash NULLABLE
```

---

## 7. Contratos de API — `/api/v1/forest`

Todas las respuestas del dominio incluyen metadatos de fuente y disponibilidad; todos los errores son JSON estructurado. Los endpoints GET públicos no exigen autenticación.

| Endpoint | Función |
|---|---|
| `GET /metadata` | Años, fuentes, indicadores, versiones, leyendas, estados disponibles |
| `GET /regions?type=municipality` | Estado y municipios con claves oficiales y nombres |
| `GET /regions/{region_id}` | Detalle, bbox y geometría generalizada para visualización |
| `GET /layers?indicator=land_cover&year=2025` | Capas publicadas y disponibilidad |
| `GET /layers/{id}/tiles` | Estrategia y URL de tiles válida (o `unavailable`) |
| `GET /stats/annual?region_id=...&source=mapbiomas&from=2010&to=2025` | Serie anual por clase |
| `GET /stats/loss?region_id=...&from=2010&to=2025` | Pérdida bruta anual Hansen |
| `GET /stats/transitions?region_id=...&from=2010&to=2025` | Matriz de transiciones |
| `GET /compare?region_id=...&year_a=2010&year_b=2025` | Metadatos/capas compatibles para swipe |
| `GET /health` | Salud de la aplicación (no consultar GEE en cada request) |

### 7.1 Ejemplo de respuesta anual **sin valores inventados**

```json
{
  "region_id": "<id-oficial-resuelto>",
  "indicator": "land_cover_area_by_class",
  "source": {
    "key": "mapbiomas_mexico",
    "collection": "1",
    "resolution_m": 30,
    "legend_version": "<verificada>"
  },
  "unit": "ha",
  "series": [
    {"year": 2010, "classes": [{"code": "<codigo>", "area_ha": null}]}
  ],
  "data_status": "example_schema_only"
}
```

**Importante:** el JSON es un contrato ilustrativo, no un mock de estadísticas listo para mostrar. En runtime los valores deben ser reales o retornar indisponibilidad.

### 7.2 Reglas de contrato

- `year` en rango según la fuente: para MapBiomas v1 hasta 2025; para Hansen v1.13 hasta 2025.
- `year_a < year_b` para comparación de cambios (o permitir invertir solo la disposición visual, sin invertir el signo estadístico accidentalmente).
- No exponer las credenciales de GEE al navegador.
- Si una URL de tiles de GEE caduca, el backend emite una nueva; no guardar permanentemente URLs efímeras en tablas.
- Respuestas de estadísticas deben incluir `source_version`, `methodology_version`, `last_processed_at` y `data_status`.
- Error por fuente no disponible: `503 DATA_SOURCE_UNAVAILABLE` o similar, no HTTP 200 con cifras `0`.
- Limitar tamaño de geometrías y consultas para evitar abuso de la API pública.

---

## 8. Estructura de repositorio sugerida

> Adaptar a la estructura del repo existente. Si el proyecto ya usa `app/`, `api/` o `FEPI/`, integrarlo ahí en vez de crear proyectos duplicados.

```text
frontend/
  src/
    pages/ForestViewerPage.tsx
    features/forest-viewer/
      components/
        ViewerSidebar.tsx
        ForestMap.tsx
        RegionSelector.tsx
        LayerCatalog.tsx
        YearSelector.tsx
        SwipeCompare.tsx
        ForestStatsPanel.tsx
        SourceMetadataDrawer.tsx
      hooks/useForestMap.ts
      services/forestApi.ts
      types/forest.ts
      config/indicators.ts
      utils/mapLayers.ts
    shared/components/
    styles/

backend/
  app/
    api/v1/forest.py
    schemas/forest.py
    models/forest.py
    services/forest/
      catalog.py
      stats.py
      tiles.py
      regions.py
    repositories/forest_repository.py
    core/settings.py
  migrations/
  tests/

pipelines/
  configs/
    data_sources.yaml
    edomex_forest_classes.yaml
  scripts/
    validate_sources.py
    load_inegi_boundaries.py
    ingest_mapbiomas.py
    process_hansen_loss.py
    build_region_stats.py
    build_transitions.py
    publish_raster_products.py
  tests/

docs/
  product_scope.md
  data_dictionary.md
  sources_and_licenses.md
  methodology.md
  etl_runbook.md
  decisions.md
```

---

## 9. Roadmap de construcción, orden obligatorio

Cada fase puede convertirse en un ticket/iteración del AI-IDE. **No comenzar la siguiente si la aceptación de la actual falla**, salvo documentar un bloqueo externo y trabajar en una parte explícitamente independiente.

### Fase 0 — Descubrimiento de repo, geodatos y licencias

**Objetivo:** demostrar que existen los datos necesarios y que el repositorio puede soportar el nuevo visor.

**Tareas AI-IDE:**

- Inventariar rutas antiguas (`TechPlots`, `AdminMap`, `InteractiveMap`, etc. si existen), dependencias y código reutilizable.
- Revisar el flujo React/Vite/Tailwind actual; escoger **una** tecnología de mapas para el visor.
- Descargar o localizar geometrías oficiales INEGI de Edomex con 125 municipios; verificar coordenadas SRID/validez.
- Acceder a MapBiomas México Colección 1; anotar asset real, estructura, leyenda y método de acceso; obtener un mapa de 2010 y uno de 2025 para **un municipio**.
- Probar Hansen `lossyear` para el mismo municipio y comprobar que el año 2010 corresponde a valor 10.
- Comprobar configuración legal/operativa de Earth Engine; registrar riesgos y costes.
- Elaborar `docs/data_dictionary.md`, `docs/decisions.md`, `docs/sources_and_licenses.md`.

**Entregables:** inventario, decisiones documentadas, datasets confirmados, script de prueba reproducible y bloqueos.

**Aceptación:** existen evidencias reales de lectura de 2 años MapBiomas y Hansen sobre una misma AOI; si MapBiomas falla, el bloqueo queda documentado y no se falsea como cumplido.

### Fase 1 — Shell web y mapa oficial del Estado de México

**Objetivo:** entregar una página funcional con el mapa real y selección de 125 municipios, sin depender aún del cálculo de coberturas.

**Tareas:**

- Crear ruta principal `/visor` y redirección inicial configurada.
- Implementar `ForestViewerPage`, `ForestMap`, `ViewerSidebar`, estilos responsive.
- Preparar MapLibre y estilo base con proveedor autorizado y atribución.
- Cargar perímetro del estado y municipios desde API/PostGIS (generalizados para el mapa).
- Buscar/seleccionar municipio por clave y centrar el mapa en su `bbox`.
- Evitar que el mapa inicie fuera de Edomex, sin sustituir el filtro espacial real con un bbox.
- Mantener el panel de estadísticas como *empty state* etiquetado, sin cifras inventadas.

**Aceptación:** aparecen los 125 municipios correctos, el selector enfoca bien y todo funciona en desktop y móvil; lint/build pasan.

### Fase 2 — Ingesta MapBiomas y cobertura anual (vertical slice)

**Objetivo:** mostrar datos anuales reales de cobertura y uso del suelo para un municipio.

**Tareas:**

- Implementar `MapBiomasAdapter` a partir del asset **verificado** en Fase 0.
- Importar códigos, nombres y colores de la leyenda oficial.
- Crear `data_sources`, `land_cover_classes`, `raster_products`, `region_year_stats` con migraciones.
- Implementar pipeline idempotente para 2010 y 2025 de un municipio primero.
- Validar superficies y máscara `no-data` contra resultados oficiales o cálculos independientes.
- Generar/publicar una capa renderizable por año; documentar GEE tile temporal vs prepublicación.
- Exponer `GET /metadata`, `/layers`, `/stats/annual`.
- Añadir selector de año y leyenda funcional en frontend.
- Expandir a los 125 municipios y años 2010–2025 una vez validado el corte mínimo; introducir lotes y reintentos seguros.

**Aceptación:** al cambiar de 2010 a 2025 cambia un **mapa clasificado real**, no solo una foto base; las estadísticas provienen de Postgres y tienen metadatos.

### Fase 3 — Comparación temporal y mapa de transiciones

**Objetivo:** comparar dos mapas clasificados y consultar cambios reales por categoría.

**Tareas:**

- Implementar modo `Compare` con dos instancias MapLibre sincronizadas y control swipe (verificar compatibilidad del plugin instalado).
- Asegurar misma extensión geográfica, zoom y leyenda/fuente entre ambos años.
- Calcular transición `class(2010) -> class(2025)` en área común válida por píxel.
- Crear `region_transition_stats` y endpoint `/stats/transitions`.
- Incorporar visualización de matriz de transiciones y cambio neto de clases forestales aprobadas.
- Distinguir `sin datos` y `sin cambio`; permitir activar/desactivar resaltado de transiciones.
- No usar comparación RGB como sustituto del cambio clasificado.

**Aceptación:** comparador se mantiene alineado, matriz de transiciones es consistente, fuente y años siempre visibles, los `no-data` no aparecen como pérdida.

### Fase 4 — Hansen: pérdida bruta arbórea independiente

**Objetivo:** ofrecer una capa histórica complementaria sin contaminar la estadística de cobertura anual.

**Tareas:**

- Implementar `HansenAdapter` con `UMD/hansen/global_forest_change_2025_v1_13`.
- Definir parámetro/documentación de la máscara de referencia arbórea y año de evento.
- Calcular área por municipio/año 2010–2025 con máscara idéntica a la usada en tiles.
- Persistir `region_annual_loss_stats` y endpoint `/stats/loss`.
- Mostrar capa, leyenda por año de pérdida y gráfica de pérdida bruta anual.
- Añadir advertencia visible: `pérdida arbórea ≠ deforestación permanente ≠ pérdida neta de bosque`.

**Aceptación:** la suma de pérdidas anuales coincide con la pérdida acumulada del periodo bajo la misma máscara y la estadística es independiente de MapBiomas.

### Fase 5 — Experiencia analítica, rendimiento y documentación

**Objetivo:** convertir las funcionalidades en una herramienta pública comprensible y rápida.

**Tareas:**

- Añadir tarjetas con métricas de cobertura por año, diferencia absoluta y relativa cuando el criterio forestal esté aprobado.
- Implementar gráfico de serie 2010–2025 y tabla de datos accesible.
- Permitir copiar URL compartible con región, indicador y años: `?region=...&layer=...&a=2010&b=2025`.
- Implementar `loading`, `error`, `empty`, `partial` y `outdated` states.
- Agregar drawer de metodología con citas, descarga de leyenda y advertencias.
- Optimizar consultas: índices, caché y tiles; proteger API contra peticiones excesivas.
- Incorporar pruebas E2E de los flujos principales y monitoreo básico.

**Aceptación:** al seleccionar un municipio y dos años, visor, estadísticas y gráficos cambian coherentemente; sin consultas pesadas a GEE por clic; rendimiento se mide en entorno de prueba real.

### Fase 6 — Opcionales posteriores al MVP (NO bloquear entrega)

- Mosaicos ópticos Landsat/Sentinel con composición estacional homologada y documentación de calidad.
- Selector/dibujo de polígonos AOI, límites de superficie y tareas de análisis asíncronas.
- Exportación CSV/GeoJSON/PNG con fuente y versión.
- Alertas recientes con producto efectivamente validado en Edomex.
- Nuevas series de MapBiomas si se publican nuevas colecciones.
- Herramientas institucionales, roles y panel de gestión, si Probosque los solicita.
- Funcionalidades PWA únicamente si existe un caso operativo offline claro.

---

## 10. Pruebas obligatorias

### 10.1 Geoespacial

- Estado de México y **125** municipios en archivo/versionado elegido.
- Las geometrías están válidas y son poligonales; SRID normalizado a 4326 para API.
- Área geodésica de INEGI en PostGIS dentro de tolerancia acordada con fuente oficial.
- Las estadísticas zonales usan el mismo límite administrativo y misma versión.
- Un polígono `MultiPolygon` se trata correctamente.
- Pixel mask y no-data se conservan en la matriz de cambios.

### 10.2 Semánticas y estadísticas

- `lossyear=10` → 2010; `lossyear=25` → 2025.
- `MapBiomas annual forest area` NO se calcula con `Hansen loss`.
- `Hansen gross loss` NO se presenta como `deforestation` ni se resta directamente del forest stock.
- Ningún método devuelve porcentajes cuando el denominador es cero.
- Cada clase conserva código/color/etiqueta oficial de la colección.
- El cambio neto se calcula con la misma definición forestal en ambos años.
- Las transiciones son reproducibles por `source_version` y `processing_version`.
- Las sumas de transiciones coinciden con el área común válida dentro de tolerancia geoespacial documentada; no forzar igualdad cuando existe no-data.

### 10.3 Frontend

- Selección del Estado de México y de tres municipios de prueba.
- Cambiar entre 2010 y 2025 actualiza tanto raster como metadatos.
- Swipe sincronizado, probado con zoom, pan, resize y desmontaje.
- Leyenda correcta por capa; el usuario no puede confundir fuente/año.
- Si no existe año/capa, la UI informa y no dibuja datos falsos.
- No hay errores críticos en consola ni fugas de listeners al alternar comparador.
- Navegación operable por teclado y pantalla pequeña.

### 10.4 Backend / ETL

- Test de límites de parámetros año/indicador/región.
- ETL repetido con la misma versión no duplica estadísticas.
- Fallos parciales registran ejecución y pueden reintentarse.
- Validar transformaciones PostGIS vs píxel-área GEE en una AOI reducida.
- La API nunca publica rutas locales, tokens ni credenciales GEE.
- Las estadísticas precalculadas no lanzan cómputo pesado GEE en lectura normal.

---

## 11. Riesgos y soluciones

| Riesgo | Prevención |
|---|---|
| MapBiomas no accesible por el mecanismo esperado | Resolver acceso en Fase 0; crear adaptador e identificar fuente real, sin inventar asset ID |
| Leyenda/clases no equivalen a bosque | Versionar agrupación forestal y no publicar `forest_area_ha` hasta validación de criterio |
| Hansen interpretado como deforestación neta | Denominación y metadatos explícitos en API y UI |
| Cambios aparentes por Landsat/Sentinel | Comparador principal basado en misma colección clasificada; RGB opcional |
| GEE lento/caro o URL de tiles vencida | Precálculo, caché, productos estáticos y renovación de sesiones de tiles |
| Cortinilla desincronizada o WebGL costoso | Plugin compatible, mapa único por modo normal, instancias controladas por lifecycle React |
| Municipios con geometría compleja | Simplificación solo para visualización; usar geometría completa en analítica |
| Mapas de 2026 presentados como completos | Año 2026 solo en módulo provisional y etiquetado |
| Coste de operación GEE | Verificar términos, cuotas, configuración y alternativa de entrega de tiles antes de despliegue |
| UI simula resultados antes de tener datos | States vacíos reales y fixtures limitados a tests/demo explícitamente etiquetada |

---

## 12. Criterios de aceptación del MVP

El MVP está listo únicamente cuando:

- [ ] La web abre sin login y muestra el Estado de México con límites municipales oficiales.
- [ ] Se pueden seleccionar los 125 municipios y enfocar el seleccionado.
- [ ] Se muestran capas reales de cobertura/uso del suelo de **2010–2025** con leyenda oficial y fuente identificada.
- [ ] El usuario puede comparar dos años mediante cortinilla sincronizada.
- [ ] Se pueden consultar superficies por clase y serie anual para estado/municipio.
- [ ] Existe análisis de transiciones para par de años con manejo explícito de no-data.
- [ ] Se muestra pérdida arbórea Hansen anual e histórica como indicador distinto.
- [ ] Todos los valores provienen de datos procesados reproducibles, no de números mock.
- [ ] API y frontend entregan errores legibles y metadatos de procedencia.
- [ ] `npm run build`, lint, tests backend y tests E2E aplicables pasan o bloqueos quedan registrados.
- [ ] Se incluye documentación de datasets, colección, licencia, umbrales y limitaciones.
- [ ] No se depende de login, roles, carbono, PWA ni sistema de auditoría para utilizar el visor.

### Objetivos de rendimiento (medir, no prometer antes de probar)

- Metadatos y series precalculadas: objetivo de respuesta p95 inferior a 1 segundo en entorno de prueba.
- Navegación del mapa fluida a escala municipal, condicionada por red, proveedor y dispositivo.
- El clic de un municipio no dispara una recomputación de todo el estado en GEE.
- Se reportan tiempos reales por capa, peso de tiles, consumo y coste para planificar producción.

---

## 13. Instrucciones de inicio para el AI-IDE (copiar y ejecutar)

> **Tarea:** Eres el agente implementador del proyecto Probosque. El objetivo ha cambiado: ahora debes construir un visor web público de evolución de cobertura y uso del suelo del Estado de México, inspirado en GeoBosques. Lee por completo `PLAN_IMPLEMENTACION_VISOR_FORESTAL_EDOMEX_AI_IDE.md` y el repositorio antes de editar.
>
> **Empieza exclusivamente con la Fase 0.** Inspecciona rutas, backend, dependencias y mapa existente. Verifica la fuente oficial MapBiomas México Colección 1 (años 2010 y 2025 y leyenda), Hansen GFC v1.13, geometría INEGI de 125 municipios y viabilidad/condiciones de GEE. Crea el inventario del código reutilizable, el diccionario de datos, la documentación de fuentes y la lista de bloqueos. No desarrolles pantallas de auditoría ni administración, no agregues carbono, no inventes datos científicos ni credenciales.
>
> Tras Fase 0, implementa **una fase a la vez**, siguiendo sus criterios de aceptación. Después de cada fase ejecuta pruebas reales y reporta archivos cambiados, endpoints/migraciones y resultados. Si falta un asset oficial, detén únicamente ese bloque con una explicación exacta; sigue con tareas independientes sin simular que existen datos reales.

### Primer corte vertical sugerido tras Fase 0

`Municipio real (INEGI) → MapBiomas 2010 y 2025 (asset verificado) → cálculo zonal para ese municipio → Postgres → FastAPI → un mapa con selector de año y leyenda oficial → test de consistencia`.

Este corte aporta más valor y menos riesgo que construir de golpe todos los controles del visor sin tener el dato geoespacial verificado.

---

## 14. Fuentes de referencia (verificadas al redactar)

1. GeoBosques, visor oficial: https://geobosques.minam.gob.pe/geobosque/visor/
2. MapBiomas México, visión de la Colección 1: https://mexico.mapbiomas.org/iniciativas-y-productos/metodologia-mapbiomas/vision-general/
3. MapBiomas México, productos/descargas y leyenda: https://mexico.mapbiomas.org/iniciativas-y-productos/cobertura-y-uso-del-suelo/cobertura-30m/
4. MapBiomas, toolkit de acceso/exportación: https://github.com/mapbiomas/user-toolkit
5. Hansen GFC v1.13 en GEE: https://developers.google.com/earth-engine/datasets/catalog/UMD_hansen_global_forest_change_2025_v1_13
6. Landsat C2 migración y factores de escala: https://developers.google.com/earth-engine/landsat_c1_to_c2
7. Sentinel-2 SR Harmonized: https://developers.google.com/earth-engine/datasets/catalog/COPERNICUS_S2_SR_HARMONIZED
8. Plugins MapLibre (compare): https://maplibre.org/maplibre-gl-js/docs/plugins/
9. Licenciamiento Earth Engine operacional: https://developers.google.com/earth-engine/guides/transition_to_commercial
10. MapBiomas México, licencia abierta y atribución: https://mexico.mapbiomas.org/iniciativas-y-productos/cobertura-y-uso-del-suelo/cobertura-30m/

**Nota:** esta especificación combina la intención del pipeline inicialmente compartido (Hansen + mosaicos + estadísticas + alertas) con cambios de alcance y correcciones científicas/tecnológicas. El acceso concreto al asset MapBiomas, la versión oficial de INEGI y la política de clases forestales deben documentarse por el agente durante Fase 0; no se presentan aquí como resueltos.
