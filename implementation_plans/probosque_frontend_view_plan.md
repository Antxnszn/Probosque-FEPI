# Plan de División de Vistas — Probosque

**Proyecto:** Probosque Forest Audit and Subsidy System  
**Documento:** Frontend View Separation — Admin vs. Usuario/Técnico  
**Versión:** 1.0  
**Fecha:** 7 de octubre de 2026  
**Estado:** Propuesta de implementación

## 1. Objetivo

Definir la división funcional y técnica de la interfaz web de Probosque en dos experiencias dentro de una misma PWA:

1. **Usuario/Técnico:** experiencia mobile-first y offline-first para operación de campo.
2. **Administrador:** experiencia desktop-first y online-first para supervisión, revisión, trazabilidad y decisión administrativa.

No se construirán dos aplicaciones frontend independientes. Ambas experiencias compartirán React, Vite, TypeScript, TailwindCSS, autenticación, autorización basada en roles, servicios API, componentes reutilizables y el modelo de dominio del backend.

La separación se realizará mediante rutas, layouts, permisos y componentes específicos.

## 2. Principio de diseño

```text
                     FRONTEND
                React + Vite + TS
                      Tailwind
                          │
                 Authentication
                      + RBAC
                          │
             ┌────────────┴────────────┐
             │                         │
      ROLE = TECHNICIAN          ROLE = ADMIN
             │                         │
      ┌──────▼────────┐         ┌──────▼─────────┐
      │ Vista Operativa│         │ Vista Gerencial│
      │ Mobile-first   │         │ Desktop-first  │
      │ Offline-first  │         │ Online-first   │
      └────────────────┘         └────────────────┘
```

La lógica de dominio crítica permanece en el backend. El frontend captura datos, presenta resultados, ejecuta validaciones de UX, administra estado local y sincroniza; no calcula ni decide por cuenta propia resultados científicos o administrativos.

# 3. Vista Usuario/Técnico

## 3.1 Objetivo

La experiencia del técnico debe estar orientada a la operación de campo:

> recibir parcelas → desplazarse → capturar observaciones → generar evidencia → sincronizar.

Debe minimizar navegación innecesaria, escritura, elementos simultáneos en pantalla, dependencia de conectividad y decisiones que no correspondan al rol.

Debe funcionar correctamente en teléfonos Android de gama baja y con conectividad intermitente.

## 3.2 Navegación

```text
/login
  │
  ▼
/app
  ├── Inicio
  ├── Mis parcelas
  ├── Auditoría
  ├── Evidencias
  ├── Sincronización
  └── Perfil
```

## 3.3 `/app` — Inicio

Dashboard operativo del técnico.

Información mostrada:

- parcelas asignadas;
- parcelas pendientes;
- auditorías en progreso;
- auditorías completadas;
- incidencias;
- estado de conectividad;
- cantidad de elementos pendientes de sincronizar;
- estado del almacenamiento local.

Ejemplo:

```text
Buenos días, Juan

8 parcelas asignadas

3 pendientes
2 en progreso
2 sincronizadas
1 con incidencia

[ Continuar auditoría ]

Estado: ⚠ Sin conexión
5 registros pendientes de sync
```

## 3.4 `/app/plots` — Mis Parcelas

Lista de parcelas asignadas al técnico.

```text
Parcela: PB-2026-00451
Municipio: X
Superficie: 4.82 ha

Triage: NORMAL
Auditoría: PENDIENTE
Subsidio: PENDIENTE

[ Ver parcela ]
```

Filtros mínimos:

- Todas
- Pendientes
- En progreso
- Completadas
- Con incidencia

Cuando existe conexión, el técnico recibe las asignaciones desde el backend. Cuando está offline, trabaja sobre la copia local previamente sincronizada.

## 3.5 `/app/plots/:id` — Detalle de Parcela

Muestra:

- polígono;
- superficie;
- beneficiario;
- municipio;
- fecha de asignación;
- triage satelital;
- estado de auditoría.

