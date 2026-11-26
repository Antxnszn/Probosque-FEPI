from datetime import date, datetime
from uuid import uuid4

from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile
from fastapi.responses import FileResponse
from pydantic import BaseModel
from sqlalchemy import select, text
from sqlalchemy.orm import Session, selectinload

from app.actor import actor, exige
from app.db import sesion
from app.geometria import a_wkt, anillo, carpeta_solicitud, escribir_shapefile, leer_shapefile, superficie_ha, vertices_de
from app.modelos import DELEGACIONES, DocumentoSolicitud, PersonaSolicitud, Refrendo, Solicitud

router = APIRouter(prefix="/interno/v1", tags=["solicitudes"])

TIPOS = {"persona_fisica", "persona_juridica", "nucleo_agrario"}
IDENTIFICACIONES = {"ine", "pasaporte", "otra"}
PAPELES = {
    "titular",
    "segunda",
    "apoderado",
    "presidencia",
    "secretaria",
    "tesoreria",
    "otorgante",
    "representante",
    "testigo_1",
    "testigo_2",
}
CARTA = {"otorgante", "representante", "testigo_1", "testigo_2"}
OBLIGADOS = {
    "persona_fisica": {"titular", "segunda"},
    "persona_juridica": {"titular", "apoderado", "segunda"},
    "nucleo_agrario": {"titular", "presidencia", "secretaria", "tesoreria", "segunda"},
}
CONSULTA = {"convocatorias", "coordinacion_delegaciones", "super_admin"}
ETIQUETAS = {"", "propietario", "poseedor", "nucleo_agrario", "sociedad", "otro"}
GRUPOS = {
    "",
    "mujeres_pueblos_indigenas",
    "afromexicanas",
    "enfermedades_cronicas",
    "victimas",
    "repatriadas",
    "cuidadoras",
    "ninguno",
}
ANIOS_REFRENDO = {2023, 2024, 2025}
CAMPOS_PERSONA = (
    "primer_apellido",
    "segundo_apellido",
    "fecha_nacimiento",
    "sexo",
    "estado_civil",
    "grado_estudios",
    "folio_identificacion",
    "nacionalidad",
    "entidad_nacimiento",
    "curp",
    "telefono_fijo",
    "celular",
    "correo",
    "red_social",
    "calle",
    "numero_exterior",
    "numero_interior",
    "entre_calles",
    "referencia_domicilio",
    "colonia",
    "localidad_domicilio",
    "municipio_domicilio",
    "entidad_domicilio",
    "codigo_postal",
)


class PersonaEntrada(BaseModel):
    papel: str
    nombre: str
    tipo_identificacion: str = ""
    sin_domicilio: bool = False
    primer_apellido: str = ""
    segundo_apellido: str = ""
    fecha_nacimiento: date | None = None
    sexo: str = ""
    estado_civil: str = ""
    grado_estudios: str = ""
    folio_identificacion: str = ""
    nacionalidad: str = ""
    entidad_nacimiento: str = ""
    curp: str = ""
    telefono_fijo: str = ""
    celular: str = ""
    correo: str = ""
    red_social: str = ""
    calle: str = ""
    numero_exterior: str = ""
    numero_interior: str = ""
    entre_calles: str = ""
    referencia_domicilio: str = ""
    colonia: str = ""
    localidad_domicilio: str = ""
    municipio_domicilio: str = ""
    entidad_domicilio: str = ""
    codigo_postal: str = ""


class RefrendoEntrada(BaseModel):
    anio: int
    folio: str = ""


class SolicitudEntrada(BaseModel):
    convocatoria_id: int
    programa: str
    tipo: str
    municipio: str
    delegacion: str
    personas: list[PersonaEntrada]
    etiqueta: str = ""
    grupo: str = ""
    documentacion_en_probosque: bool = False
    declaratoria_sin_litigio: bool = False
    aviso_privacidad: bool = False
    nombre_predio: str = ""
    localidad: str = ""
    programa_manejo: bool = False
    tipo_certificado: str = ""
    refrendos: list[RefrendoEntrada] = []


