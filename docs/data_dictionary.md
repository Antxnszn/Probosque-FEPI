# Diccionario de Datos y Modelo de Entidades

## Visor Forestal Multitemporal del Estado de México — Probosque

Este documento describe el modelo de datos relacional y geoespacial que soporta el visor forestal, sus tipos de datos, restricciones, índices y contratos de API en FastAPI.

---

## 1. Modelo de Datos Geoespacial y Tabular (PostgreSQL + PostGIS)

### 1.1 `geo_regions` (Límites territoriales oficiales)
Almacena la geometría del Estado de México y sus 125 municipios oficiales según el Marco Geoestadístico de INEGI.

| Campo | Tipo | Nulable | Descripción |
|---|---|---|---|
| `id` | `UUID` | No | Clave primaria única |
| `inegi_code` | `VARCHAR(10)` | No | Clave oficial INEGI (ej. `'15'` para el estado; `'15001'` a `'15125'` para municipios). `UNIQUE` |
| `name` | `VARCHAR(100)` | No | Nombre oficial del municipio o estado (ej. "Valle de Bravo", "Zinacantepec") |
| `type` | `VARCHAR(20)` | No | `'state'` o `'municipality'` |
| `parent_id` | `UUID` | Sí | Referencia al estado padre (para municipios, apunta al registro del Estado de México) |
| `geom` | `GEOMETRY(MULTIPOLYGON, 4326)` | No | Geometría vectorial en coordenadas geográficas WGS84 |
| `boundary_version` | `VARCHAR(50)` | No | Versión del marco geoestadístico (ej. `'INEGI-MG-2023-12'`) |
| `area_ha_geodesic` | `NUMERIC(14, 4)` | No | Superficie real en hectáreas calculada en PostGIS mediante `ST_Area(geom::geography) / 10000` |
| `bbox` | `JSONB` | No | Bounding box `[min_lon, min_lat, max_lon, max_lat]` para navegación y encuadre en el mapa |
| `created_at` | `TIMESTAMPTZ` | No | Fecha de creación del registro |

**Índices:**
- `GIST (geom)`
- `UNIQUE (inegi_code)`
- `INDEX (type, parent_id)`

---

### 1.2 `data_sources` (Fuentes y colecciones científicas)
Catálogo de fuentes científicas oficiales ingeridas en el sistema.

| Campo | Tipo | Nulable | Descripción |
|---|---|---|---|
| `id` | `UUID` | No | Clave primaria |
| `key` | `VARCHAR(50)` | No | Identificador corto (`mapbiomas_mexico`, `hansen_gfc`, `inegi_mg`). `UNIQUE` |
| `provider` | `VARCHAR(100)` | No | Organización proveedora |
| `product` | `VARCHAR(100)` | No | Nombre del producto |
| `collection_version` | `VARCHAR(50)` | No | Versión de la colección (ej. `'1.0'`, `'v1.13'`) |
| `first_year` | `INTEGER` | No | Primer año con cobertura (ej. 1985 o 2000) |
| `last_year` | `INTEGER` | No | Último año disponible (ej. 2025) |
| `resolution_m` | `NUMERIC(6, 2)` | No | Resolución espacial nominal (ej. 30.0) |
| `license` | `VARCHAR(100)` | No | Tipo de licencia (ej. `'CC BY-SA 4.0'`, `'CC BY 4.0'`) |
| `citation_url` | `VARCHAR(255)` | Sí | Enlace a la cita o publicación científica |
| `methodology_url` | `VARCHAR(255)` | Sí | Enlace al manual o documento metodológico |
| `ingest_status` | `VARCHAR(20)` | No | Estado (`'ready'`, `'pending'`, `'unavailable'`) |
| `created_at` | `TIMESTAMPTZ` | No | Fecha de registro |

---

### 1.3 `land_cover_classes` (Leyenda oficial de clases)
Clases temáticas de cobertura y uso del suelo extraídas de la leyenda oficial.

| Campo | Tipo | Nulable | Descripción |
|---|---|---|---|
| `id` | `UUID` | No | Clave primaria |
| `source_id` | `UUID` | No | FK a `data_sources.id` |
| `class_code` | `INTEGER` | No | Código numérico oficial de la clase (ej. 88 = Bosque templado, 89 = Selva seca) |
| `class_label` | `VARCHAR(100)` | No | Nombre oficial en español |
| `class_label_en` | `VARCHAR(100)` | Sí | Nombre oficial en inglés |
| `hex_color` | `VARCHAR(7)` | No | Color hexadecimal oficial (ej. `'#329c5a'`) |
| `official_parent_code`| `INTEGER` | Sí | Código de la clase padre en la jerarquía |
| `forest_grouping_version` | `VARCHAR(50)` | No | Versión de la regla de agrupación (ej. `'probosque-v1.0'`) |
| `is_forest_approved` | `BOOLEAN` | No | `True` si la clase forma parte de la cobertura forestal aprobada por Probosque |

---

### 1.4 `region_year_stats` (Estadísticas anuales precalculadas de cobertura)
Superficie por clase de cobertura, municipio y año.

| Campo | Tipo | Nulable | Descripción |
|---|---|---|---|
| `id` | `UUID` | No | Clave primaria |
| `region_id` | `UUID` | No | FK a `geo_regions.id` |
| `source_id` | `UUID` | No | FK a `data_sources.id` |
| `year` | `INTEGER` | No | Año calendario (2010 a 2025) |
| `class_code` | `INTEGER` | No | Código de la clase |
| `area_ha` | `NUMERIC(14, 4)` | No | Superficie clasificada en hectáreas (calculada con áreas reales de píxel) |
| `valid_area_ha` | `NUMERIC(14, 4)` | No | Superficie total con datos válidos en ese año |
| `nodata_area_ha` | `NUMERIC(14, 4)` | No | Superficie sin datos en el polígono |
| `processing_version` | `VARCHAR(50)` | No | Versión del pipeline de cómputo (ej. `'etl-v1.0'`) |
| `created_at` | `TIMESTAMPTZ` | No | Fecha de procesamiento |