El técnico puede consultar el triage, pero no modificarlo ni aprobar/rechazar subsidios.

## 3.6 `/app/audit/:id` — Auditoría de Campo

Wizard por pasos:

```text
Auditoría 1 de 5

① Ubicación
② Muestreo
③ Evidencia
④ Revisión
⑤ Finalizar
```

### Paso 1 — Ubicación

Captura:

- latitud;
- longitud;
- precisión GPS;
- timestamp;
- distancia al polígono;
- estado del geofence.

El geofence funciona como indicador operativo y de calidad, no como bloqueo absoluto.

Ejemplo:

```text
✓ Dentro del polígono
Precisión GPS: 8 m
```

Con advertencia:

```text
⚠ Precisión GPS baja
Precisión estimada: 34 m

Puedes continuar.
La incidencia quedará registrada.
```

### Paso 2 — Muestreo

La PWA captura observaciones brutas y no permite introducir directamente el porcentaje de supervivencia.

```text
Unidad de muestreo #1

Radio: 12.62 m

Árboles encontrados: 51
Vivos: 44
Muertos: 7

[ Guardar unidad ]
```

Puede mostrar acumulados descriptivos:

```text
3 unidades registradas

Total observados: 151
Vivos: 129
Muertos: 22
```

El estimador de razón, varianza e intervalo de confianza son responsabilidad exclusiva del backend.

### Paso 3 — Evidencia

```text
Evidencia requerida

[ 📷 Foto panorámica ]
[ 📷 Muestra 1 ]
[ 📷 Muestra 2 ]
[ 📷 Muestra 3 ]
```

Cada captura genera un evento de evidencia con:

```text
photo
capture_event
 ├── latitude
 ├── longitude
 ├── gps_accuracy
 ├── captured_at
 ├── device_id
 ├── audit_id
 └── content_hash
```

El GPS capturado por la API de geolocalización del navegador es la referencia operativa. El EXIF se conserva como evidencia secundaria cuando está disponible, pero no debe ser requisito para validar la captura.

### Paso 4 — Revisión

```text
RESUMEN DE AUDITORÍA

Ubicación
✓ Registrada

Unidades
✓ 5 / 5

Árboles observados
243

Fotografías
8

GPS
⚠ 1 ubicación con precisión > 30 m

Sincronización
● Guardado local
```

Al finalizar, el resultado local queda como `COMPLETADA_LOCALMENTE`; nunca como `SUBSIDIO APROBADO`.

## 3.7 `/app/sync` — Centro de Sincronización

```text
SINCRONIZACIÓN

Conexión: ⚠ Sin conexión

Pendientes:
5 auditorías
12 fotografías

Almacenamiento:
78% utilizado

Estado:
✓ Datos protegidos localmente

[ Sincronizar cuando haya conexión ]
```

Después de sincronizar:

```text
Última sincronización:
07/10/2026 14:32

5 auditorías
12 fotografías
✓ Completadas
```

## 3.8 `/app/history` — Historial

```text
Auditorías realizadas

PB-00451   ✓ Sincronizada
PB-00452   ✓ Sincronizada
PB-00453   ⏳ Pendiente
PB-00454   ⚠ Incidencia
```

Las auditorías originales no pueden eliminarse desde esta vista.

# 4. Vista Administrador

## 4.1 Objetivo

La experiencia administrativa está orientada a:

> supervisar → revisar → analizar → resolver incidencias → ejecutar decisiones administrativas → generar reportes.

Será desktop-first y utilizará una mayor densidad de información.

## 4.2 Navegación

```text
/admin
  ├── Dashboard
  ├── Mapa
  ├── Parcelas
  ├── Triage satelital
  ├── Auditorías
  ├── Subsidios
  ├── Evidencias
  ├── Técnicos
  ├── Beneficiarios
  ├── Reportes
  └── Sistema
```

## 4.3 `/admin` — Dashboard

KPIs principales:

