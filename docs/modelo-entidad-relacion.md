# Modelo lógico del trámite

Este modelo cubre el trámite de apoyos de PROBOSQUE 2026: cuentas, convocatorias, solicitudes, avisos, dictámenes, formalización, seguimiento, cierre y quejas. No incluye la calculadora de biomasa ni el visor forestal.

UML no tiene un diagrama de Chen. El diagrama de clases, con atributos y multiplicidad, es el modelo lógico. La asociación dibuja la relación; la llave foránea no se repite como atributo. Los atributos que empiezan con `/` se calculan y no se guardan.

El modelo está en tercera forma normal:

- Cada atributo depende de la llave de su clase y de toda la llave.
- Lo que se repite (personas, documentos, refrendos, superficies, renglones de la lista) es una clase hija.
- El programa vive en la solicitud. Dictamen, entrega y cierre no lo copian.
- Un catálogo (programa, delegación, puesto, grupo, municipio) no se escribe como texto suelto en cada hecho.

## Cuentas y avisos

```mermaid
classDiagram
  class Cuenta {
    +id
    nombre
    correo
    passwordHash
    clase
    activo
    creadoEn
  }
  class Puesto {
    +clave
    nombre
  }
  class Personal {
    +cuentaId
  }
  class Delegacion {
    +id
    nombre
  }
  class AsignacionDelegacion {
    +cuentaId
  }
  class Aviso {
    +id
    tipo
    texto
    leido
    creadoEn
  }
  class Solicitud
  Cuenta "1" --> "0..1" Personal : es personal
  Puesto "1" --> "*" Personal
  Personal "1" --> "0..1" AsignacionDelegacion : solo si el puesto es Delegación
  Delegacion "1" --> "*" AsignacionDelegacion
  Cuenta "1" --> "*" Aviso
  Solicitud "0..1" --> "*" Aviso
```

`clase` es solicitante, personal o arranque. Solo puede existir una cuenta de arranque. El correo se repite entre solicitante y personal porque son dos cuentas; la llave candidata es correo más clase. La delegación no va en `Cuenta`: solo existe cuando el puesto es Delegación.

El aviso se lee dentro del sistema. El correo de la persona se guarda en su registro y no se usa para enviar.

## Convocatorias

```mermaid
classDiagram
  class Programa {
    +clave
    nombre
  }
  class Convocatoria {
    +id
    titulo
    texto
    tipo
    vigenciaInicio
    vigenciaFin
    estado
    creadoEn
  }
  class ConvocatoriaPrograma {
    +convocatoriaId
    +programaClave
  }
  class DocumentoPedido {
    +id
    nombre
  }
  class Archivo {
    +id
    nombre
    ruta
  }
  class Anexo {
    +id
    nombre
    tipoAnexo
  }
  class Solicitud
  Programa "1" --> "*" ConvocatoriaPrograma
  Convocatoria "1" --> "*" ConvocatoriaPrograma
  Convocatoria "1" --> "*" DocumentoPedido
  Convocatoria "1" --> "0..1" Archivo : PDF
  Convocatoria "1" --> "*" Anexo
  Anexo "0..1" --> "1" Programa : de un programa
  Anexo "*" --> "1" Archivo
  Convocatoria "1" --> "*" Solicitud
  Programa "1" --> "*" Solicitud
```

`tipo` es Individual o General. Individual tiene exactamente un programa. General tiene uno o más, y cada solicitud elige uno. Esa regla no se puede expresar solo con la forma normal; la valida el servicio.

`DocumentoPedido` guarda el nombre. El archivo lo sube quien solicita, en `DocumentoSolicitud`.

`Anexo.tipoAnexo` es material o resultado publicado. La lista FO-PB-516 entra como resultado.

## Solicitud, predio y personas