class PoligonoEntrada(BaseModel):
    vertices: list[dict]


class EnvioEntrada(BaseModel):
    documentos: list[str] = []


class ComprobanteEntrada(BaseModel):
    folio: str
    quien_recibio: str
    fecha_recepcion: date
    observaciones: str = ""
    lugar_visita: str
    fecha_visita: date


class CorreccionEntrada(BaseModel):
    correccion: str
    fecha_limite: date


def carga(db: Session, solicitud_id: int) -> Solicitud | None:
    return db.scalar(
        select(Solicitud)
        .options(selectinload(Solicitud.personas), selectinload(Solicitud.documentos), selectinload(Solicitud.refrendos))
        .where(Solicitud.id == solicitud_id)
    )


def serializar(fila: Solicitud) -> dict:
    return {
        "id": fila.id,
        "cuenta_id": fila.cuenta_id,
        "convocatoria_id": fila.convocatoria_id,
        "programa": fila.programa,
        "tipo": fila.tipo,
        "etiqueta": fila.etiqueta,
        "grupo": fila.grupo,
        "documentacion_en_probosque": fila.documentacion_en_probosque,
        "declaratoria_sin_litigio": fila.declaratoria_sin_litigio,
        "aviso_privacidad": fila.aviso_privacidad,
        "nombre_predio": fila.nombre_predio,
        "localidad": fila.localidad,
        "programa_manejo": fila.programa_manejo,
        "tipo_certificado": fila.tipo_certificado,
        "municipio": fila.municipio,
        "delegacion": fila.delegacion,
        "refrendos": [{"anio": item.anio, "folio": item.folio} for item in fila.refrendos],
        "estado": fila.estado,
        "folio": fila.folio,
        "quien_recibio": fila.quien_recibio,
        "fecha_recepcion": fila.fecha_recepcion.isoformat() if fila.fecha_recepcion else None,
        "observaciones": fila.observaciones,
        "lugar_visita": fila.lugar_visita,
        "fecha_visita": fila.fecha_visita.isoformat() if fila.fecha_visita else None,
        "correccion": fila.correccion,
        "fecha_limite_subsanacion": fila.fecha_limite_subsanacion.isoformat() if fila.fecha_limite_subsanacion else None,
        "superficie_ha": fila.superficie_ha,
        "tiene_poligono": bool(fila.wkt),
        "vertices": vertices_de(fila.wkt),
        "creado_en": fila.creado_en.isoformat() if fila.creado_en else None,
        "modificado_en": fila.modificado_en.isoformat() if fila.modificado_en else None,
        "modificado_por": fila.modificado_por,
        "personas": [
            {
                "id": persona.id,
                "papel": persona.papel,
                "nombre": persona.nombre,
                "tipo_identificacion": persona.tipo_identificacion,
                "sin_domicilio": persona.sin_domicilio,
                **{campo: getattr(persona, campo) for campo in CAMPOS_PERSONA},
                "fecha_nacimiento": persona.fecha_nacimiento.isoformat() if persona.fecha_nacimiento else None,
            }
            for persona in fila.personas
        ],
        "archivos": [
            {
                "id": archivo.id,
                "clase": archivo.clase,
                "nombre": archivo.nombre,
                "persona_id": archivo.persona_id,
            }
            for archivo in fila.documentos
        ],
    }


def puede_ver(fila: Solicitud, quien: dict) -> bool:
    if quien["clase"] == "solicitante":
        return fila.cuenta_id == quien["id"]
    if quien["puesto"] == "delegacion":
        return fila.delegacion == quien["delegacion"] and fila.estado in {"enviada", "subsanacion", "recibida"}
    if quien["puesto"] in CONSULTA:
        return True if quien["puesto"] == "super_admin" else fila.estado in {"enviada", "subsanacion", "recibida"}
    return False


def exigir_vista(fila: Solicitud | None, quien: dict) -> Solicitud:
    if fila is None or not puede_ver(fila, quien):
        raise HTTPException(status_code=404, detail="La solicitud no existe")
    return fila