```text
┌────────────┬────────────┬────────────┬────────────┐
│ Parcelas   │ Auditorías │ Anomalías  │ Subsidios  │
│ 1,248      │ 876         │ 94         │ 721        │
└────────────┴────────────┴────────────┴────────────┘
```

Estado de parcelas:

```text
NORMAL         812
ANOMALY         94
INCONCLUSIVE    62
PENDIENTE      280
```

Estado de auditorías:

```text
Pendientes              213
En revisión              45
Completadas             618
Con incidencias          21
```

Estado de subsidios:

```text
Elegibles               721
No elegibles             88
Pendientes de decisión   67
```

## 4.4 `/admin/map` — Mapa Operativo

Debe funcionar como el centro visual de supervisión.

```text
● NORMAL
▲ ANOMALY
■ AUDITORÍA COMPLETADA
◆ SUBSIDIO PENDIENTE
```

Filtros:

- municipio;
- región;
- técnico;
- programa;
- estado de triage;
- estado de auditoría;
- estado de subsidio;
- fecha.

Al seleccionar una parcela:

```text
PB-00451

Triage:
ANOMALY

Auditoría:
COMPLETADA

Supervivencia:
82.4%

IC 95%:
76.1–87.9%

Subsidio:
PENDIENTE DE DECISIÓN

[ Ver expediente ]
```

## 4.5 `/admin/plots/:id` — Expediente de Parcela

Debe actuar como expediente digital completo.

```text
PARCELA PB-00451
──────────────────────────────

Datos administrativos

Datos geoespaciales

Triage satelital

Auditoría de campo

Evidencias

Resultado estadístico

Decisión de subsidio

Historial
```

### Timeline

```text
02 Oct
Triage ejecutado

04 Oct
Parcela asignada al técnico

06 Oct
Auditoría capturada offline

07 Oct 09:42
Auditoría sincronizada

07 Oct 09:43
Resultado estadístico calculado

07 Oct 10:15
Revisión administrativa

07 Oct 10:20
Subsidio aprobado
```

## 4.6 `/admin/triage` — Triage Satelital

```text
TRIAGE SATELITAL

NORMAL        812
ANOMALY        94
INCONCLUSIVE   62
```

Detalle:

```text
PB-00451

Cambio temporal detectado

ΔNDVI: -0.23

Calidad de observación:
Buena

Clasificación:
ANOMALY

[ Ver imágenes ]
[ Ver evolución temporal ]
[ Enviar a auditoría ]
```

No debe existir desde aquí una acción directa de aprobación de subsidio.

## 4.7 `/admin/audits` — Auditorías

| Parcela | Técnico | Fecha | Supervivencia | IC | GPS | Evidencia | Estado |
|---|---|---|---:|---|---|---|---|
| PB-01 | Técnico A | 06/10 | 84.2% | 79–89% | ✓ | ✓ | Lista |
| PB-02 | Técnico B | 06/10 | 71.4% | 62–79% | ⚠ | ✓ | Revisar |

Acciones:

- revisar auditoría;
- consultar incidencias;
- revisar evidencia;
- solicitar nueva auditoría.

Los datos originales no se modifican retroactivamente.

## 4.8 `/admin/subsidies` — Decisión Administrativa

Consume el resultado científico generado por el backend y aplica la política administrativa correspondiente.

```text
PB-00451

Resultado científico
────────────────────
Supervivencia estimada: 84.2%
IC: 79.1–88.7%

Regla aplicada
────────────────────
Programa: Reforestación 2026
Umbral: 80%
Política: estimador puntual

Resultado
────────────────────
ELEGIBLE

[ Aprobar ]
[ Rechazar ]
[ Enviar a revisión ]
```

Debe ser visible:

```text
rule_version
threshold
estimator
methodology_version
reviewer
timestamp
```

## 4.9 `/admin/evidence` — Evidencias

Filtros:

- parcela;
- técnico;
- fecha;
- tipo;
- integridad;
- incidencias GPS.

