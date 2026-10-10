# Plan de Implementación: Delimitación Interactiva de Parcelas en Mapa (Usuario / Técnico)

**Proyecto:** Probosque FEPI (Forest Audit & Subsidy Platform)  
**Módulo:** Frontend Operativo — Usuario / Técnico (`/app/plots`)  
**Documento:** `implementation_plans/parcel_map_selector_plan.md`  
**Estado:** Propuesta para aprobación  

---

## 1. Resumen Ejecutivo y Objetivo

Actualmente, en la interfaz del usuario operativo/técnico (`TechPlots.tsx`), el registro de una parcela requiere que el usuario cargue un archivo físico `.kmz` (`<input type="file" accept=".kmz">`). Si el archivo no existe o el usuario está en campo sin un archivo procesado, no puede trazar ni registrar su predio.

**Objetivo:**  
Reemplazar la subida de archivos KMZ por un **componente de mapa interactivo de dibujo y marcación de parcelas**, restringido geográfica y visualmente al territorio del **Estado de México**. El usuario podrá:
1. Visualizar la cartografía del Estado de México con capas satelital y de calles.
2. Marcar interactivamente los vértices de su parcela en el mapa (o usar su GPS in situ).
3. Ver en tiempo real el cálculo de área (en hectáreas) y perímetro (en metros).
4. Validar que el polígono esté contenido estrictamente dentro de los límites del Estado de México.
5. Guardar la parcela con su geometría GeoJSON nativa tanto en almacenamiento local offline (Dexie / IndexedDB) como en el backend central (PostGIS).

---

## 2. Arquitectura de la Solución

```text
┌────────────────────────────────────────────────────────────────────────┐
│                        TechPlots.tsx (UI Técnico)                      │
│                                                                        │
│   ┌────────────────────────────────────────────────────────────────┐   │
│   │ Modal / Drawer: "Alta y Delimitación de Parcela"               │   │
│   │                                                                │   │
│   │ [Datos Básicos]                                                │   │
│   │ Clave Catastral | Nombre Beneficiario | Municipio (EdoMéx)     │   │
│   │                                                                │   │
│   │ ┌──────────────────────────────────────────────────────────┐   │   │
│   │ │           Componente: ParcelDrawingMap.tsx               │   │   │
│   │ │                                                          │   │   │
│   │ │  - Motor Leaflet con maxBounds fijados al Estado de Méx. │   │   │
│   │ │  - Capas: Esri World Imagery (Satélite) / OpenStreetMap  │   │   │
│   │ │  - Trazado de Vértices: Clic/Tap para añadir punto       │   │   │
│   │ │  - Marcadores arrastrables y línea elástica de conexión │   │   │
│   │ │  - Barra de Herramientas: Cerrar, Deshacer, Limpiar, GPS │   │   │
│   │ │  - Métricas en vivo: Vértices: N | Superficie: X.XX ha   │   │   │
│   │ └──────────────────────────────────────────────────────────┘   │   │
│   │                                                                │   │
│   │ [Acción: Registrar Parcela]                                    │   │
│   └───────────────────────────────┬────────────────────────────────┘   │
└───────────────────────────────────┼────────────────────────────────────┘
                                    │
                                    ▼
┌────────────────────────────────────────────────────────────────────────┐
│                Capa de Validación y Transformación                     │
│                        (src/utils/geo.ts)                              │
│                                                                        │
│   - Valida que todos los puntos estén en Bounding Box de EdoMéx.       │
│   - Valida polígono no auto-intersectado y mínimo 3 vértices.          │
│   - Calcula Superficie Geodésica (Ha) y Perímetro (m).                 │
│   - Genera payload GeoJSON Polygon: coordinates: [[[lng, lat], ...]]  │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │
                  ┌─────────────────┴─────────────────┐
                  ▼                                   ▼
      [Modo Offline / Caché]                [Modo Online / API]
       Dexie.js (IndexedDB)             POST /api/v1/plots (PostGIS)
   Guarda PlotRecord con status:         Valida Geod(WGS84), calcula
     syncStatus = 'PENDING'            área oficial y guarda en DB
```

---

## 3. Delimitación Estricta al Estado de México

Para garantizar que el mapa y los trazos no salgan del Estado de México:

### 3.1 Bounding Box Geográfico Oficial
- **Latitud Sur:** `18.35° N`
- **Latitud Norte:** `20.35° N`
- **Longitud Oeste:** `-100.62° W`
- **Longitud Este:** `-98.55° W`
- **Centro Estratégico (Valle de Toluca):** `[19.35, -99.65]`

### 3.2 Reglas de Restricción del Mapa (Leaflet)
1. **`maxBounds` y `maxBoundsViscosity: 1.0`:** El usuario no puede arrastrar (pan) ni deslizar el mapa fuera de los límites del Estado de México. Al intentar salir, el mapa rebota rígidamente dentro del estado.
2. **`minZoom: 8` y `maxZoom: 18`:** Impide alejar el mapa a nivel nacional o global; mantiene la vista siempre enfocada en territorio mexiquense, con zoom suficiente para ver árboles y linderos agrícolas.
3. **Selector Rápido de Municipio:** Acceso directo a coordenadas de cabeceras forestales (Toluca, Zinacantepec, Valle de Bravo, Temascaltepec, Villa del Carbón, Amanalco, San José del Rincón, Ocuilan, etc.) para centrar el mapa instantáneamente donde se encuentra la parcela.
4. **Validación de Clics / Vértices:** Si un usuario intenta añadir un punto fuera de la caja delimitadora del EdoMéx, el evento se bloquea con aviso visual: *"Punto fuera del territorio del Estado de México"*.