def exigir_borrador(fila: Solicitud, quien: dict) -> None:
    exige(quien, {"solicitante"})
    if fila.cuenta_id != quien["id"] or fila.estado not in {"borrador", "subsanacion"}:
        raise HTTPException(status_code=409, detail="Esta solicitud ya no se puede modificar")


def marcar(fila: Solicitud, quien: dict) -> None:
    fila.modificado_en = datetime.utcnow()
    fila.modificado_por = quien["id"] or None


def _marcar_enviada(fila: Solicitud, quien: dict) -> None:
    fila.correccion = ""
    fila.fecha_limite_subsanacion = None
    fila.estado = "enviada"
    marcar(fila, quien)


def exigir_enviada(fila: Solicitud, quien: dict) -> None:
    exige(quien, {"delegacion"})
    if fila.delegacion != quien["delegacion"] or fila.estado != "enviada":
        raise HTTPException(
            status_code=409,
            detail="Solo se recibe o se pide corrección si la solicitud está enviada y es de esa delegación",
        )


def guardar_pdf(solicitud_id: int, archivo: UploadFile) -> tuple[str, str]:
    nombre = archivo.filename or "archivo.pdf"
    if not nombre.lower().endswith(".pdf"):
        raise HTTPException(status_code=422, detail="El archivo tiene que ser PDF")
    contenido = archivo.file.read()
    if not contenido:
        raise HTTPException(status_code=422, detail="El archivo está vacío")
    if len(contenido) > 20 * 1024 * 1024:
        raise HTTPException(status_code=413, detail="El archivo pasa de 20 MB")
    relativo = f"{uuid4().hex}.pdf"
    (carpeta_solicitud(solicitud_id) / relativo).write_bytes(contenido)
    return relativo, nombre


@router.get("/solicitudes")
def listar(db: Session = Depends(sesion), quien: dict = Depends(actor)):
    filas = db.scalars(
        select(Solicitud)
        .options(selectinload(Solicitud.personas), selectinload(Solicitud.documentos), selectinload(Solicitud.refrendos))
        .order_by(Solicitud.id.desc())
    ).all()
    return [serializar(fila) for fila in filas if puede_ver(fila, quien)]


@router.post("/solicitudes")
def crear(cuerpo: SolicitudEntrada, db: Session = Depends(sesion), quien: dict = Depends(actor)):
    exige(quien, {"solicitante"})
    if cuerpo.tipo not in TIPOS:
        raise HTTPException(status_code=422, detail="El tipo de solicitante no existe")
    if cuerpo.delegacion not in DELEGACIONES:
        raise HTTPException(status_code=422, detail="La delegación tiene que ser una de las nueve")
    _validar_catalogos(cuerpo)
    fila = Solicitud(
        cuenta_id=quien["id"],
        convocatoria_id=cuerpo.convocatoria_id,
        programa=cuerpo.programa,
        nombre_solicitante=_nombre_titular(cuerpo.personas),
        municipio=cuerpo.municipio.strip(),
        delegacion=cuerpo.delegacion,
        tipo=cuerpo.tipo,
        modificado_por=quien["id"],
        modificado_en=datetime.utcnow(),
    )
    _copiar_solicitud(fila, cuerpo)
    db.add(fila)
    db.flush()
    _guardar_personas(db, fila, cuerpo.personas)
    _guardar_refrendos(db, fila, cuerpo.refrendos)
    db.commit()
    return serializar(carga(db, fila.id))


def _nombre_titular(personas: list[PersonaEntrada]) -> str:
    titular = next((persona for persona in personas if persona.papel == "titular" and persona.nombre.strip()), None)
    if titular is None:
        return "Borrador"
    return " ".join(parte for parte in (titular.primer_apellido, titular.segundo_apellido, titular.nombre) if parte.strip()) or "Borrador"


def _validar_catalogos(cuerpo: SolicitudEntrada) -> None:
    if cuerpo.etiqueta not in ETIQUETAS:
        raise HTTPException(status_code=422, detail="La etiqueta del formato no existe")
    if cuerpo.grupo not in GRUPOS:
        raise HTTPException(status_code=422, detail="El grupo de quien solicita no existe")
    for refrendo in cuerpo.refrendos:
        if refrendo.anio not in ANIOS_REFRENDO:
            raise HTTPException(status_code=422, detail="El refrendo solo puede ser de 2023, 2024 o 2025")