```mermaid
classDiagram
  class Solicitud {
    +id
    estado
    etiqueta
    documentacionEnProbosque
    declaratoriaSinLitigio
    avisoPrivacidad
    folio
    creadoEn
  }
  class Grupo {
    +clave
    nombre
  }
  class Predio {
    +id
    nombreLegal
    localidad
    programaManejoVigente
    tipoCertificado
    superficieHa
    geometriaWkt
  }
  class Municipio {
    +id
    nombre
  }
  class Refrendo {
    +solicitudId
    +anio
    folio
  }
  class SuperficieConcepto {
    +id
    concepto
    anio
    hectareas
  }
  class PersonaSolicitud {
    +id
    papel
    primerApellido
    segundoApellido
    nombres
    fechaNacimiento
    sexo
    estadoCivil
    gradoEstudios
    tipoIdentificacion
    folioIdentificacion
    nacionalidad
    entidadNacimiento
    curp
    telefonoFijo
    celular
    correo
    redSocial
    calle
    numeroExterior
    numeroInterior
    entreCalles
    referencia
    colonia
    localidad
    entidad
    codigoPostal
  }
  class DocumentoSolicitud {
    +id
    clase
    nombre
  }
  class Recepcion {
    +solicitudId
    folio
    fecha
    observaciones
    lugarVisita
    fechaVisita
    fechaLimiteCorreccion
  }
  class Archivo
  class Delegacion
  class Cuenta
  Grupo "1" --> "*" Solicitud
  Solicitud "1" --> "1" Predio
  Municipio "1" --> "*" Predio
  Delegacion "1" --> "*" Municipio
  Solicitud "1" --> "*" Refrendo
  Predio "1" --> "*" SuperficieConcepto
  Solicitud "1" --> "*" PersonaSolicitud
  Solicitud "1" --> "*" DocumentoSolicitud
  PersonaSolicitud "0..1" --> "*" DocumentoSolicitud
  DocumentoSolicitud "*" --> "1" Archivo
  Solicitud "1" --> "0..1" Recepcion
  Cuenta "1" --> "0..1" Recepcion : quien recibió
  Cuenta "1" --> "*" Solicitud : quien solicita
```

`etiqueta` es Propietario, Poseedor, Núcleo Agrario, Sociedad u Otro. Propietario y Poseedor usan persona física. Sociedad usa persona jurídica. Núcleo Agrario usa el suyo. Otro no abre otro bloque de personas.

El domicilio de la FO-PB-502 depende de la persona, así que vive en `PersonaSolicitud`. No hay una tabla de domicilio compartida porque ninguna persona reutiliza el domicilio de otra.

`Refrendo` es un renglón por año (2023, 2024, 2025). Tres columnas de folio en la solicitud repetirían el mismo hecho.

`SuperficieConcepto` separa la sección III de la FO-PB-501 A. Todavía no está en las tablas: las historias de cada programa la van a llenar. Guardarla como columnas maderable, navideña y reforestación en el predio rompería la primera forma normal.

`Municipio` determina la delegación. Por eso la delegación no se copia en la solicitud. Hoy, mientras el catálogo de municipios no está cargado, la pantalla deja escribir el municipio y elegir una de las nueve delegaciones. Esa pareja es transitoria y el servicio la guarda en el predio y en la solicitud para no romper la bandeja.

La geometría es un solo valor WKT, o los tres archivos `.shp`, `.shx` y `.dbf` como `Archivo`. Un vértice suelto no sustituye al polígono.

## Dictamen, comité y lista

```mermaid
classDiagram
  class Solicitud
  class DictamenJuridico {
    +solicitudId
    procede
    creadoEn
  }
  class DictamenTecnico {
    +solicitudId
    lista
    creadoEn
  }
  class CriterioTecnico {
    +id
    programaClave
    nombre
    puntosMaximos
  }
  class RespuestaCriterio {
    +dictamenId
    +criterioId
    puntos
  }
  class Resolucion {
    +id
    resultado
    creadoEn
  }
  class PublicacionLista {
    +id
    fecha
  }
  class RenglonLista {
    +id
    folio
    municipio
    modalidad
    superficieAsignada
    monto
    /subtotalDelegacion
  }
  class Archivo
  class Cuenta
  class Convocatoria
  class Delegacion
  Solicitud "1" --> "0..1" DictamenJuridico
  Solicitud "1" --> "0..1" DictamenTecnico
  DictamenJuridico "*" --> "1" Archivo
  DictamenTecnico "*" --> "1" Archivo
  DictamenTecnico "1" --> "*" RespuestaCriterio
  CriterioTecnico "1" --> "*" RespuestaCriterio
  Solicitud "1" --> "*" Resolucion
  Cuenta "1" --> "*" Resolucion : comité
  Convocatoria "1" --> "*" PublicacionLista
  PublicacionLista "1" --> "*" RenglonLista
  PublicacionLista "1" --> "*" Archivo : PDF, estrados, Gaceta
  Delegacion "1" --> "*" RenglonLista
  Solicitud "1" --> "*" RenglonLista
```