Ejemplo:

```text
Foto #18342

Hash SHA-256
a81f...

Captura
06/10/2026 11:42:17

GPS
19.xxxxxx
-99.xxxxxx

Precisión
11 m

Servidor recibió
07/10/2026 09:42:10

Integridad
✓ HASH VALID
```

El administrador puede visualizar y revisar, pero no reemplazar silenciosamente. Una nueva fotografía constituye una nueva evidencia.

## 4.10 `/admin/users` — Usuarios

```text
Usuarios
├── Administradores
├── Supervisores
└── Técnicos
```

Perfil de técnico:

```text
Juan Pérez

Estado: Activo

Dispositivos:
Android XXXXX

Parcelas asignadas:
18

Auditorías:
14

Última sincronización:
07/10/2026 14:32

Incidencias:
2
```

## 4.11 `/admin/reports` — Reportes

Filtros:

- periodo;
- municipio;
- región;
- programa;
- técnico;
- estado.

Exportaciones:

```text
CSV
XLSX
PDF
GeoJSON
```

Los reportes deben generarse desde el backend.

## 4.12 `/admin/system` — Estado del Sistema

```text
API                 ✓ Healthy
PostgreSQL          ✓ Healthy
Redis               ✓ Healthy
MinIO               ✓ Healthy
GEE                 ✓ Healthy

Sync backlog        17
Failed jobs          2
Storage              64%
```

Procesamiento satelital:

```text
Completed      1,821
Pending           14
Failed             3
```

# 5. Matriz de Permisos

| Acción | Técnico | Admin |
|---|:---:|:---:|
| Ver parcelas asignadas | ✓ | ✓ |
| Ver todas las parcelas | ✗ | ✓ |
| Crear observaciones de campo | ✓ | ✗ |
| Crear auditoría de campo | ✓ | ✓* |
| Modificar evidencia original | ✗ | ✗ |
| Ver evidencia | ✓ | ✓ |
| Ver triage | ✓ | ✓ |
| Ejecutar/reprocesar triage | ✗ | ✓ |
| Modificar umbrales científicos | ✗ | ✗ |
| Revisar auditoría | ✗ | ✓ |
| Aprobar subsidio | ✗ | ✓ |
| Rechazar subsidio | ✗ | ✓ |
| Solicitar nueva auditoría | ✗ | ✓ |
| Administrar técnicos | ✗ | ✓ |
| Exportar reportes | Limitado | ✓ |
| Ver audit trail | ✗ | ✓ |

\* Un administrador puede crear una auditoría de revisión o administrativa, pero debe quedar diferenciada de una auditoría de campo ejecutada por un técnico.

# 6. Arquitectura de Frontend

No se recomienda mantener dos repositorios frontend.

```text
src/
├── app/
│   ├── router/
│   ├── auth/
│   └── permissions/
│
├── layouts/
│   ├── AdminLayout/
│   └── TechnicianLayout/
│
├── features/
│   ├── auth/
│   ├── plots/
│   ├── audits/
│   ├── evidence/
│   ├── sync/
│   ├── triage/
│   ├── subsidies/
│   ├── users/
│   └── reports/
│
├── components/
│   ├── map/
│   ├── tables/
│   ├── forms/
│   ├── status/
│   └── evidence/
│
├── offline/
│   ├── db/
│   ├── queue/
│   └── storage/
│
└── services/
    ├── api/
    ├── auth/
    └── sync/
```

# 7. Estrategia Responsive

## Técnico

Prioridad:

1. móvil;
2. pantalla táctil;
3. uso con una mano;
4. baja conectividad;
5. baja memoria.

Características:

- navegación inferior o compacta;
- botones grandes;
- formularios por pasos;
- pocos elementos simultáneos;
- estados de sincronización siempre visibles.

## Administrador

Prioridad:

1. escritorio;
2. monitores medianos/grandes;
3. tablas;
4. mapas;
5. filtros;
6. comparación de múltiples registros.