def _copiar_solicitud(fila: Solicitud, cuerpo: SolicitudEntrada) -> None:
    fila.etiqueta = cuerpo.etiqueta
    fila.grupo = cuerpo.grupo
    fila.documentacion_en_probosque = cuerpo.documentacion_en_probosque
    fila.declaratoria_sin_litigio = cuerpo.declaratoria_sin_litigio
    fila.aviso_privacidad = cuerpo.aviso_privacidad
    fila.nombre_predio = cuerpo.nombre_predio.strip()
    fila.localidad = cuerpo.localidad.strip()
    fila.programa_manejo = cuerpo.programa_manejo
    fila.tipo_certificado = cuerpo.tipo_certificado.strip()


def _copiar_persona(destino: PersonaSolicitud, origen: PersonaEntrada) -> None:
    for campo in CAMPOS_PERSONA:
        valor = getattr(origen, campo)
        if isinstance(valor, str):
            valor = valor.strip()
        setattr(destino, campo, valor)


def _guardar_refrendos(db: Session, fila: Solicitud, refrendos: list[RefrendoEntrada]) -> None:
    actuales = {item.anio: item for item in fila.refrendos}
    vistos: set[int] = set()
    for refrendo in refrendos:
        folio = refrendo.folio.strip()
        if not folio:
            continue
        vistos.add(refrendo.anio)
        existente = actuales.get(refrendo.anio)
        if existente is None:
            db.add(Refrendo(solicitud_id=fila.id, anio=refrendo.anio, folio=folio))
        else:
            existente.folio = folio
    for anio, existente in actuales.items():
        if anio not in vistos:
            db.delete(existente)


def _guardar_personas(db: Session, fila: Solicitud, personas: list[PersonaEntrada]) -> None:
    actuales = {persona.papel: persona for persona in fila.personas}
    vistos: set[str] = set()
    for persona in personas:
        if persona.papel not in PAPELES:
            raise HTTPException(status_code=422, detail="El papel de la persona no existe")
        if persona.papel in vistos:
            raise HTTPException(status_code=422, detail="Ese papel ya está en la solicitud")
        nombre = persona.nombre.strip()
        if not nombre:
            continue
        vistos.add(persona.papel)
        if persona.tipo_identificacion and persona.tipo_identificacion not in IDENTIFICACIONES:
            raise HTTPException(status_code=422, detail="La identificación es INE, pasaporte u otra oficial con fotografía")
        existente = actuales.get(persona.papel)
        if existente is None:
            existente = PersonaSolicitud(solicitud_id=fila.id, papel=persona.papel, nombre=nombre)
            db.add(existente)
        existente.nombre = nombre
        existente.tipo_identificacion = persona.tipo_identificacion
        existente.sin_domicilio = persona.sin_domicilio
        _copiar_persona(existente, persona)
    for papel, existente in actuales.items():
        if papel not in vistos:
            db.delete(existente)


@router.get("/solicitudes/{solicitud_id}")
def detalle(solicitud_id: int, db: Session = Depends(sesion), quien: dict = Depends(actor)):
    return serializar(exigir_vista(carga(db, solicitud_id), quien))


@router.patch("/solicitudes/{solicitud_id}")
def cambiar(
    solicitud_id: int,
    cuerpo: SolicitudEntrada,
    db: Session = Depends(sesion),
    quien: dict = Depends(actor),
):
    fila = exigir_vista(carga(db, solicitud_id), quien)
    exigir_borrador(fila, quien)
    if cuerpo.tipo not in TIPOS:
        raise HTTPException(status_code=422, detail="El tipo de solicitante no existe")
    if cuerpo.delegacion not in DELEGACIONES:
        raise HTTPException(status_code=422, detail="La delegación tiene que ser una de las nueve")
    _validar_catalogos(cuerpo)
    fila.tipo = cuerpo.tipo
    fila.nombre_solicitante = _nombre_titular(cuerpo.personas)
    fila.municipio = cuerpo.municipio.strip()
    fila.delegacion = cuerpo.delegacion
    fila.programa = cuerpo.programa
    fila.convocatoria_id = cuerpo.convocatoria_id
    _copiar_solicitud(fila, cuerpo)
    _guardar_personas(db, fila, cuerpo.personas)
    _guardar_refrendos(db, fila, cuerpo.refrendos)
    marcar(fila, quien)
    db.commit()
    return serializar(carga(db, fila.id))


