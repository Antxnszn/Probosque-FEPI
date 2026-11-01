# Límites Funcionales y Propiedad de Datos (FEPI Monorepo)

**Fecha:** 31 de octubre de 2026  
**Estado:** Vigente  
**Referencia:** `docs/plans/active/PLAN_REORGANIZACION_FEPI_MONOREPO.md`

## 1. Principio Rector

FEPI es la plataforma principal para gestionar programas, convocatorias, trámites, expedientes administrativos y coordinación general de operación de campo. PROBOSQUE es un subsistema especializado que aporta capacidades de auditoría forestal, cubicación de carbono, triaje satelital, geocercas y visor multitemporal.

Para garantizar consistencia y evitar colisiones:
- Cada servicio es el único escritor de su propio esquema de base de datos.
- No se comparten modelos SQLAlchemy ni sesiones de base de datos directas entre la plataforma y el subsistema.
- La comunicación e intercambio de datos ocurre mediante contratos explícitos (APIs REST / OpenAPI).

## 2. Matriz de Propiedad de Funciones y Datos

| Dominio / Entidad | Propietario del Dato | Responsabilidad de FEPI (Platform API / Web) | Responsabilidad de PROBOSQUE |
|---|---|---|---|
| Usuarios y Credenciales | PROBOSQUE (Identidad inicial unificada) | Consume validación de sesión sin duplicar cuentas ni passwords | Emite tokens JWT, valida roles y mantiene credenciales |
| Convocatorias y Reglas | FEPI (Platform API) | Publicación, vigencias, reglas de programas y requisitos | Ninguna |
| Expedientes Administrativos | FEPI (Platform API) | Asigna folios, integra documentos, resoluciones y pagos | Ninguna |
| Predios y Geometrías | PROBOSQUE | Almacena referencia foránea estable y consulta geometría por API | Gestiona geometrías, polígonos, superficies y validación cartográfica |
| Auditorías Forestales y Muestreo | PROBOSQUE | Consulta avance y resultados para dictamen | Ejecuta muestreo en campo, árboles, alturas y evidencias |
| Evidencia Fotográfica y Geocercas | PROBOSQUE | Enlaza folios de evidencia en expedientes | Valida coordenadas GPS, geocercas y metadatos EXIF |
| Sincronización Fuera de Línea | PROBOSQUE | Mantiene la compatibilidad offline del PWA de campo | Reto criptográfico, firma de dispositivo y almacenamiento Dexie |
| Estimación de Carbono y Satélite | PROBOSQUE | Visualiza indicadores consolidados | Modelos alométricos, cocientes de biomasa y triaje Sentinel-2 |
| Visor Multitemporal | PROBOSQUE | Monta el visor dentro del layout principal (/visor) | Procesa mapas MapBiomas, transiciones y teselas en vivo |
| Resoluciones, Pagos y Cierre | FEPI (Platform API) | Actos administrativos, contratos, comités y órdenes de pago | Ninguna (no se emiten pagos automáticos desde el cálculo) |

## 3. Contratos de Comunicación

1. **Sesión (`contracts/session/`):** Define el formato del payload de identidad, expiración y mecanismo de verificación compartido.
2. **PROBOSQUE Client (`contracts/probosque/`):** Contrato OpenAPI exportado (`openapi.json`) consumido por `packages/probosque-client/` y por la API principal.
3. **Plataforma (`contracts/platform/`):** Especificación de endpoints administrativos y flujo de expedientes.
