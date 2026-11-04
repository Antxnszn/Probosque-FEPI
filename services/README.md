# Servicios del trámite

Cada carpeta es un proceso independiente. El nombre sale del macrorequerimiento, no de un código interno.

| Carpeta | Macrorequerimiento | Base |
|---|---|---|
| `orquestador` | Coordinación del trámite. No es uno de los cinco macrorequerimientos. | `fepi_orquestador` |
| `convocatorias` | REQ-01 Publicación y consulta de convocatorias | `fepi_convocatorias` |
| `expediente-digital` | REQ-02 Postulación, registro de solicitud y expediente digital | `fepi_expediente_digital` |
| `dictaminacion` | REQ-03 Evaluación integral, dictaminación y asignación colegiada | `fepi_dictaminacion` |
| `formalizacion-seguimiento` | REQ-04 Formalización contractual, asignación de insumos, dispersión financiera y seguimiento | `fepi_formalizacion_seguimiento` |
| `metricas-cierre` | REQ-05 Métricas de desempeño y cierre del programa | `fepi_metricas_cierre` |

La calculadora y el visor siguen en `modules/probosque`. Ninguno de estos servicios importa ese código.

`services/platform-api` era el esqueleto de un solo proceso. Ya no es el lugar donde se implementa el trámite.