@router.post("/solicitudes/{solicitud_id}/archivos")
def subir(
    solicitud_id: int,
    clase: str = Form(...),
    nombre: str = Form(""),
    persona_id: int = Form(0),
    archivo: UploadFile = File(...),
    db: Session = Depends(sesion),
    quien: dict = Depends(actor),
):
    fila = exigir_vista(carga(db, solicitud_id), quien)
    exigir_borrador(fila, quien)
    if clase not in {
        "identificacion",
        "curp",
        "comprobante",
        "acta_constitutiva",
        "acta_eleccion",
        "acta_predio",
        "carta_poder",
        "tenencia",
        "pedido",
    }:
        raise HTTPException(status_code=422, detail="Ese documento no forma parte de la solicitud")
    if persona_id and persona_id not in {persona.id for persona in fila.personas}:
        raise HTTPException(status_code=422, detail="La persona no está en la solicitud")
    ruta, original = guardar_pdf(fila.id, archivo)
    db.add(
        DocumentoSolicitud(
            solicitud_id=fila.id,
            clase=clase,
            nombre=(nombre or original).strip(),
            persona_id=persona_id or None,
            subido_por=quien["id"],
            ruta=ruta,
        )
    )
    marcar(fila, quien)
    db.commit()
    return serializar(carga(db, fila.id))


@router.get("/solicitudes/{solicitud_id}/archivos/{archivo_id}")
def bajar(solicitud_id: int, archivo_id: int, db: Session = Depends(sesion), quien: dict = Depends(actor)):
    fila = exigir_vista(carga(db, solicitud_id), quien)
    archivo = next((item for item in fila.documentos if item.id == archivo_id), None)
    if archivo is None:
        raise HTTPException(status_code=404, detail="El archivo no está")
    return FileResponse(carpeta_solicitud(fila.id) / archivo.ruta, filename="documento.pdf")


@router.get("/solicitudes/{solicitud_id}/shapefile")
def bajar_shapefile(solicitud_id: int, db: Session = Depends(sesion), quien: dict = Depends(actor)):
    import io
    import zipfile

    fila = exigir_vista(carga(db, solicitud_id), quien)
    carpeta = carpeta_solicitud(fila.id)
    piezas = [carpeta / f"predio{extension}" for extension in (".shp", ".shx", ".dbf", ".prj")]
    if not all(pieza.exists() for pieza in piezas[:3]):
        raise HTTPException(status_code=404, detail="Esta solicitud no tiene shapefile")
    paquete = io.BytesIO()
    with zipfile.ZipFile(paquete, "w") as archivo:
        for pieza in piezas:
            if pieza.exists():
                archivo.write(pieza, pieza.name)
    from fastapi.responses import Response
    return Response(
        content=paquete.getvalue(),
        media_type="application/zip",
        headers={"Content-Disposition": f'attachment; filename="predio-{fila.id}.zip"'},
    )


@router.post("/solicitudes/{solicitud_id}/poligono")
def poligono(
    solicitud_id: int,
    cuerpo: PoligonoEntrada,
    db: Session = Depends(sesion),
    quien: dict = Depends(actor),
):
    fila = exigir_vista(carga(db, solicitud_id), quien)
    exigir_borrador(fila, quien)
    try:
        puntos = anillo(cuerpo.vertices)
    except (ValueError, KeyError, TypeError) as exc:
        raise HTTPException(status_code=422, detail="El predio se dibuja con al menos tres puntos") from exc
    _aplicar_predio(db, fila, puntos)
    marcar(fila, quien)
    db.commit()
    return serializar(carga(db, fila.id))


