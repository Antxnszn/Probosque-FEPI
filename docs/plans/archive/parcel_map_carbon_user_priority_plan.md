# Plan de implementación — Mapa de parcela + Calculadora de carbono

**Proyecto:** Probosque  
**Versión:** 1.1 — Prioridad de usuario  
**Fecha:** 9 de octubre de 2026  
**Estado:** Propuesta para implementación  
**Alcance inmediato:** vista de usuario/técnico; la vista de administrador queda fuera de la prioridad actual.

---

## 1. Objetivo

Construir una experiencia centrada en el usuario que permita **delimitar una parcela dibujando un polígono sobre el mapa y consultar allí mismo la calculadora de carbono**, sin obligarlo a cambiar a otra sección para ver el resultado.

La funcionalidad debe integrarse en la PWA y aprovechar el código existente. Antes de crear componentes duplicados, revisar `TechPlots.tsx`, `InteractiveMap.tsx`, `TechAuditWizard.tsx`, el cliente API y `POST /api/v1/plots` para reutilizar lo que ya funciona.

### Prioridad de producto

1. Dibujar y editar el polígono de una parcela.
2. Mostrar superficie y perímetro en tiempo real.
3. Presentar la calculadora de carbono en el mismo espacio de interacción.
4. Validar la geometría y capturar los datos necesarios para estimar carbono.
5. Guardar la parcela y asociar la evaluación cuando corresponda.
6. Conservar el borrador offline y sincronizarlo cuando vuelva la conexión.

La administración, sus tableros y la gestión avanzada de usuarios no forman parte de esta entrega.

---

## 2. Principio de dominio: el polígono no basta para calcular carbono

El polígono permite obtener **superficie y perímetro**, pero no determina por sí solo la biomasa o el carbono presente en la parcela.

La calculadora debe distinguir claramente entre:

- **Datos espaciales:** geometría, superficie y perímetro.
- **Datos de contexto:** especie, edad o fecha de establecimiento, densidad y tipo de plantación.
- **Datos de inventario:** número de árboles y, según la ecuación alométrica, variables como diámetro a la altura del pecho (DBH) y/o altura.
- **Resultado:** biomasa estimada, carbono y CO₂ equivalente, método aplicado, incertidumbre y advertencias.

Para reforestaciones jóvenes, el resultado cuantitativo debe basarse en un inventario de campo y una ecuación alométrica validada para la especie/región. Si faltan datos suficientes, la aplicación debe indicarlo y solicitar los datos necesarios; no debe inventar un valor de carbono usando únicamente hectáreas o NDVI.

La interfaz debe diferenciar una **estimación preliminar** de una **evaluación basada en inventario**. Ninguna debe presentarse como certificación de créditos de carbono o medición directa de CO₂ capturado.

---

## 3. Experiencia principal: una sola vista de trabajo

Ruta propuesta: `/app/plots/new` o la ruta existente de alta de parcela, reutilizando el enrutado actual.

### Escritorio/tablet

Diseño en dos columnas:

```text
┌──────────────────────────────────────────────┬─────────────────────────┐
│                                              │ PARCELA Y CARBONO       │
│                                              │                         │
│                 MAPA                         │ Superficie: 4.82 ha     │
│                                              │ Perímetro: 1,240 m      │
│       Polígono editable                      │                         │
│                                              │ Datos de plantación     │
│                                              │ Especie                 │
│                                              │ Edad                    │
│                                              │ Densidad / inventario   │
│                                              │                         │
│                                              │ [Calcular carbono]      │
│                                              │ Resultado / advertencias│
│                                              │                         │
│                                              │ [Guardar parcela]       │
└──────────────────────────────────────────────┴─────────────────────────┘
```

- El mapa ocupa aproximadamente 60–70 % del área útil.
- El panel de parcela y carbono permanece visible mientras se dibuja.
- Los controles no deben cubrir los vértices ni impedir editar el polígono.

### Móvil

- Mapa a pantalla completa durante el dibujo.
- Barra inferior con superficie, perímetro y acceso al cálculo.
- Calculadora en un *bottom sheet* expandible, sin abandonar la pantalla del mapa.
- El botón principal cambia según el estado: `Dibujar parcela`, `Calcular carbono`, `Guardar borrador` o `Guardar parcela`.

### Interacción