`lista` del dictamen técnico es factible con presupuesto, en espera o no factible. En el trámite general no hay puntaje. PSAHEM y Manejo Forestal usan `CriterioTecnico` y `RespuestaCriterio`, hasta 100 puntos, cuando se implementen esas historias.

Puede haber más de una `Resolucion` porque el comité puede pasar de lista de espera a beneficiario. El resultado vigente es la última. No se guarda otra vez el programa.

`RenglonLista` es la foto de la FO-PB-516. Se conserva aunque después cambie la solicitud, porque es el documento publicado. El subtotal por delegación se calcula al armar el PDF y no se guarda.

## Formalización, seguimiento y cierre

```mermaid
classDiagram
  class Solicitud
  class Contrato {
    +solicitudId
    estado
    clabe
    compromisos
    creadoEn
  }
  class DocumentoContrato {
    +id
    tipoDocumento
  }
  class Entrega {
    +id
    fecha
    tipoApoyo
    monto
    confirmadaEn
  }
  class SeguimientoDocumento {
    +id
    nombre
    creadoEn
  }
  class Informe {
    +solicitudId
    estado
    creadoEn
  }
  class Cierre {
    +solicitudId
    tipo
    texto
    creadoEn
  }
  class ExpedienteCierre {
    +id
    clase
  }
  class Queja {
    +id
    texto
    respuesta
    creadoEn
  }
  class Archivo
  class Cuenta
  Solicitud "1" --> "0..1" Contrato
  Contrato "1" --> "*" DocumentoContrato
  DocumentoContrato "*" --> "1" Archivo
  Solicitud "1" --> "*" Entrega
  Entrega "*" --> "0..1" Archivo
  Cuenta "1" --> "*" Entrega : quien avisó
  Solicitud "1" --> "*" SeguimientoDocumento
  SeguimientoDocumento "*" --> "1" Archivo
  Solicitud "1" --> "0..1" Informe
  Informe "*" --> "1" Archivo
  Solicitud "1" --> "0..1" Cierre
  Cierre "1" --> "*" ExpedienteCierre
  ExpedienteCierre "*" --> "1" Archivo
  Solicitud "1" --> "*" Queja
  Cuenta "1" --> "*" Queja : beneficiaria
  Cuenta "1" --> "*" Queja : órgano de control
```

`DocumentoContrato.tipoDocumento` nombra el archivo sin inventar sus casillas: FO-PB-507, contrato hecho fuera, FO-PB-520-B, FO-PB-520 A, contrato con el asesor o la certificadora, cuenta mancomunada, anexo técnico.

`Entrega` es el aviso de una entrega ya hecha. No es un pago bancario. En PSAHEM el mismo aviso lo registra la fiduciaria: cheque nominativo, 70 por ciento, tres meses.

`ExpedienteCierre.clase` es pagos, predio o administrativo. Son tres renglones, no tres columnas.

Los indicadores de UIPPE no tienen tabla. Se cuentan las resoluciones por programa y por resultado. Guardar el conteo duplicaría un dato que ya está en `Resolucion`.

## Qué hay hoy en las tablas

| Hecho del modelo | Dónde está ahora | Qué falta |
|---|---|---|
| Cuenta, puesto y delegación | `cuenta.puesto` y `cuenta.delegacion` en el orquestador | La delegación sigue en la cuenta. El modelo la separa cuando el puesto es Delegación. No se mueve en esta pasada. |
| Convocatoria, programas, documentos, anexos | Servicio de convocatorias | Faltaba el tipo Individual o General. Esta pasada lo agrega. |
| Solicitud y personas | Servicio de expediente | La persona solo tenía nombre e identificación. Esta pasada agrega la FO-PB-502, el predio, el grupo, los refrendos y la declaratoria. |
| Nombre del titular copiado en la solicitud | `solicitud.nombre_solicitante` | Se sigue llenando desde el titular para la bandeja. La fuente es la persona. |
| Recepción | Folio y fecha límite en la solicitud | Lugar y fecha de visita todavía no son columnas propias. |
| Dictamen | `procede` en jurídico y técnico | El técnico del modelo usa tres listas, no un sí o no. No se cambia hasta implementar esa pantalla. |
| Resolución, contrato, entrega, informe, cierre, queja | Servicios de dictaminación, formalización y cierre | Varias tablas copian `programa`. El modelo no lo copia. No se reescriben en esta pasada. |
| Lista FO-PB-516, criterios, superficie por concepto | No hay tabla | Quedan dibujados para las historias que siguen. |
