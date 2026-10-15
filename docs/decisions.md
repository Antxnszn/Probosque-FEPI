# Registro de Decisiones de Arquitectura (ADR)

## Visor Forestal Multitemporal del Estado de México — Probosque

---

### ADR-001: Cambio de Alcance a Visor Público Geoespacial Multitemporal
* **Fecha:** Octubre 2026
* **Estado:** Aceptado
* **Contexto:** El proyecto original estaba enfocado en auditorías de campo para técnicos, captura de polígonos de beneficiarios, subsidios y cálculo de créditos de carbono. El nuevo objetivo estratégico de Probosque requiere un visor público multitemporal de cobertura y uso del suelo para el Estado de México, inspirado en GeoBosques (Perú).
* **Decisión:** Priorizar el desarrollo del visor público multitemporal (2010–2025) con selección de los 125 municipios oficiales, comparación de dos años tipo cortinilla (*swipe*), matriz de transiciones y visualización independiente de la pérdida arbórea Hansen. Las rutas y modelos de auditorías/subsidios se preservan sin romper compatibilidad, pero quedan fuera del flujo de navegación principal.

---

### ADR-002: Conservación de la Base de Código Existente y No Regresión
* **Fecha:** Octubre 2026
* **Estado:** Aceptado
* **Contexto:** Se cuenta con una base sólida en React 19 + TypeScript + Vite + Tailwind CSS y un backend en FastAPI + SQLAlchemy + GeoAlchemy2 con tests que pasan al 100%.
* **Decisión:** No reescribir el repositorio desde cero. La nueva funcionalidad del visor se implementa en cortes verticales organizados (`/visor`, `frontend/src/features/forest-viewer/`, `backend/app/api/v1/forest.py`, `backend/app/models/forest.py`), reutilizando la infraestructura de base de datos, utilerías geométricas y componentes comunes.

---

### ADR-003: Selección de MapLibre GL JS como Motor de Mapas para el Visor
* **Fecha:** Octubre 2026
* **Estado:** Aceptado
* **Contexto:** La aplicación previa utilizaba Leaflet y canvas SVG. El visor multitemporal requiere rendering fluido por GPU de teselas ráster multitemporales (30m), capas vectoriales con 125 municipios, ajuste dinámico de opacidad y una cortinilla de comparación sincronizada sin tirones (*jank*).
* **Decisión:** Adoptar **MapLibre GL JS** para la nueva pantalla del visor (`ForestMap.tsx`), integrando el plugin oficial o contenedor sincronizado de comparación (`maplibre-gl-compare`). Leaflet permanece en las pantallas heredadas de dibujo si es necesario, sin mezclar ambos motores en la misma vista.

---

### ADR-004: Arquitectura de Precálculo Zonal en PostgreSQL / PostGIS
* **Fecha:** Octubre 2026
* **Estado:** Aceptado
* **Contexto:** Si cada clic de un usuario en un municipio o cambio de año detonara un `reduceRegions` en Google Earth Engine, la interfaz sufriría latencias inaceptables (>5-10s), agotamiento de cuotas y costos operativos inviables.
* **Decisión:** Earth Engine se utiliza exclusivamente como motor ETL batch sin conexión directa a las peticiones del usuario final. Los scripts de pipeline (`pipelines/scripts/`) precalculan las hectáreas por clase, matrices de transición y pérdidas anuales por municipio y año (2010–2025), almacenándolas en tablas indexadas de PostgreSQL (`region_year_stats`, `region_transition_stats`, `region_annual_loss_stats`). La API pública de FastAPI entrega estas consultas en sub-segundo (<100ms).

---

### ADR-005: Separación Metodológica Estricta entre MapBiomas y Hansen
* **Fecha:** Octubre 2026
* **Estado:** Aceptado
* **Contexto:** Es un error recurrente en plataformas forestales sumar o restar la pérdida bruta de cobertura arbórea (Hansen) del stock de cobertura forestal (MapBiomas) o denominar "deforestación neta" a la pérdida bruta del dosel arbóreo.
* **Decisión:** Los indicadores se presentan en pestañas y contratos de API completamente desacoplados:
  1. **Cobertura y uso del suelo (MapBiomas México Colección 1.0):** Stocks anuales y transiciones de clase a clase.
  2. **Pérdida arbórea bruta (Hansen GFC v1.13):** Perturbaciones anuales del dosel con umbral de copa documentado (por defecto ≥30%), acompañadas de leyenda de advertencia científica visible.

---

### ADR-006: Geometría Oficial INEGI Marco Geoestadístico 2023 (125 Municipios)
* **Fecha:** Octubre 2026
* **Estado:** Aceptado
* **Contexto:** El Estado de México cuenta con 125 municipios oficiales con geometrías complejas que rodean a la Ciudad de México y enclaves municipales. El visor no debe utilizar cajas envolventes (*bounding boxes*) ni polígonos simplificados arbitrarios como límites oficiales.
* **Decisión:** Extraer y procesar directamente la cartografía oficial del INEGI Marco Geoestadístico (versión integrada diciembre 2023, UPC `794551067314`), normalizada a WGS84 (EPSG:4326) con validación topológica mediante Shapely/PostGIS y cálculo de área geodésica.

---

### ADR-007: Versionado de la Agrupación Forestal
* **Fecha:** Octubre 2026
* **Estado:** Aceptado
* **Contexto:** MapBiomas clasifica 15 categorías en México. No todas las clases naturales son bosque templado o selva.
* **Decisión:** Versionar la regla de agrupación forestal (`forest_grouping_version: probosque-v1.0`). Se aprueban como cobertura forestal nativa únicamente:
  - Clase 88: Bosque templado
  - Clase 89: Selva seca / Bosque tropical seco
  - Clase 3: Bosque húmedo tropical
  - Clase 9: Plantación forestal (catalogada como forestal inducida)
  Matorrales (66) y pastizales naturales (45) se contabilizan en sus propias categorías sin fusionarse automáticamente con "bosque".

---

### ADR-008: Protocolo de Limpieza Pre-Lanzamiento y Purga de Archivos de Desarrollo
* **Fecha:** Octubre 2026
* **Estado:** Aceptado
* **Contexto:** Durante las fases iterativas de desarrollo se mantienen planes de implementación (`implementation_plans/`), bitácoras de trabajo (`walkthroughs/`), scripts de prueba locales y reglas permisivas temporales en `.gitignore`. Para la entrega final del producto a usuarios u operadores externos, el repositorio debe reflejar exclusivamente código de producción, arquitectura limpia y cero artefactos residuales.
* **Decisión:** Se establece una fase final obligatoria de limpieza y consolidación antes del release a producción:
  1. Mantener los planes de implementación y documentación de desarrollo durante la ejecución activa de los sprints.
  2. Al finalizar el producto, purgar del árbol de archivos del repositorio las carpetas de trabajo interno (`implementation_plans/`, `walkthroughs/`, scripts scratch).
  3. Auditar y sanitizar `.gitignore` para eliminar referencias temporales que no tengan propósito en producción, conservando únicamente las reglas estándar de entorno (Node, Python, Docker, SO, secretos).
  4. Dejar el repositorio en estado de "código limpio de producción", asegurando que cualquier evaluador o desarrollador externo reciba una estructura pulcra, comprensible y estandarizada.