1. El usuario busca una localidad o utiliza su ubicación si concede permiso.
2. Coloca vértices mediante clic o toque.
3. Ve una línea guía y el polígono relleno.
4. Puede deshacer el último punto, borrar el trazo o cerrar el polígono.
5. Al cerrar el polígono, se actualizan superficie y perímetro.
6. El panel de carbono solicita los parámetros relevantes para el método seleccionado.
7. El usuario calcula una estimación sin tener que salir del mapa.
8. Revisa advertencias, metodología y datos de entrada.
9. Guarda la parcela; la evaluación se guarda asociada cuando existe conexión y el backend confirma su persistencia.

La calculadora debe seguir accesible después de dibujar. Cambiar parámetros de carbono no debe modificar la geometría.

---

## 4. Herramientas del mapa

### Funciones MVP

- Colocar vértices por clic/toque.
- Cerrar el polígono.
- Deshacer el último vértice.
- Limpiar el polígono.
- Editar/mover vértices antes de guardar.
- Mostrar superficie en hectáreas y perímetro en metros.
- Centrar en una localidad mediante búsqueda.
- Centrar en la ubicación del dispositivo cuando el usuario lo autorice.
- Cambiar entre mapa base y vista de imágenes, si el proveedor y su licencia lo permiten.
- Exportar/entregar GeoJSON al backend.

### Validaciones geométricas

- Al menos tres vértices distintos.
- Anillo GeoJSON correctamente cerrado.
- Geometría válida y sin autointersecciones.
- Polígono dentro del ámbito territorial autorizado.
- Superficie dentro de los límites que defina el programa.
- Detección de superposición con parcelas existentes cuando la regla de negocio lo requiera.

### Límite territorial

La caja delimitadora (*bounding box*) sirve para limitar la navegación del mapa, pero **no representa la frontera exacta del Estado de México**. No debe utilizarse como única validación territorial.

La validación visual puede usar una capa GeoJSON oficial de la entidad federativa. El servidor debe validar la geometría contra la capa territorial autoritativa. Para offline, se puede guardar una copia versionada de la frontera y validar localmente de manera provisional.

---

## 5. Cálculo de superficie y GeoJSON

### Formato

Se utilizará GeoJSON estándar, con coordenadas en orden `[longitud, latitud]`:

```json
{
  "type": "Polygon",
  "coordinates": [
    [
      [-99.70, 19.30],
      [-99.69, 19.30],
      [-99.69, 19.31],
      [-99.70, 19.30]
    ]
  ]
}
```

El ejemplo es ilustrativo, no una parcela real.

### Autoridad del cálculo

- **Frontend:** calcula una superficie aproximada en tiempo real para dar respuesta visual inmediata.
- **Backend/PostGIS:** vuelve a validar la geometría y calcula la superficie autoritativa usada para persistencia y reglas administrativas.
- La PWA nunca debe poder imponer un `area_ha` que contradiga la geometría.