Características:

- sidebar;
- tablas densas;
- paneles laterales;
- mapas amplios;
- filtros persistentes.

La vista administrativa seguirá siendo funcional en tablet y móvil, pero no será el principal target de interacción.

# 8. Reglas de Seguridad del Frontend

### Regla 1 — El frontend no es autoridad

No confiar en valores calculados por el cliente para:

- supervivencia;
- intervalo de confianza;
- elegibilidad;
- aprobación;
- rechazo.

### Regla 2 — Permisos en frontend y backend

El frontend oculta y deshabilita acciones no autorizadas, pero el backend valida siempre el permiso.

### Regla 3 — Evidencia inmutable

No existe una operación de reemplazo destructivo de evidencia.

### Regla 4 — Auditoría original inmutable

Las correcciones deben crear revisiones o eventos adicionales.

### Regla 5 — Offline explícito

El usuario debe saber qué está guardado localmente, qué está sincronizado, qué está pendiente y qué tiene errores.

# 9. Flujo de Estados

## Técnico

```text
ASIGNADA
   ↓
EN PROGRESO
   ↓
GUARDADA LOCALMENTE
   ↓
PENDIENTE DE SYNC
   ↓
SINCRONIZADA
   ↓
EN REVISIÓN (si aplica)
```

## Administrador

```text
TRIAGE
   ↓
AUDITORÍA DISPONIBLE
   ↓
AUDITORÍA COMPLETADA
   ↓
RESULTADO CALCULADO
   ↓
DECISIÓN PENDIENTE
   ↓
APROBADO / RECHAZADO / REVISIÓN
```

Estos estados no deben mezclarse en una única máquina de estados global.

# 10. Criterio de Aceptación del Frontend

## Técnico

- puede descargar sus parcelas;
- puede operar sin conexión;
- puede completar una auditoría;
- puede registrar múltiples unidades de muestreo;
- puede capturar evidencia;
- puede registrar GPS y precisión;
- puede continuar con advertencias razonables de geofence;
- puede cerrar una auditoría sin calcular manualmente el resultado;
- puede sincronizarla posteriormente;
- puede conocer el estado de su almacenamiento y cola.

## Administrador

- puede visualizar la operación completa;
- puede consultar parcelas sobre mapa;
- puede revisar triage;
- puede revisar auditorías;
- puede consultar evidencia;
- puede consultar resultados estadísticos generados por servidor;
- puede tomar la decisión administrativa;
- puede consultar el historial de eventos;
- puede generar reportes;
- puede administrar usuarios y técnicos según permisos.

# 11. Arquitectura Conceptual Final

```text
                         PROBOSQUE PWA
                              │
                    ┌─────────┴─────────┐
                    │                   │
               TECHNICIAN            ADMIN
                    │                   │
             Mobile-first         Desktop-first
             Offline-first        Online-first
                    │                   │
             ┌──────▼──────┐     ┌──────▼──────┐
             │ Captura     │     │ Supervisión │
             │ Muestreo    │     │ Triage      │
             │ GPS         │     │ Auditorías  │
             │ Evidencia   │     │ Subsidios   │
             │ Sync        │     │ Reportes    │
             └──────┬──────┘     └──────┬──────┘
                    │                   │
                    └─────────┬─────────┘
                              │
                         FASTAPI API
                              │
              ┌───────────────┼────────────────┐
              │               │                │
         PostgreSQL         Redis            MinIO
          + PostGIS                           │
              │                               │
              └───────────────┬───────────────┘
                              │
                    Cálculo y trazabilidad
                              │
                    Decisión administrativa
```

# 12. Principio Arquitectónico Final

La división de vistas no debe entenderse únicamente como:

> **Admin vs. Usuario**

La separación real es:

> **Operación de campo vs. Supervisión y decisión.**

El técnico captura la realidad.

El backend calcula, valida y preserva.

El administrador interpreta, revisa y decide.

La UI debe hacer evidente esa separación en todo momento.
