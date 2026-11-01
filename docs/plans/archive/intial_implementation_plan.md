# CONTEXTO DEL PROYECTO
Actúa como un Arquitecto de Software y Data Engineering. Requiero un plan de implementación técnico exhaustivo para modernizar el sistema de auditoría y asignación de subsidios forestales de "Probosque".

## El Problema de Negocio
Actualmente, los técnicos validan la supervivencia de parcelas de reforestación (meta: ≥ 80% para liberar un subsidio de $2,000 MXN/ha) mediante un proceso analógico ineficiente: uso de cuerdas compensadas para trazar parcelas de 500m², conteo manual en papel bajo el dosel forestal y doble captura en Excel al regresar a la delegación. Existe alta latencia, vulnerabilidad ambiental de los datos y un riesgo moral (fraude en el levantamiento).

## La Arquitectura Híbrida Definida
Descartamos el uso de LiDAR móvil (por costo de hardware) y el conteo de copas 100% satelital/drones con YOLO/Mask R-CNN (los árboles de 1-2 años no son visibles a 10m/px, y los drones no eliminan el desplazamiento físico). 

La solución operará como una máquina de estados restrictiva (colapsando datos ambientales y telemetría en una compuerta booleana de aprobación) estructurada en tres capas:

1. Filtro Satelital de Triage (Cloud/ML):
- Ingesta de series de tiempo multiespectrales (NDVI/EVI vía Sentinel-2).
- Objetivo: Evaluar el polígono ANTES del despliegue humano. Si el delta de biomasa es drásticamente negativo (incendio, invasión urbana), el sistema rechaza el subsidio automáticamente.

2. Aplicación Móvil de Auditoría (Edge Computing Ligero):
- Enfoque estrictamente Offline-First. Persistencia local fuerte (ej. SQLite o WatermelonDB).
- Validación criptográfica y telemetría: Geofencing estricto con el GPS del dispositivo (forzando al técnico a estar en el centroide), captura de fotografías con estampa de tiempo y metadatos EXIF inalterables.
- Formularios dinámicos para el conteo binario (vivo/muerto) que eliminan la fricción del papel.

3. Backend y Sincronización (Infraestructura Central):
- Stack: Python, FastAPI, PostgreSQL (con PostGIS).
- Resolución de conflictos asíncrona: Un esquema optimístico de sincronización basado en colas. El dispositivo móvil empuja los datos al backend cuando recupera conectividad (horas o días después del levantamiento).

# ENTREGABLES REQUERIDOS
Genera un Plan de Implementación Técnico detallado que cubra los siguientes ejes:

1. Modelo de Datos Local (Edge) vs. Remoto (Cloud): Define el esquema relacional en PostgreSQL/PostGIS y su contraparte en SQLite, detallando las columnas de control de estado y versionado para la sincronización.
2. Protocolo de Sincronización Asíncrona: Diseña el flujo de resolución de colisiones y encolamiento de peticiones entre el Edge y FastAPI cuando la red es inestable.
3. Pipeline del Triage Satelital: Arquitectura lógica para consumir la API satelital (ej. Sentinel Hub o Google Earth Engine), calcular el delta NDVI y actualizar el estado del expediente.
4. RoadMap de Implementación por Fases: Define las etapas de desarrollo (MVP, Pruebas de Campo, Despliegue), priorizando el flujo crítico de datos.