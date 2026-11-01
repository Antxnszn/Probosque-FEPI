# Fuentes de Datos, Licencias y Requisitos Operativos

## Visor Forestal Multitemporal del Estado de México — Probosque

Este documento consolida la auditoría técnica y legal de las fuentes geoespaciales utilizadas en el visor, especificando identificadores reales de *assets*, versiones metodológicas, términos de licenciamiento, requerimientos de atribución y restricciones de uso.

---

## 1. Cobertura y Uso del Suelo: MapBiomas México

| Atributo | Especificación técnica |
|---|---|
| **Proveedor** | Iniciativa MapBiomas México (Red MapBiomas, IPN, WRI México, etc.) |
| **Producto** | Colección 1.0 — Cobertura y Uso del Suelo (1985–2025) |
| **Asset Oficial GEE** | `projects/mapbiomas-public/assets/mexico/lulc/collection1/mapbiomas_mexico_collection1_coverage_v1` |
| **Asset Territorios GEE** | `projects/mapbiomas-territories/assets/TERRITORIES/MEXICO/WORKSPACE/POLITICAL_LEVEL_3/POLITICAL_LEVEL_3_v1` |
| **Tipo de Asset** | `ee.Image` multibanda con bandas anuales (`classification_1985` a `classification_2025`) |
| **Resolución espacial** | 30 metros (sensores Landsat 5 TM, 7 ETM+, 8 OLI, 9 OLI-2) |
| **Alcance temporal MVP** | 2010 a 2025 (16 cortes anuales comparables metodológicamente) |
| **Licencia** | **Creative Commons Attribution-ShareAlike 4.0 International (CC BY-SA 4.0)** |
| **Atribución obligatoria** | *"MapBiomas México Colección 1.0 (1985–2025), consultado mediante la plataforma Probosque"* |
| **Documentación oficial** | [Metodología MapBiomas México](https://mexico.mapbiomas.org/iniciativas-y-productos/metodologia-mapbiomas/vision-general/) |
| **Definición de Leyenda** | `legend-colors/coverage/mexico-collection-1.0.sld` (15 clases específicas para México) |

### Clases Temáticas en el Estado de México (Colección 1.0)
- **88 - Bosque templado (`#329c5a`):** Pinos, encinos, oyameles, bosques mesófilos del Eje Neovolcánico.
- **89 - Selva seca / Bosque tropical seco (`#6bd46c`):** Vegetación caducifolia de la cuenca del Balsas (Tejupilco, Tlatlaya, Amatepec).
- **3 - Bosque húmedo tropical (`#1f8d49`):** Relictos de vegetación ripárea y selva húmeda.
- **9 - Plantación forestal (`#7a5900`):** Áreas reforestadas comerciales y viveros.
- **66 - Matorrales (`#a89358`):** Matorral xerófilo (separado de bosque en métricas forestales).
- **45 - Sabana y pastizal natural (`#807a40`):** Zacatonales de alta montaña.
- **15 - Pastizal cultivado (`#edde8e`):** Áreas ganaderas inducidas.
- **19 - Agricultura anual (`#c27ba0`):** Granos básicos y hortalizas cíclicas.
- **36 - Cultivo perenne (`#d082de`):** Frutales y aguacate.
- **24 - Área urbana y construida (`#d4271e`):** Zona metropolitana del Valle de México y Toluca.
- **25 - Otras áreas no vegetadas (`#db4d4f`):** Suelo desnudo y canteras.
- **33 - Cuerpos de agua (`#2532e4`):** Presas (Valle de Bravo, Villa Victoria), lagunas y ríos.
- **34 - Nieve y hielo permanente (`#93dfe6`):** Glaciares y cumbre de volcanes.
- **11 - Inundado / Humedal (`#519799`):** Ciénegas del Lerma.

---

## 2. Pérdida Bruta de Cobertura Arbórea: Hansen GFC

| Atributo | Especificación técnica |
|---|---|
| **Proveedor** | University of Maryland (GLAD) / Google / USGS / NASA |
| **Producto** | Hansen Global Forest Change v1.13 (2000–2025) |
| **Asset Oficial GEE** | `UMD/hansen/global_forest_change_2025_v1_13` |
| **Tipo de Asset** | `ee.Image` compuesto |
| **Bandas principales** | `treecover2000` (canopy cover 0-100%), `lossyear` (0 = sin pérdida; 1-25 = año 2001-2025), `loss` (1 si hubo pérdida), `datamask` (1 = tierra, 2 = agua), `gain` |
| **Resolución espacial** | ~30 metros en el ecuador |
| **Alcance temporal MVP** | 2010 (`lossyear == 10`) a 2025 (`lossyear == 25`) |
| **Licencia** | **Creative Commons Attribution 4.0 International (CC BY 4.0)** |
| **Cita obligatoria** | *Hansen, M. C., et al. (2013). "High-Resolution Global Maps of 21st-Century Forest Cover Change." Science 342: 850–53.* |
| **Advertencia científica** | **Pérdida arbórea bruta ≠ Deforestación neta ≠ Cambio de uso de suelo.** No se resta directamente del stock de bosque sin modelado explícito. |

---

## 3. Delimitación Administrativa: INEGI Marco Geoestadístico

| Atributo | Especificación técnica |
|---|---|
| **Proveedor** | Instituto Nacional de Estadística y Geografía (INEGI) |
| **Edición / Versión** | **Diciembre 2023** (UPC `794551067314`, archivo `15_mexico.zip`) |
| **Entidad federativa** | `15` — Estado de México |
| **Capas vectoriales** | `15ent.shp` (límite perimetral estatal) y `15mun.shp` (125 municipios oficiales) |
| **Rango de claves** | `15001` (Acambay de Ruíz Castañeda) hasta `15125` (Tonanitla) |
| **Proyección original** | Conica Conforme de Lambert (ITRF2008 / CCL, EPSG: 6372) |
| **Proyección objetivo API** | WGS 84 (EPSG: 4326) con cálculo de área geodésica PostGIS `ST_Area(geom::geography)/10000` |
| **Licencia** | **Términos de Libre Uso MX / Datos Abiertos del Gobierno Federal** |
| **Atribución obligatoria** | *"INEGI, Marco Geoestadístico, versión integrada diciembre 2023"* |

---

## 4. Mapas Base de Navegación

| Proveedor | Servicio | Licencia | Atribución |
|---|---|---|---|
| **CartoDB** | Positron & Voyager (Raster/Vector) | Gratuito con atribución | `© OpenStreetMap contributors, © CARTO` |
| **OpenStreetMap** | Standard Raster Tiles | ODbL (Open Database License) | `© OpenStreetMap contributors` |

---

## 5. Google Earth Engine (GEE): Condiciones Legales y Operativas

1. **Autenticación e Infraestructura:**
   - Para desarrollo y prototipado local, se requiere autorización vía OAuth2 con un Google Cloud Project configurado (`earthengine authenticate` o credenciales de cuenta de servicio).
   - Para producción gubernamental/operativa, Google Earth Engine requiere el modelo **Commercial / Operational**, o bien registrar la cuenta bajo el programa institucional elegible.
2. **Estrategia de Mitigación de Costes (Offline Precalculation):**
   - El sistema **NUNCA** ejecuta `reduceRegions` ni consultas masivas en runtime sobre GEE cuando un usuario consulta la web.
   - Todo el análisis estadístico zonal (hectáreas por clase, matriz de transiciones y pérdida Hansen) se ejecuta por lotes mediante scripts CLI (`pipelines/scripts/`) y se almacena en PostgreSQL/PostGIS.
   - Las capas cartográficas se entregan preferentemente mediante teselas vectoriales/ráster estáticas o URLs efímeras de teselas GEE renovadas por el backend con caché.