---

## 4. Dependencias

Para garantizar compatibilidad total con **React 19** (`react: ^19.2.8` en el proyecto) sin problemas de peer-dependencies de paquetes wrapper antiguos:
- **`leaflet`** (v1.9.x): Librería cartográfica ligera (~40KB), madura y sin dependencias.
- **`@types/leaflet`**: Tipos TypeScript para Leaflet.
- Se implementará un componente React nativo con hooks (`useRef`, `useEffect`) que monta el mapa Leaflet de manera controlada y limpia.
- **Sin necesidad de librerías externas de dibujo pesadas:** Se creará un controlador de dibujo optimizado y táctil (click-to-add, preview polyline, auto-close, undo), perfectamente integrado a los temas oscuros de Probosque y Tailwind.

---

## 5. Plan de Ejecución Paso a Paso

### Fase 1: Instalación de Dependencias Cartográficas
- Instalar `leaflet` y `@types/leaflet` en `frontend`.
- Importar estilos base de Leaflet en `frontend/src/index.css`.

### Fase 2: Módulo de Utilidades Geoespaciales (`src/utils/geo.ts`)
- Definir constantes de límites del Estado de México (`EDOMEX_BOUNDS`, `EDOMEX_CENTER`).
- Coordenadas de referencia de los principales municipios forestales del EdoMéx.
- Función de validación: `isPointInsideEdomex(lat: number, lon: number): boolean`.
- Función de cálculo geodésico de área en hectáreas: `calculatePolygonAreaHa(coords: [number, number][]): number`.
- Conversión bidireccional entre coordenadas Leaflet `[lat, lng]` y GeoJSON estándar `[lng, lat]`.

### Fase 3: Componente `ParcelDrawingMap.tsx`
- Creación de `frontend/src/components/map/ParcelDrawingMap.tsx`:
  - Contenedor con altura adaptable.
  - Inicialización de mapa con capas:
    - **Satélite de Alta Resolución:** Esri World Imagery (gratuito, ideal para ver terrenos, árboles y parcelas).
    - **Topográfico / Callejero:** OpenStreetMap.
  - Capa vectorial de dibujo:
    - Marcadores numerados para cada vértice.
    - Polilínea elástica entre puntos.
    - Relleno semitransparente color esmeralda (`#10b981`) para la parcela.
  - Barra de herramientas flotante superior:
    - Selector de capas (Satélite / Calles).
    - Selector de Municipio para centrar rápido la vista.
    - Botón "Mi Ubicación GPS" (con lectura del sensor del dispositivo).
  - Barra inferior de control de trazo:
    - Contador de vértices.
    - Área en Hectáreas calculada en tiempo real.
    - Botón *"Cerrar Polígono"* (requiere $\ge 3$ puntos).
    - Botón *"Deshacer"* (borra el último vértice).
    - Botón *"Limpiar"* (reinicia el mapa).

### Fase 4: Integración en `TechPlots.tsx`
- Reemplazar el input de subida de archivo KMZ:
  - Eliminar estado `plotKmzFile` y la validación de archivo KMZ.
  - Insertar `ParcelDrawingMap` en el modal de nueva parcela.
  - Al cerrar el polígono, transferir automáticamente la geometría GeoJSON y el área calculada al formulario.
  - Actualizar el título y textos a *"Alta y Delimitación de Parcela en Campo"*.
- Conexión con persistencia:
  - Conexión a `createPlot` (POST `/api/v1/plots`) si hay conectividad.
  - Conexión a `db.plots.put` (IndexedDB) con estatus `PENDING` para sincronización offline en campo.

### Fase 5: Pruebas y Validación de Casos Límite
- Validación de intentos de clic fuera del Estado de México.
- Validación de polígonos incompletos (< 3 vértices) al intentar guardar.
- Comprobación de persistencia y renderizado en la lista de parcelas y en la vista de detalle de la parcela.
- Verificación del comportamiento en pantalla táctil / móvil y modo offline.

---

## 6. Casos Límite y Mitigaciones (Edge Cases)

| Caso Límite | Riesgo | Mitigación |
|---|---|---|
| **Intento de marcar fuera del EdoMéx** | Datos inconsistentes con el alcance de Probosque | `maxBounds` impide desplazar la cámara fuera del estado y `isPointInsideEdomex` ignora clics fuera de los límites emitiendo una alerta visual. |
| **Menos de 3 vértices marcados** | Geometría no forma un polígono cerrado | El botón "Cerrar Polígono" y el botón "Registrar Parcela" permanecen deshabilitados hasta tener al menos 3 vértices válidos. |
| **Polígono auto-intersectado (en forma de 8)** | Fallo en PostGIS o cálculo de área erróneo | Validación geométrica cliente antes de someter y normalización automática de coordenadas en el anillo GeoJSON. |
| **Sin conexión a Internet en campo** | Las teselas satelitales podrían no cargar en zonas remotas | Manejo con caché local del navegador (Service Worker / IndexedDB) y visualización de retícula geográfica orientativa con coordenadas GPS locales. |
| **Precisión táctil en pantallas móviles** | El usuario puede tocar un píxel inexacto | Marcadores interactivos grandes con opción de arrastre (drag) o botón "Deshacer último punto" para corrección inmediata sin reiniciar el trazo. |

---

## 7. Próxima Acción

Presentar esta propuesta al usuario y esperar aprobación para proceder con la ejecución del código.