def _aplicar_predio(db: Session, fila: Solicitud, puntos: list[tuple[float, float]]) -> None:
    for lon, lat in puntos:
        if not (-180 <= lon <= 180 and -90 <= lat <= 90):
            raise HTTPException(status_code=422, detail="El predio tiene que venir en coordenadas geográficas, en grados")
    fila.wkt = a_wkt(puntos)
    fila.superficie_ha = superficie_ha(puntos)
    escribir_shapefile(fila.id, puntos)
    db.execute(
        text("UPDATE solicitud SET geom = ST_GeomFromText(:wkt, 4326) WHERE id = :id"),
        {"wkt": fila.wkt, "id": fila.id},
    )


def _bytes_shape(archivo: UploadFile, extension: str) -> bytes:
    nombre = (archivo.filename or "").lower()
    if not nombre.endswith(extension):
        raise HTTPException(status_code=422, detail=f"Falta el archivo {extension}")
    contenido = archivo.file.read()
    if not contenido:
        raise HTTPException(status_code=422, detail="El archivo está vacío")
    if len(contenido) > 20 * 1024 * 1024:
        raise HTTPException(status_code=413, detail="El archivo pasa de 20 MB")
    return contenido


@router.post("/solicitudes/{solicitud_id}/shapefile")
def shapefile(
    solicitud_id: int,
    shp: UploadFile = File(...),
    shx: UploadFile = File(...),
    dbf: UploadFile = File(...),
    db: Session = Depends(sesion),
    quien: dict = Depends(actor),
):
    fila = exigir_vista(carga(db, solicitud_id), quien)
    exigir_borrador(fila, quien)
    try:
        puntos = leer_shapefile(_bytes_shape(shp, ".shp"), _bytes_shape(shx, ".shx"), _bytes_shape(dbf, ".dbf"))
    except ValueError as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc
    _aplicar_predio(db, fila, puntos)
    marcar(fila, quien)
    db.commit()
    return serializar(carga(db, fila.id))


def _tiene(fila: Solicitud, clase: str, persona_id: int | None = None, nombre: str = "") -> bool:
    for archivo in fila.documentos:
        if archivo.clase != clase:
            continue
        if persona_id is not None and archivo.persona_id != persona_id:
            continue
        if nombre and archivo.nombre != nombre:
            continue
        return True
    return False


@router.post("/solicitudes/{solicitud_id}/comprobante")
def guardar_comprobante(
    solicitud_id: int,
    cuerpo: ComprobanteEntrada,
    db: Session = Depends(sesion),
    quien: dict = Depends(actor),
):
    fila = exigir_vista(carga(db, solicitud_id), quien)
    exigir_enviada(fila, quien)
    folio = cuerpo.folio.strip()
    quien_recibio = cuerpo.quien_recibio.strip()
    lugar = cuerpo.lugar_visita.strip()
    if not folio or not quien_recibio or not lugar:
        raise HTTPException(status_code=422, detail="Faltan el folio, quien recibió o el lugar de la revisión")
    fila.folio = folio
    fila.quien_recibio = quien_recibio
    fila.fecha_recepcion = cuerpo.fecha_recepcion
    fila.observaciones = cuerpo.observaciones.strip()
    fila.lugar_visita = lugar
    fila.fecha_visita = cuerpo.fecha_visita
    fila.estado = "recibida"
    marcar(fila, quien)
    db.commit()
    return serializar(carga(db, fila.id))


@router.post("/solicitudes/{solicitud_id}/correccion")
def pedir_correccion(
    solicitud_id: int,
    cuerpo: CorreccionEntrada,
    db: Session = Depends(sesion),
    quien: dict = Depends(actor),
):
    fila = exigir_vista(carga(db, solicitud_id), quien)
    exigir_enviada(fila, quien)
    texto = cuerpo.correccion.strip()
    if not texto:
        raise HTTPException(status_code=422, detail="Escribe qué se debe corregir")
    fila.correccion = texto
    fila.fecha_limite_subsanacion = cuerpo.fecha_limite
    fila.estado = "subsanacion"
    marcar(fila, quien)
    db.commit()
    return serializar(carga(db, fila.id))


