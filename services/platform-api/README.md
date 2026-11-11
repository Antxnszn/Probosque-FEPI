# FEPI Platform API (esqueleto anterior)

El trámite ya no se implementa en este proceso. Los servicios vigentes son `services/orquestador`, `services/convocatorias`, `services/expediente-digital`, `services/dictaminacion`, `services/formalizacion-seguimiento` y `services/metricas-cierre`. Este directorio se conserva como referencia del primer acomodo. `operacion` sigue sin ser un servicio. El texto siguiente describe ese acomodo viejo; aquí no hay una aplicación en ejecución.

## Responsabilidades del Servicio

1. **Convocatorias (`app/modules/convocatorias/`):** Publicación, requisitos de programas, periodos de vigencia y apertura de folios.
2. **Expedientes (`app/modules/expedientes/`):** Recepción de solicitudes, integración documental y asignación de folios institucionales.
3. **Dictaminación (`app/modules/dictaminacion/`):** Revisión técnica y jurídica de solicitudes, consultas de elegibilidad al cliente PROBOSQUE y emisión de dictámenes administrativos.
4. **Seguimiento (`app/modules/seguimiento/`):** Control de metas, cumplimiento de calendarios y convenios de apoyo.
5. **Cierre (`app/modules/cierre/`):** Finiquitos, comprobación fiscal, órdenes de pago y conclusión formal de expedientes.
6. **Operación (`app/modules/operacion/`):** Coordinación interinstitucional y supervisión de brigadas.

## Integraciones y Seguridad

- **Seguridad (`app/security/`):** Validación de identidad común mediante tokens emitidos por PROBOSQUE y verificación de permisos RBAC específicos de la plataforma.
- **Cliente PROBOSQUE (`app/integrations/probosque/`):** Cliente HTTP tipado basado en el contrato `contracts/probosque/openapi.json`. No realiza consultas directas a la base de datos de PROBOSQUE.

## Guía de Desarrollo para el Equipo

Cada dominio administrativo implementa:
- `router.py`: Endpoints REST bajo `/api/platform/v1/<dominio>`.
- `schemas.py`: Modelos Pydantic de entrada y salida con tipado estricto.
- `service.py`: Casos de uso y lógica de negocio.
- Operaciones pendientes: Deben responder con código HTTP 501 (Not Implemented) o permanecer desactivadas, sin simular datos falsos de negocio.