Para la previsualización puede usarse Turf.js, que calcula el área geodésica de polígonos GeoJSON en metros cuadrados; el área en hectáreas se obtiene dividiendo entre 10,000. La cifra definitiva debe proceder del backend. Referencia: [Turf.js — area](https://turfjs.org/docs/api/area).

---

## 6. Calculadora de carbono dentro del mapa

### 6.1 Estados de la calculadora

**Estado A — Sin polígono**  
Mostrar una instrucción: `Dibuja la parcela para comenzar`. No mostrar un valor de carbono ficticio.

**Estado B — Polígono válido, datos de carbono incompletos**  
Mostrar superficie y los campos que faltan. Ejemplo: `La superficie está calculada; faltan especie y datos de inventario para estimar biomasa.`

**Estado C — Parámetros suficientes**  
Habilitar `Calcular carbono`.

**Estado D — Resultado disponible**  
Mostrar resultado, unidades, método, versión, calidad de datos, intervalo/incertidumbre si la metodología lo permite y advertencias.

**Estado E — Sin conexión**  
Permitir guardar el borrador local. No presentar un resultado oficial como calculado. Si se implementa una previsualización local, debe estar rotulada como provisional y reconciliarse/recalcularse en el servidor cuando regrese la conexión.

### 6.2 Campos

Los campos deben depender de la metodología seleccionada. Como base:

- especie o grupo de especies;
- edad o fecha de establecimiento;
- número de árboles y/o densidad, si el método lo requiere;
- DBH y altura, cuando la ecuación alométrica los requiera;
- número de unidades de inventario y observaciones, si aplica;
- fuente y versión de la metodología.

No se deben asignar densidades arbitrarias a partir de quintiles de NDVI. Si una metodología necesita variables que no están disponibles, la calculadora debe detenerse y explicar cuáles son necesarias.

### 6.3 Resultado

La interfaz debe separar los conceptos:

- biomasa seca estimada;
- carbono estimado;
- CO₂ equivalente estimado;
- incertidumbre o intervalo de predicción, solo cuando el método lo respalde;
- nivel de calidad de datos;
- advertencias y supuestos;
- versión de ecuación/metodología.

No llamar al resultado `carbono capturado` si lo que se estima es el stock actual de biomasa/carbono. No presentarlo como MRV o certificación de créditos de carbono.

---

## 7. Contratos de API propuestos

Antes de implementarlos, revisar los esquemas reales y adaptar nombres/rutas a los endpoints existentes.

### Crear parcela

`POST /api/v1/plots`

Responsabilidad del servidor:

- validar GeoJSON;
- comprobar que la geometría está dentro del territorio permitido;
- detectar geometrías inválidas;
- derivar el área a partir de la geometría;
- validar permisos y beneficiario;
- persistir la parcela y retornar su identificador.

### Estimar carbono

Para calcular antes de guardar la parcela, proponer:

`POST /api/v1/carbon/estimate`

Entrada conceptual:

```json
{
  "geometry": { "type": "Polygon", "coordinates": [] },
  "methodology_id": "...",
  "species_id": "...",
  "establishment_date": "2023-06-01",
  "inventory": {}
}
```

El backend debe derivar el área; no confiar en un área enviada por el frontend. Debe devolver el resultado y metadatos del método aplicado.

Una vez persistida la parcela, asociar el resultado con un endpoint como:

`POST /api/v1/plots/{plot_id}/carbon-assessments`

La ruta final depende de los contratos reales del backend. No crear rutas duplicadas si ya existe un endpoint que cumple esta responsabilidad.

---

## 8. Persistencia y modo offline

### Alcance offline del MVP

- Guardar la geometría y los campos de la parcela en IndexedDB/Dexie.
- Asignar UUID generado en cliente para identificar el borrador.
- Indicar estado `DRAFT_LOCAL` o `PENDING_SYNC`.
- Sincronizar la parcela al recuperar conexión.
- Usar operaciones idempotentes para evitar duplicados.
- Mostrar claramente qué está local, pendiente, sincronizado o fallido.

### Carbono offline

El cálculo oficial depende del backend y de la versión de la metodología. Cuando no haya conexión:

- se conservan geometría y entradas de la calculadora;
- se marca el cálculo como `PENDING_CALCULATION`;
- el usuario puede continuar con el borrador;
- al sincronizar, el servidor recalcula y devuelve el resultado autoritativo.

Una estimación local opcional deberá identificarse inequívocamente como **provisional**, incluir la versión de regla usada y nunca sustituir el cálculo del servidor.

---

## 9. Componentes a implementar o reutilizar

Primero inspeccionar los componentes actuales; modificar antes de duplicar.

```text
src/
├── features/plots/
│   ├── ParcelMapWorkspace.tsx      # Composición de mapa y panel
│   ├── ParcelDrawingMap.tsx        # Dibujo/edición de geometría
│   ├── ParcelMetricsPanel.tsx      # Superficie/perímetro/validación
│   └── ParcelForm.tsx              # Datos administrativos mínimos
│
├── features/carbon/
│   ├── CarbonCalculatorPanel.tsx   # Calculadora en la misma vista
│   ├── CarbonInputForm.tsx         # Parámetros del método
│   ├── CarbonResultCard.tsx        # Resultado, incertidumbre y avisos
│   └── carbonApi.ts                # Cliente del backend
│
├── features/offline/
│   ├── parcelDrafts.ts             # Persistencia de borradores
│   └── syncQueue.ts                # Cola idempotente
│
└── services/
    └── api.ts                      # Cliente HTTP compartido
```

Los nombres son propuestos. Si `InteractiveMap.tsx` o los componentes existentes ya cubren parte de estas responsabilidades, ampliarlos en lugar de crear una segunda implementación del mapa.

---

## 10. Dependencias y compatibilidad

- Mantener Leaflet si ya está instalado y es compatible con el proyecto actual.
- Confirmar en `package.json` las versiones reales de `react`, `react-dom`, `leaflet` y `react-leaflet` antes de fijar dependencias.
- No afirmar compatibilidad garantizada con React 19 sin verificar las versiones instaladas y ejecutar build/tests. React Leaflet v5 declara React 19 como requisito; documentación: [React Leaflet](https://react-leaflet.js.org/docs/start-introduction/) y [changelog](https://github.com/PaulLeCam/react-leaflet/blob/master/CHANGELOG.md).
- Usar Turf.js para métricas preliminares solo si no existe ya una utilidad geoespacial en el proyecto.
- Confirmar licencias, cuotas y disponibilidad del proveedor de imágenes antes de usar una capa satelital en producción. No prometer mapas base offline si las condiciones del proveedor no lo permiten.

---

## 11. Orden de implementación

### Fase 0 — Verificación del proyecto actual

- Revisar `package.json` y versiones.
- Revisar `TechPlots.tsx`, `InteractiveMap.tsx`, `AdminMap.tsx`, `TechAuditWizard.tsx` y `api.ts`.
- Confirmar contrato real de `POST /api/v1/plots`.
- Confirmar si existe un modelo/endpoint de carbono y qué ecuaciones tienen respaldo.
- Identificar la fuente oficial de la frontera territorial.

**Salida:** breve lista de archivos a modificar, contratos existentes y bloqueadores reales.

### Fase 1 — Flujo de mapa y polígono

- Integrar el mapa en la vista de usuario.
- Implementar dibujo, edición, cierre, deshacer y limpiar.
- Mostrar superficie y perímetro en vivo.
- Validar el polígono en frontend.
- Implementar restricciones de navegación y límite territorial sin depender solo de un bounding box.

**Criterio de salida:** el usuario puede crear y editar un polígono válido y obtener métricas visuales sin abrir otra vista.

### Fase 2 — Calculadora integrada

- Integrar el panel de carbono junto al mapa.
- Definir los campos requeridos según el método realmente validado.
- Mostrar estados de falta de datos, cálculo, resultado y error.
- Incorporar unidades, metodología, supuestos, advertencias e incertidumbre respaldada.
- Conectar con el endpoint existente o acordar el contrato de estimación.

**Criterio de salida:** el usuario puede dibujar la parcela, introducir datos y consultar el resultado desde la misma vista.

### Fase 3 — Persistencia y sincronización

- Guardar la geometría y entradas en IndexedDB.
- Enviar la parcela al backend cuando haya conexión.
- Asociar la evaluación de carbono a la parcela guardada.
- Recalcular en servidor y mostrar estados de sincronización.
- Prevenir duplicados con idempotencia.

**Criterio de salida:** el borrador sobrevive al cierre/recarga de la PWA y sincroniza sin duplicar parcelas.

### Fase 4 — Validación de UX y datos

- Probar móvil, tablet y escritorio.
- Probar polígonos inválidos y fuera del límite.
- Probar una pérdida de conexión durante el trazado y durante el guardado.
- Verificar la congruencia entre área preliminar y área de servidor.
- Confirmar que no se entrega un valor de carbono cuando faltan los datos requeridos.

**Criterio de salida:** la funcionalidad se considera usable y los resultados no inducen a una interpretación científica incorrecta.

---

## 12. Qué no se hará en esta entrega

- Rediseñar el dashboard administrativo.
- Construir dos aplicaciones frontend independientes.
- Aprobar o rechazar subsidios desde la calculadora.
- Calcular carbono a partir de hectáreas solamente.
- Presentar NDVI como medida directa de supervivencia o carbono.
- Prometer precisión de carbono sin una metodología validada y datos suficientes.
- Garantizar funcionamiento de mapas satelitales offline sin verificar proveedor, licencia y almacenamiento.

---

## 13. Criterios de aceptación del MVP

1. El flujo prioritario está accesible desde la vista de usuario/técnico.
2. El usuario dibuja, cierra, edita, deshace y limpia un polígono.
3. Superficie y perímetro se actualizan mientras interactúa con el mapa.
4. El polígono se exporta como GeoJSON con coordenadas `[lng, lat]`.
5. La frontera territorial se valida contra una geometría territorial real, no solo contra una caja delimitadora.
6. La calculadora permanece en la misma pantalla y responde a la parcela dibujada.
7. La calculadora solicita los datos que requiere la metodología y no inventa los faltantes.
8. El servidor recalcula superficie y carbono; los resultados autoritativos incluyen identificación/versión de método.
9. La PWA puede guardar el borrador offline y mostrar que el cálculo oficial está pendiente de conexión.
10. La parcela se sincroniza de manera idempotente.
11. La UI no expone decisiones administrativas ni obliga al usuario a entrar a la vista de admin.
12. Se verifican funcionamiento móvil y compatibilidad con las dependencias reales del repositorio.

---

## 14. Resultado esperado

La experiencia central de Probosque debe ser una sola herramienta de trabajo:

> **dibujar la parcela → revisar superficie → completar los datos forestales → calcular carbono → revisar calidad y supuestos → guardar/sincronizar.**

La prioridad no es el dashboard del administrador. Es que el usuario pueda definir una parcela y trabajar con su estimación de carbono de forma clara, honesta y sin abandonar el mapa.