@router.post("/solicitudes/{solicitud_id}/enviar")
def enviar(
    solicitud_id: int,
    cuerpo: EnvioEntrada,
    db: Session = Depends(sesion),
    quien: dict = Depends(actor),
):
    fila = exigir_vista(carga(db, solicitud_id), quien)
    exigir_borrador(fila, quien)
    papeles = {persona.papel: persona for persona in fila.personas}
    faltan = OBLIGADOS[fila.tipo] - set(papeles)
    if faltan:
        raise HTTPException(status_code=422, detail="Faltan personas de la solicitud")
    if fila.tipo == "nucleo_agrario":
        oficiales = {papeles[papel].nombre.strip().lower() for papel in ("presidencia", "secretaria", "tesoreria")}
        if papeles["segunda"].nombre.strip().lower() not in oficiales:
            raise HTTPException(
                status_code=422,
                detail="En un núcleo agrario la segunda persona beneficiaria es del comisariado",
            )
    carta = CARTA & set(papeles)
    if carta and carta != CARTA:
        raise HTTPException(status_code=422, detail="La carta poder necesita otorgante, apoderado y dos testigos")
    if not fila.documentacion_en_probosque:
        if carta == CARTA and not _tiene(fila, "carta_poder"):
            raise HTTPException(status_code=422, detail="Falta el PDF de la carta poder")
        for papel, persona in papeles.items():
            if fila.tipo != "persona_fisica" and papel == "titular":
                continue
            if not persona.tipo_identificacion:
                raise HTTPException(status_code=422, detail=f"Falta el tipo de identificación de {persona.nombre}")
            if not _tiene(fila, "identificacion", persona.id):
                raise HTTPException(status_code=422, detail=f"Falta la identificación de {persona.nombre}")
            if not _tiene(fila, "curp", persona.id):
                raise HTTPException(status_code=422, detail=f"Falta la CURP de {persona.nombre}")
            if persona.sin_domicilio and not _tiene(fila, "comprobante", persona.id):
                raise HTTPException(status_code=422, detail=f"Falta el comprobante de domicilio de {persona.nombre}")
        if fila.tipo == "persona_juridica" and not _tiene(fila, "acta_constitutiva"):
            raise HTTPException(status_code=422, detail="Falta el acta constitutiva o los estatutos")
        if fila.tipo == "nucleo_agrario" and not (_tiene(fila, "acta_eleccion") and _tiene(fila, "acta_predio")):
            raise HTTPException(status_code=422, detail="Faltan las actas del núcleo agrario")
        if not _tiene(fila, "tenencia"):
            raise HTTPException(status_code=422, detail="Falta la acreditación de propiedad o posesión")
    if not fila.documentacion_en_probosque and not fila.wkt:
        raise HTTPException(status_code=422, detail="Falta dibujar el predio")
    if not fila.nombre_predio.strip():
        raise HTTPException(status_code=422, detail="Falta el nombre del predio")
    if fila.etiqueta not in ETIQUETAS or not fila.etiqueta:
        raise HTTPException(status_code=422, detail="Falta la etiqueta del formato")
    if fila.grupo not in GRUPOS or not fila.grupo:
        raise HTTPException(status_code=422, detail="Falta el grupo de quien solicita")
    if not fila.declaratoria_sin_litigio:
        raise HTTPException(status_code=422, detail="Falta la declaratoria de que no hay litigio ni condicionante")
    if not fila.aviso_privacidad:
        raise HTTPException(status_code=422, detail="Falta aceptar el aviso de privacidad")
    if fila.documentacion_en_probosque:
        _marcar_enviada(fila, quien)
        db.commit()
        return serializar(carga(db, fila.id))
    for nombre in cuerpo.documentos:
        if not _tiene(fila, "pedido", nombre=nombre):
            raise HTTPException(status_code=422, detail=f"Falta el documento {nombre}")
    _marcar_enviada(fila, quien)
    db.commit()
    return serializar(carga(db, fila.id))