**Restricción de unicidad:**
- `UNIQUE (region_id, source_id, year, class_code, processing_version)`

---

### 1.5 `region_transition_stats` (Matriz de transiciones entre dos años)
Matriz de cambio de clase entre un año inicial y un año final.

| Campo | Tipo | Nulable | Descripción |
|---|---|---|---|
| `id` | `UUID` | No | Clave primaria |
| `region_id` | `UUID` | No | FK a `geo_regions.id` |
| `source_id` | `UUID` | No | FK a `data_sources.id` |
| `year_from` | `INTEGER` | No | Año origen (ej. 2010) |
| `year_to` | `INTEGER` | No | Año destino (ej. 2025) |
| `class_from` | `INTEGER` | No | Clase temática en `year_from` |
| `class_to` | `INTEGER` | No | Clase temática en `year_to` |
| `area_ha` | `NUMERIC(14, 4)` | No | Superficie que transitó de `class_from` a `class_to` |
| `valid_common_area_ha`| `NUMERIC(14, 4)`| No | Área común con píxeles válidos en ambos años |
| `processing_version` | `VARCHAR(50)` | No | Versión del procesamiento |
| `created_at` | `TIMESTAMPTZ` | No | Fecha de procesamiento |

**Índices:**
- `INDEX (region_id, year_from, year_to)`

---

### 1.6 `region_annual_loss_stats` (Pérdida arbórea bruta Hansen)
Superficie anual de pérdida de dosel arbóreo por municipio.

| Campo | Tipo | Nulable | Descripción |
|---|---|---|---|
| `id` | `UUID` | No | Clave primaria |
| `region_id` | `UUID` | No | FK a `geo_regions.id` |
| `source_id` | `UUID` | No | FK a `data_sources.id` |
| `year` | `INTEGER` | No | Año del evento de pérdida (2010 = 10, ..., 2025 = 25) |
| `gross_tree_cover_loss_ha` | `NUMERIC(14, 4)` | No | Pérdida bruta de dosel detectada en ese año |
| `canopy_threshold_pct` | `INTEGER` | No | Umbral de cobertura de copa aplicado (ej. 30%) |
| `analysis_mask_version` | `VARCHAR(50)` | No | Versión de la máscara de referencia |
| `processing_version` | `VARCHAR(50)` | No | Versión del pipeline de cómputo |
| `created_at` | `TIMESTAMPTZ` | No | Fecha de procesamiento |

**Restricción de unicidad:**
- `UNIQUE (region_id, source_id, year, canopy_threshold_pct, processing_version)`

---

### 1.7 `raster_products` (Metadatos de capas y teselas)
Catálogo de capas publicadas para el mapa (cobertura anual, mapa de transiciones y pérdida Hansen).

| Campo | Tipo | Nulable | Descripción |
|---|---|---|---|
| `id` | `UUID` | No | Clave primaria |
| `source_id` | `UUID` | No | FK a `data_sources.id` |
| `indicator` | `VARCHAR(50)` | No | `'land_cover'`, `'transition'`, `'tree_cover_loss'` |
| `year` | `INTEGER` | No | Año del producto |
| `pair_year` | `INTEGER` | Sí | Segundo año en productos de transición |
| `region_scope` | `VARCHAR(50)` | No | `'edomex_state'` |
| `tile_strategy` | `VARCHAR(20)` | No | `'xyz'`, `'pmtiles'`, `'cog'`, `'gee'` |
| `tile_url_template` | `VARCHAR(500)`| Sí | Plantilla de URL de teselas `{z}/{x}/{y}` |
| `status` | `VARCHAR(20)` | No | `'ready'`, `'pending'`, `'unavailable'` |
| `valid_pixel_fraction`| `NUMERIC(5, 4)` | Sí | Fracción de píxeles válidos |
| `metadata` | `JSONB` | Sí | Metadatos técnicos adicionales |
| `produced_at` | `TIMESTAMPTZ` | No | Fecha de generación |

---

## 2. Contratos de la API REST (`/api/v1/forest`)

### 2.1 `GET /api/v1/forest/metadata`
Retorna fuentes, colecciones, años disponibles, leyendas de colores y versiones activas.

### 2.2 `GET /api/v1/forest/regions?type=municipality`
Lista los 125 municipios con sus claves INEGI (`15001` a `15125`), nombres, superficies en hectáreas y bboxes para navegación.

### 2.3 `GET /api/v1/forest/regions/{region_id}`
Detalle de una región específica incluyendo su geometría GeoJSON simplificada para visualización en MapLibre.

### 2.4 `GET /api/v1/forest/stats/annual?region_id=...&from=2010&to=2025`
Serie temporal de cobertura por clase y año. Incluye total forestal aprobado y desglose por cada una de las clases de la leyenda.

### 2.5 `GET /api/v1/forest/stats/loss?region_id=...&from=2010&to=2025`
Serie anual de pérdida bruta de cobertura arbórea Hansen (con aviso de exención de responsabilidad científica).

### 2.6 `GET /api/v1/forest/stats/transitions?region_id=...&from=2010&to=2025`
Matriz completa de transiciones de clase a clase entre los dos años especificados.

### 2.7 `GET /api/v1/forest/layers?indicator=...&year=...`
Capas cartográficas disponibles y URLs de teselas para consumo directo en el mapa.
